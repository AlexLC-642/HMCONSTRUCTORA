# ADR 0001 - Monolito modular con Next.js

## Estado

Propuesto.

## Contexto

El sistema requiere interfaz web, backend, autenticacion, permisos, reportes, PWA, portal privado y operaciones internas. El alcance es amplio, pero pertenece a un solo producto interno.

## Decision

Usar Next.js full-stack con App Router, React y TypeScript estricto como monolito modular.

El backend se implementara dentro de Next.js usando Route Handlers, Server Actions y servicios de dominio. Los modulos se organizaran por negocio.

## Consecuencias

- Menos complejidad operativa inicial.
- Un solo despliegue.
- Reglas de negocio centralizadas.
- Permite evolucionar a servicios externos en el futuro si una necesidad real lo justifica.
- Requiere disciplina en limites de modulos para evitar acoplamiento excesivo.

## Alternativas descartadas

- Microservicios: innecesarios para primera version.
- React separado con API independiente: agrega complejidad sin beneficio claro inicial.
