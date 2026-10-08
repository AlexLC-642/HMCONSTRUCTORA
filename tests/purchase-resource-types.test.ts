import { describe, expect, it } from "vitest";
import {
	parsePurchaseResourceType,
	purchaseResourceTypeLabels,
} from "@/modules/purchases/domain/resource-types";

describe("tipo de recurso al crear desde Compras", () => {
	it("acepta material, herramienta y maquinaria", () => {
		expect(parsePurchaseResourceType("MATERIAL")).toBe("MATERIAL");
		expect(parsePurchaseResourceType("TOOL")).toBe("TOOL");
		expect(parsePurchaseResourceType("EQUIPMENT")).toBe("EQUIPMENT");
	});

	it("rechaza valores desconocidos en vez de guardarlos como material", () => {
		expect(parsePurchaseResourceType("")).toBeNull();
		expect(parsePurchaseResourceType(undefined)).toBeNull();
		expect(parsePurchaseResourceType("OTRO")).toBeNull();
	});

	it("tiene etiqueta para cada tipo", () => {
		expect(purchaseResourceTypeLabels.EQUIPMENT).toBe("Maquinaria y equipo");
	});
});
