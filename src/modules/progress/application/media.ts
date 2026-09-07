import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/shared/lib/prisma";

const MAX_MEDIA_SIZE = 25 * 1024 * 1024;
const allowedMimePrefixes = ["image/", "video/"];
const mediaTypeValues = new Set(["BEFORE", "DURING", "AFTER", "OTHER"]);

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeExtension(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, "");
  if (extension) return extension;
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "video/mp4") return ".mp4";
  return ".jpg";
}

function mediaType(value: string) {
  return mediaTypeValues.has(value) ? value as "BEFORE" | "DURING" | "AFTER" | "OTHER" : "DURING";
}

function parseActivityRef(value: string) {
  if (value.startsWith("id:")) return { type: "id" as const, value: value.slice(3) };
  if (value.startsWith("code:")) return { type: "code" as const, value: value.slice(5) };
  return { type: "code" as const, value };
}

async function assertDraftReport(projectId: string, reportId: string) {
  const report = await prisma.dailyReport.findFirst({
    where: { id: reportId, projectId },
    include: { activities: { select: { id: true, activityCode: true } } }
  });

  if (!report) throw new Error("No se encontro el informe diario.");
  if (report.status !== "DRAFT") throw new Error("Solo se pueden modificar evidencias en informes en borrador.");
  return report;
}

function resolveActivityForReport(
  activities: Array<{ id: string; activityCode: string }>,
  dailyReportActivityId: string | null,
  activityCode: string | null
) {
  if (dailyReportActivityId) {
    const activity = activities.find((item) => item.id === dailyReportActivityId);
    if (!activity) throw new Error("La actividad seleccionada para la evidencia no pertenece al informe actual.");
    return { dailyReportActivityId: activity.id, activityCode: activity.activityCode };
  }

  if (!activityCode) return { dailyReportActivityId: null, activityCode: null };

  const matches = activities.filter((item) => item.activityCode === activityCode);
  if (matches.length > 1) throw new Error("La actividad seleccionada para la evidencia es ambigua.");
  if (matches.length === 1) return { dailyReportActivityId: matches[0].id, activityCode: matches[0].activityCode };
  return { dailyReportActivityId: null, activityCode };
}

export async function saveDailyReportMediaFiles(reportId: string, formData: FormData, context: { userId: string }) {
  const count = Number(stringValue(formData, "mediaCount") || "0");
  const saved = [];
  const report = await prisma.dailyReport.findUnique({
    where: { id: reportId },
    include: {
      activities: { select: { id: true, activityCode: true, activityName: true } },
      mediaEntries: { select: { sortOrder: true } }
    }
  });

  if (!report) throw new Error("No se encontro el informe diario.");
  if (report.status !== "DRAFT") throw new Error("Solo se pueden agregar evidencias a informes en borrador.");

  let nextSortOrder = report.mediaEntries.reduce((max, media) => Math.max(max, media.sortOrder), 0);

  for (let index = 0; index < count; index++) {
    const file = formData.get(`media.${index}.file`);
    if (!(file instanceof File) || file.size === 0) continue;

    if (file.size > MAX_MEDIA_SIZE) {
      throw new Error(`La evidencia ${file.name} supera el limite de 25 MB.`);
    }

    if (!allowedMimePrefixes.some((prefix) => file.type.startsWith(prefix))) {
      throw new Error(`La evidencia ${file.name} debe ser imagen o video.`);
    }

    const extension = safeExtension(file.name, file.type);
    const fileName = `${randomUUID()}${extension}`;
    const storageKey = `uploads/daily-reports/${reportId}/${fileName}`;
    const outputDir = path.join(process.cwd(), "public", "uploads", "daily-reports", reportId);
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, fileName), Buffer.from(await file.arrayBuffer()));

    const activityRef = stringValue(formData, `media.${index}.activityRef`) || stringValue(formData, `media.${index}.activityCode`);
    const parsedActivityRef = parseActivityRef(activityRef);
    let dailyReportActivityId: string | null = null;
    let activityCode: string | null = null;

    if (parsedActivityRef.value) {
      if (parsedActivityRef.type === "id") {
        const activity = report.activities.find((item) => item.id === parsedActivityRef.value);
        if (!activity) throw new Error("La actividad seleccionada para la evidencia no pertenece al informe actual.");
        dailyReportActivityId = activity.id;
        activityCode = activity.activityCode;
      } else {
        const matches = report.activities.filter((item) => item.activityCode === parsedActivityRef.value);
        if (matches.length > 1) throw new Error("La actividad seleccionada para la evidencia es ambigua. Guarda el informe y vuelve a seleccionar la actividad.");
        if (matches.length === 1) {
          dailyReportActivityId = matches[0].id;
          activityCode = matches[0].activityCode;
        } else {
          activityCode = parsedActivityRef.value;
        }
      }
    }

    nextSortOrder += 10;

    const record = await prisma.dailyReportMedia.create({
      data: {
        dailyReportId: reportId,
        dailyReportActivityId,
        activityCode,
        mediaType: mediaType(stringValue(formData, `media.${index}.mediaType`)),
        title: stringValue(formData, `media.${index}.title`) || null,
        description: stringValue(formData, `media.${index}.description`) || null,
        fileName,
        originalName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        storageKey,
        publicUrl: `/${storageKey.replaceAll("\\", "/")}`,
        sortOrder: nextSortOrder,
        uploadedById: context.userId
      }
    });
    saved.push(record);
  }

  return saved;
}

