import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearLoginAttempts,
	isLoginRateLimited,
	recordFailedLogin
} from "@/modules/auth/application/login-rate-limit";

describe("login rate limiting", () => {
	beforeEach(() => {
		vi.useRealTimers();
	});

	it("does not rate limit an email/IP pair with no prior attempts", () => {
		expect(isLoginRateLimited("nadie@hmconstructora.com", "10.0.0.1")).toBe(false);
	});

	it("blocks after the configured threshold of failed attempts", () => {
		const email = `bruteforce-${Math.random()}@hmconstructora.com`;
		const ip = "10.0.0.2";

		for (let i = 0; i < 7; i += 1) {
			recordFailedLogin(email, ip);
			expect(isLoginRateLimited(email, ip)).toBe(false);
		}

		recordFailedLogin(email, ip);
		expect(isLoginRateLimited(email, ip)).toBe(true);
	});

	it("tracks the email/IP pair independently of other IPs hitting the same email", () => {
		const email = `shared-${Math.random()}@hmconstructora.com`;

		for (let i = 0; i < 8; i += 1) recordFailedLogin(email, "10.0.0.3");
		expect(isLoginRateLimited(email, "10.0.0.3")).toBe(true);
		expect(isLoginRateLimited(email, "10.0.0.4")).toBe(false);
	});

	it("is case-insensitive on the email portion of the key", () => {
		const email = `CaseTest-${Math.random()}@hmconstructora.com`;
		const ip = "10.0.0.5";

		for (let i = 0; i < 8; i += 1) recordFailedLogin(email.toLowerCase(), ip);
		expect(isLoginRateLimited(email.toUpperCase(), ip)).toBe(true);
	});

	it("clears attempts on a successful login so a later retry is not blocked", () => {
		const email = `clears-${Math.random()}@hmconstructora.com`;
		const ip = "10.0.0.6";

		for (let i = 0; i < 8; i += 1) recordFailedLogin(email, ip);
		expect(isLoginRateLimited(email, ip)).toBe(true);

		clearLoginAttempts(email, ip);
		expect(isLoginRateLimited(email, ip)).toBe(false);
	});
});
