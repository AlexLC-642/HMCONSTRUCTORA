"use client";

import {
	ArrowRight,
	Building2,
	CalendarClock,
	Check,
	ChevronRight,
	CircleDollarSign,
	ClipboardCheck,
	FileCheck2,
	Mail,
	MapPin,
	PackageCheck,
	Pencil,
	Phone,
	Plus,
	ReceiptText,
	Search,
	ShieldCheck,
	ShoppingCart,
	Store,
	Truck,
	UserRound,
	Warehouse,
	X,
} from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
	cancelPurchaseOrderAction,
	createPurchaseOrderAction,
	issuePurchaseOrderAction,
	type PurchaseOrderFormState,
	receivePurchaseOrderAction,
	type SupplierFormState,
	saveSupplierAction,
	setSupplierActiveAction,
} from "../application/actions";
import type { getPurchaseWorkspace } from "../application/queries";
import { purchaseOrderStatusLabels } from "../domain/validation";

type WorkspaceData = Awaited<ReturnType<typeof getPurchaseWorkspace>>;
type Supplier = WorkspaceData["suppliers"][number];
type Order = WorkspaceData["orders"][number];
type Requisition = WorkspaceData["readyRequisitions"][number];
type View = "orders" | "suppliers" | "requisitions";
type FlowState = "done" | "active" | "pending" | "stopped";

function FlowStep({
	icon: Icon,
	label,
	state,
}: {
	icon: typeof ShoppingCart;
	label: string;
	state: FlowState;
}) {
	const doneLabels: Record<string, string> = {
		Origen: "Definido",
		Solicitud: "Autorizada",
		"Compra directa": "Registrada",
		Proveedor: "Asignado",
		Orden: "Emitida",
		Recepción: "Recibida",
		Finanzas: "Registrado",
	};
	const activeLabels: Record<string, string> = {
		Origen: "Por definir",
		Solicitud: "Por autorizar",
		"Compra directa": "En preparación",
		Proveedor: "Por agregar",
		Orden: "En curso",
		Recepción: "En recepción",
		Finanzas: "Por registrar",
	};
	const stateLabel =
		state === "done"
			? (doneLabels[label] ?? "Completo")
			: state === "active"
				? (activeLabels[label] ?? "En curso")
				: state === "stopped"
					? "Anulado"
					: "Pendiente";
	return (
		<div data-state={state} title={`${label}: ${stateLabel}`}>
			<span>
				<Icon aria-hidden="true" size={17} />
			</span>
			<strong>{label}</strong>
			<small>{stateLabel}</small>
		</div>
	);
}

const monthLabels = [
	"ene",
	"feb",
	"mar",
	"abr",
	"may",
	"jun",
	"jul",
	"ago",
	"sep",
	"oct",
	"nov",
	"dic",
];

function formatNumber(value: number, decimals = 2) {
	const sign = value < 0 ? "-" : "";
	const [whole, fraction] = Math.abs(value).toFixed(decimals).split(".");
	const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return fraction === undefined
		? `${sign}${grouped}`
		: `${sign}${grouped}.${fraction}`;
}

function formatCurrency(value: number) {
	return `Q ${formatNumber(value)}`;
}

function formatCompactCurrency(value: number) {
	if (Math.abs(value) >= 1_000_000)
		return `Q ${formatNumber(value / 1_000_000, 1)} M`;
	if (Math.abs(value) >= 1_000)
		return `Q ${formatNumber(value / 1_000, 1)} mil`;
	return `Q ${formatNumber(value, 0)}`;
}

function formatDate(value: string | null) {
	if (!value) return "Sin fecha";
	const [year, month, day] = value.slice(0, 10).split("-");
	return `${day} ${monthLabels[Number(month) - 1]} ${year}`;
}

function destinationLabel(
	requisition: Requisition | Order["requisition"] | null,
	order?: Order,
) {
	if (order?.project) return `${order.project.code} · ${order.project.name}`;
	if (order?.warehouse) return `Bodega · ${order.warehouse.name}`;
	if (requisition && "project" in requisition && requisition.project) {
		return `${requisition.project.code} · ${requisition.project.name}`;
	}
	if (requisition && "warehouse" in requisition && requisition.warehouse) {
		return `Bodega · ${requisition.warehouse.name}`;
	}
	return "Destino pendiente";
}

function SubmitButton({
	children,
	tone = "primary",
	disabled = false,
}: {
	children: React.ReactNode;
	tone?: "primary" | "danger" | "neutral";
	disabled?: boolean;
}) {
	const { pending } = useFormStatus();
	return (
		<button
			className="purchases-submit focus-ring"
			data-tone={tone}
			disabled={pending || disabled}
			type="submit"
		>
			{pending ? <span className="purchases-submit__loader" /> : null}
			{pending ? "Procesando" : children}
		</button>
	);
}

type PaymentType = "IMMEDIATE" | "ON_DELIVERY" | "CREDIT";

const paymentTypeLabels: Record<PaymentType, string> = {
	IMMEDIATE: "Al contado",
	ON_DELIVERY: "Contra entrega",
	CREDIT: "A crédito",
};

function paymentDetail(order: Order) {
	const label = paymentTypeLabels[order.paymentType];
	return order.paymentType === "CREDIT" && order.paymentDueDate
		? `${label} · vence ${formatDate(order.paymentDueDate)}`
		: label;
}

const creditStatusLabels: Record<string, string> = {
	PENDING_INVOICE: "Factura pendiente",
	PENDING: "Pendiente de pago",
	PARTIAL: "Abono parcial",
	PAID: "Pagada",
	OVERDUE: "Pago vencido",
};

function creditStatusLabel(order: Order) {
	return order.creditStatus
		? creditStatusLabels[order.creditStatus]
		: "Sin seguimiento";
}

function PaymentConditionFields({
	today,
	errorFor,
	creditAvailable = true,
}: {
	today: string;
	errorFor: (field: string) => string | undefined;
	creditAvailable?: boolean;
}) {
	const [paymentType, setPaymentType] = useState<PaymentType>("IMMEDIATE");
	useEffect(() => {
		if (!creditAvailable && paymentType === "CREDIT") {
			setPaymentType("IMMEDIATE");
		}
	}, [creditAvailable, paymentType]);
	const descriptions: Record<PaymentType, string> = {
		IMMEDIATE: "La compra no utiliza crédito.",
		ON_DELIVERY: "El pago queda acordado para la recepción.",
		CREDIT: "Indica la fecha límite acordada.",
	};

	return (
		<>
			<label>
				<span>Condición de pago</span>
				<select
					aria-invalid={Boolean(errorFor("paymentType"))}
					name="paymentType"
					onChange={(event) =>
						setPaymentType(event.target.value as PaymentType)
					}
					value={paymentType}
				>
					<option value="IMMEDIATE">Pago al contado</option>
					<option value="ON_DELIVERY">Pago contra entrega</option>
					<option disabled={!creditAvailable} value="CREDIT">
						{creditAvailable
							? "Compra a crédito"
							: "Compra a crédito · requiere proyecto"}
					</option>
				</select>
				<small className="purchases-field-hint">
					{descriptions[paymentType]}
				</small>
				{errorFor("paymentType") ? (
					<small className="purchases-field-error">
						{errorFor("paymentType")}
					</small>
				) : null}
			</label>
			{paymentType === "CREDIT" ? (
				<label className="purchases-payment-due">
					<span>Vencimiento del pago</span>
					<input
						aria-invalid={Boolean(errorFor("paymentDueDate"))}
						min={today}
						name="paymentDueDate"
						required
						type="date"
					/>
					{errorFor("paymentDueDate") ? (
						<small className="purchases-field-error">
							{errorFor("paymentDueDate")}
						</small>
					) : null}
				</label>
			) : null}
		</>
	);
}

