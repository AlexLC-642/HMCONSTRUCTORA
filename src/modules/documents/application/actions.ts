"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
	requirePermission,
	requireProjectPermission,
} from "@/modules/auth/application/authorization";
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
