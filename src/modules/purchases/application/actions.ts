"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProjectScopePortfolioPermission } from "@/modules/auth/application/authorization";
import {
	purchaseOrderInputSchema,
	supplierInputSchema,
} from "../domain/validation";
import {
	cancelPurchaseOrder,
	createPurchaseOrder,
	issuePurchaseOrder,
	receivePurchaseOrder,
	saveSupplier,
	setSupplierActive,
} from "./service";

export type SupplierFormState = {
	status: "idle" | "error";
	message: string;
	errors?: Record<string, string[] | undefined>;
};

export type PurchaseOrderFormState = {
	status: "idle" | "error";
	message: string;
	errors?: Record<string, string[] | undefined>;
};

function value(formData: FormData, key: string) {
	const raw = formData.get(key);
	return typeof raw === "string" ? raw : "";
}

function purchaseRefresh(destination = "/purchases"): never {
	revalidatePath("/purchases");
	revalidatePath("/requisitions");
	revalidatePath("/dashboard");
	revalidatePath("/finances");
	return redirect(destination as Route);
}

export async function saveSupplierAction(
	_previousState: SupplierFormState,
	formData: FormData,
): Promise<SupplierFormState> {
	const user = await requireProjectScopePortfolioPermission(
		"compras.gestionar",
		"purchases",
	);
	const parsed = supplierInputSchema.safeParse({
		id: value(formData, "id"),
		businessName: value(formData, "businessName"),
		tradeName: value(formData, "tradeName"),
		taxId: value(formData, "taxId"),
		contactName: value(formData, "contactName"),
		email: value(formData, "email"),
		phone: value(formData, "phone"),
		address: value(formData, "address"),
		notes: value(formData, "notes"),
	});
	if (!parsed.success) {
		return {
			status: "error",
			message: "Revisa los campos marcados antes de guardar.",
			errors: parsed.error.flatten().fieldErrors,
		};
	}

	try {
		await saveSupplier(parsed.data, { userId: user.id });
	} catch (error) {
		const duplicateTaxId =
			error instanceof Error && error.message.includes("este NIT");
		return {
			status: "error",
			message: duplicateTaxId
				? error.message
				: "No se pudo guardar el proveedor. Comprueba los datos e inténtalo de nuevo.",
			errors: duplicateTaxId ? { taxId: [error.message] } : undefined,
		};
	}

	purchaseRefresh("/purchases?view=suppliers");
}

export async function setSupplierActiveAction(formData: FormData) {
	const user = await requireProjectScopePortfolioPermission(
		"compras.gestionar",
		"purchases",
	);
	await setSupplierActive(
		value(formData, "supplierId"),
		value(formData, "active") === "true",
		{ userId: user.id },
	);
	purchaseRefresh("/purchases?view=suppliers");
}

export async function createPurchaseOrderAction(
	_previousState: PurchaseOrderFormState,
	formData: FormData,
): Promise<PurchaseOrderFormState> {
	const user = await requireProjectScopePortfolioPermission(
		"compras.gestionar",
		"purchases",
	);
	let items: unknown = [];
	try {
		items = JSON.parse(value(formData, "items"));
	} catch {
		return {
			status: "error",
			message: "No se pudieron leer los renglones de la compra.",
		};
	}
	const parsed = purchaseOrderInputSchema.safeParse({
		requisitionId: value(formData, "requisitionId"),
		projectId: value(formData, "projectId"),
		warehouseId: value(formData, "warehouseId"),
		supplierId: value(formData, "supplierId"),
		issueDate: value(formData, "issueDate"),
		expectedDate: value(formData, "expectedDate"),
		paymentType: value(formData, "paymentType"),
		paymentDueDate: value(formData, "paymentDueDate"),
		taxPercentage: value(formData, "taxPercentage"),
		notes: value(formData, "notes"),
		items,
	});
	if (!parsed.success) {
		return {
			status: "error",
			message: "Revisa los campos marcados antes de guardar la compra.",
			errors: parsed.error.flatten().fieldErrors,
		};
	}

	try {
		await createPurchaseOrder(parsed.data, { userId: user.id });
	} catch (error) {
		return {
			status: "error",
			message:
				error instanceof Error
					? error.message
					: "No se pudo guardar la compra. Inténtalo de nuevo.",
		};
	}
	purchaseRefresh();
}

export async function issuePurchaseOrderAction(formData: FormData) {
	const user = await requireProjectScopePortfolioPermission(
		"compras.gestionar",
		"purchases",
	);
	await issuePurchaseOrder(value(formData, "purchaseOrderId"), {
		userId: user.id,
	});
	purchaseRefresh();
}

export async function cancelPurchaseOrderAction(formData: FormData) {
	const user = await requireProjectScopePortfolioPermission(
		"compras.gestionar",
		"purchases",
	);
	await cancelPurchaseOrder(value(formData, "purchaseOrderId"), {
		userId: user.id,
	});
	purchaseRefresh();
}

export async function receivePurchaseOrderAction(formData: FormData) {
	const user = await requireProjectScopePortfolioPermission(
		"compras.gestionar",
		"purchases",
	);
	let items: unknown = [];
	try {
		items = JSON.parse(value(formData, "items"));
	} catch {
		throw new Error("No se pudieron leer las cantidades recibidas.");
	}
	await receivePurchaseOrder(
		{
			purchaseOrderId: value(formData, "purchaseOrderId"),
			receivedDate: value(formData, "receivedDate"),
			reference: value(formData, "reference"),
			notes: value(formData, "notes"),
			items,
		},
		{ userId: user.id },
	);
	purchaseRefresh();
}