function Metric({
	label,
	value,
	detail,
	icon: Icon,
	tone,
	onActivate,
}: {
	label: string;
	value: string;
	detail: string;
	icon: typeof ShoppingCart;
	tone: "red" | "amber" | "green" | "steel";
	onActivate: () => void;
}) {
	return (
		<button
			aria-label={`Abrir ${label.toLowerCase()}`}
			className="purchases-kpi focus-ring"
			data-tone={tone}
			onClick={onActivate}
			type="button"
		>
			<div className="purchases-kpi__copy">
				<span>{label}</span>
				<strong>{value}</strong>
				<small>{detail}</small>
			</div>
			<div className="purchases-kpi__mark">
				<Icon aria-hidden="true" size={20} />
			</div>
		</button>
	);
}

function StatusBadge({ status }: { status: Order["status"] }) {
	return (
		<span className="purchases-status" data-status={status}>
			{purchaseOrderStatusLabels[status]}
		</span>
	);
}

function getOrderTrace(order: Order) {
	const receivedLines = order.items.filter(
		(item) => item.receivedQuantity >= item.quantity,
	).length;
	const lineSummary = `${receivedLines}/${order.items.length} renglones recibidos`;
	const invoiceSummary = `${order.invoiceCount} ${order.invoiceCount === 1 ? "factura" : "facturas"}`;

	return `${lineSummary} · ${invoiceSummary}`;
}

function ModalShell({
	title,
	description,
	onClose,
	children,
}: {
	title: string;
	description: string;
	onClose: () => void;
	children: React.ReactNode;
}) {
	useEffect(() => {
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
		window.addEventListener("keydown", close);
		return () => {
			document.body.style.overflow = previous;
			window.removeEventListener("keydown", close);
		};
	}, [onClose]);

	return (
		<div className="purchases-modal" role="presentation">
			<section
				aria-describedby="purchase-modal-description"
				aria-modal="true"
				className="purchases-modal__panel"
				role="dialog"
			>
				<header className="purchases-modal__header">
					<div className="purchases-modal__mark">
						<ShoppingCart aria-hidden="true" size={21} />
					</div>
					<div>
						<h2>{title}</h2>
						<p id="purchase-modal-description">{description}</p>
					</div>
					<button
						aria-label="Cerrar"
						className="purchases-modal__close focus-ring"
						onClick={onClose}
						type="button"
					>
						<X aria-hidden="true" size={20} />
					</button>
				</header>
				<div className="purchases-modal__body">{children}</div>
			</section>
		</div>
	);
}

function SupplierForm({
	supplier,
	onClose,
}: {
	supplier: Supplier | null;
	onClose: () => void;
}) {
	const initialState: SupplierFormState = { status: "idle", message: "" };
	const [state, formAction] = useActionState(saveSupplierAction, initialState);
	const errorFor = (field: string) => state.errors?.[field]?.[0];
	const fieldId = (field: string) =>
		`supplier-${supplier?.id ?? "new"}-${field}`;

	return (
		<ModalShell
			description="Identificación y medios de contacto del proveedor."
			onClose={onClose}
			title={supplier ? "Editar proveedor" : "Nuevo proveedor"}
		>
			<form action={formAction} className="purchases-form">
				<input name="id" type="hidden" value={supplier?.id ?? ""} />
				<input
					defaultValue={supplier?.tradeName ?? ""}
					name="tradeName"
					type="hidden"
				/>
				<div className="purchases-form__context">
					<div>
						<ShoppingCart aria-hidden="true" size={19} />
						<span>
							<strong>Ficha del proveedor</strong>
							<small>
								Estos datos identifican al proveedor en compras y documentos.
							</small>
						</span>
					</div>
					<span>NIT y un medio de contacto obligatorios</span>
				</div>
				{state.status === "error" ? (
					<div
						aria-live="polite"
						className="purchases-form__error"
						role="alert"
					>
						<strong>No se guardó el proveedor</strong>
						<span>{state.message}</span>
					</div>
				) : null}
				<div className="purchases-form__section purchases-form__section--wide">
					<div className="purchases-form__section-title">
						<Building2 aria-hidden="true" size={18} />
						<div>
							<h3>Datos fiscales</h3>
							<p>
								Identificación que se utilizará en los documentos de compra.
							</p>
						</div>
					</div>
					<div className="purchases-form__grid">
						<label>
							<span>Proveedor o empresa</span>
							<input
								aria-describedby={
									errorFor("businessName")
										? `${fieldId("businessName")}-error`
										: undefined
								}
								aria-invalid={Boolean(errorFor("businessName"))}
								defaultValue={supplier?.businessName ?? ""}
								id={fieldId("businessName")}
								maxLength={160}
								name="businessName"
								placeholder="Nombre que aparece en la factura"
								required
							/>
							{errorFor("businessName") ? (
								<small
									className="purchases-field-error"
									id={`${fieldId("businessName")}-error`}
								>
									{errorFor("businessName")}
								</small>
							) : null}
						</label>
						<label>
							<span>NIT</span>
							<input
								aria-describedby={
									errorFor("taxId") ? `${fieldId("taxId")}-error` : undefined
								}
								aria-invalid={Boolean(errorFor("taxId"))}
								defaultValue={supplier?.taxId ?? ""}
								maxLength={32}
								name="taxId"
								placeholder="CF o número con verificador"
								required
							/>
							{errorFor("taxId") ? (
								<small
									className="purchases-field-error"
									id={`${fieldId("taxId")}-error`}
								>
									{errorFor("taxId")}
								</small>
							) : null}
						</label>
					</div>
				</div>
				<div className="purchases-form__section purchases-form__section--wide">
					<div className="purchases-form__section-title">
						<UserRound aria-hidden="true" size={18} />
						<div>
							<h3>Contacto del proveedor</h3>
							<p>
								Teléfono o correo para comunicarse; el nombre de quien atiende
								es opcional.
							</p>
						</div>
					</div>
					<div className="purchases-form__grid purchases-form__grid--three">
						<label>
							<span>Quién atiende (opcional)</span>
							<input
								aria-describedby={
									errorFor("contactName")
										? `${fieldId("contactName")}-error`
										: undefined
								}
								aria-invalid={Boolean(errorFor("contactName"))}
								defaultValue={supplier?.contactName ?? ""}
								maxLength={120}
								name="contactName"
								placeholder="Ej. Juan Pérez"
							/>
							{errorFor("contactName") ? (
								<small
									className="purchases-field-error"
									id={`${fieldId("contactName")}-error`}
								>
									{errorFor("contactName")}
								</small>
							) : null}
						</label>
						<label>
							<span>Correo</span>
							<input
								aria-describedby={
									errorFor("email") ? `${fieldId("email")}-error` : undefined
								}
								aria-invalid={Boolean(errorFor("email"))}
								defaultValue={supplier?.email ?? ""}
								maxLength={254}
								name="email"
								placeholder="compras@proveedor.com"
								type="email"
							/>
							{errorFor("email") ? (
								<small
									className="purchases-field-error"
									id={`${fieldId("email")}-error`}
								>
									{errorFor("email")}
								</small>
							) : null}
						</label>
						<label>
							<span>Teléfono</span>
							<input
								aria-describedby={`${fieldId("phone")}-hint${errorFor("phone") ? ` ${fieldId("phone")}-error` : ""}`}
								aria-invalid={Boolean(errorFor("phone"))}
								defaultValue={supplier?.phone ?? ""}
								id={fieldId("phone")}
								inputMode="numeric"
								maxLength={8}
								name="phone"
								pattern="[0-9]{8}"
								placeholder="55551234"
							/>
							<small
								className="purchases-field-hint"
								id={`${fieldId("phone")}-hint`}
							>
								8 dígitos, sin espacios ni guiones.
							</small>
							{errorFor("phone") ? (
								<small
									className="purchases-field-error"
									id={`${fieldId("phone")}-error`}
								>
									{errorFor("phone")}
								</small>
							) : null}
						</label>
					</div>
				</div>
				<div className="purchases-form__section purchases-form__section--wide">
					<div className="purchases-form__section-title">
						<MapPin aria-hidden="true" size={18} />
						<div>
							<h3>Datos adicionales</h3>
							<p>Información opcional para entrega y seguimiento interno.</p>
						</div>
					</div>
					<div className="purchases-form__grid">
						<label>
							<span>Dirección (opcional)</span>
							<textarea
								aria-describedby={
									errorFor("address")
										? `${fieldId("address")}-error`
										: undefined
								}
								aria-invalid={Boolean(errorFor("address"))}
								defaultValue={supplier?.address ?? ""}
								maxLength={500}
								name="address"
								placeholder="Dirección fiscal o de despacho"
								rows={3}
							/>
							{errorFor("address") ? (
								<small
									className="purchases-field-error"
									id={`${fieldId("address")}-error`}
								>
									{errorFor("address")}
								</small>
							) : null}
						</label>
						<label>
							<span>Observaciones (opcional)</span>
							<textarea
								aria-describedby={
									errorFor("notes") ? `${fieldId("notes")}-error` : undefined
								}
								aria-invalid={Boolean(errorFor("notes"))}
								defaultValue={supplier?.notes ?? ""}
								maxLength={1000}
								name="notes"
								placeholder="Condiciones acordadas u observaciones internas"
								rows={3}
							/>
							{errorFor("notes") ? (
								<small
									className="purchases-field-error"
									id={`${fieldId("notes")}-error`}
								>
									{errorFor("notes")}
								</small>
							) : null}
						</label>
					</div>
				</div>
				<footer className="purchases-form__footer">
					<button
						className="purchases-button purchases-button--ghost focus-ring"
						onClick={onClose}
						type="button"
					>
						Cancelar
					</button>
					<SubmitButton>
						{supplier ? "Guardar proveedor" : "Crear proveedor"}
					</SubmitButton>
				</footer>
			</form>
		</ModalShell>
	);
}

