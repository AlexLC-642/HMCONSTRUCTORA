"use client";

import {
	ArrowRight,
	Banknote,
	ChevronDown,
	FileCheck2,
	FilePlus2,
	FileUp,
	Info,
	ReceiptText,
	ShoppingCart,
	X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import {
	createClientPaymentAction,
	createExpenseAction,
	createPurchaseInvoiceAction,
} from "@/modules/finances/application/actions";
import { SelectMenu, type SelectMenuOption } from "@/shared/ui/select-menu";
import { FinanceSubmitButton } from "./finance-submit-button";

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

const currency = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});

const paymentMethodOptions: SelectMenuOption[] = [
	"Efectivo",
	"Transferencia",
	"Depósito",
	"Cheque",
	"Tarjeta",
].map((method) => ({ value: method, label: method }));

const expenseTypeOptions: SelectMenuOption[] = [
	{
		value: "Mano de obra",
		label: "Mano de obra",
		description: "Planillas, jornales y destajos",
	},
	{
		value: "Servicio",
		label: "Servicio",
		description: "Fletes, alquiler de maquinaria, subcontratos",
	},
	{
		value: "Material",
		label: "Material sin orden de compra",
		description: "Compras menores pagadas al momento",
	},
	{ value: "Supervisión", label: "Supervisión" },
	{ value: "Trabajo adicional", label: "Trabajo adicional" },
	{ value: "Gasto externo", label: "Gasto externo distinto de obra" },
	{ value: "Otro", label: "Otro" },
];

const documentTypeOptions: SelectMenuOption[] = [
	{ value: "FACTURA", label: "Factura" },
	{ value: "RECIBO", label: "Recibo" },
	{ value: "OTRO", label: "Otro comprobante" },
];

/** Etiqueta visible ligada al control por id (el selector no es un <input>). */
function Field({
	label,
	hint,
	children,
	labelId,
}: {
	label: string;
	hint?: string;
	children: ReactNode;
	labelId?: string;
}) {
	return (
		<div className="block">
			<span className={labelClass} id={labelId}>
				{label}
			</span>
			{children}
			{hint ? (
				<small className="mt-1 block text-xs text-[#6b7974]">{hint}</small>
			) : null}
		</div>
	);
}

function SectionTitle({
	title,
	description,
}: {
	title: string;
	description?: string;
}) {
	return (
		<div className="sm:col-span-2 border-b border-[#e1e6e1] pb-2 pt-1 first:pt-0">
			<h3 className="finance-entry-section text-sm font-semibold text-[#1d2a27]">
				{title}
			</h3>
			{description ? (
				<p className="mt-0.5 text-xs text-[#66746f]">{description}</p>
			) : null}
		</div>
	);
}

