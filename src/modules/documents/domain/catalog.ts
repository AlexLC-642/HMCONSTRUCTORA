export const defaultDocumentCategories = [
  { key: "contratos", name: "Contratos y acuerdos", description: "Contratos, anexos, convenios y órdenes de cambio.", sortOrder: 10 },
  { key: "planos", name: "Planos y diseños", description: "Planos, detalles técnicos y archivos CAD.", sortOrder: 20 },
  { key: "renders", name: "Recorridos virtuales y renders", description: "Videos cortos (máx. 1 minuto) de recorridos 3D o renders para mostrar el diseño antes de construir.", sortOrder: 25 },
  { key: "comprobantes", name: "Facturas y recibos", description: "Comprobantes emitidos por proveedores y vinculados a Finanzas.", sortOrder: 30 },
  { key: "permisos", name: "Licencias y permisos", description: "Licencias, permisos municipales y autorizaciones.", sortOrder: 40 },
  { key: "evidencias", name: "Fotos y videos de obra", description: "Registro visual general que no pertenece a un informe diario.", sortOrder: 50 },
  { key: "otros", name: "Otros documentos", description: "Correspondencia u otros archivos externos del proyecto.", sortOrder: 60 },
  { key: "presupuestos", name: "Presupuestos", description: "Versiones de presupuesto generadas por el sistema.", sortOrder: 70 },
  { key: "estados-cuenta", name: "Estados de cuenta", description: "Estados financieros generados por el sistema.", sortOrder: 80 },
  { key: "informes", name: "Informes diarios", description: "Informes de avance generados desde la jornada.", sortOrder: 90 },
  { key: "requerimientos", name: "Requerimientos", description: "Solicitudes de abastecimiento generadas por el sistema.", sortOrder: 100 }
] as const;

export const manualDocumentCategoryKeys = new Set([
  "contratos",
  "planos",
  "renders",
  "permisos",
  "evidencias",
  "otros"
]);

// Category keys whose video uploads must respect a maximum duration - a
// render/walkthrough clip is meant to be a short preview, not full footage.
// Keyed by category "key" (not id, which is a DB-generated UUID) so this
// stays stable across environments/seeds.
export const videoDurationLimitSeconds: Record<string, number> = {
  renders: 60
};

// Internal document views/downloads always go through this authenticated
// route (session + "proyectos.ver" permission check) instead of the raw
// publicUrl field, which points at a static file under public/uploads with
// no access control at all - see docs/security-audit.md H1.
export function documentFileUrl(versionId: string) {
  return `/api/documents/versions/${versionId}/file`;
}

export const documentStatusLabels = {
  DRAFT: "Borrador",
  REVIEW: "En revision",
  APPROVED: "Aprobado",
  ARCHIVED: "Archivado"
} as const;
