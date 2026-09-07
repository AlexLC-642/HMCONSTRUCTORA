# HM Constructora

Sistema interno de gestion de proyectos de construccion.

## Estado

Etapa 2 en progreso: proyectos y dashboard inicial sobre la fundacion Next.js, TypeScript, Prisma, MySQL, permisos y auditoria basica. MySQL local usa el puerto 3307 para evitar conflicto con servicios existentes en Windows.

## Requisitos locales

- Node.js 22 o superior.
- Docker Desktop.
- npm.

## Configuracion

1. Copiar `.env.example` a `.env`.
2. Levantar servicios locales:

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

5. Crear migracion local:

```bash
npm run prisma:migrate
```

6. Ejecutar datos semilla:

```bash
npm run prisma:seed
```

7. Iniciar desarrollo:

```bash
npm run dev
```

## Usuario semilla

- Correo: `admin@hmconstructora.com`
- Contrasena: `Admin12345!`

Este usuario es solo para desarrollo local.

## Logo de empresa

Colocar el archivo del logo en public/brand/. Nombre recomendado: logo.png o logo.svg.
