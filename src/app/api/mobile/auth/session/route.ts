import { NextResponse } from "next/server";
import { recordAuditLog } from "@/modules/audit/application/audit";
import { defaultAuthenticatedRouteForUser } from "@/modules/auth/application/authenticated-route";
import {
	isMobileSessionLimited,
	recordMobileSessionAttempt,
} from "@/modules/auth/application/mobile-auth-rate-limit";
import {
	hashMobileDeviceToken,
	mobileTokenSchema,
} from "@/modules/auth/application/mobile-device-auth";
import {
	createSessionToken,
	sessionCookieOptions,
} from "@/modules/auth/application/session";
import { prisma } from "@/shared/lib/prisma";

function clientIp(request: Request) {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		request.headers.get("x-real-ip") ??
		"unknown"
	);
}

function bearerToken(request: Request) {
	const authorization = request.headers.get("authorization") ?? "";
	return authorization.startsWith("Bearer ")
		? authorization.slice(7).trim()
		: "";
}

export async function POST(request: Request) {
	const ipAddress = clientIp(request);
	if (isMobileSessionLimited(ipAddress)) {
		return NextResponse.json(
			{ error: "Demasiados intentos. Inténtalo de nuevo." },
			{
				status: 429,
				headers: { "Cache-Control": "no-store" },
			},
		);
	}
	recordMobileSessionAttempt(ipAddress);

	const parsed = mobileTokenSchema.safeParse({
		deviceToken: bearerToken(request),
	});
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Credencial móvil inválida." },
			{ status: 401 },
		);
	}

	const credential = await prisma.mobileDeviceCredential.findUnique({
		where: { tokenHash: hashMobileDeviceToken(parsed.data.deviceToken) },
		include: { user: true },
	});
	const now = new Date();
	if (
		!credential ||
		credential.revokedAt ||
		credential.expiresAt <= now ||
		credential.user.status !== "ACTIVE"
	) {
		return NextResponse.json(
			{ error: "Este dispositivo debe vincularse nuevamente." },
			{
				status: 401,
				headers: { "Cache-Control": "no-store" },
			},
		);
	}

	await prisma.mobileDeviceCredential.update({
		where: { id: credential.id },
		data: { lastUsedAt: now },
	});
	const sessionToken = await createSessionToken({
		sub: credential.user.id,
		email: credential.user.email,
		name: credential.user.name,
	});
	const redirectTo = await defaultAuthenticatedRouteForUser(credential.user.id);
	const response = NextResponse.json(
		{ authenticated: true, redirectTo },
		{ headers: { "Cache-Control": "no-store" } },
	);
	response.cookies.set("session", sessionToken, sessionCookieOptions);

	await recordAuditLog({
		userId: credential.user.id,
		action: "LOGIN",
		entityType: "MobileDeviceCredential",
		entityId: credential.id,
		metadata: {
			deviceName: credential.deviceName,
			platform: credential.platform,
		},
		ipAddress,
	});
	return response;
}
