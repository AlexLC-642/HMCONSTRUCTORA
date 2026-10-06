import { describe, expect, it } from "vitest";
import {
	canEditReport,
	canReviewReports,
	returnToDraftInputSchema,
} from "@/modules/progress/domain/report-editing";

describe("corrección de informes diarios", () => {
	it("cualquiera con avance edita un borrador", () => {
		expect(canEditReport("DRAFT", false)).toBe(true);
	});

	it("en revisión solo lo corrige quien revisa o aprueba", () => {
		expect(canEditReport("SUBMITTED", false)).toBe(false);
		expect(canEditReport("SUBMITTED", true)).toBe(true);
		expect(canEditReport("REVIEWED", true)).toBe(true);
	});

	it("un informe aprobado o publicado no se edita (ya aplicó avance e inventario)", () => {
		expect(canEditReport("APPROVED", true)).toBe(false);
		expect(canEditReport("PUBLISHED", true)).toBe(false);
	});

	it("reconoce a quien revisa por sus permisos", () => {
		expect(canReviewReports(["avance.crear"])).toBe(false);
		expect(canReviewReports(["avance.revisar"])).toBe(true);
		expect(canReviewReports(["avance.aprobar"])).toBe(true);
	});

	it("devolver a borrador exige un motivo", () => {
		expect(returnToDraftInputSchema.safeParse({ reason: "" }).success).toBe(
			false,
		);
		expect(
			returnToDraftInputSchema.safeParse({
				reason: "El avance de cimentación no cuadra.",
			}).success,
		).toBe(true);
	});
});
