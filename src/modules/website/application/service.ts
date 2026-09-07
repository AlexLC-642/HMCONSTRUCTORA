import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { storeWebsiteImageFile } from "@/modules/documents/application/storage";
import { prisma } from "@/shared/lib/prisma";
import {
  websiteInquiryInputSchema,
  websiteInquiryStatusUpdateSchema,
  websitePhotoFromEvidenceInputSchema,
  websitePhotoReorderSchema,
  websitePhotoUploadInputSchema,
  websiteServiceInputSchema,
  websiteServiceReorderSchema,
  websiteSettingsInputSchema,
  type WebsiteInquiryInput,
  type WebsiteInquiryStatusUpdateInput,
  type WebsiteServiceInput,
  type WebsiteSettingsInput
} from "../domain/validation";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const MIN_FILL_TIME_MS = 2500;
const SETTINGS_ID = "singleton";

export class WebsiteInquiryRateLimitError extends Error {}

type SubmitMeta = { ipAddress: string | null; userAgent: string | null };
type WebsiteContext = { userId: string };

function nullable(value?: string | null) {
  const clean = value?.trim();
  return clean ? clean : null;
}

// ---------------------------------------------------------------------------
// Contact form submissions (public)
// ---------------------------------------------------------------------------

export async function submitWebsiteInquiry(rawInput: unknown, meta: SubmitMeta) {
  const parsed = websiteInquiryInputSchema.parse(rawInput) as WebsiteInquiryInput;

  if (meta.ipAddress) {
    const recentCount = await prisma.websiteInquiry.count({
      where: {
        ipAddress: meta.ipAddress,
        createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) }
      }
    });
    if (recentCount >= RATE_LIMIT_MAX) {
      throw new WebsiteInquiryRateLimitError("Has enviado demasiadas solicitudes. Intenta de nuevo más tarde.");
    }
  }

  const isHoneypotTripped = Boolean(parsed.website?.trim());
  const isTooFast =
    typeof parsed.startedAt === "number" && Date.now() - parsed.startedAt < MIN_FILL_TIME_MS;

  const inquiry = await prisma.websiteInquiry.create({
    data: {
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      message: parsed.message,
      status: isHoneypotTripped || isTooFast ? "SPAM" : "NEW",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    }
  });

  return { inquiry, isSpam: isHoneypotTripped || isTooFast };
}

export async function listWebsiteInquiries() {
  return prisma.websiteInquiry.findMany({
    orderBy: { createdAt: "desc" },
    include: { handledBy: { select: { name: true, email: true } } }
  });
}

export async function updateWebsiteInquiryStatus(rawInput: unknown, context: WebsiteContext) {
  const parsed = websiteInquiryStatusUpdateSchema.parse(rawInput) as WebsiteInquiryStatusUpdateInput;

  const updated = await prisma.websiteInquiry.update({
    where: { id: parsed.id },
    data: {
      status: parsed.status,
      notes: nullable(parsed.notes),
      handledById: context.userId,
      handledAt: new Date()
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: "UPDATE",
      entityType: "WebsiteInquiry",
      entityId: updated.id,
      metadata: { status: updated.status }
    }
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Site-wide settings (singleton)
// ---------------------------------------------------------------------------

export async function getWebsiteSettings() {
  const existing = await prisma.websiteSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;
  return prisma.websiteSettings.create({ data: { id: SETTINGS_ID } });
}

export async function updateWebsiteSettings(rawInput: unknown, context: WebsiteContext) {
  const parsed = websiteSettingsInputSchema.parse(rawInput) as WebsiteSettingsInput;

  const updated = await prisma.websiteSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { ...parsed },
    create: { id: SETTINGS_ID, ...parsed }
  });

  await prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: "UPDATE",
      entityType: "WebsiteSettings",
      entityId: SETTINGS_ID,
      metadata: { published: updated.published }
    }
  });

  return updated;
}

export async function updateWebsiteHeroImage(imageUrl: string, context: WebsiteContext) {
  const updated = await prisma.websiteSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { heroImageUrl: imageUrl },
    create: { id: SETTINGS_ID, heroImageUrl: imageUrl }
  });
  await prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: "UPDATE",
      entityType: "WebsiteSettings",
      entityId: SETTINGS_ID,
      metadata: { heroImageUrl: imageUrl }
    }
  });
  return updated;
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export async function listWebsiteServices() {
  return prisma.websiteService.findMany({ orderBy: { position: "asc" } });
}

export async function upsertWebsiteService(rawInput: unknown, context: WebsiteContext) {
  const parsed = websiteServiceInputSchema.parse(rawInput) as WebsiteServiceInput;

  if (parsed.id) {
    const updated = await prisma.websiteService.update({
      where: { id: parsed.id },
      data: {
        title: parsed.title,
        description: parsed.description,
        icon: nullable(parsed.icon),
        active: parsed.active
      }
    });
    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        action: "UPDATE",
        entityType: "WebsiteService",
        entityId: updated.id,
        metadata: { title: updated.title }
      }
    });
    return updated;
  }

  const maxPosition = await prisma.websiteService.aggregate({ _max: { position: true } });
  const created = await prisma.websiteService.create({
    data: {
      title: parsed.title,
      description: parsed.description,
      icon: nullable(parsed.icon),
      active: parsed.active,
      position: (maxPosition._max.position ?? -1) + 1
    }
  });
  await prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: "CREATE",
      entityType: "WebsiteService",
      entityId: created.id,
      metadata: { title: created.title }
    }
  });
  return created;
}

export async function deleteWebsiteService(id: string, context: WebsiteContext) {
  const deleted = await prisma.websiteService.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: "DELETE",
      entityType: "WebsiteService",
      entityId: id,
      metadata: { title: deleted.title }
    }
  });
  return deleted;
}

