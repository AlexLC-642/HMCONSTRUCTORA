# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personal administrativo y operativo de HM Constructora que gestiona proyectos, materiales, bodegas, movimientos, documentos, avances y finanzas desde oficina o dispositivos móviles en obra.

## Product Purpose

Centralizar el control interno de la constructora y mantener información operativa trazable por proyecto. El módulo de inventario permite conocer existencias, localizar materiales, detectar faltantes y registrar entradas, salidas, traslados, devoluciones, desperdicios y ajustes.

## Operating Context

El sistema se utiliza como aplicación web instalable (PWA) en computadoras, tabletas y teléfonos. Inventario se organiza en Stock, Movimientos y Catálogo; sus usuarios necesitan lectura rápida, controles táctiles claros y estados confiables durante tareas administrativas y de campo.

## Capabilities and Constraints

- Next.js, React, TypeScript, Prisma y Tailwind CSS.
- Los datos operativos deben persistir únicamente mediante acciones explícitas del usuario.
- Los estados, cantidades y valores deben conservar significado consistente entre vistas.
- La interfaz debe adaptarse a escritorio, tableta y móvil sin perder acciones esenciales.

## Brand Commitments

El producto se llama HM Constructora y utiliza su logotipo existente. La voz es profesional, directa y en español. La identidad visual combina rojo institucional, grafito, superficies claras y colores semánticos reservados para estados; se evitan emojis y recursos visuales que parezcan generados de forma genérica.

## Evidence on Hand

- Logotipo y navegación existentes en el repositorio.
- Flujos funcionales y modelos reales para proyectos, usuarios, inventario, presupuesto, cronograma, documentos e informes.
- No se deben fabricar cifras, clientes ni movimientos para llenar estados vacíos.

## Product Principles

- Mostrar primero el estado operativo y la acción siguiente.
- Conservar trazabilidad sin guardar información antes de una confirmación explícita.
- Usar lenguaje breve y familiar para personal de obra y administración.
- Mantener controles accesibles y utilizables con teclado y pantalla táctil.
