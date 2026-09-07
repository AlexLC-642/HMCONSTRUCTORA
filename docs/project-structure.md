# Estructura de carpetas propuesta

```text
src/
  app/
    (auth)/
    (internal)/
    portal/
    api/
  modules/
    auth/
    users/
    roles/
    projects/
    budgets/
    schedules/
    progress/
    workforce/
    inventory/
    requisitions/
    finance/
    documents/
    contracts/
    plans/
    media/
    reports/
    client-portal/
    notifications/
    audit/
    sync/
  shared/
    components/
    lib/
    validation/
    permissions/
    storage/
    pdf/
    offline/
    utils/
prisma/
  schema.prisma
  seed.ts
docs/
  adr/
  references/
tests/
  unit/
  integration/
  e2e/
```

## Regla de modulos

Cada modulo puede contener:

```text
domain/
application/
infrastructure/
ui/
```

Solo se crearan esas carpetas cuando haya codigo real que ubicar en ellas.
