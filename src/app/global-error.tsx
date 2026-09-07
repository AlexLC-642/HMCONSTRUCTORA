"use client";

import { SystemErrorState } from "@/shared/components/system-error-state";
import "./globals.css";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<html lang="es">
			<body>
				<SystemErrorState error={error} reset={reset} />
			</body>
		</html>
	);
}
