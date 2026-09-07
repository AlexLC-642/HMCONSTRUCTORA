import { jwtVerify, SignJWT } from "jose";
import { env } from "@/shared/lib/env";

export const PASSKEY_RP_NAME = "Control de obra";
export const PASSKEY_REGISTRATION_COOKIE = "hm_passkey_registration";
export const PASSKEY_AUTHENTICATION_COOKIE = "hm_passkey_authentication";

const applicationUrl = new URL(env.APP_URL);
const secret = new TextEncoder().encode(env.AUTH_SECRET);

export const PASSKEY_RP_ID = applicationUrl.hostname;
export const PASSKEY_EXPECTED_ORIGIN = applicationUrl.origin;

type CeremonyKind = "registration" | "authentication";

type CeremonyPayload = {
  kind: CeremonyKind;
  challenge: string;
  userId?: string;
  webAuthnUserId?: string;
};

export const passkeyCeremonyCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/auth/passkeys",
  maxAge: 60 * 5
};

export async function createPasskeyCeremonyToken(payload: CeremonyPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("hm-constructora")
    .setAudience("webauthn-ceremony")
    .setExpirationTime("5m")
    .sign(secret);
}

export async function verifyPasskeyCeremonyToken(token: string | undefined, expectedKind: CeremonyKind) {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: "hm-constructora",
      audience: "webauthn-ceremony"
    });

    if (payload.kind !== expectedKind || typeof payload.challenge !== "string") return null;

    return {
      kind: expectedKind,
      challenge: payload.challenge,
      userId: typeof payload.userId === "string" ? payload.userId : undefined,
      webAuthnUserId: typeof payload.webAuthnUserId === "string" ? payload.webAuthnUserId : undefined
    };
  } catch {
    return null;
  }
}

export function isExpectedPasskeyOrigin(request: Request) {
  return request.headers.get("origin") === PASSKEY_EXPECTED_ORIGIN;
}
