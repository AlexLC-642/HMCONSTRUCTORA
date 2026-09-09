import { z } from "zod";

export const websiteInquiryInputSchema = z.object({
	name: z.string().trim().min(2, "Escribe tu nombre completo.").max(160),
	phone: z.string().trim().min(7, "Escribe un teléfono válido.").max(30),
	email: z.string().trim().email("Escribe un correo válido.").max(200),
	message: z
		.string()
		.trim()
		.min(10, "Cuéntanos un poco más sobre tu proyecto.")
		.max(4000),
	// Honeypot: real visitors never fill this hidden field. Bots that
	// autofill every input will, marking the submission as spam.
	website: z.string().trim().max(200).optional(),
	// Time-trap: the form embeds the render timestamp; a submission that
	// arrives faster than a human could plausibly fill the form is spam.
	startedAt: z.coerce.number().optional(),
});

export type WebsiteInquiryInput = z.infer<typeof websiteInquiryInputSchema>;

export const websiteInquiryStatusLabels = {
	NEW: "Nueva",
	IN_PROGRESS: "En seguimiento",
	CLOSED: "Cerrada",
	SPAM: "Spam",
} as const;

export const websiteInquiryStatusValues = [
	"NEW",
	"IN_PROGRESS",
	"CLOSED",
	"SPAM",
] as const;

export const websiteInquiryStatusUpdateSchema = z.object({
	id: z.string().trim().min(1),
	status: z.enum(websiteInquiryStatusValues),
	notes: z.string().trim().max(2000).optional(),
});

export type WebsiteInquiryStatusUpdateInput = z.infer<
	typeof websiteInquiryStatusUpdateSchema
>;

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((value) => (value ? value : undefined));

export const websiteSettingsInputSchema = z.object({
	heroEyebrow: optionalText(120),
	heroHeading: optionalText(200),
	heroSubheading: optionalText(600),
	heroImageUrl: optionalText(500),
	homeServicesEyebrow: optionalText(120),
	homeServicesHeading: optionalText(240),
	ctaHeading: optionalText(240),
	ctaText: optionalText(600),
	aboutHeading: optionalText(200),
	aboutText: optionalText(2000),
	missionText: optionalText(2000),
	visionText: optionalText(2000),
	phonePrimary: optionalText(30),
	phoneSecondary: optionalText(30),
	email: z
		.string()
		.trim()
		.max(200)
		.optional()
		.refine(
			(value) => !value || z.string().email().safeParse(value).success,
			"Correo inválido.",
		),
	address: optionalText(300),
	hoursWeekdays: optionalText(120),
	hoursSaturday: optionalText(120),
	facebookUrl: optionalText(300),
	instagramUrl: optionalText(300),
	servicesEyebrow: optionalText(120),
	servicesHeading: optionalText(240),
	projectsEyebrow: optionalText(120),
	projectsHeading: optionalText(240),
	projectsSubheading: optionalText(600),
	contactEyebrow: optionalText(120),
	contactHeading: optionalText(240),
	contactSubheading: optionalText(1000),
	seoTitle: optionalText(160),
	seoDescription: optionalText(300),
	published: z.boolean().default(true),
});

export type WebsiteSettingsInput = z.infer<typeof websiteSettingsInputSchema>;

export const websiteServiceInputSchema = z.object({
	id: z.string().trim().optional(),
	title: z.string().trim().min(2, "El título es obligatorio.").max(160),
	description: z.string().trim().min(5, "Escribe una descripción.").max(600),
	icon: z.string().trim().max(60).optional(),
	active: z.boolean().default(true),
});

export type WebsiteServiceInput = z.infer<typeof websiteServiceInputSchema>;

export const websitePhotoUploadInputSchema = z.object({
	title: z.string().trim().min(2, "Escribe un título.").max(160),
	altText: z.string().trim().max(200).optional(),
});

export const websitePhotoFromEvidenceInputSchema = z.object({
	dailyReportMediaId: z.string().trim().min(1),
	title: z.string().trim().min(2, "Escribe un título.").max(160),
	altText: z.string().trim().max(200).optional(),
});
