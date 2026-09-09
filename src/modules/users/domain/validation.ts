import { z } from "zod";
import {
	COMPANY_EMAIL_DOMAIN,
	isCompanyEmail,
} from "@/modules/auth/domain/email-domain";

const emptyToUndefined = (value: unknown) =>
	typeof value === "string" && value.trim() === "" ? undefined : value;

function normalizeCompanyEmail(value: unknown) {
	const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
	if (!raw) return raw;
	return raw.includes("@") ? raw : `${raw}@${COMPANY_EMAIL_DOMAIN}`;
}

export const createUserSchema = z.object({
	name: z.preprocess(
		emptyToUndefined,
		z.string().trim().min(3, "Nombre requerido"),
	),
	email: z.preprocess(
		normalizeCompanyEmail,
		z
			.string()
			.email("Correo invalido")
			.refine(isCompanyEmail, `Debe terminar en @${COMPANY_EMAIL_DOMAIN}`),
	),
	phone: z
		.string()
		.trim()
		.regex(/^\d{8}$/, "El teléfono debe tener exactamente 8 dígitos"),
	password: z.string().min(10, "Minimo 10 caracteres"),
	status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
	roleIds: z.array(z.string().uuid()).min(1, "Selecciona al menos un rol"),
});

export const updateUserSchema = z.object({
	name: z.preprocess(
		emptyToUndefined,
		z.string().trim().min(3, "Nombre requerido"),
	),
	email: z.preprocess(
		normalizeCompanyEmail,
		z
			.string()
			.email("Correo invalido")
			.refine(isCompanyEmail, `Debe terminar en @${COMPANY_EMAIL_DOMAIN}`),
	),
	phone: z.preprocess(
		emptyToUndefined,
		z
			.string()
			.trim()
			.regex(/^\d{8}$/, "El teléfono debe tener exactamente 8 dígitos")
			.optional(),
	),
	status: z.enum(["ACTIVE", "INACTIVE"]),
	roleIds: z.array(z.string().uuid()).min(1, "Selecciona al menos un rol"),
});

export const resetPasswordSchema = z.object({
	password: z.string().min(10, "Minimo 10 caracteres"),
});
