"use client";

import {
	Banknote,
	ChevronDown,
	FileCheck2,
	FilePlus2,
	FileUp,
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
import { HelpTip } from "@/shared/ui/help-tip";
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
	"text-[11px] font-semibold uppercase tracking-[0.08em] text-[#53615c]";

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
	{ value: "Mano de obra", label: "Mano de obra" },
	{ value: "Servicio", label: "Servicio o flete" },
	{ value: "Material", label: "Material (compra menor)" },
	{ value: "Supervisión", label: "Supervisión" },
	{ value: "Trabajo adicional", label: "Trabajo adicional" },
	{ value: "Gasto externo", label: "Gasto externo" },
	{ value: "Otro", label: "Otro" },
];

const documentTypeOptions: SelectMenuOption[] = [
	{ value: "", label: "Sin comprobante" },
	{ value: "FACTURA", label: "Factura" },
	{ value: "RECIBO", label: "Recibo" },
	{ value: "OTRO", label: "Otro" },
];

function Field({
	label,
	help,
	children,
	labelId,
	className,
}: {
	label: string;
	help?: ReactNode;
	children: ReactNode;
	labelId?: string;
	className?: string;
}) {
	return (
		<div className={className}>
			<div className="mb-1.5 flex items-center gap-1.5">
				<span className={labelClass} id={labelId}>
					{label}
				</span>
				{help ? <HelpTip label={`Ayuda: ${label}`}>{help}</HelpTip> : null}
			</div>
			{children}
		</div>
	);
}

function FileField({
	name,
	fileName,
	onFile,
	required = false,
}: {
	name: string;
	fileName: string;
	onFile: (name: string) => void;
	required?: boolean;
}) {
	return (
		<label className="finance-invoice-upload flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#9db4a8] bg-white px-3 text-sm text-[#263330] transition hover:border-[#25815f]">
			{fileName ? (
				<FileCheck2 className="shrink-0 text-[#167154]" size={16} />
			) : (
				<FileUp className="shrink-0" size={16} />
			)}
			<span className="truncate">{fileName || "Adjuntar PDF o foto"}</span>
			<input
				accept=".pdf,.png,.jpg,.jpeg,.webp"
				className="sr-only"
				name={name}
				onChange={(event) => onFile(event.target.files?.[0]?.name ?? "")}
				required={required}
				type="file"
			/>
		</label>
	);
}

