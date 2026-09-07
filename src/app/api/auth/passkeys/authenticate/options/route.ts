import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createPasskeyCeremonyToken,
  isExpectedPasskeyOrigin,
  PASSKEY_AUTHENTICATION_COOKIE,
  PASSKEY_RP_ID,
  passkeyCeremonyCookieOptions
} from "@/modules/auth/application/webauthn";

export async function POST(request: Request) {
  if (!isExpectedPasskeyOrigin(request)) return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });

  const options = await generateAuthenticationOptions({
    rpID: PASSKEY_RP_ID,
    userVerification: "required"
  });
  const token = await createPasskeyCeremonyToken({ kind: "authentication", challenge: options.challenge });
  const cookieStore = await cookies();
  cookieStore.set(PASSKEY_AUTHENTICATION_COOKIE, token, passkeyCeremonyCookieOptions);

  return NextResponse.json(options, { headers: { "Cache-Control": "no-store" } });
}
