import { NextResponse } from "next/server";
import { recordAuditLog } from "@/modules/audit/application/audit";
import { getCurrentUser } from "@/modules/auth/application/current-user";
import { isExpectedPasskeyOrigin } from "@/modules/auth/application/webauthn";
import { prisma } from "@/shared/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isExpectedPasskeyOrigin(request)) return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  const { id } = await params;
  const result = await prisma.userPasskey.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) return NextResponse.json({ error: "Acceso no encontrado." }, { status: 404 });

  await recordAuditLog({ userId: user.id, action: "DELETE", entityType: "UserPasskey", entityId: id });
  return NextResponse.json({ deleted: true });
}