export async function updateDailyReportMediaMetadata(
  projectId: string,
  reportId: string,
  mediaId: string,
  input: {
    dailyReportActivityId?: string | null;
    activityCode?: string | null;
    mediaType?: "BEFORE" | "DURING" | "AFTER" | "OTHER";
    title?: string | null;
    description?: string | null;
    sortOrder?: number;
  }
) {
  const report = await assertDraftReport(projectId, reportId);
  const media = await prisma.dailyReportMedia.findFirst({ where: { id: mediaId, dailyReportId: reportId } });
  if (!media) throw new Error("No se encontro la evidencia.");

  const activity = resolveActivityForReport(report.activities, input.dailyReportActivityId ?? null, input.activityCode ?? null);

  return prisma.dailyReportMedia.update({
    where: { id: mediaId },
    data: {
      dailyReportActivityId: activity.dailyReportActivityId,
      activityCode: activity.activityCode,
      mediaType: input.mediaType,
      title: input.title,
      description: input.description,
      sortOrder: input.sortOrder
    }
  });
}

export async function reorderDailyReportMedia(projectId: string, reportId: string, orderedMediaIds: string[]) {
  await assertDraftReport(projectId, reportId);
  const media = await prisma.dailyReportMedia.findMany({
    where: { dailyReportId: reportId, id: { in: orderedMediaIds } },
    select: { id: true }
  });
  const validIds = new Set(media.map((item) => item.id));

  if (validIds.size !== orderedMediaIds.length) {
    throw new Error("El orden contiene evidencias que no pertenecen al informe actual.");
  }

  await prisma.$transaction(
    orderedMediaIds.map((id, index) => prisma.dailyReportMedia.update({ where: { id }, data: { sortOrder: (index + 1) * 10 } }))
  );
}

export async function deleteDailyReportMedia(projectId: string, reportId: string, mediaId: string) {
  await assertDraftReport(projectId, reportId);
  const media = await prisma.dailyReportMedia.findFirst({ where: { id: mediaId, dailyReportId: reportId } });
  if (!media) throw new Error("No se encontro la evidencia.");

  await prisma.dailyReportMedia.delete({ where: { id: mediaId } });
  try {
    await unlink(path.join(process.cwd(), "public", media.storageKey));
  } catch {
    // El registro ya no existe; si el archivo no esta en disco no debe bloquear el borrado logico.
  }
}
