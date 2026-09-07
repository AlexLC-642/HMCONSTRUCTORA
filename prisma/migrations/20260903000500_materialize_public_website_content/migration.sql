-- Turn the public starter content into real, editable CMS records. This runs
-- only when each collection is empty, so existing custom content is preserved.
INSERT INTO `WebsiteService` (`id`, `title`, `description`, `icon`, `position`, `active`, `createdAt`, `updatedAt`)
SELECT * FROM (
  SELECT 'base-service-1' AS `id`, 'Diseños arquitectónicos' AS `title`, 'Creamos propuestas arquitectónicas innovadoras y personalizadas, adaptadas a tus necesidades y al entorno del proyecto.' AS `description`, 'Compass' AS `icon`, 0 AS `position`, true AS `active`, NOW(3) AS `createdAt`, NOW(3) AS `updatedAt` UNION ALL
  SELECT 'base-service-2', 'Elaboración de archivos Master Plan', 'Desarrollamos planes detallados que integran el diseño urbano, distribución y crecimiento ordenado de proyectos.', 'Map', 1, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-service-3', 'Planificación y presupuestos', 'Analizamos tiempos, recursos y costos para construir con una inversión clara y controlada.', 'FileText', 2, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-service-4', 'Elaboración de planos', 'Diseñamos planos constructivos listos para su uso en obra y trámites municipales.', 'Building2', 3, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-service-5', 'Recorridos virtuales 3D y renders', 'Presentamos visualizaciones realistas para explorar los espacios antes de construir.', 'MonitorSmartphone', 4, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-service-6', 'Ejecución de obras', 'Construimos con materiales de calidad, personal capacitado y supervisión constante.', 'HardHat', 5, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-service-7', 'Remodelaciones', 'Transformamos espacios existentes en ambientes modernos, funcionales y atractivos.', 'Wrench', 6, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-service-8', 'Asesorías e inspección', 'Acompañamiento técnico e inspecciones para asegurar el cumplimiento de normas.', 'Eye', 7, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-service-9', 'Instalaciones eléctricas', 'Diseñamos e instalamos sistemas eléctricos para cada tipo de construcción o remodelación.', 'Lightbulb', 8, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-service-10', 'Tablayeso y cielo falso', 'Soluciones para muros, divisiones y cielos falsos con acabados modernos y funcionales.', 'Hammer', 9, true, NOW(3), NOW(3)
) AS starter
WHERE NOT EXISTS (SELECT 1 FROM `WebsiteService` LIMIT 1);

INSERT INTO `WebsiteProjectPhoto` (`id`, `title`, `imageUrl`, `altText`, `position`, `active`, `createdAt`, `updatedAt`)
SELECT * FROM (
  SELECT 'base-photo-1' AS `id`, 'Remodelación de cocina' AS `title`, '/site/images/proyecto1.jpg' AS `imageUrl`, 'Remodelación de cocina' AS `altText`, 0 AS `position`, true AS `active`, NOW(3) AS `createdAt`, NOW(3) AS `updatedAt` UNION ALL
  SELECT 'base-photo-2', 'Levantamiento de muro perimetral', '/site/images/proyecto2.jpg', 'Levantamiento de muro perimetral', 1, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-photo-3', 'Construcción de muro perimetral exterior', '/site/images/proyecto3.jpg', 'Construcción de muro perimetral exterior', 2, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-photo-4', 'Planos de fachadas y distribución', '/site/images/proyecto4.jpg', 'Planos de fachadas y distribución', 3, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-photo-5', 'Construcción', '/site/images/Rd.png', 'Construcción', 4, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-photo-6', 'Diseño 3D', '/site/images/Rd1.png', 'Diseño 3D', 5, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-photo-7', 'Movimiento de tierra', '/site/images/Rd3.jpg', 'Movimiento de tierra', 6, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-photo-8', 'Movimiento de tierra', '/site/images/Rd4.jpg', 'Movimiento de tierra', 7, true, NOW(3), NOW(3) UNION ALL
  SELECT 'base-photo-9', 'Remodelación de cielo falso', '/site/images/Rd5.jpg', 'Remodelación de cielo falso', 8, true, NOW(3), NOW(3)
) AS starter
WHERE NOT EXISTS (SELECT 1 FROM `WebsiteProjectPhoto` LIMIT 1);
