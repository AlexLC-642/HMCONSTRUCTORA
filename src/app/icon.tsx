import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = {
	width: 64,
	height: 64,
};

export const contentType = "image/png";

const logoData = await readFile(
	join(process.cwd(), "public", "brand", "logo.png"),
	"base64",
);
const logoSrc = `data:image/png;base64,${logoData}`;

export default function Icon() {
	return new ImageResponse(
		<div
			style={{
				alignItems: "center",
				background: "#c8202f",
				borderRadius: 14,
				display: "flex",
				height: "100%",
				justifyContent: "center",
				width: "100%",
			}}
		>
			<div
				style={{
					alignItems: "center",
					background: "#ffffff",
					border: "1px solid rgba(23,32,35,0.1)",
					borderRadius: 11,
					display: "flex",
					height: 48,
					justifyContent: "center",
					boxShadow: "0 5px 12px rgba(23,32,35,0.22)",
					width: 48,
				}}
			>
				<div
					style={{
						display: "flex",
						height: 22,
						overflow: "hidden",
						position: "relative",
						width: 40,
					}}
				>
					{/** biome-ignore lint/performance/noImgElement: ImageResponse (Satori) requires a plain image element. */}
					<img
						alt=""
						height="42"
						src={logoSrc}
						style={{
							height: 42,
							left: -3,
							position: "absolute",
							top: -6,
							width: 46,
						}}
						width="46"
					/>
				</div>
			</div>
		</div>,
		{
			...size,
		},
	);
}
