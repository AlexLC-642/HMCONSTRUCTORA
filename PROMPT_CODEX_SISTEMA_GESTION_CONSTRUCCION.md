# PROMPT MAESTRO PARA CODEX — SISTEMA INTERNO DE GESTIÓN DE PROYECTOS DE CONSTRUCCIÓN

Actúa como un equipo senior de desarrollo de software especializado en sistemas de construcción. Debes analizar, diseñar e implementar por etapas una aplicación web interna para administrar proyectos de construcción. No intentes crear todo de una sola vez. Trabaja mediante entregables pequeños, verificables y documentados.

## 1. Forma de trabajo obligatoria

Antes de escribir código:

1. Inspecciona el repositorio completo.
2. Lee `README.md`, `AGENTS.md`, documentación técnica, variables de entorno y archivos de referencia.
3. Identifica las skills, herramientas, agentes o capacidades disponibles en el entorno.
4. Utiliza cada skill únicamente para la función que le corresponde.
5. Si existe una skill especializada en arquitectura, base de datos, frontend, PWA, PDF, seguridad, pruebas o documentación, úsala antes de implementar esa parte.
6. No inventes información que no aparezca en los requisitos o documentos de referencia.
7. Si falta una decisión que bloquea el trabajo, plantea una pregunta concreta.
8. Si la decisión no bloquea, selecciona una alternativa razonable, documenta la suposición y continúa.
9. Antes de cada etapa, presenta:
   - objetivo;
   - alcance;
   - archivos que se crearán o modificarán;
   - migraciones necesarias;
   - riesgos;
   - criterios de aceptación.
10. Al finalizar cada etapa:
   - ejecuta lint;
   - ejecuta comprobación de tipos;
   - ejecuta pruebas;
   - corrige los errores;
   - actualiza la documentación;
   - presenta un resumen de cambios;
   - espera aprobación antes de iniciar una etapa grande nueva.

No borres código funcional ni realices reestructuraciones masivas sin explicar el motivo. No reemplaces archivos completos cuando baste con cambios pequeños.

---

## 2. Skills o responsabilidades que debes aplicar

Trabaja como si tuvieras los siguientes especialistas. Usa cada responsabilidad en el momento adecuado:

### Analista funcional
Convierte los requisitos del negocio de construcción en módulos, reglas, flujos, historias de usuario y criterios de aceptación.

### Arquitecto de software
Mantiene una arquitectura monolítica modular, límites claros entre módulos, dependencias controladas, seguridad, escalabilidad y mantenibilidad.

### Diseñador de base de datos
Diseña el modelo relacional en MySQL, claves foráneas, índices, restricciones, transacciones, auditoría y migraciones seguras.

### Especialista frontend y experiencia de usuario
Construye interfaces responsive y accesibles, optimizadas para escritorio, tableta y teléfono, con formularios simples para personal de obra.

### Especialista backend
Implementa reglas de negocio, validaciones, permisos, transacciones, servicios, APIs internas, generación de reportes y almacenamiento de archivos.

### Especialista PWA y trabajo sin conexión
Implementa instalación, service worker, IndexedDB, cola de sincronización, reintentos, idempotencia y estados de conectividad.

### Especialista en reportes y PDF
Construye una única plantilla HTML/CSS para la vista previa en tiempo real y para el PDF, de modo que ambos resultados sean visualmente equivalentes.

### Especialista de seguridad
Implementa autenticación, autorización por permisos, protección de enlaces compartidos, validación de archivos, auditoría y medidas OWASP.

### Especialista de calidad
Crea pruebas unitarias, integración, end-to-end, datos de prueba, validación de cálculos y comprobaciones de regresión visual para los PDF.

### Especialista DevOps y documentación
Prepara Docker, variables de entorno, almacenamiento, copias de seguridad, despliegue, observabilidad y documentación de instalación.

---

## 3. Contexto del producto

El sistema pertenece a una constructora y será de uso interno. El cliente final no tendrá una cuenta dentro del sistema.

El personal autorizado podrá generar un enlace privado de solo lectura para que el cliente consulte únicamente la información aprobada de su proyecto, como avances, presupuesto autorizado, informes, fotografías, videos, documentos, planos, contratos y datos financieros permitidos.

