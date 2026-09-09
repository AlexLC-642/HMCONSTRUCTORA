import { prisma } from "@/shared/lib/prisma";
import type { ProjectStatus } from "@prisma/client";
import type { AuthenticatedUser } from "@/modules/auth/domain/types";
import { projectAccessWhere } from "@/modules/auth/application/authorization";

export type ProjectFilters = {
	search?: string;
	status?: ProjectStatus | "ALL" | "OPERATIVE";
};

export async function listProjects(
	filters: ProjectFilters = {},
	user?: Pick<AuthenticatedUser, "id" | "roles">,
) {
	const statusWhere =
		filters.status === "OPERATIVE" || !filters.status
			? { in: ["DRAFT", "PLANNING", "ACTIVE", "PAUSED"] as ProjectStatus[] }
			: filters.status !== "ALL"
				? filters.status
				: undefined;

	return prisma.project.findMany({
		where: {
			...(user ? projectAccessWhere(user) : {}),
			status: statusWhere,
			OR: filters.search
				? [
						{ name: { contains: filters.search } },
						{ code: { contains: filters.search } },
						{ internalId: { contains: filters.search } },
						{ client: { name: { contains: filters.search } } },
					]
				: undefined,
		},
		include: {
			client: true,
			responsible: {
				select: { id: true, name: true, email: true },
			},
			members: true,
		},
		orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
	});
}

export async function getProjectById(id: string) {
	const project = await prisma.project.findUnique({
		where: { id },
		include: {
			client: true,
			responsible: {
				select: { id: true, name: true, email: true },
			},
			members: {
				include: {
					user: {
						select: { id: true, name: true, email: true },
					},
				},
				orderBy: { createdAt: "asc" },
			},
		},
	});

	if (!project) {
		return null;
	}

	return {
		...project,
		baseBudget: project.baseBudget.toString(),
		progressPercentage: project.progressPercentage.toString(),
	};
}

export async function listAssignableUsers() {
	return prisma.user.findMany({
		where: { status: "ACTIVE" },
		select: { id: true, name: true, email: true },
		orderBy: { name: "asc" },
	});
}
