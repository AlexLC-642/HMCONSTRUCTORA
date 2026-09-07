import { describe, expect, it } from "vitest";
import {
	permissionKeys,
	rolePermissionPresets,
} from "@/modules/roles/domain/permissions";
import { hasPermission } from "@/shared/permissions/has-permission";

describe("permissions", () => {
	it("contains the required initial permission keys", () => {
		expect(permissionKeys).toContain("proyectos.ver");
		expect(permissionKeys).toContain("presupuesto.aprobar");
		expect(permissionKeys).toContain("avance.publicar");
		expect(permissionKeys).toContain("inventario.mover");
		expect(permissionKeys).toContain("finanzas.registrar");
	});

	it("checks whether a permission is assigned", () => {
		expect(hasPermission(["proyectos.ver"], "proyectos.ver")).toBe(true);
		expect(hasPermission(["proyectos.ver"], "finanzas.ver")).toBe(false);
	});

	it("provides fixed permissions for warehouse and finance roles", () => {
		expect(rolePermissionPresets.bodega).toEqual([
			"inventario.mover",
			"requerimiento.aprobar",
		]);
		expect(rolePermissionPresets.contabilidad).toContain("finanzas.ver");
		expect(rolePermissionPresets.contabilidad).toContain("finanzas.registrar");
		expect(rolePermissionPresets.bodega).not.toContain("usuarios.gestionar");
	});

	it("allows permissions from multiple roles to be combined", () => {
		const combined = new Set([
			...rolePermissionPresets.bodega,
			...rolePermissionPresets.contabilidad,
		]);

		expect(combined).toContain("inventario.mover");
		expect(combined).toContain("finanzas.registrar");
	});

	it("reserves administrator management for the superadministrator", () => {
		expect(rolePermissionPresets.superadministrador).toContain(
			"usuarios.administradores",
		);
		expect(rolePermissionPresets.administrador).not.toContain(
			"usuarios.administradores",
		);
	});
});