El sistema debe funcionar como PWA porque parte del personal trabajará directamente en las obras y deberá registrar avances desde teléfonos o tabletas, incluso cuando la conexión sea inestable.

---

## 4. Decisión de arquitectura

Usa una aplicación full-stack con Next.js y TypeScript.

Aclaración importante:

- React será la tecnología de la interfaz.
- Next.js utilizará React en el frontend.
- El backend se implementará dentro de Next.js mediante Route Handlers, Server Actions y servicios del dominio.
- No crees una aplicación React separada con Vite y otro proyecto Next.js solo como API, salvo que exista una razón técnica documentada y aprobada.

La arquitectura será un monolito modular. No uses microservicios en la primera versión.

### Stack base

- Next.js con App Router.
- React.
- TypeScript estricto.
- MySQL.
- Prisma ORM.
- Tailwind CSS.
- shadcn/ui o componentes accesibles equivalentes.
- Zod para validación.
- React Hook Form para formularios.
- TanStack Table para tablas editables.
- Una solución PWA mantenida y compatible con la versión seleccionada de Next.js.
- IndexedDB mediante una librería estable como Dexie para datos sin conexión.
- Almacenamiento de archivos compatible con S3.
- MinIO en desarrollo local.
- S3, Cloudflare R2 o equivalente en producción.
- No guardar videos, fotos, planos ni documentos binarios dentro de MySQL.
- Vitest o Jest para pruebas unitarias.
- Playwright para pruebas end-to-end y, cuando corresponda, generación o validación de PDF.
- Docker Compose para desarrollo local.

Antes de instalar dependencias, verifica compatibilidad entre versiones y utiliza versiones estables.

---

## 5. Estructura modular esperada

Organiza el código por módulos del negocio, no solamente por tipo de archivo.

