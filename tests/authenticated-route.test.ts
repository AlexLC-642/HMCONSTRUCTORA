import { describe, expect, it } from "vitest";
import { defaultAuthenticatedRoute } from "@/modules/auth/application/authenticated-route";

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
});
