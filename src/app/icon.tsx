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
				background: "#172023",
				border: "1px solid rgba(255,255,255,0.14)",
				borderRadius: 14,
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
					height: 36,
					overflow: "hidden",
					position: "relative",
					width: 54,
				}}
			>
				<img
					alt=""
					height="61"
					src={logoSrc}
					style={{
						height: 61,
						left: -9,
						position: "absolute",
						top: -10,
						width: 72,
					}}
					width="72"
				/>
			</div>
		</div>,
		{
			...size,
		},
	);
}
