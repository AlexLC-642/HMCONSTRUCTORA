"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
	canAccessProject,
	hasProjectScopePortfolioAccess,
	requirePermission,
	requireProjectScopePortfolioPermission,
	requireScopedProjectPermission,
} from "@/modules/auth/application/authorization";
import { prisma } from "@/shared/lib/prisma";
import {
	approveRequisition,
	closeRequisition,
	createRequisition,
	deliverRequisition,
	fulfillRequisitionFromStock,
	linkRequisitionItemMaterial,
	rejectRequisition,
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

async function requireRequisitionAccess(
	requisitionId: string,
	permission: string,
) {
	const user = await requirePermission(permission);
	if (hasProjectScopePortfolioAccess(user, "requisitions")) return user;
	const requisition = await prisma.requisition.findUnique({
		where: { id: requisitionId },
		select: { projectId: true },
	});
	if (
		!requisition?.projectId ||
		!(await canAccessProject(user, requisition.projectId))
	) {
		throw new Error("Este requerimiento no pertenece a uno de tus proyectos.");
	}
	return user;
}

async function requireRequisitionItemAccess(
	requisitionItemId: string,
	permission: string,
) {
	const item = await prisma.requisitionItem.findUnique({
		where: { id: requisitionItemId },
		select: { requisitionId: true },
	});
	if (!item) throw new Error("No se encontró el recurso solicitado.");
	return requireRequisitionAccess(item.requisitionId, permission);
}

export async function createRequisitionAction(formData: FormData) {
	const projectId = value(formData, "projectId");
	const user = projectId
		? await requireScopedProjectPermission(
				projectId,
				"inventario.mover",
				"requisitions",
			)
		: await requireProjectScopePortfolioPermission(
				"inventario.mover",
				"requisitions",
			);
	await createRequisition(
		{
			destinationType: value(formData, "destinationType"),
			projectId,
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
	const requisitionItemId = value(formData, "requisitionItemId");
	const user = await requireRequisitionItemAccess(
		requisitionItemId,
		"requerimiento.aprobar",
	);
	await linkRequisitionItemMaterial(
		{
			requisitionItemId,
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
	const requisitionId = value(formData, "requisitionId");
	const user = await requireRequisitionAccess(
		requisitionId,
		"requerimiento.aprobar",
	);
	await approveRequisition(requisitionId, {
		userId: user.id,
	});
	refresh();
}

export async function fulfillRequisitionFromStockAction(formData: FormData) {
	const requisitionId = value(formData, "requisitionId");
	const user = await requireRequisitionAccess(
		requisitionId,
		"requerimiento.aprobar",
	);
	await fulfillRequisitionFromStock(requisitionId, { userId: user.id });
	refresh();
}

export async function rejectRequisitionAction(formData: FormData) {
	const requisitionId = value(formData, "requisitionId");
	const user = await requireRequisitionAccess(
		requisitionId,
		"requerimiento.aprobar",
	);
	await rejectRequisition(requisitionId, {
		userId: user.id,
	});
	refresh();
}

export async function deliverRequisitionAction(formData: FormData) {
	const requisitionId = value(formData, "requisitionId");
	const user = await requireRequisitionAccess(
		requisitionId,
		"requerimiento.aprobar",
	);
	await deliverRequisition(requisitionId, {
		userId: user.id,
	});
	refresh();
}

export async function closeRequisitionAction(formData: FormData) {
	const requisitionId = value(formData, "requisitionId");
	const user = await requireRequisitionAccess(
		requisitionId,
		"requerimiento.aprobar",
	);
	await closeRequisition(requisitionId, { userId: user.id });
	refresh();
}
