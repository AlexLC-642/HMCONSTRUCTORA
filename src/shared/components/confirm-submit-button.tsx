"use client";

import { TriangleAlert } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

/**
 * Wraps a submit button for a destructive form action behind an in-app
 * confirmation dialog - the whole form (action, hidden fields) stays plain
 * server-rendered markup; this only intercepts the click and, on confirm,
 * submits that same form programmatically. Replaces the native
 * window.confirm() popup, which looks like a browser warning rather than
 * part of the product.
 */
export function ConfirmSubmitButton({
	title = "Confirmar eliminación",
	description,
	confirmLabel = "Eliminar",
	cancelLabel = "Cancelar",
	children,
	className,
}: {
	title?: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	children: ReactNode;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const formRef = useRef<HTMLFormElement | null>(null);
	const titleId = useId();

	useEffect(() => {
		if (!open) return;
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") setOpen(false);
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open]);

	return (
		<>
			<button
				className={className}
				onClick={(event) => {
					formRef.current = event.currentTarget.form;
					setOpen(true);
				}}
				type="button"
			>
				{children}
			</button>

			{open ? (
				<div className="fixed inset-0 z-[100] grid place-items-center bg-[#0d1314]/55 p-4 backdrop-blur-sm">
					<button
						aria-label={cancelLabel}
						className="absolute inset-0 cursor-default"
						onClick={() => setOpen(false)}
						type="button"
					/>
					<section
						aria-describedby={`${titleId}-description`}
						aria-labelledby={titleId}
						aria-modal="true"
						className="relative w-[min(400px,92vw)] rounded-2xl border border-[#e3e6e0] bg-white p-5 shadow-[0_28px_70px_rgba(15,20,21,0.28)]"
						role="alertdialog"
					>
						<div className="flex items-start gap-3">
							<span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fdecec] text-[#c8202f]">
								<TriangleAlert aria-hidden="true" size={19} />
							</span>
							<div className="min-w-0 pt-0.5">
								<h2
									className="text-[15px] font-bold text-[#171f21]"
									id={titleId}
								>
									{title}
								</h2>
								<p
									className="mt-1.5 text-sm leading-relaxed text-[#5b6864]"
									id={`${titleId}-description`}
								>
									{description}
								</p>
							</div>
						</div>
						<div className="mt-5 flex justify-end gap-2">
							<button
								className="inline-flex h-9 items-center rounded-lg border border-[#d5dbd6] bg-white px-4 text-sm font-semibold text-[#3c4643] transition hover:bg-[#f4f0ed]"
								onClick={() => setOpen(false)}
								type="button"
							>
								{cancelLabel}
							</button>
							<button
								className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#c8202f] px-4 text-sm font-semibold text-white transition hover:bg-[#a91b28] disabled:opacity-60"
								disabled={pending}
								onClick={() => {
									setPending(true);
									formRef.current?.requestSubmit();
								}}
								type="button"
							>
								{pending ? "Eliminando..." : confirmLabel}
							</button>
						</div>
					</section>
				</div>
			) : null}
		</>
	);
}
