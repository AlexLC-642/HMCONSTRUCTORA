import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
	isPasskeyAuthRateLimited,
	recordPasskeyAuthAttempt,
} from "@/modules/auth/application/passkey-rate-limit";
import {
	createPasskeyCeremonyToken,
	isExpectedPasskeyOrigin,
	PASSKEY_AUTHENTICATION_COOKIE,
	PASSKEY_RP_ID,
	passkeyCeremonyCookieOptions,
} from "@/modules/auth/application/webauthn";
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
	recordPasskeyAuthAttempt(ipAddress);

	const options = await generateAuthenticationOptions({
		rpID: PASSKEY_RP_ID,
		userVerification: "required",
	});
	const token = await createPasskeyCeremonyToken({
		kind: "authentication",
		challenge: options.challenge,
	});
	const cookieStore = await cookies();
	cookieStore.set(
		PASSKEY_AUTHENTICATION_COOKIE,
		token,
		passkeyCeremonyCookieOptions,
	);

	return NextResponse.json(options, {
		headers: { "Cache-Control": "no-store" },
	});
}
