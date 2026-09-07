# Etapa 2 - Proyectos y dashboard inicial

## Objetivo

Implementar la gestion inicial de proyectos con permisos en servidor, cliente informativo, integrantes internos, estados, filtros, auditoria y dashboard basico con metricas centralizadas.

## Alcance implementado

- Modelo relacional para `Client`, `Project` y `ProjectMember`.
- Enum `ProjectStatus` con estados: borrador, planificacion, activo, pausado, finalizado y cancelado.
- Migracion `20260804213243_add_projects` aplicada en MySQL local.
- CRUD inicial sin borrado: crear, listar, consultar y editar proyectos.
- Cliente como registro informativo asociado al proyecto.
- Responsable e integrantes internos.
- Filtros por busqueda y estado.
- Dashboard con metricas leidas desde servicio de aplicacion.
- Auditoria de creacion y actualizacion de proyectos.
- Proteccion de rutas `/projects` mediante proxy y permisos en servidor.
- Datos semilla de un proyecto de remodelacion.

## Rutas

- `/dashboard`: resumen global inicial.
- `/projects`: listado y filtros.
- `/projects/new`: creacion de proyecto.
- `/projects/[id]`: detalle y edicion.

## Permisos aplicados

- `proyectos.ver`: dashboard y listado/detalle de proyectos.
- `proyectos.crear`: creacion de proyectos.
- `proyectos.editar`: edicion de proyectos.

## Datos semilla

Proyecto:

- Codigo: `HM-REM-001`.
- Nombre: `Remodelacion de vivienda piloto`.
- Estado: activo.
- Presupuesto base: GTQ 125,000.00.
- Avance: 12.50%.

## Verificacion ejecutada

```bash
npm run prisma:generate
npm run prisma:seed
npm run lint
npm run typecheck
npm run test
npm run build
```

Resultado: todas las verificaciones pasan.

## Criterios de aceptacion

- Crear proyecto segun permiso.
- Editar proyecto segun permiso.
- Consultar listado y detalle segun permiso.
- Cambiar estado del proyecto desde el formulario de edicion.
- Dashboard muestra conteos, presupuesto y avance promedio desde servicios.
- Acciones de creacion y edicion quedan auditadas.

## Pendientes conocidos

- Mejorar manejo visual de errores de formulario; actualmente los errores de validacion se rechazan en servidor.
- Agregar paginacion cuando el volumen de proyectos crezca.
- Agregar pruebas de integracion con base de datos para acciones server-side.