import { projectAccessWhere } from "@/modules/auth/application/authorization";
import type { AuthenticatedUser } from "@/modules/auth/domain/types";
import { prisma } from "@/shared/lib/prisma";
import { ensureDocumentCategories } from "./service";

type DocumentPreviewVersionData = {
	id: string;
	versionNumber: number;
	originalName: string;
	mimeType: string;
	fileSize: number;
	publicUrl: string;
	createdAt: string;
	notes: string | null;
	uploadedBy?: { id: string; name: string } | null;
};

export type DocumentPreviewData = {
	id: string;
	title: string;
	description: string | null;
	tags: string | null;
	status: string;
	portalVisible: boolean;
	createdAt: string;
	updatedAt: string;
	projectId: string;
	categoryId: string;
	project: {
		id: string;
		code: string;
		name: string;
	};
	category: {
		id: string;
		key: string;
		name: string;
	};
	version: DocumentPreviewVersionData | null;
	versions: DocumentPreviewVersionData[];
	author?: { id?: string; name?: string } | null;
	approvedBy?: { id?: string; name?: string } | null;
};

const documentInclude = {
	category: true,
	author: { select: { id: true, name: true, email: true } },
	approvedBy: { select: { id: true, name: true, email: true } },
	versions: {
		orderBy: { versionNumber: "desc" as const },
		include: { uploadedBy: { select: { id: true, name: true, email: true } } },
	},
};

function normalizeVersion(version: unknown): DocumentPreviewVersionData | null {
	if (!version || typeof version !== "object") return null;

	const data = version as Record<string, unknown>;
	const fileName =
		typeof data.originalName === "string" ? data.originalName : "";
	const mimeType = typeof data.mimeType === "string" ? data.mimeType : "";
	const publicUrl = typeof data.publicUrl === "string" ? data.publicUrl : "";

	if (!fileName && !mimeType && !publicUrl) return null;

	const rawUploadedBy = data.uploadedBy;

	return {
		id: String(data.id ?? ""),
		versionNumber: Number(data.versionNumber ?? 1),
		originalName: fileName,
		mimeType,
		fileSize: Number(data.fileSize ?? 0),
		publicUrl,
		createdAt: new Date(
			(data.createdAt as string | number | Date | null | undefined) ??
				Date.now(),
		).toISOString(),
		notes: typeof data.notes === "string" ? data.notes : null,
		uploadedBy:
			rawUploadedBy && typeof rawUploadedBy === "object"
				? {
						id: String((rawUploadedBy as Record<string, unknown>).id ?? ""),
						name: String((rawUploadedBy as Record<string, unknown>).name ?? ""),
					}
				: null,
	};
}

export function buildDocumentPreview(
	document: Record<string, unknown> | null | undefined,
	project: { id: string; code: string; name: string } | null | undefined,
	category: { id: string; key: string; name: string } | null | undefined,
	previewVersion?: unknown,
): DocumentPreviewData {
	const documentRecord =
		document && typeof document === "object"
			? (document as Record<string, unknown>)
			: {};
	const projectRecord =
		project && typeof project === "object"
			? (project as Record<string, unknown>)
			: documentRecord.project && typeof documentRecord.project === "object"
				? (documentRecord.project as Record<string, unknown>)
				: {};
	const categoryRecord =
		category && typeof category === "object"
			? (category as Record<string, unknown>)
			: documentRecord.category && typeof documentRecord.category === "object"
				? (documentRecord.category as Record<string, unknown>)
				: {};
	const authorRecord =
		documentRecord.author && typeof documentRecord.author === "object"
			? (documentRecord.author as Record<string, unknown>)
			: {};
	const approvedByRecord =
		documentRecord.approvedBy && typeof documentRecord.approvedBy === "object"
			? (documentRecord.approvedBy as Record<string, unknown>)
			: {};
	const rawVersions: unknown[] = Array.isArray(documentRecord.versions)
		? documentRecord.versions
		: [];

	const versions: DocumentPreviewVersionData[] = rawVersions
		.map((version) => normalizeVersion(version))
		.filter((version): version is DocumentPreviewVersionData =>
			Boolean(version),
		);

	const selectedVersion = previewVersion
		? normalizeVersion(previewVersion)
		: (versions[0] ?? null);

	return {
		id: String(documentRecord.id ?? ""),
		title: String(documentRecord.title ?? "Documento sin título"),
		description:
			typeof documentRecord.description === "string"
				? documentRecord.description
				: null,
		tags: typeof documentRecord.tags === "string" ? documentRecord.tags : null,
		status: String(documentRecord.status ?? "DRAFT"),
		portalVisible: Boolean(documentRecord.portalVisible),
		createdAt: new Date(
			(documentRecord.createdAt as string | number | Date | null | undefined) ??
				Date.now(),
		).toISOString(),
		updatedAt: new Date(
			(documentRecord.updatedAt as string | number | Date | null | undefined) ??
				Date.now(),
		).toISOString(),
		projectId: String(documentRecord.projectId ?? projectRecord.id ?? ""),
		categoryId: String(documentRecord.categoryId ?? categoryRecord.id ?? ""),
		project: {
			id: String(projectRecord.id ?? documentRecord.projectId ?? ""),
			code: String(projectRecord.code ?? "Sin proyecto"),
			name: String(projectRecord.name ?? "Proyecto sin nombre"),
		},
		category: {
			id: String(categoryRecord.id ?? documentRecord.categoryId ?? ""),
			key: String(categoryRecord.key ?? ""),
			name: String(categoryRecord.name ?? "Sin categoría"),
		},
		version: selectedVersion,
		versions,
		author:
			Object.keys(authorRecord).length > 0
				? {
						id: String(authorRecord.id ?? ""),
						name: String(authorRecord.name ?? ""),
					}
				: null,
		approvedBy:
			Object.keys(approvedByRecord).length > 0
				? {
						id: String(approvedByRecord.id ?? ""),
						name: String(approvedByRecord.name ?? ""),
					}
				: null,
	};
}

export async function getProjectDocumentsWorkspace(projectId: string) {
	const [project, categories] = await Promise.all([
		prisma.project.findUnique({
			where: { id: projectId },
			select: {
				id: true,
				code: true,
				name: true,
				client: { select: { name: true } },
			},
		}),
		ensureDocumentCategories(),
	]);

	if (!project) return null;

	const documents = await prisma.projectDocument.findMany({
		where: { projectId },
		include: documentInclude,
		orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
	});

	return { project, categories, documents };
}

export async function getDocumentLibrary(
	user: Pick<AuthenticatedUser, "id" | "roles">,
) {
	await ensureDocumentCategories();
	const documents = await prisma.projectDocument.findMany({
		where: { project: projectAccessWhere(user) },
		include: {
			...documentInclude,
			project: { select: { id: true, code: true, name: true } },
		},
		orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
	});

	const totals = {
		documents: documents.length,
		approved: documents.filter((document) => document.status === "APPROVED")
			.length,
		portal: documents.filter((document) => document.portalVisible).length,
		versions: documents.reduce(
			(sum, document) => sum + document.versions.length,
			0,
		),
	};

	return { documents, totals };
}
