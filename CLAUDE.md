@AGENTS.md

HM CONSTRUCTORA — INSTRUCCIONES DE TRABAJO PARA CLAUDE CODE

Última actualización: 2026-09-07

PROPÓSITO

Estas instrucciones son el contexto permanente del proyecto. No vuelvas a pedir al usuario requisitos que ya están aquí ni pegues/reanalices el Repomix completo en cada tarea.

Trabaja sobre el sistema existente. No lo reconstruyas desde cero, no elimines funciones válidas y no hagas refactors masivos sin necesidad.

Si este archivo contradice el código real, manda el código real. Corrige este archivo solo cuando cambie una decisión permanente del proyecto.

0. ARQUITECTURA Y MÓDULOS ACTUALES (referencia rápida)

Esta sección resume el estado real del código (no un plan) para no tener que releer todo el repositorio en cada tarea. El detalle completo vive en docs/ (ver docs/README.md como índice); esta sección es solo el mapa rápido.

Stack: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Prisma 7 + MySQL (driver `mariadb` vía `@prisma/adapter-mariadb`, NO `mysql2`) + Tailwind CSS 4. PWA con `next-pwa`/service worker propio (`public/sw.js`) y sincronización offline con Dexie (IndexedDB).

Convención de capas por módulo (`src/modules/<modulo>/`), solo se crean las carpetas que tengan contenido real:

- `domain/`: tipos, validación (Zod), reglas puras y cálculos.
- `application/`: casos de uso, Server Actions, Route Handlers, acceso a Prisma.
- `ui/`: componentes y vistas específicas del módulo.

Módulos reales en `src/modules/` y su responsabilidad:

- `auth`: login, sesión JWT (`jose`), passkeys/WebAuthn, rate limiting de login, hashing de contraseñas.
- `roles`: catálogo de permisos y roles del sistema (`src/modules/roles/domain/permissions.ts` es la fuente de verdad de qué permisos y roles existen).
- `users`: gestión de usuarios internos (alta, edición, estado, reseteo de contraseña, asignación de roles).
- `audit`: bitácora de acciones sensibles (`AuditLog`).
- `projects`: CRUD de proyectos, responsables, integrantes (`ProjectMember`, hoy no se usa para autorización — ver docs/security-audit.md M4).
- `client-portal`: enlaces de portal por token (`PortalShare`), acotados por proyecto.
- `budgets`: presupuestos, versiones, secciones, renglones.
- `schedules`: cronograma, actividades, dependencias, asignaciones.
- `progress`: informes diarios de avance, mano de obra, materiales usados, evidencia multimedia, sincronización offline (`SyncOperation`).
- `inventory`: materiales, bodegas, existencias (`Stock`), movimientos (`StockMovement`).
- `requisitions`: solicitudes de material/compra y sus renglones.
- `finances`: gastos (`FinancialExpense`), pagos a proveedor (`SupplierPayment`) y pagos de cliente (`ClientPayment`) — son tres conceptos distintos, no fusionarlos.
- `documents`: repositorio documental por proyecto, categorías, versiones, almacenamiento (hoy en `public/uploads/...`, servido vía Route Handler autenticado — ver docs/security-audit.md H1).
- `reports`: solo `ui/` (plantillas de reporte reutilizan datos de progress/budgets/finances, no tiene modelos propios).
- `notifications`: avisos internos.
- `website`: CMS del sitio público (`WebsiteSettings` singleton, `WebsiteService`, `WebsiteProjectPhoto`, `WebsiteInquiry` para el formulario de contacto). Ver sección 4 y 5 de este archivo para las reglas de negocio de este módulo.

Nota histórica: `docs/modules.md`/`docs/project-structure.md` originales (Etapa 0) planeaban módulos separados `workforce`, `media`, `contracts`, `plans` y `sync` que nunca se crearon como módulos independientes — quedaron absorbidos dentro de `progress` (mano de obra y media van en `DailyReportLabor`/`DailyReportMedia`), `documents` y la ruta de offline-sync (`SyncOperation`). Si vas a crear alguno de esos conceptos, revisa primero si ya vive dentro de otro módulo antes de crear uno nuevo.

Rutas (`src/app/`):

