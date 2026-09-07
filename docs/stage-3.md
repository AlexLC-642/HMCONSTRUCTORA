# Etapa 3 - Presupuesto

## Alcance implementado

- Modelos de presupuesto con versiones, renglones y lineas.
- Tipos de linea alineados a los PDF de referencia: materiales, mano de obra y otros.
- Calculos centralizados en servidor para subtotales, imprevistos, supervision/administracion y total general.
- Tabla editable por proyecto en `/projects/[id]/budget`.
- Creacion de presupuesto base desde la estructura de `PRESUPUESTO FASE 2 SHUSHU.pdf`.
- Flujo de aprobacion con historial: una version aprobada queda protegida y se crea un nuevo borrador editable.
- Vista imprimible en `/projects/[id]/budget/print` como base para PDF.
- Auditoria de creacion, edicion y aprobacion.

## Referencias usadas

- `docs/references/PRESUPUESTO FASE 2 SHUSHU.pdf`
- `docs/references/CRONOGRAMA TENTATIVO ACTIVIDADES SHUSHU.pdf`
- `docs/references/ESTADOS DE CUENTA.pdf`

## Estructura detectada en presupuesto

- Encabezado con nombre del proyecto, ubicacion y titulo `PRESUPUESTO` o `PRESUPUESTO INTEGRADO`.
- Renglones numerados con nombre descriptivo.
- Bloque `MATERIAL` con columnas: No., descripcion, cantidad, unidad, P/U, subtotal.
- Bloque `MANO DE OBRA` con columnas: No., descripcion, cantidad, unidad o dias, P/U, subtotal.
- Resumen final: total de renglones, encargado de obra, imprevistos 5%, subtotal, supervision y administracion 15%, total general.

## Validaciones ejecutadas

- `npx prisma migrate dev --name add_budgets`
- `npx prisma generate`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

## Pendiente para una etapa posterior

- Exportacion PDF automatica desde servidor.
- Comparacion visual pixel a pixel contra los PDF originales.
- Importador automatico de todos los renglones desde PDF/Excel si la empresa quiere cargar historicos completos.
