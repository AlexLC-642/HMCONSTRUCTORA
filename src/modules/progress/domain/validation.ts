import { z } from "zod";
import { scheduleActivityStatuses } from "@/modules/schedules/domain/validation";

const decimalInput = z.coerce
	.string()
	.trim()
	.default("0")
	.transform((value) => (value === "" ? "0" : value))
	.refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
		message: "Debe ser un numero con hasta 2 decimales",
	});

const timeInput = z
	.string()
	.trim()
	.optional()
	.default("")
	.refine((value) => value === "" || /^\d{2}:\d{2}$/.test(value), {
		message: "Debe usar formato HH:mm",
	});

const dateInput = z
	.string()
	.trim()
	.refine((value) => {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
		const date = new Date(`${value}T00:00:00.000Z`);
		return (
			!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
		);
	}, "Debe indicar una fecha valida.");

const dailyReportActivityInputSchema = z.object({
	id: z.string().trim().optional(),
	scheduleActivityId: z.string().trim().optional().default(""),
	activityCode: z.string().trim().min(1, "La actividad necesita codigo."),
	activityName: z.string().trim().min(1, "La actividad necesita nombre."),
	budgetSectionCode: z.string().trim().optional().default(""),
	budgetSectionName: z.string().trim().optional().default(""),
	workDescription: z.string().trim().min(1, "Describe el trabajo ejecutado."),
	unit: z.string().trim().optional().default(""),
	contractedQuantity: decimalInput,
	previousQuantity: decimalInput,
	todayQuantity: decimalInput,
	previousProgress: decimalInput,
	status: z.enum(scheduleActivityStatuses),
	issues: z.string().trim().optional().default(""),
	position: z.coerce.number().int().min(1),
});

const dailyReportLaborInputSchema = z.object({
	workerLabel: z.string().trim().optional().default(""),
	role: z.string().trim().optional().default(""),
	people: decimalInput,
	hours: decimalInput,
	rate: decimalInput,
	notes: z.string().trim().optional().default(""),
	position: z.coerce.number().int().min(1),
});

const dailyReportMaterialInputSchema = z
	.object({
		materialId: z.string().trim().optional().default(""),
		warehouseId: z.string().trim().optional().default(""),
		materialName: z.string().trim().optional().default(""),
		warehouse: z.string().trim().optional().default(""),
		quantityUsed: decimalInput,
		unit: z.string().trim().optional().default(""),
		wasteQuantity: decimalInput,
		returnedQuantity: decimalInput,
		activityCode: z.string().trim().optional().default(""),
		notes: z.string().trim().optional().default(""),
		position: z.coerce.number().int().min(1),
	})
	.superRefine((entry, context) => {
		if (Number(entry.quantityUsed) <= 0) return;
		if (!entry.materialId)
			context.addIssue({
				code: "custom",
				path: ["materialId"],
				message: "Seleccione el material del inventario.",
			});
		if (!entry.warehouseId)
			context.addIssue({
				code: "custom",
				path: ["warehouseId"],
				message: "Seleccione la bodega de salida.",
			});
	});

export const dailyReportInputSchema = z.object({
	reportId: z.string().trim().optional().default(""),
	reportNumber: z
		.string()
		.trim()
		.min(1, "El numero de informe es obligatorio."),
	reportDate: dateInput,
	siteManager: z.string().trim().min(1, "El encargado es obligatorio."),
	location: z.string().trim().optional().default(""),
	workShift: z.string().trim().optional().default(""),
	startTime: timeInput,
	endTime: timeInput,
	weather: z.string().trim().optional().default(""),
	generalObservations: z.string().trim().optional().default(""),
	activities: z
		.array(dailyReportActivityInputSchema)
		.min(1, "Agrega al menos una actividad."),
	laborEntries: z.array(dailyReportLaborInputSchema).default([]),
	materialEntries: z.array(dailyReportMaterialInputSchema).default([]),
});

export type DailyReportInput = z.infer<typeof dailyReportInputSchema>;
export type DailyReportActivityInput = z.infer<
	typeof dailyReportActivityInputSchema
>;
