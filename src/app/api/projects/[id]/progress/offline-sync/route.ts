import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth/application/current-user";
import { canAccessProject } from "@/modules/auth/application/authorization";
import { readDailyReportFormData } from "@/modules/progress/application/form-data";
import { saveDailyReport } from "@/modules/progress/application/service";
import { prisma } from "@/shared/lib/prisma";
import { hasPermission } from "@/shared/permissions/has-permission";

const offlineSyncSchema = z.object({
	idempotencyKey: z.string().trim().min(12),
	operationType: z.literal("dailyReport.saveDraft"),
	formData: z.record(z.string(), z.string()),
});

function formDataFromRecord(record: Record<string, string>) {
	const formData = new FormData();
	for (const [key, value] of Object.entries(record)) formData.set(key, value);
	return formData;
}

function apiError(status: number, code: string, message: string) {
	return NextResponse.json(
		{ success: false, data: null, error: { code, message } },
		{ status },
	);
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const user = await getCurrentUser();

	if (!user) return apiError(401, "UNAUTHORIZED", "Debes iniciar sesion.");
	if (!hasPermission(user.permissions, "avance.crear"))
		return apiError(403, "FORBIDDEN", "No tienes permiso para crear avances.");

	const { id: projectId } = await params;
	if (!(await canAccessProject(user, projectId))) {
		return apiError(
			403,
			"PROJECT_FORBIDDEN",
			"Este proyecto no está asignado a tu cuenta.",
		);
	}
	const body = offlineSyncSchema.safeParse(
		await request.json().catch(() => null),
	);

	if (!body.success) {
		return apiError(
			422,
			"VALIDATION_ERROR",
			"La operacion offline no tiene el formato correcto.",
		);
	}

	const existing = await prisma.syncOperation.findUnique({
		where: { idempotencyKey: body.data.idempotencyKey },
	});

	// idempotencyKey is client-generated and globally unique, but it must not
	// let one user read back another user's cached sync result just by
	// reusing/guessing their key - always confirm ownership before trusting it.
	if (existing && existing.userId !== user.id) {
		return apiError(
			409,
			"IDEMPOTENCY_KEY_CONFLICT",
			"Esta operacion ya fue registrada por otra sesion.",
		);
	}

	if (existing?.status === "SYNCED") {
		return NextResponse.json({
			success: true,
			data: existing.result,
			error: null,
			meta: { replayed: true },
		});
	}

	const operation =
		existing ??
		(await prisma.syncOperation.create({
			data: {
				idempotencyKey: body.data.idempotencyKey,
				projectId,
				userId: user.id,
				operationType: body.data.operationType,
				payload: body.data.formData,
				status: "PENDING",
			},
		}));

	await prisma.syncOperation.update({
		where: { id: operation.id },
		data: { status: "SYNCING", lastError: null },
	});

	try {
		const parsed = readDailyReportFormData(
			formDataFromRecord(body.data.formData),
		);
		const report = await saveDailyReport(projectId, parsed, {
			userId: user.id,
		});
		const result = {
			reportId: report.id,
			reportNumber: report.reportNumber,
			status: report.status,
		};

		await prisma.syncOperation.update({
			where: { id: operation.id },
			data: { status: "SYNCED", result },
		});

		return NextResponse.json({
			success: true,
			data: result,
			error: null,
			meta: { replayed: false },
		});
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "No se pudo sincronizar el informe.";
		await prisma.syncOperation.update({
			where: { id: operation.id },
			data: { status: "FAILED", lastError: message },
		});

		if (
			error instanceof Prisma.PrismaClientKnownRequestError ||
			error instanceof z.ZodError
		) {
			return apiError(422, "SYNC_VALIDATION_ERROR", message);
		}

		return apiError(500, "SYNC_ERROR", message);
	}
}
