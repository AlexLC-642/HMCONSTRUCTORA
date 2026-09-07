"use client";

import type { ProjectStatus } from "@prisma/client";
import { useEffect, useState, type ElementType, type ReactNode } from "react";
import {
	BadgeDollarSign,
	Building2,
	CalendarRange,
	CheckCircle2,
	Fingerprint,
	FolderKanban,
	Mail,
	MapPin,
	Phone,
	ShieldCheck,
	UserRound,
	UsersRound,
} from "lucide-react";
import { displayUserName } from "@/shared/utils/display-user-name";
import { formatDateInput } from "../domain/validation";
import { ProjectSubmitButton } from "./project-submit-button";

type UserOption = { id: string; name: string; email: string };
type ProjectFormValue = {
	id?: string;
	internalId?: string;
	code?: string;
	name?: string;
	description?: string | null;
	client?: {
		name: string;
		contactName?: string | null;
		email?: string | null;
		phone?: string | null;
	} | null;
	location?: string | null;
	startDate?: Date | string | null;
	expectedEndDate?: Date | string | null;
	actualEndDate?: Date | string | null;
	responsibleId?: string | null;
	status?: ProjectStatus;
	baseBudget?: { toString(): string } | number | string;
	progressPercentage?: { toString(): string } | number | string;
	observations?: string | null;
	portalEnabled?: boolean;
	members?: Array<{ userId: string }>;
};
type ProjectFormProps = {
	action: (formData: FormData) => Promise<void>;
	users: UserOption[];
	project?: ProjectFormValue;
	submitLabel: string;
};

const inputClass =
	"focus-ring h-12 w-full rounded-xl border border-[#c8cec8] bg-white px-3.5 text-sm text-[#111719] shadow-[inset_0_1px_2px_rgba(25,31,33,0.04)] transition placeholder:text-[#808a85] hover:border-[#9ea8a2] focus:border-[#68736d]";
const textareaClass = `${inputClass} min-h-28 resize-y py-3 leading-6`;

function moneyValue(value: ProjectFormValue["baseBudget"]) {
	return value === undefined || value === null ? "0" : value.toString();
}
function projectDate(value: ProjectFormValue["actualEndDate"]) {
	if (!value) return null;
	return new Intl.DateTimeFormat("es-GT", {
		dateStyle: "long",
		timeZone: "UTC",
	}).format(new Date(value));
}
function initials(name: string) {
	return (
		name
			.split(" ")
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join("") || "?"
	);
}

function SectionHeader({
	description,
	icon: Icon,
	title,
	tone = "steel",
}: {
	description: string;
	icon: ElementType;
	title: string;
	tone?: "steel" | "red" | "green" | "amber";
}) {
	const toneClass = {
		steel: "bg-[#20282b] text-white",
		red: "bg-[#cf2435] text-white",
		green: "bg-[#1f7a5b] text-white",
		amber: "bg-[#b77912] text-white",
	}[tone];
	return (
		<header className="mb-5 flex items-start gap-3">
			<span
				className={`grid size-11 shrink-0 place-items-center rounded-xl shadow-[0_10px_24px_rgba(25,31,33,0.16)] ${toneClass}`}
			>
				<Icon aria-hidden="true" size={20} />
			</span>
			<div>
				<h2 className="text-lg font-bold tracking-[-0.02em] text-[#111719]">
					{title}
				</h2>
				<p className="mt-0.5 text-sm leading-5 text-[#65706b]">{description}</p>
			</div>
		</header>
	);
}

function Field({
	children,
	className = "",
	label,
}: {
	children: ReactNode;
	className?: string;
	label: string;
}) {
	return (
		<div className={`grid gap-1.5 ${className}`}>
			<span className="text-xs font-bold text-[#3f4a46]">{label}</span>
			{children}
		</div>
	);
}

