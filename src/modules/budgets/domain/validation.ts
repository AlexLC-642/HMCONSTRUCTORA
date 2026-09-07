import { z } from "zod";

export const budgetLineTypes = ["MATERIAL", "LABOR", "OTHER"] as const;

export const budgetLineTypeLabels = {
	MATERIAL: "Material",
	LABOR: "Mano de obra",
	OTHER: "Otro",
} as const;

const decimalInput = z.coerce
	.string()
	.trim()
	.min(1, "Este valor es obligatorio; escribe 0 si no aplica")
	.refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
		message: "Debe ser 0 o un número mayor, con hasta 2 decimales",
	});

const percentageInput = decimalInput.refine((value) => Number(value) <= 100, {
	message: "El porcentaje debe estar entre 0 y 100",
});

const optionalDecimalInput = z.coerce
	.string()
	.trim()
	.optional()
	.default("")
	.refine((value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value), {
		message: "Debe ser un numero positivo con hasta 2 decimales",
	});

export const budgetLineItemInputSchema = z
	.object({
		id: z.string().optional(),
		type: z.enum(budgetLineTypes),
		position: z.coerce.number().int().min(1),
		description: z.string().trim().min(1, "La descripcion es requerida"),
		quantity: decimalInput,
		unit: z.string().trim().optional().default(""),
		days: optionalDecimalInput,
		unitPrice: decimalInput,
	})
	.superRefine((line, context) => {
		if (
			line.type === "LABOR" &&
			line.unit === "persona" &&
			Number(line.days) <= 0
		) {
			context.addIssue({
				code: "custom",
				message:
					"Indica al menos una jornada para la mano de obra por personal",
				path: ["days"],
			});
		}

		if (
			line.type === "LABOR" &&
			line.unit === "global" &&
			Number(line.quantity) !== 1
		) {
			context.addIssue({
				code: "custom",
				message: "La mano de obra por trato debe registrarse como un global",
				path: ["quantity"],
			});
		}
	});

export const budgetSectionInputSchema = z.object({
	id: z.string().optional(),
	code: z.string().trim().min(1, "El renglon es requerido"),
	name: z.string().trim().min(1, "El nombre del renglon es requerido"),
	category: z.string().trim().optional().default(""),
	position: z.coerce.number().int().min(1),
	lineItems: z.array(budgetLineItemInputSchema).min(1),
});

export const budgetVersionInputSchema = z.object({
	title: z.string().trim().min(1).default("Presupuesto"),
	sourceReference: z.string().trim().optional().default(""),
	notes: z.string().trim().optional().default(""),
	executorName: z.string().trim().max(160).optional().default(""),
	siteManagerCost: decimalInput,
	contingencyPercentage: percentageInput,
	administrationPercentage: percentageInput,
	profitPercentage: percentageInput,
	vatPercentage: percentageInput,
	financingPercentage: percentageInput,
	sections: z.array(budgetSectionInputSchema).min(1),
});

export type BudgetVersionInput = z.infer<typeof budgetVersionInputSchema>;
export type BudgetSectionInput = z.infer<typeof budgetSectionInputSchema>;
export type BudgetLineItemInput = z.infer<typeof budgetLineItemInputSchema>;
