import { z } from "zod";

const optionalEmail = z
	.string()
	.trim()
	.max(254, "El correo es demasiado largo.")
	.refine((value) => !value || z.email().safeParse(value).success, {
		message: "Ingrese un correo válido.",
	});

export const supplierInputSchema = z
	.object({
		id: z.string().trim().optional(),
		businessName: z
			.string()
			.trim()
			.min(2, "La razón social es obligatoria.")
			.max(160, "La razón social es demasiado larga."),
		tradeName: z
			.string()
			.trim()
			.max(160, "El nombre comercial es demasiado largo.")
			.optional(),
		taxId: z
			.string()
			.trim()
			.toUpperCase()
			.min(2, "El NIT es obligatorio.")
			.max(32, "El NIT es demasiado largo.")
			.regex(
				/^(CF|\d{5,12}-?[\dK])$/,
				"Ingrese un NIT válido, por ejemplo 1234567-8 o CF.",
			),
		contactName: z
			.string()
			.trim()
			.max(120, "El nombre del contacto es demasiado largo.")
			.optional(),
		email: optionalEmail.optional(),
		phone: z
			.string()
			.trim()
			.regex(/^$|^\d{8}$/, "El teléfono debe tener 8 dígitos."),
		address: z
			.string()
			.trim()
			.max(500, "La dirección es demasiado larga.")
			.optional(),
		notes: z
			.string()
			.trim()
			.max(1000, "Las notas son demasiado largas.")
			.optional(),
	})
	.superRefine((input, context) => {
		if (!input.email && !input.phone) {
			context.addIssue({
				code: "custom",
				path: ["phone"],
				message: "Ingrese un teléfono o un correo de contacto.",
			});
		}
	});

const purchaseOrderItemSchema = z.object({
	requisitionItemId: z.string().trim().optional(),
	materialId: z.string().trim().optional(),
	description: z.string().trim().max(191).optional(),
	quantity: z.coerce.number().finite().positive().optional(),
	unit: z.string().trim().max(40).optional(),
	unitCost: z.coerce
		.number({ message: "Ingrese un costo válido." })
		.finite()
		.positive("Cada renglón debe tener un costo mayor que cero."),
});

export const purchaseOrderInputSchema = z
	.object({
		requisitionId: z.string().trim().optional(),
		projectId: z.string().trim().optional(),
		budgetExceptionReason: z.string().trim().optional(),
		warehouseId: z.string().trim().optional(),
		supplierId: z.string().trim().min(1, "Seleccione un proveedor."),
		issueDate: z
			.string()
			.trim()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "Ingrese una fecha válida."),
		expectedDate: z
			.string()
			.trim()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de entrega es obligatoria."),
		paymentType: z.enum(["IMMEDIATE", "ON_DELIVERY", "CREDIT"]),
		paymentDueDate: z
			.string()
			.trim()
			.refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
				message: "Ingrese una fecha de vencimiento válida.",
			}),
		taxPercentage: z.coerce
			.number()
			.finite()
			.min(0, "El porcentaje no puede ser negativo.")
			.max(100, "El porcentaje no puede superar 100."),
		notes: z.string().trim().optional(),
		items: z
			.array(purchaseOrderItemSchema)
			.min(1, "La orden no tiene renglones."),
	})
	.superRefine((input, context) => {
		if (input.expectedDate && input.expectedDate < input.issueDate) {
			context.addIssue({
				code: "custom",
				path: ["expectedDate"],
				message: "La entrega no puede ser anterior a la emisión.",
			});
		}
		if (input.paymentType === "CREDIT" && !input.paymentDueDate) {
			context.addIssue({
				code: "custom",
				path: ["paymentDueDate"],
				message: "Ingrese cuándo vence el pago a crédito.",
			});
		}
		if (
			input.paymentType === "CREDIT" &&
			input.paymentDueDate &&
			input.paymentDueDate < input.issueDate
		) {
			context.addIssue({
				code: "custom",
				path: ["paymentDueDate"],
				message: "El vencimiento no puede ser anterior a la compra.",
			});
		}
		if (input.requisitionId) {
			input.items.forEach((item, index) => {
				if (!item.requisitionItemId) {
					context.addIssue({
						code: "custom",
						path: ["items", index, "requisitionItemId"],
						message: "El renglón no pertenece a la solicitud.",
					});
				}
			});
			return;
		}
		if (
			input.projectId &&
			(!input.budgetExceptionReason || input.budgetExceptionReason.length < 10)
		) {
			context.addIssue({
				code: "custom",
				path: ["budgetExceptionReason"],
				message:
					"Explique por qué la compra del proyecto se realizará sin una solicitud presupuestada.",
			});
		}
		if (!input.warehouseId) {
			context.addIssue({
				code: "custom",
				path: ["warehouseId"],
				message: "Seleccione la bodega que recibirá la compra.",
			});
		}
		const materialIds = input.items.flatMap((item) =>
			item.materialId ? [item.materialId] : [],
		);
		if (new Set(materialIds).size !== materialIds.length) {
			context.addIssue({
				code: "custom",
				path: ["items"],
				message: "Cada artículo debe aparecer una sola vez en la compra.",
			});
		}
		input.items.forEach((item, index) => {
			if (!item.materialId || !item.quantity) {
				context.addIssue({
					code: "custom",
					path: ["items", index],
					message: "Complete el artículo y la cantidad de cada renglón.",
				});
			}
		});
	});

const receiptLineSchema = z.object({
	purchaseOrderItemId: z.string().trim().min(1),
	quantity: z.coerce
		.number({ message: "Ingrese una cantidad valida." })
		.finite()
		.positive("La cantidad recibida debe ser mayor que cero."),
});

export const purchaseReceiptInputSchema = z.object({
	purchaseOrderId: z.string().trim().min(1, "Seleccione una orden."),
	receivedDate: z
		.string()
		.trim()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Ingrese una fecha valida."),
	reference: z
		.string()
		.trim()
		.min(1, "La referencia de entrega es obligatoria."),
	notes: z.string().trim().optional(),
	items: z
		.array(receiptLineSchema)
		.min(1, "Registre al menos un renglon recibido."),
});

export type SupplierInput = z.infer<typeof supplierInputSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderInputSchema>;
export type PurchaseReceiptInput = z.infer<typeof purchaseReceiptInputSchema>;

export const purchaseOrderStatusLabels = {
	DRAFT: "Borrador",
	ISSUED: "Emitida",
	PARTIAL: "Recepción parcial",
	RECEIVED: "Recibida",
	CANCELED: "Anulada",
} as const;
