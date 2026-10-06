import { z } from "zod";

type ReportStatus =
	| "DRAFT"
	| "SUBMITTED"
	| "REVIEWED"
	| "APPROVED"
	| "PUBLISHED";

/**
 * Quién puede corregir un informe diario y cuándo.
 *
 * - Borrador: lo corrige quien registra avance.
 * - En revisión (enviado o revisado): solo quien revisa o aprueba. Aún no hay
 *   efectos: el avance del cronograma y el consumo de inventario se aplican al
 *   aprobar, con los datos que tenga el informe en ese momento.
 * - Aprobado o publicado: no se edita. Ya sumó avance y descontó inventario;
 *   cambiarlo descuadraría ambos.
 */
export function canReviewReports(permissions: readonly string[]) {
	return (
		permissions.includes("avance.revisar") ||
		permissions.includes("avance.aprobar")
	);
}

export function isInReview(status: ReportStatus) {
	return status === "SUBMITTED" || status === "REVIEWED";
}

export function canEditReport(status: ReportStatus, canReview: boolean) {
	if (status === "DRAFT") return true;
	return canReview && isInReview(status);
}

export function reportEditBlockedMessage(status: ReportStatus) {
	return isInReview(status)
		? "Solo quien revisa o aprueba puede corregir un informe en revisión."
		: "Un informe aprobado ya aplicó el avance y el consumo de inventario; no se puede editar.";
}

export const returnToDraftInputSchema = z.object({
	reason: z
		.string()
		.trim()
		.min(5, "Escribe qué hay que corregir (mínimo 5 caracteres).")
		.max(1000, "El motivo no puede superar 1000 caracteres."),
});
