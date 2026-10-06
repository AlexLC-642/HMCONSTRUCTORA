/**
 * URL autenticada de una evidencia del informe diario. Las fotos se guardan en
 * public/uploads, pero Next.js en producción solo sirve los archivos de public/
 * que existían al compilar: una evidencia subida después nunca cargaba con su
 * `publicUrl`. Esta ruta la lee del disco y valida sesión y proyecto.
 */
export function progressMediaUrl(mediaId: string) {
	return `/api/progress/media/${mediaId}/file`;
}
