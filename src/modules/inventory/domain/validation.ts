import { z } from "zod";
import { wasteReasonValues } from "./waste-review";

const decimalInput = z.coerce
	.number({ message: "Debe ser un numero." })
	.finite()
	.min(0, "No puede ser negativo.");

export const inventoryMaterialInputSchema = z.object({
	code: z.string().trim().optional(),
	name: z.string().trim().min(2, "El material es obligatorio."),
	resourceType: z.enum(["MATERIAL", "TOOL", "EQUIPMENT"]).default("MATERIAL"),
	specification: z.string().trim().optional(),
	brand: z.string().trim().optional(),
	model: z.string().trim().optional(),
	trackIndividually: z.boolean().default(false),
	unit: z.string().trim().min(1, "La unidad es obligatoria."),
	unitCost: decimalInput.default(0),
	minimumStock: decimalInput.default(0),
	notes: z.string().trim().optional(),
});

export const inventoryMaterialUpdateInputSchema =
	inventoryMaterialInputSchema.extend({
		id: z.string().trim().min(1, "Seleccione un material."),
	});

export const warehouseInputSchema = z.object({
	code: z.string().trim().optional(),
	name: z.string().trim().min(2, "La bodega es obligatoria."),
	location: z.string().trim().optional(),
	notes: z.string().trim().optional(),
});

export const stockMovementInputSchema = z
	.object({
		materialId: z.string().trim().min(1, "Seleccione un material."),
		warehouseId: z.string().trim().min(1, "Seleccione una bodega."),
		destinationWarehouseId: z.string().trim().optional(),
		projectId: z.string().trim().optional(),
		type: z.enum(["IN", "OUT", "RETURN", "WASTE", "ADJUSTMENT", "TRANSFER"]),
		quantity: decimalInput.optional(),
		physicalStock: decimalInput.optional(),
		unitCost: decimalInput.default(0),
		reference: z
			.string()
			.trim()
			.max(120, "La referencia no puede superar 120 caracteres.")
			.optional(),
		notes: z
			.string()
			.trim()
			.max(1000, "El motivo no puede superar 1000 caracteres.")
			.optional(),
		responsibleName: z
			.string()
			.trim()
			.max(120, "El responsable no puede superar 120 caracteres.")
			.optional(),
		wasteReason: z.enum(wasteReasonValues).optional(),
		requestWasteReview: z.boolean().default(false),
		expectedReturnDate: z
			.string()
			.trim()
			.regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Fecha de devolución inválida.")
			.optional(),
	})
	.superRefine((input, context) => {
		if (input.type !== "ADJUSTMENT" && (!input.quantity || input.quantity <= 0))
			context.addIssue({
				code: "custom",
				path: ["quantity"],
				message: "La cantidad debe ser mayor que cero.",
			});
		if (
			input.type === "TRANSFER" &&
			(!input.destinationWarehouseId ||
				input.destinationWarehouseId === input.warehouseId)
		)
			context.addIssue({
				code: "custom",
				path: ["destinationWarehouseId"],
				message: "Seleccione una bodega destino diferente.",
			});
		if (input.type === "ADJUSTMENT" && input.physicalStock === undefined)
			context.addIssue({
				code: "custom",
				path: ["physicalStock"],
				message: "Indique el stock físico contado.",
			});
		if (input.type === "OUT" && input.responsibleName && !input.projectId)
			context.addIssue({
				code: "custom",
				path: ["projectId"],
				message: "Seleccione el proyecto al que se asignará el recurso.",
			});
		if (input.type === "WASTE" && !input.wasteReason)
			context.addIssue({
				code: "custom",
				path: ["wasteReason"],
				message: "Seleccione el motivo del desperdicio.",
			});
		if (input.type === "WASTE" && (!input.notes || input.notes.length < 8))
			context.addIssue({
				code: "custom",
				path: ["notes"],
				message: "Explique el desperdicio con al menos 8 caracteres.",
			});
	});

export const wasteReviewInputSchema = z
	.object({
		movementId: z.string().uuid("Movimiento inválido."),
		status: z.enum(["REVIEWED", "NEEDS_ACTION"]),
		notes: z
			.string()
			.trim()
			.max(1000, "La observación no puede superar 1000 caracteres.")
			.optional(),
	})
	.superRefine((input, context) => {
		if (
			input.status === "NEEDS_ACTION" &&
			(!input.notes || input.notes.length < 8)
		) {
			context.addIssue({
				code: "custom",
				path: ["notes"],
				message: "Explique la acción requerida con al menos 8 caracteres.",
			});
		}
	});

export type InventoryMaterialInput = z.infer<
	typeof inventoryMaterialInputSchema
>;
export type InventoryMaterialUpdateInput = z.infer<
	typeof inventoryMaterialUpdateInputSchema
>;
export type WarehouseInput = z.infer<typeof warehouseInputSchema>;
export type StockMovementInput = z.infer<typeof stockMovementInputSchema>;
export type WasteReviewInput = z.infer<typeof wasteReviewInputSchema>;
