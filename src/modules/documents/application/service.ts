import { Prisma } from "@prisma/client";
import { recordAuditLog } from "@/modules/audit/application/audit";
import { prisma } from "@/shared/lib/prisma";
import { defaultDocumentCategories } from "../domain/catalog";
import { deleteStoredFile, storeProjectDocumentFile } from "./storage";

const documentStatuses = ["DRAFT", "REVIEW", "APPROVED", "ARCHIVED"] as const;
const legacyCategoryMap: Record<string, string> = {
	actas: "otros",
	facturas: "comprobantes",
	fotografias: "evidencias",
	licencias: "permisos",
	recibos: "comprobantes",
	subcontratos: "contratos",
	videos: "evidencias",
};

type ProjectDocumentStatusValue = (typeof documentStatuses)[number];

const statusValues = new Set<string>(documentStatuses);

function stringValue(formData: FormData, key: string) {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
}

function booleanValue(formData: FormData, key: string) {
	return formData.get(key) === "on";
}

function statusValue(value: string) {
	return statusValues.has(value)
		? (value as ProjectDocumentStatusValue)
		: "DRAFT";
}

function titleFromFileName(fileName: string) {
	return fileName
		.replace(/\.[^.]+$/, "")
		.replace(/[_-]+/g, " ")
		.trim();
}

function normalizedTags(value: string) {
	const tags = value
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
	return tags.length > 0 ? tags.join(", ") : null;
}

export async function ensureDocumentCategories() {
	for (const category of defaultDocumentCategories) {
		await prisma.documentCategory.upsert({
			where: { key: category.key },
			update: {
				name: category.name,
				description: category.description,
				sortOrder: category.sortOrder,
				active: true,
			},
			create: category,
		});
	}

	const categories = await prisma.documentCategory.findMany({
		where: {
			key: {
				in: [
					...Object.keys(legacyCategoryMap),
					...Object.values(legacyCategoryMap),
				],
			},
		},
		select: { id: true, key: true },
	});
	const categoryByKey = new Map(
		categories.map((category) => [category.key, category]),
	);

	for (const [legacyKey, targetKey] of Object.entries(legacyCategoryMap)) {
		const legacyCategory = categoryByKey.get(legacyKey);
		const targetCategory = categoryByKey.get(targetKey);
		if (!legacyCategory || !targetCategory) continue;

		await prisma.projectDocument.updateMany({
			where: { categoryId: legacyCategory.id },
			data: { categoryId: targetCategory.id },
		});
	}

	await prisma.documentCategory.updateMany({
		where: { key: { in: Object.keys(legacyCategoryMap) } },
		data: { active: false },
	});

	return prisma.documentCategory.findMany({
		where: { active: true },
		orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
	});
}

export async function createProjectDocument(
	projectId: string,
	formData: FormData,
	context: { userId: string },
) {
	const file = formData.get("file");
	if (!(file instanceof File)) throw new Error("Selecciona un archivo.");

	const categoryId = stringValue(formData, "categoryId");
	const category = await prisma.documentCategory.findUnique({
		where: { id: categoryId },
	});
	if (!category?.active) throw new Error("Selecciona una categoria valida.");

	// Documents no longer go through a manual draft -> review -> approved
	// workflow - that extra step added no real value here (unlike Presupuesto,
	// where approval gates a financial commitment). Every upload is approved
	// on arrival; portal visibility stays a separate, deliberate action.
	const document = await prisma.projectDocument.create({
		data: {
			projectId,
			categoryId,
			title: stringValue(formData, "title") || titleFromFileName(file.name),
			description: stringValue(formData, "description") || null,
			tags: normalizedTags(stringValue(formData, "tags")),
			status: "APPROVED",
			portalVisible: booleanValue(formData, "portalVisible"),
			authorId: context.userId,
			approvedById: context.userId,
			approvedAt: new Date(),
		},
	});

	const storedFile = await storeProjectDocumentFile(
		projectId,
		document.id,
		file,
		category.key,
		context.userId,
	);
	await prisma.documentVersion.create({
		data: {
			documentId: document.id,
			versionNumber: 1,
			...storedFile,
			notes: stringValue(formData, "versionNotes") || null,
			uploadedById: context.userId,
		},
	});

	await recordAuditLog({
		userId: context.userId,
		action: "CREATE",
		entityType: "ProjectDocument",
		entityId: document.id,
		metadata: { projectId, title: document.title, status: document.status },
	});

	return document;
}

