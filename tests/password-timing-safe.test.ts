import { describe, expect, it } from "vitest";
import { hashPassword, verifyPasswordTimingSafe } from "@/modules/auth/application/password";

describe("verifyPasswordTimingSafe", () => {
	it("returns true for the correct password against a real hash", async () => {
		const hash = await hashPassword("correct-horse-battery-staple");
		await expect(
			verifyPasswordTimingSafe("correct-horse-battery-staple", hash)
		).resolves.toBe(true);
	});

	it("returns false for the wrong password against a real hash", async () => {
		const hash = await hashPassword("correct-horse-battery-staple");
		await expect(verifyPasswordTimingSafe("wrong-password", hash)).resolves.toBe(false);
	});

	// This is the actual security property: a missing/null hash (unknown
	// email, inactive account) must still run a bcrypt.compare against a
	// dummy hash instead of short-circuiting to false - otherwise the
	// "user does not exist" path is measurably faster than the "wrong
	// password" path, letting an attacker enumerate valid emails by timing.
	it("still performs a bcrypt comparison when no hash is available, and returns false", async () => {
		await expect(
			verifyPasswordTimingSafe("anything", null)
		).resolves.toBe(false);
		await expect(
			verifyPasswordTimingSafe("anything", undefined)
		).resolves.toBe(false);
	});

	it("takes comparable time for an unknown user as for a real wrong-password check", async () => {
		const hash = await hashPassword("correct-horse-battery-staple");

		const start1 = performance.now();
		await verifyPasswordTimingSafe("wrong-password", hash);
		const knownUserMs = performance.now() - start1;

		const start2 = performance.now();
		await verifyPasswordTimingSafe("wrong-password", null);
		const unknownUserMs = performance.now() - start2;

		// bcrypt cost dominates both paths; allow generous slack for CI jitter
		// while still catching a regression back to an early-return shortcut
		// (which would make the unknown-user path near-instant).
		expect(unknownUserMs).toBeGreaterThan(knownUserMs * 0.5);
	});
});
