# Etapa 8 - Documentos, contratos, planos y multimedia

## Alcance implementado

- Repositorio documental por proyecto en `/projects/[id]/documents`.
- Biblioteca general de documentos en `/documents`.
- Categorias base: contratos, subcontratos, presupuestos, estados de cuenta, facturas, recibos, planos, licencias, informes, fotografias, videos, requerimientos, actas y comprobantes.
- Metadatos por documento: titulo, descripcion, etiquetas, categoria, estado, visibilidad en portal, autor, aprobador y fechas.
- Versiones por documento con version consecutiva, archivo original, MIME detectado, tamano, ruta de almacenamiento, URL publica local y checksum SHA-256.
- Flujo de revision: borrador, en revision, aprobado y archivado.
- Visibilidad en portal solo permitida cuando el documento esta aprobado.
- Acceso desde el detalle del proyecto y desde el menu lateral.

## Almacenamiento

Los binarios no se guardan en MySQL. En desarrollo se guardan en `public/uploads/documents/{projectId}/{documentId}` y la base conserva solo metadatos. La estructura ya incluye `storageKey`, `publicUrl` y `checksum`, por lo que el siguiente paso para produccion es reemplazar el adaptador local por S3/R2 y emitir URLs firmadas.

## Validaciones actuales

- Limite por archivo: 80 MB.
- Extensiones permitidas: PDF, PNG, JPG, WEBP, MP4, MOV, DOCX, XLSX, PPTX, DWG y DXF.
- Validacion basica del contenido real mediante firma del archivo; no se confia solo en la extension del navegador.
- Hash SHA-256 por version para trazabilidad.

## Pendiente para endurecimiento

- Adaptador S3/R2 real con credenciales de entorno.
- URLs firmadas con vencimiento.
- Permisos finos `documentos.ver`, `documentos.cargar`, `documentos.aprobar` y `documentos.descargar` si se separa de permisos de proyecto.
- Previsualizacion enriquecida por tipo de archivo.
- Asociar documentos automaticamente desde finanzas, requerimientos e informes cuando esos modulos adjunten comprobantes.