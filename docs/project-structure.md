# Estructura de carpetas real

Refleja el codigo actual (no un plan). Ver `docs/modules.md` para la responsabilidad de cada modulo y `docs/README.md` para la version historica de planificacion (Etapa 0), que proponia una estructura distinta que no se llego a construir tal cual.

```text
src/
  app/
    (public)/            # sitio publico sin sesion: /, /servicios, /proyectos, /contacto
    account/             # cuenta propia, passkeys
    api/
      auth/               # login, passkeys (register/authenticate)
      dev/                # solo desarrollo: reset-database (triple-gateado)
      documents/          # descarga autenticada de documentos (versions/[versionId]/file)
      health/
      notifications/
      projects/[id]/progress/offline-sync/
    dashboard/
    documents/
    finances/
    inventory/
    login/
    offline/              # pagina de fallback del service worker
    portal/[token]/       # vista de cliente por enlace de portal, sin sesion de empleado
    projects/[id]/...
    reports/
    requisitions/
    users/
    website/              # CMS interno del sitio publico
    layout.tsx
    error.tsx / global-error.tsx / not-found.tsx
    globals.css
  modules/
    audit/            application/
    auth/             application/ domain/ ui/
    budgets/          application/ domain/ ui/
    client-portal/    application/ ui/
    documents/        application/ domain/ ui/
    finances/         application/ domain/ ui/
    inventory/        application/ domain/ ui/
    notifications/    application/ domain/
    progress/         application/ domain/ ui/
    projects/         application/ domain/ ui/
    reports/          ui/
    requisitions/     application/ domain/ ui/
    roles/            domain/
    schedules/        application/ domain/ ui/
    users/            application/ domain/ ui/
    website/          application/ domain/ ui/
  shared/
    components/
    lib/               # prisma client, env validation, helpers compartidos (p. ej. request-ip)
    offline/           # Dexie/IndexedDB
    permissions/       # hasPermission() y utilidades de autorizacion
    ui/
    utils/
  proxy.ts             # middleware: red de seguridad de sesion para rutas internas
prisma/
  schema.prisma
  seed.ts
  migrations/
docs/
  adr/
  references/
tests/
  *.test.ts            # pruebas planas con Vitest, no hay subcarpetas unit/integration/e2e
```

## Regla de modulos

Cada modulo bajo `src/modules/<nombre>/` puede tener:

```text
domain/
application/
ui/
```

Solo se crean las carpetas que tengan codigo real (por ejemplo, `roles/` solo tiene `domain/`, y `reports/` solo tiene `ui/`). No se planeo ni se uso una carpeta `infrastructure/` separada — el acceso a Prisma vive directamente en `application/`.