Estructura orientativa:

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
docs/
tests/
```

Cada módulo puede contener, cuando sea necesario:

```text
domain/
application/
infrastructure/
ui/
```

No agregues capas vacías. Usa abstracciones solamente cuando aporten claridad, pruebas o desacoplamiento.

---

## 6. Archivos de referencia obligatorios

Busca estos documentos dentro de `docs/references/`:

- `PRESUPUESTO FASE 2 SHUSHU.pdf`
- `CRONOGRAMA TENTATIVO ACTIVIDADES SHUSHU.pdf`
- `ESTADOS DE CUENTA.pdf`

Debes inspeccionarlos antes de construir sus módulos.

Los documentos contienen formatos reales que deben convertirse en formularios web y reportes PDF:

1. Presupuesto organizado por renglones, materiales, mano de obra, subtotales y resumen general.
2. Cronograma tipo Gantt con actividades distribuidas por días y semanas.
3. Estado de cuenta con gastos, empresas, cantidades, unidades, facturas o recibos, abonos, saldos y resumen financiero.

No diseñes esos reportes basándote únicamente en una interpretación general. Respeta la terminología, estructura, columnas, secciones, colores, bordes, subtotales, totales y saltos de página de los documentos.

Si los PDF no están en el repositorio, detente antes de implementar las plantillas exactas y solicita que se agreguen. Mientras no estén disponibles, puedes construir únicamente la estructura funcional genérica.

---

## 7. Módulos funcionales

### 7.1 Autenticación, usuarios, roles y permisos

El sistema será interno.

Roles iniciales:

- superadministrador;
- administrador;
- gerente de proyecto;
- supervisor o encargado de obra;
- contabilidad;
- compras;
- bodega;
- contratista o subcontratista interno;
- usuario de consulta.

No crear un rol de cliente.

Implementa permisos granulares, por ejemplo:

- proyectos.ver;
- proyectos.crear;
- proyectos.editar;
- presupuesto.ver;
- presupuesto.editar;
- presupuesto.aprobar;
- avance.crear;
- avance.revisar;
- avance.aprobar;
- avance.publicar;
- inventario.mover;
- requerimiento.aprobar;
- finanzas.ver;
- finanzas.registrar;
- documentos.compartir;
- portal.gestionar;
- usuarios.gestionar.

Toda acción sensible debe quedar registrada en una bitácora de auditoría.

### 7.2 Proyectos

Cada proyecto tendrá:

- identificador interno;
- número o código de proyecto;
- nombre;
- descripción;
- cliente como registro informativo;
- ubicación;
- fecha de inicio;
- fecha prevista de finalización;
- fecha real de finalización;
- responsable;
- estado;
- moneda, inicialmente GTQ;
- presupuesto base;
- porcentaje de avance;
- observaciones;
- integrantes internos;
- configuración del portal compartido.

Estados sugeridos:

- borrador;
- planificación;
- activo;
- pausado;
- finalizado;
- cancelado.

### 7.3 Dashboard

Mostrar por proyecto y globalmente:

- proyectos activos;
- presupuesto inicial;
- presupuesto modificado;
- presupuesto ejecutado;
- saldo disponible;
- total abonado por el cliente;
- total gastado;
- avance físico planificado;
- avance físico real;
- actividades terminadas;
- actividades en proceso;
- actividades atrasadas;
- actividades pendientes;
- cantidad de personas trabajando;
- materiales con existencia baja;
- requerimientos pendientes;
- informes pendientes de aprobación;
- notificaciones y alertas.

Usar tarjetas, barras, porcentajes y gráficas. No calcular métricas directamente en componentes visuales; centralizar las fórmulas en servicios probados.

### 7.4 Presupuesto con experiencia similar a Excel

El presupuesto debe editarse en una tabla web similar a una hoja de cálculo, sin depender de componentes comerciales.

Debe permitir:

- crear secciones;
- crear renglones;
- insertar filas;
- duplicar filas;
- reordenar;
- copiar y pegar valores;
- edición por teclado;
- validación inmediata;
- cálculo automático;
- guardado seguro;
- versiones;
- historial de cambios;
- aprobación;
- exportación a PDF.

Cada renglón puede incluir:

- materiales;
- mano de obra;
- equipo;
- subcontratos;
- otros costos.

Campos principales:

- número;
- tipo;
- descripción;
- cantidad;
- unidad;
- días;
- personas;
- precio unitario;
- subtotal;
- observaciones.

Reglas iniciales:

```text
subtotal_material = cantidad × precio_unitario
subtotal_mano_obra = personas × días × precio_unitario
total_renglón = materiales + mano_de_obra + equipo + subcontratos + otros
subtotal_presupuesto = suma de renglones
imprevistos = subtotal × porcentaje configurado
supervisión_administración = subtotal_correspondiente × porcentaje configurado
total_general = suma de todos los componentes
```

No redondear internamente de forma prematura. Usar Decimal de Prisma y funciones monetarias seguras.

Mantener:

- presupuesto inicial;
- presupuesto vigente;
- revisiones;
- órdenes de cambio;
- trabajos adicionales;
- cantidades modificadas;
- diferencia entre presupuestado y ejecutado.

### 7.5 Cronograma y diagrama de Gantt

Cada actividad tendrá:

- proyecto;
- renglón de presupuesto relacionado;
- nombre;
- descripción;
- responsable;
- fecha de inicio planificada;
- fecha final planificada;
- fecha de inicio real;
- fecha final real;
- duración;
- porcentaje de avance;
- estado;
- prioridad;
- cantidad de trabajadores;
- costo planificado;
- costo ejecutado;
- dependencias;
- motivos de retraso.

El Gantt debe mostrar:

- días, semanas y meses;
- barras planificadas;
- barras reales;
- dependencias;
- avance dentro de la barra;
- actividades atrasadas;
- ruta crítica en una etapa posterior;
- zoom temporal;
- filtros.

El PDF del cronograma debe conservar un diseño equivalente al documento de referencia.

### 7.6 Avance diario y bitácora de obra

Debe ser uno de los módulos principales de la PWA.

Flujo:

```text
borrador → enviado → revisado → aprobado → publicado
```

Formulario:

#### Datos generales

- proyecto;
- fecha;
- número de informe;
- encargado;
- ubicación;
- jornada;
- hora de inicio;
- hora de finalización;
- clima;
- observaciones generales.

#### Actividades ejecutadas

- renglón;
- actividad;
- descripción del trabajo;
- unidad;
- cantidad contratada;
- cantidad ejecutada anteriormente;
- cantidad ejecutada hoy;
- cantidad acumulada;
- porcentaje anterior;
- porcentaje nuevo;
- estado;
- problemas o atrasos.

Fórmula principal:

```text
porcentaje_actividad =
cantidad_acumulada_ejecutada / cantidad_planificada × 100
```

Validar que el porcentaje no sea menor que el avance previamente aprobado ni supere 100 %, salvo una orden de cambio aprobada.

#### Personal

- trabajador o cuadrilla;
- puesto;
- cantidad de personas;
- horas o días;
- tarifa;
- monto;
- observaciones.

Permitir registro individual o por cuadrilla.

#### Materiales usados

- material;
- bodega;
- cantidad utilizada;
- unidad;
- desperdicio;
- devolución;
- actividad;
- observaciones.

Al aprobar el reporte, crear movimientos de inventario idempotentes y trazables. No permitir descuentos dobles si la sincronización se repite.

#### Evidencia

- fotos;
- videos;
- tipo: antes, durante o después;
- descripción;
- actividad;
- fecha;
- orden de aparición;
- visibilidad interna o compartible.

### 7.7 Informe en tiempo real y PDF

Mientras el usuario completa el formulario de avance, mostrar una vista previa del informe en tiempo real.

La misma fuente de datos debe alimentar:

- vista previa HTML;
- versión imprimible;
- PDF final;
- portal compartido.

Evita mantener cuatro plantillas distintas.

El informe debe contener:

- logotipo;
- número de proyecto;
- nombre del proyecto;
- número de informe;
- fecha;
- responsable;
- resumen;
- tabla de actividades;
- avance anterior;
- avance actual;
- personal;
- materiales;
- incidentes;
- observaciones;
- fotografías con descripción;
- firmas o aprobaciones;
- código o identificador de verificación;
- número de versión.

Una vez aprobado, no modificar directamente el informe. Una corrección debe generar una nueva versión o una fe de erratas trazable.

### 7.8 PWA y funcionamiento sin conexión

La aplicación debe poder instalarse.

Implementar:

- manifest;
- iconos;
- service worker;
- caché del shell;
- página offline;
- detección de conexión;
- IndexedDB;
- borradores locales;
- cola de sincronización;
- reintentos;
- estado “pendiente de sincronización”;
- botón “Sincronizar ahora”;
- identificadores UUID generados en cliente;
- claves de idempotencia;
- resolución de conflictos;
- registro de errores de sincronización.

El personal debe poder:

1. abrir proyectos sincronizados;
2. crear informes sin internet;
3. registrar actividades;
4. registrar materiales;
5. tomar o seleccionar fotografías;
6. guardar borradores;
7. sincronizar cuando regrese la conexión.

Los videos grandes pueden permanecer en cola y subirse únicamente con conexión suficiente.

No prometas funcionamiento offline para acciones que requieran datos no sincronizados previamente.

### 7.9 Inventario y bodegas

Permitir:

- catálogo de materiales;
- unidades de medida;
- bodegas;
- existencias;
- entradas;
- salidas;
- transferencias;
- ajustes;
- devoluciones;
- desperdicios;
- herramientas;
- equipo;
- reservas para actividades;
- historial de movimientos;
- kardex.

Cada movimiento debe relacionarse, cuando corresponda, con:

- proyecto;
- actividad;
- requerimiento;
- compra;
- informe diario;
- usuario.

Usar transacciones para movimientos de inventario.

### 7.10 Requerimientos y compras

Flujo:

```text
borrador → solicitado → revisado → aprobado → comprado → recibido → entregado → cerrado
```

Tipos:

- materiales;
- herramientas;
- equipo;
- personal;
- servicio;
- subcontrato.

Debe incluir:

- solicitante;
- proyecto;
- actividad;
- prioridad;
- fecha requerida;
- artículos;
- cantidades;
- justificación;
- aprobaciones;
- proveedor;
- evidencia;
- estado.

### 7.11 Finanzas y estado de cuenta

Registrar:

#### Gastos

- fecha;
- descripción;
- empresa o proveedor;
- cantidad;
- unidad;
- subtotal;
- tipo;
- fase;
- renglón;
- actividad;
- número de factura o recibo;
- archivo;
- medio de pago;
- usuario.

#### Abonos del cliente

- número de abono;
- fecha;
- cantidad;
- medio;
- referencia;
- comprobante;
- observaciones.

Cálculos:

```text
saldo_disponible = total_abonado - total_gastado
total_invertido = gastos válidos + ajustes aprobados
diferencia_presupuesto = presupuesto_vigente - total_invertido
```

El estado de cuenta deberá reflejar las estructuras de los PDF de referencia y soportar fases, resumen financiero y notas.

No permitir que un usuario sin permiso financiero vea información sensible.

### 7.12 Documentos, contratos, planos, fotos y videos

Crear un repositorio por proyecto con:

- categorías;
- etiquetas;
- metadatos;
- versiones;
- historial;
- permisos;
- estado de aprobación;
- visibilidad en portal;
- fecha;
- autor;
- checksum;
- almacenamiento externo.

Categorías:

- contratos;
- subcontratos;
- presupuestos;
- estados de cuenta;
- facturas;
- recibos;
- planos;
- licencias;
- informes;
- fotografías;
- videos;
- requerimientos;
- actas;
- comprobantes.

Validar extensión, MIME real, tamaño y nombre. No confiar únicamente en la extensión proporcionada por el navegador.

### 7.13 Portal privado para el cliente

El cliente no inicia sesión en el sistema.

Un usuario interno autorizado puede generar un enlace privado de solo lectura.

El enlace debe permitir:

- activación;
- desactivación;
- vencimiento;
- regeneración;
- PIN opcional;
- selección de información visible;
- selección de documentos;
- permitir o impedir descarga;
- registro de accesos;
- revocación inmediata.

No guardar el token plano en la base de datos. Guardar un hash seguro y mostrar el enlace completo únicamente al crearlo o regenerarlo.

El portal puede mostrar, solo si fue aprobado:

- datos generales;
- avance;
- cronograma;
- presupuesto para cliente;
- abonos;
- saldo autorizado;
- informes;
- fotos;
- videos;
- documentos;
- contratos;
- planos.

Nunca mostrar:

- salarios;
- costos internos no autorizados;
- ganancias;
- proveedores confidenciales;
- notas internas;
- inventario global;
- auditoría;
- otros proyectos;
- borradores;
- información sin aprobar.

### 7.14 Notificaciones y avisos

Crear avisos internos para:

- actividad atrasada;
- actividad próxima a vencer;
- avance pendiente de aprobación;
- material con existencia baja;
- requerimiento pendiente;
- documento próximo a vencer;
- contrato próximo a vencer;
- saldo insuficiente;
- gasto sin comprobante;
- error de sincronización;
- enlace compartido próximo a vencer.

Primera versión:

- centro de notificaciones dentro del sistema;
- indicadores de no leídos;
- preferencias por usuario.

Correo y WhatsApp pueden implementarse después mediante adaptadores.

### 7.15 Informes

Reportes mínimos:

- presupuesto;
- cronograma;
- avance diario;
- avance acumulado;
- personal por actividad;
- consumo de materiales;
- kardex;
- requerimientos;
- gastos;
- abonos;
- estado de cuenta;
- comparación presupuestado contra ejecutado;
- documentos del proyecto;
- resumen ejecutivo.

Todos deben permitir filtros, vista previa, PDF y control de acceso.

---

## 8. Modelo de datos inicial

Diseña un esquema normalizado. Como mínimo considera estas entidades:

```text
User
Role
Permission
UserRole
RolePermission
AuditLog

