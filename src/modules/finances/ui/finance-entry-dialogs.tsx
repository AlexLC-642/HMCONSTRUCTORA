"use client";

import {
	Banknote,
	FileCheck2,
	FilePlus2,
	FileUp,
	ReceiptText,
	ShoppingCart,
	X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
	createClientPaymentAction,
	createExpenseAction,
	createPurchaseInvoiceAction,
} from "@/modules/finances/application/actions";

type BudgetSectionOption = {
	id: string;
	code: string;
	name: string;
	total: string;
};

type InvoiceOrderOption = {
	id: string;
	number: string;
	status: string;
	total: number;
	invoiced: number;
	available: number;
	supplier: { id: string; businessName: string };
};

type DialogKind = "invoice" | "expense" | "payment" | null;

const inputClass =
	"focus-ring h-11 w-full rounded-lg border border-[#cbd3cc] bg-white px-3 text-sm text-[#172023] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-[#9daaa1]";
const labelClass =
	"mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#53615c]";

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="block">
			<span className={labelClass}>{label}</span>
			{children}
		</div>
	);
}

function ModalShell({
	title,
	description,
	icon: Icon,
	onClose,
	children,
}: {
	title: string;
	description: string;
	icon: typeof Banknote;
	onClose: () => void;
	children: ReactNode;
}) {
	useEffect(() => {
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", closeOnEscape);
		return () => window.removeEventListener("keydown", closeOnEscape);
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-[80] grid place-items-center bg-[#0d1415]/65 p-4 backdrop-blur-[3px] sm:p-6">
			<button
				aria-label="Cerrar ventana"
				className="absolute inset-0 cursor-default"
				onClick={onClose}
				type="button"
			/>
			<section
				aria-modal="true"
				className="relative flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-[#f8f8f5] shadow-[0_36px_100px_rgba(9,16,18,0.38),0_4px_20px_rgba(9,16,18,0.18)]"
				role="dialog"
			>
				<header className="relative overflow-hidden border-b border-white/10 bg-[#182225] px-5 py-5 text-white sm:px-6">
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(200,32,47,0.2),transparent_38%)]" />
					<div className="relative flex items-start justify-between gap-4">
						<div className="flex min-w-0 items-start gap-3">
							<span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-red)] shadow-[0_10px_24px_rgba(200,32,47,0.28)]">
								<Icon aria-hidden="true" size={20} />
							</span>
							<div>
								<h2 className="text-xl font-semibold">{title}</h2>
								<p className="mt-1 text-sm text-white/70">{description}</p>
							</div>
						</div>
						<button
							aria-label="Cerrar"
							className="focus-ring grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
							onClick={onClose}
							type="button"
						>
							<X size={19} />
						</button>
					</div>
				</header>
				{children}
			</section>
		</div>
	);
}

