import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/application/current-user";
import { hasPermission } from "@/shared/permissions/has-permission";
import { prisma } from "@/shared/lib/prisma";

/**
 * Documents are stored under public/uploads/... (see
 * src/modules/documents/application/storage.ts) so the browser can render
 * inline previews easily - but that also means the raw file is reachable by
 * anyone who has (or finds) the direct URL, regardless of the document's
 * status/portalVisible flags (see docs/security-audit.md H1). This route is
 * the authenticated front door the internal UI now links to instead: it
 * checks session + permission before reading the file from disk.
 *
 * Scope note: this does not (yet) move the physical files out of public/,
 * so the old direct URL still technically works if someone already has it.
 * See H1 in docs/security-audit.md for the full picture and the follow-up
 * recommended there.
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ versionId: string }> },
) {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "No autorizado." }, { status: 401 });
	}
	if (!hasPermission(user.permissions, "proyectos.ver")) {
		return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
	}

	const { versionId } = await params;
	const version = await prisma.documentVersion.findUnique({
		where: { id: versionId },
	});

	if (!version) {
		return NextResponse.json(
			{ error: "Documento no encontrado." },
			{ status: 404 },
		);
	}

	let buffer: Buffer;
	try {
		buffer = await readFile(
			path.join(process.cwd(), "public", ...version.storageKey.split("/")),
		);
	} catch {
		return NextResponse.json(
			{ error: "El archivo ya no está disponible." },
			{ status: 404 },
		);
	}

	return new NextResponse(new Uint8Array(buffer), {
		headers: {
			"Content-Type": version.mimeType || "application/octet-stream",
			"Content-Disposition": `inline; filename="${encodeURIComponent(version.originalName)}"`,
			"Cache-Control": "private, max-age=0, must-revalidate",
		},
	});
}
