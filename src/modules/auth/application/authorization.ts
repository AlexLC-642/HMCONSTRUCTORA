import type { Prisma } from "@prisma/client";
import { forbidden, redirect } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import { hasPermission } from "@/shared/permissions/has-permission";
import type { AuthenticatedUser } from "../domain/types";
import { getCurrentUser } from "./current-user";

const portfolioRoles = new Set(["administrador", "superadministrador"]);
const scopedPortfolioRoles = {
	finances: new Set([
		"administrador",
		"superadministrador",
		"contabilidad",
		"compras",
	]),
	inventory: new Set([
		"administrador",
		"superadministrador",
		"bodega",
		"compras",
	]),
	requisitions: new Set([
		"administrador",
		"superadministrador",
		"bodega",
		"compras",
	]),
	purchases: new Set([
		"administrador",
		"superadministrador",
		"contabilidad",
		"compras",
		"bodega",
	]),
} as const;

export type ProjectScope = "projects" | keyof typeof scopedPortfolioRoles;

export function hasPortfolioAccess(user: Pick<AuthenticatedUser, "roles">) {
	return user.roles.some((role) => portfolioRoles.has(role));
}

export function projectAccessWhere(
	user: Pick<AuthenticatedUser, "id" | "roles">,
): Prisma.ProjectWhereInput {
	if (hasPortfolioAccess(user)) return {};
	return {
		OR: [
			{ responsibleId: user.id },
			{ members: { some: { userId: user.id } } },
		],
	};
}

export function hasProjectScopePortfolioAccess(
	user: Pick<AuthenticatedUser, "roles">,
	scope: ProjectScope,
) {
	if (scope === "projects") return hasPortfolioAccess(user);
	return user.roles.some((role) => scopedPortfolioRoles[scope].has(role));
}

export function projectScopeWhere(
	user: Pick<AuthenticatedUser, "id" | "roles">,
	scope: ProjectScope,
): Prisma.ProjectWhereInput {
	if (hasProjectScopePortfolioAccess(user, scope)) return {};
	return projectAccessWhere(user);
}

export async function canAccessProject(
	user: Pick<AuthenticatedUser, "id" | "roles">,
	projectId: string,
) {
	if (hasPortfolioAccess(user)) return true;
	return (
		(await prisma.project.count({
			where: { id: projectId, ...projectAccessWhere(user) },
		})) > 0
	);
}

export async function requirePermission(permission: string) {
	const user = await getCurrentUser();

	if (!user) redirect("/login");
	if (!hasPermission(user.permissions, permission)) {
		forbidden();
	}

	return user;
}

export async function requireAuthenticatedUser() {
	const user = await getCurrentUser();
	if (!user) redirect("/login");
	return user;
}

export async function requireProjectPermission(
	projectId: string,
	permission: string,
) {
	const user = await requirePermission(permission);
	if (!(await canAccessProject(user, projectId))) forbidden();
	return user;
}

export async function requireScopedProjectPermission(
	projectId: string,
	permission: string,
	scope: ProjectScope,
) {
	const user = await requirePermission(permission);
	if (hasProjectScopePortfolioAccess(user, scope)) return user;
	if (!(await canAccessProject(user, projectId))) forbidden();
	return user;
}

export async function requireProjectScopePortfolioPermission(
	permission: string,
	scope: ProjectScope,
) {
	const user = await requirePermission(permission);
	if (!hasProjectScopePortfolioAccess(user, scope)) forbidden();
	return user;
}

export async function requireProjectAccess(projectId: string) {
	return requireProjectPermission(projectId, "proyectos.ver");
}

export function isUserAdministrator(roles: readonly string[]) {
	return (
		roles.includes("administrador") || roles.includes("superadministrador")
	);
}

export function isSuperAdministrator(roles: readonly string[]) {
	return roles.includes("superadministrador");
}

export async function requireUserAdministrator() {
	const user = await requireAuthenticatedUser();
	if (!isUserAdministrator(user.roles)) forbidden();
	return user;
}