- `(public)/` — sitio público sin sesión: `/`, `/servicios`, `/proyectos`, `/contacto`.
- `login/`, `account/` — autenticación y gestión de la propia cuenta/passkeys.
- `dashboard/`, `projects/`, `inventory/`, `requisitions/`, `finances/`, `documents/`, `reports/`, `users/`, `website/` — rutas internas autenticadas (protegidas también por `src/proxy.ts` como red de seguridad; cada página valida su propio permiso además).
- `portal/[token]/` — vista del cliente por enlace de portal, sin sesión de empleado.
- `api/` — Route Handlers: `api/auth/*` (login/passkeys), `api/documents/*` (descarga autenticada de documentos), `api/projects/[id]/progress/offline-sync` (sync offline), `api/dev/reset-database` (solo desarrollo, triple-gateado), `api/health`, `api/notifications`.
- `offline/` — página de fallback del service worker.

Inicialización del proyecto (desarrollo local):

1. `docker compose up -d` — levanta MySQL (puerto 3307, no 3306, para no chocar con instalaciones locales) y MinIO. Nota: MinIO está declarado en `docker-compose.yml`/`.env.example` y `@aws-sdk/client-s3` está en `package.json`, pero hoy **no se usa en ningún lado de `src/`** — el almacenamiento real de documentos/imágenes es el sistema de archivos local (`public/uploads/...`, ver `src/modules/documents/application/storage.ts`). Antes de "aprovechar" MinIO para algo nuevo, confirma si sigue siendo el plan o es un remanente sin terminar de migrar.
2. Copiar `.env.example` a `.env` y ajustar si hace falta (`DATABASE_URL`, `AUTH_SECRET` de al menos 32 caracteres). `ALLOW_DEV_DB_RESET=true` habilita `/api/dev/reset-database` solo en local, además de requerir `NODE_ENV=development` y sesión de superadministrador.
3. `npm install`.
4. `npm run prisma:generate` (genera el cliente Prisma con el adaptador `mariadb`).
5. `npm run prisma:migrate` (aplica migraciones a la base local).
6. `npm run prisma:seed` (crea roles/permisos iniciales y el usuario semilla — ver README.md para las credenciales de desarrollo).
7. `npm run dev` (Next.js con Turbopack).

Scripts de verificación relevantes (ver package.json): `npm run typecheck`, `npm run lint` (Biome), `npm run test` (Vitest, pruebas en `tests/*.test.ts` — no `tests/unit|integration|e2e`, esa subdivisión nunca se implementó), `npm run build`.

Documentos vivos a los que referirse para más detalle (ver docs/README.md para el índice completo, incluyendo cuáles están desactualizados): `docs/architecture.md`, `docs/modules.md`, `docs/project-structure.md`, `docs/data-model.md`, `docs/roles-permissions.md`, `docs/database-audit.md`, `docs/security-audit.md`.

1. FORMA DE TRABAJO

Antes de editar:

revisa git status y el diff relacionado;

lee solo los archivos necesarios para la tarea;

respeta AGENTS.md y las reglas locales de Next.js;

revisa primero el flujo completo de datos cuando toques Prisma, servicios, inventario, finanzas o avance;

reutiliza módulos, servicios, componentes y storage existentes antes de crear otros;

no dupliques lógica, tablas ni conceptos de negocio.

Continúa automáticamente entre pasos seguros. No preguntes “¿quieres que siga?” después de cada fase.

Detente únicamente si:

puede perderse información;

se requiere modificar datos reales de forma irreversible;

faltan secretos/credenciales necesarios;

existen dos reglas de negocio incompatibles que el código no permite resolver;

una acción afectaría producción.

Después de cambios importantes ejecuta los scripts REALES disponibles en package.json, incluyendo cuando corresponda:

Prisma validate/generate;

lint;

typecheck;

tests;

build.

No declares una tarea terminada si quedó un error provocado por tus cambios.

2. SKILLS OBLIGATORIAS

El repositorio ya incluye herramientas especializadas. Úsalas; no hagas un rediseño visual solo “a criterio”.

Para UI/UX:

.agents/skills/impeccable/SKILL.md

.agents/skills/ui-ux-pro-max/SKILL.md

.agents/skills/ui-styling/SKILL.md

.agents/skills/design-system/SKILL.md

.agents/skills/brand/SKILL.md

Reglas:

usa Impeccable para auditar, mejorar, pulir, endurecer y revisar el acabado final;

usa UI UX Pro Max para jerarquía, navegación, formularios, dashboards, tablas, responsive y patrones UX;

usa UI Styling para Tailwind, componentes, estados y accesibilidad;

usa Design System para tokens y consistencia;

usa Brand para identidad visual de HM.

