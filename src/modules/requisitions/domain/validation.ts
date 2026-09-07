import { z } from "zod";

const decimalInput = z.coerce
	.number({ message: "Debe ser un numero." })
	.finite()
	.min(0, "No puede ser negativo.");

export const requisitionItemInputSchema = z.object({
	resourceType: z.enum(["MATERIAL", "TOOL", "EQUIPMENT"]).default("MATERIAL"),
	budgetLineItemId: z.string().trim().optional(),
	scheduleActivityId: z.string().trim().optional(),
	materialId: z.string().trim().optional(),
	description: z.string().trim().min(2, "Indique el recurso solicitado."),
	catalogNewMaterial: z.boolean().default(false),
	minimumStock: decimalInput.default(0),
	specification: z.string().trim().optional(),
	brand: z.string().trim().optional(),
	model: z.string().trim().optional(),
	trackIndividually: z.boolean().default(false),
	quantity: decimalInput.refine(
		(value) => value > 0,
		"La cantidad debe ser mayor que cero.",
	),
	unit: z.string().trim().optional(),
	estimatedCost: decimalInput.default(0),
	itemNotes: z.string().trim().optional(),
});

export const requisitionInputSchema = z
	.object({
		destinationType: z.enum(["PROJECT", "WAREHOUSE"]).default("PROJECT"),
		projectId: z.string().trim().optional(),
		warehouseId: z.string().trim().min(1, "Seleccione la bodega de recepcion."),
		title: z
			.string()
			.trim()
			.min(3, "Indique para que se necesitan los recursos."),
		priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
		neededDate: z
			.string()
			.trim()
			.regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Debe indicar una fecha valida.")
			.optional(),
		requestedBy: z.string().trim().optional(),
		notes: z.string().trim().optional(),
		items: z
			.array(requisitionItemInputSchema)
			.min(1, "Agregue al menos un recurso al requerimiento."),
	})
	.superRefine((input, context) => {
		if (input.destinationType === "PROJECT" && !input.projectId) {
			context.addIssue({
				code: "custom",
				path: ["projectId"],
				message: "Seleccione el proyecto donde se utilizaran los recursos.",
			});
		}
	});

export type RequisitionInput = z.infer<typeof requisitionInputSchema>;

export const requisitionMaterialLinkSchema = z
	.object({
		requisitionItemId: z
			.string()
			.trim()
			.min(1, "Seleccione el material del requerimiento."),
		mode: z.enum(["EXISTING", "NEW"]),
		materialId: z.string().trim().optional(),
		name: z.string().trim().optional(),
		unit: z.string().trim().optional(),
		unitCost: decimalInput.default(0),
		minimumStock: decimalInput.default(0),
		resourceType: z.enum(["MATERIAL", "TOOL", "EQUIPMENT"]).default("MATERIAL"),
		specification: z.string().trim().optional(),
		brand: z.string().trim().optional(),
		model: z.string().trim().optional(),
		trackIndividually: z.boolean().default(false),
	})
	.superRefine((input, context) => {
		if (input.mode === "EXISTING" && !input.materialId) {
			context.addIssue({
				code: "custom",
				path: ["materialId"],
				message: "Seleccione un material del catálogo.",
			});
		}
		if (input.mode === "NEW" && (!input.name || input.name.length < 2)) {
			context.addIssue({
				code: "custom",
				path: ["name"],
				message: "Indique el nombre del material.",
			});
		}
		if (input.mode === "NEW" && !input.unit) {
			context.addIssue({
				code: "custom",
				path: ["unit"],
				message: "Indique la unidad del material.",
			});
		}
	});

export type RequisitionMaterialLinkInput = z.infer<
	typeof requisitionMaterialLinkSchema
>;

export const requisitionStatusLabels = {
	DRAFT: "Borrador",
	REQUESTED: "Pendiente",
	REVIEWED: "Revisado",
	APPROVED: "Aprobado",
	PURCHASED: "Comprado",
	RECEIVED: "Recibido",
	DELIVERED: "Entregado",
	CLOSED: "Cerrado",
	REJECTED: "Rechazado",
} as const;

export const requisitionPriorityLabels = {
	LOW: "Baja",
	NORMAL: "Normal",
	HIGH: "Alta",
	URGENT: "Urgente",
} as const;
