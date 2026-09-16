import { describe, expect, it } from "vitest";
import { defaultAuthenticatedRoute } from "@/modules/auth/application/authenticated-route";
import { rolePermissionPresets } from "@/modules/roles/domain/permissions";

describe("default authenticated route", () => {
	it("sends warehouse users to inventory instead of the project dashboard", () => {
		expect(
			defaultAuthenticatedRoute([
				"inventario.mover",
				"requerimiento.aprobar",
				"compras.ver",
			]),
		).toBe("/inventory");
	});

	it("keeps project users on the dashboard", () => {
		expect(defaultAuthenticatedRoute(["proyectos.ver"])).toBe("/dashboard");
	});

	it("uses the first available operational module", () => {
		expect(defaultAuthenticatedRoute(["compras.ver"])).toBe("/purchases");
		expect(defaultAuthenticatedRoute(["finanzas.ver"])).toBe("/finances");
		expect(defaultAuthenticatedRoute(["sitio.editar"])).toBe("/website");
	});

	it("falls back to the user's own account page", () => {
		expect(defaultAuthenticatedRoute([])).toBe("/users");
	});

	it.each(Object.entries(rolePermissionPresets))(
		"sends the %s role only to a module it can access",
		(_role, permissions) => {
			const destination = defaultAuthenticatedRoute(permissions);
			const requiredPermission = new Map<string, string>([
				["/dashboard", "proyectos.ver"],
				["/inventory", "inventario.mover"],
				["/requisitions", "requerimiento.aprobar"],
				["/purchases", "compras.ver"],
				["/finances", "finanzas.ver"],
				["/website", "sitio.editar"],
			]).get(destination);

			if (requiredPermission) {
				expect(permissions).toContain(requiredPermission);
			} else {
				expect(destination).toBe("/users");
			}
		},
	);
});
