import { describe, expect, it } from "vitest";
import {
	requisitionInputSchema,
	requisitionMaterialLinkSchema,
} from "@/modules/requisitions/domain/validation";

describe("vinculación de materiales de requerimientos", () => {
	it("exige seleccionar un material cuando se usa el catálogo", () => {
		const result = requisitionMaterialLinkSchema.safeParse({
			requisitionItemId: "item-1",
			mode: "EXISTING",
			materialId: "",
			unitCost: 0,
			minimumStock: 0,
		});

		expect(result.success).toBe(false);
	});

	it("permite crear un material con nombre y unidad", () => {
		const result = requisitionMaterialLinkSchema.safeParse({
			requisitionItemId: "item-1",
			mode: "NEW",
			name: "Tubería PVC",
			unit: "m",
			unitCost: 210,
			minimumStock: 20,
		});

		expect(result.success).toBe(true);
	});
});

describe("destino y renglones del requerimiento", () => {
	const item = {
		resourceType: "MATERIAL",
		description: "Tubería PVC",
		quantity: 12,
		unit: "m",
		estimatedCost: 25,
	};

	it("exige proyecto cuando el destino final es una obra", () => {
		const result = requisitionInputSchema.safeParse({
			destinationType: "PROJECT",
			projectId: "",
			warehouseId: "warehouse-1",
			title: "Instalación hidráulica",
			neededDate: "2026-09-15",
			items: [item],
		});

		expect(result.success).toBe(false);
	});

	it("permite abastecer una bodega sin asignar proyecto", () => {
		const result = requisitionInputSchema.safeParse({
			destinationType: "WAREHOUSE",
			projectId: "",
			warehouseId: "warehouse-1",
			title: "Reposición de existencias",
			neededDate: "2026-09-15",
			items: [item, { ...item, description: "Cemento", unit: "saco" }],
		});

		expect(result.success).toBe(true);
		if (result.success) expect(result.data.items).toHaveLength(2);
	});

	it("exige la fecha en que se necesitan los recursos", () => {
		const result = requisitionInputSchema.safeParse({
			destinationType: "WAREHOUSE",
			warehouseId: "warehouse-1",
			title: "Reposición de existencias",
			neededDate: "",
			items: [item],
		});

		expect(result.success).toBe(false);
	});
});
