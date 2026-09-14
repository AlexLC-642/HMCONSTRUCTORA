import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// PWA manifest icon at the size Chromium's install-eligibility check reads.
// Same dark-frame treatment as src/app/icon.tsx (favicon), scaled 3x (64px
// base -> 192px) so the crop/composition matches exactly. The logo sits well
// inside the square with background filling every edge, which is what a
// "maskable" icon needs - a launcher can mask it into a circle without
// cropping into the mark.
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
					height: 89,
					overflow: "hidden",
					position: "relative",
					width: 161,
				}}
			>
				{/** biome-ignore lint/performance/noImgElement: ImageResponse (Satori) only accepts a plain <img>, not next/image. */}
				<img
					alt=""
					height="169"
					src={logoSrc}
					style={{
						height: 169,
						left: -12,
						position: "absolute",
						top: -24,
						width: 184,
					}}
					width="184"
				/>
			</div>
		</div>,
		{ width: 192, height: 192 },
	);
}
