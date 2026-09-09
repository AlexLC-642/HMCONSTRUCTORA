"use server";

import type { Route } from "next";
import type { ProjectStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import {
	hasPortfolioAccess,
	requirePermission,
	requireProjectPermission,
} from "@/modules/auth/application/authorization";
import {
	createProject,
	updateProject,
	updateProjectLifecycle,
} from "./service";

function readProjectForm(formData: FormData, portalEnabled: boolean) {
	const memberIds = Array.from(
		new Set(
			formData
				.getAll("memberIds")
				.filter(
					(value): value is string =>
						typeof value === "string" && value.trim().length > 0,
				),
		),
	);

	return {
		internalId: formData.get("internalId"),
		code: formData.get("code"),
		name: formData.get("name"),
		description: formData.get("description"),
		clientName: formData.get("clientName"),
		clientContactName: formData.get("clientContactName"),
		clientEmail: formData.get("clientEmail"),
		clientPhone: formData.get("clientPhone"),
		location: formData.get("location"),
		startDate: formData.get("startDate"),
		expectedEndDate: formData.get("expectedEndDate"),
		responsibleId: formData.get("responsibleId"),
		status: formData.get("status"),
		currency: "GTQ",
		baseBudget: formData.get("baseBudget"),
		progressPercentage: "0",
		observations: formData.get("observations"),
		memberIds,
		portalEnabled,
	};
}

export async function createProjectAction(formData: FormData) {
	const user = await requirePermission("proyectos.crear");
	const input = readProjectForm(formData, true);
	if (!hasPortfolioAccess(user) && !input.memberIds.includes(user.id)) {
		input.memberIds.push(user.id);
	}
	const project = await createProject(input, {
		userId: user.id,
	});
	redirect(`/projects/${project.id}` as Route);
}

export async function updateProjectAction(id: string, formData: FormData) {
	const user = await requireProjectPermission(id, "proyectos.editar");
	const input = readProjectForm(
		formData,
		formData.get("portalEnabled") === "on",
	);
	if (!hasPortfolioAccess(user) && !input.memberIds.includes(user.id)) {
		input.memberIds.push(user.id);
	}
	const project = await updateProject(id, input, {
		userId: user.id,
	});
	redirect(`/projects/${project.id}` as Route);
}

async function changeProjectLifecycle(id: string, status: ProjectStatus) {
	const user = await requireProjectPermission(id, "proyectos.editar");
	const project = await updateProjectLifecycle(id, status, {
		userId: user.id,
	});
	redirect(`/projects/${project.id}` as Route);
}

export async function completeProjectAction(id: string) {
	await changeProjectLifecycle(id, "COMPLETED");
}

export async function archiveProjectAction(id: string) {
	await changeProjectLifecycle(id, "ARCHIVED");
}

export async function reactivateProjectAction(id: string) {
	await changeProjectLifecycle(id, "ACTIVE");
}
