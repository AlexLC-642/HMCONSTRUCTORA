"use server";

import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { recordAuditLog } from "@/modules/audit/application/audit";
import { COMPANY_EMAIL_DOMAIN } from "@/modules/auth/domain/email-domain";
import { prisma } from "@/shared/lib/prisma";
import { requestIp } from "@/shared/lib/request-ip";
import { loginSchema } from "../domain/validation";
import {
	clearLoginAttempts,
	isLoginRateLimited,
	recordFailedLogin,
} from "./login-rate-limit";
import { verifyPasswordTimingSafe } from "./password";
import { createSessionToken, sessionCookieOptions } from "./session";

function normalizeLoginEmail(value: FormDataEntryValue | null) {
	const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
	if (!raw) return raw;
	return raw.includes("@") ? raw : `${raw}@${COMPANY_EMAIL_DOMAIN}`;
}

// Deliberately a single generic error for every failure mode (bad email
// format, unknown email, wrong password, inactive account, rate limit, DB
// hiccup): telling an attacker *which* of those happened is username
// enumeration / unnecessary information disclosure. The UI copy stays
// friendly ("credenciales inválidas o cuenta no disponible") without
// revealing which part was wrong.
function loginErrorUrl() {
	return "/login?error=1" as Route;
}

export async function loginAction(formData: FormData) {
	const email = normalizeLoginEmail(formData.get("email"));
	const ipAddress = await requestIp();

	if (isLoginRateLimited(email, ipAddress)) {
		// Best-effort: a logging hiccup must never turn a routine rate-limit
		// redirect into an unhandled 500, same reasoning as the DB lookup below.
		await recordAuditLog({
			action: "LOGIN_FAILED",
			entityType: "User",
			metadata: { email, reason: "rate_limited" },
			ipAddress: ipAddress ?? undefined,
		}).catch((error) =>
			console.error("Failed-login audit write failed", error),
		);
		redirect(loginErrorUrl());
	}

	const parsed = loginSchema.safeParse({
		email,
		password: formData.get("password"),
	});

	if (!parsed.success) {
		recordFailedLogin(email, ipAddress);
		redirect(loginErrorUrl());
	}

	let user: Awaited<ReturnType<typeof prisma.user.findUnique>> = null;
	try {
		user = await prisma.user.findUnique({
			where: { email: parsed.data.email },
		});
	} catch (error) {
		// Logged for operators; the user only ever sees the generic message
		// above so a database outage can't be distinguished from bad
		// credentials by an outside observer.
		console.error("Login database connection failed", error);
	}

	const activeUser = user?.status === "ACTIVE" ? user : null;

	// Always run bcrypt, even when the user does not exist or is inactive:
	// returning early here would make "unknown email" measurably faster than
	// "wrong password for a real email", letting an attacker enumerate valid
	// accounts purely from response timing.
	const validPassword = await verifyPasswordTimingSafe(
		parsed.data.password,
		activeUser?.passwordHash ?? null,
	);

	if (!activeUser || !validPassword) {
		recordFailedLogin(email, ipAddress);
		await recordAuditLog({
			userId: user?.id,
			action: "LOGIN_FAILED",
			entityType: "User",
			entityId: user?.id,
			metadata: {
				email,
				reason: !user
					? "unknown_email"
					: user.status !== "ACTIVE"
						? "inactive_account"
						: "invalid_password",
			},
			ipAddress: ipAddress ?? undefined,
		}).catch((error) =>
			console.error("Failed-login audit write failed", error),
		);
		redirect(loginErrorUrl());
	}

	clearLoginAttempts(email, ipAddress);

	const token = await createSessionToken({
		sub: activeUser.id,
		email: activeUser.email,
		name: activeUser.name,
	});

	const cookieStore = await cookies();
	cookieStore.set("session", token, sessionCookieOptions);

	await recordAuditLog({
		userId: activeUser.id,
		action: "LOGIN",
		entityType: "User",
		entityId: activeUser.id,
		metadata: { email: activeUser.email },
	});

	redirect("/dashboard");
}

export async function logoutAction() {
	const cookieStore = await cookies();
	cookieStore.delete("session");
	redirect("/login");
}