export async function reorderWebsiteServices(rawInput: unknown, context: WebsiteContext) {
  const { orderedIds } = websiteServiceReorderSchema.parse(rawInput);
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.websiteService.update({ where: { id }, data: { position: index } }))
  );
  await prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: "UPDATE",
      entityType: "WebsiteService",
      entityId: null,
      metadata: { reordered: orderedIds.length }
    }
  });
}

export async function moveWebsiteService(id: string, direction: "up" | "down") {
  const items = await prisma.websiteService.findMany({
    orderBy: { position: "asc" },
    select: { id: true, position: true }
  });
  const index = items.findIndex((item) => item.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const neighbor = items[swapIndex];
  await prisma.$transaction([
    prisma.websiteService.update({ where: { id: current.id }, data: { position: neighbor.position } }),
    prisma.websiteService.update({ where: { id: neighbor.id }, data: { position: current.position } })
  ]);
}

// ---------------------------------------------------------------------------
// Project gallery photos
// ---------------------------------------------------------------------------

export async function listWebsitePhotos() {
  return prisma.websiteProjectPhoto.findMany({ orderBy: { position: "asc" } });
}

// Only images (not videos/other) from daily-report evidence make sense as
// gallery candidates. Publishing one here never touches the original record
// or its file -- it is an explicit copy-by-reference, not a move.
export async function listReusableProjectEvidence() {
  return prisma.dailyReportMedia.findMany({
    where: { mimeType: { startsWith: "image/" } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      title: true,
      publicUrl: true,
      createdAt: true,
      dailyReport: { select: { reportNumber: true, project: { select: { code: true, name: true } } } }
    }
  });
}

export async function addWebsitePhotoFromUpload(rawInput: unknown, file: File, context: WebsiteContext) {
  const parsed = websitePhotoUploadInputSchema.parse(rawInput);
  const mediaId = randomUUID();
  const stored = await storeWebsiteImageFile(mediaId, file);

  const maxPosition = await prisma.websiteProjectPhoto.aggregate({ _max: { position: true } });
  const photo = await prisma.websiteProjectPhoto.create({
    data: {
      id: mediaId,
      title: parsed.title,
      imageUrl: stored.publicUrl,
      storageKey: stored.storageKey,
      altText: nullable(parsed.altText) ?? parsed.title,
      position: (maxPosition._max.position ?? -1) + 1
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: "CREATE",
      entityType: "WebsiteProjectPhoto",
      entityId: photo.id,
      metadata: { source: "upload", title: photo.title }
    }
  });

  return photo;
}

export async function addWebsitePhotoFromEvidence(rawInput: unknown, context: WebsiteContext) {
  const parsed = websitePhotoFromEvidenceInputSchema.parse(rawInput);
  const evidence = await prisma.dailyReportMedia.findUniqueOrThrow({
    where: { id: parsed.dailyReportMediaId },
    select: { id: true, publicUrl: true }
  });

  const maxPosition = await prisma.websiteProjectPhoto.aggregate({ _max: { position: true } });
  const photo = await prisma.websiteProjectPhoto.create({
    data: {
      title: parsed.title,
      imageUrl: evidence.publicUrl,
      altText: nullable(parsed.altText) ?? parsed.title,
      sourceDailyReportMediaId: evidence.id,
      position: (maxPosition._max.position ?? -1) + 1
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: "CREATE",
      entityType: "WebsiteProjectPhoto",
      entityId: photo.id,
      metadata: { source: "evidence", sourceDailyReportMediaId: evidence.id, title: photo.title }
    }
  });

  return photo;
}

export async function setWebsitePhotoActive(id: string, active: boolean, context: WebsiteContext) {
  const updated = await prisma.websiteProjectPhoto.update({ where: { id }, data: { active } });
  await prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: "UPDATE",
      entityType: "WebsiteProjectPhoto",
      entityId: id,
      metadata: { active }
    }
  });
  return updated;
}

export async function deleteWebsitePhoto(id: string, context: WebsiteContext) {
  const deleted = await prisma.websiteProjectPhoto.delete({ where: { id } });

  // Only remove the physical file for photos we stored ourselves. A photo
  // reused from project evidence keeps its file -- it belongs to the daily
  // report, not to the website.
  if (deleted.storageKey && !deleted.sourceDailyReportMediaId) {
    await unlink(path.join(process.cwd(), "public", ...deleted.storageKey.split("/"))).catch(() => {});
  }

  await prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: "DELETE",
      entityType: "WebsiteProjectPhoto",
      entityId: id,
      metadata: { title: deleted.title }
    }
  });

  return deleted;
}

export async function reorderWebsitePhotos(rawInput: unknown, context: WebsiteContext) {
  const { orderedIds } = websitePhotoReorderSchema.parse(rawInput);
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.websiteProjectPhoto.update({ where: { id }, data: { position: index } }))
  );
  await prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: "UPDATE",
      entityType: "WebsiteProjectPhoto",
      entityId: null,
      metadata: { reordered: orderedIds.length }
    }
  });
}

export async function moveWebsitePhoto(id: string, direction: "up" | "down") {
  const items = await prisma.websiteProjectPhoto.findMany({
    orderBy: { position: "asc" },
    select: { id: true, position: true }
  });
  const index = items.findIndex((item) => item.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const neighbor = items[swapIndex];
  await prisma.$transaction([
    prisma.websiteProjectPhoto.update({ where: { id: current.id }, data: { position: neighbor.position } }),
    prisma.websiteProjectPhoto.update({ where: { id: neighbor.id }, data: { position: current.position } })
  ]);
}