function Callout({
	children,
	tone = "info",
}: {
	children: ReactNode;
	tone?: "info" | "warning";
}) {
	return (
		<div
			className={`finance-callout sm:col-span-2 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
				tone === "warning"
					? "border-[#ecd9a6] bg-[#fff8e6] text-[#5b4512]"
					: "border-[#cfdcea] bg-[#eef4fa] text-[#2c3d4f]"
			}`}
			data-tone={tone}
		>
			<Info aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
			<div className="min-w-0 leading-relaxed">{children}</div>
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
			// Un Escape ya atendido por un selector interno no cierra el diálogo.
			if (event.key === "Escape" && !event.defaultPrevented) onClose();
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

function DialogFooter({
	onClose,
	submit,
}: {
	onClose: () => void;
	submit: ReactNode;
}) {
	return (
		<footer className="flex justify-end gap-2 border-t border-[#d8ddd7] bg-white px-5 py-4">
			<button
				className="finance-entry-cancel focus-ring h-11 rounded-lg border border-[#cbd3cc] bg-white px-4 font-semibold text-[#26312e]"
				onClick={onClose}
				type="button"
			>
				Cancelar
			</button>
			{submit}
		</footer>
	);
}

/** Campos opcionales plegados para que el formulario no abrume. */
function OptionalDetails({
	summary,
	children,
}: {
	summary: string;
	children: ReactNode;
}) {
	return (
		<details className="finance-optional group sm:col-span-2 rounded-xl border border-[#dde2dc] bg-white">
			<summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#2b3835]">
				{summary}
				<ChevronDown
					aria-hidden="true"
					className="shrink-0 transition group-open:rotate-180"
					size={17}
				/>
			</summary>
			<div className="grid gap-4 border-t border-[#e6e9e5] p-4 sm:grid-cols-2">
				{children}
			</div>
		</details>
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
	const ids = useId();
	const [dialog, setDialog] = useState<DialogKind>(null);
	const [expenseFileName, setExpenseFileName] = useState("");
	const [invoiceFileName, setInvoiceFileName] = useState("");
	const invoiceableOrders = invoiceOrders.filter(
		(order) => order.available > 0,
	);
	const [invoiceOrderId, setInvoiceOrderId] = useState(
		invoiceableOrders[0]?.id ?? "",
	);
	const [expenseType, setExpenseType] = useState("");
	const [expenseSection, setExpenseSection] = useState("");
	const [expenseMethod, setExpenseMethod] = useState("");
	const [documentType, setDocumentType] = useState("");
	const [paymentSection, setPaymentSection] = useState("");
	const [paymentMethod, setPaymentMethod] = useState("Transferencia");
	const canInvoice = invoiceableOrders.length > 0;
	const selectedInvoiceOrder = invoiceOrders.find(
		(order) => order.id === invoiceOrderId,
	);
	const close = () => {
		setDialog(null);
		setExpenseFileName("");
		setInvoiceFileName("");
		setExpenseType("");
		setExpenseSection("");
		setExpenseMethod("");
		setDocumentType("");
		setPaymentSection("");
		setPaymentMethod("Transferencia");
	};

	const invoiceOrderOptions: SelectMenuOption[] = invoiceableOrders.map(
		(order) => ({
			value: order.id,
			label: `${order.number} · ${order.supplier.businessName}`,
			description: `Por facturar ${currency.format(order.available)} de ${currency.format(order.total)}`,
		}),
	);
	const expenseSectionOptions: SelectMenuOption[] = [
		{ value: "", label: "Sin renglón asignado" },
		...sections.map((section) => ({
			value: section.code,
			label: `${section.code} · ${section.name}`,
		})),
	];
	const paymentSectionOptions: SelectMenuOption[] = [
		{
			value: "",
			label: "Abono general del proyecto",
			description: "No se aplica a un renglón en particular",
		},
		...sections.map((section) => ({
			value: section.id,
			label: `Renglón ${section.code} · ${section.name}`,
			description: `Precio al cliente hasta ${currency.format(Number(section.total))}`,
		})),
	];

	return (
		<>
			{/* Mismos botones por color que la barra de Compras. */}
			<div className="flex flex-wrap items-center gap-2">
				<button
					className="purchases-button purchases-button--red focus-ring"
					disabled={!canInvoice}
					onClick={() => setDialog("invoice")}
					title={
						canInvoice
							? "Factura del proveedor por material comprado con orden de compra"
							: "No hay órdenes de compra emitidas con saldo por facturar. Emítelas desde Compras."
					}
					type="button"
				>
					<FileCheck2 aria-hidden="true" size={17} /> Factura de compra
				</button>
				<button
					className="purchases-button purchases-button--amber focus-ring"
					onClick={() => setDialog("expense")}
					title="Mano de obra, fletes, servicios o compras menores sin orden de compra"
					type="button"
				>
					<ReceiptText aria-hidden="true" size={17} /> Gasto directo
				</button>
				<button
					className="purchases-button purchases-button--green focus-ring"
					onClick={() => setDialog("payment")}
					title="Dinero que el cliente pagó a HM"
					type="button"
				>
					<Banknote aria-hidden="true" size={17} /> Abono del cliente
				</button>
			</div>

			{dialog === "invoice" ? (
				<ModalShell
					description="Para material comprado con orden de compra en Compras."
					icon={ShoppingCart}
					onClose={close}
					title="Factura de compra"
				>
					<form
						action={createPurchaseInvoiceAction}
						className="finance-entry-form flex min-h-0 flex-1 flex-col"
					>
						<input name="projectId" type="hidden" value={projectId} />
						<div className="overflow-y-auto p-5 sm:p-6">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="sm:col-span-2">
									<Field label="Orden de compra" labelId={`${ids}-order`}>
										<SelectMenu
											aria-labelledby={`${ids}-order`}
											emptyMessage="Ninguna orden coincide."
											name="purchaseOrderId"
											onChange={setInvoiceOrderId}
											options={invoiceOrderOptions}
											placeholder="Elegir orden emitida"
											searchPlaceholder="Buscar por número o proveedor"
											searchable
											value={invoiceOrderId}
										/>
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
												Total de la orden
											</small>
											<strong className="mt-1 block text-sm tabular-nums text-[#172023]">
												{currency.format(selectedInvoiceOrder.total)}
											</strong>
										</div>
										<div>
											<small className="block text-[11px] font-semibold uppercase tracking-[.07em] text-[#65736e]">
												Por facturar
											</small>
											<strong className="mt-1 block text-sm tabular-nums text-[#167154]">
												{currency.format(selectedInvoiceOrder.available)}
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
								<Field
									hint="Puede ser parcial si el proveedor factura por entregas."
									label="Total facturado"
								>
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
								<label className="group grid cursor-pointer content-start gap-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-[#53615c]">
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
									<Field label="Observaciones (opcional)">
										<textarea
											className={`${inputClass} min-h-20 py-3`}
											name="notes"
										/>
									</Field>
								</div>
								<Callout>
									Después de guardarla, los pagos al proveedor se registran en{" "}
									<strong>Cuentas por pagar</strong>.
								</Callout>
							</div>
						</div>
						<DialogFooter
							onClose={close}
							submit={
								<FinanceSubmitButton
									className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--brand-red)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(200,32,47,0.22)]"
									icon={<FileCheck2 size={17} />}
									label="Guardar factura"
								/>
							}
						/>
					</form>
				</ModalShell>
			) : null}

			{dialog === "expense" ? (
				<ModalShell
					description="Lo que se paga sin orden de compra: mano de obra, fletes, servicios o compras menores."
					icon={ReceiptText}
					onClose={close}
					title="Gasto directo"
				>
					<form
						action={createExpenseAction}
						className="finance-entry-form flex min-h-0 flex-1 flex-col"
					>
						<input name="projectId" type="hidden" value={projectId} />
						<div className="overflow-y-auto p-5 sm:p-6">
							<div className="grid gap-4 sm:grid-cols-2">
								<Callout tone="warning">
									<p>
										<strong>¿Es material comprado con orden de compra?</strong>{" "}
										No lo registres aquí: usa “Factura de compra” para no
										duplicar el gasto. Si el material debe entrar a bodega,
										cómpralo desde Compras.
									</p>
									<div className="mt-2 flex flex-wrap gap-2">
										{canInvoice ? (
											<button
												className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[#d9c48d] bg-white px-3 py-1.5 text-xs font-semibold"
												onClick={() => setDialog("invoice")}
												type="button"
											>
												<FileCheck2 aria-hidden="true" size={14} /> Ir a Factura
												de compra
											</button>
										) : null}
										<a
											className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[#d9c48d] bg-white px-3 py-1.5 text-xs font-semibold"
											href="/purchases"
										>
											Abrir Compras <ArrowRight aria-hidden="true" size={14} />
										</a>
									</div>
								</Callout>

								<SectionTitle title="Qué se pagó" />
								<div className="sm:col-span-2">
									<Field label="Descripción del gasto">
										<input
											className={inputClass}
											minLength={3}
											name="description"
											placeholder="Ej. Planilla semana 32, flete de arena, renta de mezcladora"
											required
										/>
									</Field>
								</div>
								<Field label="Tipo de gasto" labelId={`${ids}-type`}>
									<SelectMenu
										aria-labelledby={`${ids}-type`}
										name="type"
										onChange={setExpenseType}
										options={expenseTypeOptions}
										placeholder="Elegir tipo"
										value={expenseType}
									/>
								</Field>
								<Field
									label="Renglón del presupuesto"
									labelId={`${ids}-section`}
								>
									<SelectMenu
										aria-labelledby={`${ids}-section`}
										emptyMessage="Ningún renglón coincide."
										name="budgetSectionNo"
										onChange={setExpenseSection}
										options={expenseSectionOptions}
										placeholder="Sin renglón asignado"
										searchPlaceholder="Buscar renglón"
										searchable={sections.length > 6}
										value={expenseSection}
									/>
								</Field>

								<SectionTitle title="Monto y pago" />
								<Field label="Total del gasto">
									<input
										className={inputClass}
										inputMode="decimal"
										min="0.01"
										name="subtotal"
										placeholder="0.00"
										required
										step="0.01"
										type="number"
									/>
								</Field>
								<Field label="Fecha">
									<input
										className={inputClass}
										defaultValue={today}
										name="expenseDate"
										required
										type="date"
									/>
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
								<Field label="Unidad (opcional)">
									<input
										className={inputClass}
										name="unit"
										placeholder="jornal, viaje, día, global"
									/>
								</Field>
								<Field label="Medio de pago" labelId={`${ids}-method`}>
									<SelectMenu
										aria-labelledby={`${ids}-method`}
										name="paymentMethod"
										onChange={setExpenseMethod}
										options={paymentMethodOptions}
										placeholder="Elegir medio"
										value={expenseMethod}
									/>
								</Field>
								<Field label="Pagado a (opcional)">
									<input
										className={inputClass}
										name="vendor"
										placeholder="Empresa o persona que cobró"
									/>
								</Field>

								<SectionTitle
									description="Si adjuntas el archivo, indica también su número."
									title="Comprobante (opcional)"
								/>
								<Field label="Tipo de comprobante" labelId={`${ids}-doc`}>
									<SelectMenu
										aria-labelledby={`${ids}-doc`}
										name="documentType"
										onChange={setDocumentType}
										options={documentTypeOptions}
										placeholder="Sin comprobante"
										value={documentType}
									/>
								</Field>
								<Field label="Número de factura o recibo">
									<input
										className={inputClass}
										name="documentNumber"
										placeholder="Ej. FACE-63A9-001245"
										required={Boolean(expenseFileName)}
									/>
								</Field>
								<label className="sm:col-span-2 group flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#9db4a8] bg-white px-3 py-2 text-sm transition hover:border-[#25815f] hover:shadow-[0_8px_20px_rgba(31,122,91,0.11)]">
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
											setExpenseFileName(event.target.files?.[0]?.name ?? "")
										}
										type="file"
									/>
								</label>

								<OptionalDetails summary="Más detalles (fase, actividad, notas)">
									<Field label="Fase">
										<input
											className={inputClass}
											name="phase"
											placeholder="Fase 1"
										/>
									</Field>
									<Field label="Actividad o detalle">
										<input
											className={inputClass}
											name="activity"
											placeholder="Actividad relacionada"
										/>
									</Field>
									<div className="sm:col-span-2">
										<Field label="Notas">
											<textarea
												className={`${inputClass} min-h-20 py-3`}
												name="notes"
											/>
										</Field>
									</div>
								</OptionalDetails>
							</div>
						</div>
						<DialogFooter
							onClose={close}
							submit={
								<FinanceSubmitButton
									className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--brand-red)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(200,32,47,0.22)]"
									icon={<FilePlus2 size={17} />}
									label="Guardar gasto"
								/>
							}
						/>
					</form>
				</ModalShell>
			) : null}

			{dialog === "payment" ? (
				<ModalShell
					description="Dinero que el cliente pagó a HM por este proyecto."
					icon={Banknote}
					onClose={close}
					title="Abono del cliente"
				>
					<form
						action={createClientPaymentAction}
						className="finance-entry-form flex min-h-0 flex-1 flex-col"
					>
						<input name="projectId" type="hidden" value={projectId} />
						<div className="overflow-y-auto p-5 sm:p-6">
							<div className="grid gap-4 sm:grid-cols-2">
								<Callout>
									Es un <strong>ingreso</strong>. Los pagos que HM hace a
									proveedores se registran en <strong>Cuentas por pagar</strong>
									, no aquí.
								</Callout>
								<Field label="Monto recibido">
									<input
										className={inputClass}
										inputMode="decimal"
										min="0.01"
										name="amount"
										placeholder="0.00"
										required
										step="0.01"
										type="number"
									/>
								</Field>
								<Field label="Fecha">
									<input
										className={inputClass}
										defaultValue={today}
										name="paymentDate"
										required
										type="date"
									/>
								</Field>
								<Field label="Medio" labelId={`${ids}-payment-method`}>
									<SelectMenu
										aria-labelledby={`${ids}-payment-method`}
										name="method"
										onChange={setPaymentMethod}
										options={paymentMethodOptions}
										value={paymentMethod}
									/>
								</Field>
								<Field label="Referencia (opcional)">
									<input
										className={inputClass}
										name="reference"
										placeholder="Boleta, recibo o cheque"
									/>
								</Field>
								<div className="sm:col-span-2">
									<Field
										hint="Cada renglón se cobra a su precio al cliente: su costo más su parte de encargado, imprevistos, administración, utilidad e IVA."
										label="Aplicar a"
										labelId={`${ids}-payment-section`}
									>
										<SelectMenu
											aria-labelledby={`${ids}-payment-section`}
											emptyMessage="Ningún renglón coincide."
											name="budgetSectionId"
											onChange={setPaymentSection}
											options={paymentSectionOptions}
											searchPlaceholder="Buscar renglón"
											searchable={sections.length > 6}
											value={paymentSection}
										/>
									</Field>
								</div>
								<div className="sm:col-span-2">
									<Field label="Concepto (opcional)">
										<input
											className={inputClass}
											name="concept"
											placeholder="Anticipo, abono 1, estimación..."
										/>
									</Field>
								</div>
								<OptionalDetails summary="Más detalles (número de abono, observaciones)">
									<Field
										hint="Si lo dejas vacío se genera automáticamente."
										label="Número de abono"
									>
										<input
											className={inputClass}
											name="paymentNumber"
											placeholder="AB-000001"
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
								</OptionalDetails>
							</div>
						</div>
						<DialogFooter
							onClose={close}
							submit={
								<FinanceSubmitButton
									className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--success)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(31,122,91,0.22)]"
									icon={<Banknote size={17} />}
									label="Guardar abono"
								/>
							}
						/>
					</form>
				</ModalShell>
			) : null}
		</>
	);
}