Client
Project
ProjectMember

Budget
BudgetVersion
BudgetSection
BudgetItem
BudgetChangeOrder

Schedule
Activity
ActivityDependency
ActivityAssignment

DailyReport
DailyReportActivity
DailyReportLabor
DailyReportMaterial
DailyReportMedia
DailyReportVersion
Approval

Worker
Crew

UnitOfMeasure
Material
Warehouse
Stock
StockMovement

Requisition
RequisitionItem
RequisitionApproval
Supplier
Purchase

Expense
ClientDeposit
FinancialAdjustment

Document
DocumentVersion
DocumentCategory
Contract
Plan
MediaAsset

ShareLink
ShareLinkPermission
ShareLinkAccessLog

Notification
NotificationPreference

SyncOperation
```

Requisitos del esquema:

- UUID o identificadores seguros.
- `createdAt`, `updatedAt`.
- `createdBy`, `updatedBy` cuando aplique.
- borrado lógico solo donde sea necesario.
- índices para proyecto, fecha, estado y claves foráneas.
- restricciones únicas.
- Decimal para dinero y cantidades.
- zona horaria consistente.
- auditoría de acciones sensibles.
- transacciones para operaciones financieras y de inventario.

Antes de generar todas las migraciones, entrega un diagrama ER o documento equivalente para revisión.

---

## 9. Reglas de seguridad

Aplicar:

- sesiones seguras;
- contraseñas con algoritmo robusto;
- protección CSRF donde aplique;
- validación de entrada;
- autorización en servidor;
- rate limiting en autenticación y portal;
- encabezados de seguridad;
- validación MIME;
- límites de tamaño;
- URLs firmadas para archivos;
- tokens compartidos con suficiente entropía;
- hash del token en base de datos;
- registros de auditoría;
- no exponer secretos al cliente;
- no confiar en permisos ocultos solamente en la interfaz;
- consultas filtradas siempre por proyecto y permiso;
- protección contra acceso directo a objetos de otro proyecto;
- copias de seguridad;
- rotación de secretos.

Cualquier acción financiera, aprobación, publicación o movimiento de inventario debe verificarse en el servidor.

---

## 10. Experiencia de usuario

La aplicación debe ser:

- responsive;
- usable con una mano desde un teléfono;
- accesible;
- clara para usuarios no técnicos;
- rápida;
- consistente.

Para formularios móviles:

- botones grandes;
- guardado automático de borradores;
- campos agrupados por pasos;
- indicadores de progreso;
- mensajes claros;
- confirmaciones antes de acciones sensibles;
- estado de conexión visible;
- estado de sincronización visible.

Para escritorio:

- menú lateral;
- dashboard;
- tablas;
- filtros;
- paneles;
- vista previa de informes.

No copies literalmente el diseño publicitario de referencia. Úsalo como guía de módulos y jerarquía, manteniendo una identidad visual propia de la constructora.

---

## 11. Generación de PDF

La vista HTML y el PDF deben usar la misma plantilla y datos.

Proceso recomendado:

```text
datos validados
→ modelo de reporte
→ plantilla HTML/CSS
→ vista previa
→ renderizado PDF
→ almacenamiento
→ versión
→ publicación opcional
```

Requisitos:

- tamaño Carta y orientación configurable;
- márgenes definidos;
- encabezados y pies;
- numeración de páginas;
- saltos de página controlados;
- repetición de encabezados de tabla;
- moneda GTQ;
- tablas sin cortes ilegibles;
- imágenes optimizadas;
- versión del documento;
- fecha de generación;
- usuario generador;
- hash o código de verificación.

Construye pruebas de regresión visual o capturas comparativas para asegurar que el PDF no cambie accidentalmente.

---

## 12. API y servicios

Aunque sea una aplicación monolítica, separa la lógica de negocio de la interfaz.

Usa servicios o casos de uso para:

- crear presupuesto;
- recalcular presupuesto;
- aprobar presupuesto;
- registrar avance;
- aprobar avance;
- publicar avance;
- consumir inventario;
- registrar gasto;
- registrar abono;
- calcular estado de cuenta;
- generar PDF;
- crear enlace compartido;
- revocar enlace;
- sincronizar operación offline.

Las operaciones provenientes de la PWA deben ser idempotentes.

Formato de respuesta de API consistente:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

Para errores:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mensaje entendible",
    "fields": {}
  }
}
```

