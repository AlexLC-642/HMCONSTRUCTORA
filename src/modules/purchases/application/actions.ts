"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
	requireProjectScopePortfolioPermission,
	requireScopedProjectPermission,
} from "@/modules/auth/application/authorization";
import { createPurchaseInvoice } from "@/modules/finances/application/service";
import {
	purchaseOrderInputSchema,
	purchaseReceiptInputSchema,
	supplierInputSchema,
} from "../domain/validation";
import { createInventoryMaterial } from "@/modules/inventory/application/service";
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

export type PurchaseOrderStepState = {
	status: "idle" | "error";
	message: string;
};

/**
 * Los servicios de compras lanzan `Error` con mensajes pensados para el
 * usuario. Cualquier otra excepción (Prisma, red) se reemplaza por un mensaje
 * genérico para no filtrar detalles internos.
 */
function userMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.constructor === Error
		? error.message
		: fallback;
}

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
		budgetExceptionReason: value(formData, "budgetExceptionReason"),
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
			message: userMessage(
				error,
				"No se pudo guardar la compra. Inténtalo de nuevo.",
			),
		};
	}
	purchaseRefresh();
}

export async function issuePurchaseOrderAction(
	_previousState: PurchaseOrderStepState,
	formData: FormData,
): Promise<PurchaseOrderStepState> {
	const user = await requireProjectScopePortfolioPermission(
		"compras.gestionar",
		"purchases",
	);
	try {
		await issuePurchaseOrder(value(formData, "purchaseOrderId"), {
			userId: user.id,
		});
	} catch (error) {
		return {
			status: "error",
			message: userMessage(error, "No se pudo emitir la orden."),
		};
	}
	purchaseRefresh();
}

export async function cancelPurchaseOrderAction(
	_previousState: PurchaseOrderStepState,
	formData: FormData,
): Promise<PurchaseOrderStepState> {
	const user = await requireProjectScopePortfolioPermission(
		"compras.gestionar",
		"purchases",
	);
	try {
		await cancelPurchaseOrder(value(formData, "purchaseOrderId"), {
			userId: user.id,
		});
	} catch (error) {
		return {
			status: "error",
			message: userMessage(error, "No se pudo anular la orden."),
		};
	}
	purchaseRefresh();
}

export async function receivePurchaseOrderAction(
	_previousState: PurchaseOrderStepState,
	formData: FormData,
): Promise<PurchaseOrderStepState> {
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
			message: "No se pudieron leer las cantidades recibidas.",
		};
	}
	const parsed = purchaseReceiptInputSchema.safeParse({
		purchaseOrderId: value(formData, "purchaseOrderId"),
		receivedDate: value(formData, "receivedDate"),
		reference: value(formData, "reference"),
		notes: value(formData, "notes"),
		items,
	});
	if (!parsed.success) {
		return {
			status: "error",
			message:
				parsed.error.issues[0]?.message ??
				"Revisa la fecha, la referencia y las cantidades recibidas.",
		};
	}
	try {
		await receivePurchaseOrder(parsed.data, { userId: user.id });
	} catch (error) {
		return {
			status: "error",
			message: userMessage(error, "No se pudo registrar la recepción."),
		};
	}
	purchaseRefresh();
}

/**
 * La factura de una orden se ingresa en Compras. Se guarda con el mismo
 * servicio de Finanzas, así que el gasto del proyecto aparece allá sin
 * capturarlo otra vez.
 */
export async function registerPurchaseInvoiceAction(
	_previous: PurchaseOrderStepState,
	formData: FormData,
): Promise<PurchaseOrderStepState> {
	const projectId = String(formData.get("projectId") ?? "");
	const user = await requireScopedProjectPermission(
		projectId,
		"finanzas.registrar",
		"finances",
	);
	const file = formData.get("documentFile");
	if (!(file instanceof File) || file.size <= 0) {
		return { status: "error", message: "Adjunta el archivo de la factura." };
	}
	try {
		await createPurchaseInvoice(
			{
				projectId,
				purchaseOrderId: String(formData.get("purchaseOrderId") ?? ""),
				expenseDate: String(formData.get("expenseDate") ?? ""),
				documentNumber: String(formData.get("documentNumber") ?? ""),
				subtotal: String(formData.get("subtotal") ?? ""),
				notes: String(formData.get("notes") ?? ""),
			},
			file,
			{ userId: user.id },
		);
	} catch (error) {
		return {
			status: "error",
			message: userMessage(error, "No se pudo registrar la factura."),
		};
	}
	purchaseRefresh();
}

export type QuickMaterialState =
	| { status: "error"; message: string }
	| {
			status: "success";
			material: {
				id: string;
				code: string;
				name: string;
				unit: string;
				unitCost: number;
			};
	  };

/**
 * Alta rápida de un artículo desde el formulario de compra, para no obligar a
 * salir a Inventario. Reutiliza el servicio de Inventario, que reconoce un
 * artículo existente por nombre o código y lo reactiva en vez de duplicarlo.
 */
export async function quickCreatePurchaseMaterialAction(input: {
	name: string;
	unit: string;
	unitCost: number;
}): Promise<QuickMaterialState> {
	const user = await requireProjectScopePortfolioPermission(
		"compras.gestionar",
		"purchases",
	);
	const name = typeof input?.name === "string" ? input.name.trim() : "";
	const unit = typeof input?.unit === "string" ? input.unit.trim() : "";
	const unitCost = Number(input?.unitCost);
	if (name.length < 2) {
		return { status: "error", message: "Escribe el nombre del artículo." };
	}
	if (name.length > 191) {
		return { status: "error", message: "El nombre es demasiado largo." };
	}
	if (!unit || unit.length > 40) {
		return {
			status: "error",
			message: "Indica la unidad de compra (saco, m³, unidad...).",
		};
	}
	if (!Number.isFinite(unitCost) || unitCost < 0) {
		return { status: "error", message: "El costo debe ser cero o mayor." };
	}
	try {
		const material = await createInventoryMaterial(
			{ name, unit, unitCost, resourceType: "MATERIAL" },
			{ userId: user.id },
		);
		revalidatePath("/inventory");
		return {
			status: "success",
			material: {
				id: material.id,
				code: material.code,
				name: material.name,
				unit: material.unit,
				unitCost: material.unitCost.toNumber(),
			},
		};
	} catch (error) {
		return {
			status: "error",
			message: userMessage(error, "No se pudo crear el artículo."),
		};
	}
}
