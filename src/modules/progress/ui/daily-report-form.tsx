"use client";

import {
	CalendarClock,
	Camera,
	Check,
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	HardHat,
	Save,
	Send,
	type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import type { getProjectProgressWorkspace } from "../application/queries";
import { scheduleActivityStatusLabels } from "@/modules/schedules/domain/validation";
import { OfflineDailyReportDraft } from "@/shared/offline/daily-report-draft";
import { ActivityProgressFields } from "./activity-progress-fields";
import { EvidenceUploadFields } from "./evidence-upload-fields";
import { ResourcesUsedFields } from "./resource-used-fields";

type Workspace = Awaited<ReturnType<typeof getProjectProgressWorkspace>>;
type ActivityRow = {
	dailyReportActivityId: string;
	scheduleActivityId: string;
	activityCode: string;
	activityName: string;
	budgetSectionCode: string;
	budgetSectionName: string;
	workDescription: string;
	unit: string;
	contractedQuantity: string;
	previousQuantity: string;
	todayQuantity: string;
	previousProgress: string;
	status: keyof typeof scheduleActivityStatusLabels;
	issues: string;
	scheduledToday: boolean;
};

type LaborRow = {
	rowKey: string;
	workerLabel: string;
	role: string;
	people: string;
	hours: string;
	rate: string;
	notes: string;
};

type MaterialRow = {
	rowKey: string;
	materialId: string;
	warehouseId: string;
	materialName: string;
	warehouse: string;
	quantityUsed: string;
	unit: string;
	wasteQuantity: string;
	returnedQuantity: string;
	activityCode: string;
	notes: string;
};

type DailyReportFormProps = {
	workspace: Workspace;
	action: (formData: FormData) => Promise<void>;
};

const inputClass =
	"focus-ring h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]";
const textareaClass =
	"focus-ring min-h-[4.25rem] w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm leading-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]";
const labelClass = "grid gap-1 text-sm";
const labelTextClass =
	"text-[11px] font-semibold uppercase text-[var(--muted)]";

function dateInputValue(date: Date | string | null | undefined) {
	if (!date) return new Date().toISOString().slice(0, 10);
	return new Date(date).toISOString().slice(0, 10);
}

function nextReportNumber(reportCount: number) {
	const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
	const sequence = String(reportCount + 1).padStart(2, "0");
	return `INF-${today}-${sequence}`;
}

function blankLaborRow(index: number): LaborRow {
	return {
		rowKey: `blank-labor-${index}`,
		workerLabel: "",
		role: "",
		people: "",
		hours: "",
		rate: "",
		notes: "",
	};
}

function blankMaterialRow(index: number): MaterialRow {
	return {
		rowKey: `blank-material-${index}`,
		materialId: "",
		warehouseId: "",
		materialName: "",
		warehouse: "",
		quantityUsed: "",
		unit: "",
		wasteQuantity: "",
		returnedQuantity: "",
		activityCode: "",
		notes: "",
	};
}

function rowsFromWorkspace(workspace: Workspace): ActivityRow[] {
	const scheduleById = new Map(
		(workspace.schedule?.activities ?? []).map((activity) => [
			activity.id,
			activity,
		]),
	);

	function scheduleQuantity(activityId: string, fallback: string) {
		const activity = scheduleById.get(activityId);
		if (!activity) return fallback;
		const contracted = Number(activity.contractedQuantity);
		const progress = Number(activity.progress);
		if (!Number.isFinite(contracted) || !Number.isFinite(progress))
			return fallback;
		return ((contracted * Math.max(0, Math.min(100, progress))) / 100).toFixed(
			2,
		);
	}

	function savedTodayAsPercent(
		todayQuantity: string,
		contractedQuantity: string,
	) {
		const today = Number(todayQuantity);
		const contracted = Number(contractedQuantity);
		if (!Number.isFinite(today)) return "";
		if (!Number.isFinite(contracted) || contracted <= 0 || contracted === 100)
			return todayQuantity;
		return ((today / contracted) * 100).toFixed(2);
	}

	if (
		workspace.latestReport?.status === "DRAFT" &&
		workspace.latestReport.activities.length > 0
	) {
		return workspace.latestReport.activities.map((activity) => ({
			dailyReportActivityId: activity.id,
			scheduleActivityId: activity.scheduleActivityId ?? "",
			activityCode: activity.activityCode,
			activityName: activity.activityName,
			budgetSectionCode: activity.budgetSectionCode ?? "",
			budgetSectionName: activity.budgetSectionName ?? "",
			workDescription: activity.workDescription,
			unit:
				scheduleById.get(activity.scheduleActivityId ?? "")?.measurementUnit ??
				activity.unit ??
				"%",
			contractedQuantity:
				scheduleById.get(activity.scheduleActivityId ?? "")
					?.contractedQuantity ?? activity.contractedQuantity.toString(),
			previousQuantity: scheduleQuantity(
				activity.scheduleActivityId ?? "",
				activity.previousQuantity.toString(),
			),
			todayQuantity: savedTodayAsPercent(
				activity.todayQuantity.toString(),
				activity.contractedQuantity.toString(),
			),
			previousProgress: activity.previousProgress.toString(),
			status: activity.status,
			issues: activity.issues ?? "",
			scheduledToday: false,
		}));
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	return (workspace.schedule?.activities ?? []).map((activity) => ({
		dailyReportActivityId: "",
		scheduleActivityId: activity.id,
		activityCode: activity.code,
		activityName: activity.description,
		budgetSectionCode: activity.budgetSectionCode ?? "",
		budgetSectionName: activity.budgetSectionName ?? "",
		workDescription: activity.description,
		unit: scheduleById.get(activity.id)?.measurementUnit ?? "%",
		contractedQuantity:
			scheduleById.get(activity.id)?.contractedQuantity ?? "100",
		previousQuantity: scheduleQuantity(activity.id, "0"),
		todayQuantity: "",
		previousProgress: activity.progress.toString(),
		status: activity.status,
		issues: "",
		scheduledToday: isWithinDay(
			today,
			activity.plannedStart,
			activity.plannedEnd,
		),
	}));
}

function isWithinDay(day: Date, start: Date | null, end: Date | null) {
	if (!start || !end) return false;
	const from = new Date(start);
	const to = new Date(end);
	from.setHours(0, 0, 0, 0);
	to.setHours(0, 0, 0, 0);
	return day >= from && day <= to;
}

function laborRows(workspace: Workspace): LaborRow[] {
	const saved =
		workspace.latestReport?.status === "DRAFT"
			? workspace.latestReport.laborEntries
			: [];
	const rows = saved.map((entry) => ({
		rowKey: `saved-labor-${entry.id}`,
		workerLabel: entry.workerLabel,
		role: entry.role ?? "",
		people: entry.people.toString(),
		hours: entry.hours.toString(),
		rate: entry.rate.toString(),
		notes: entry.notes ?? "",
	}));
	return [
		...rows,
		...Array.from({ length: Math.max(3, 4 - rows.length) }, (_, index) =>
			blankLaborRow(index),
		),
	];
}

function materialRows(workspace: Workspace): MaterialRow[] {
	const saved =
		workspace.latestReport?.status === "DRAFT"
			? workspace.latestReport.materialEntries
			: [];
	const rows = saved.map((entry) => ({
		rowKey: `saved-material-${entry.id}`,
		materialId: entry.materialId ?? "",
		warehouseId: entry.warehouseId ?? "",
		materialName: entry.materialName,
		warehouse: entry.warehouse ?? "",
		quantityUsed: entry.quantityUsed.toString(),
		unit: entry.unit ?? "",
		wasteQuantity: entry.wasteQuantity.toString(),
		returnedQuantity: entry.returnedQuantity.toString(),
		activityCode: entry.activityCode ?? "",
		notes: entry.notes ?? "",
	}));
	return [
		...rows,
		...Array.from({ length: Math.max(3, 4 - rows.length) }, (_, index) =>
			blankMaterialRow(index),
		),
	];
}

function progressTone(status: ActivityRow["status"]) {
	if (status === "COMPLETED") return "border-blue-200 bg-blue-50 text-blue-800";
	if (status === "IN_PROGRESS")
		return "border-emerald-200 bg-emerald-50 text-emerald-800";
	if (status === "BLOCKED") return "border-red-200 bg-red-50 text-red-800";
	return "border-slate-200 bg-slate-50 text-slate-700";
}

function numericProgress(value: string) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return 0;
	return Math.max(0, Math.min(100, parsed));
}

function shouldOpenActivity(row: ActivityRow, index: number) {
	return (
		index < 2 ||
		row.todayQuantity !== "" ||
		row.issues !== "" ||
		row.status === "IN_PROGRESS"
	);
}

function StepCard({
	icon: Icon,
	title,
	detail,
	active,
	completed,
	onClick,
}: {
	icon: LucideIcon;
	title: string;
	detail: string;
	active?: boolean;
	completed?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			aria-current={active ? "step" : undefined}
			className={`focus-ring rounded-2xl p-4 text-left transition duration-200 ${active ? "bg-[#172225] text-white shadow-[0_16px_32px_rgba(23,34,37,0.18)]" : "bg-white text-[var(--foreground)] shadow-[0_8px_20px_rgba(31,42,45,0.07)] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(31,42,45,0.1)]"}`}
			onClick={onClick}
			type="button"
		>
			<div className="flex items-start gap-3">
				<span
					className={`grid size-9 shrink-0 place-items-center rounded-xl ${active ? "bg-[var(--brand-red)] text-white shadow-[0_8px_18px_rgba(200,32,47,0.28)]" : completed ? "bg-[#e8f7ef] text-[#167252]" : "bg-[#f0f3f0] text-[#56635e]"}`}
				>
					{completed ? (
						<Check aria-hidden="true" size={18} />
					) : (
						<Icon aria-hidden="true" size={18} />
					)}
				</span>
				<div>
					<p className="text-sm font-semibold">{title}</p>
					<p
						className={`mt-1 text-xs leading-4 ${active ? "text-[#c8d1ce]" : "text-[var(--muted)]"}`}
					>
						{detail}
					</p>
				</div>
			</div>
		</button>
	);
}

export function DailyReportForm({ workspace, action }: DailyReportFormProps) {
	const [activeStep, setActiveStep] = useState(0);
	const report =
		workspace.latestReport?.status === "DRAFT" ? workspace.latestReport : null;
	const rows = rowsFromWorkspace(workspace);
	const labor = laborRows(workspace);
	const materials = materialRows(workspace);
	const hasLaborData = labor.some(
		(row) =>
			row.workerLabel ||
			row.role ||
			row.people ||
			row.hours ||
			row.rate ||
			row.notes,
	);
	const hasMaterialData = materials.some(
		(row) =>
			row.materialId ||
			row.materialName ||
			row.warehouse ||
			row.quantityUsed ||
			row.unit ||
			row.wasteQuantity ||
			row.returnedQuantity ||
			row.activityCode ||
			row.notes,
	);
	const statusOptions = Object.entries(scheduleActivityStatusLabels).map(
		([value, label]) => ({ value, label }),
	);
	const evidenceActivityOptions = rows.map((row) => ({
		value: row.dailyReportActivityId
			? `id:${row.dailyReportActivityId}`
			: `code:${row.activityCode}`,
		label: `${row.activityCode} - ${row.activityName}`,
	}));
	const resourceActivityOptions = rows.map((row) => ({
		value: row.activityCode,
		label: `${row.activityCode} · ${row.activityName}`,
	}));

	function validateBeforeSave(event: FormEvent<HTMLFormElement>) {
		const form = event.currentTarget;
		if (form.checkValidity()) return;
		event.preventDefault();
		const invalid = form.querySelector<HTMLElement>(":invalid");
		const step = Number(
			invalid?.closest<HTMLElement>("[data-report-step]")?.dataset.reportStep,
		);
		if (Number.isInteger(step)) setActiveStep(step);
		requestAnimationFrame(() => {
			invalid?.focus();
			if (
				invalid instanceof HTMLInputElement ||
				invalid instanceof HTMLTextAreaElement ||
				invalid instanceof HTMLSelectElement
			) {
				invalid.reportValidity();
			}
		});
	}

	return (
		<form
			action={action}
			className="space-y-5"
			data-offline-draft-key={`daily-report:${workspace.project?.id ?? "project"}`}
			noValidate
			onSubmit={validateBeforeSave}
		>
			<input name="reportId" type="hidden" value={report?.id ?? ""} />
			<input name="activityCount" type="hidden" value={rows.length} />

			<OfflineDailyReportDraft
				draftKey={`daily-report:${workspace.project?.id ?? "project"}`}
				projectId={workspace.project?.id ?? ""}
			/>
			<section className="overflow-hidden rounded-2xl bg-[#edf1ed] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
				<div className="mb-2 flex items-center justify-between px-2 py-1 text-xs font-semibold text-[#596660]">
					<span>Paso {activeStep + 1} de 4</span>
					<span>
						{
							[
								"Datos de la jornada",
								"Avance de actividades",
								"Recursos utilizados",
								"Evidencias y guardado",
							][activeStep]
						}
					</span>
				</div>
				<div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
					<StepCard
						active={activeStep === 0}
						completed={activeStep > 0}
						detail="Fecha, encargado y horario"
						icon={CalendarClock}
						onClick={() => setActiveStep(0)}
						title="Jornada"
					/>
					<StepCard
						active={activeStep === 1}
						completed={activeStep > 1}
						detail={`${rows.length} frentes disponibles`}
						icon={ClipboardList}
						onClick={() => setActiveStep(1)}
						title="Actividades"
					/>
					<StepCard
						active={activeStep === 2}
						completed={activeStep > 2}
						detail="Personal y materiales"
						icon={HardHat}
						onClick={() => setActiveStep(2)}
						title="Recursos"
					/>
					<StepCard
						active={activeStep === 3}
						detail="Fotos, video y revisión"
						icon={Camera}
						onClick={() => setActiveStep(3)}
						title="Evidencia"
					/>
				</div>
			</section>
			<section
				className="rounded-2xl bg-white p-5 shadow-[0_18px_42px_rgba(31,42,45,0.09)]"
				data-report-step="0"
				hidden={activeStep !== 0}
			>
				<div className="mb-5 flex items-center gap-3">
					<span className="grid size-10 place-items-center rounded-xl bg-[#fff1f1] text-[var(--brand-red)]">
						<ClipboardList aria-hidden="true" size={19} />
					</span>
					<div>
						<h2 className="text-lg font-semibold">Datos de jornada</h2>
						<p className="text-sm text-[var(--muted)]">
							Fecha, responsable, horario y condicion del frente.
						</p>
					</div>
				</div>
				<div className="grid gap-4 lg:grid-cols-6">
					<label className={labelClass}>
						<span className={labelTextClass}>No. informe</span>
						<input
							className={inputClass}
							name="reportNumber"
							defaultValue={
								report?.reportNumber ??
								nextReportNumber(workspace.reports.length)
							}
							required
						/>
					</label>
					<label className={labelClass}>
						<span className={labelTextClass}>Fecha</span>
						<input
							className={inputClass}
							name="reportDate"
							type="date"
							defaultValue={dateInputValue(report?.reportDate)}
							required
						/>
					</label>
					<label className={`${labelClass} lg:col-span-2`}>
						<span className={labelTextClass}>Encargado</span>
						<input
							className={inputClass}
							name="siteManager"
							defaultValue={
								report?.siteManager ??
								workspace.project?.responsible?.name ??
								""
							}
							required
						/>
					</label>
					<label className={labelClass}>
						<span className={labelTextClass}>Jornada</span>
						<input
							className={inputClass}
							name="workShift"
							defaultValue={report?.workShift ?? "Diurna"}
						/>
					</label>
					<label className={labelClass}>
						<span className={labelTextClass}>Clima</span>
						<input
							className={inputClass}
							name="weather"
							defaultValue={report?.weather ?? ""}
							placeholder="Soleado"
						/>
					</label>
					<label className={`${labelClass} lg:col-span-2`}>
						<span className={labelTextClass}>Ubicacion</span>
						<input
							className={inputClass}
							name="location"
							defaultValue={
								report?.location ?? workspace.project?.location ?? ""
							}
						/>
					</label>
					<label className={labelClass}>
						<span className={labelTextClass}>Inicio</span>
						<input
							className={inputClass}
							name="startTime"
							type="time"
							defaultValue={report?.startTime ?? "07:00"}
						/>
					</label>
					<label className={labelClass}>
						<span className={labelTextClass}>Fin</span>
						<input
							className={inputClass}
							name="endTime"
							type="time"
							defaultValue={report?.endTime ?? "16:00"}
						/>
					</label>
					<label className={`${labelClass} lg:col-span-2`}>
						<span className={labelTextClass}>Observaciones generales</span>
						<textarea
							className={textareaClass}
							name="generalObservations"
							defaultValue={report?.generalObservations ?? ""}
						/>
					</label>
				</div>
			</section>

			<section
				className="overflow-hidden rounded-2xl bg-white shadow-[0_18px_42px_rgba(31,42,45,0.09)]"
				data-report-step="1"
				hidden={activeStep !== 1}
			>
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[#fbfbf8] px-5 py-4">
					<div className="flex items-center gap-3">
						<span className="grid size-10 place-items-center rounded-xl bg-[#fff1f1] text-[var(--brand-red)]">
							<ClipboardList aria-hidden="true" size={19} />
						</span>
						<div>
							<h2 className="text-lg font-semibold">
								Actividades trabajadas hoy
							</h2>
							<p className="text-sm text-[var(--muted)]">
								Abre los frentes trabajados. El acumulado y el porcentaje se
								actualizan automáticamente al guardar.
							</p>
						</div>
					</div>
					<span className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--muted)]">
						{rows.length} actividades
					</span>
				</div>

				{rows.some((row) => row.scheduledToday) ? (
					<div className="border-b border-[var(--border)] bg-[#fffdf8] px-5 py-4">
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9b6800]">
							Programadas para hoy
						</p>
						<div className="mt-3 flex gap-2 overflow-x-auto pb-1">
							{rows
								.filter((row) => row.scheduledToday)
								.map((row) => (
									<a
										className="focus-ring min-w-[230px] rounded-xl border border-[#efd89d] bg-white px-3 py-2 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
										href={`#activity-${row.activityCode}`}
										key={`today-${row.activityCode}`}
									>
										<span className="font-semibold">{row.activityCode}</span>
										<span className="mt-1 block truncate text-[var(--muted)]">
											{row.activityName}
										</span>
									</a>
								))}
						</div>
					</div>
				) : null}

				<div className="divide-y divide-[var(--border)]">
					{rows.map((row, index) => {
						const previousProgress = numericProgress(row.previousProgress);

						return (
							<details
								className="group scroll-mt-24"
								id={`activity-${row.activityCode}`}
								key={row.scheduleActivityId || row.activityCode}
								open={shouldOpenActivity(row, index)}
							>
								<summary className="grid cursor-pointer list-none gap-4 px-5 py-4 transition hover:bg-[#fbfaf6] lg:grid-cols-[minmax(15rem,1fr)_11rem_10rem_8rem] lg:items-center">
									<div className="flex min-w-0 items-start gap-3">
										<span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold">
											{index + 1}
										</span>
										<div className="min-w-0">
											<h3 className="break-words text-sm font-semibold leading-5">
												{row.activityName}
											</h3>
											<p className="mt-1 text-xs text-[var(--muted)]">
												Codigo {row.activityCode}
											</p>
										</div>
									</div>
									<div className="rounded-xl border border-[var(--border)] bg-white p-2.5">
										<div className="flex items-center justify-between gap-3 text-xs">
											<span
												className={`rounded-md border px-2 py-1 font-semibold ${progressTone(row.status)}`}
											>
												Anterior
											</span>
											<strong>{row.previousProgress}%</strong>
										</div>
										<div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e4e6e1]">
											<div
												className="h-full rounded-full bg-[#1f7a5a]"
												style={{ width: `${previousProgress}%` }}
											/>
										</div>
									</div>
									<span
										className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${progressTone(row.status)}`}
									>
										{scheduleActivityStatusLabels[row.status]}
									</span>
									<span className="w-fit rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--muted)] group-open:hidden">
										Registrar
									</span>
									<span className="hidden w-fit rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--muted)] group-open:inline-flex">
										Cerrar
									</span>
								</summary>

								<div className="grid gap-4 bg-[#fbfaf6] px-5 pb-5 pt-1 xl:grid-cols-[minmax(240px,300px)_1fr]">
									<div className="rounded-2xl border border-[var(--border)] bg-white p-4">
										<input
											name={`activities.${index}.scheduleActivityId`}
											type="hidden"
											value={row.scheduleActivityId}
										/>
										<input
											name={`activities.${index}.id`}
											type="hidden"
											value={row.dailyReportActivityId}
										/>
										<input
											name={`activities.${index}.activityCode`}
											type="hidden"
											value={row.activityCode}
										/>
										<input
											name={`activities.${index}.activityName`}
											type="hidden"
											value={row.activityName}
										/>
										<input
											name={`activities.${index}.budgetSectionCode`}
											type="hidden"
											value={row.budgetSectionCode}
										/>
										<input
											name={`activities.${index}.budgetSectionName`}
											type="hidden"
											value={row.budgetSectionName}
										/>
										<input
											name={`activities.${index}.contractedQuantity`}
											type="hidden"
											value={row.contractedQuantity}
										/>
										<input
											name={`activities.${index}.previousQuantity`}
											type="hidden"
											value={row.previousQuantity}
										/>
										<input
											name={`activities.${index}.previousProgress`}
											type="hidden"
											value={row.previousProgress}
										/>
										<p className="text-xs font-semibold uppercase text-[var(--muted)]">
											Control de avance
										</p>
										<dl className="mt-3 grid gap-3 text-sm">
											<div className="flex justify-between gap-3 border-b border-[var(--border)] pb-2">
												<dt className="text-[var(--muted)]">Meta de la actividad</dt>
												<dd className="font-semibold tabular-nums">
													{row.contractedQuantity} {row.unit || "%"}
												</dd>
											</div>
											<div className="flex justify-between gap-3 border-b border-[var(--border)] pb-2">
												<dt className="text-[var(--muted)]">
													Ejecutado anterior
												</dt>
												<dd className="font-semibold tabular-nums">
													{row.previousQuantity} {row.unit || "%"}
												</dd>
											</div>
											<div className="flex justify-between gap-3">
												<dt className="text-[var(--muted)]">Renglon</dt>
												<dd className="text-right font-semibold">
													{row.budgetSectionCode || row.activityCode}
												</dd>
											</div>
										</dl>
									</div>

									<ActivityProgressFields
										contractedQuantity={row.contractedQuantity}
										index={index}
										issues={row.issues}
										previousProgress={row.previousProgress}
										previousQuantity={row.previousQuantity}
										status={row.status}
										statusOptions={statusOptions}
										todayQuantity={row.todayQuantity}
										unit={row.unit}
										workDescription={row.workDescription}
									/>
								</div>
							</details>
						);
					})}
				</div>
			</section>

			<details
				className="group overflow-hidden rounded-2xl bg-white shadow-[0_18px_42px_rgba(31,42,45,0.09)]"
				data-report-step="2"
				hidden={activeStep !== 2}
				open={hasLaborData || hasMaterialData || activeStep === 2}
			>
				<summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-[var(--border)] bg-[#fbfbf8] px-5 py-4 transition hover:bg-[#f4f5f2]">
					<div>
						<h2 className="text-lg font-semibold">Recursos usados</h2>
						<p className="text-sm text-[var(--muted)]">
							Personal y materiales de la jornada, cuando aplique.
						</p>
					</div>
					<span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)] group-open:hidden">
						Abrir
					</span>
					<span className="hidden rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)] group-open:inline-flex">
						Cerrar
					</span>
				</summary>
				<ResourcesUsedFields
					activities={resourceActivityOptions}
					initialLabor={labor}
					initialMaterials={materials}
					resources={workspace.inventoryResources}
					warehouses={workspace.warehouses}
				/>
			</details>

			<section
				className="overflow-hidden rounded-2xl bg-white shadow-[0_18px_42px_rgba(31,42,45,0.09)]"
				data-report-step="3"
				hidden={activeStep !== 3}
			>
				<div className="flex items-center gap-3 border-b border-[var(--border)] bg-[#fbfbf8] px-5 py-4">
					<span className="grid size-10 place-items-center rounded-xl bg-[#f4f0ec] text-[#30383a]">
						<Camera aria-hidden="true" size={19} />
					</span>
					<div>
						<h2 className="text-lg font-semibold">Evidencia de campo</h2>
						<p className="text-sm text-[var(--muted)]">
							Fotos o videos que respaldan el avance reportado.
						</p>
					</div>
				</div>
				<EvidenceUploadFields
					activityOptions={evidenceActivityOptions}
					rows={3}
				/>
			</section>
			<div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#172225] px-4 py-3 text-white shadow-[0_18px_40px_rgba(19,29,31,0.24)]">
				<div className="flex items-center gap-2 text-sm text-[#c8d1ce]">
					<Send aria-hidden="true" size={16} />
					<span className="hidden sm:inline">
						Guarda el borrador antes de enviarlo a revisión.
					</span>
					<span className="sm:hidden">Paso {activeStep + 1} de 4</span>
				</div>
				<div className="flex flex-wrap justify-end gap-2">
					{activeStep > 0 ? (
						<button
							className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/20"
							onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
							type="button"
						>
							<ChevronLeft aria-hidden="true" size={17} /> Anterior
						</button>
					) : null}
					<button
						className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#172225] shadow-[0_8px_18px_rgba(0,0,0,0.16)]"
						type="submit"
					>
						<Save aria-hidden="true" size={17} /> Guardar borrador
					</button>
					{activeStep < 3 ? (
						<button
							className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[var(--brand-red)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(200,32,47,0.28)]"
							onClick={() => setActiveStep((step) => Math.min(3, step + 1))}
							type="button"
						>
							Siguiente <ChevronRight aria-hidden="true" size={17} />
						</button>
					) : null}
				</div>
			</div>
		</form>
	);
}
