import { NextResponse } from "next/server";
import { uploadsArePersistent } from "@/shared/lib/uploads";

/**
 * Estado mínimo del servicio. `uploads` indica si los archivos subidos
 * sobreviven a un nuevo despliegue (volumen conectado) o se perderán.
 */
export function GET() {
	return NextResponse.json(
		{ ok: true, uploads: uploadsArePersistent() ? "persistent" : "ephemeral" },
		{ headers: { "Cache-Control": "no-store" } },
	);
}
