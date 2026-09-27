import { z } from "zod";

// Single source of truth for the strength rules of a NEW password (creating a
// user, admin reset, changing your own). Login deliberately does not apply
// it, so accounts created under the old length-only rule can still sign in.
// Unicode classes so "Ñ"/"á" count as letters, not as special characters.
export const PASSWORD_MIN_LENGTH = 10;

export const passwordRules = [
	{
		id: "length",
		label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`,
		test: (value: string) => [...value].length >= PASSWORD_MIN_LENGTH,
	},
	{
		id: "upper",
		label: "Una letra mayúscula",
		test: (value: string) => /\p{Lu}/u.test(value),
	},
	{
		id: "lower",
		label: "Una letra minúscula",
		test: (value: string) => /\p{Ll}/u.test(value),
	},
	{
		id: "number",
		label: "Un número",
		test: (value: string) => /\p{N}/u.test(value),
	},
	{
		id: "special",
		label: "Un carácter especial (! @ # $ % …)",
		test: (value: string) => /[^\p{L}\p{N}\s]/u.test(value),
	},
] as const;

/** Same rules for the browser's `pattern` attribute (evaluated with the v flag). */
export const PASSWORD_HTML_PATTERN = `(?=.*\\p{Lu})(?=.*\\p{Ll})(?=.*\\p{N})(?=.*[^\\p{L}\\p{N}\\s]).{${PASSWORD_MIN_LENGTH},}`;

export const PASSWORD_POLICY_HINT =
	"Mínimo 10 caracteres, con mayúscula, minúscula, número y carácter especial.";

export const strongPasswordSchema = z.string().superRefine((value, context) => {
	for (const rule of passwordRules)
		if (!rule.test(value))
			context.addIssue({
				code: "custom",
				message: `La contraseña necesita: ${rule.label.toLowerCase()}.`,
			});
});
