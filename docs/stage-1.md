# Etapa 1 - Fundacion tecnica

## Objetivo

Crear una base tecnica verificable para el sistema interno.

## Alcance implementado

- Proyecto Next.js full-stack con App Router.
- React como interfaz.
- TypeScript estricto usando TypeScript 7.
- Tailwind CSS.
- Prisma 7 con MySQL.
- `prisma.config.ts` para configuracion de Prisma CLI y migraciones.
- `@prisma/adapter-mariadb` para conexion directa a MySQL/MariaDB con Prisma 7.
- Docker Compose para MySQL y MinIO. MySQL expone `localhost:3307` hacia `3306` del contenedor.
- Variables de entorno locales y ejemplo.
- Lint con Biome 2, porque `typescript-eslint` aun no soporta TypeScript 7.
- Pruebas unitarias con Vitest.
- Layout interno basico.
- Autenticacion con cookie HTTP-only.
- Roles, permisos y auditoria basica.
- Manifest PWA inicial.

## Versiones principales actuales

- Next.js 16.3.0.
- React 19.2.8.
- TypeScript 7.0.2.
- Prisma 7.9.1.
- Tailwind CSS 4.3.3.
- Biome 2.5.7.
- Vitest 4.1.10.
- Zod 4.4.3.
- Dexie 4.4.4.
- TanStack Table 9.0.0.
- React Hook Form 7.84.0.

`npm outdated` no reporta dependencias atrasadas al cierre de esta actualizacion.

## Archivos creados o modificados

- `package.json`
- `package-lock.json`
- `.env.example`
- `.env` local, ignorado por Git.
- `biome.json`
- `docker-compose.yml`
- `README.md`
- `next.config.ts`
- `prisma.config.ts`
- `src/app/*`
- `src/modules/auth/*`
- `src/modules/roles/*`
- `src/modules/audit/*`
- `src/shared/*`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma/migrations/20260804123000_init_auth/migration.sql`
- `tests/*`

## Dominio de correo

Los usuarios internos deben usar correos terminados en @hmconstructora.com.

## Logo de empresa

El logo debe colocarse en public/brand/. Nombre recomendado: logo.png o logo.svg.

## Base local

La migracion SQL inicial fue aplicada contra MySQL local. El seed tambien fue ejecutado correctamente.

Estado despues del seed:

- 1 usuario.
- 9 roles.
- 17 permisos.

Para levantar el entorno en una sesion nueva:

```bash
docker compose up -d
npm run dev
```

Si se elimina el volumen de MySQL o se crea una base nueva, ejecutar de nuevo:

```bash
npm run prisma:migrate
npm run prisma:seed
```

## Riesgos y notas tecnicas

- TypeScript 7 es la version latest, pero `typescript-eslint` aun no soporta su API. Por eso el proyecto usa Biome para lint.
- Prisma 7 ya no permite `url` dentro de `schema.prisma`; la URL se gestiona desde `prisma.config.ts`.
- Para MySQL con Prisma 7 se usa `@prisma/adapter-mariadb`, adaptador oficial compatible con MySQL/MariaDB.
- `AUTH_SECRET` debe cambiarse en cualquier entorno real.
- La autenticacion inicial es deliberadamente minima y debera endurecerse en iteraciones posteriores.

## Verificacion ejecutada

```bash
npm run prisma:generate
npm run lint
npm run typecheck
npm run test
npm run build
```

Resultado: todas las verificaciones pasan.

## Criterios de aceptacion

- El proyecto instala dependencias.
- Prisma genera cliente.
- Lint pasa.
- Typecheck pasa.
- Pruebas pasan.
- Build de produccion pasa.
- La ruta `/login` existe.
- El servidor verifica permisos para entrar al dashboard.
- La base local contiene 1 usuario, 9 roles y 17 permisos despues del seed.