function OrderForm({
	requisition,
	suppliers,
	today,
	onClose,
}: {
	requisition: Requisition;
	suppliers: Supplier[];
	today: string;
	onClose: () => void;
}) {
	const initialState: PurchaseOrderFormState = { status: "idle", message: "" };
	const [state, formAction] = useActionState(
		createPurchaseOrderAction,
		initialState,
	);
	const errorFor = (field: string) => state.errors?.[field]?.[0];
	const [tax, setTax] = useState(0);
	const [costs, setCosts] = useState<Record<string, number>>(() =>
		Object.fromEntries(
			requisition.items.map((item) => [item.id, item.estimatedCost]),
		),
	);
	const subtotal = requisition.items.reduce(
		(total, item) => total + item.quantity * (costs[item.id] ?? 0),
		0,
	);
	const total = subtotal * (1 + tax / 100);
	const serializedItems = JSON.stringify(
		requisition.items.map((item) => ({
			requisitionItemId: item.id,
			unitCost: costs[item.id] ?? 0,
		})),
	);

	return (
		<ModalShell
			description="Define proveedor, precios y entrega para generar la orden."
			onClose={onClose}
			title="Nueva compra"
		>
			<form action={formAction} className="purchases-order-form">
				<input name="requisitionId" type="hidden" value={requisition.id} />
				<input name="items" type="hidden" value={serializedItems} />
				<section className="purchases-order-origin">
					<div className="purchases-order-origin__mark">
						<ClipboardCheck aria-hidden="true" size={20} />
					</div>
					<div className="purchases-order-origin__identity">
						<span>Solicitud autorizada</span>
						<strong>{requisition.number}</strong>
						<p>{requisition.title}</p>
					</div>
					<dl>
						<div>
							<dt>Destino</dt>
							<dd>{destinationLabel(requisition)}</dd>
						</div>
						<div>
							<dt>Necesario</dt>
							<dd>{formatDate(requisition.neededDate)}</dd>
						</div>
						<div>
							<dt>Estimado</dt>
							<dd>{formatCurrency(requisition.estimatedTotal)}</dd>
						</div>
					</dl>
				</section>
				{state.status === "error" ? (
					<div
						aria-live="polite"
						className="purchases-form__error"
						role="alert"
					>
						<strong>No se guardó la compra</strong>
						<span>{state.message}</span>
					</div>
				) : null}
				<div className="purchases-order-form__section">
					<header>
						<Store aria-hidden="true" size={18} />
						<div>
							<h3>Condiciones de compra</h3>
							<p>Proveedor, fechas e impuesto aplicables a esta orden.</p>
						</div>
					</header>
					<div className="purchases-order-form__meta">
						<label>
							<span>Proveedor</span>
							<select
								aria-invalid={Boolean(errorFor("supplierId"))}
								name="supplierId"
								required
							>
								<option value="">Seleccionar proveedor</option>
								{suppliers
									.filter((supplier) => supplier.status === "ACTIVE")
									.map((supplier) => (
										<option key={supplier.id} value={supplier.id}>
											{supplier.code} · {supplier.businessName}
										</option>
									))}
							</select>
							{errorFor("supplierId") ? (
								<small className="purchases-field-error">
									{errorFor("supplierId")}
								</small>
							) : null}
						</label>
						<PaymentConditionFields
							creditAvailable={Boolean(requisition.project)}
							errorFor={errorFor}
							today={today}
						/>
						<label>
							<span>Fecha de emisión</span>
							<input
								aria-invalid={Boolean(errorFor("issueDate"))}
								defaultValue={today}
								name="issueDate"
								required
								type="date"
							/>
							{errorFor("issueDate") ? (
								<small className="purchases-field-error">
									{errorFor("issueDate")}
								</small>
							) : null}
						</label>
						<label>
							<span>Entrega prevista</span>
							<input
								aria-invalid={Boolean(errorFor("expectedDate"))}
								min={today}
								name="expectedDate"
								required
								type="date"
							/>
							{errorFor("expectedDate") ? (
								<small className="purchases-field-error">
									{errorFor("expectedDate")}
								</small>
							) : null}
						</label>
						<label>
							<span>IVA</span>
							<div className="purchases-input-suffix">
								<input
									aria-invalid={Boolean(errorFor("taxPercentage"))}
									max={100}
									min={0}
									name="taxPercentage"
									onChange={(event) => setTax(Number(event.target.value) || 0)}
									step="0.01"
									type="number"
									value={tax}
								/>
								<span>%</span>
							</div>
							{errorFor("taxPercentage") ? (
								<small className="purchases-field-error">
									{errorFor("taxPercentage")}
								</small>
							) : null}
						</label>
					</div>
				</div>
				<div className="purchases-order-lines">
					<div className="purchases-order-lines__heading">
						<div>
							<h3>Detalle de compra</h3>
							<p>
								Las cantidades vienen de la solicitud; aquí se registran los
								precios acordados.
							</p>
							{errorFor("items") ? (
								<small className="purchases-field-error">
									{errorFor("items")}
								</small>
							) : null}
						</div>
						<span>{requisition.items.length} renglones</span>
					</div>
					<div className="purchases-order-lines__table">
						<div className="purchases-order-lines__row purchases-order-lines__row--head">
							<span>Descripción</span>
							<span>Cantidad</span>
							<span>Costo unitario</span>
							<span>Subtotal</span>
						</div>
						{requisition.items.map((item) => (
							<div className="purchases-order-lines__row" key={item.id}>
								<div>
									<strong>{item.description}</strong>
									<small>{item.unit ?? "Unidad"}</small>
								</div>
								<span>
									{formatNumber(item.quantity, item.quantity % 1 === 0 ? 0 : 2)}{" "}
									{item.unit ?? ""}
								</span>
								<label>
									<span className="sr-only">
										Costo unitario de {item.description}
									</span>
									<input
										min="0.01"
										onChange={(event) =>
											setCosts((current) => ({
												...current,
												[item.id]: Number(event.target.value) || 0,
											}))
										}
										required
										step="0.01"
										type="number"
										value={costs[item.id] ?? 0}
									/>
								</label>
								<strong>
									{formatCurrency(item.quantity * (costs[item.id] ?? 0))}
								</strong>
							</div>
						))}
					</div>
				</div>
				<div className="purchases-order-form__bottom">
					<label>
						<span>Condiciones u observaciones</span>
						<textarea
							maxLength={2000}
							name="notes"
							placeholder="Entrega, garantía o condiciones acordadas"
							rows={4}
						/>
					</label>
					<div className="purchases-order-total">
						<div>
							<span>Subtotal</span>
							<strong>{formatCurrency(subtotal)}</strong>
						</div>
						<div>
							<span>IVA</span>
							<strong>{formatCurrency(total - subtotal)}</strong>
						</div>
						<div className="purchases-order-total__grand">
							<span>Total de la orden</span>
							<strong>{formatCurrency(total)}</strong>
						</div>
					</div>
				</div>
				<footer className="purchases-form__footer">
					<button
						className="purchases-button purchases-button--ghost focus-ring"
						onClick={onClose}
						type="button"
					>
						Cancelar
					</button>
					<SubmitButton>Guardar compra en borrador</SubmitButton>
				</footer>
			</form>
		</ModalShell>
	);
}

