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
					border: "5px solid rgba(23,32,35,0.1)",
					borderRadius: 90,
					boxShadow: "0 42px 90px rgba(23,32,35,0.24)",
					display: "flex",
					height: 378,
					justifyContent: "center",
					width: 378,
				}}
			>
				<div
					style={{
						display: "flex",
						height: 176,
						overflow: "hidden",
						position: "relative",
						width: 320,
					}}
				>
					{/** biome-ignore lint/performance/noImgElement: ImageResponse (Satori) only accepts a plain <img>, not next/image. */}
					<img
						alt=""
						height="336"
						src={logoSrc}
						style={{
							height: 336,
							left: -24,
							position: "absolute",
							top: -48,
							width: 368,
						}}
						width="368"
					/>
				</div>
			</div>
		</div>,
		{ width: 512, height: 512 },
	);
}
