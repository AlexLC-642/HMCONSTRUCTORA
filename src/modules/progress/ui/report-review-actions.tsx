"use client";

import { CheckCircle2, PencilLine, Undo2, X } from "lucide-react";
import {
	type ReactNode,
	useActionState,
	useEffect,
	useId,
	useState,
} from "react";
import { useFormStatus } from "react-dom";
import type { ReturnToDraftState } from "../application/actions";

function Pending({
	idle,
	busy,
	className,
	icon,
}: {
	idle: string;
	busy: string;
	className: string;
	icon: ReactNode;
}) {
	const { pending } = useFormStatus();
	return (
		<button className={className} disabled={pending} type="submit">
			{icon}
			{pending ? busy : idle}
		</button>
	);
}

const ghost =
	"focus-ring inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-raised)] disabled:opacity-60";
const primary =
	"focus-ring inline-flex items-center gap-2 rounded-lg bg-[var(--success)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60";

/**
 * Acciones de quien revisa un informe enviado: corregirlo directamente,
 * devolverlo al encargado con un motivo, o aprobarlo.
 */
export function ReportReviewActions({
	editHref,
	canApprove,
	approveAction,
	returnAction,
}: {
	editHref: string;
	canApprove: boolean;
	approveAction: () => Promise<void>;
	returnAction: (
		state: ReturnToDraftState,
		formData: FormData,
	) => Promise<ReturnToDraftState>;
}) {
	const [open, setOpen] = useState(false);
	const initial: ReturnToDraftState = { status: "idle", message: "" };
	const [state, action] = useActionState(returnAction, initial);
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
			<a className={ghost} href={editHref}>
				<PencilLine aria-hidden="true" size={17} />
				Corregir informe
			</a>
			<button className={ghost} onClick={() => setOpen(true)} type="button">
				<Undo2 aria-hidden="true" size={17} />
				Devolver a borrador
			</button>
			{canApprove ? (
				<form action={approveAction}>
					<Pending
						busy="Aprobando..."
						className={primary}
						icon={<CheckCircle2 aria-hidden="true" size={17} />}
						idle="Aprobar"
					/>
				</form>
			) : null}

			{open ? (
				<div className="fixed inset-0 z-[100] grid place-items-center p-4">
					<button
						aria-label="Cerrar"
						className="absolute inset-0 cursor-default bg-[#0d1314]/55"
						onClick={() => setOpen(false)}
						type="button"
					/>
					<section
						aria-labelledby={titleId}
						aria-modal="true"
						className="relative w-[min(28rem,100%)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_60px_rgba(13,19,20,0.28)]"
						role="dialog"
					>
						<header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
							<h2 className="text-base font-semibold" id={titleId}>
								Devolver para corrección
							</h2>
							<button
								aria-label="Cerrar"
								className="focus-ring grid size-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-raised)]"
								onClick={() => setOpen(false)}
								type="button"
							>
								<X aria-hidden="true" size={16} />
							</button>
						</header>
						<form action={action} className="grid gap-4 p-5">
							<p className="text-sm leading-6 text-[var(--muted)]">
								El informe vuelve a <strong>borrador</strong> para que el
								encargado lo corrija y lo envíe otra vez. El motivo queda
								registrado.
							</p>
							<label className="grid gap-1.5">
								<span className="text-sm font-medium">
									Qué hay que corregir
								</span>
								<textarea
									// biome-ignore lint/a11y/noAutofocus: el diálogo se abre para escribir el motivo.
									autoFocus
									className="focus-ring min-h-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
									maxLength={1000}
									minLength={5}
									name="reason"
									placeholder="Ej. El avance de cimentación no cuadra con lo medido en obra."
									required
								/>
							</label>
							{state.status === "error" ? (
								<p
									className="rounded-lg bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))] px-3 py-2 text-sm text-[var(--danger)]"
									role="alert"
								>
									{state.message}
								</p>
							) : null}
							<div className="flex justify-end gap-2">
								<button
									className={ghost}
									onClick={() => setOpen(false)}
									type="button"
								>
									Cancelar
								</button>
								<Pending
									busy="Devolviendo..."
									className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--surface)] disabled:opacity-60"
									icon={<Undo2 aria-hidden="true" size={16} />}
									idle="Devolver"
								/>
							</div>
						</form>
					</section>
				</div>
			) : null}
		</>
	);
}
