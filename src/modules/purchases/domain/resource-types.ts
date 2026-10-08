/**
 * Tipo de recurso de inventario al darlo de alta desde Compras. Antes el alta
 * rápida guardaba todo como material, y en Inventario las herramientas y la
 * maquinaria quedaban mal clasificadas.
 */
export const purchaseResourceTypes = ["MATERIAL", "TOOL", "EQUIPMENT"] as const;
export type PurchaseResourceType = (typeof purchaseResourceTypes)[number];

export const purchaseResourceTypeLabels: Record<PurchaseResourceType, string> =
	{
		MATERIAL: "Material",
		TOOL: "Herramienta",
		EQUIPMENT: "Maquinaria y equipo",
	};

export function parsePurchaseResourceType(
	value: unknown,
): PurchaseResourceType | null {
	return purchaseResourceTypes.includes(value as PurchaseResourceType)
		? (value as PurchaseResourceType)
		: null;
}
