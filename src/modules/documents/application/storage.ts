import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	isUploadRateLimited,
	recordUploadAttempt,
} from "@/shared/lib/upload-rate-limit";
import { videoDurationLimitSeconds } from "../domain/catalog";
import { readVideoDurationSeconds } from "./video-duration";

const MAX_DOCUMENT_SIZE = 80 * 1024 * 1024;

const extensionMime: Record<string, string> = {
	".pdf": "application/pdf",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".mp4": "video/mp4",
	".mov": "video/quicktime",
	".docx":
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	".pptx":
		"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	".dwg": "image/vnd.dwg",
	".dxf": "image/vnd.dxf",
};

function cleanExtension(fileName: string) {
	return path
		.extname(fileName)
		.toLowerCase()
		.replace(/[^a-z0-9.]/g, "");
}

function detectMime(buffer: Buffer, extension: string) {
	if (buffer.subarray(0, 4).toString() === "%PDF") return "application/pdf";
	if (
		buffer
			.subarray(0, 8)
			.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
	)
		return "image/png";
	if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
		return "image/jpeg";
	if (
		buffer.subarray(0, 4).toString() === "RIFF" &&
		buffer.subarray(8, 12).toString() === "WEBP"
	)
		return "image/webp";
	if (buffer.subarray(4, 8).toString() === "ftyp")
		return extension === ".mov" ? "video/quicktime" : "video/mp4";
	if (
		buffer.subarray(0, 2).toString() === "PK" &&
		[".docx", ".xlsx", ".pptx"].includes(extension)
	)
		return extensionMime[extension];
	if (buffer.subarray(0, 4).toString() === "AC10" && extension === ".dwg")
		return "image/vnd.dwg";
	if (
		buffer.subarray(0, 16).toString().includes("SECTION") &&
		extension === ".dxf"
	)
		return "image/vnd.dxf";
	return "";
}

const imageExtensionMime: Record<string, string> = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
};

async function validateAndReadFile(
	file: File,
	allowedMime: Record<string, string>,
	maxSize: number,
) {
	if (file.size <= 0) throw new Error("Selecciona un archivo valido.");
	if (file.size > maxSize)
		throw new Error(
			`El archivo supera el limite de ${Math.round(maxSize / (1024 * 1024))} MB.`,
		);

	const extension = cleanExtension(file.name);
	if (!extension || !allowedMime[extension]) {
		throw new Error("Tipo de archivo no permitido.");
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const detectedMime = detectMime(buffer, extension);
	if (!detectedMime || detectedMime !== allowedMime[extension]) {
		throw new Error(
			"El contenido del archivo no coincide con su tipo esperado.",
		);
	}

	const checksum = createHash("sha256").update(buffer).digest("hex");
	return { buffer, extension, mimeType: detectedMime, checksum };
}

async function writeStoredFile(
	storageKeyPrefix: string,
	buffer: Buffer,
	extension: string,
) {
	const fileName = `${randomUUID()}${extension}`;
	const storageKey = `${storageKeyPrefix}/${fileName}`;
	const outputDir = path.join(
		process.cwd(),
		"public",
		...storageKeyPrefix.split("/"),
	);
	await mkdir(outputDir, { recursive: true });
	await writeFile(path.join(outputDir, fileName), buffer);
	return {
		fileName,
		storageKey,
		publicUrl: `/${storageKey.replaceAll("\\", "/")}`,
	};
}

// Best-effort: a document's DB row is the source of truth, so a stray file
// that fails to delete (already gone, permission issue) must never block
// deleting the record itself.
export async function deleteStoredFile(storageKey: string) {
	try {
		await unlink(path.join(process.cwd(), "public", ...storageKey.split("/")));
	} catch {
		// Ignore - the file may already be gone.
	}
}

function assertUploadNotRateLimited(userId: string) {
	if (isUploadRateLimited(userId)) {
		throw new Error(
			"Has subido demasiados archivos en poco tiempo. Espera unos minutos e intenta de nuevo.",
		);
	}
	recordUploadAttempt(userId);
}

export async function storeProjectDocumentFile(
	projectId: string,
	documentId: string,
	file: File,
	categoryKey: string | undefined,
	userId: string,
) {
	assertUploadNotRateLimited(userId);

	const { buffer, extension, mimeType, checksum } = await validateAndReadFile(
		file,
		extensionMime,
		MAX_DOCUMENT_SIZE,
	);

	const durationLimit = categoryKey
		? videoDurationLimitSeconds[categoryKey]
		: undefined;
	if (durationLimit && mimeType.startsWith("video/")) {
		const duration = readVideoDurationSeconds(buffer);
		// A video whose duration we can't determine is not silently accepted -
		// for this category the limit is the point, so an unparseable/unusual
		// container is rejected rather than trusted.
		if (duration === null) {
			throw new Error(
				"No se pudo verificar la duracion del video. Sube un archivo MP4 o MOV estandar.",
			);
		}
		if (duration > durationLimit) {
			throw new Error(
				`El video dura ${Math.ceil(duration)} segundos; esta categoria admite hasta ${durationLimit} segundos.`,
			);
		}
	}

	const { fileName, storageKey, publicUrl } = await writeStoredFile(
		`uploads/documents/${projectId}/${documentId}`,
		buffer,
		extension,
	);

	return {
		checksum,
		fileName,
		fileSize: file.size,
		mimeType,
		originalName: file.name,
		publicUrl,
		storageKey,
	};
}

const MAX_WEBSITE_IMAGE_SIZE = 15 * 1024 * 1024;

export async function storeWebsiteImageFile(
	mediaId: string,
	file: File,
	userId: string,
) {
	assertUploadNotRateLimited(userId);

	const { buffer, extension, mimeType, checksum } = await validateAndReadFile(
		file,
		imageExtensionMime,
		MAX_WEBSITE_IMAGE_SIZE,
	);
	const { fileName, storageKey, publicUrl } = await writeStoredFile(
		`uploads/website/${mediaId}`,
		buffer,
		extension,
	);

	return {
		checksum,
		fileName,
		fileSize: file.size,
		mimeType,
		originalName: file.name,
		publicUrl,
		storageKey,
	};
}
