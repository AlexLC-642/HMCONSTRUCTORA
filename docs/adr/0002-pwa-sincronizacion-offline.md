# ADR 0002 - PWA y sincronizacion offline

## Estado

Propuesto.

## Contexto

Parte del personal trabajara en obra con conexion inestable. Deben poder crear informes y guardar evidencia desde telefono o tableta.

## Decision

Implementar PWA instalable con:

- Service worker.
- Manifest.
- Shell cacheado.
- Pagina offline.
- IndexedDB con Dexie.
- Borradores locales.
- Cola de sincronizacion.
- UUIDs generados en cliente.
- Claves de idempotencia.
- Registro de errores y reintentos.

## Reglas

- Solo se podran usar offline datos previamente sincronizados.
- Las operaciones sincronizadas deben ser idempotentes.
- Inventario y finanzas se confirmaran en servidor con transacciones.
- Videos grandes pueden permanecer en cola hasta tener conexion suficiente.

## Consecuencias

- Mejora la operacion en campo.
- Aumenta la complejidad de estados, conflictos y pruebas.
- Obliga a definir contratos de sincronizacion desde etapas tempranas.
