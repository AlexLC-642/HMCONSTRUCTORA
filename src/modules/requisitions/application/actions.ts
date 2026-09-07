"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import {
	approveRequisition,
	closeRequisition,
	createRequisition,
	deliverRequisition,
	linkRequisitionItemMaterial,
	markRequisitionPurchased,
	receiveRequisition,
	rejectRequisition,
	reviewRequisition,
} from "./service";

function value(formData: FormData, key: string) {
	const raw = formData.get(key);
	return typeof raw === "string" ? raw : "";
}

function jsonValue(formData: FormData, key: string) {
	const raw = value(formData, key);
	if (!raw) return [];
	try {
		return JSON.parse(raw) as unknown;
	} catch {
		throw new Error(
			"No se pudo leer la lista de recursos. Revise los datos e intente de nuevo.",
		);
	}
}

function refresh() {
	revalidatePath("/requisitions");
	revalidatePath("/inventory");
	revalidatePath("/finances");
	revalidatePath("/dashboard");
	revalidatePath("/projects");
	redirect("/requisitions" as Route);
}

export async function createRequisitionAction(formData: FormData) {
	const user = await requirePermission("inventario.mover");
	await createRequisition(
		{
			destinationType: value(formData, "destinationType"),
			projectId: value(formData, "projectId"),
			warehouseId: value(formData, "warehouseId"),
			title: value(formData, "title"),
			priority: value(formData, "priority"),
			neededDate: value(formData, "neededDate"),
			requestedBy: value(formData, "requestedBy"),
			notes: value(formData, "notes"),
			items: jsonValue(formData, "items"),
		},
		{ userId: user.id },
	);
	refresh();
}

export async function linkRequisitionItemMaterialAction(formData: FormData) {
	const user = await requirePermission("requerimiento.aprobar");
	await linkRequisitionItemMaterial(
		{
			requisitionItemId: value(formData, "requisitionItemId"),
			mode: value(formData, "mode"),
			materialId: value(formData, "materialId"),
			name: value(formData, "name"),
			unit: value(formData, "unit"),
			unitCost: value(formData, "unitCost"),
			minimumStock: value(formData, "minimumStock"),
			resourceType: value(formData, "resourceType"),
			specification: value(formData, "specification"),
			brand: value(formData, "brand"),
			model: value(formData, "model"),
			trackIndividually: formData.get("trackIndividually") === "on",
		},
		{ userId: user.id },
	);
	refresh();
}

export async function approveRequisitionAction(formData: FormData) {
	const user = await requirePermission("requerimiento.aprobar");
	await approveRequisition(value(formData, "requisitionId"), {
		userId: user.id,
	});
	refresh();
}

export async function reviewRequisitionAction(formData: FormData) {
	const user = await requirePermission("requerimiento.aprobar");
	await reviewRequisition(value(formData, "requisitionId"), {
		userId: user.id,
	});
	refresh();
}

export async function rejectRequisitionAction(formData: FormData) {
	const user = await requirePermission("requerimiento.aprobar");
	await rejectRequisition(value(formData, "requisitionId"), {
		userId: user.id,
	});
	refresh();
}

export async function markRequisitionPurchasedAction(formData: FormData) {
	const user = await requirePermission("requerimiento.aprobar");
	await markRequisitionPurchased(value(formData, "requisitionId"), {
		userId: user.id,
	});
	refresh();
}

export async function receiveRequisitionAction(formData: FormData) {
	const user = await requirePermission("requerimiento.aprobar");
	await receiveRequisition(value(formData, "requisitionId"), {
		userId: user.id,
	});
	refresh();
}

export async function deliverRequisitionAction(formData: FormData) {
	const user = await requirePermission("requerimiento.aprobar");
	await deliverRequisition(value(formData, "requisitionId"), {
		userId: user.id,
	});
	refresh();
}

export async function closeRequisitionAction(formData: FormData) {
	const user = await requirePermission("requerimiento.aprobar");
	await closeRequisition(value(formData, "requisitionId"), { userId: user.id });
	refresh();
}
