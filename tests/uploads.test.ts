import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	resolveStoredPath,
	uploadsArePersistent,
	uploadsRoot,
} from "@/shared/lib/uploads";

const original = {
	UPLOADS_DIR: process.env.UPLOADS_DIR,
	RAILWAY_VOLUME_MOUNT_PATH: process.env.RAILWAY_VOLUME_MOUNT_PATH,
};

afterEach(() => {
	for (const [key, value] of Object.entries(original)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
});

describe("almacenamiento de archivos subidos", () => {
	it("sin volumen usa public/ y avisa que no es persistente", () => {
		delete process.env.UPLOADS_DIR;
		delete process.env.RAILWAY_VOLUME_MOUNT_PATH;
		expect(uploadsRoot()).toBe(path.join(process.cwd(), "public"));
		expect(uploadsArePersistent()).toBe(false);
	});

	it("usa el volumen de Railway cuando existe", () => {
		delete process.env.UPLOADS_DIR;
		process.env.RAILWAY_VOLUME_MOUNT_PATH = "/data";
		expect(uploadsRoot()).toBe("/data");
		expect(uploadsArePersistent()).toBe(true);
	});

	it("UPLOADS_DIR tiene prioridad sobre el volumen", () => {
		process.env.UPLOADS_DIR = "/srv/files";
		process.env.RAILWAY_VOLUME_MOUNT_PATH = "/data";
		expect(uploadsRoot()).toBe("/srv/files");
	});

	it("resuelve claves dentro de la raíz", () => {
		const root = path.resolve("/data");
		expect(resolveStoredPath("uploads/documents/p1/a.pdf", root)).toBe(
			path.join(root, "uploads", "documents", "p1", "a.pdf"),
		);
	});

	it("rechaza claves que intentan salir de la raíz", () => {
		const root = path.resolve("/data");
		expect(() => resolveStoredPath("uploads/../../etc/passwd", root)).toThrow();
		expect(() => resolveStoredPath("", root)).toThrow();
	});

	it("si el volumen está montado en .../uploads, la raíz es su carpeta padre", () => {
		delete process.env.UPLOADS_DIR;
		process.env.RAILWAY_VOLUME_MOUNT_PATH = "/app/public/uploads";
		expect(uploadsRoot()).toBe(path.dirname("/app/public/uploads"));
		expect(uploadsArePersistent()).toBe(true);
		expect(resolveStoredPath("uploads/documents/p1/a.pdf", uploadsRoot())).toBe(
			path.resolve("/app/public/uploads/documents/p1/a.pdf"),
		);
	});
});
