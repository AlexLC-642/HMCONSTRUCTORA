import type {
	AuthenticationResponseJSON,
	AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { recordAuditLog } from "@/modules/audit/application/audit";
import {
	clearPasskeyAuthAttempts,
	isPasskeyAuthRateLimited,
	recordPasskeyAuthAttempt,
} from "@/modules/auth/application/passkey-rate-limit";
import {
	createSessionToken,
	sessionCookieOptions,
} from "@/modules/auth/application/session";
import {
	isExpectedPasskeyOrigin,
	PASSKEY_AUTHENTICATION_COOKIE,
	PASSKEY_EXPECTED_ORIGIN,
	PASSKEY_RP_ID,
	passkeyCeremonyCookieOptions,
	verifyPasskeyCeremonyToken,
} from "@/modules/auth/application/webauthn";
import { prisma } from "@/shared/lib/prisma";
import { requestIp } from "@/shared/lib/request-ip";

export async function POST(request: Request) {
	if (!isExpectedPasskeyOrigin(request))
		return NextResponse.json(
			{ error: "Origen no autorizado." },
			{ status: 403 },
		);

	const ipAddress = await requestIp();
	if (isPasskeyAuthRateLimited(ipAddress)) {
		return NextResponse.json(
			{ error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
			{ status: 429 },
		);
	}

	const cookieStore = await cookies();
	const ceremony = await verifyPasskeyCeremonyToken(
		cookieStore.get(PASSKEY_AUTHENTICATION_COOKIE)?.value,
		"authentication",
	);
	if (!ceremony) {
		recordPasskeyAuthAttempt(ipAddress);
		return NextResponse.json(
			{ error: "La solicitud expiró. Inténtalo de nuevo." },
			{ status: 400 },
		);
	}

	try {
		const response = (await request.json()) as AuthenticationResponseJSON;
		const passkey = await prisma.userPasskey.findUnique({
			where: { id: response.id },
			include: { user: true },
		});
		if (passkey?.user.status !== "ACTIVE") {
			recordPasskeyAuthAttempt(ipAddress);
			return NextResponse.json(
				{ error: "Acceso no disponible." },
				{ status: 401 },
			);
		}
		if (
			response.response.userHandle &&
			response.response.userHandle !== passkey.webAuthnUserId
		) {
			recordPasskeyAuthAttempt(ipAddress);
			return NextResponse.json(
				{ error: "Acceso no disponible." },
				{ status: 401 },
			);
		}

		const verification = await verifyAuthenticationResponse({
			response,
			expectedChallenge: ceremony.challenge,
			expectedOrigin: PASSKEY_EXPECTED_ORIGIN,
			expectedRPID: PASSKEY_RP_ID,
			credential: {
				id: passkey.id,
				publicKey: new Uint8Array(passkey.publicKey),
				counter: Number(passkey.counter),
				transports: passkey.transports?.split(",") as
					| AuthenticatorTransportFuture[]
					| undefined,
			},
			requireUserVerification: true,
		});
		if (!verification.verified) {
			recordPasskeyAuthAttempt(ipAddress);
			return NextResponse.json(
				{ error: "No fue posible verificar el acceso." },
				{ status: 401 },
			);
		}

		await prisma.userPasskey.update({
			where: { id: passkey.id },
			data: {
				counter: BigInt(verification.authenticationInfo.newCounter),
				lastUsedAt: new Date(),
			},
		});
		const session = await createSessionToken({
			sub: passkey.user.id,
			email: passkey.user.email,
			name: passkey.user.name,
		});
		cookieStore.set("session", session, sessionCookieOptions);
		cookieStore.set(PASSKEY_AUTHENTICATION_COOKIE, "", {
			...passkeyCeremonyCookieOptions,
			maxAge: 0,
		});
		clearPasskeyAuthAttempts(ipAddress);
		await recordAuditLog({
			userId: passkey.user.id,
			action: "LOGIN",
			entityType: "User",
			entityId: passkey.user.id,
			metadata: { method: "passkey" },
		});

		return NextResponse.json({ verified: true, redirectTo: "/dashboard" });
	} catch (error) {
		recordPasskeyAuthAttempt(ipAddress);
		console.error("Passkey authentication failed", error);
		return NextResponse.json(
			{ error: "No se pudo validar el acceso con este dispositivo." },
			{ status: 401 },
		);
	}
}