No expongas trazas internas en producción.

---

## 13. Pruebas obligatorias

### Unitarias

- cálculos de presupuesto;
- porcentajes;
- acumulados;
- saldos;
- montos por avance;
- validación de estados;
- permisos;
- idempotencia.

### Integración

- aprobación de informe;
- descuento de inventario;
- registro financiero;
- creación de versiones;
- publicación al portal;
- revocación de enlaces;
- sincronización offline.

### End-to-end

- inicio de sesión;
- crear proyecto;
- crear presupuesto;
- registrar avance;
- adjuntar evidencia;
- aprobar informe;
- generar PDF;
- publicar;
- abrir portal;
- verificar restricción de información;
- crear requerimiento;
- mover inventario;
- registrar gasto y abono.

### Seguridad

- usuario sin permiso;
- acceso a proyecto ajeno;
- token vencido;
- PIN incorrecto;
- carga de archivo inválido;
- repetición de una operación offline;
- manipulación de identificadores.

---

## 14. Etapas de desarrollo

No avances a la siguiente etapa sin completar los criterios de aceptación de la actual.

### Etapa 0 — Descubrimiento y diseño

Entregables:

- revisión del repositorio;
- inventario de skills;
- requisitos consolidados;
- decisiones de arquitectura;
- mapa de módulos;
- diagrama de flujos;
- modelo ER preliminar;
- matriz de roles y permisos;
- backlog priorizado;
- riesgos;
- plan de pruebas;
- estructura de carpetas;
- ADR de monolito modular;
- ADR de PWA y sincronización;
- ADR de generación de PDF.

