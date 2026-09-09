"use client";

import { CreditCard, X } from "lucide-react";
import { useEffect, useState } from "react";
import { recordSupplierPaymentAction } from "@/modules/finances/application/actions";

const inputClass =
	"focus-ring h-11 w-full rounded-xl border border-[#cbd3cc] bg-white px-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-[#98a69d]";
const currencyFormatter = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});

export function SupplierPaymentDialog({
	expenseId,
	projectId,
	description,
	provider,
	pending,
	today,
}: {
	expenseId: string;
	projectId: string;
	description: string;
	provider: string;
	pending: string;
	today: string;
}) {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!open) return;
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", closeOnEscape);
		return () => window.removeEventListener("keydown", closeOnEscape);
	}, [open]);

	return (
		<>
			<button
				className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#172023] px-4 text-sm font-semibold text-white shadow-[0_9px_20px_rgba(23,32,35,0.2)] transition hover:-translate-y-0.5"
				onClick={() => setOpen(true)}
				type="button"
			>
				<CreditCard size={16} /> Registrar pago
			</button>
			{open ? (
				<div className="fixed inset-0 z-[90] grid place-items-center bg-[#0d1415]/65 p-4 backdrop-blur-[3px]">
					<button
						aria-label="Cerrar ventana"
						className="absolute inset-0 cursor-default"
						onClick={() => setOpen(false)}
						type="button"
					/>
					<section
						aria-modal="true"
						className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-[#f8f8f5] shadow-[0_36px_100px_rgba(9,16,18,0.4)]"
						role="dialog"
					>
						<header className="flex items-start justify-between gap-4 bg-[#172023] p-5 text-white">
							<div className="flex gap-3">
								<span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--success)] shadow-[0_10px_24px_rgba(31,122,91,0.3)]">
									<CreditCard size={19} />
								</span>
								<div>
									<h2 className="text-xl font-semibold">
										Registrar pago a proveedor
									</h2>
									<p className="mt-1 text-sm text-white/70">
										Aplica un pago parcial o completo a esta compra.
									</p>
								</div>
							</div>
							<button
								aria-label="Cerrar"
								className="focus-ring grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"
								onClick={() => setOpen(false)}
								type="button"
							>
								<X size={18} />
							</button>
						</header>
						<form action={recordSupplierPaymentAction}>
							<input
								name="financialExpenseId"
								type="hidden"
								value={expenseId}
							/>
							<input name="projectId" type="hidden" value={projectId} />
							<div className="space-y-4 p-5">
								<div className="rounded-xl bg-[#eef2ee] p-4">
									<p className="font-semibold text-[#172023]">{description}</p>
									<p className="mt-1 text-sm text-[#62706b]">{provider}</p>
									<p className="mt-3 text-sm text-[#43504c]">
										Saldo pendiente{" "}
										<strong className="text-[#172023]">
											{currencyFormatter.format(Number(pending))}
										</strong>
									</p>
								</div>
								<div className="grid gap-4 sm:grid-cols-2">
									<label className="grid gap-1.5 text-sm font-semibold">
										Monto a pagar
										<input
											className={inputClass}
											defaultValue={pending}
											max={pending}
											min="0.01"
											name="amount"
											required
											step="0.01"
											type="number"
										/>
									</label>
									<label className="grid gap-1.5 text-sm font-semibold">
										Fecha del pago
										<input
											className={inputClass}
											defaultValue={today}
											name="paymentDate"
											required
											type="date"
										/>
									</label>
								</div>
								<div className="grid gap-4 sm:grid-cols-2">
									<label className="grid gap-1.5 text-sm font-semibold">
										Medio
										<select
											className={inputClass}
											defaultValue="Transferencia"
											name="method"
											required
										>
											<option>Transferencia</option>
											<option>Efectivo</option>
											<option>Depósito</option>
											<option>Cheque</option>
										</select>
									</label>
									<label className="grid gap-1.5 text-sm font-semibold">
										Referencia
										<input
											className={inputClass}
											name="reference"
											placeholder="Boleta, cheque o recibo"
											required
										/>
									</label>
								</div>
								<label className="grid gap-1.5 text-sm font-semibold">
									Notas
									<textarea
										className={`${inputClass} min-h-20 py-3`}
										name="notes"
										placeholder="Detalle opcional del pago"
									/>
								</label>
							</div>
							<footer className="flex justify-end gap-2 border-t border-[#d8ddd7] bg-white p-4">
								<button
									className="focus-ring h-11 rounded-xl border border-[#cbd3cc] px-4 font-semibold"
									onClick={() => setOpen(false)}
									type="button"
								>
									Cancelar
								</button>
								<button
									className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--success)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(31,122,91,0.24)]"
									type="submit"
								>
									<CreditCard size={17} /> Guardar pago
								</button>
							</footer>
						</form>
					</section>
				</div>
			) : null}
		</>
	);
}
