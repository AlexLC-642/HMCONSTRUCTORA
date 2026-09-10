import { recordAuditLog } from "@/modules/audit/application/audit";
import { prisma } from "@/shared/lib/prisma";
import { defaultDocumentCategories } from "../domain/catalog";
import { storeProjectDocumentFile } from "./storage";

const documentStatuses = ["DRAFT", "REVIEW", "APPROVED", "ARCHIVED"] as const;
const legacyCategoryMap: Record<string, string> = {
  actas: "otros",
  facturas: "comprobantes",
  fotografias: "evidencias",
  licencias: "permisos",
  recibos: "comprobantes",
  subcontratos: "contratos",
  videos: "evidencias"
};

type ProjectDocumentStatusValue = (typeof documentStatuses)[number];

const statusValues = new Set<string>(documentStatuses);

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function booleanValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function statusValue(value: string) {
  return statusValues.has(value) ? value as ProjectDocumentStatusValue : "DRAFT";
}

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function normalizedTags(value: string) {
  const tags = value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return tags.length > 0 ? tags.join(", ") : null;
}

export async function ensureDocumentCategories() {
  for (const category of defaultDocumentCategories) {
    await prisma.documentCategory.upsert({
      where: { key: category.key },
      update: { name: category.name, description: category.description, sortOrder: category.sortOrder, active: true },
      create: category
    });
  }

  const categories = await prisma.documentCategory.findMany({
    where: { key: { in: [...Object.keys(legacyCategoryMap), ...Object.values(legacyCategoryMap)] } },
    select: { id: true, key: true }
  });
  const categoryByKey = new Map(categories.map((category) => [category.key, category]));

  for (const [legacyKey, targetKey] of Object.entries(legacyCategoryMap)) {
    const legacyCategory = categoryByKey.get(legacyKey);
    const targetCategory = categoryByKey.get(targetKey);
    if (!legacyCategory || !targetCategory) continue;

    await prisma.projectDocument.updateMany({
      where: { categoryId: legacyCategory.id },
      data: { categoryId: targetCategory.id }
    });
  }

  await prisma.documentCategory.updateMany({
    where: { key: { in: Object.keys(legacyCategoryMap) } },
    data: { active: false }
  });

  return prisma.documentCategory.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
}

export async function createProjectDocument(projectId: string, formData: FormData, context: { userId: string }) {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Selecciona un archivo.");

  const categoryId = stringValue(formData, "categoryId");
  const category = await prisma.documentCategory.findUnique({ where: { id: categoryId } });
  if (!category?.active) throw new Error("Selecciona una categoria valida.");

  const requestedStatus = statusValue(stringValue(formData, "status"));
  const approved = requestedStatus === "APPROVED";
  const document = await prisma.projectDocument.create({
    data: {
      projectId,
      categoryId,
      title: stringValue(formData, "title") || titleFromFileName(file.name),
      description: stringValue(formData, "description") || null,
      tags: normalizedTags(stringValue(formData, "tags")),
      status: requestedStatus,
      portalVisible: approved && booleanValue(formData, "portalVisible"),
      authorId: context.userId,
      approvedById: approved ? context.userId : null,
      approvedAt: approved ? new Date() : null
    }
  });

  const storedFile = await storeProjectDocumentFile(projectId, document.id, file, category.key);
  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      versionNumber: 1,
      ...storedFile,
      notes: stringValue(formData, "versionNotes") || null,
      uploadedById: context.userId
    }
  });

  await recordAuditLog({
    userId: context.userId,
    action: "CREATE",
    entityType: "ProjectDocument",
    entityId: document.id,
    metadata: { projectId, title: document.title, status: document.status }
  });

  return document;
}

export async function updateProjectDocumentReview(documentId: string, formData: FormData, context: { userId: string }) {
  const requestedStatus = statusValue(stringValue(formData, "status"));
  const approved = requestedStatus === "APPROVED";

  const document = await prisma.projectDocument.update({
    where: { id: documentId },
    data: {
      status: requestedStatus,
      portalVisible: approved && booleanValue(formData, "portalVisible"),
      approvedById: approved ? context.userId : null,
      approvedAt: approved ? new Date() : null
    },
    select: { id: true, projectId: true, title: true, status: true, portalVisible: true }
  });

  await recordAuditLog({
    userId: context.userId,
    action: approved ? "APPROVE" : "UPDATE",
    entityType: "ProjectDocument",
    entityId: document.id,
    metadata: {
      projectId: document.projectId,
      title: document.title,
      status: document.status,
      portalVisible: document.portalVisible
    }
  });

  return document;
}