export function FinanceEntryDialogs({
	projectId,
	sections,
	invoiceOrders,
	today,
}: {
	projectId: string;
	sections: BudgetSectionOption[];
	invoiceOrders: InvoiceOrderOption[];
	today: string;
}) {
	const [dialog, setDialog] = useState<DialogKind>(null);
	const [expenseFileName, setExpenseFileName] = useState("");
	const [invoiceFileName, setInvoiceFileName] = useState("");
	const [invoiceOrderId, setInvoiceOrderId] = useState(
		invoiceOrders.find((order) => order.available > 0)?.id ?? "",
	);
	const selectedInvoiceOrder = invoiceOrders.find(
		(order) => order.id === invoiceOrderId,
	);
	const close = () => {
		setDialog(null);
		setExpenseFileName("");
		setInvoiceFileName("");
	};

	return (
		<>
			<section className="flex flex-col gap-4 rounded-xl bg-[linear-gradient(115deg,#ffffff_0%,#f6f8f4_65%,#fff2f3_100%)] p-4 shadow-[0_18px_46px_rgba(22,27,29,0.1)] sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-lg font-semibold text-[#172023]">
						Movimientos financieros
					</h2>
					<p className="mt-1 text-sm text-[var(--muted)]">
						Registra cada operación en una ventana clara y vinculada al
						presupuesto.
					</p>
				</div>
				<div className="grid grid-cols-1 gap-2 sm:flex">
					<button
						className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(200,32,47,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
						disabled={!invoiceOrders.some((order) => order.available > 0)}
						onClick={() => setDialog("invoice")}
						type="button"
					>
						<FileCheck2 size={17} /> Registrar factura
					</button>
					<button
						className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd3cc] bg-white px-4 text-sm font-semibold shadow-[0_8px_20px_rgba(22,27,29,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(22,27,29,0.12)]"
						onClick={() => setDialog("expense")}
						type="button"
					>
						<ReceiptText size={17} /> Registrar gasto
					</button>
					<button
						className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--success)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(31,122,91,0.24)] transition hover:-translate-y-0.5"
						onClick={() => setDialog("payment")}
						type="button"
					>
						<Banknote size={17} /> Registrar abono
					</button>
				</div>
			</section>

			{dialog === "invoice" ? (
				<ModalShell
					description="Factura vinculada a proveedor, orden y proyecto."
					icon={ShoppingCart}
					onClose={close}
					title="Registrar factura de compra"
				>
					<form
						action={createPurchaseInvoiceAction}
						className="flex min-h-0 flex-1 flex-col"
					>
						<input name="projectId" type="hidden" value={projectId} />
						<div className="overflow-y-auto p-5 sm:p-6">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="sm:col-span-2">
									<Field label="Orden de compra">
										<select
											className={inputClass}
											name="purchaseOrderId"
											onChange={(event) =>
												setInvoiceOrderId(event.target.value)
											}
											required
											value={invoiceOrderId}
										>
											<option value="">Seleccionar orden emitida</option>
											{invoiceOrders
												.filter((order) => order.available > 0)
												.map((order) => (
													<option key={order.id} value={order.id}>
														{order.number} · {order.supplier.businessName} ·
														saldo{" "}
														{new Intl.NumberFormat("es-GT", {
															style: "currency",
															currency: "GTQ",
														}).format(order.available)}
													</option>
												))}
										</select>
									</Field>
								</div>
								{selectedInvoiceOrder ? (
									<div className="finance-invoice-summary sm:col-span-2 grid gap-3 rounded-xl border border-[#cfded6] bg-[linear-gradient(120deg,#eff7f2,#ffffff)] p-4 shadow-[inset_0_1px_0_white] sm:grid-cols-3">
										<div>
											<small className="block text-[11px] font-semibold uppercase tracking-[.07em] text-[#65736e]">
												Proveedor
											</small>
											<strong className="mt-1 block text-sm text-[#172023]">
												{selectedInvoiceOrder.supplier.businessName}
											</strong>
										</div>
										<div>
											<small className="block text-[11px] font-semibold uppercase tracking-[.07em] text-[#65736e]">
												Orden
											</small>
											<strong className="mt-1 block text-sm tabular-nums text-[#172023]">
												{new Intl.NumberFormat("es-GT", {
													style: "currency",
													currency: "GTQ",
												}).format(selectedInvoiceOrder.total)}
											</strong>
										</div>
										<div>
											<small className="block text-[11px] font-semibold uppercase tracking-[.07em] text-[#65736e]">
												Por facturar
											</small>
											<strong className="mt-1 block text-sm tabular-nums text-[#167154]">
												{new Intl.NumberFormat("es-GT", {
													style: "currency",
													currency: "GTQ",
												}).format(selectedInvoiceOrder.available)}
											</strong>
										</div>
									</div>
								) : null}
								<Field label="Número de factura">
									<input
										className={inputClass}
										name="documentNumber"
										placeholder="Serie y número"
										required
									/>
								</Field>
								<Field label="Fecha de factura">
									<input
										className={inputClass}
										defaultValue={today}
										name="expenseDate"
										required
										type="date"
									/>
								</Field>
								<Field label="Total facturado">
									<input
										className={inputClass}
										defaultValue={selectedInvoiceOrder?.available ?? ""}
										key={selectedInvoiceOrder?.id ?? "invoice-total"}
										max={selectedInvoiceOrder?.available}
										min="0.01"
										name="subtotal"
										required
										step="0.01"
										type="number"
									/>
								</Field>
								<label className="group grid cursor-pointer gap-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-[#53615c]">
									<span>Archivo de factura</span>
									<span className="finance-invoice-upload flex h-11 items-center gap-2 rounded-lg border border-dashed border-[#9db4a8] bg-white px-3 normal-case tracking-normal text-[#263330] transition hover:border-[#25815f]">
										{invoiceFileName ? (
											<FileCheck2 size={16} className="text-[#167154]" />
										) : (
											<FileUp size={16} />
										)}
										<span className="truncate">
											{invoiceFileName || "Seleccionar PDF o imagen"}
										</span>
									</span>
									<input
										accept=".pdf,.png,.jpg,.jpeg,.webp"
										className="sr-only"
										name="documentFile"
										onChange={(event) =>
											setInvoiceFileName(event.target.files?.[0]?.name ?? "")
										}
										required
										type="file"
									/>
								</label>
								<div className="sm:col-span-2">
									<Field label="Observaciones">
										<textarea
											className={`${inputClass} min-h-20 py-3`}
											name="notes"
										/>
									</Field>
								</div>
							</div>
						</div>
						<footer className="flex justify-end gap-2 border-t border-[#d8ddd7] bg-white px-5 py-4">
							<button
								className="focus-ring h-11 rounded-lg border border-[#cbd3cc] bg-white px-4 font-semibold"
								onClick={close}
								type="button"
							>
								Cancelar
							</button>
							<button
								className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--brand-red)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(200,32,47,0.22)]"
								type="submit"
							>
								<FileCheck2 size={17} /> Guardar factura
							</button>
						</footer>
					</form>
				</ModalShell>
			) : null}

			{dialog === "expense" ? (
				<ModalShell
					description="Documenta una compra o salida y asígnala al renglón correcto."
					icon={ReceiptText}
					onClose={close}
					title="Registrar gasto"
				>
					<form
						action={createExpenseAction}
						className="flex min-h-0 flex-1 flex-col"
					>
						<input name="projectId" type="hidden" value={projectId} />
						<div className="overflow-y-auto p-5 sm:p-6">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="sm:col-span-2">
									<Field label="Descripción del gasto">
										<input
											className={inputClass}
											name="description"
											placeholder="Cemento, flete, mano de obra..."
											required
										/>
									</Field>
								</div>
								<Field label="Proveedor">
									<input
										className={inputClass}
										name="vendor"
										placeholder="Empresa o persona que emitió el documento"
									/>
								</Field>
								<Field label="Tipo de comprobante">
									<select
										className={inputClass}
										defaultValue=""
										name="documentType"
									>
										<option value="">Seleccionar al adjuntar</option>
										<option value="FACTURA">Factura</option>
										<option value="RECIBO">Recibo</option>
										<option value="OTRO">Otro comprobante</option>
									</select>
								</Field>
								<div className="sm:col-span-2 rounded-xl border border-[#cfe0d7] bg-[#f0f7f3] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
									<div className="mb-3">
										<p className="text-sm font-semibold text-[#1d382f]">
											Comprobante del proveedor
										</p>
										<p className="mt-0.5 text-xs text-[#61716b]">
											El folio y el archivo se guardan juntos. Después podrás
											abrirlo desde el número mostrado en el estado de cuenta.
										</p>
									</div>
									<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
										<Field label="Número exacto de factura o recibo">
											<input
												className={inputClass}
												name="documentNumber"
												placeholder="Ej. FACE-63A9-001245"
												required={Boolean(expenseFileName)}
											/>
										</Field>
										<label className="group flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#9db4a8] bg-white px-3 text-sm transition hover:-translate-y-0.5 hover:border-[#25815f] hover:shadow-[0_8px_20px_rgba(31,122,91,0.11)]">
											<span
												className={`grid size-8 shrink-0 place-items-center rounded-lg ${expenseFileName ? "bg-[#e2f3ea] text-[#167154]" : "bg-[#f0f2ef] text-[#61716b]"}`}
											>
												{expenseFileName ? (
													<FileCheck2 size={16} />
												) : (
													<FileUp size={16} />
												)}
											</span>
											<span className="min-w-0">
												<strong className="block truncate text-xs text-[#263330]">
													{expenseFileName || "Adjuntar factura o recibo"}
												</strong>
												<small className="text-[#71807a]">
													PDF, JPG, PNG o WEBP
												</small>
											</span>
											<input
												accept=".pdf,.png,.jpg,.jpeg,.webp"
												className="sr-only"
												name="documentFile"
												onChange={(event) =>
													setExpenseFileName(
														event.target.files?.[0]?.name ?? "",
													)
												}
												type="file"
											/>
										</label>
									</div>
								</div>
								<Field label="Fecha">
									<input
										className={inputClass}
										defaultValue={today}
										name="expenseDate"
										required
										type="date"
									/>
								</Field>
								<Field label="Renglón del presupuesto">
									<select
										className={inputClass}
										defaultValue=""
										name="budgetSectionNo"
									>
										<option value="">Sin renglón asignado</option>
										{sections.map((section) => (
											<option key={section.id} value={section.code}>
												{section.code} · {section.name}
											</option>
										))}
									</select>
								</Field>
								<Field label="Cantidad">
									<input
										className={inputClass}
										defaultValue="1"
										min="0.01"
										name="quantity"
										step="0.01"
										type="number"
									/>
								</Field>
								<Field label="Unidad">
									<input
										className={inputClass}
										name="unit"
										placeholder="saco, m², unidad"
									/>
								</Field>
								<Field label="Total del gasto">
									<input
										className={inputClass}
										min="0.01"
										name="subtotal"
										required
										step="0.01"
										type="number"
									/>
								</Field>
								<Field label="Medio de pago">
									<select
										className={inputClass}
										defaultValue=""
										name="paymentMethod"
									>
										<option value="">Seleccione</option>
										<option>Efectivo</option>
										<option>Transferencia</option>
										<option>Depósito</option>
										<option>Cheque</option>
										<option>Tarjeta</option>
									</select>
								</Field>
								<Field label="Clasificación financiera">
									<select className={inputClass} defaultValue="" name="type">
										<option value="">Seleccionar clasificación</option>
										<option value="Material">Material</option>
										<option value="Mano de obra">Mano de obra</option>
										<option value="Servicio">Servicio</option>
										<option value="Supervisión">Supervisión</option>
										<option value="Trabajo adicional">Trabajo adicional</option>
										<option value="Gasto externo">
											Gasto externo distinto de obra
										</option>
										<option value="Otro">Otro</option>
									</select>
								</Field>
								<Field label="Fase">
									<input
										className={inputClass}
										name="phase"
										placeholder="Fase 1"
									/>
								</Field>
								<div className="sm:col-span-2">
									<Field label="Actividad o detalle">
										<input
											className={inputClass}
											name="activity"
											placeholder="Actividad relacionada"
										/>
									</Field>
								</div>
								<div className="sm:col-span-2">
									<Field label="Notas">
										<textarea
											className={`${inputClass} min-h-20 py-3`}
											name="notes"
										/>
									</Field>
								</div>
							</div>
						</div>
						<footer className="flex justify-end gap-2 border-t border-[#d8ddd7] bg-white px-5 py-4">
							<button
								className="focus-ring h-11 rounded-lg border border-[#cbd3cc] bg-white px-4 font-semibold"
								onClick={close}
								type="button"
							>
								Cancelar
							</button>
							<button
								className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--brand-red)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(200,32,47,0.22)]"
								type="submit"
							>
								<FilePlus2 size={17} /> Guardar gasto
							</button>
						</footer>
					</form>
				</ModalShell>
			) : null}

			{dialog === "payment" ? (
				<ModalShell
					description="Registra el ingreso general o aplícalo a un renglón completo."
					icon={Banknote}
					onClose={close}
					title="Registrar abono del cliente"
				>
					<form
						action={createClientPaymentAction}
						className="flex min-h-0 flex-1 flex-col"
					>
						<input name="projectId" type="hidden" value={projectId} />
						<div className="overflow-y-auto p-5 sm:p-6">
							<div className="grid gap-4 sm:grid-cols-2">
								<Field label="Fecha">
									<input
										className={inputClass}
										defaultValue={today}
										name="paymentDate"
										required
										type="date"
									/>
								</Field>
								<Field label="Monto recibido">
									<input
										className={inputClass}
										min="0.01"
										name="amount"
										required
										step="0.01"
										type="number"
									/>
								</Field>
								<div className="sm:col-span-2">
									<Field label="Aplicar a renglón del presupuesto">
										<select
											className={inputClass}
											defaultValue=""
											name="budgetSectionId"
										>
											<option value="">Abono general del proyecto</option>
											{sections.map((section) => (
												<option key={section.id} value={section.id}>
													Renglón {section.code} · {section.name}
												</option>
											))}
										</select>
									</Field>
								</div>
								<div className="sm:col-span-2 rounded-xl border border-[#d9dfd8] bg-[#eef4ef] px-4 py-3 text-sm text-[#40504a]">
									Cada opción corresponde a un renglón completo del presupuesto
									aprobado, no a sus materiales o mano de obra por separado.
								</div>
								<Field label="Concepto">
									<input
										className={inputClass}
										name="concept"
										placeholder="Anticipo, abono 1, estimación..."
									/>
								</Field>
								<Field label="Medio">
									<select
										className={inputClass}
										defaultValue="Transferencia"
										name="method"
									>
										<option>Transferencia</option>
										<option>Efectivo</option>
										<option>Depósito</option>
										<option>Cheque</option>
										<option>Tarjeta</option>
									</select>
								</Field>
								<Field label="Referencia">
									<input
										className={inputClass}
										name="reference"
										placeholder="Boleta, recibo o cheque"
									/>
								</Field>
								<Field label="Número de abono (opcional)">
									<input
										className={inputClass}
										name="paymentNumber"
										placeholder="Se genera automáticamente"
									/>
								</Field>
								<div className="sm:col-span-2">
									<Field label="Observaciones">
										<textarea
											className={`${inputClass} min-h-20 py-3`}
											name="observations"
										/>
									</Field>
								</div>
							</div>
						</div>
						<footer className="flex justify-end gap-2 border-t border-[#d8ddd7] bg-white px-5 py-4">
							<button
								className="focus-ring h-11 rounded-lg border border-[#cbd3cc] bg-white px-4 font-semibold"
								onClick={close}
								type="button"
							>
								Cancelar
							</button>
							<button
								className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--success)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(31,122,91,0.22)]"
								type="submit"
							>
								<Banknote size={17} /> Guardar abono
							</button>
						</footer>
					</form>
				</ModalShell>
			) : null}
		</>
	);
}
