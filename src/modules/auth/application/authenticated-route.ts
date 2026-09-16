import type { Route } from "next";
import { prisma } from "@/shared/lib/prisma";
import { hasPermission } from "@/shared/permissions/has-permission";

export function defaultAuthenticatedRoute(
	permissions: readonly string[],
): Route {
	if (hasPermission(permissions, "proyectos.ver")) return "/dashboard";
	if (hasPermission(permissions, "inventario.mover")) return "/inventory";
	if (hasPermission(permissions, "requerimiento.aprobar")) {
		return "/requisitions";
	}
	if (hasPermission(permissions, "compras.ver")) return "/purchases";
	if (hasPermission(permissions, "finanzas.ver")) return "/finances";
	if (hasPermission(permissions, "sitio.editar")) return "/website";
	return "/users";
}

export async function defaultAuthenticatedRouteForUser(
	userId: string,
): Promise<Route> {
	const user = await prisma.user.findUnique({
		where: { id: userId, status: "ACTIVE" },
		select: {
			roles: {
				select: {
					role: {
						select: {
							permissions: {
								select: { permission: { select: { key: true } } },
							},
						},
					},
				},
			},
		},
	});

	const permissions =
		user?.roles.flatMap(({ role }) =>
			role.permissions.map(({ permission }) => permission.key),
		) ?? [];

	return defaultAuthenticatedRoute(permissions);
}