type DirectLine = {
	key: number;
	materialId: string;
	quantity: number;
	unitCost: number;
};

function DirectPurchaseForm({
	data,
	today,
	onClose,
	onCreateSupplier,
}: {
	data: WorkspaceData;
	today: string;
	onClose: () => void;
	onCreateSupplier: () => void;
}) {
	const initialState: PurchaseOrderFormState = { status: "idle", message: "" };
	const [state, formAction] = useActionState(
		createPurchaseOrderAction,
		initialState,
	);
	const errorFor = (field: string) => state.errors?.[field]?.[0];
	const nextKey = useRef(2);
	const pendingLineFocusKey = useRef<number | null>(null);
	const [tax, setTax] = useState(0);
	const [projectId, setProjectId] = useState("");
	const [lines, setLines] = useState<DirectLine[]>([
		{ key: 1, materialId: "", quantity: 1, unitCost: 0 },
	]);
	const materialById = useMemo(
		() => new Map(data.materials.map((material) => [material.id, material])),
		[data.materials],
	);
	const updateLine = (key: number, change: Partial<DirectLine>) =>
		setLines((current) =>
			current.map((line) => (line.key === key ? { ...line, ...change } : line)),
		);
	const canAddLine = data.materials.length > lines.length;
	const addLine = () => {
		if (!canAddLine) return;
		const key = nextKey.current;
		nextKey.current += 1;
		pendingLineFocusKey.current = key;
		setLines((current) => [
			...current,
			{ key, materialId: "", quantity: 1, unitCost: 0 },
		]);
	};

	const serializedItems = JSON.stringify(
		lines.map((line) => {
			return {
				materialId: line.materialId,
				quantity: line.quantity,
				unitCost: line.unitCost,
			};
		}),
	);
	const subtotal = lines.reduce(
		(total, line) => total + line.quantity * line.unitCost,
		0,
	);
	const total = subtotal * (1 + tax / 100);
	const missingSupplier = !data.suppliers.some(
		(supplier) => supplier.status === "ACTIVE",
	);
	const missingWarehouse = data.warehouses.length === 0;
	const missingMaterials = data.materials.length === 0;
	const cannotSave = missingSupplier || missingWarehouse || missingMaterials;

	return (
		<ModalShell
			description="Registra una compra sin vincularla a una solicitud."
			onClose={onClose}
			title="Nueva compra"
		>
			<form action={formAction} className="purchases-order-form">
				<input name="requisitionId" type="hidden" value="" />
				<input name="items" type="hidden" value={serializedItems} />
				<section className="purchases-order-origin purchases-order-origin--direct">
					<div className="purchases-order-origin__mark">
						<ShoppingCart aria-hidden="true" size={20} />
					</div>
					<div className="purchases-order-origin__identity">
						<span>Origen</span>
						<strong>Sin solicitud asociada</strong>
						<p>La recepción se registrará en la bodega seleccionada.</p>
					</div>
				</section>
				{cannotSave ? (
					<section className="purchases-readiness" role="status">
						<div>
							<strong>Completa la configuración para guardar</strong>
							<p>
								{[
									missingSupplier ? "un proveedor activo" : null,
									missingWarehouse ? "una bodega activa" : null,
									missingMaterials ? "artículos en Inventario" : null,
								]
									.filter(Boolean)
									.join(", ")}
								.
							</p>
						</div>
						<div className="purchases-readiness__actions">
							{missingSupplier ? (
								<button onClick={onCreateSupplier} type="button">
									<Plus aria-hidden="true" size={15} /> Agregar proveedor
								</button>
							) : null}
							{missingWarehouse || missingMaterials ? (
								<a href="/inventory">
									Abrir Inventario <ArrowRight aria-hidden="true" size={15} />
								</a>
							) : null}
						</div>
					</section>
				) : null}
				{state.status === "error" ? (
					<div
						aria-live="polite"
						className="purchases-form__error"
						role="alert"
					>
						<strong>No se guardó la compra</strong>
						<span>{state.message}</span>
					</div>
				) : null}
				<div className="purchases-order-form__section">
					<header>
						<Warehouse aria-hidden="true" size={18} />
						<div>
							<h3>Proveedor y destino</h3>
							<p>Datos necesarios para emitir y recibir la orden.</p>
						</div>
					</header>
					<div className="purchases-order-form__meta purchases-order-form__meta--direct">
						<label>
							<span>Proveedor</span>
							<select
								aria-invalid={Boolean(errorFor("supplierId"))}
								name="supplierId"
								required
							>
								<option value="">Seleccionar proveedor</option>
								{data.suppliers
									.filter((supplier) => supplier.status === "ACTIVE")
									.map((supplier) => (
										<option key={supplier.id} value={supplier.id}>
											{supplier.code} · {supplier.businessName}
										</option>
									))}
							</select>
							{errorFor("supplierId") ? (
								<small className="purchases-field-error">
									{errorFor("supplierId")}
								</small>
							) : null}
						</label>
						<label>
							<span>Bodega de recepción</span>
							<select
								aria-invalid={Boolean(errorFor("warehouseId"))}
								name="warehouseId"
								required
							>
								<option value="">Seleccionar bodega</option>
								{data.warehouses.map((warehouse) => (
									<option key={warehouse.id} value={warehouse.id}>
										{warehouse.code} · {warehouse.name}
									</option>
								))}
							</select>
							{errorFor("warehouseId") ? (
								<small className="purchases-field-error">
									{errorFor("warehouseId")}
								</small>
							) : null}
						</label>
						<label>
							<span>Proyecto (opcional excepto crédito)</span>
							<select
								name="projectId"
								onChange={(event) => setProjectId(event.target.value)}
								value={projectId}
							>
								<option value="">Compra general</option>
								{data.projects.map((project) => (
									<option key={project.id} value={project.id}>
										{project.code} · {project.name}
									</option>
								))}
							</select>
						</label>
						{projectId ? (
							<label className="md:col-span-2">
								<span>Justificación fuera de presupuesto</span>
								<textarea
									aria-invalid={Boolean(errorFor("budgetExceptionReason"))}
									minLength={10}
									name="budgetExceptionReason"
									placeholder="Motivo de la compra directa y necesidad para el proyecto"
									required
								/>
								{errorFor("budgetExceptionReason") ? (
									<small className="purchases-field-error">
										{errorFor("budgetExceptionReason")}
									</small>
								) : null}
							</label>
						) : null}
						<PaymentConditionFields
							creditAvailable={Boolean(projectId)}
							errorFor={errorFor}
							today={today}
						/>
						<label>
							<span>Fecha de emisión</span>
							<input
								aria-invalid={Boolean(errorFor("issueDate"))}
								defaultValue={today}
								name="issueDate"
								required
								type="date"
							/>
							{errorFor("issueDate") ? (
								<small className="purchases-field-error">
									{errorFor("issueDate")}
								</small>
							) : null}
						</label>
						<label>
							<span>Entrega prevista</span>
							<input
								aria-invalid={Boolean(errorFor("expectedDate"))}
								min={today}
								name="expectedDate"
								required
								type="date"
							/>
							{errorFor("expectedDate") ? (
								<small className="purchases-field-error">
									{errorFor("expectedDate")}
								</small>
							) : null}
						</label>
						<label>
							<span>IVA</span>
							<div className="purchases-input-suffix">
								<input
									aria-invalid={Boolean(errorFor("taxPercentage"))}
									max={100}
									min={0}
									name="taxPercentage"
									onChange={(event) => setTax(Number(event.target.value) || 0)}
									step="0.01"
									type="number"
									value={tax}
								/>
								<span>%</span>
							</div>
							{errorFor("taxPercentage") ? (
								<small className="purchases-field-error">
									{errorFor("taxPercentage")}
								</small>
							) : null}
						</label>
					</div>
				</div>
				<div className="purchases-order-lines">
					<div className="purchases-order-lines__heading">
						<div>
							<h3>Artículos de la compra</h3>
							<p>Selecciona artículos existentes del catálogo de Inventario.</p>
						</div>
						<div className="purchases-order-lines__actions">
							<span aria-live="polite" className="purchases-order-lines__count">
								{lines.length} {lines.length === 1 ? "artículo" : "artículos"}
							</span>
							<button
								aria-label="Agregar otro artículo a la compra"
								className="purchases-order-lines__add focus-ring"
								disabled={!canAddLine}
								onClick={addLine}
								title={
									canAddLine
										? "Agregar otro artículo"
										: "Todos los artículos disponibles ya fueron agregados"
								}
								type="button"
							>
								<Plus aria-hidden="true" size={17} /> Agregar artículo
							</button>
						</div>
					</div>
					{errorFor("items") ? (
						<p className="purchases-field-error" role="alert">
							{errorFor("items")}
						</p>
					) : null}
					<div className="purchases-order-lines__table">
						<div className="purchases-order-lines__row purchases-order-lines__row--head">
							<span>Artículo</span>
							<span>Cantidad</span>
							<span>Costo unitario</span>
							<span>Subtotal</span>
						</div>
						{lines.map((line) => {
							const material = materialById.get(line.materialId);
							const selectedByAnotherLine = new Set(
								lines
									.filter((item) => item.key !== line.key)
									.map((item) => item.materialId),
							);
							return (
								<div className="purchases-order-lines__row" key={line.key}>
									<div className="purchases-direct-material">
										<select
											aria-label="Artículo de inventario"
											onChange={(event) => {
												const selected = materialById.get(event.target.value);
												updateLine(line.key, {
													materialId: event.target.value,
													unitCost: selected?.unitCost ?? 0,
												});
											}}
											required
											ref={(node) => {
												if (!node || pendingLineFocusKey.current !== line.key)
													return;
												pendingLineFocusKey.current = null;
												node.focus({ preventScroll: true });
												node.scrollIntoView({
													behavior: "smooth",
													block: "nearest",
												});
											}}
											value={line.materialId}
										>
											<option value="">Seleccionar artículo</option>
											{data.materials.map((item) => (
												<option
													disabled={selectedByAnotherLine.has(item.id)}
													key={item.id}
													value={item.id}
												>
													{item.code} · {item.name}
												</option>
											))}
										</select>
										<small>{material?.unit ?? "Unidad pendiente"}</small>
										<button
											aria-label="Eliminar renglón"
											className="purchases-line-remove focus-ring"
											disabled={lines.length === 1}
											onClick={() =>
												setLines((current) =>
													current.filter((item) => item.key !== line.key),
												)
											}
											type="button"
										>
											<X size={15} />
										</button>
									</div>
									<input
										aria-label={`Cantidad de ${material?.name ?? "artículo"}`}
										min="0.01"
										onChange={(event) =>
											updateLine(line.key, {
												quantity: Number(event.target.value) || 0,
											})
										}
										required
										step="0.01"
										type="number"
										value={line.quantity}
									/>
									<input
										aria-label={`Costo unitario de ${material?.name ?? "artículo"}`}
										min="0.01"
										onChange={(event) =>
											updateLine(line.key, {
												unitCost: Number(event.target.value) || 0,
											})
										}
										required
										step="0.01"
										type="number"
										value={line.unitCost}
									/>
									<strong>
										{formatCurrency(line.quantity * line.unitCost)}
									</strong>
								</div>
							);
						})}
					</div>
				</div>
				<div className="purchases-order-form__bottom">
					<label>
						<span>Condiciones u observaciones</span>
						<textarea maxLength={2000} name="notes" rows={4} />
					</label>
					<div className="purchases-order-total">
						<div>
							<span>Subtotal</span>
							<strong>{formatCurrency(subtotal)}</strong>
						</div>
						<div>
							<span>IVA</span>
							<strong>{formatCurrency(total - subtotal)}</strong>
						</div>
						<div className="purchases-order-total__grand">
							<span>Total</span>
							<strong>{formatCurrency(total)}</strong>
						</div>
					</div>
				</div>
				<footer className="purchases-form__footer">
					<button
						className="purchases-button purchases-button--ghost focus-ring"
						onClick={onClose}
						type="button"
					>
						Cancelar
					</button>
					<SubmitButton disabled={cannotSave}>
						Guardar compra en borrador
					</SubmitButton>
				</footer>
			</form>
		</ModalShell>
	);
}

