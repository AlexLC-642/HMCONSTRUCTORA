import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { COMPANY_EMAIL_DOMAIN, isCompanyEmail } from "../domain/email-domain";

export const MOBILE_CREDENTIAL_LIFETIME_DAYS = 180;

export const mobileEnrollSchema = z.object({
	email: z.string().trim().min(1).max(254).transform(normalizeMobileEmail).refine(isCompanyEmail),
	password: z.string().min(8).max(256),
	installationId: z.string().uuid(),
	deviceName: z.string().trim().min(1).max(120),
});

export const mobileTokenSchema = z.object({
	deviceToken: z.string().min(40).max(128),
});

export function normalizeMobileEmail(value: string) {
	const email = value.trim().toLowerCase();
	return email.includes("@") ? email : `${email}@${COMPANY_EMAIL_DOMAIN}`;
}

export function createMobileDeviceToken() {
	return randomBytes(32).toString("base64url");
}

export function hashMobileDeviceToken(token: string) {
	return createHash("sha256").update(token, "utf8").digest("hex");
}

export function mobileCredentialExpiration(now = new Date()) {
	return new Date(now.getTime() + MOBILE_CREDENTIAL_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
}
