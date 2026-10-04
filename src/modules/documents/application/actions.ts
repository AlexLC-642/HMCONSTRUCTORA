"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
	requirePermission,
	requireProjectPermission,
} from "@/modules/auth/application/authorization";
import { prisma } from "@/shared/lib/prisma";
import {
	addProjectDocumentVersion,
	createProjectDocument,
	deleteProjectDocument,
	updateProjectDocumentInfo,
	updateProjectDocumentReview,
} from "./service";

function returnToProject(projectId: string) {
	revalidatePath(`/projects/${projectId}/documents`);
	revalidatePath("/documents");
	redirect(`/projects/${projectId}/documents` as Route);
}

// Uploading several files (e.g. every sheet of a plan set) creates one
// ProjectDocument per file, sharing the same category/description/tags.
// The typed title only applies when a single file was selected - shared
// across a batch it would give every document the same name, so each file
// falls back to its own filename instead (createProjectDocument already
// does this whenever "title" is absent).
async function createProjectDocumentsFromFormData(
	projectId: string,
	formData: FormData,
	context: { userId: string },
) {
	const files = formData
		.getAll("file")
		.filter((entry): entry is File => entry instanceof File && entry.size > 0);
	if (files.length === 0) throw new Error("Selecciona un archivo.");

	for (const file of files) {
		const perFileFormData = new FormData();
		for (const [key, value] of formData.entries()) {
			if (key === "file") continue;
			if (key === "title" && files.length > 1) continue;
			perFileFormData.append(key, value);
		}
		perFileFormData.set("file", file);
		await createProjectDocument(projectId, perFileFormData, context);
	}
}

export async function createProjectDocumentAction(
	projectId: string,
	formData: FormData,
) {
	const user = await requireProjectPermission(projectId, "proyectos.editar");
	await createProjectDocumentsFromFormData(projectId, formData, {
		userId: user.id,
	});
	returnToProject(projectId);
}

export async function updateProjectDocumentReviewAction(
	projectId: string,
	documentId: string,
	formData: FormData,
) {
	const user = await requireProjectPermission(projectId, "proyectos.editar");
	await updateProjectDocumentReview(documentId, formData, { userId: user.id });
	returnToProject(projectId);
}

export async function updateProjectDocumentInfoAction(
	projectId: string,
	documentId: string,
	formData: FormData,
) {
	const user = await requireProjectPermission(projectId, "proyectos.editar");
	await updateProjectDocumentInfo(documentId, formData, { userId: user.id });
	returnToProject(projectId);
}

export async function addProjectDocumentVersionAction(
	projectId: string,
	documentId: string,
	formData: FormData,
) {
	const user = await requireProjectPermission(projectId, "proyectos.editar");
	await addProjectDocumentVersion(documentId, formData, { userId: user.id });
	returnToProject(projectId);
}

export async function deleteProjectDocumentAction(
	projectId: string,
	documentId: string,
) {
	const user = await requireProjectPermission(projectId, "proyectos.editar");
	await deleteProjectDocument(documentId, { userId: user.id });
	returnToProject(projectId);
}

export async function createProjectDocumentGlobalAction(formData: FormData) {
	const user = await requirePermission("proyectos.editar");
	const projectId = formData.get("projectId");
	if (typeof projectId !== "string" || !projectId) {
		throw new Error("Selecciona un proyecto válido.");
	}
	await requireProjectPermission(projectId, "proyectos.editar");
	await createProjectDocumentsFromFormData(projectId, formData, {
		userId: user.id,
	});
	revalidatePath(`/projects/${projectId}/documents`);
	revalidatePath("/documents");
	redirect("/documents" as Route);
}

export type ReportUploadState = { status: "idle" | "error"; message: string };

/**
 * Sube un informe externo (PDF, Word, Excel o foto) desde Reportes. La
 * categoría se fija aquí en "informes" para que el archivo aparezca en la
 * pestaña Reportes; la subida general de Documentos no ofrece esa categoría.
 */
export async function uploadProjectReportAction(
	_previous: ReportUploadState,
	formData: FormData,
): Promise<ReportUploadState> {
	const user = await requirePermission("proyectos.editar");
	const projectId = formData.get("projectId");
	if (typeof projectId !== "string" || !projectId) {
		return { status: "error", message: "Elige el proyecto del informe." };
	}
	await requireProjectPermission(projectId, "proyectos.editar");
	const file = formData.get("file");
	if (!(file instanceof File) || file.size <= 0) {
		return { status: "error", message: "Adjunta el archivo del informe." };
	}
	const category = await prisma.documentCategory.findUnique({
		where: { key: "informes" },
		select: { id: true },
	});
	if (!category) {
		return {
			status: "error",
			message: "La categoría de informes no está configurada.",
		};
	}
	const data = new FormData();
	data.set("file", file);
	data.set("categoryId", category.id);
	for (const key of ["title", "description", "portalVisible"]) {
		const value = formData.get(key);
		if (typeof value === "string" && value) data.set(key, value);
	}
	try {
		await createProjectDocument(projectId, data, { userId: user.id });
	} catch (error) {
		return {
			status: "error",
			message:
				error instanceof Error && error.constructor === Error
					? error.message
					: "No se pudo subir el informe. Inténtalo de nuevo.",
		};
	}
	revalidatePath(`/projects/${projectId}/documents`);
	revalidatePath("/documents");
	revalidatePath("/reports");
	redirect("/reports?tab=reportes" as Route);
}