export async function updateProjectDocumentReview(
	documentId: string,
	formData: FormData,
	context: { userId: string },
) {
	const requestedStatus = statusValue(stringValue(formData, "status"));
	const approved = requestedStatus === "APPROVED";

	const document = await prisma.projectDocument.update({
		where: { id: documentId },
		data: {
			status: requestedStatus,
			portalVisible: approved && booleanValue(formData, "portalVisible"),
			approvedById: approved ? context.userId : null,
			approvedAt: approved ? new Date() : null,
		},
		select: {
			id: true,
			projectId: true,
			title: true,
			status: true,
			portalVisible: true,
		},
	});

	await recordAuditLog({
		userId: context.userId,
		action: approved ? "APPROVE" : "UPDATE",
		entityType: "ProjectDocument",
		entityId: document.id,
		metadata: {
			projectId: document.projectId,
			title: document.title,
			status: document.status,
			portalVisible: document.portalVisible,
		},
	});

	return document;
}

export async function updateProjectDocumentInfo(
	documentId: string,
	formData: FormData,
	context: { userId: string },
) {
	const categoryId = stringValue(formData, "categoryId");
	const category = await prisma.documentCategory.findUnique({
		where: { id: categoryId },
	});
	if (!category?.active) throw new Error("Selecciona una categoria valida.");

	const document = await prisma.projectDocument.update({
		where: { id: documentId },
		data: {
			categoryId,
			title: stringValue(formData, "title") || undefined,
			description: stringValue(formData, "description") || null,
			tags: normalizedTags(stringValue(formData, "tags")),
		},
		select: { id: true, projectId: true, title: true },
	});

	await recordAuditLog({
		userId: context.userId,
		action: "UPDATE",
		entityType: "ProjectDocument",
		entityId: document.id,
		metadata: { projectId: document.projectId, title: document.title },
	});

	return document;
}

// Adds a new file as the next version of an existing document (the real
// "Nueva versión" / "Historial" flow - the menu used to offer these as dead
// buttons). versionNumber has a unique index per document, so a collision
// from two people uploading at the same instant is retried once with the
// next number rather than failing outright.
export async function addProjectDocumentVersion(
	documentId: string,
	formData: FormData,
	context: { userId: string },
) {
	const file = formData.get("file");
	if (!(file instanceof File)) throw new Error("Selecciona un archivo.");

	const document = await prisma.projectDocument.findUnique({
		where: { id: documentId },
		include: {
			category: true,
			versions: {
				select: { versionNumber: true },
				orderBy: { versionNumber: "desc" },
				take: 1,
			},
		},
	});
	if (!document) throw new Error("El documento ya no existe.");

	const storedFile = await storeProjectDocumentFile(
		document.projectId,
		document.id,
		file,
		document.category.key,
		context.userId,
	);
	const notes = stringValue(formData, "notes") || null;

	let nextVersionNumber = (document.versions[0]?.versionNumber ?? 0) + 1;
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const version = await prisma.documentVersion.create({
				data: {
					documentId: document.id,
					versionNumber: nextVersionNumber,
					...storedFile,
					notes,
					uploadedById: context.userId,
				},
			});

			await recordAuditLog({
				userId: context.userId,
				action: "UPDATE",
				entityType: "ProjectDocument",
				entityId: document.id,
				metadata: {
					projectId: document.projectId,
					title: document.title,
					newVersion: version.versionNumber,
				},
			});

			return version;
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002" &&
				attempt === 0
			) {
				nextVersionNumber += 1;
				continue;
			}
			throw error;
		}
	}
	throw new Error("No se pudo registrar la nueva versión, intenta de nuevo.");
}

// Hard delete: removes the DB row (versions cascade), the physical files on
// disk, and refuses when the document is linked as a financial expense's
// supporting receipt - that link would otherwise just go null silently
// (schema uses onDelete: SetNull there), quietly breaking a paper trail
// that finance needs to keep intact.
export async function deleteProjectDocument(
	documentId: string,
	context: { userId: string },
) {
	const document = await prisma.projectDocument.findUnique({
		where: { id: documentId },
		include: {
			versions: { select: { id: true, storageKey: true } },
			financialExpenseReceipt: { select: { id: true } },
		},
	});
	if (!document) throw new Error("El documento ya no existe.");
	if (document.financialExpenseReceipt) {
		throw new Error(
			"Este documento es el comprobante de un gasto registrado; quita esa referencia en Finanzas antes de eliminarlo.",
		);
	}

	await prisma.projectDocument.delete({ where: { id: documentId } });
	await Promise.all(
		document.versions.map((version) => deleteStoredFile(version.storageKey)),
	);

	await recordAuditLog({
		userId: context.userId,
		action: "DELETE",
		entityType: "ProjectDocument",
		entityId: documentId,
		metadata: { projectId: document.projectId, title: document.title },
	});

	return { projectId: document.projectId };
}
