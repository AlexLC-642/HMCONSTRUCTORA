"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { prisma } from "@/shared/lib/prisma";
import { readDailyReportFormData } from "./form-data";
import { deleteDailyReportMedia, reorderDailyReportMedia, saveDailyReportMediaFiles, updateDailyReportMediaMetadata } from "./media";
import { approveDailyReport, publishDailyReport, saveDailyReport, submitDailyReport } from "./service";

export async function saveDailyReportAction(projectId: string, formData: FormData) {
  const user = await requirePermission("avance.crear");
  const report = await saveDailyReport(projectId, readDailyReportFormData(formData), { userId: user.id });
  await saveDailyReportMediaFiles(report.id, formData, { userId: user.id });
  revalidatePath(`/projects/${projectId}/progress`);
  revalidatePath(`/projects/${projectId}/schedule`);
  redirect(`/projects/${projectId}/progress` as Route);
}

export async function submitDailyReportAction(projectId: string, reportId: string) {
  const user = await requirePermission("avance.crear");
  await submitDailyReport(projectId, reportId, { userId: user.id });
  revalidatePath(`/projects/${projectId}/progress`);
  redirect(`/projects/${projectId}/progress` as Route);
}

export async function approveDailyReportAction(projectId: string, reportId: string) {
  const user = await requirePermission("avance.aprobar");
  await approveDailyReport(projectId, reportId, { userId: user.id });
  revalidatePath(`/projects/${projectId}/progress`);
  revalidatePath(`/projects/${projectId}/schedule`);
  redirect(`/projects/${projectId}/progress` as Route);
}
export async function publishDailyReportAction(projectId: string, reportId: string) {
  const user = await requirePermission("avance.publicar");
  await publishDailyReport(projectId, reportId, { userId: user.id });
  revalidatePath(`/projects/${projectId}/progress`);
  redirect(`/projects/${projectId}/progress` as Route);
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function mediaTypeValue(value: string): "BEFORE" | "DURING" | "AFTER" | "OTHER" {
  if (value === "BEFORE" || value === "DURING" || value === "AFTER" || value === "OTHER") return value;
  return "DURING";
}

function activityInput(value: string) {
  if (!value) return { dailyReportActivityId: null, activityCode: null };
  if (value.startsWith("id:")) return { dailyReportActivityId: value.slice(3), activityCode: null };
  if (value.startsWith("code:")) return { dailyReportActivityId: null, activityCode: value.slice(5) };
  return { dailyReportActivityId: null, activityCode: value };
}

function revalidateProgress(projectId: string, reportId: string) {
  revalidatePath(`/projects/${projectId}/progress`);
  revalidatePath(`/projects/${projectId}/progress/reports/${reportId}`);
  revalidatePath(`/projects/${projectId}/progress/reports/${reportId}/print`);
}

export async function updateDailyReportMediaAction(projectId: string, reportId: string, mediaId: string, formData: FormData) {
  await requirePermission("avance.crear");
  const activity = activityInput(stringValue(formData, "activityRef"));
  await updateDailyReportMediaMetadata(projectId, reportId, mediaId, {
    ...activity,
    mediaType: mediaTypeValue(stringValue(formData, "mediaType")),
    title: stringValue(formData, "title") || null,
    description: stringValue(formData, "description") || null
  });
  revalidateProgress(projectId, reportId);
}

export async function moveDailyReportMediaAction(projectId: string, reportId: string, mediaId: string, direction: "up" | "down") {
  await requirePermission("avance.crear");
  const media = await prisma.dailyReportMedia.findMany({
    where: { dailyReportId: reportId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true }
  });
  const ids = media.map((item) => item.id);
  const index = ids.indexOf(mediaId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;

  if (index >= 0 && swapIndex >= 0 && swapIndex < ids.length) {
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
    await reorderDailyReportMedia(projectId, reportId, ids);
    revalidateProgress(projectId, reportId);
  }
}

export async function deleteDailyReportMediaAction(projectId: string, reportId: string, mediaId: string) {
  await requirePermission("avance.crear");
  await deleteDailyReportMedia(projectId, reportId, mediaId);
  revalidateProgress(projectId, reportId);
}
