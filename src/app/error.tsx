"use client";

import { SystemErrorState } from "@/shared/components/system-error-state";

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return <SystemErrorState error={error} reset={reset} />;
}
