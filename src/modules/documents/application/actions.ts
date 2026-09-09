"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
	requirePermission,
	requireProjectPermission,
} from "@/modules/auth/application/authorization";
import { createProjectDocument, updateProjectDocumentReview } from "./service";

function returnToProject(projectId: string) {
	revalidatePath(`/projects/${projectId}/documents`);
	revalidatePath("/documents");
	redirect(`/projects/${projectId}/documents` as Route);
}

export async function createProjectDocumentAction(
	projectId: string,
	formData: FormData,
) {
	const user = await requireProjectPermission(projectId, "proyectos.editar");
	await createProjectDocument(projectId, formData, { userId: user.id });
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

export async function createProjectDocumentGlobalAction(formData: FormData) {
	const user = await requirePermission("proyectos.editar");
	const projectId = formData.get("projectId");
	if (typeof projectId !== "string" || !projectId) {
		throw new Error("Selecciona un proyecto válido.");
	}
	await requireProjectPermission(projectId, "proyectos.editar");
	await createProjectDocument(projectId, formData, { userId: user.id });
	revalidatePath(`/projects/${projectId}/documents`);
	revalidatePath("/documents");
	redirect("/documents" as Route);
}
