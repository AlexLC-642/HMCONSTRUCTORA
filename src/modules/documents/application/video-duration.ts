// Reads the duration of an MP4/MOV file without shelling out to ffmpeg (not
// a dependency of this project) or adding a new npm package. Both formats
// share the ISO Base Media File Format box structure: a sequence of
// [size(4) | type(4) | payload] boxes, with "moov" containing an "mvhd" box
// that holds timescale + duration. duration_seconds = duration / timescale.
// Returns null (never throws) if the buffer isn't a box-structured video we
// recognize - callers should treat that as "couldn't verify", not "invalid".
export function readVideoDurationSeconds(buffer: Buffer): number | null {
	try {
		return findMvhdDuration(buffer, 0, buffer.length);
	} catch {
		return null;
	}
}

function findMvhdDuration(
	buffer: Buffer,
	start: number,
	end: number,
): number | null {
	let offset = start;

	while (offset + 8 <= end) {
		let size = buffer.readUInt32BE(offset);
		const type = buffer.toString("ascii", offset + 4, offset + 8);
		let headerSize = 8;

		if (size === 1) {
			// 64-bit "largesize" extension, right after the type field.
			if (offset + 16 > end) return null;
			const high = buffer.readUInt32BE(offset + 8);
			const low = buffer.readUInt32BE(offset + 12);
			size = high * 2 ** 32 + low;
			headerSize = 16;
		} else if (size === 0) {
			// Box extends to the end of the file - not expected for moov/mvhd.
			size = end - offset;
		}

		if (size < headerSize || offset + size > end) return null;

		if (type === "moov") {
			return findMvhdDuration(buffer, offset + headerSize, offset + size);
		}

		if (type === "mvhd") {
			const bodyStart = offset + headerSize;
			const version = buffer.readUInt8(bodyStart);
			// version(1) + flags(3), then either 32-bit or 64-bit time fields.
			const timeFieldSize = version === 1 ? 8 : 4;
			const timescaleOffset = bodyStart + 4 + timeFieldSize * 2;
			const durationOffset = timescaleOffset + 4;
			const timescale = buffer.readUInt32BE(timescaleOffset);
			const duration =
				version === 1
					? Number(buffer.readBigUInt64BE(durationOffset))
					: buffer.readUInt32BE(durationOffset);
			if (!timescale) return null;
			return duration / timescale;
		}

		offset += size;
	}

	return null;
}
