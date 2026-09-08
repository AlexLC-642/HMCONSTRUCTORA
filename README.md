# HM Constructora

Sistema interno de gestion de proyectos de construccion (proyectos, presupuesto, cronograma, avance diario, inventario, requerimientos, finanzas, documentos, reportes, portal de cliente) mas el sitio publico y su CMS interno.

## Estado

Sistema en operacion con modulos funcionales de extremo a extremo (ver `docs/modules.md`). Fundacion: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Prisma 7 sobre MySQL, autenticacion propia (JWT + bcrypt + passkeys/WebAuthn), permisos granulares y auditoria. MySQL local usa el puerto 3307 para evitar conflicto con servicios existentes en Windows.

Para el mapa completo de modulos, rutas y decisiones de arquitectura ver `CLAUDE.md` (seccion 0) y `docs/README.md` (indice de documentacion, indica que documentos siguen vigentes y cuales son historicos de planificacion).

## Requisitos locales

- Node.js 22 o superior.
- Docker Desktop.
- npm.

## Configuracion

1. Copiar `.env.example` a `.env`.
2. Levantar servicios locales (MySQL en el puerto 3307, MinIO):

```bash
docker compose up -d
```

3. Instalar dependencias:

```bash
npm install
```

4. Generar cliente Prisma:

```bash
npm run prisma:generate
```

5. Aplicar migraciones locales:

```bash
npm run prisma:migrate
```

6. Ejecutar datos semilla (roles, permisos y usuario inicial):

```bash
npm run prisma:seed
```

7. Iniciar desarrollo:

```bash
npm run dev
```

## Verificacion

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Usuario semilla

- Correo: `admin@hmconstructora.com`
- Contrasena: `Admin12345!`

Este usuario es solo para desarrollo local.

## Logo de empresa

Colocar el archivo del logo en public/brand/. Nombre recomendado: logo.png o logo.svg.
