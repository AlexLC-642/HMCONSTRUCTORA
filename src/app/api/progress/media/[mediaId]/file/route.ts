import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { canAccessProject } from "@/modules/auth/application/authorization";
import { getCurrentUser } from "@/modules/auth/application/current-user";
import { prisma } from "@/shared/lib/prisma";
import { hasPermission } from "@/shared/permissions/has-permission";

/** Evidencias de informes diarios: ver src/modules/progress/domain/media-url.ts. */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ mediaId: string }> },
) {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "No autorizado." }, { status: 401 });
	}
	if (
		!hasPermission(user.permissions, "proyectos.ver") &&
		!hasPermission(user.permissions, "avance.crear")
	) {
		return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
	}

	const { mediaId } = await params;
	const media = await prisma.dailyReportMedia.findUnique({
		where: { id: mediaId },
		select: {
			storageKey: true,
			mimeType: true,
			originalName: true,
			dailyReport: { select: { projectId: true } },
		},
	});
	if (!media) {
		return NextResponse.json(
			{ error: "Evidencia no encontrada." },
			{ status: 404 },
		);
	}
	if (!(await canAccessProject(user, media.dailyReport.projectId))) {
		return NextResponse.json(
			{ error: "Sin acceso al proyecto." },
			{ status: 403 },
		);
	}

	let buffer: Buffer;
	try {
		buffer = await readFile(
			path.join(process.cwd(), "public", ...media.storageKey.split("/")),
		);
	} catch {
		return NextResponse.json(
			{ error: "El archivo ya no está disponible." },
			{ status: 404 },
		);
	}

	return new NextResponse(new Uint8Array(buffer), {
		headers: {
			"Content-Type": media.mimeType || "application/octet-stream",
			"Content-Disposition": `inline; filename="${encodeURIComponent(media.originalName)}"`,
			// El archivo de una evidencia no cambia: se puede guardar en caché
			// del navegador del usuario (privado, nunca en un proxy compartido).
			"Cache-Control": "private, max-age=86400",
		},
	});
}
