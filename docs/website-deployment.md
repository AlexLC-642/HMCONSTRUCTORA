# Publicación del sitio web

El sitio público y la vista previa de Sitio web comparten los mismos componentes.
Los registros activos de WebsiteService y WebsiteProjectPhoto son la fuente de contenido;
no se introducen registros de respaldo al leer una página.

## Despliegue

- Compilar con `npm run build`: `prebuild` genera Prisma Client.
- Iniciar con `npm run start`: `prestart` ejecuta `prisma migrate deploy` antes de levantar Next.js.
- En Railway, el comando de inicio debe ser `npm run start`, no `next start` directamente.
- La migración `20260926210000_restore_empty_website_catalog` carga el catálogo original
  únicamente en las colecciones vacías. No modifica las colecciones con registros.
- La migración `20260926211000_persist_website_images` añade almacenamiento de imágenes
  en la base de datos. Las nuevas subidas directas de Sitio web usan este almacenamiento.
  Las fotos antiguas y las reutilizadas desde evidencias conservan sus rutas anteriores.
- Si producción no tiene un historial válido de migraciones, revisar el estado y establecer
  la línea base correspondiente antes de desplegar; no usar `migrate reset` ni borrar datos.

## Verificación

Consultar `/`, `/servicios`, `/proyectos` y `/contacto`. El catálogo inicial contiene
10 servicios y 9 fotos, agrupadas en 8 álbumes por título. Ocultar o eliminar contenido
posteriormente desde el editor debe respetarse, sin regenerar registros automáticamente.

Las rutas de fotos persistentes son `/api/website/photos/[id]`. Las fotos inactivas
solo pueden consultarse con permiso `sitio.editar`; no se guardan en caché pública.
La vista previa permite elegir página y dispositivo. No guarda cambios ni envía formularios.
