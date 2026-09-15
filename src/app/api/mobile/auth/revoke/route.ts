import { NextResponse } from "next/server";
import { recordAuditLog } from "@/modules/audit/application/audit";
import { hashMobileDeviceToken, mobileTokenSchema } from "@/modules/auth/application/mobile-device-auth";
import { prisma } from "@/shared/lib/prisma";

export async function POST(request: Request) {
	const authorization = request.headers.get("authorization") ?? "";
	const parsed = mobileTokenSchema.safeParse({
		deviceToken: authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "",
	});
	if (!parsed.success) {
		return NextResponse.json({ revoked: true }, { headers: { "Cache-Control": "no-store" } });
	}

	const credential = await prisma.mobileDeviceCredential.findUnique({
		where: { tokenHash: hashMobileDeviceToken(parsed.data.deviceToken) },
	});
	if (credential && !credential.revokedAt) {
		await prisma.mobileDeviceCredential.update({
			where: { id: credential.id },
			data: { revokedAt: new Date() },
		});
		await recordAuditLog({
			userId: credential.userId,
			action: "REVOKE",
			entityType: "MobileDeviceCredential",
			entityId: credential.id,
		});
	}

	return NextResponse.json({ revoked: true }, { headers: { "Cache-Control": "no-store" } });
}