Carga solo la skill necesaria para el trabajo actual para ahorrar contexto.

3. REDISEÑO DEL SISTEMA INTERNO

Intención visual

La imagen de referencia entregada por el usuario sirve ÚNICAMENTE como inspiración para:

textura tipo glass/frosted glass;

profundidad;

transparencias;

luces suaves;

bordes finos;

sensación moderna y premium.

NO copies:

el color púrpura/fucsia;

la composición;

el estilo gamer/neón;

el fondo exacto;

los colores exactos de la referencia.

Color

No existe una paleta nueva obligatoria prefijada.

Primero analiza:

logo actual de HM;

colores actuales del sistema;

contraste;

tipo de producto;

uso en construcción/obra;

legibilidad en desktop y móvil.

Luego, con Brand + UI UX Pro Max + Impeccable, define una paleta profesional para HM.

Preferencia visual:

neutros elegantes (grafito, piedra, gris cálido/frío, blanco roto o tonos equivalentes);

color corporativo HM como acento principal;

un color secundario sobrio solo si mejora jerarquía;

colores semánticos independientes para success/warning/error/info.

PROHIBIDO usar púrpura/fucsia como identidad principal solo porque aparece en la referencia.

Glassmorphism

Usa glass SOLO donde mejore la interfaz:

AppShell;

sidebar/topbar;

login;

tarjetas KPI;

toolbars;

filtros;

modales/drawers;

tarjetas de resumen.

En contenido denso usa superficies más sólidas:

tablas;

presupuesto;

cronograma;

inventario;

finanzas;

formularios extensos.

El resultado debe sentirse:
profesional, limpio, moderno, premium y relacionado con construcción, no futurista exagerado.

Requisitos:

WCAG AA;

foco visible;

responsive;

buen rendimiento móvil;

blur moderado;

prefers-reduced-motion;

fallback si backdrop-filter no conviene;

no añadir imágenes pesadas si la textura puede resolverse con CSS.

Sistema de diseño

Antes de cambiar muchas páginas:

audita globals.css y estilos repetidos;

define tokens semánticos;

consolida botones, inputs, cards, tablas, badges, filtros, dialogs y page headers;

elimina colores/estilos hardcodeados repetidos cuando sea seguro;

aplica el sistema visual progresivamente.

NO crees una segunda librería de componentes si ya existe un patrón reutilizable.

Impresión y PDF

Las rutas /print, reportes y PDFs:

siguen en fondo blanco;

texto oscuro;

tablas legibles;

estilo apropiado para impresión.

No aplicar glassmorphism a impresión/PDF.

4. SITIO WEB PÚBLICO DE HM

Sitio de referencia:
https://www.hmconstructora.com/index.html

Claude debe inspeccionar DIRECTAMENTE el sitio público actual y sus páginas/enlaces antes de implementarlo.

La web en línea es la fuente de verdad para:

textos;

secciones;

servicios;

navegación;

teléfonos;

direcciones;

correos;

horarios;

redes;

fotografías;

galerías;

llamados a la acción;

contenido visible.

Objetivo

Recrear dentro de este mismo proyecto la experiencia y contenido visible del sitio actual de HM de la forma más fiel posible, pero usando Next.js/React/Tailwind y buenas prácticas.

“Replicar” significa reproducir:

estructura;

contenido;

orden;

navegación;

secciones;

imágenes disponibles;

responsive;

intención visual.

NO significa copiar código fuente de terceros línea por línea.

Si el sitio contiene una sección o dato no enumerado aquí, también debes contemplarlo.

Separación de rutas

Debe existir una separación clara:

Público:

/

rutas públicas equivalentes a las páginas reales del sitio;

/contacto, /servicios, proyectos/remodelaciones y las que resulten del análisis.

Interno autenticado:

/dashboard

