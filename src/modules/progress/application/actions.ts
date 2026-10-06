"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProjectPermission } from "@/modules/auth/application/authorization";
import { prisma } from "@/shared/lib/prisma";
import { canReviewReports } from "../domain/report-editing";
import { readDailyReportFormData } from "./form-data";
import {
	deleteDailyReportMedia,
	reorderDailyReportMedia,
	saveDailyReportMediaFiles,
	updateDailyReportMediaMetadata,
} from "./media";
import {
	approveDailyReport,
	publishDailyReport,
	returnDailyReportToDraft,
	saveDailyReport,
	submitDailyReport,
} from "./service";

export async function saveDailyReportAction(
	projectId: string,
	formData: FormData,
) {
	const user = await requireProjectPermission(projectId, "avance.crear");
	const context = {
		userId: user.id,
		canReview: canReviewReports(user.permissions),
	};
	const report = await saveDailyReport(
		projectId,
		readDailyReportFormData(formData),
		context,
	);
	await saveDailyReportMediaFiles(report.id, formData, context);
	revalidatePath(`/projects/${projectId}/progress`);
	revalidatePath(`/projects/${projectId}/progress/reports/${report.id}`);
	revalidatePath(`/projects/${projectId}/schedule`);
	// Una corrección en revisión vuelve al informe, listo para aprobarlo.
	redirect(
		(report.status === "DRAFT"
			? `/projects/${projectId}/progress`
			: `/projects/${projectId}/progress/reports/${report.id}`) as Route,
	);
}

export async function submitDailyReportAction(
	projectId: string,
	reportId: string,
) {
	const user = await requireProjectPermission(projectId, "avance.crear");
	await submitDailyReport(projectId, reportId, { userId: user.id });
	revalidatePath(`/projects/${projectId}/progress`);
	redirect(`/projects/${projectId}/progress` as Route);
}

export type ReturnToDraftState = { status: "idle" | "error"; message: string };

export async function returnDailyReportToDraftAction(
	projectId: string,
	reportId: string,
	_previous: ReturnToDraftState,
	formData: FormData,
): Promise<ReturnToDraftState> {
	const user = await requireProjectPermission(projectId, "avance.crear");
	if (!canReviewReports(user.permissions)) {
		return {
			status: "error",
			message: "Solo quien revisa o aprueba puede devolver un informe.",
		};
	}
	try {
		await returnDailyReportToDraft(
			projectId,
			reportId,
			stringValue(formData, "reason"),
			{ userId: user.id },
		);
	} catch (error) {
		const message =
			error instanceof Error && "issues" in error
				? ((error as { issues: Array<{ message: string }> }).issues[0]
						?.message ?? "Revisa el motivo.")
				: error instanceof Error
					? error.message
					: "No se pudo devolver el informe.";
		return { status: "error", message };
	}
	revalidatePath(`/projects/${projectId}/progress`);
	revalidatePath(`/projects/${projectId}/progress/reports/${reportId}`);
	redirect(`/projects/${projectId}/progress/reports/${reportId}` as Route);
}

export async function approveDailyReportAction(
	projectId: string,
	reportId: string,
) {
	const user = await requireProjectPermission(projectId, "avance.aprobar");
	await approveDailyReport(projectId, reportId, { userId: user.id });
	revalidatePath(`/projects/${projectId}/progress`);
	revalidatePath(`/projects/${projectId}/schedule`);
	redirect(`/projects/${projectId}/progress` as Route);
}
export async function publishDailyReportAction(
	projectId: string,
	reportId: string,
) {
	const user = await requireProjectPermission(projectId, "avance.publicar");
	await publishDailyReport(projectId, reportId, { userId: user.id });
	revalidatePath(`/projects/${projectId}/progress`);
	redirect(`/projects/${projectId}/progress` as Route);
}

function stringValue(formData: FormData, key: string) {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
}

function mediaTypeValue(
	value: string,
): "BEFORE" | "DURING" | "AFTER" | "OTHER" {
	if (
		value === "BEFORE" ||
		value === "DURING" ||
		value === "AFTER" ||
		value === "OTHER"
	)
		return value;
	return "DURING";
}

function activityInput(value: string) {
	if (!value) return { dailyReportActivityId: null, activityCode: null };
	if (value.startsWith("id:"))
		return { dailyReportActivityId: value.slice(3), activityCode: null };
	if (value.startsWith("code:"))
		return { dailyReportActivityId: null, activityCode: value.slice(5) };
	return { dailyReportActivityId: null, activityCode: value };
}

function revalidateProgress(projectId: string, reportId: string) {
	revalidatePath(`/projects/${projectId}/progress`);
	revalidatePath(`/projects/${projectId}/progress/reports/${reportId}`);
	revalidatePath(`/projects/${projectId}/progress/reports/${reportId}/print`);
}

export async function updateDailyReportMediaAction(
	projectId: string,
	reportId: string,
	mediaId: string,
	formData: FormData,
) {
	const user = await requireProjectPermission(projectId, "avance.crear");
	const activity = activityInput(stringValue(formData, "activityRef"));
	await updateDailyReportMediaMetadata(
		projectId,
		reportId,
		mediaId,
		{
			...activity,
			mediaType: mediaTypeValue(stringValue(formData, "mediaType")),
			title: stringValue(formData, "title") || null,
			description: stringValue(formData, "description") || null,
		},
		canReviewReports(user.permissions),
	);
	revalidateProgress(projectId, reportId);
}

export async function moveDailyReportMediaAction(
	projectId: string,
	reportId: string,
	mediaId: string,
	direction: "up" | "down",
) {
	const user = await requireProjectPermission(projectId, "avance.crear");
	const media = await prisma.dailyReportMedia.findMany({
		where: { dailyReportId: reportId },
		orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
		select: { id: true },
	});
	const ids = media.map((item) => item.id);
	const index = ids.indexOf(mediaId);
	const swapIndex = direction === "up" ? index - 1 : index + 1;

	if (index >= 0 && swapIndex >= 0 && swapIndex < ids.length) {
		[ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
		await reorderDailyReportMedia(
			projectId,
			reportId,
			ids,
			canReviewReports(user.permissions),
		);
		revalidateProgress(projectId, reportId);
	}
}

export async function deleteDailyReportMediaAction(
	projectId: string,
	reportId: string,
	mediaId: string,
) {
	const user = await requireProjectPermission(projectId, "avance.crear");
	await deleteDailyReportMedia(
		projectId,
		reportId,
		mediaId,
		canReviewReports(user.permissions),
	);
	revalidateProgress(projectId, reportId);
}
