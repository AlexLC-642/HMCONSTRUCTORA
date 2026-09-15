import { describe, expect, it } from "vitest";
import {
	createMobileDeviceToken,
	hashMobileDeviceToken,
	mobileCredentialExpiration,
	mobileEnrollSchema,
	normalizeMobileEmail,
} from "@/modules/auth/application/mobile-device-auth";

describe("mobile device authentication", () => {
	it("normalizes the corporate username", () => {
		expect(normalizeMobileEmail(" Admin ")).toBe("admin@hmconstructora.com");
	});

	it("accepts a valid Android enrollment", () => {
		const result = mobileEnrollSchema.safeParse({
			email: "admin",
			password: "a-secure-password",
			installationId: "e22baec5-bdca-4e9c-a9ed-461b44337185",
			deviceName: "Samsung Galaxy",
		});
		expect(result.success).toBe(true);
	});

	it("creates opaque tokens and stores deterministic hashes", () => {
		const token = createMobileDeviceToken();
		expect(token.length).toBeGreaterThanOrEqual(40);
		expect(hashMobileDeviceToken(token)).toMatch(/^[a-f0-9]{64}$/);
		expect(hashMobileDeviceToken(token)).toBe(hashMobileDeviceToken(token));
	});

	it("expires a device credential after 180 days", () => {
		const now = new Date("2026-01-01T00:00:00.000Z");
		expect(mobileCredentialExpiration(now).toISOString()).toBe("2026-06-30T00:00:00.000Z");
	});
});
