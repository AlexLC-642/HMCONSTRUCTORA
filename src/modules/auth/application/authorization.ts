import { forbidden, redirect } from "next/navigation";
import { hasPermission } from "@/shared/permissions/has-permission";
import { getCurrentUser } from "./current-user";

export async function requirePermission(permission: string) {
	const user = await getCurrentUser();

	if (!user || !hasPermission(user.permissions, permission)) {
		forbidden();
	}

	return user;
}

export async function requireAuthenticatedUser() {
	const user = await getCurrentUser();
	if (!user) redirect("/login");
	return user;
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
