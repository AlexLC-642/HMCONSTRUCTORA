import { z } from "zod";

export const scheduleActivityStatuses = ["PENDING", "IN_PROGRESS", "BLOCKED", "COMPLETED"] as const;

export const scheduleActivityStatusLabels = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En proceso",
  BLOCKED: "Bloqueada",
  COMPLETED: "Completada"
} as const;

const dateInput = z.coerce.string().trim().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Debe indicar una fecha valida.");

const percentInput = z.coerce
  .string()
  .trim()
  .default("0")
  .transform((value) => (value === "" ? "0" : value))
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Debe ser un numero con hasta 2 decimales"
  })
  .refine((value) => Number(value) >= 0 && Number(value) <= 100, {
    message: "El avance debe estar entre 0 y 100"
  });

export const scheduleActivityInputSchema = z
  .object({
    id: z.string().optional(),
    code: z.string().trim().min(1),
    description: z.string().trim().min(1),
    labor: z.string().trim().optional().default(""),
    budgetSectionCode: z.string().trim().optional().default(""),
    budgetSectionName: z.string().trim().optional().default(""),
    status: z.enum(scheduleActivityStatuses),
    plannedStart: dateInput,
    plannedEnd: dateInput,
    actualStart: z.string().trim().optional().default(""),
    actualEnd: z.string().trim().optional().default(""),
    progress: percentInput,
    position: z.coerce.number().int().min(1),
    notes: z.string().trim().optional().default(""),
    dependsOnCodes: z.array(z.string()).default([]),
    assigneeLabels: z.array(z.string()).default([])
  })
  .refine((value) => value.plannedStart <= value.plannedEnd, {
    message: "La fecha final planificada no puede ser anterior a la inicial",
    path: ["plannedEnd"]
  });

export const scheduleInputSchema = z.object({
  title: z.string().trim().min(1).default("Cronograma"),
  sourceReference: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
  activities: z.array(scheduleActivityInputSchema).min(1)
});

export type ScheduleInput = z.infer<typeof scheduleInputSchema>;
export type ScheduleActivityInput = z.infer<typeof scheduleActivityInputSchema>;
