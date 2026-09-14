import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Same composition as icon-192/route.tsx, scaled 8x from the 64px favicon
// base instead of up from the 192px version, so both stay crisp at their
// own resolution rather than one being a blurry upscale of the other.
const logoData = await readFile(
	join(process.cwd(), "public", "brand", "logo.png"),
	"base64",
);
const logoSrc = `data:image/png;base64,${logoData}`;

export async function GET() {
	return new ImageResponse(
		<div
			style={{
				alignItems: "center",
				background: "#172023",
				display: "flex",
				height: "100%",
				justifyContent: "center",
				overflow: "hidden",
				width: "100%",
			}}
		>
			<div
				style={{
					display: "flex",
					height: 239,
					overflow: "hidden",
					position: "relative",
					width: 430,
				}}
			>
				{/** biome-ignore lint/performance/noImgElement: ImageResponse (Satori) only accepts a plain <img>, not next/image. */}
				<img
					alt=""
					height="451"
					src={logoSrc}
					style={{
						height: 451,
						left: -32,
						position: "absolute",
						top: -64,
						width: 491,
					}}
					width="491"
				/>
			</div>
		</div>,
		{ width: 512, height: 512 },
	);
}
