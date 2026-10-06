import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Dónde viven los archivos subidos (documentos, facturas, evidencias).
 *
 * En Railway el disco del contenedor se borra en cada despliegue: lo subido
 * solo sobrevive en un volumen. Si el servicio tiene un volumen, Railway
 * expone su ruta en RAILWAY_VOLUME_MOUNT_PATH y se usa automáticamente.
 * UPLOADS_DIR permite fijar otra ruta. Sin ninguna de las dos (desarrollo
 * local) se sigue usando public/, como antes.
 *
 * Los archivos nunca se sirven como estáticos: Next.js solo sirve los de
 * public/ que existían al compilar. Siempre pasan por una ruta que valida
 * acceso y los lee con readStoredFile().
 */
const legacyRoot = () => path.join(process.cwd(), "public");

function configuredDir() {
	return (
		process.env.UPLOADS_DIR?.trim() ||
		process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() ||
		""
	);
}

/**
 * Los storageKey empiezan con "uploads/". Si el volumen está montado justo en
 * esa carpeta (p. ej. /app/public/uploads, como en producción), la raíz es su
 * carpeta padre; si no, los archivos nuevos irían a .../uploads/uploads/.
 */
function rootFor(dir: string) {
	const clean = dir.replace(/[/]+$/, "");
	return path.basename(clean) === "uploads" ? path.dirname(clean) : clean;
}

export function uploadsRoot() {
	const dir = configuredDir();
	return dir ? rootFor(dir) : legacyRoot();
}

/** true si lo subido sobrevive a un nuevo despliegue (hay volumen o UPLOADS_DIR). */
export function uploadsArePersistent() {
	return configuredDir() !== "";
}

/**
 * Ruta absoluta de un storageKey ("uploads/..."). Rechaza claves que intenten
 * salir de la carpeta raíz (../, rutas absolutas): el storageKey viene de la
 * base, pero no debe poder leer cualquier archivo del servidor.
 */
export function resolveStoredPath(storageKey: string, root = uploadsRoot()) {
	const parts = storageKey.split(/[\\/]+/).filter(Boolean);
	if (parts.length === 0 || parts.some((part) => part === "..")) {
		throw new Error("Ruta de archivo inválida.");
	}
	const absoluteRoot = path.resolve(root);
	const target = path.resolve(absoluteRoot, ...parts);
	if (!target.startsWith(absoluteRoot + path.sep)) {
		throw new Error("Ruta de archivo inválida.");
	}
	return target;
}

let warnedEphemeral = false;

export async function writeStoredBuffer(storageKey: string, buffer: Buffer) {
	if (
		process.env.NODE_ENV === "production" &&
		!uploadsArePersistent() &&
		!warnedEphemeral
	) {
		warnedEphemeral = true;
		console.warn(
			"[uploads] Sin volumen: los archivos se guardan en el disco del contenedor y se perderán en el próximo despliegue. Conecta un volumen en Railway (RAILWAY_VOLUME_MOUNT_PATH) o define UPLOADS_DIR.",
		);
	}
	const target = resolveStoredPath(storageKey);
	await mkdir(path.dirname(target), { recursive: true });
	await writeFile(target, buffer);
}

/**
 * Lee un archivo subido. Si ya se usa un volumen, también busca en public/:
 * lo subido antes de conectar el volumen sigue disponible mientras el
 * contenedor actual exista.
 */
export async function readStoredFile(storageKey: string) {
	try {
		return await readFile(resolveStoredPath(storageKey));
	} catch (error) {
		if (uploadsRoot() === legacyRoot()) throw error;
		return readFile(resolveStoredPath(storageKey, legacyRoot()));
	}
}

/** Borra el archivo donde esté. Nunca falla: el registro es la fuente de verdad. */
export async function removeStoredFile(storageKey: string) {
	const roots =
		uploadsRoot() === legacyRoot()
			? [uploadsRoot()]
			: [uploadsRoot(), legacyRoot()];
	for (const root of roots) {
		try {
			await unlink(resolveStoredPath(storageKey, root));
		} catch {
			// Ya no estaba o no se pudo borrar: no bloquea el borrado del registro.
		}
	}
}
