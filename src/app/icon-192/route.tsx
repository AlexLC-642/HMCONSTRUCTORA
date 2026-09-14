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
				background: "#c8202f",
				display: "flex",
				height: "100%",
				justifyContent: "center",
				overflow: "hidden",
				width: "100%",
			}}
		>
			<div
				style={{
					alignItems: "center",
					background: "#ffffff",
					border: "2px solid rgba(23,32,35,0.1)",
					borderRadius: 34,
					boxShadow: "0 16px 34px rgba(23,32,35,0.24)",
					display: "flex",
					height: 142,
					justifyContent: "center",
					width: 142,
				}}
			>
				<div
					style={{
						display: "flex",
						height: 66,
						overflow: "hidden",
						position: "relative",
						width: 120,
					}}
				>
					{/** biome-ignore lint/performance/noImgElement: ImageResponse (Satori) only accepts a plain <img>, not next/image. */}
					<img
						alt=""
						height="126"
						src={logoSrc}
						style={{
							height: 126,
							left: -9,
							position: "absolute",
							top: -18,
							width: 138,
						}}
						width="138"
					/>
				</div>
			</div>
		</div>,
		{ width: 192, height: 192 },
	);
}
