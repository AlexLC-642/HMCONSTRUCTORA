"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireScopedProjectPermission } from "@/modules/auth/application/authorization";
import {
	attachExpenseDocument,
	createClientPayment,
	createExpense,
	createPurchaseInvoice,
	recordSupplierPayment,
} from "./service";

function value(formData: FormData, key: string) {
	const raw = formData.get(key);
	return typeof raw === "string" ? raw : "";
}

export async function createPurchaseInvoiceAction(formData: FormData) {
	const projectId = value(formData, "projectId");
	const user = await requireScopedProjectPermission(
		projectId,
		"finanzas.registrar",
		"finances",
	);
	const file = formData.get("documentFile");
	if (!(file instanceof File) || file.size <= 0) {
		throw new Error("Adjunte el archivo de la factura.");
	}
	await createPurchaseInvoice(
		{
			projectId,
			purchaseOrderId: value(formData, "purchaseOrderId"),
			expenseDate: value(formData, "expenseDate"),
			documentNumber: value(formData, "documentNumber"),
			subtotal: value(formData, "subtotal"),
			notes: value(formData, "notes"),
		},
		file,
		{ userId: user.id },
	);
	returnTo(projectId);
}

function returnTo(projectId: string) {
	revalidatePath("/finances");
	redirect(`/finances?projectId=${projectId}` as Route);
}

export async function createExpenseAction(formData: FormData) {
	const projectId = value(formData, "projectId");
	const user = await requireScopedProjectPermission(
		projectId,
		"finanzas.registrar",
		"finances",
	);
	await createExpense(
		{
			projectId,
			expenseDate: value(formData, "expenseDate"),
			description: value(formData, "description"),
			vendor: value(formData, "vendor"),
			quantity: value(formData, "quantity"),
			unit: value(formData, "unit"),
			subtotal: value(formData, "subtotal"),
			type: value(formData, "type"),
			phase: value(formData, "phase"),
			budgetSectionNo: value(formData, "budgetSectionNo"),
			activity: value(formData, "activity"),
			documentNumber: value(formData, "documentNumber"),
			documentType: value(formData, "documentType") || undefined,
			paymentMethod: value(formData, "paymentMethod"),
			notes: value(formData, "notes"),
		},
		{ userId: user.id },
		formData.get("documentFile") instanceof File
			? (formData.get("documentFile") as File)
			: undefined,
	);
	returnTo(projectId);
}

export async function attachExpenseDocumentAction(formData: FormData) {
	const projectId = value(formData, "projectId");
	const user = await requireScopedProjectPermission(
		projectId,
		"finanzas.registrar",
		"finances",
	);
	const file = formData.get("documentFile");
	if (!(file instanceof File)) throw new Error("Selecciona un archivo.");
	await attachExpenseDocument(
		{
			financialExpenseId: value(formData, "financialExpenseId"),
			documentNumber: value(formData, "documentNumber"),
			documentType: value(formData, "documentType"),
		},
		file,
		{ userId: user.id },
	);
	returnTo(projectId);
}

export async function recordSupplierPaymentAction(formData: FormData) {
	const projectId = value(formData, "projectId");
	const user = await requireScopedProjectPermission(
		projectId,
		"finanzas.registrar",
		"finances",
	);
	await recordSupplierPayment(
		{
			financialExpenseId: value(formData, "financialExpenseId"),
			paymentDate: value(formData, "paymentDate"),
			amount: value(formData, "amount"),
			method: value(formData, "method"),
			reference: value(formData, "reference"),
			notes: value(formData, "notes"),
		},
		{ userId: user.id },
	);
	returnTo(projectId);
}

export async function createClientPaymentAction(formData: FormData) {
	const projectId = value(formData, "projectId");
	const user = await requireScopedProjectPermission(
		projectId,
		"finanzas.registrar",
		"finances",
	);
	await createClientPayment(
		{
			projectId,
			paymentNumber: value(formData, "paymentNumber"),
			paymentDate: value(formData, "paymentDate"),
			amount: value(formData, "amount"),
			method: value(formData, "method"),
			reference: value(formData, "reference"),
			observations: value(formData, "observations"),
			concept: value(formData, "concept"),
			budgetSectionId: value(formData, "budgetSectionId"),
		},
		{ userId: user.id },
	);
	returnTo(projectId);
}
