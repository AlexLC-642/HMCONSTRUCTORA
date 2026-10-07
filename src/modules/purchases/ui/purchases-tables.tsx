"use client";

import {
	Ban,
	FileText,
	Mail,
	Pencil,
	Phone,
	Search,
	UserRound,
	X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import {
	cancelPurchaseOrderAction,
	type PurchaseOrderStepState,
	setSupplierActiveAction,
} from "../application/actions";
import { StatStrip } from "@/shared/ui/stat-strip";
import type { getCompanyInvoices } from "../application/company-invoices";
import type { getPurchaseWorkspace } from "../application/queries";

type WorkspaceData = Awaited<ReturnType<typeof getPurchaseWorkspace>>;
type Order = WorkspaceData["orders"][number];
type Supplier = WorkspaceData["suppliers"][number];

const money = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});
const compactMoney = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
	notation: "compact",
	maximumFractionDigits: 1,
});
const shortDate = new Intl.DateTimeFormat("es-GT", {
	day: "2-digit",
	month: "short",
	year: "numeric",
	timeZone: "UTC",
});
const dateTime = new Intl.DateTimeFormat("es-GT", {
	day: "2-digit",
	month: "short",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

const previousStatusLabels: Record<string, string> = {
	DRAFT: "Borrador",
	ISSUED: "Emitida",
};

/* ------------------------------------------------------------------ KPIs */

export type KpiItem = {
	key: string;
	label: string;
	value: string;
	detail: string;
	/** Solo se marca cuando hay algo que atender. */
	attention?: "primary" | "warning";
	onActivate: () => void;
};

export function KpiStrip({ items }: { items: KpiItem[] }) {
	return <StatStrip items={items} label="Indicadores de compras" />;
}

export function formatCompactMoney(value: number) {
	return value >= 100_000 ? compactMoney.format(value) : money.format(value);
}

/* --------------------------------------------------------- Anuladas */

export function CanceledOrdersTable({ orders }: { orders: Order[] }) {
	const [query, setQuery] = useState("");
	const search = query.trim().toLowerCase();
	const rows = search
		? orders.filter((order) =>
				`${order.number} ${order.supplier.businessName} ${order.requisition?.number ?? ""} ${order.cancellation?.reason ?? ""}`
					.toLowerCase()
					.includes(search),
			)
		: orders;
	const total = orders.reduce((sum, order) => sum + order.total, 0);

	return (
		<div className="purchases-command__view purchases-table-view">
			<header className="purchases-table-view__header">
				<div>
					<h2>Órdenes anuladas</h2>
					<p>
						{orders.length === 0
							? "Registro de órdenes que se anularon antes de recibirse o facturarse."
							: `${orders.length} ${orders.length === 1 ? "orden" : "órdenes"} · ${money.format(total)} que ya no se comprometen.`}
					</p>
				</div>
				{orders.length > 0 ? (
					<label className="purchases-search">
						<Search aria-hidden="true" size={16} />
						<input
							aria-label="Buscar en anuladas"
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Orden, proveedor o motivo"
							value={query}
						/>
					</label>
				) : null}
			</header>
			{orders.length === 0 ? (
				<div className="purchases-table-empty">
					<Ban aria-hidden="true" size={26} />
					<strong>No hay órdenes anuladas</strong>
					<p>
						Cuando se anule una orden quedará aquí con su motivo y responsable.
					</p>
				</div>
			) : (
				<div className="purchases-table-wrap">
					<table className="purchases-table">
						<thead>
							<tr>
								<th scope="col">Orden</th>
								<th scope="col">Proveedor</th>
								<th scope="col">Origen</th>
								<th scope="col">Destino</th>
								<th className="purchases-table__num" scope="col">
									Total
								</th>
								<th scope="col">Anulada</th>
								<th scope="col">Motivo</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((order) => (
								<tr key={order.id}>
									<td data-label="Orden">
										<strong className="purchases-table__id">
											{order.number}
										</strong>
										<small>
											Emitida {shortDate.format(new Date(order.issueDate))}
										</small>
									</td>
									<td data-label="Proveedor">{order.supplier.businessName}</td>
									<td data-label="Origen">
										{order.requisition
											? `Requerimiento ${order.requisition.number}`
											: "Compra directa"}
									</td>
									<td data-label="Destino">
										{order.project?.name ?? order.warehouse?.name ?? "—"}
									</td>
									<td className="purchases-table__num" data-label="Total">
										{money.format(order.total)}
									</td>
									<td data-label="Anulada">
										{order.cancellation ? (
											<>
												{dateTime.format(new Date(order.cancellation.at))}
												<small>
													{order.cancellation.by ?? "Usuario no disponible"}
													{order.cancellation.previousStatus
														? ` · estaba ${previousStatusLabels[order.cancellation.previousStatus]?.toLowerCase() ?? order.cancellation.previousStatus}`
														: ""}
												</small>
											</>
										) : (
											<span className="purchases-table__muted">
												Sin registro
											</span>
										)}
									</td>
									<td className="purchases-table__reason" data-label="Motivo">
										{order.cancellation?.reason ?? (
											<span className="purchases-table__muted">
												No se registró motivo
											</span>
										)}
									</td>
								</tr>
							))}
							{rows.length === 0 ? (
								<tr>
									<td className="purchases-table__none" colSpan={7}>
										Ninguna orden anulada coincide con la búsqueda.
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

/* ------------------------------------------------------ Proveedores */

export function SuppliersTable({
	suppliers,
	totalCount,
	canManage,
	onEdit,
	toolbar,
	empty,
}: {
	suppliers: Supplier[];
	totalCount: number;
	canManage: boolean;
	onEdit: (supplier: Supplier) => void;
	toolbar: ReactNode;
	empty: ReactNode;
}) {
	return (
		<div className="purchases-command__view purchases-table-view">
			<header className="purchases-table-view__header">
				<div>
					<h2>Proveedores</h2>
					<p>
						{totalCount} registrados ·{" "}
						{suppliers.filter((item) => item.status === "ACTIVE").length}{" "}
						activos en esta vista.
					</p>
				</div>
				{toolbar}
			</header>
			{suppliers.length === 0 ? (
				empty
			) : (
				<div className="purchases-table-wrap">
					<table className="purchases-table">
						<thead>
							<tr>
								<th scope="col">Proveedor</th>
								<th scope="col">NIT</th>
								<th scope="col">Contacto</th>
								<th className="purchases-table__num" scope="col">
									Órdenes
								</th>
								<th className="purchases-table__num" scope="col">
									Valor ordenado
								</th>
								<th scope="col">Estado</th>
								{canManage ? (
									<th className="purchases-table__actions" scope="col">
										<span className="sr-only">Acciones</span>
									</th>
								) : null}
							</tr>
						</thead>
						<tbody>
							{suppliers.map((supplier) => (
								<tr
									data-inactive={supplier.status !== "ACTIVE" || undefined}
									key={supplier.id}
								>
									<td data-label="Proveedor">
										<strong>{supplier.businessName}</strong>
										<small>
											{supplier.code}
											{supplier.tradeName ? ` · ${supplier.tradeName}` : ""}
										</small>
									</td>
									<td className="purchases-table__mono" data-label="NIT">
										{supplier.taxId ?? (
											<span className="purchases-table__muted">Sin NIT</span>
										)}
									</td>
									<td data-label="Contacto">
										<span className="purchases-table__contact">
											{supplier.contactName ? (
												<span>
													<UserRound aria-hidden="true" size={13} />
													{supplier.contactName}
												</span>
											) : null}
											{supplier.phone ? (
												<a href={`tel:${supplier.phone}`}>
													<Phone aria-hidden="true" size={13} />
													{supplier.phone}
												</a>
											) : null}
											{supplier.email ? (
												<a href={`mailto:${supplier.email}`}>
													<Mail aria-hidden="true" size={13} />
													{supplier.email}
												</a>
											) : null}
											{!supplier.contactName &&
											!supplier.phone &&
											!supplier.email ? (
												<span className="purchases-table__muted">
													Sin datos de contacto
												</span>
											) : null}
										</span>
									</td>
									<td className="purchases-table__num" data-label="Órdenes">
										{supplier.orderCount}
									</td>
									<td
										className="purchases-table__num"
										data-label="Valor ordenado"
									>
										{money.format(supplier.orderedValue)}
									</td>
									<td data-label="Estado">
										<span
											className="purchases-pill"
											data-tone={
												supplier.status === "ACTIVE" ? "success" : "neutral"
											}
										>
											{supplier.status === "ACTIVE" ? "Activo" : "Inactivo"}
										</span>
									</td>
									{canManage ? (
										<td className="purchases-table__actions">
											<span className="purchases-table__buttons">
												<button
													aria-label={`Editar ${supplier.businessName}`}
													className="purchases-icon-button focus-ring"
													onClick={() => onEdit(supplier)}
													title="Editar"
													type="button"
												>
													<Pencil aria-hidden="true" size={15} />
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
														className="purchases-text-button focus-ring"
														type="submit"
													>
														{supplier.status === "ACTIVE"
															? "Desactivar"
															: "Activar"}
													</button>
												</form>
											</span>
										</td>
									) : null}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

/* ---------------------------------------------- Anular con motivo */

const idle: PurchaseOrderStepState = { status: "idle", message: "" };

function CancelSubmit() {
	const { pending } = useFormStatus();
	return (
		<button
			className="purchases-button purchases-button--danger focus-ring"
			disabled={pending}
			type="submit"
		>
			<Ban aria-hidden="true" size={16} />
			{pending ? "Anulando..." : "Anular orden"}
		</button>
	);
}

export function CancelOrderDialog({ order }: { order: Order }) {
	const [open, setOpen] = useState(false);
	const [state, action] = useActionState(cancelPurchaseOrderAction, idle);
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
				className="purchases-button purchases-button--quiet focus-ring"
				onClick={() => setOpen(true)}
				type="button"
			>
				Anular orden
			</button>
			{open ? (
				<div className="purchases-dialog">
					<button
						aria-label="Cerrar"
						className="purchases-dialog__backdrop"
						onClick={() => setOpen(false)}
						type="button"
					/>
					<section
						aria-labelledby={titleId}
						aria-modal="true"
						className="purchases-dialog__panel"
						role="dialog"
					>
						<header>
							<h2 id={titleId}>Anular {order.number}</h2>
							<button
								aria-label="Cerrar"
								className="purchases-icon-button focus-ring"
								onClick={() => setOpen(false)}
								type="button"
							>
								<X aria-hidden="true" size={16} />
							</button>
						</header>
						<form action={action}>
							<input name="purchaseOrderId" type="hidden" value={order.id} />
							<p>
								{order.status === "ISSUED"
									? "La orden ya no podrá recibirse ni facturarse."
									: "La orden ya no podrá emitirse."}
								{order.requisition
									? ` El requerimiento ${order.requisition.number} volverá a quedar pendiente de compra.`
									: ""}{" "}
								Quedará en <strong>Anuladas</strong> con este motivo.
							</p>
							<label>
								<span>Motivo de la anulación</span>
								<textarea
									// biome-ignore lint/a11y/noAutofocus: el diálogo se abre para escribir el motivo.
									autoFocus
									maxLength={500}
									minLength={5}
									name="reason"
									placeholder="Ej. El proveedor no tenía existencia; se compró a otro."
									required
									rows={3}
								/>
							</label>
							{state.status === "error" ? (
								<p className="purchases-dialog__error" role="alert">
									{state.message}
								</p>
							) : null}
							<footer>
								<button
									className="purchases-button purchases-button--ghost focus-ring"
									onClick={() => setOpen(false)}
									type="button"
								>
									Volver
								</button>
								<CancelSubmit />
							</footer>
						</form>
					</section>
				</div>
			) : null}
		</>
	);
}

/* ------------------------------------- Facturas de la compañía */

type CompanyInvoices = Awaited<ReturnType<typeof getCompanyInvoices>>;

const paymentLabels: Record<string, string> = {
	IMMEDIATE: "Al contado",
	ON_DELIVERY: "Contra entrega",
	CREDIT: "Crédito",
};

export function CompanyInvoicesTable({ data }: { data: CompanyInvoices }) {
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [query, setQuery] = useState("");
	const search = query.trim().toLowerCase();
	const rows = data.invoices.filter((invoice) => {
		const date = invoice.date.slice(0, 10);
		if (from && date < from) return false;
		if (to && date > to) return false;
		if (!search) return true;
		return `${invoice.number ?? ""} ${invoice.supplier} ${invoice.orderNumber ?? ""} ${invoice.warehouse ?? ""}`
			.toLowerCase()
			.includes(search);
	});
	const total = rows.reduce((sum, invoice) => sum + invoice.amount, 0);
	const reportHref = `/purchases/report?${new URLSearchParams({
		...(from ? { from } : {}),
		...(to ? { to } : {}),
	}).toString()}`;

	return (
		<div className="purchases-command__view purchases-table-view">
			<header className="purchases-table-view__header">
				<div>
					<h2>Facturas de la compañía</h2>
					<p>
						Compras para bodega (herramientas, stock). No suman a ningún
						proyecto: el costo llega a la obra cuando el material sale de
						bodega.
					</p>
				</div>
				<a
					className="purchases-button purchases-button--ghost focus-ring"
					href={reportHref}
				>
					<FileText aria-hidden="true" size={16} />
					Reporte para imprimir
				</a>
			</header>
			<div className="purchases-table-filters">
				<label>
					<span>Desde</span>
					<input
						onChange={(event) => setFrom(event.target.value)}
						type="date"
						value={from}
					/>
				</label>
				<label>
					<span>Hasta</span>
					<input
						min={from || undefined}
						onChange={(event) => setTo(event.target.value)}
						type="date"
						value={to}
					/>
				</label>
				<label className="purchases-search">
					<Search aria-hidden="true" size={16} />
					<input
						aria-label="Buscar factura"
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Factura, proveedor u orden"
						value={query}
					/>
				</label>
				<p className="purchases-table-filters__total">
					<span>
						{rows.length} {rows.length === 1 ? "factura" : "facturas"}
					</span>
					<strong>{money.format(total)}</strong>
				</p>
			</div>
			{data.invoices.length === 0 ? (
				<div className="purchases-table-empty">
					<FileText aria-hidden="true" size={26} />
					<strong>Aún no hay facturas de la compañía</strong>
					<p>
						Haz una compra directa para bodega, emítela y usa «Registrar
						factura» en la orden para subir el número y el archivo.
					</p>
				</div>
			) : (
				<div className="purchases-table-wrap">
					<table className="purchases-table">
						<thead>
							<tr>
								<th scope="col">Fecha</th>
								<th scope="col">Factura</th>
								<th scope="col">Proveedor</th>
								<th scope="col">Orden</th>
								<th scope="col">Bodega</th>
								<th scope="col">Pago</th>
								<th className="purchases-table__num" scope="col">
									Monto
								</th>
								<th className="purchases-table__actions" scope="col">
									<span className="sr-only">Archivo</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((invoice) => (
								<tr key={invoice.id}>
									<td className="purchases-table__mono" data-label="Fecha">
										{shortDate.format(new Date(invoice.date))}
									</td>
									<td data-label="Factura">
										<strong className="purchases-table__id">
											{invoice.number ?? "Sin número"}
										</strong>
										{invoice.registeredBy ? (
											<small>Registró {invoice.registeredBy}</small>
										) : null}
									</td>
									<td data-label="Proveedor">
										{invoice.supplier}
										{invoice.supplierTaxId ? (
											<small>NIT {invoice.supplierTaxId}</small>
										) : null}
									</td>
									<td className="purchases-table__mono" data-label="Orden">
										{invoice.orderNumber ?? "—"}
									</td>
									<td data-label="Bodega">{invoice.warehouse ?? "—"}</td>
									<td data-label="Pago">
										{invoice.paymentType
											? (paymentLabels[invoice.paymentType] ??
												invoice.paymentType)
											: "—"}
									</td>
									<td className="purchases-table__num" data-label="Monto">
										{money.format(invoice.amount)}
									</td>
									<td className="purchases-table__actions">
										{invoice.fileUrl ? (
											<a
												className="purchases-text-button focus-ring"
												href={invoice.fileUrl}
												rel="noopener"
												target="_blank"
											>
												Ver archivo
											</a>
										) : (
											<span className="purchases-table__muted">
												Sin archivo
											</span>
										)}
									</td>
								</tr>
							))}
							{rows.length === 0 ? (
								<tr>
									<td className="purchases-table__none" colSpan={8}>
										Ninguna factura coincide con el periodo o la búsqueda.
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
