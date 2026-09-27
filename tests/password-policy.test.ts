import { describe, expect, it } from "vitest";
import {
	PASSWORD_HTML_PATTERN,
	passwordRules,
} from "@/modules/auth/domain/password-policy";
import { loginSchema } from "@/modules/auth/domain/validation";
import {
	createUserSchema,
	resetPasswordSchema,
} from "@/modules/users/domain/validation";

const validUser = {
	name: "Edgar López",
	email: "edgar@hmconstructora.com",
	phone: "55551234",
	status: "ACTIVE" as const,
	roleIds: ["78045b9a-a5d1-45dc-bae6-0e60506da34a"],
};

const strong = "Obra-Segura2026";

describe("password strength policy", () => {
	it.each([
		["too short", "Ab1!short"],
		["no uppercase", "obra-segura2026"],
		["no lowercase", "OBRA-SEGURA2026"],
		["no number", "Obra-Segura-HM"],
		["no special character", "ObraSegura2026"],
		["only a space as the special character", "Obra Segura 2026"],
	])("rejects a new user password with %s", (_case, password) => {
		expect(createUserSchema.safeParse({ ...validUser, password }).success).toBe(
			false,
		);
		expect(resetPasswordSchema.safeParse({ password }).success).toBe(false);
	});

	it("accepts a password that meets every rule", () => {
		expect(
			createUserSchema.safeParse({ ...validUser, password: strong }).success,
		).toBe(true);
		expect(resetPasswordSchema.safeParse({ password: strong }).success).toBe(
			true,
		);
	});

	it("treats accented letters as letters, not special characters", () => {
		expect(
			resetPasswordSchema.safeParse({ password: "Añoñuevo2026" }).success,
		).toBe(false);
		expect(
			resetPasswordSchema.safeParse({ password: "Añoñuevo2026#" }).success,
		).toBe(true);
	});

	it("reports every missing rule in Spanish", () => {
		const result = resetPasswordSchema.safeParse({ password: "abc" });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error.issues).toHaveLength(4);
	});

	it("keeps the browser pattern in sync with the server rules", () => {
		const pattern = new RegExp(`^(?:${PASSWORD_HTML_PATTERN})$`, "v");
		for (const sample of [
			strong,
			"Añoñuevo2026#",
			"ObraSegura2026",
			"abc",
			"Obra Segura 2026",
		]) {
			const server = passwordRules.every((rule) => rule.test(sample));
			expect(pattern.test(sample)).toBe(server);
		}
	});

	it("does not apply the new rules at login (existing passwords keep working)", () => {
		expect(
			loginSchema.safeParse({
				email: "edgar@hmconstructora.com",
				password: "longenough1",
			}).success,
		).toBe(true);
	});
});
