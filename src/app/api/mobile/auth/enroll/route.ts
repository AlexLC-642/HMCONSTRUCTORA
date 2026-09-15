import { NextResponse } from "next/server";
import { recordAuditLog } from "@/modules/audit/application/audit";
import {
	clearMobileEnrollFailures,
	isMobileEnrollLimited,
	recordMobileEnrollFailure,
} from "@/modules/auth/application/mobile-auth-rate-limit";
import {
	createMobileDeviceToken,
	hashMobileDeviceToken,
	mobileCredentialExpiration,
	mobileEnrollSchema,
} from "@/modules/auth/application/mobile-device-auth";
import { verifyPasswordTimingSafe } from "@/modules/auth/application/password";
import { prisma } from "@/shared/lib/prisma";

function clientIp(request: Request) {
	return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
		?? request.headers.get("x-real-ip")
		?? "unknown";
}

function noStoreJson(body: object, status = 200) {
	return NextResponse.json(body, {
		status,
		headers: { "Cache-Control": "no-store" },
	});
}

export async function POST(request: Request) {
	const ipAddress = clientIp(request);
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return noStoreJson({ error: "Solicitud inválida." }, 400);
	}

	const parsed = mobileEnrollSchema.safeParse(body);
	const email = parsed.success ? parsed.data.email : "invalid";
	const rateLimitKey = `${email}|${ipAddress}`;
	if (isMobileEnrollLimited(rateLimitKey)) {
		return noStoreJson({ error: "Demasiados intentos. Espera unos minutos." }, 429);
	}

	if (!parsed.success) {
		recordMobileEnrollFailure(rateLimitKey);
		return noStoreJson({ error: "Datos de acceso inválidos." }, 400);
	}

	let user: Awaited<ReturnType<typeof prisma.user.findUnique>> = null;
	try {
		user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
	} catch (error) {
		console.error("Mobile enrollment database lookup failed", error);
		return noStoreJson({ error: "No fue posible conectar con el servidor." }, 503);
	}

	const activeUser = user?.status === "ACTIVE" ? user : null;
	const passwordValid = await verifyPasswordTimingSafe(
		parsed.data.password,
		activeUser?.passwordHash,
	);
	if (!activeUser || !passwordValid) {
		recordMobileEnrollFailure(rateLimitKey);
		await recordAuditLog({
			userId: user?.id,
			action: "LOGIN_FAILED",
			entityType: "MobileDeviceCredential",
			metadata: { email: parsed.data.email, reason: "invalid_credentials" },
			ipAddress,
		}).catch((error) => console.error("Mobile enrollment audit failed", error));
		return noStoreJson({ error: "Usuario o contraseña incorrectos." }, 401);
	}

	const deviceToken = createMobileDeviceToken();
	const credential = await prisma.mobileDeviceCredential.upsert({
		where: { installationId: parsed.data.installationId },
		create: {
			userId: activeUser.id,
			installationId: parsed.data.installationId,
			tokenHash: hashMobileDeviceToken(deviceToken),
			deviceName: parsed.data.deviceName,
			expiresAt: mobileCredentialExpiration(),
		},
		update: {
			userId: activeUser.id,
			tokenHash: hashMobileDeviceToken(deviceToken),
			deviceName: parsed.data.deviceName,
			expiresAt: mobileCredentialExpiration(),
			revokedAt: null,
		},
	});

	clearMobileEnrollFailures(rateLimitKey);
	await recordAuditLog({
		userId: activeUser.id,
		action: "CREATE",
		entityType: "MobileDeviceCredential",
		entityId: credential.id,
		metadata: { deviceName: parsed.data.deviceName, platform: "android" },
		ipAddress,
	});

	return noStoreJson({
		deviceToken,
		expiresAt: credential.expiresAt.toISOString(),
		user: { name: activeUser.name, email: activeUser.email },
	}, 201);
}