function ModalShell({
	title,
	description,
	help,
	icon: Icon,
	onClose,
	children,
}: {
	title: string;
	description: string;
	help?: ReactNode;
	icon: typeof Banknote;
	onClose: () => void;
	children: ReactNode;
}) {
	useEffect(() => {
		const closeOnEscape = (event: KeyboardEvent) => {
			// Un Escape ya atendido por un selector o ayuda no cierra el diálogo.
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
				className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-[#f8f8f5] shadow-[0_36px_100px_rgba(9,16,18,0.38),0_4px_20px_rgba(9,16,18,0.18)]"
				role="dialog"
			>
				<header className="relative overflow-hidden border-b border-white/10 bg-[#182225] px-5 py-4 text-white sm:px-6">
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(200,32,47,0.2),transparent_38%)]" />
					<div className="relative flex items-center justify-between gap-4">
						<div className="flex min-w-0 items-center gap-3">
							<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-red)] shadow-[0_10px_24px_rgba(200,32,47,0.28)]">
								<Icon aria-hidden="true" size={19} />
							</span>
							<div className="min-w-0">
								<div className="flex items-center gap-1.5">
									<h2 className="text-lg font-semibold">{title}</h2>
									{help ? (
										<span className="finance-header-help">
											<HelpTip label={`Ayuda: ${title}`}>{help}</HelpTip>
										</span>
									) : null}
								</div>
								<p className="text-sm text-white/70">{description}</p>
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

/** Campos opcionales plegados: el formulario muestra solo lo esencial. */
function MoreDetails({ children }: { children: ReactNode }) {
	return (
		<details className="finance-optional group sm:col-span-2 rounded-xl border border-[#dde2dc] bg-white">
			<summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#2b3835]">
				Más detalles
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
	const invoiceableOrders = invoiceOrders.filter((order) => order.available > 0);
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
			description: `Por facturar ${currency.format(order.available)}`,
		}),
	);
	const expenseSectionOptions: SelectMenuOption[] = [
		{ value: "", label: "Sin renglón" },
		...sections.map((section) => ({
			value: section.code,
			label: `${section.code} · ${section.name}`,
		})),
	];
	const paymentSectionOptions: SelectMenuOption[] = [
		{ value: "", label: "Abono general" },
		...sections.map((section) => ({
			value: section.id,
			label: `${section.code} · ${section.name}`,
			description: `Hasta ${currency.format(Number(section.total))}`,
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
							? "Factura de una orden de compra"
							: "No hay órdenes de compra emitidas por facturar"
					}
					type="button"
				>
					<FileCheck2 aria-hidden="true" size={17} /> Factura de compra
				</button>
				<button
					className="purchases-button purchases-button--amber focus-ring"
					onClick={() => setDialog("expense")}
					title="Pagos sin orden de compra"
					type="button"
				>
					<ReceiptText aria-hidden="true" size={17} /> Gasto directo
				</button>
				<button
					className="purchases-button purchases-button--green focus-ring"
					onClick={() => setDialog("payment")}
					title="Dinero recibido del cliente"
					type="button"
				>
					<Banknote aria-hidden="true" size={17} /> Abono del cliente
				</button>
			</div>

			{dialog === "invoice" ? (
				<ModalShell
					description="De una orden emitida en Compras"
					help="Los pagos al proveedor se registran después en Cuentas por pagar."
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
								<Field
									className="sm:col-span-2"
									label="Orden de compra"
									labelId={`${ids}-order`}
								>
									<SelectMenu
										aria-labelledby={`${ids}-order`}
										emptyMessage="Ninguna orden coincide."
										name="purchaseOrderId"
										onChange={setInvoiceOrderId}
										options={invoiceOrderOptions}
										placeholder="Elegir orden"
										searchPlaceholder="Buscar orden o proveedor"
										searchable
										value={invoiceOrderId}
									/>
								</Field>
								<Field label="Número de factura">
									<input
										className={inputClass}
										name="documentNumber"
										placeholder="Serie y número"
										required
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
								<Field
									help={
										selectedInvoiceOrder
											? `Pendiente de facturar: ${currency.format(selectedInvoiceOrder.available)} de ${currency.format(selectedInvoiceOrder.total)}. Puede ser parcial.`
											: "Puede ser parcial si el proveedor factura por entregas."
									}
									label="Monto"
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
								<Field label="Archivo">
									<FileField
										fileName={invoiceFileName}
										name="documentFile"
										onFile={setInvoiceFileName}
										required
									/>
								</Field>
								<MoreDetails>
									<Field className="sm:col-span-2" label="Observaciones">
										<textarea
											className={`${inputClass} min-h-20 py-3`}
											name="notes"
										/>
									</Field>
								</MoreDetails>
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
					description="Pagos sin orden de compra"
					help={
						<>
							Mano de obra, fletes, servicios o compras menores.
							<br />
							Si el material se compró con orden de compra, usa{" "}
							<strong>Factura de compra</strong> para no duplicarlo.
						</>
					}
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
								<Field className="sm:col-span-2" label="Descripción">
									<input
										className={inputClass}
										minLength={3}
										name="description"
										placeholder="Ej. Planilla semana 32"
										required
									/>
								</Field>
								<Field label="Monto">
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
								<Field label="Tipo" labelId={`${ids}-type`}>
									<SelectMenu
										aria-labelledby={`${ids}-type`}
										name="type"
										onChange={setExpenseType}
										options={expenseTypeOptions}
										placeholder="Elegir tipo"
										value={expenseType}
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
								<Field
									className="sm:col-span-2"
									help="Permite comparar lo gastado contra lo presupuestado."
									label="Renglón del presupuesto"
									labelId={`${ids}-section`}
								>
									<SelectMenu
										aria-labelledby={`${ids}-section`}
										emptyMessage="Ningún renglón coincide."
										name="budgetSectionNo"
										onChange={setExpenseSection}
										options={expenseSectionOptions}
										searchPlaceholder="Buscar renglón"
										searchable={sections.length > 6}
										value={expenseSection}
									/>
								</Field>
								<MoreDetails>
									<Field label="Pagado a">
										<input
											className={inputClass}
											name="vendor"
											placeholder="Empresa o persona"
										/>
									</Field>
									<Field label="Comprobante" labelId={`${ids}-doc`}>
										<SelectMenu
											aria-labelledby={`${ids}-doc`}
											name="documentType"
											onChange={setDocumentType}
											options={documentTypeOptions}
											value={documentType}
										/>
									</Field>
									<Field label="Número de comprobante">
										<input
											className={inputClass}
											name="documentNumber"
											placeholder="Serie y número"
											required={Boolean(expenseFileName)}
										/>
									</Field>
									<Field label="Archivo">
										<FileField
											fileName={expenseFileName}
											name="documentFile"
											onFile={setExpenseFileName}
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
									<Field label="Unidad">
										<input
											className={inputClass}
											name="unit"
											placeholder="jornal, viaje, global"
										/>
									</Field>
									<Field label="Fase">
										<input
											className={inputClass}
											name="phase"
											placeholder="Fase 1"
										/>
									</Field>
									<Field label="Actividad">
										<input className={inputClass} name="activity" />
									</Field>
									<Field className="sm:col-span-2" label="Notas">
										<textarea
											className={`${inputClass} min-h-20 py-3`}
											name="notes"
										/>
									</Field>
								</MoreDetails>
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
					description="Dinero recibido del cliente"
					help="Es un ingreso. Los pagos a proveedores van en Cuentas por pagar."
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
								<Field label="Monto">
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
								<Field label="Referencia">
									<input
										className={inputClass}
										name="reference"
										placeholder="Boleta o cheque"
									/>
								</Field>
								<Field
									className="sm:col-span-2"
									help="Cada renglón se cobra a su precio al cliente: costo más encargado, imprevistos, administración, utilidad e IVA."
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
								<MoreDetails>
									<Field label="Concepto">
										<input
											className={inputClass}
											name="concept"
											placeholder="Anticipo, abono 1..."
										/>
									</Field>
									<Field
										help="Si lo dejas vacío se genera solo."
										label="Número de abono"
									>
										<input
											className={inputClass}
											name="paymentNumber"
											placeholder="AB-000001"
										/>
									</Field>
									<Field className="sm:col-span-2" label="Observaciones">
										<textarea
											className={`${inputClass} min-h-20 py-3`}
											name="observations"
										/>
									</Field>
								</MoreDetails>
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
