"use client";

import { Link2, PackageCheck, PackagePlus, Warehouse, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { linkRequisitionItemMaterialAction } from "@/modules/requisitions/application/actions";

type MaterialOption = {
	id: string;
	code: string;
	name: string;
	unit: string;
	unitCost: string;
	resourceType: "MATERIAL" | "TOOL" | "EQUIPMENT";
};

type RequisitionItemOption = {
	id: string;
	description: string;
	unit: string;
	estimatedCost: string;
	quantity: string;
	requisitionNumber: string;
	project: string;
	warehouse: string;
	resourceType: "MATERIAL" | "TOOL" | "EQUIPMENT";
};

const resourceLabels = {
	MATERIAL: "Material",
	TOOL: "Herramienta",
	EQUIPMENT: "Equipo",
} as const;

function SubmitButton({ disabled }: { disabled: boolean }) {
	const { pending } = useFormStatus();

	return (
		<button
			className="requisitions-submit focus-ring"
			disabled={disabled || pending}
			type="submit"
		>
			<Link2 aria-hidden="true" size={18} />
			{pending ? "Vinculando…" : "Vincular recurso"}
		</button>
	);
}

export function RequisitionMaterialLinkDialog({
	item,
	materials,
}: {
	item: RequisitionItemOption;
	materials: MaterialOption[];
}) {
	const [mode, setMode] = useState<"EXISTING" | "NEW">(
		materials.length > 0 ? "EXISTING" : "NEW",
	);
	const [materialId, setMaterialId] = useState("");
	const [resourceType, setResourceType] = useState(item.resourceType);

	return (
		<div className="requisitions-modal-backdrop" role="presentation">
			<form
				action={linkRequisitionItemMaterialAction}
				aria-labelledby="material-link-dialog-title"
				className="requisitions-modal requisitions-link-modal"
				role="dialog"
			>
				<input name="requisitionItemId" type="hidden" value={item.id} />
				<input name="mode" type="hidden" value={mode} />

				<header className="requisitions-modal__header">
					<span className="requisitions-modal__mark">
						<Link2 aria-hidden="true" size={22} />
					</span>
					<div className="min-w-0 flex-1">
						<h2
							className="text-xl font-semibold text-white"
							id="material-link-dialog-title"
						>
							Vincular recurso
						</h2>
						<p className="mt-1 text-sm text-[#cbd3d0]">
							Así podrá recibirse y sumarse al inventario de la bodega.
						</p>
					</div>
					<Link
						aria-label="Cerrar"
						className="requisitions-modal__close focus-ring"
						href="/requisitions"
					>
						<X aria-hidden="true" size={20} />
					</Link>
				</header>

				<div className="requisitions-modal__body">
					<section className="requisitions-link-summary">
						<div className="requisitions-link-summary__material">
							<PackageCheck aria-hidden="true" size={19} />
							<div className="min-w-0">
								<strong>{item.description}</strong>
								<span>
									{item.quantity} {item.unit || "U"} · {item.requisitionNumber}
								</span>
							</div>
						</div>
						<div className="requisitions-link-summary__destination">
							<Warehouse aria-hidden="true" size={18} />
							<div>
								<small>Destino</small>
								<strong>{item.warehouse}</strong>
								<span>{item.project}</span>
							</div>
						</div>
					</section>

					<fieldset className="requisitions-link-choice">
						<legend className="sr-only">Forma de vinculación</legend>
						<button
							aria-pressed={mode === "EXISTING"}
							className="focus-ring"
							data-active={mode === "EXISTING"}
							disabled={materials.length === 0}
							onClick={() => setMode("EXISTING")}
							type="button"
						>
							<PackageCheck aria-hidden="true" size={17} />
							Elegir del catálogo
						</button>
						<button
							aria-pressed={mode === "NEW"}
							className="focus-ring"
							data-active={mode === "NEW"}
							onClick={() => setMode("NEW")}
							type="button"
						>
							<PackagePlus aria-hidden="true" size={17} />
							Crear recurso
						</button>
					</fieldset>

					{mode === "EXISTING" ? (
						<section className="requisitions-form-section">
							<label className="grid gap-1.5">
								<span className="requisitions-field-label">
									Recurso del catálogo
								</span>
								<select
									className="requisitions-input"
									name="materialId"
									onChange={(event) => setMaterialId(event.target.value)}
									required
									value={materialId}
								>
									<option value="">Seleccionar recurso</option>
									{materials.map((material) => (
										<option key={material.id} value={material.id}>
											{material.code} - {material.name} ({material.unit})
										</option>
									))}
								</select>
							</label>
							<p className="requisitions-link-help">
								La cantidad y el costo de esta solicitud no cambiarán.
							</p>
						</section>
					) : (
						<section className="requisitions-form-section">
							<div className="grid gap-4 sm:grid-cols-2">
								<label className="grid gap-1.5 sm:col-span-2">
									<span className="requisitions-field-label">
										Tipo de recurso
									</span>
									<select
										className="requisitions-input"
										name="resourceType"
										onChange={(event) =>
											setResourceType(event.target.value as typeof resourceType)
										}
										value={resourceType}
									>
										{Object.entries(resourceLabels).map(([value, label]) => (
											<option key={value} value={value}>
												{label}
											</option>
										))}
									</select>
								</label>
								<label className="grid gap-1.5 sm:col-span-2">
									<span className="requisitions-field-label">Nombre</span>
									<input
										className="requisitions-input"
										defaultValue={item.description}
										name="name"
										required
									/>
								</label>
								<label className="grid gap-1.5">
									<span className="requisitions-field-label">Unidad</span>
									<input
										className="requisitions-input"
										defaultValue={item.unit || "U"}
										name="unit"
										required
									/>
								</label>
								<label className="grid gap-1.5">
									<span className="requisitions-field-label">
										Costo unitario
									</span>
									<input
										className="requisitions-input"
										defaultValue={item.estimatedCost}
										min="0"
										name="unitCost"
										step="0.01"
										type="number"
									/>
								</label>
								<label className="grid gap-1.5 sm:col-span-2">
									<span className="requisitions-field-label">Stock mínimo</span>
									<input
										className="requisitions-input"
										defaultValue="0"
										min="0"
										name="minimumStock"
										step="0.01"
										type="number"
									/>
								</label>
								<label className="grid gap-1.5 sm:col-span-2">
									<span className="requisitions-field-label">
										Especificación
									</span>
									<input
										className="requisitions-input"
										name="specification"
										placeholder="Medida, capacidad o presentación"
									/>
								</label>
								<label className="grid gap-1.5">
									<span className="requisitions-field-label">Marca</span>
									<input className="requisitions-input" name="brand" />
								</label>
								<label className="grid gap-1.5">
									<span className="requisitions-field-label">Modelo</span>
									<input className="requisitions-input" name="model" />
								</label>
								{resourceType !== "MATERIAL" ? (
									<label className="flex items-center gap-3 rounded-xl bg-[#eef2ef] px-4 py-3 text-sm font-semibold text-[#101416] sm:col-span-2">
										<input
											className="size-4 accent-[var(--brand-red)]"
											name="trackIndividually"
											type="checkbox"
										/>
										Controlar cada unidad por separado
									</label>
								) : null}
							</div>
						</section>
					)}
				</div>

				<footer className="requisitions-modal__footer">
					<Link
						className="requisitions-modal__cancel focus-ring"
						href="/requisitions"
					>
						Cancelar
					</Link>
					<SubmitButton disabled={mode === "EXISTING" && !materialId} />
				</footer>
			</form>
		</div>
	);
}
