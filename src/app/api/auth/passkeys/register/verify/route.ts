import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { recordAuditLog } from "@/modules/audit/application/audit";
import { getCurrentUser } from "@/modules/auth/application/current-user";
import {
  isExpectedPasskeyOrigin,
  PASSKEY_EXPECTED_ORIGIN,
  PASSKEY_REGISTRATION_COOKIE,
  PASSKEY_RP_ID,
  passkeyCeremonyCookieOptions,
  verifyPasskeyCeremonyToken
} from "@/modules/auth/application/webauthn";
import { prisma } from "@/shared/lib/prisma";

export async function POST(request: Request) {
  if (!isExpectedPasskeyOrigin(request)) return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  const cookieStore = await cookies();
  const ceremony = await verifyPasskeyCeremonyToken(cookieStore.get(PASSKEY_REGISTRATION_COOKIE)?.value, "registration");
  if (!ceremony || ceremony.userId !== user.id || !ceremony.webAuthnUserId) {
    return NextResponse.json({ error: "La solicitud expiró. Inténtalo de nuevo." }, { status: 400 });
  }

  try {
    const response = (await request.json()) as RegistrationResponseJSON;
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: ceremony.challenge,
      expectedOrigin: PASSKEY_EXPECTED_ORIGIN,
      expectedRPID: PASSKEY_RP_ID,
      requireUserVerification: true
    });

    if (!verification.verified) return NextResponse.json({ error: "No fue posible verificar el dispositivo." }, { status: 400 });

    const { credential, credentialBackedUp, credentialDeviceType } = verification.registrationInfo;
    await prisma.userPasskey.create({
      data: {
        id: credential.id,
        userId: user.id,
        webAuthnUserId: ceremony.webAuthnUserId,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: credential.transports?.join(",")
      }
    });
    cookieStore.set(PASSKEY_REGISTRATION_COOKIE, "", { ...passkeyCeremonyCookieOptions, maxAge: 0 });
    await recordAuditLog({
      userId: user.id,
      action: "CREATE",
      entityType: "UserPasskey",
      entityId: credential.id,
      metadata: { deviceType: credentialDeviceType, backedUp: credentialBackedUp }
    });

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("Passkey registration failed", error);
    return NextResponse.json({ error: "No se pudo registrar el acceso en este dispositivo." }, { status: 400 });
  }
}
