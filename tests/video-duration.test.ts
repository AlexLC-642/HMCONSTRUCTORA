import { describe, expect, it } from "vitest";
import { readVideoDurationSeconds } from "@/modules/documents/application/video-duration";

function box(type: string, body: Buffer) {
	const size = 8 + body.length;
	const header = Buffer.alloc(8);
	header.writeUInt32BE(size, 0);
	header.write(type, 4, "ascii");
	return Buffer.concat([header, body]);
}

function mvhdBody(version: 0 | 1, timescale: number, duration: number) {
	const timeFieldSize = version === 1 ? 8 : 4;
	const body = Buffer.alloc(4 + timeFieldSize * 2 + 4 + timeFieldSize);
	body.writeUInt8(version, 0); // flags stay 0 in bytes 1-3
	let offset = 4 + timeFieldSize * 2; // skip version/flags + creation/modification time
	body.writeUInt32BE(timescale, offset);
	offset += 4;
	if (version === 1) {
		body.writeBigUInt64BE(BigInt(duration), offset);
	} else {
		body.writeUInt32BE(duration, offset);
	}
	return body;
}

function fakeMp4(version: 0 | 1, timescale: number, duration: number) {
	const ftyp = box("ftyp", Buffer.from("isom\0\0\x02\0", "binary"));
	const mvhd = box("mvhd", mvhdBody(version, timescale, duration));
	const moov = box("moov", mvhd);
	return Buffer.concat([ftyp, moov]);
}

describe("readVideoDurationSeconds", () => {
	it("reads duration from a version 0 mvhd box (30s at 600 timescale)", () => {
		const buffer = fakeMp4(0, 600, 600 * 30);
		expect(readVideoDurationSeconds(buffer)).toBe(30);
	});

	it("reads duration from a version 1 (64-bit) mvhd box", () => {
		const buffer = fakeMp4(1, 1000, 1000 * 90);
		expect(readVideoDurationSeconds(buffer)).toBe(90);
	});

	it("returns null for a buffer with no moov/mvhd box", () => {
		const buffer = box("ftyp", Buffer.from("isom\0\0\x02\0", "binary"));
		expect(readVideoDurationSeconds(buffer)).toBeNull();
	});

	it("returns null instead of throwing on garbage input", () => {
		expect(readVideoDurationSeconds(Buffer.from("not a video file"))).toBeNull();
		expect(readVideoDurationSeconds(Buffer.alloc(0))).toBeNull();
	});
});