No implementar todavía todos los módulos.

### Etapa 1 — Fundación técnica

Entregables:

- proyecto Next.js;
- TypeScript estricto;
- MySQL;
- Prisma;
- Docker Compose;
- variables de entorno;
- lint;
- formato;
- pruebas;
- manejo global de errores;
- logging;
- componentes base;
- layout interno;
- autenticación;
- roles;
- permisos;
- auditoría básica.

Criterio de aceptación:

- un usuario puede iniciar sesión;
- el servidor aplica permisos;
- las pruebas pasan;
- el entorno puede levantarse con instrucciones documentadas.

### Etapa 2 — Proyectos y dashboard inicial

Entregables:

- CRUD de proyectos;
- integrantes;
- estados;
- datos del cliente como registro;
- dashboard básico;
- filtros;
- auditoría.

Criterio:

- crear, editar, consultar y cambiar el estado de un proyecto según permisos.

### Etapa 3 — Presupuesto

Entregables:

- versiones;
- secciones;
- renglones;
- tabla editable;
- cálculos;
- aprobación;
- historial;
- vista previa;
- PDF equivalente al documento de referencia.

Criterio:

- reproducir un presupuesto real del PDF con cálculos correctos y formato de salida validado.

### Etapa 4 — Cronograma y Gantt

