"use server";

import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { recordAuditLog } from "@/modules/audit/application/audit";
import { COMPANY_EMAIL_DOMAIN } from "@/modules/auth/domain/email-domain";
import { prisma } from "@/shared/lib/prisma";
import { verifyPassword } from "./password";
import { createSessionToken, sessionCookieOptions } from "./session";
import { loginSchema } from "../domain/validation";

function normalizeLoginEmail(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return raw;
  return raw.includes("@") ? raw : `${raw}@${COMPANY_EMAIL_DOMAIN}`;
}

function loginErrorUrl(error: "1" | "db" = "1") {
  return `/login?error=${error}` as Route;
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: normalizeLoginEmail(formData.get("email")),
    password: formData.get("password")
  });

  if (!parsed.success) {
    redirect(loginErrorUrl());
  }

  let user: Awaited<ReturnType<typeof prisma.user.findUnique>>;
  try {
    user = await prisma.user.findUnique({
      where: { email: parsed.data.email }
    });
  } catch (error) {
    console.error("Login database connection failed", error);
    redirect(loginErrorUrl("db"));
  }

  if (user?.status !== "ACTIVE") {
    redirect(loginErrorUrl());
  }

  const validPassword = await verifyPassword(
    parsed.data.password,
    user.passwordHash
  );

  if (!validPassword) {
    redirect(loginErrorUrl());
  }

  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    name: user.name
  });

  const cookieStore = await cookies();
  cookieStore.set("session", token, sessionCookieOptions);

  await recordAuditLog({
    userId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email }
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}
