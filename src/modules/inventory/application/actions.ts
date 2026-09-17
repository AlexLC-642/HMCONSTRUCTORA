"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
	requireProjectScopePortfolioPermission,
	requireScopedProjectPermission,
} from "@/modules/auth/application/authorization";
import { prisma } from "@/shared/lib/prisma";
import {
	createInventoryMaterial,
	createWarehouse,
	recordStockMovement,
	reviewWasteMovement,
	updateInventoryMaterial,
} from "./service";

function value(formData: FormData, key: string) {
	const raw = formData.get(key);
	return typeof raw === "string" ? raw : "";
}

export async function createInventoryMaterialAction(formData: FormData) {
	const user = await requireProjectScopePortfolioPermission(
		"inventario.mover",
		"inventory",
	);
	await createInventoryMaterial(
		{
			name: value(formData, "name"),
			resourceType: value(formData, "resourceType"),
			specification: value(formData, "specification"),
			brand: value(formData, "brand"),
			model: value(formData, "model"),
			trackIndividually: formData.get("trackIndividually") === "on",
			unit: value(formData, "unit"),
			unitCost: value(formData, "unitCost"),
			minimumStock: value(formData, "minimumStock"),
			notes: value(formData, "notes"),
		},
		{ userId: user.id },
	);
	revalidatePath("/inventory");
	redirect("/inventory?view=catalog" as Route);
}

export async function updateInventoryMaterialAction(formData: FormData) {
	const user = await requireProjectScopePortfolioPermission(
		"inventario.mover",
		"inventory",
	);
	await updateInventoryMaterial(
		{
			id: value(formData, "id"),
			code: value(formData, "code"),
			name: value(formData, "name"),
			resourceType: value(formData, "resourceType"),
			specification: value(formData, "specification"),
			brand: value(formData, "brand"),
			model: value(formData, "model"),
			trackIndividually: formData.get("trackIndividually") === "on",
			unit: value(formData, "unit"),
			unitCost: value(formData, "unitCost"),
			minimumStock: value(formData, "minimumStock"),
			notes: value(formData, "notes"),
			responsibleName: value(formData, "responsibleName"),
			expectedReturnDate: value(formData, "expectedReturnDate"),
		},
		{ userId: user.id },
	);
	revalidatePath("/inventory");
	redirect("/inventory?view=catalog" as Route);
}

export async function createWarehouseAction(formData: FormData) {
	const user = await requireProjectScopePortfolioPermission(
		"inventario.mover",
		"inventory",
	);
	await createWarehouse(
		{
			name: value(formData, "name"),
			location: value(formData, "location"),
			notes: value(formData, "notes"),
		},
		{ userId: user.id },
	);
	revalidatePath("/inventory");
	redirect("/inventory?view=catalog" as Route);
}

export async function recordStockMovementAction(formData: FormData) {
	const projectId = value(formData, "projectId");
	const user = projectId
		? await requireScopedProjectPermission(
				projectId,
				"inventario.mover",
				"inventory",
			)
		: await requireProjectScopePortfolioPermission(
				"inventario.mover",
				"inventory",
			);
	await recordStockMovement(
		{
			materialId: value(formData, "materialId"),
			warehouseId: value(formData, "warehouseId"),
			destinationWarehouseId: value(formData, "destinationWarehouseId"),
			projectId,
			type: value(formData, "type"),
			quantity: value(formData, "quantity"),
			physicalStock: value(formData, "physicalStock") || undefined,
			unitCost: value(formData, "unitCost"),
			reference: value(formData, "reference"),
			notes: value(formData, "notes"),
			responsibleName: value(formData, "responsibleName"),
			expectedReturnDate: value(formData, "expectedReturnDate"),
			wasteReason: value(formData, "wasteReason") || undefined,
			requestWasteReview: formData.get("requestWasteReview") === "on",
		},
		{ userId: user.id },
	);
	revalidatePath("/inventory");
	redirect("/inventory?view=stock" as Route);
}

export async function reviewWasteMovementAction(formData: FormData) {
	const movementId = value(formData, "movementId");
	const movement = await prisma.stockMovement.findUnique({
		where: { id: movementId },
		select: { projectId: true },
	});
	if (!movement) throw new Error("El movimiento ya no existe.");

	const user = movement.projectId
		? await requireScopedProjectPermission(
				movement.projectId,
				"inventario.desperdicio.revisar",
				"inventory",
			)
		: await requireProjectScopePortfolioPermission(
				"inventario.desperdicio.revisar",
				"inventory",
			);

	await reviewWasteMovement(
		{
			movementId,
			status: value(formData, "status"),
			notes: value(formData, "notes"),
		},
		{ userId: user.id },
	);
	revalidatePath("/inventory");
	revalidatePath("/api/notifications");
	redirect("/inventory?view=movement&review=pending" as Route);
}