Entregables:

- actividades;
- dependencias;
- fechas;
- responsables;
- porcentajes;
- vista Gantt;
- PDF.

Criterio:

- reproducir el cronograma de referencia y actualizar barras según fechas y avance.

### Etapa 5 — Avance diario, informes y PWA

Entregables:

- formulario móvil;
- actividades;
- personal;
- materiales;
- evidencia;
- vista previa en tiempo real;
- flujo de aprobación;
- PDF;
- PWA instalable;
- borradores offline;
- cola de sincronización;
- idempotencia.

Criterio:

- registrar un informe sin conexión, recuperar internet, sincronizar una sola vez, aprobarlo y generar su PDF.

### Etapa 6 — Inventario y requerimientos

Entregables:

- materiales;
- bodegas;
- existencias;
- kardex;
- movimientos;
- requerimientos;
- aprobaciones;
- relación con informes.

Criterio:

- aprobar un informe y descontar materiales correctamente sin duplicación.

### Etapa 7 — Finanzas y estado de cuenta

Entregables:

- gastos;
- abonos;
- comprobantes;
- fases;
- saldos;
- resumen;
- PDF equivalente al documento de referencia.

Criterio:

- reproducir los cálculos de un estado de cuenta de referencia y explicar cualquier diferencia.

### Etapa 8 — Documentos, contratos, planos y multimedia

