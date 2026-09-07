import { z } from "zod";

const decimalInput = z.coerce
	.number({ message: "Debe ser un numero." })
	.finite()
	.min(0, "No puede ser negativo.");

export const expenseInputSchema = z.object({
	projectId: z.string().trim().min(1, "Seleccione un proyecto."),
	expenseDate: z.string().trim().min(1, "La fecha es obligatoria."),
	description: z.string().trim().min(3, "La descripcion es obligatoria."),
	vendor: z.string().trim().optional(),
	quantity: decimalInput.default(1),
	unit: z.string().trim().optional(),
	subtotal: decimalInput.refine(
		(value) => value > 0,
		"El subtotal debe ser mayor que cero.",
	),
	type: z.string().trim().optional(),
	phase: z.string().trim().optional(),
	budgetSectionNo: z.string().trim().optional(),
	activity: z.string().trim().optional(),
	documentNumber: z.string().trim().optional(),
	documentType: z.enum(["FACTURA", "RECIBO", "OTRO"]).optional(),
	paymentMethod: z.string().trim().optional(),
	notes: z.string().trim().optional(),
});

export const expenseDocumentInputSchema = z.object({
	financialExpenseId: z.string().trim().min(1, "Selecciona el gasto."),
	documentNumber: z.string().trim().min(1, "El número del comprobante es obligatorio."),
	documentType: z.enum(["FACTURA", "RECIBO", "OTRO"]),
});

export const paymentInputSchema = z.object({
	projectId: z.string().trim().min(1, "Seleccione un proyecto."),
	paymentNumber: z.string().trim().optional(),
	paymentDate: z.string().trim().min(1, "La fecha es obligatoria."),
	amount: decimalInput.refine(
		(value) => value > 0,
		"El abono debe ser mayor que cero.",
	),
	method: z.string().trim().optional(),
	reference: z.string().trim().optional(),
	observations: z.string().trim().optional(),
	concept: z.string().trim().optional(),
	budgetSectionId: z.string().trim().optional(),
});

export const supplierPaymentInputSchema = z.object({
	financialExpenseId: z.string().trim().min(1, "Seleccione la compra a pagar."),
	paymentDate: z.string().trim().min(1, "La fecha es obligatoria."),
	amount: decimalInput.refine(
		(value) => value > 0,
		"El pago debe ser mayor que cero.",
	),
	method: z.string().trim().optional(),
	reference: z.string().trim().optional(),
	notes: z.string().trim().optional(),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type ExpenseDocumentInput = z.infer<typeof expenseDocumentInputSchema>;
export type PaymentInput = z.infer<typeof paymentInputSchema>;
export type SupplierPaymentInput = z.infer<typeof supplierPaymentInputSchema>;