export function ProjectForm({
	action,
	users,
	project,
	submitLabel,
}: ProjectFormProps) {
	const [responsibleId, setResponsibleId] = useState(
		project?.responsibleId ?? "",
	);
	const [memberIds, setMemberIds] = useState<Set<string>>(
		new Set(project?.members?.map((member) => member.userId) ?? []),
	);
	const rawProgress = Number(moneyValue(project?.progressPercentage));
	const progress = Number.isFinite(rawProgress) ? rawProgress : 0;

	useEffect(() => {
		setResponsibleId(project?.responsibleId ?? "");
		setMemberIds(
			new Set(project?.members?.map((member) => member.userId) ?? []),
		);
	}, [project?.responsibleId, project?.members]);

	const handleResponsibleChange = (nextResponsibleId: string) => {
		setResponsibleId(nextResponsibleId);
		setMemberIds((current) => {
			const next = new Set(current);
			if (nextResponsibleId) next.add(nextResponsibleId);
			return next;
		});
	};

	const handleMemberToggle = (userId: string, checked: boolean) => {
		setMemberIds((current) => {
			const next = new Set(current);
			if (checked) next.add(userId);
			else next.delete(userId);
			return next;
		});

		if (responsibleId === userId && !checked) {
			setResponsibleId("");
		}
	};

	const visibleMembers = users;

	return (
		<form
			action={action}
			className="project-create-form grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
		>
			<div className="space-y-6">
				<section className="project-form-panel p-5 sm:p-6">
					<SectionHeader
						description="Define la identidad y ubicación de la obra."
						icon={FolderKanban}
						title="Información del proyecto"
						tone="red"
					/>
					<div className="grid gap-4 md:grid-cols-2">
						<Field className="md:col-span-2" label="Nombre del proyecto">
							<input
								aria-label="Nombre del proyecto"
								autoComplete="off"
								className={inputClass}
								name="name"
								placeholder="Ej. Residencial Los Pinos"
								required
								defaultValue={project?.name ?? ""}
							/>
						</Field>
						<Field className="md:col-span-2" label="Descripción">
							<textarea
								aria-label="Descripción"
								className={textareaClass}
								name="description"
								placeholder="Describe el alcance general, tipo de obra y objetivo principal."
								defaultValue={project?.description ?? ""}
							/>
						</Field>
						<Field className="md:col-span-2" label="Ubicación">
							<div className="relative">
								<MapPin
									aria-hidden="true"
									className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#738079]"
									size={18}
								/>
								<input
									aria-label="Ubicación"
									className={`${inputClass} pl-11`}
									name="location"
									placeholder="Municipio, departamento o dirección"
									defaultValue={project?.location ?? ""}
								/>
							</div>
						</Field>
					</div>
				</section>

				<section className="project-form-panel p-5 sm:p-6">
					<SectionHeader
						description="Organiza las fechas y la inversión inicial del proyecto."
						icon={CalendarRange}
						title="Planificación de obra"
						tone="amber"
					/>
					<input
						name="status"
						type="hidden"
						value={project?.status ?? "DRAFT"}
					/>
					<div className="grid gap-4 md:grid-cols-2">
						<Field label="Fecha de inicio">
							<input
								aria-label="Fecha de inicio"
								className={inputClass}
								name="startDate"
								type="date"
								defaultValue={formatDateInput(project?.startDate)}
							/>
						</Field>
						<Field label="Finalización prevista">
							<input
								aria-label="Finalización prevista"
								className={inputClass}
								name="expectedEndDate"
								type="date"
								defaultValue={formatDateInput(project?.expectedEndDate)}
							/>
						</Field>
						<Field label="Presupuesto base">
							<div className="flex h-12 overflow-hidden rounded-xl border border-[#c8cec8] bg-white shadow-[inset_0_1px_2px_rgba(25,31,33,0.04)] transition focus-within:border-[#68736d] focus-within:ring-2 focus-within:ring-[#202629]/15">
								<span className="grid w-14 shrink-0 place-items-center border-r border-[#dde1dc] bg-[#f1f3ef] text-sm font-bold text-[#4f5a55]">
									GTQ
								</span>
								<input
									aria-label="Presupuesto base en quetzales"
									className="min-w-0 flex-1 px-3.5 text-sm outline-none"
									min="0"
									name="baseBudget"
									step="0.01"
									type="number"
									defaultValue={moneyValue(project?.baseBudget)}
								/>
							</div>
						</Field>
						<div className="project-completion-status flex min-h-20 items-center justify-center gap-3 rounded-xl px-4 py-3 text-center">
							<span className="project-completion-status__icon grid size-10 shrink-0 place-items-center rounded-xl">
								<CheckCircle2 aria-hidden="true" size={19} />
							</span>
							<div>
								<p className="project-completion-status__label text-xs font-bold uppercase tracking-[0.08em]">
									Cierre del proyecto
								</p>
								<p className="project-completion-status__value mt-1 text-sm font-bold">
									{projectDate(project?.actualEndDate) ??
										"Pendiente de finalizar"}
								</p>
								<p className="project-completion-status__hint mt-0.5 text-xs">
									{project?.actualEndDate
										? "Fecha registrada automáticamente"
										: "Se asignará al finalizar"}
								</p>
							</div>
						</div>
					</div>
				</section>

				<section className="project-form-panel p-5 sm:p-6">
					<SectionHeader
						description="Información de contacto para coordinación y seguimiento."
						icon={Building2}
						title="Cliente"
						tone="green"
					/>
					<div className="grid gap-4 md:grid-cols-2">
						<Field label="Nombre del cliente">
							<input
								aria-label="Nombre del cliente"
								className={inputClass}
								name="clientName"
								placeholder="Persona o empresa"
								defaultValue={project?.client?.name ?? ""}
							/>
						</Field>
						<Field label="Contacto principal">
							<div className="relative">
								<UserRound
									aria-hidden="true"
									className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#738079]"
									size={17}
								/>
								<input
									aria-label="Contacto principal"
									className={`${inputClass} pl-11`}
									name="clientContactName"
									placeholder="Nombre del contacto"
									defaultValue={project?.client?.contactName ?? ""}
								/>
							</div>
						</Field>
						<Field label="Correo">
							<div className="relative">
								<Mail
									aria-hidden="true"
									className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#738079]"
									size={17}
								/>
								<input
									aria-label="Correo del cliente"
									className={`${inputClass} pl-11`}
									name="clientEmail"
									placeholder="cliente@empresa.com"
									type="email"
									defaultValue={project?.client?.email ?? ""}
								/>
							</div>
						</Field>
						<Field label="Teléfono">
							<div className="relative">
								<Phone
									aria-hidden="true"
									className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#738079]"
									size={17}
								/>
								<input
									aria-label="Teléfono del cliente"
									autoComplete="tel-national"
									className={`${inputClass} pl-11`}
									inputMode="numeric"
									maxLength={8}
									minLength={8}
									name="clientPhone"
									pattern="[0-9]{8}"
									placeholder="55551234"
									defaultValue={project?.client?.phone ?? ""}
								/>
							</div>
							<span className="text-xs text-[#65706b]">
								8 dígitos, sin +502, espacios ni guiones.
							</span>
						</Field>
					</div>
				</section>
			</div>

			<aside className="space-y-6 self-start">
				<section className="project-control-panel overflow-hidden rounded-2xl bg-[#20282b] text-white shadow-[0_24px_64px_rgba(20,27,29,0.24)]">
					<div className="relative overflow-hidden p-5">
						<div
							aria-hidden="true"
							className="absolute inset-y-0 right-0 w-40 opacity-10 [background-image:linear-gradient(135deg,transparent_44%,#fff_44%,#fff_45%,transparent_45%,transparent_55%,#fff_55%,#fff_56%,transparent_56%)] [background-size:44px_44px]"
						/>
						<div className="relative flex items-center gap-3">
							<span className="grid size-10 place-items-center rounded-xl bg-white/10 text-[#f2c15a]">
								<Fingerprint aria-hidden="true" size={19} />
							</span>
							<div>
								<h2 className="font-bold">Control del proyecto</h2>
								<p className="text-xs text-white/60">
									Datos generados por el sistema
								</p>
							</div>
						</div>
					</div>
					<div className="grid gap-px bg-white/10 sm:grid-cols-1 xl:grid-cols-1">
						<div className="bg-[#252e31] p-4">
							<input name="code" type="hidden" value={project?.code ?? ""} />
							<p className="text-xs font-bold uppercase tracking-[0.1em] text-white/55">
								Código del proyecto
							</p>
							<p className="mt-2 font-bold">{project?.code ?? ""}</p>
						</div>
					</div>
					<div className="p-5">
						<div className="flex items-end justify-between gap-3">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.1em] text-white/55">
									Avance calculado
								</p>
								<p className="mt-2 text-3xl font-bold tabular-nums tracking-[-0.04em]">
									{moneyValue(project?.progressPercentage)}%
								</p>
							</div>
							<BadgeDollarSign
								aria-hidden="true"
								className="text-white/30"
								size={32}
							/>
						</div>
						<div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
							<div
								className="h-full rounded-full bg-[#efb735]"
								style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
							/>
						</div>
						<p className="mt-3 text-xs leading-5 text-white/60">
							Se actualiza automáticamente con el cronograma y los informes
							aprobados.
						</p>
					</div>
				</section>

				<section className="project-form-panel p-5">
					<SectionHeader
						description="Asigna responsables y accesos internos."
						icon={UsersRound}
						title="Equipo de proyecto"
					/>
					<Field label="Responsable">
						<select
							aria-label="Responsable"
							className={inputClass}
							name="responsibleId"
							value={responsibleId}
							onChange={(event) => handleResponsibleChange(event.target.value)}
						>
							<option value="">Sin asignar</option>
							{users.map((user) => (
								<option key={user.id} value={user.id}>
									{displayUserName(user.name)}
								</option>
							))}
						</select>
					</Field>
					<fieldset className="mt-5">
						<legend className="text-xs font-bold text-[#3f4a46]">
							Integrantes
						</legend>
						<div className="mt-2 grid gap-2">
							{visibleMembers.length > 0 ? (
								visibleMembers.map((user) => {
									const shortName = displayUserName(user.name);
									const isResponsible = user.id === responsibleId;
									return (
										<label
											className={`group flex cursor-pointer items-center gap-3 rounded-xl p-3 transition ${isResponsible ? "bg-[#eef2f1] ring-1 ring-[#d4d9d6]" : "bg-[#f2f4f0] hover:bg-[#e9ede8]"}`}
											key={user.id}
										>
											<input
												className="size-4 accent-[var(--brand-red)]"
												checked={memberIds.has(user.id)}
												name="memberIds"
												onChange={(event) => {
													const checked = event.target.checked;
													handleMemberToggle(user.id, checked);
													if (checked) {
														setResponsibleId(user.id);
													}
												}}
												type="checkbox"
												value={user.id}
											/>
											<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#20282b] text-[10px] font-bold text-white">
												{initials(shortName)}
											</span>
											<div className="min-w-0 flex-1">
												<strong className="block truncate text-sm">
													{shortName}
												</strong>
												{isResponsible ? (
													<span className="mt-0.5 block text-[11px] font-semibold text-[#5c6864]">
														Responsable
													</span>
												) : null}
											</div>
										</label>
									);
								})
							) : (
								<p className="rounded-xl bg-[#f2f4f0] p-3 text-sm text-[#65706b]">
									No hay usuarios disponibles.
								</p>
							)}
						</div>
					</fieldset>
					<input
						name="portalEnabled"
						type="hidden"
						value={project ? (project.portalEnabled ? "on" : "") : "on"}
					/>
					<div className="project-portal-ready">
						<span>
							<ShieldCheck aria-hidden="true" size={20} />
						</span>
						<div>
							<strong>Portal del cliente incluido</strong>
							<p>
								{project?.portalEnabled === false
									? "Este proyecto conserva el portal desactivado. Puedes habilitarlo desde sus accesos."
									: "Quedará habilitado automáticamente al crear el proyecto; después podrás generar y administrar sus accesos."}
							</p>
						</div>
						<span className="project-portal-ready__status">
							{project?.portalEnabled === false ? "Inactivo" : "Activo"}
						</span>
					</div>
				</section>
			</aside>

			<section className="project-form-panel p-5 sm:p-6 xl:col-span-2">
				<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<Field label="Observaciones internas">
						<textarea
							aria-label="Observaciones internas"
							className={textareaClass}
							name="observations"
							placeholder="Acuerdos iniciales, restricciones, notas de operación o información para el equipo."
							defaultValue={project?.observations ?? ""}
						/>
					</Field>
					<div className="flex flex-col-reverse gap-3 sm:flex-row lg:pb-0.5">
						<a
							className="focus-ring inline-flex h-12 items-center justify-center rounded-xl border border-[#c8cec8] bg-white px-5 text-sm font-bold text-[#3f4a46] transition hover:bg-[#f2f4f0]"
							href="/projects"
						>
							Cancelar
						</a>
						<ProjectSubmitButton label={submitLabel} />
					</div>
				</div>
				<div className="mt-4 flex items-center gap-2 border-t border-[#dde1dc] pt-4 text-xs text-[#65706b]">
					<CheckCircle2
						aria-hidden="true"
						className="text-[#1f7a5b]"
						size={16}
					/>
					<span>
						Podrás completar presupuesto, cronograma y documentos después de
						crear el proyecto.
					</span>
				</div>
			</section>
		</form>
	);
}