/projects/**

/inventory

/requisitions

/finances

/documents

/reports

/users

/website

demás módulos internos existentes.

Especiales:

/login

/account/**

/portal/[token]

/offline

Actualmente revisa qué hace / antes de cambiarlo. Si redirige al dashboard, adapta routing/proxy sin abrir rutas internas.

Mantén redirects SEO desde las URLs antiguas .html hacia sus nuevas rutas cuando corresponda.

No mezcles el layout público con el AppShell administrativo.

5. MÓDULO INTERNO “SITIO WEB”

El contenido público NO debe depender de editar código.

Crear dentro del sistema un apartado Sitio web, usando permisos del sistema existente.

Debe permitir administrar, según lo que exista realmente en la web:

Inicio;

servicios;

proyectos/remodelaciones;

Nosotros;

misión;

visión;

textos y CTA;

dirección/ubicación/mapa;

teléfonos;

correos;

horarios;

enlaces;

redes sociales;

imágenes;

galerías;

SEO/metadatos;

publicación/visibilidad.

La interfaz debe ser intuitiva para una persona no técnica.

Debe incluir:

edición por secciones/bloques;

guardar y mostrar estado de cambios;

activar/desactivar contenido;

ordenar elementos;

preview razonable;

subir/reemplazar/eliminar imágenes;

alt text;

captions cuando corresponda;

imagen de portada;

galerías;

confirmación antes de eliminar;

mensajes claros de éxito/error.

Fotos y evidencias

Permitir dos fuentes:

subir material específicamente para la web;

reutilizar, cuando sea válido, fotografías/evidencias ya almacenadas en proyectos.

No duplicar el archivo físico si puede reutilizarse de forma segura.

Una evidencia interna NUNCA se vuelve pública automáticamente.
Debe existir una acción explícita de publicación/visibilidad.

Si la arquitectura actual de documentos/evidencias ya resuelve storage, reutilízala en vez de crear otro sistema paralelo.

6. CONTACTO / COTIZACIONES

El formulario público debe usar los campos y datos que realmente tenga el sitio actual, adaptados si es necesario a un flujo administrable.

Guardar solicitudes en el sistema para que puedan atenderse internamente.

Requisitos mínimos:

validación server-side;

protección anti-spam razonable;

rate limiting si aplica;

estados de seguimiento;

no filtrar errores internos;

no exponer datos privados.

No inventes un CRM grande: implementa solamente lo necesario para recibir, consultar y dar seguimiento a solicitudes del sitio.

7. AUDITORÍA DE BASE DE DATOS ANTES DE CREAR MODELOS

Antes de crear tablas para el sitio web o cualquier otro módulo:

inspecciona prisma/schema.prisma;

inspecciona migraciones activas;

inspecciona servicios/queries/actions que usan esos modelos;

identifica tablas/conceptos repetidos;

determina si cada repetición es realmente duplicada o cumple otro propósito.

Genera/actualiza:
docs/database-audit.md

Debe incluir de forma compacta:

modelo/tabla;

propósito;

relaciones principales;

duplicados o solapamientos detectados;

problemas de normalización;

índices relevantes;

recomendaciones aplicadas/no aplicadas.

Regla de tablas duplicadas

NO crear una tabla nueva solo porque el nombre nuevo parece más cómodo.

Antes de crear cualquier modelo verifica:

si ya existe el mismo concepto;

si puede extenderse el modelo actual sin mezclar responsabilidades;

si es una entidad maestra, snapshot, movimiento, documento o relación;

si tiene lifecycle/permisos distintos que justifiquen una tabla propia.

No fusiones modelos diferentes únicamente para “tener menos tablas”.

Ejemplos de conceptos que NO deben confundirse:

gasto ≠ pago a proveedor;

pago de cliente ≠ pago a proveedor;

partida presupuestaria ≠ recurso de inventario;

actividad de cronograma ≠ material;

documento ≠ evidencia;

snapshot histórico ≠ dato maestro.

8. NORMALIZACIÓN E INTEGRIDAD

Revisa la base con criterio práctico de normalización (hasta 3FN donde aporte valor).

Detecta:

datos maestros repetidos;

campos que deberían depender de otra entidad;

inconsistencias de unidades/nombres;

relaciones opcionales contradictorias;

datos derivados innecesariamente persistidos;

duplicados reales.

NO elimines snapshots históricos válidos de informes/documentos solo por parecer redundantes.

Si propones una nueva entidad como:

Supplier;

Worker/Crew;

UnitOfMeasure;

MediaAsset;
u otra similar,

debes demostrar primero que resuelve un problema real de consistencia y que no duplica un modelo existente.

Toda corrección debe preservar datos existentes mediante una migración segura.

9. MIGRACIONES

Reglas:

no editar migraciones ya aplicadas para reescribir historia;

no aplicar migrate reset sobre datos reales;

no tocar migrations_archive como migraciones activas;

nuevas correcciones = nueva migración incremental;

usar shadow/test DB para validar cuando sea posible;

probar que una base limpia llega correctamente al schema actual;

revisar drift, FK, UNIQUE y huérfanos.

Antes de aplicar una migración destructiva: DETENTE y explica el riesgo.

10. ÍNDICES Y OPTIMIZACIÓN

NO añadir índices a todas las columnas.

Los índices deben responder a tráfico/consultas reales.

Para cada índice nuevo:

identifica la consulta que lo necesita;

comprueba índices existentes;

usa EXPLAIN / EXPLAIN ANALYZE cuando el entorno lo permita;

revisa selectividad;

considera costo de escritura;

añade el mínimo índice útil.

Revisar especialmente:

listados por proyecto;

fechas;

estados + fecha;

historial de movimientos;

actividades ordenadas;

documentos visibles en portal;

requisiciones;

pagos/gastos;

consultas del dashboard.

No asumir que un índice aislado sobre boolean/enums de baja cardinalidad ayuda.

No asumir que LIKE '%texto%' mejora con un B-tree común. Si la búsqueda se vuelve crítica, evalúa prefijo/FULLTEXT/otra estrategia.

No elimines un índice por teoría: verifica primero si se usa o queda cubierto por otro.

11. CONCURRENCIA E IDEMPOTENCIA

Audita operaciones críticas:

stock;

transferencias;

aprobación de informes;

consumos generados por informes;

requisiciones/compra/recepción;

gastos/pagos;

numeraciones.

Una transacción que hace:
leer → calcular → escribir
puede seguir sufriendo lost updates.

Evita:

inventario negativo por operaciones simultáneas;

doble registro por doble clic/retry/offline sync;

compras duplicadas;

pagos duplicados;

numeraciones generadas con COUNT + 1 que colisionen.

Usa, según corresponda:

actualización atómica;

bloqueo de fila;

UNIQUE;

idempotency key;

manejo de conflictos;

contador transaccional.

Agrega pruebas para los flujos críticos que modifiques.

12. SEGURIDAD

Mantén el mecanismo actual de autenticación, roles y permisos. No crees otro sistema paralelo.

Toda escritura sensible:

autorización server-side;

Zod/validación equivalente;

auditoría cuando corresponda.

Uploads:

validar MIME real;

tamaño;

nombre/storage key seguro;

evitar path traversal;

no guardar binarios grandes en MySQL.

Sitio público:

nunca exponer finanzas, documentos privados ni evidencias internas por defecto;

permisos específicos para editar/publicar el sitio;

contacto protegido contra abuso;

portal por token conserva sus restricciones.

13. ORDEN DE EJECUCIÓN

Ejecuta el trabajo completo por bloques, sin pedir aprobación entre bloques seguros:

A. Auditoría

estado actual;

BD;

migraciones;

tablas duplicadas;

normalización;

consultas;

índices;

concurrencia;

baseline de pruebas.

B. Base visual

skills;

auditoría de UI;

paleta HM;

tokens;

textura/glass moderado;

componentes globales;

AppShell/login.

C. Rediseño interno

Aplica el nuevo sistema visual a los módulos existentes sin cambiar sus reglas de negocio.

D. Sitio público

Analiza la web real y recrea todas sus páginas/secciones/contenido.

E. Sitio web administrable

Implementa el módulo /website, contenido, multimedia, evidencias públicas, contacto y publicación SIN crear tablas duplicadas.

F. QA

responsive;

accesibilidad;

seguridad;

performance;

Impeccable final pass;

Prisma;

lint;

typecheck;

tests;

build.

14. CRITERIO DE TERMINADO

El trabajo no está terminado hasta que:

el sistema existente sigue funcionando;

el rediseño es consistente y no usa púrpura/fucsia de la referencia;

la textura glass es sutil y útil, no decorativa en exceso;

el sitio público representa fielmente el contenido actual de HM;

el contenido principal del sitio se puede editar desde /website;

fotos/galerías/evidencias públicas pueden administrarse;

las rutas internas siguen protegidas;

no se crearon tablas o módulos duplicados;

las migraciones son seguras;

los índices están justificados por consultas reales;

los flujos críticos conservan integridad/concurrencia;

impresión/PDF sigue legible;

lint, typecheck, tests y build pasan.

15. RESPUESTA DE CLAUDE

No desperdicies tokens repitiendo estas instrucciones.

Durante la implementación responde de forma breve:

bloque realizado;

archivos/migración importantes;

pruebas y resultado;

riesgo real si existe;

siguiente bloque.

Si no existe un bloqueo real, continúa trabajando.