function ReceiptForm({
	order,
	today,
	onClose,
}: {
	order: Order;
	today: string;
	onClose: () => void;
}) {
	const pendingItems = order.items.filter(
		(item) => item.receivedQuantity < item.quantity,
	);
	const [quantities, setQuantities] = useState<Record<string, number>>(() =>
		Object.fromEntries(
			pendingItems.map((item) => [
				item.id,
				Number((item.quantity - item.receivedQuantity).toFixed(2)),
			]),
		),
	);
	const serializedItems = JSON.stringify(
		pendingItems
			.map((item) => ({
				purchaseOrderItemId: item.id,
				quantity: quantities[item.id] ?? 0,
			}))
			.filter((item) => item.quantity > 0),
	);

	return (
		<ModalShell
			description={`${order.number} · ${order.supplier.businessName}`}
			onClose={onClose}
			title="Registrar recepción"
		>
			<form
				action={receivePurchaseOrderAction}
				className="purchases-receipt-form"
			>
				<input name="purchaseOrderId" type="hidden" value={order.id} />
				<input name="items" type="hidden" value={serializedItems} />
				<div className="purchases-receipt-form__meta">
					<label>
						<span>Fecha recibida</span>
						<input
							defaultValue={today}
							name="receivedDate"
							required
							type="date"
						/>
					</label>
					<label>
						<span>Boleta o referencia de entrega</span>
						<input name="reference" placeholder="Ej. ENTREGA-0184" required />
					</label>
				</div>
				<div className="purchases-receipt-lines">
					<header>
						<div>
							<h3>Cantidades recibidas</h3>
							<p>Puede registrar una entrega parcial sin cerrar la orden.</p>
						</div>
						<span>{pendingItems.length} pendientes</span>
					</header>
					{pendingItems.map((item) => {
						const remaining = item.quantity - item.receivedQuantity;
						return (
							<div className="purchases-receipt-line" key={item.id}>
								<div>
									<strong>{item.description}</strong>
									<small>
										Recibido {formatNumber(item.receivedQuantity)} de{" "}
										{formatNumber(item.quantity)} {item.unit ?? ""}
									</small>
								</div>
								<label>
									<span>Esta entrega</span>
									<input
										max={remaining}
										min="0"
										onChange={(event) =>
											setQuantities((current) => ({
												...current,
												[item.id]: Number(event.target.value) || 0,
											}))
										}
										step="0.01"
										type="number"
										value={quantities[item.id] ?? 0}
									/>
								</label>
							</div>
						);
					})}
				</div>
				<label className="purchases-receipt-form__notes">
					<span>Observaciones</span>
					<textarea name="notes" rows={3} />
				</label>
				<footer className="purchases-form__footer">
					<button
						className="purchases-button purchases-button--ghost focus-ring"
						onClick={onClose}
						type="button"
					>
						Cancelar
					</button>
					<SubmitButton>
						<PackageCheck size={17} /> Guardar recepción
					</SubmitButton>
				</footer>
			</form>
		</ModalShell>
	);
}

