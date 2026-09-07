import { describe, expect, it } from "vitest";
import { buildDocumentPreview } from "@/modules/documents/application/queries";

describe("document preview contract", () => {
  it("keeps a stable project/category/version contract even without nested relations", () => {
    const preview = buildDocumentPreview({
      id: "doc-1",
      title: "Comprobante BTS",
      description: "Factura de campaña",
      tags: "bts, cierre",
      status: "APPROVED",
      portalVisible: true,
      createdAt: "2026-08-18T00:00:00.000Z",
      updatedAt: "2026-08-25T00:00:00.000Z",
      projectId: "project-1",
      categoryId: "category-1",
      author: null,
      approvedBy: null,
      versions: []
    }, {
      id: "project-1",
      code: "HM-REM-001",
      name: "Remodelación" 
    }, {
      id: "category-1",
      key: "comprobantes",
      name: "Comprobantes"
    });

    expect(preview.project).toMatchObject({ id: "project-1", code: "HM-REM-001", name: "Remodelación" });
    expect(preview.category).toMatchObject({ id: "category-1", key: "comprobantes", name: "Comprobantes" });
    expect(preview.version).toBeNull();
    expect(preview.versions).toEqual([]);
  });

  it("serializes the latest valid version as preview.version", () => {
    const preview = buildDocumentPreview({
      id: "doc-2",
      title: "Plano de cimentación",
      description: null,
      tags: null,
      status: "REVIEW",
      portalVisible: false,
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      projectId: "project-1",
      categoryId: "category-1",
      author: { id: "user-1", name: "Ana" },
      approvedBy: null,
      versions: [
        {
          id: "v-1",
          versionNumber: 1,
          originalName: "plano-cimentacion.pdf",
          mimeType: "application/pdf",
          fileSize: 2048,
          publicUrl: "/uploads/plano.pdf",
          createdAt: "2026-08-20T00:00:00.000Z",
          notes: "Versión inicial",
          uploadedBy: { id: "user-1", name: "Ana" }
        }
      ]
    }, {
      id: "project-1",
      code: "HM-REM-001",
      name: "Remodelación"
    }, {
      id: "category-1",
      key: "planos",
      name: "Planos"
    });

    expect(preview.version).toMatchObject({ versionNumber: 1, originalName: "plano-cimentacion.pdf", mimeType: "application/pdf" });
    expect(preview.versions[0]?.id).toBe("v-1");
  });
});
