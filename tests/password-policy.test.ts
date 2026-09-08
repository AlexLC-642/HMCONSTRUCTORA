import { describe, expect, it } from "vitest";
import { createUserSchema, resetPasswordSchema } from "@/modules/users/domain/validation";

const validUser = {
	name: "Edgar López",
	email: "edgar@hmconstructora.com",
	phone: "55551234",
	status: "ACTIVE" as const,
	roleIds: ["78045b9a-a5d1-45dc-bae6-0e60506da34a"]
};

describe("password length policy", () => {
	it("rejects a new user password shorter than 10 characters", () => {
		const result = createUserSchema.safeParse({ ...validUser, password: "short123" });
		expect(result.success).toBe(false);
	});

	it("accepts a new user password of at least 10 characters", () => {
		const result = createUserSchema.safeParse({ ...validUser, password: "longenough1" });
		expect(result.success).toBe(true);
	});

	it("rejects a password reset shorter than 10 characters", () => {
		const result = resetPasswordSchema.safeParse({ password: "short123" });
		expect(result.success).toBe(false);
	});

	it("accepts a password reset of at least 10 characters", () => {
		const result = resetPasswordSchema.safeParse({ password: "longenough1" });
		expect(result.success).toBe(true);
	});
});
