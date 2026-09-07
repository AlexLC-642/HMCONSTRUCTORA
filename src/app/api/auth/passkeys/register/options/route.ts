import { generateRegistrationOptions } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/modules/auth/application/current-user";
import {
  createPasskeyCeremonyToken,
  isExpectedPasskeyOrigin,
  PASSKEY_REGISTRATION_COOKIE,
  PASSKEY_RP_ID,
  PASSKEY_RP_NAME,
  passkeyCeremonyCookieOptions
} from "@/modules/auth/application/webauthn";
import { prisma } from "@/shared/lib/prisma";

export async function POST(request: Request) {
  if (!isExpectedPasskeyOrigin(request)) return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  const existingPasskeys = await prisma.userPasskey.findMany({
    where: { userId: user.id },
    select: { id: true, transports: true }
  });
  const webAuthnUserId = Buffer.from(user.id, "utf8").toString("base64url");
  const options = await generateRegistrationOptions({
    rpName: PASSKEY_RP_NAME,
    rpID: PASSKEY_RP_ID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((passkey) => ({
      id: passkey.id,
      transports: passkey.transports?.split(",") as AuthenticatorTransportFuture[] | undefined
    })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "required"
    }
  });

  const token = await createPasskeyCeremonyToken({
    kind: "registration",
    challenge: options.challenge,
    userId: user.id,
    webAuthnUserId
  });
  const cookieStore = await cookies();
  cookieStore.set(PASSKEY_REGISTRATION_COOKIE, token, passkeyCeremonyCookieOptions);

  return NextResponse.json(options, { headers: { "Cache-Control": "no-store" } });
}
