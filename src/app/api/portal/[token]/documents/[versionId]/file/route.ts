import { NextResponse } from "next/server";
import { resolvePortalShare } from "@/modules/client-portal/application/service";
import { prisma } from "@/shared/lib/prisma";
import { requestIp } from "@/shared/lib/request-ip";
import { readStoredFile } from "@/shared/lib/uploads";

/**
 * Descarga de un documento desde el portal del cliente (sin sesión de
 * empleado). Solo entrega documentos del proyecto del enlace, aprobados y
 * marcados como visibles para el cliente; cualquier otro caso es un 404
 * genérico, igual que un token inválido.
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ token: string; versionId: string }> },
) {
	const { token, versionId } = await params;
	const notFound = () =>
		NextResponse.json({ error: "No encontrado." }, { status: 404 });

	const share = await resolvePortalShare(token, await requestIp());
	if (!share) return notFound();

	const version = await prisma.documentVersion.findUnique({
		where: { id: versionId },
		select: {
			storageKey: true,
			mimeType: true,
			originalName: true,
			document: {
				select: {
					projectId: true,
					status: true,
					portalVisible: true,
					project: { select: { portalEnabled: true } },
				},
			},
		},
	});
	const document = version?.document;
	if (
		!version ||
		!document ||
		document.projectId !== share.projectId ||
		document.status !== "APPROVED" ||
		!document.portalVisible ||
		!document.project?.portalEnabled
	) {
		return notFound();
	}

	let buffer: Buffer;
	try {
		buffer = await readStoredFile(version.storageKey);
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
