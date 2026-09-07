import { z } from "zod";

export const projectStatuses = [
	"DRAFT",
	"PLANNING",
	"ACTIVE",
	"PAUSED",
	"COMPLETED",
	"ARCHIVED",
	"CANCELED",
] as const;

export const projectStatusLabels: Record<
	(typeof projectStatuses)[number],
	string
> = {
	DRAFT: "Borrador",
	PLANNING: "Planificacion",
	ACTIVE: "Activo",
	PAUSED: "Pausado",
	COMPLETED: "Finalizado",
	ARCHIVED: "Archivado",
	CANCELED: "Cancelado",
};

const emptyToUndefined = (value: unknown) =>
	value == null || (typeof value === "string" && value.trim() === "")
		? undefined
		: value;

const optionalDate = z.preprocess(
	emptyToUndefined,
	z
		.string()
		.refine((value) => {
			const date = new Date(`${value}T00:00:00.000Z`);
			return (
				/^\d{4}-\d{2}-\d{2}$/.test(value) &&
				!Number.isNaN(date.getTime()) &&
				date.toISOString().slice(0, 10) === value
			);
		}, "Debe indicar una fecha valida.")
		.optional(),
);

export const projectFormSchema = z
	.object({
		internalId: z.preprocess(
			emptyToUndefined,
			z.string().trim().min(2).optional(),
		),
		code: z.preprocess(emptyToUndefined, z.string().trim().min(2).optional()),
		name: z.preprocess(emptyToUndefined, z.string().trim().min(3, "Requerido")),
		description: z.preprocess(emptyToUndefined, z.string().trim().optional()),
		clientName: z.preprocess(
			emptyToUndefined,
			z.string().trim().min(2).optional(),
		),
		clientContactName: z.preprocess(
			emptyToUndefined,
			z.string().trim().optional(),
		),
		clientEmail: z.preprocess(
			emptyToUndefined,
			z.string().email("Correo invalido").optional(),
		),
		clientPhone: z.preprocess(
			emptyToUndefined,
			z
				.string()
				.trim()
				.regex(/^\d{8}$/, "El teléfono debe tener exactamente 8 dígitos")
				.optional(),
		),
		location: z.preprocess(emptyToUndefined, z.string().trim().optional()),
		startDate: optionalDate,
		expectedEndDate: optionalDate,
		responsibleId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
		status: z.enum(projectStatuses).default("DRAFT"),
		currency: z.literal("GTQ"),
		baseBudget: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
		progressPercentage: z.coerce
			.number()
			.min(0, "No puede ser menor a 0")
			.max(100, "No puede superar 100")
			.default(0),
		observations: z.preprocess(emptyToUndefined, z.string().trim().optional()),
		memberIds: z.array(z.string().uuid()).default([]),
		portalEnabled: z.coerce.boolean().default(true),
	})
	.refine(
		(value) =>
			!value.startDate ||
			!value.expectedEndDate ||
			value.startDate <= value.expectedEndDate,
		{
			message: "La fecha final prevista no puede ser anterior al inicio.",
			path: ["expectedEndDate"],
		},
	);

export type ProjectFormInput = z.infer<typeof projectFormSchema>;

export function parseDateInput(value?: string) {
	if (!value) {
		return null;
	}

	return new Date(`${value}T00:00:00.000Z`);
}

export function formatDateInput(value?: Date | string | null) {
	if (!value) {
		return "";
	}

	return new Date(value).toISOString().slice(0, 10);
}