Entregables:

- almacenamiento S3;
- versiones;
- categorías;
- permisos;
- fotos;
- videos;
- planos;
- contratos;
- validaciones;
- URLs firmadas.

### Etapa 9 — Portal privado del cliente

Entregables:

- enlaces privados;
- expiración;
- PIN;
- visibilidad;
- descarga configurable;
- auditoría;
- portal responsive;
- publicación de avances aprobados.

Criterio:

- el portal muestra únicamente los datos autorizados y no permite descubrir otros proyectos.

### Etapa 10 — Notificaciones, endurecimiento y despliegue

Entregables:

- avisos internos;
- optimización;
- seguridad;
- pruebas de carga razonables;
- copias de seguridad;
- observabilidad;
- Docker de producción;
- guía de despliegue;
- manual técnico;
- manual de usuario;
- plan de mantenimiento.

---

## 15. Convenciones de desarrollo

- TypeScript estricto.
- No usar `any` salvo justificación.
- Nombres de código en inglés.
- Textos de interfaz en español.
- Componentes pequeños.
- Servicios probados.
- Validación compartida cliente-servidor, sin confiar solo en cliente.
- Fechas y moneda mediante utilidades centrales.
- No duplicar fórmulas.
- No colocar reglas de negocio dentro de componentes React.
- No hacer consultas Prisma directamente desde componentes cliente.
- No registrar secretos ni datos sensibles en logs.
- Commits pequeños y descriptivos.
- Documentar decisiones importantes en `docs/adr/`.

---

## 16. Datos semilla

Crea datos de prueba realistas, sin incluir información privada real:

- usuarios por rol;
- un proyecto de remodelación;
- presupuesto con varios renglones;
- cronograma;
- actividades;
- trabajadores y cuadrillas ficticias;
- materiales;
- bodegas;
- gastos;
- abonos;
- informe diario;
- fotografías de marcador o archivos de ejemplo;
- enlace compartido de desarrollo.

---

## 17. Definición de terminado

Una funcionalidad está terminada únicamente cuando:

- cumple criterios de aceptación;
- aplica permisos en servidor;
- valida entradas;
- incluye manejo de errores;
- tiene pruebas;
- funciona en móvil;
- considera conectividad inestable si aplica;
- registra auditoría si es sensible;
- actualiza documentación;
- no rompe módulos existentes;
- pasa lint, tipos y pruebas;
- incluye migración reversible o estrategia segura;
- tiene instrucciones de uso.

---

## 18. Primera respuesta que debes entregar

No comiences generando toda la aplicación.

Tu primera respuesta debe contener:

1. Resumen de lo comprendido.
2. Confirmación de que Next.js será full-stack y React la interfaz.
3. Skills disponibles encontradas en el entorno y cómo se usarán.
4. Archivos de referencia localizados.
5. Preguntas que realmente bloquean el trabajo.
6. Propuesta de arquitectura.
7. Mapa de módulos.
8. Modelo de datos preliminar.
9. Etapas de desarrollo.
10. Riesgos principales.
11. Plan exacto para la Etapa 0.
12. Lista de archivos que crearás en la Etapa 0.

Después, espera mi aprobación antes de implementar la Etapa 1.

---

## 19. Restricciones finales

- No crear microservicios.
- No crear un usuario cliente.
- No exponer el sistema interno mediante el enlace compartido.
- No guardar archivos grandes en MySQL.
- No generar PDF con una plantilla distinta a la vista previa.
- No descontar inventario antes de la aprobación configurada.
- No publicar borradores.
- No confiar en controles visuales para seguridad.
- No usar dependencias comerciales sin autorización.
- No construir todos los módulos en una sola iteración.
- No modificar requisitos silenciosamente.
- No inventar formatos cuando los PDF de referencia no estén disponibles.

Comienza ahora con la Etapa 0 y entrega únicamente el análisis, diseño y planificación solicitados en la sección “Primera respuesta que debes entregar”.
