# Documentacion del proyecto

Indice de la documentacion de HM Constructora. El sistema ya esta en operacion (no es un proyecto en etapa de planificacion) — para el mapa rapido de modulos, rutas e inicializacion ver la seccion 0 de `CLAUDE.md` en la raiz del repo. Estos documentos amplian ese resumen.

Si un documento contradice el codigo real, el codigo real gana. Estos archivos se actualizan cuando cambia una decision de fondo, no en cada commit.

## Documentos vigentes (reflejan el sistema actual)

- `architecture.md`: arquitectura del sistema (capas por modulo, backend, base de datos, seguridad, PDFs, offline/PWA).
- `modules.md`: mapa de los modulos reales en `src/modules/` y su responsabilidad.
- `project-structure.md`: estructura real de carpetas (`src/app`, `src/modules`, `src/shared`, `prisma`, `tests`).
- `data-model.md`: modelos reales de `prisma/schema.prisma`, agrupados por area de negocio.
- `roles-permissions.md`: roles y permisos reales (fuente de verdad en codigo: `src/modules/roles/domain/permissions.ts`).
- `database-audit.md`: auditoria de modelos, relaciones, duplicados/solapamientos e indices (se actualiza cuando se agregan o cambian modelos).
- `security-audit.md`: auditoria de seguridad OWASP ASVS/Top 10 con hallazgos, correcciones aplicadas y estado de seguimiento (se actualiza en cada pasada de seguridad).

## Documentos historicos de planificacion (Etapa 0 — pueden no reflejar lo que se construyo)

Estos archivos se escribieron **antes** de implementar el sistema, como ejercicio de diseno inicial. Se conservan como contexto de por que se tomaron ciertas decisiones, pero varios detalles (nombres de modulos, modelos, permisos) ya no coinciden con el codigo real — para el estado actual usar siempre los documentos "vigentes" de arriba, no estos.

- `requirements.md`: requisitos consolidados originales.
- `flows.md`: flujos principales imaginados antes de construir el sistema.
- `backlog.md`: backlog priorizado original, organizado por "Etapa N".
- `risks.md`: riesgos identificados al inicio del proyecto.
- `test-plan.md`: plan de pruebas original.
- `stage-1.md` a `stage-9.md`: bitacora de avance por etapa durante la construccion inicial del sistema (historial, no un estado vivo).
- `adr/`: decisiones arquitectonicas registradas en su momento (monolito modular, PWA/offline, plantilla unica de PDF) — las decisiones en si siguen vigentes salvo que `architecture.md` diga lo contrario, pero el texto no se actualiza.
- `references/`: PDFs reales de referencia (presupuesto, cronograma, estado de cuenta) usados para no inventar el formato de esas plantillas.
- `PROMPT_CODEX_SISTEMA_GESTION_CONSTRUCCION.md`: prompt extenso usado para el andamiaje inicial del sistema con otra herramienta. Documento historico, no instrucciones vigentes — las instrucciones vigentes de trabajo son `CLAUDE.md` en la raiz del repo.

## Como mantener esto al dia

- Si agregas o renombras un modulo en `src/modules/`, actualiza `modules.md` y la seccion 0 de `CLAUDE.md`.
- Si agregas/cambias un modelo en `prisma/schema.prisma`, actualiza `data-model.md` y revisa si aplica una entrada nueva en `database-audit.md`.
- Si agregas un permiso o rol en `src/modules/roles/domain/permissions.ts`, actualiza `roles-permissions.md`.
- No es necesario tocar los documentos historicos de Etapa 0 al hacer esto — quedan como estan, documentados como historicos arriba.
