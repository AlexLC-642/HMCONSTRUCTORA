"use client";

import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Disables itself while the server action runs so a double click can never
// register the same expense, payment or invoice twice.
export function FinanceSubmitButton({
	className,
	icon,
	label,
}: {
	className: string;
	icon: ReactNode;
	label: string;
}) {
	const { pending } = useFormStatus();

	return (
		<button
			aria-busy={pending}
			className={`${className} disabled:cursor-wait disabled:opacity-70`}
			disabled={pending}
			type="submit"
		>
			{pending ? (
				<LoaderCircle
					aria-hidden="true"
					className="animate-spin motion-reduce:animate-none"
					size={17}
				/>
			) : (
				icon
			)}
			{pending ? "Guardando…" : label}
		</button>
	);
}