export function PurchasesWorkspace({
	data,
	canManage,
	canRegisterFinance,
	initialView,
	initialRequisitionId,
	today,
}: {
	data: WorkspaceData;
	canManage: boolean;
	canRegisterFinance: boolean;
	initialView: View;
	initialRequisitionId: string;
	today: string;
}) {
	const [view, setView] = useState<View>(initialView);
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState("ALL");
	const [supplierQuery, setSupplierQuery] = useState("");
	const [supplierModal, setSupplierModal] = useState<Supplier | "new" | null>(
		null,
	);
	const [orderRequisition, setOrderRequisition] = useState<Requisition | null>(
		() =>
			data.readyRequisitions.find((item) => item.id === initialRequisitionId) ??
			null,
	);
	const [selectedOrderId, setSelectedOrderId] = useState(
		data.orders[0]?.id ?? "",
	);
	const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
	const [directPurchaseOpen, setDirectPurchaseOpen] = useState(false);
	const selectedOrder =
		data.orders.find((order) => order.id === selectedOrderId) ?? data.orders[0];
	const filteredOrders = useMemo(
		() =>
			data.orders.filter((order) => {
				const search = query.trim().toLowerCase();
				return (
					(status === "ALL" || order.status === status) &&
					(!search ||
						`${order.number} ${order.supplier.businessName} ${order.requisition?.number ?? "compra directa"}`
							.toLowerCase()
							.includes(search))
				);
			}),
		[data.orders, query, status],
	);
	const filteredSuppliers = useMemo(() => {
		const search = supplierQuery.trim().toLowerCase();
		return data.suppliers.filter(
			(supplier) =>
				!search ||
				`${supplier.code} ${supplier.businessName} ${supplier.tradeName ?? ""} ${supplier.taxId ?? ""}`
					.toLowerCase()
					.includes(search),
		);
	}, [data.suppliers, supplierQuery]);
	const orderStatusCounts = useMemo(
		() =>
			Object.fromEntries(
				["DRAFT", "ISSUED", "PARTIAL", "RECEIVED", "CANCELED"].map((key) => [
					key,
					data.orders.filter((order) => order.status === key).length,
				]),
			),
		[data.orders],
	);
	const orderStopped = selectedOrder?.status === "CANCELED";
	const orderComplete = selectedOrder?.status === "RECEIVED";
	const hasReceipt = Boolean(
		selectedOrder?.items.some((item) => item.receivedQuantity > 0),
	);
	const invoiceComplete = Boolean(
		selectedOrder && selectedOrder.invoicedAmount >= selectedOrder.total,
	);
	const selectedOrderFlow: FlowState[] = selectedOrder
		? [
				"done",
				"done",
				orderStopped ? "stopped" : orderComplete ? "done" : "active",
				orderStopped
					? "stopped"
					: orderComplete
						? "done"
						: hasReceipt
							? "active"
							: "pending",
				orderStopped
					? "stopped"
					: invoiceComplete
						? "done"
						: selectedOrder.invoiceCount > 0
							? "active"
							: "pending",
			]
		: ["pending", "pending", "pending", "pending", "pending"];
	const flowStates: FlowState[] =
		view === "orders"
			? selectedOrderFlow
			: view === "requisitions"
				? [
						data.readyRequisitions.length > 0 ? "done" : "active",
						data.metrics.activeSuppliers > 0 ? "done" : "active",
						data.readyRequisitions.length > 0 &&
						data.metrics.activeSuppliers > 0
							? "active"
							: "pending",
						"pending",
						"pending",
					]
				: [
						data.readyRequisitions.length > 0 ? "done" : "pending",
						data.metrics.activeSuppliers > 0 ? "done" : "active",
						"pending",
						"pending",
						"pending",
					];
	const firstFlowLabel = selectedOrder
		? selectedOrder.requisition
			? "Solicitud"
			: "Compra directa"
		: view === "requisitions"
			? "Solicitud"
			: "Origen";

	return (
		<div className="purchases-workspace">
			{directPurchaseOpen ? (
				<DirectPurchaseForm
					data={data}
					onClose={() => setDirectPurchaseOpen(false)}
					onCreateSupplier={() => {
						setDirectPurchaseOpen(false);
						setSupplierModal("new");
					}}
					today={today}
				/>
			) : null}
			{receiptOrder ? (
				<ReceiptForm
					onClose={() => setReceiptOrder(null)}
					order={receiptOrder}
					today={today}
				/>
			) : null}
			<section className="purchases-hero">
				<div className="purchases-hero__texture" />
				<div className="purchases-hero__content">
					<div className="purchases-hero__title">
						<div className="purchases-hero__icon">
							<ShoppingCart aria-hidden="true" size={24} />
						</div>
						<div className="purchases-hero__context">
							<h1 className="sr-only">Compras</h1>
							<strong>Inicia una operación</strong>
							<span>Compra directa o desde una solicitud autorizada.</span>
						</div>
					</div>
					{canManage ? (
						<div className="purchases-hero__actions">
							<button
								className="purchases-button purchases-button--red focus-ring"
								onClick={() => setDirectPurchaseOpen(true)}
								type="button"
							>
								<ShoppingCart size={18} />
								Nueva compra
							</button>
							<button
								className="purchases-button purchases-button--amber focus-ring"
								onClick={() => setView("requisitions")}
								type="button"
							>
								<ClipboardCheck size={18} />
								Comprar desde solicitud
							</button>
							<button
								className="purchases-button purchases-button--green focus-ring"
								onClick={() => setSupplierModal("new")}
								type="button"
							>
								<Store size={18} />
								Agregar proveedor
							</button>
						</div>
					) : null}
					<div className="purchases-flow">
						<FlowStep
							icon={ClipboardCheck}
							label={firstFlowLabel}
							state={flowStates[0]}
						/>
						<ChevronRight size={16} />
						<FlowStep icon={Store} label="Proveedor" state={flowStates[1]} />
						<ChevronRight size={16} />
						<FlowStep icon={FileCheck2} label="Orden" state={flowStates[2]} />
						<ChevronRight size={16} />
						<FlowStep icon={Truck} label="Recepción" state={flowStates[3]} />
						<ChevronRight size={16} />
						<FlowStep
							icon={ReceiptText}
							label="Finanzas"
							state={flowStates[4]}
						/>
					</div>
				</div>
			</section>

			<section aria-label="Indicadores de compras" className="purchases-kpis">
				<Metric
					detail="Borradores, emitidas o parciales"
					icon={ShoppingCart}
					label="Compras abiertas"
					tone="red"
					value={String(data.metrics.openOrders)}
					onActivate={() => {
						setView("orders");
						setStatus("ALL");
					}}
				/>
				<Metric
					detail="Valor comprometido pendiente de cierre"
					icon={CircleDollarSign}
					label="Comprometido"
					tone="amber"
					value={formatCompactCurrency(data.metrics.openValue)}
					onActivate={() => {
						setView("orders");
						setStatus("ALL");
					}}
				/>
				<Metric
					detail="Disponibles para nuevas compras"
					icon={ShieldCheck}
					label="Proveedores activos"
					tone="green"
					value={String(data.metrics.activeSuppliers)}
					onActivate={() => setView("suppliers")}
				/>
				<Metric
					detail="Solicitudes autorizadas sin orden"
					icon={ClipboardCheck}
					label="Pendientes de compra"
					tone="steel"
					value={String(data.metrics.readyToBuy)}
					onActivate={() => setView("requisitions")}
				/>
			</section>

			<section className="purchases-command">
				<div
					className="purchases-tabs"
					role="tablist"
					aria-label="Vistas de compras"
				>
					<button
						aria-selected={view === "orders"}
						className="focus-ring"
						data-view="orders"
						onClick={() => setView("orders")}
						role="tab"
						type="button"
					>
						<ShoppingCart size={17} />
						Compras<span>{data.orders.length}</span>
					</button>
					<button
						aria-selected={view === "requisitions"}
						className="focus-ring"
						data-view="requisitions"
						onClick={() => setView("requisitions")}
						role="tab"
						type="button"
					>
						<ClipboardCheck size={17} />
						Pendientes de compra<span>{data.readyRequisitions.length}</span>
					</button>
					<button
						aria-selected={view === "suppliers"}
						className="focus-ring"
						data-view="suppliers"
						onClick={() => setView("suppliers")}
						role="tab"
						type="button"
					>
						<Store size={17} />
						Proveedores<span>{data.suppliers.length}</span>
					</button>
				</div>

				{view === "orders" ? (
					<div
						className={`purchases-command__view purchases-orders-view ${data.orders.length === 0 ? "purchases-orders-view--empty" : ""}`}
					>
						<div className="purchases-order-list">
							<div className="purchases-toolbar">
								<label>
									<Search aria-hidden="true" size={17} />
									<span className="sr-only">Buscar orden</span>
									<input
										onChange={(event) => setQuery(event.target.value)}
										placeholder="Orden, proveedor o requerimiento"
										value={query}
									/>
								</label>
							</div>
							<fieldset
								aria-label="Filtrar órdenes por estado"
								className="purchases-order-filters"
							>
								<button
									aria-pressed={status === "ALL"}
									data-status="ALL"
									onClick={() => setStatus("ALL")}
									type="button"
								>
									Todas <span>{data.orders.length}</span>
								</button>
								{Object.entries(purchaseOrderStatusLabels).map(
									([key, label]) => (
										<button
											aria-pressed={status === key}
											data-status={key}
											key={key}
											onClick={() => setStatus(key)}
											type="button"
										>
											{label} <span>{orderStatusCounts[key] ?? 0}</span>
										</button>
									),
								)}
							</fieldset>
							<div className="purchases-order-list__scroll">
								{filteredOrders.length ? (
									filteredOrders.map((order) => (
										<button
											aria-pressed={selectedOrder?.id === order.id}
											className="purchases-order-row focus-ring"
											key={order.id}
											onClick={() => setSelectedOrderId(order.id)}
											type="button"
										>
											<div className="purchases-order-row__top">
												<strong>{order.number}</strong>
												<StatusBadge status={order.status} />
											</div>
											<p>{order.supplier.businessName}</p>
											<small className="purchases-order-row__trace">
												{getOrderTrace(order)}
											</small>
											<div>
												<span>
													{destinationLabel(order.requisition, order)}
												</span>
												<strong>{formatCurrency(order.total)}</strong>
											</div>
										</button>
									))
								) : (
									<div className="purchases-empty">
										<PackageCheck size={30} />
										<h3>No hay órdenes con estos filtros</h3>
										<p>Cambia la búsqueda o registra una nueva compra.</p>
									</div>
								)}
							</div>
						</div>
						<div
							className="purchases-order-detail purchases-order-detail--animated"
							key={selectedOrder?.id ?? "empty-order"}
						>
							{selectedOrder ? (
								<>
									<header>
										<div>
											<span>
												{selectedOrder.requisition?.number ?? "Compra directa"}
											</span>
											<h2>{selectedOrder.number}</h2>
											<p>{selectedOrder.supplier.businessName}</p>
										</div>
										<StatusBadge status={selectedOrder.status} />
									</header>
									<div className="purchases-order-detail__facts">
										<div>
											<CalendarClock size={18} />
											<span>
												Emisión
												<strong>{formatDate(selectedOrder.issueDate)}</strong>
											</span>
										</div>
										<div>
											<Truck size={18} />
											<span>
												Entrega
												<strong>
													{formatDate(selectedOrder.expectedDate)}
												</strong>
											</span>
										</div>
										<div>
											<Warehouse size={18} />
											<span>
												Destino
												<strong>
													{destinationLabel(
														selectedOrder.requisition,
														selectedOrder,
													)}
												</strong>
											</span>
										</div>
										<div>
											<ReceiptText size={18} />
											<span>
												Facturación
												<strong>
													{selectedOrder.invoiceCount
														? `${formatCurrency(selectedOrder.invoicedAmount)} · ${selectedOrder.invoiceCount}`
														: "Sin factura"}
												</strong>
											</span>
										</div>
									</div>
									{selectedOrder.paymentType === "CREDIT" ? (
										<section
											className="purchases-credit-tracker"
											data-status={selectedOrder.creditStatus ?? undefined}
										>
											<header>
												<span className="purchases-credit-tracker__icon">
													<CircleDollarSign aria-hidden="true" size={19} />
												</span>
												<div>
													<small>Seguimiento del crédito</small>
													<strong>{creditStatusLabel(selectedOrder)}</strong>
												</div>
												<span className="purchases-credit-tracker__status">
													{paymentDetail(selectedOrder)}
												</span>
											</header>
											<div className="purchases-credit-tracker__figures">
												<div>
													<span>Facturado</span>
													<strong>
														{formatCurrency(selectedOrder.invoicedAmount)}
													</strong>
												</div>
												<div>
													<span>Abonado</span>
													<strong>
														{formatCurrency(selectedOrder.paidAmount)}
													</strong>
												</div>
												<div>
													<span>Saldo de la compra</span>
													<strong>
														{formatCurrency(selectedOrder.creditBalance)}
													</strong>
												</div>
											</div>
											{selectedOrder.invoiceCount === 0 ? (
												<p>
													Registra la factura en Finanzas para habilitar los
													abonos.
												</p>
											) : selectedOrder.lastPaymentDate ? (
												<p>
													Último pago:{" "}
													{formatDate(selectedOrder.lastPaymentDate)}
												</p>
											) : null}
										</section>
									) : (
										<div className="purchases-order-payment">
											<CircleDollarSign aria-hidden="true" size={19} />
											<span>
												Condición de pago
												<strong>{paymentDetail(selectedOrder)}</strong>
											</span>
										</div>
									)}
									<div className="purchases-order-detail__lines">
										<div className="purchases-order-detail__lines-head">
											<span>Renglones</span>
											<strong>{selectedOrder.items.length}</strong>
										</div>
										{selectedOrder.items.map((item) => (
											<div key={item.id}>
												<span>
													<strong>{item.description}</strong>
													<small>
														{formatNumber(
															item.quantity,
															item.quantity % 1 === 0 ? 0 : 2,
														)}{" "}
														{item.unit ?? ""} × {formatCurrency(item.unitCost)}
													</small>
													<small className="purchases-order-detail__received">
														Recibido {formatNumber(item.receivedQuantity)} de{" "}
														{formatNumber(item.quantity)}
													</small>
												</span>
												<strong>{formatCurrency(item.subtotal)}</strong>
											</div>
										))}
									</div>
									<div className="purchases-order-detail__totals">
										<div>
											<span>Subtotal</span>
											<strong>{formatCurrency(selectedOrder.subtotal)}</strong>
										</div>
										{selectedOrder.taxPercentage > 0 ? (
											<div>
												<span>IVA {selectedOrder.taxPercentage}%</span>
												<strong>
													{formatCurrency(selectedOrder.taxAmount)}
												</strong>
											</div>
										) : null}
										<div>
											<span>Total</span>
											<strong>{formatCurrency(selectedOrder.total)}</strong>
										</div>
									</div>
									{(canManage || canRegisterFinance) &&
									selectedOrder.status !== "CANCELED" ? (
										<footer>
											{canRegisterFinance &&
											selectedOrder.project &&
											selectedOrder.status !== "DRAFT" ? (
												<a
													className="purchases-button purchases-button--ghost focus-ring"
													href={`/finances?projectId=${selectedOrder.project.id}`}
												>
													<ReceiptText size={17} /> Factura en Finanzas
												</a>
											) : null}
											{canManage &&
											["ISSUED", "PARTIAL"].includes(selectedOrder.status) ? (
												<button
													className="purchases-button purchases-button--red focus-ring"
													onClick={() => setReceiptOrder(selectedOrder)}
													type="button"
												>
													<PackageCheck size={17} /> Registrar recepción
												</button>
											) : null}
											{canManage && selectedOrder.status === "DRAFT" ? (
												<form action={issuePurchaseOrderAction}>
													<input
														name="purchaseOrderId"
														type="hidden"
														value={selectedOrder.id}
													/>
													<SubmitButton>
														<Check size={17} />
														Emitir orden
													</SubmitButton>
												</form>
											) : null}
											{canManage &&
											["DRAFT", "ISSUED"].includes(selectedOrder.status) ? (
												<form action={cancelPurchaseOrderAction}>
													<input
														name="purchaseOrderId"
														type="hidden"
														value={selectedOrder.id}
													/>
													<SubmitButton tone="danger">
														Anular orden
													</SubmitButton>
												</form>
											) : null}
										</footer>
									) : null}
								</>
							) : (
								<div className="purchases-empty purchases-empty--orders">
									<ShoppingCart size={32} />
									<h3>Todavía no hay órdenes</h3>
									<p>Registra una compra directa o utiliza una solicitud.</p>
									<div className="purchases-empty__actions">
										<button
											className="purchases-button purchases-button--red focus-ring"
											onClick={() => setDirectPurchaseOpen(true)}
											type="button"
										>
											<ShoppingCart size={17} /> Nueva compra
										</button>
										<button
											className="purchases-button purchases-button--ghost focus-ring"
											onClick={() => setView("requisitions")}
											type="button"
										>
											<ClipboardCheck size={17} /> Usar solicitud
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				) : null}

				{view === "suppliers" ? (
					<div className="purchases-command__view purchases-suppliers">
						<header>
							<div>
								<h2>Directorio de proveedores</h2>
								<p>Datos fiscales y medios de contacto.</p>
							</div>
							<div className="purchases-section-tools">
								<label>
									<Search aria-hidden="true" size={16} />
									<input
										aria-label="Buscar proveedor"
										onChange={(event) => setSupplierQuery(event.target.value)}
										placeholder="Buscar proveedor o NIT"
										value={supplierQuery}
									/>
								</label>
								{canManage ? (
									<button
										className="purchases-button purchases-button--red focus-ring"
										onClick={() => setSupplierModal("new")}
										type="button"
									>
										<Plus size={18} />
										Nuevo proveedor
									</button>
								) : null}
							</div>
						</header>
						{filteredSuppliers.length ? (
							<div className="purchases-supplier-grid">
								{filteredSuppliers.map((supplier) => (
									<article
										className="purchases-supplier"
										data-active={supplier.status === "ACTIVE"}
										key={supplier.id}
									>
										<header>
											<div className="purchases-supplier__avatar">
												{supplier.businessName.slice(0, 2).toUpperCase()}
											</div>
											<div>
												<span>{supplier.code}</span>
												<h3>{supplier.businessName}</h3>
												{supplier.tradeName ? (
													<p>{supplier.tradeName}</p>
												) : null}
											</div>
											<span className="purchases-supplier__state">
												{supplier.status === "ACTIVE" ? "Activo" : "Inactivo"}
											</span>
										</header>
										<div className="purchases-supplier__contact">
											<span>
												<UserRound size={15} />
												{supplier.contactName ?? "Sin contacto"}
											</span>
											<span>
												<Phone size={15} />
												{supplier.phone ?? "Sin teléfono"}
											</span>
											<span>
												<Mail size={15} />
												{supplier.email ?? "Sin correo"}
											</span>
										</div>
										<div className="purchases-supplier__stats">
											<div>
												<span>Órdenes</span>
												<strong>{supplier.orderCount}</strong>
											</div>
											<div>
												<span>Valor ordenado</span>
												<strong>
													{formatCompactCurrency(supplier.orderedValue)}
												</strong>
											</div>
											<div>
												<span>NIT</span>
												<strong>{supplier.taxId ?? "Sin NIT"}</strong>
											</div>
										</div>
										{canManage ? (
											<footer>
												<button
													className="purchases-inline-action focus-ring"
													onClick={() => setSupplierModal(supplier)}
													type="button"
												>
													<Pencil size={15} />
													Editar
												</button>
												<form action={setSupplierActiveAction}>
													<input
														name="supplierId"
														type="hidden"
														value={supplier.id}
													/>
													<input
														name="active"
														type="hidden"
														value={
															supplier.status === "ACTIVE" ? "false" : "true"
														}
													/>
													<button
														className="purchases-supplier-toggle focus-ring"
														data-active={supplier.status === "ACTIVE"}
														type="submit"
													>
														<span />
														{supplier.status === "ACTIVE"
															? "Desactivar"
															: "Activar"}
													</button>
												</form>
											</footer>
										) : null}
									</article>
								))}
							</div>
						) : (
							<div className="purchases-empty purchases-empty--large">
								<Store size={34} />
								<h3>
									{data.suppliers.length
										? "No hay proveedores con esta búsqueda"
										: "No hay proveedores registrados"}
								</h3>
								<p>
									{data.suppliers.length
										? "Prueba con otro nombre, código o NIT."
										: "Agrega el primer proveedor para iniciar una compra."}
								</p>
								{canManage ? (
									<button
										className="purchases-button purchases-button--red focus-ring"
										onClick={() => setSupplierModal("new")}
										type="button"
									>
										Crear proveedor
									</button>
								) : null}
							</div>
						)}
					</div>
				) : null}

				{view === "requisitions" ? (
					<div className="purchases-command__view purchases-requisitions">
						<header>
							<div>
								<h2>Pendientes de compra</h2>
								<p>Solicitudes autorizadas que todavía no tienen una orden.</p>
							</div>
							<a
								className="purchases-inline-link focus-ring"
								href="/requisitions"
							>
								Ver solicitudes
								<ArrowRight size={16} />
							</a>
						</header>
						{data.metrics.activeSuppliers === 0 && canManage ? (
							<div className="purchases-requisitions__notice">
								<Store aria-hidden="true" size={18} />
								<p>
									<strong>Falta un proveedor activo</strong>
									Agrega uno para asignar precios y preparar la orden.
								</p>
								<button
									className="purchases-inline-action focus-ring"
									onClick={() => setSupplierModal("new")}
									type="button"
								>
									<Plus size={16} /> Agregar proveedor
								</button>
							</div>
						) : null}
						{data.readyRequisitions.length ? (
							<div className="purchases-requisition-grid">
								{data.readyRequisitions.map((requisition) => (
									<article
										className="purchases-requisition"
										key={requisition.id}
									>
										<header>
											<div>
												<span>{requisition.number}</span>
												<h3>{requisition.title}</h3>
											</div>
											<span
												className="purchases-priority"
												data-priority={requisition.priority}
											>
												{requisition.priority === "URGENT"
													? "Urgente"
													: requisition.priority === "HIGH"
														? "Alta"
														: requisition.priority === "LOW"
															? "Baja"
															: "Normal"}
											</span>
										</header>
										<div className="purchases-requisition__destination">
											{requisition.destinationType === "PROJECT" ? (
												<Building2 size={17} />
											) : (
												<Warehouse size={17} />
											)}
											<span>{destinationLabel(requisition)}</span>
										</div>
										<div className="purchases-requisition__items">
											{requisition.items.slice(0, 3).map((item) => (
												<div key={item.id}>
													<span>{item.description}</span>
													<strong>
														{formatNumber(
															item.quantity,
															item.quantity % 1 === 0 ? 0 : 2,
														)}{" "}
														{item.unit ?? ""}
													</strong>
												</div>
											))}
											{requisition.items.length > 3 ? (
												<small>+{requisition.items.length - 3} renglones</small>
											) : null}
										</div>
										<footer>
											<div>
												<span>Estimado</span>
												<strong>
													{formatCurrency(requisition.estimatedTotal)}
												</strong>
											</div>
											<div>
												<span>Necesario</span>
												<strong>{formatDate(requisition.neededDate)}</strong>
											</div>
											{canManage ? (
												<button
													className="purchases-button purchases-button--red focus-ring"
													disabled={data.metrics.activeSuppliers === 0}
													onClick={() => setOrderRequisition(requisition)}
													type="button"
												>
													Iniciar compra
													<ChevronRight size={17} />
												</button>
											) : null}
										</footer>
									</article>
								))}
							</div>
						) : (
							<div className="purchases-empty purchases-empty--large">
								<ClipboardCheck size={34} />
								<h3>No hay solicitudes autorizadas pendientes</h3>
								<p>
									Las necesidades se registran y autorizan en Requerimientos.
								</p>
							</div>
						)}
					</div>
				) : null}
			</section>

			{supplierModal ? (
				<SupplierForm
					onClose={() => setSupplierModal(null)}
					supplier={supplierModal === "new" ? null : supplierModal}
				/>
			) : null}
			{orderRequisition ? (
				<OrderForm
					onClose={() => setOrderRequisition(null)}
					requisition={orderRequisition}
					suppliers={data.suppliers}
					today={today}
				/>
			) : null}
		</div>
	);
}
