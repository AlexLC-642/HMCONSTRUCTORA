# Flujos principales

## Flujo de avance diario

```text
borrador -> enviado -> revisado -> aprobado -> publicado
```

Reglas:

- Un borrador puede guardarse localmente en IndexedDB.
- Al enviarse, se sincroniza con clave de idempotencia.
- La aprobacion bloquea la version aprobada.
- Una correccion genera nueva version o fe de erratas.
- El consumo de inventario ocurre al aprobar, no al crear borrador.

## Flujo de requerimientos

```text
borrador -> solicitado -> revisado -> aprobado -> comprado -> recibido -> entregado -> cerrado
```

Reglas:

- La aprobacion depende de permisos.
- La recepcion puede crear entrada de inventario.
- La entrega puede relacionarse con proyecto, actividad o informe.

## Flujo de presupuesto

```text
borrador -> revision -> aprobado -> vigente -> reemplazado
```

Reglas:

- El presupuesto inicial se conserva.
- Las modificaciones se registran como versiones u ordenes de cambio.
- Los calculos se centralizan en servicios probados.

## Flujo de portal privado

```text
crear enlace -> configurar visibilidad -> compartir -> registrar accesos -> revocar o vencer
```

Reglas:

- El token plano solo se muestra al crear o regenerar.
- En base de datos se guarda hash del token.
- Solo se muestran datos aprobados y autorizados.

## Flujo offline de PWA

```text
crear operacion local -> guardar en IndexedDB -> intentar sincronizar -> confirmar servidor -> marcar sincronizada
```

Reglas:

- Cada operacion usa UUID y clave de idempotencia.
- Reintentos no deben duplicar inventario, reportes ni gastos.
- Errores quedan visibles para el usuario y registrados.
