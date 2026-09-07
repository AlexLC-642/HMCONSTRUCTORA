import { describe, expect, it } from "vitest";
import { updateUserSchema } from "@/modules/users/domain/validation";

describe("user update validation", () => {
	it("accepts editable account data with an 8 digit phone", () => {
		const result = updateUserSchema.safeParse({
			name: "Edgar López",
			email: "edgar@hmconstructora.com",
			phone: "55551234",
			status: "ACTIVE",
			roleIds: ["78045b9a-a5d1-45dc-bae6-0e60506da34a"],
		});

		expect(result.success).toBe(true);
	});

	it("rejects a phone with more than 8 digits", () => {
		const result = updateUserSchema.safeParse({
			name: "Edgar López",
			email: "edgar@hmconstructora.com",
			phone: "555512345",
			status: "ACTIVE",
			roleIds: ["78045b9a-a5d1-45dc-bae6-0e60506da34a"],
		});

		expect(result.success).toBe(false);
	});
});
