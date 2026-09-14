import { Prisma } from "@prisma/client";
import {
	Activity,
	BarChart3,
	CalendarDays,
	Camera,
	CheckCircle2,
	ClipboardSignature,
	Clock3,
	FileArchive,
	FileText,
	FileVideo,
	FolderArchive,
	FolderKanban,
	HardHat,
	Hourglass,
	ImageIcon,
	LockKeyhole,
	type LucideIcon,
	PackageCheck,
	ReceiptText,
	ShieldCheck,
	TrendingUp,
	WalletCards,
} from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
	budgetUnitLabel,
	persistedLaborLineUsesJornadas,
} from "@/modules/budgets/domain/units";
import { getClientPortalByToken } from "@/modules/client-portal/application/service";
import { PortalDocumentPreviewModal } from "@/modules/client-portal/ui/portal-document-preview-modal";
import { PortalProgressCharts } from "@/modules/client-portal/ui/portal-progress-charts";
import {
	type PortalTabKey,
	PortalTabs,
} from "@/modules/client-portal/ui/portal-tabs";
import { daysBetweenInclusive } from "@/modules/schedules/application/dates";
import {
	type scheduleActivityStatuses,
	scheduleActivityStatusLabels,
} from "@/modules/schedules/domain/validation";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { requestIp } from "@/shared/lib/request-ip";

const ZERO = new Prisma.Decimal(0);
const currencyFormatter = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});
const dateFormatter = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" });
const dayFormatter = new Intl.DateTimeFormat("es-GT", {
	day: "2-digit",
	month: "short",
	timeZone: "UTC",
});
const portalTabKeys: PortalTabKey[] = [
	"summary",
	"budget",
	"schedule",
	"progress",
	"documents",
];

function toNumber(value: Prisma.Decimal | number | null | undefined) {
	if (value instanceof Prisma.Decimal) return value.toNumber();
	return Number(value ?? 0);
}

function percent(value: number) {
	return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
}

function formatDate(value?: Date | null) {
	return value ? dateFormatter.format(value) : "Sin fecha";
}

function money(value: Prisma.Decimal | number | null | undefined) {
	return currencyFormatter.format(toNumber(value));
}

function addDays(value: Date, days: number) {
	const next = new Date(value);
	next.setUTCDate(next.getUTCDate() + days);
	return next;
}

function offset(start: Date, value: Date) {
	return Math.max(
		0,
		Math.round((value.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
	);
}

function weekKey(startOfTimeline: Date, value: Date) {
	const diffDays = Math.floor(
		(value.getTime() - startOfTimeline.getTime()) / (24 * 60 * 60 * 1000),
	);
	return `${startOfTimeline.toISOString().slice(0, 10)}-${Math.floor(diffDays / 7)}`;
}

function weekLabel(days: Date[]) {
	return `${dayFormatter.format(days[0])} - ${dayFormatter.format(days[days.length - 1])}`;
}

function groupDaysByWeek(days: Date[]) {
	if (days.length === 0) return [];

	return days.reduce<Array<{ key: string; label: string; days: Date[] }>>(
		(groups, day) => {
			const startOfTimeline = days[0];
			const key = weekKey(startOfTimeline, day);
			const current = groups.at(-1);
			if (!current || current.key !== key) {
				groups.push({ key, label: weekLabel([day]), days: [day] });
				return groups;
			}
			current.days.push(day);
			current.label = weekLabel(current.days);
			return groups;
		},
		[],
	);
}

function lineSubtotal(line: {
	type: string;
	quantity: Prisma.Decimal;
	unit: string | null;
	days: Prisma.Decimal | null;
	unitPrice: Prisma.Decimal;
}) {
	if (
		line.type === "LABOR" &&
		persistedLaborLineUsesJornadas(line.unit, line.days) &&
		line.days?.gt(0)
	) {
		return line.quantity.mul(line.days).mul(line.unitPrice).toDecimalPlaces(2);
	}
	return line.quantity.mul(line.unitPrice).toDecimalPlaces(2);
}

function sumLines(
	lines: Array<{
		type: string;
		quantity: Prisma.Decimal;
		unit: string | null;
		days: Prisma.Decimal | null;
		unitPrice: Prisma.Decimal;
	}>,
) {
	return lines.reduce((sum, line) => sum.add(lineSubtotal(line)), ZERO);
}

function groupLabel(type: string) {
	if (type === "MATERIAL") return "Material";
	if (type === "LABOR") return "Mano de obra";
	return "Otros";
}

function activityStatus(status: string) {
	return (
		scheduleActivityStatusLabels[
			status as (typeof scheduleActivityStatuses)[number]
		] ?? status
	);
}

function statusTone(status: string) {
	if (status === "COMPLETED") return "bg-[var(--info)]";
	if (status === "IN_PROGRESS") return "bg-[var(--success)]";
	if (status === "BLOCKED") return "bg-[var(--danger)]";
	return "bg-[var(--warning)]";
}

function statusColor(status: string) {
	if (status === "COMPLETED") return "var(--info)";
	if (status === "IN_PROGRESS") return "var(--success)";
	if (status === "BLOCKED") return "var(--danger)";
	return "var(--warning)";
}

function folderIcon(categoryKey: string): LucideIcon {
	if (categoryKey === "contratos") return ClipboardSignature;
	if (categoryKey === "planos") return FileText;
	if (categoryKey === "renders") return FileVideo;
	if (categoryKey === "comprobantes") return ReceiptText;
	if (categoryKey === "permisos") return ShieldCheck;
	if (categoryKey === "evidencias") return ImageIcon;
	if (categoryKey === "presupuestos" || categoryKey === "estados-cuenta")
		return WalletCards;
	if (categoryKey === "informes") return FileArchive;
	return FolderKanban;
}

function normalizeTab(value?: string | string[]) {
	const tab = Array.isArray(value) ? value[0] : value;
	return portalTabKeys.includes(tab as PortalTabKey)
		? (tab as PortalTabKey)
		: "summary";
}

export default async function ClientPortalPage({
	params,
	searchParams,
}: {
	params: Promise<{ token: string }>;
	searchParams: Promise<{
		tab?: string | string[];
		preview?: string | string[];
		category?: string | string[];
	}>;
}) {
	const [{ token }, query] = await Promise.all([params, searchParams]);
	const ipAddress = await requestIp();
	const workspace = await getClientPortalByToken(token, ipAddress);

	if (!workspace) notFound();

	const activeTab = normalizeTab(query.tab);
	const previewId = Array.isArray(query.preview)
		? query.preview[0]
		: query.preview;
	const categoryId = Array.isArray(query.category)
		? query.category[0]
		: query.category;
	const { project, approvedBudget, budgetChanges, schedule, stats } = workspace;
	const activities = schedule?.activities ?? [];
	const latestReport = project.dailyReports[0] ?? null;
	const reportActivities = latestReport?.activities ?? [];
	const statusBase =
		reportActivities.length > 0 ? reportActivities : activities;
	const statusCounts = statusBase.reduce<Record<string, number>>(
		(counts, activity) => {
			counts[activity.status] = (counts[activity.status] ?? 0) + 1;
			return counts;
		},
		{},
	);
	const reportActivityCount = reportActivities.length || 1;
	const previousAverage =
		reportActivities.reduce(
			(sum, activity) => sum + toNumber(activity.previousProgress),
			0,
		) / reportActivityCount;
	const newAverage =
		reportActivities.length > 0
			? reportActivities.reduce(
					(sum, activity) => sum + toNumber(activity.newProgress),
					0,
				) / reportActivityCount
			: stats.progress;
	const dailyAdvance = Math.max(0, newAverage - previousAverage);
	const movedActivities = reportActivities.filter(
		(activity) =>
			toNumber(activity.todayQuantity) > 0 ||
			toNumber(activity.newProgress) > toNumber(activity.previousProgress),
	).length;
	const issueCount = reportActivities.filter((activity) =>
		activity.issues?.trim(),
	).length;
	const totalPeople =
		latestReport?.laborEntries.reduce(
			(sum, entry) => sum + toNumber(entry.people),
			0,
		) ?? 0;
	const totalHours =
		latestReport?.laborEntries.reduce(
			(sum, entry) => sum + toNumber(entry.hours),
			0,
		) ?? 0;
	const laborCost =
		latestReport?.laborEntries.reduce(
			(sum, entry) => sum + toNumber(entry.amount),
			0,
		) ?? 0;
	const materialsUsed =
		latestReport?.materialEntries.reduce(
			(sum, entry) => sum + toNumber(entry.quantityUsed),
			0,
		) ?? 0;
	const materialWaste =
		latestReport?.materialEntries.reduce(
			(sum, entry) => sum + toNumber(entry.wasteQuantity),
			0,
		) ?? 0;
	const mediaCount = latestReport?.mediaEntries.length ?? 0;
	const totalDays =
		schedule?.startDate && schedule.endDate
			? daysBetweenInclusive(schedule.startDate, schedule.endDate)
			: 0;
	const scheduleStart = schedule?.startDate ?? null;
	const days = scheduleStart
		? Array.from({ length: totalDays }, (_, index) =>
				addDays(scheduleStart, index),
			)
		: [];
	const weeks = groupDaysByWeek(days);
	const progressChartActivities =
		reportActivities.length > 0
			? reportActivities.map((activity) => ({
					name: activity.activityName,
					previous: toNumber(activity.previousProgress),
					current: toNumber(activity.newProgress),
					today: toNumber(activity.todayQuantity),
				}))
			: activities.map((activity) => ({
					name: activity.description,
					previous: toNumber(activity.progress),
					current: toNumber(activity.progress),
					today: 0,
				}));
	const statusPoints = [
		{
			name: "Completadas",
			value: statusCounts.COMPLETED ?? 0,
			status: "COMPLETED" as const,
		},
		{
			name: "En proceso",
			value: statusCounts.IN_PROGRESS ?? 0,
			status: "IN_PROGRESS" as const,
		},
		{
			name: "Pendientes",
			value: statusCounts.PENDING ?? 0,
			status: "PENDING" as const,
		},
		{
			name: "Bloqueadas",
			value: statusCounts.BLOCKED ?? 0,
			status: "BLOCKED" as const,
		},
	];
	const previewDocument = previewId
		? (project.documents.find((document) => document.id === previewId) ?? null)
		: null;
	const documentFolders = Array.from(
		project.documents
			.reduce(
				(folders, document) => {
					const existing = folders.get(document.category.id);
					if (existing) {
						existing.documents.push(document);
					} else {
						folders.set(document.category.id, {
							id: document.category.id,
							name: document.category.name,
							key: document.category.key,
							documents: [document],
						});
					}
					return folders;
				},
				new Map<
					string,
					{
						id: string;
						name: string;
						key: string;
						documents: typeof project.documents;
					}
				>(),
			)
			.values(),
	).sort((a, b) => a.name.localeCompare(b.name));
	const activeFolder = categoryId
		? (documentFolders.find((folder) => folder.id === categoryId) ?? null)
		: null;
	const tabs = [
		{
			key: "summary" as const,
			label: "Resumen",
			detail: "Estado general",
			href: `/portal/${token}`,
		},
		{
			key: "budget" as const,
			label: "Presupuesto",
			detail: approvedBudget
				? `Version ${approvedBudget.versionNumber}`
				: "Pendiente",
			href: `/portal/${token}?tab=budget`,
		},
		{
			key: "schedule" as const,
			label: "Cronograma",
			detail: `${activities.length} actividades`,
			href: `/portal/${token}?tab=schedule`,
		},
		{
			key: "progress" as const,
			label: "Avance diario",
			detail: latestReport ? latestReport.reportNumber : "Sin informe",
			href: `/portal/${token}?tab=progress`,
		},
		{
			key: "documents" as const,
			label: "Documentos",
			detail: `${stats.documents} visibles`,
			href: `/portal/${token}?tab=documents`,
		},
	];

	return (
		<main className="portal-shell min-h-screen text-[var(--foreground)]">
			<section className="portal-topbar">
				<div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
					<div className="flex items-center gap-4">
						<div className="portal-brand-mark relative size-16 overflow-hidden rounded-xl">
							<Image
								alt="Logo del sistema"
								className="object-contain p-2"
								fill
								priority
								sizes="64px"
								src="/brand/logo.png"
							/>
						</div>
						<div className="portal-project-identity">
							<p className="text-sm font-semibold text-[var(--brand-red)]">
								Seguimiento del proyecto
							</p>
							<h1 className="text-2xl font-semibold tracking-[-0.02em]">
								{project.name}
							</h1>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<span className="portal-private-badge">
							<LockKeyhole aria-hidden="true" size={15} />
							Portal privado
						</span>
						<ThemeToggle />
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-7xl space-y-6 px-5 py-6">
				<PortalTabs active={activeTab} tabs={tabs} />

				{activeTab === "summary" ? (
					<div className="space-y-6">
						<section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
							<article className="portal-card portal-card-feature">
								<p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--brand-red)]">
									{project.code}
								</p>
								<div className="mt-4 grid gap-5 lg:grid-cols-[1fr_250px]">
									<div>
										<h2 className="text-3xl font-semibold tracking-[-0.03em]">
											Estado del proyecto
										</h2>
										<div className="mt-5 h-3 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,var(--surface))]">
											<div
												className="h-full rounded-full bg-[var(--success)] shadow-[0_8px_18px_rgba(31,122,90,0.24)]"
												style={{ width: percent(stats.progress) }}
											/>
										</div>
										<div className="mt-3 flex justify-between text-sm text-[var(--muted)]">
											<span>Avance acumulado</span>
											<strong className="text-[var(--foreground)]">
												{percent(stats.progress)}
											</strong>
										</div>
									</div>
									<div className="rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_5%,var(--surface))] p-5 shadow-inner">
										<p className="text-xs font-semibold uppercase text-[var(--muted)]">
											Presupuesto aprobado
										</p>
										<p className="mt-2 text-3xl font-semibold">
											{money(stats.budget)}
										</p>
										<p className="mt-4 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
											Informes publicados
										</p>
										<p className="mt-1 text-2xl font-semibold">
											{stats.reports}
										</p>
									</div>
								</div>
							</article>

							<article className="portal-card">
								<h2 className="text-xl font-semibold">Datos generales</h2>
								<dl className="mt-4 space-y-3 text-sm">
									<DataRow
										label="Cliente"
										value={project.client?.name ?? "No registrado"}
									/>
									<DataRow
										label="Ubicacion"
										value={project.location ?? "Sin ubicacion"}
									/>
									<DataRow
										label="Inicio"
										value={formatDate(project.startDate)}
									/>
									<DataRow
										label="Finalizacion prevista"
										value={formatDate(project.expectedEndDate)}
										last
									/>
								</dl>
							</article>
						</section>

						<section className="kpi-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
							<Metric
								accent="var(--info)"
								icon={CheckCircle2}
								label="Completadas"
								value={stats.completed}
							/>
							<Metric
								accent="var(--success)"
								icon={Activity}
								label="En proceso"
								value={stats.inProgress}
							/>
							<Metric
								accent="var(--warning)"
								icon={Hourglass}
								label="Pendientes"
								value={stats.pending}
							/>
							<Metric
								accent="var(--brand-red)"
								icon={FileText}
								label="Documentos visibles"
								value={stats.documents}
							/>
						</section>

						<section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
							<article className="portal-card">
								<SectionHeader
									icon={TrendingUp}
									title="Lectura ejecutiva"
									detail="Avance, actividad y documentos visibles para el cliente."
								/>
								<div className="kpi-grid mt-5 grid gap-3 md:grid-cols-3">
									<SummaryTile
										label="Avance actual"
										value={percent(stats.progress)}
										detail={
											latestReport
												? `Ultimo informe ${latestReport.reportNumber}`
												: "Sin informe publicado"
										}
									/>
									<SummaryTile
										label="Cronograma"
										value={`${activities.length}`}
										detail="Actividades visibles"
									/>
									<SummaryTile
										label="Presupuesto"
										value={
											approvedBudget
												? `V${approvedBudget.versionNumber}`
												: "Pendiente"
										}
										detail={money(stats.budget)}
									/>
								</div>
							</article>
							<article className="portal-card">
								<SectionHeader
									icon={ShieldCheck}
									title="Estado de acceso"
									detail="Contenido disponible en este enlace privado."
								/>
								<div className="mt-5 grid gap-3">
									{tabs.slice(1).map((tab) => (
										<a
											className="portal-shortcut"
											href={tab.href}
											key={tab.key}
										>
											<span>{tab.label}</span>
											<strong>{tab.detail}</strong>
										</a>
									))}
								</div>
							</article>
						</section>
					</div>
				) : null}

				{activeTab === "budget" ? (
					<div className="space-y-5">
						<section className="portal-card">
							<SectionHeader
								icon={WalletCards}
								title="Presupuesto aprobado"
								detail={
									approvedBudget
										? `Version ${approvedBudget.versionNumber}`
										: "Sin version aprobada"
								}
							/>
							{approvedBudget ? (
								<BudgetSummary
									budget={approvedBudget}
									budgetChanges={budgetChanges}
								/>
							) : (
								<EmptyState text="No hay presupuesto aprobado visible para este portal." />
							)}
						</section>
						{approvedBudget ? (
							<section className="portal-card">
								<SectionHeader
									icon={FileText}
									title="Detalle por renglon"
									detail="Materiales y mano de obra de cada partida."
								/>
								<BudgetPreview
									budget={approvedBudget}
									projectName={project.name}
									projectLocation={project.location ?? project.code}
								/>
							</section>
						) : null}
					</div>
				) : null}

				{activeTab === "schedule" ? (
					<section className="portal-card">
						<SectionHeader
							icon={CalendarDays}
							title="Cronograma"
							detail={schedule?.title ?? "Sin cronograma visible"}
						/>
						{scheduleStart && schedule?.endDate ? (
							<SchedulePreview
								activities={activities}
								days={days}
								scheduleStart={scheduleStart}
								weeks={weeks}
								notes={schedule.notes}
							/>
						) : (
							<EmptyState text="No hay cronograma visible para este portal." />
						)}
					</section>
				) : null}

				{activeTab === "progress" ? (
					<div className="space-y-6">
						<section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
							<article className="portal-card portal-card-feature">
								<SectionHeader
									icon={BarChart3}
									title="Avance diario"
									detail={
										latestReport
											? `${latestReport.reportNumber} - ${formatDate(latestReport.reportDate)}`
											: "Lectura actual del cronograma"
									}
								/>
								<div className="kpi-grid mt-5 grid gap-4 md:grid-cols-3">
									<SummaryTile
										label="Avance actual"
										value={percent(newAverage)}
										detail={
											latestReport
												? `Hoy +${percent(dailyAdvance)}`
												: "Basado en cronograma"
										}
									/>
									<SummaryTile
										label="Actividades con movimiento"
										value={`${movedActivities}/${reportActivities.length || activities.length}`}
										detail={
											latestReport ? "Reportadas hoy" : "Sin informe publicado"
										}
									/>
									<SummaryTile
										label="Evidencias"
										value={mediaCount.toString()}
										detail="Fotos o documentos publicados"
									/>
								</div>
							</article>
							<article className="portal-card">
								<SectionHeader
									icon={Clock3}
									title="Ultima jornada"
									detail={
										latestReport
											? formatDate(latestReport.reportDate)
											: "Pendiente de publicacion"
									}
								/>
								<dl className="mt-4 space-y-3 text-sm">
									<DataRow
										label="Encargado"
										value={
											latestReport?.siteManager ??
											project.responsible?.name ??
											"Sin responsable"
										}
									/>
									<DataRow
										label="Ubicacion"
										value={
											latestReport?.location ??
											project.location ??
											"Sin ubicacion"
										}
									/>
									<DataRow
										label="Mano de obra"
										value={`${totalPeople} personas / ${totalHours.toFixed(1)} horas`}
									/>
									<DataRow
										label="Incidencias"
										value={issueCount.toString()}
										last
									/>
								</dl>
							</article>
						</section>

						<PortalProgressCharts
							activities={progressChartActivities}
							dailyAdvance={dailyAdvance}
							previousAverage={previousAverage}
							progress={newAverage}
							statuses={statusPoints}
						/>

						{latestReport ? (
							<section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
								<article className="portal-card">
									<SectionHeader
										icon={CheckCircle2}
										title="Actividades reportadas"
										detail="Movimiento publicado en el ultimo informe diario."
									/>
									<div className="mt-5 space-y-4">
										{reportActivities.map((activity) => (
											<ActivityMonitor
												current={toNumber(activity.newProgress)}
												issues={activity.issues}
												key={activity.id}
												name={activity.activityName}
												previous={toNumber(activity.previousProgress)}
												status={activity.status}
												today={toNumber(activity.todayQuantity)}
												unit={activity.unit}
											/>
										))}
									</div>
								</article>
								<aside className="space-y-5">
									<article className="portal-card">
										<SectionHeader
											icon={HardHat}
											title="Recursos usados"
											detail="Personal y materiales de la jornada."
										/>
										<div className="mt-4 grid gap-3">
											<ResourceLine
												icon={HardHat}
												label="Mano de obra"
												value={money(laborCost)}
												detail={`${totalPeople} personas`}
											/>
											<ResourceLine
												icon={PackageCheck}
												label="Material usado"
												value={materialsUsed.toFixed(2)}
												detail={`Desperdicio ${materialWaste.toFixed(2)}`}
											/>
										</div>
									</article>
									<article className="portal-card">
										<SectionHeader
											icon={Camera}
											title="Evidencia"
											detail={`${mediaCount} archivos publicados`}
										/>
										<EmptyState
											text={
												mediaCount > 0
													? "La evidencia visible se mostrara aqui cuando tenga archivo publico."
													: "Sin evidencia publicada para el cliente."
											}
										/>
									</article>
								</aside>
							</section>
						) : (
							<section className="portal-card">
								<EmptyState text="Aun no hay informes diarios publicados. Mientras tanto, el portal muestra el avance actual del cronograma visible." />
							</section>
						)}
					</div>
				) : null}

				{activeTab === "documents" ? (
					<section className="portal-card">
						{activeFolder ? (
							<>
								<div className="flex flex-wrap items-center justify-between gap-3">
									<SectionHeader
										icon={folderIcon(activeFolder.key)}
										title={activeFolder.name}
										detail={`${activeFolder.documents.length} documento${activeFolder.documents.length === 1 ? "" : "s"}`}
									/>
									<a
										className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_5%,var(--surface))]"
										href={`/portal/${token}?tab=documents`}
									>
										Volver a carpetas
									</a>
								</div>
								<div className="mt-4 divide-y divide-[var(--border)]">
									{activeFolder.documents.map((document) => {
										const latest = document.versions[0];
										const isImage =
											latest?.mimeType.startsWith("image/") ?? false;
										const isVideo =
											latest?.mimeType.startsWith("video/") ?? false;
										return (
											<div
												className="flex flex-wrap items-center justify-between gap-4 py-4"
												key={document.id}
											>
												<div className="flex items-center gap-3">
													{isImage && latest ? (
														// biome-ignore lint/performance/noImgElement: small list thumbnail, not the Next/Image optimized path.
														<img
															alt={document.title}
															className="size-11 shrink-0 rounded-xl object-cover"
															src={latest.publicUrl}
														/>
													) : (
														<span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--brand-red)_12%,var(--surface))] text-[var(--brand-red)]">
															{isVideo ? (
																<FileVideo aria-hidden="true" size={18} />
															) : (
																<FileText aria-hidden="true" size={18} />
															)}
														</span>
													)}
													<div>
														<p className="font-semibold">{document.title}</p>
														<p className="text-sm text-[var(--muted)]">
															{document.category.name}
														</p>
													</div>
												</div>
												{latest ? (
													<div className="flex items-center gap-2">
														<a
															className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_5%,var(--surface))]"
															href={`/portal/${token}?tab=documents&category=${activeFolder.id}&preview=${document.id}`}
														>
															Ver
														</a>
														<a
															className="rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b51d2a]"
															download
															href={latest.publicUrl}
														>
															Descargar
														</a>
													</div>
												) : null}
											</div>
										);
									})}
								</div>
							</>
						) : (
							<>
								<SectionHeader
									icon={FolderArchive}
									title="Documentos disponibles"
									detail={`${project.documents.length} visibles en ${documentFolders.length} carpeta${documentFolders.length === 1 ? "" : "s"}`}
								/>
								{documentFolders.length > 0 ? (
									<div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
										{documentFolders.map((folder) => {
											const Icon = folderIcon(folder.key);
											return (
												<a
													className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--foreground)_3%,var(--surface))] p-4 shadow-[0_10px_26px_rgba(37,48,51,0.06)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--brand-red)_35%,var(--border))] hover:shadow-[0_16px_36px_rgba(37,48,51,0.12)]"
													href={`/portal/${token}?tab=documents&category=${folder.id}`}
													key={folder.id}
												>
													<span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--brand-red)_14%,var(--surface))] text-[var(--brand-red)]">
														<Icon aria-hidden="true" size={26} />
													</span>
													<div className="min-w-0">
														<p className="truncate font-semibold">
															{folder.name}
														</p>
														<p className="text-sm text-[var(--muted)]">
															{folder.documents.length} documento
															{folder.documents.length === 1 ? "" : "s"}
														</p>
													</div>
												</a>
											);
										})}
									</div>
								) : (
									<EmptyState text="Sin documentos visibles para el cliente." />
								)}
							</>
						)}
					</section>
				) : null}
			</section>

			{previewDocument ? (
				<PortalDocumentPreviewModal
					categoryName={previewDocument.category.name}
					closeHref={`/portal/${token}?tab=documents`}
					title={previewDocument.title}
					version={previewDocument.versions[0] ?? null}
				/>
			) : null}
		</main>
	);
}

function BudgetSummary({
	budget,
	budgetChanges,
}: {
	budget: NonNullable<
		Awaited<ReturnType<typeof getClientPortalByToken>>
	>["approvedBudget"];
	budgetChanges: NonNullable<
		Awaited<ReturnType<typeof getClientPortalByToken>>
	>["budgetChanges"];
}) {
	if (!budget) return null;

	const directBase = budget.lineSubtotal.add(budget.siteManagerCost);
	const currentBudget = budget.grandTotal.add(budgetChanges.total);
	const extraRows = [
		[
			"Administración",
			budget.administrationPercentage,
			budget.administrationAmount,
		],
		["Utilidad", budget.profitPercentage, budget.profitAmount],
		["IVA", budget.vatPercentage, budget.vatAmount],
		["Financiamiento", budget.financingPercentage, budget.financingAmount],
	] as const;

	return (
		// Same fixed light table as the PDF ("Vista PDF" on the internal budget
		// page) on purpose - the client already knows this exact layout, so the
		// portal mirrors it verbatim instead of a different-looking summary.
		// Left-aligned in the portal (unlike the print sheet) since this is the
		// first thing the client should read on the tab, not a corner detail.
		<div className="mt-5 mr-auto w-full max-w-[520px] bg-white p-1 text-xs text-black">
			<h3 className="border-2 border-[#172023] bg-[#172023] px-3 py-2 text-center font-bold uppercase tracking-[0.08em] text-white">
				Resumen financiero
			</h3>
			<table className="w-full border-collapse">
				<tbody>
					<tr>
						<td className="border border-black px-2 py-1">
							Total de renglones
						</td>
						<td className="border border-black px-2 py-1 text-right">
							{money(budget.lineSubtotal)}
						</td>
					</tr>
					<tr>
						<td className="border border-black px-2 py-1">Encargado de obra</td>
						<td className="border border-black px-2 py-1 text-right">
							{money(budget.siteManagerCost)}
						</td>
					</tr>
					<tr className="bg-[#eef2ef] font-semibold">
						<td className="border border-black px-2 py-1">Base directa</td>
						<td className="border border-black px-2 py-1 text-right">
							{money(directBase)}
						</td>
					</tr>
					<tr>
						<td className="border border-black px-2 py-1">
							Imprevistos {budget.contingencyPercentage.toString()}%
						</td>
						<td className="border border-black px-2 py-1 text-right">
							{money(budget.contingencyAmount)}
						</td>
					</tr>
					<tr className="bg-[#eef2ef] font-semibold">
						<td className="border border-black px-2 py-1">Subtotal</td>
						<td className="border border-black px-2 py-1 text-right">
							{money(budget.subtotal)}
						</td>
					</tr>
					{extraRows.map(([label, percentage, amount]) => (
						<tr key={label}>
							<td className="border border-black px-2 py-1">
								{label} {percentage.toString()}%
							</td>
							<td className="border border-black px-2 py-1 text-right">
								{money(amount)}
							</td>
						</tr>
					))}
					<tr>
						<td className="border border-black px-2 py-1">
							Variaciones autorizadas
						</td>
						<td className="border border-black bg-[#fff0b8] px-2 py-1 text-right">
							{money(budgetChanges.total)}
						</td>
					</tr>
					<tr>
						<td className="border-2 border-[#172023] bg-[#d5eee1] px-3 py-2 font-bold uppercase">
							Presupuesto vigente
						</td>
						<td className="border-2 border-[#172023] bg-[#d5eee1] px-3 py-2 text-right text-sm font-bold">
							{money(currentBudget)}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
}

function BudgetPreview({
	budget,
	projectName,
	projectLocation,
}: {
	budget: NonNullable<
		Awaited<ReturnType<typeof getClientPortalByToken>>
	>["approvedBudget"];
	projectName: string;
	projectLocation: string;
}) {
	if (!budget) return null;

	return (
		<div className="mt-5 overflow-x-auto">
			{/* Fixed light + black text on purpose, like /print: this mimics the
			    real paper budget sheet clients already know, so it never follows
			    the portal's light/dark toggle. */}
			<div className="min-w-[960px] space-y-5 bg-white p-1 text-black">
				<div className="border-2 border-black text-center text-xs uppercase">
					<p>Nombre del proyecto:</p>
					<h3 className="border-t border-black bg-[#d9d9d9] py-1 text-base font-bold">
						{projectName}
					</h3>
					<p className="border-t border-black py-1">{projectLocation}</p>
					<p className="border-t border-black bg-[#55c7e8] py-2 text-sm font-bold">
						Presupuesto
					</p>
				</div>
				{budget.sections.map((section) => {
					const groups = ["MATERIAL", "LABOR", "OTHER"]
						.map((type) => {
							const lines = section.lineItems.filter(
								(line) => line.type === type,
							);
							return { type, lines, subtotal: sumLines(lines) };
						})
						.filter((group) => group.lines.length > 0);
					const sectionTotal = groups.reduce(
						(sum, group) => sum.add(group.subtotal),
						ZERO,
					);

					return (
						<section className="text-[11px]" key={section.id}>
							{section.category ? (
								<h4 className="mb-3 border-2 border-black bg-[#55c7e8] py-1 text-center font-bold uppercase">
									{section.category}
								</h4>
							) : null}
							<div className="grid grid-cols-[110px_1fr] border-2 border-black bg-[#d9d9d9] font-bold uppercase">
								<div className="border-r border-black bg-[#55c7e8] px-2 py-1">
									Renglon {section.code}
								</div>
								<div className="px-2 py-1 text-center">{section.name}</div>
							</div>
							{groups.map((group) => (
								<table
									className="w-full border-collapse"
									key={`${section.id}-${group.type}`}
								>
									<thead>
										<tr>
											<th
												className="border-x-2 border-black bg-[#d9d9d9] py-1 text-center font-bold uppercase"
												colSpan={group.type === "LABOR" ? 7 : 6}
											>
												{groupLabel(group.type)}
											</th>
										</tr>
										<tr className="bg-[#eeeeee]">
											<th className="w-16 border border-black px-1 py-1">
												No.
											</th>
											<th className="border border-black px-1 py-1">
												Descripcion
											</th>
											<th className="w-20 border border-black px-1 py-1">
												Cantidad
											</th>
											{group.type === "LABOR" ? (
												<th className="w-16 border border-black px-1 py-1">
													Jornadas
												</th>
											) : null}
											<th className="w-20 border border-black px-1 py-1">
												Unidad
											</th>
											<th className="w-24 border border-black px-1 py-1">
												P/U
											</th>
											<th className="w-28 border border-black px-1 py-1">
												Subtotal
											</th>
										</tr>
									</thead>
									<tbody>
										{group.lines.map((line) => (
											<tr key={line.id}>
												<td className="border border-black px-1 py-1 text-center">
													{line.position}
												</td>
												<td className="border border-black px-1 py-1">
													{line.description}
												</td>
												<td className="border border-black px-1 py-1 text-center">
													{line.quantity.toString()}
												</td>
												{group.type === "LABOR" ? (
													<td className="border border-black px-1 py-1 text-center">
														{persistedLaborLineUsesJornadas(
															line.unit,
															line.days,
														) && line.days?.gt(0)
															? line.days.toString()
															: "—"}
													</td>
												) : null}
												<td className="border border-black px-1 py-1 text-center">
													{budgetUnitLabel(line.unit)}
												</td>
												<td className="border border-black px-1 py-1 text-right">
													{money(line.unitPrice)}
												</td>
												<td className="border border-black px-1 py-1 text-right">
													{money(lineSubtotal(line))}
												</td>
											</tr>
										))}
										<tr>
											<td
												className="border border-black px-1 py-1 text-right font-bold uppercase"
												colSpan={group.type === "LABOR" ? 6 : 5}
											>
												Sub total de {groupLabel(group.type)}
											</td>
											<td className="border border-black px-1 py-1 text-right font-bold">
												{money(group.subtotal)}
											</td>
										</tr>
									</tbody>
								</table>
							))}
							<div className="grid grid-cols-[1fr_140px] border-x-2 border-b-2 border-black text-[11px] font-bold uppercase">
								<div className="bg-[#d9d9d9] px-2 py-1 text-right">
									Total del renglon
								</div>
								<div className="border-l border-black bg-[#55c7e8] px-2 py-1 text-right">
									{money(sectionTotal)}
								</div>
							</div>
						</section>
					);
				})}
			</div>
		</div>
	);
}

function SchedulePreview({
	activities,
	days,
	notes,
	scheduleStart,
	weeks,
}: {
	activities: NonNullable<
		NonNullable<Awaited<ReturnType<typeof getClientPortalByToken>>>["schedule"]
	>["activities"];
	days: Date[];
	notes: string | null;
	scheduleStart: Date;
	weeks: Array<{ key: string; label: string; days: Date[] }>;
}) {
	// table-fixed divides leftover width evenly across day columns - with no
	// explicit width per day, a long schedule (many days) compresses them to
	// unreadable slivers. Giving each day a real min-width and growing the
	// table's own min-width with it keeps every day column legible; it just
	// scrolls further on long schedules instead of squeezing.
	const dayColumnWidth = 26;
	const fixedColumnsWidth = 56 + 360 + 150 + 110;
	const tableMinWidth = fixedColumnsWidth + days.length * dayColumnWidth;

	return (
		<div className="mt-5 overflow-x-auto bg-white p-1 text-black">
			<table
				className="w-full table-fixed border-collapse text-[11px]"
				style={{ minWidth: `${tableMinWidth}px` }}
			>
				<colgroup>
					<col className="w-[56px]" />
					<col className="w-[360px]" />
					<col className="w-[150px]" />
					<col className="w-[110px]" />
					{days.map((day) => (
						<col
							key={`col-${day.toISOString()}`}
							style={{ width: dayColumnWidth }}
						/>
					))}
				</colgroup>
				<thead>
					<tr className="bg-[#e7ece8]">
						<th className="border border-[#777] px-2 py-1" colSpan={4}></th>
						{weeks.map((week) => (
							<th
								className="border border-[#777] px-1 py-1 text-center uppercase"
								colSpan={week.days.length}
								key={week.key}
							>
								Semana {week.label}
							</th>
						))}
					</tr>
					<tr className="bg-[#f4f7f4]">
						<th className="border border-[#777] px-2 py-1">No.</th>
						<th className="border border-[#777] px-2 py-1 text-left">
							Descripcion
						</th>
						<th className="border border-[#777] px-2 py-1">Mano de obra</th>
						<th className="border border-[#777] px-2 py-1">Estado</th>
						{days.map((day) => (
							<th
								className="border border-[#777] px-1 py-1"
								key={day.toISOString()}
							>
								{day.getUTCDate()}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{activities.map((activity) => {
						const startOffset = offset(scheduleStart, activity.plannedStart);
						const duration = daysBetweenInclusive(
							activity.plannedStart,
							activity.plannedEnd,
						);
						const progressDays = Math.ceil(
							(duration *
								Math.min(100, Math.max(0, toNumber(activity.progress)))) /
								100,
						);
						return (
							<tr key={activity.id}>
								<td className="border border-[#777] px-2 py-1 text-center">
									{activity.code}
								</td>
								<td className="border border-[#777] px-2 py-1">
									{activity.description}
								</td>
								<td className="border border-[#777] px-2 py-1 text-center">
									{activity.labor ?? ""}
								</td>
								<td className="border border-[#777] px-2 py-1 text-center">
									{activityStatus(activity.status)}
								</td>
								{days.map((day, index) => {
									const active =
										index >= startOffset && index < startOffset + duration;
									const advanced = active && index < startOffset + progressDays;
									return (
										<td
											className={`border border-[#777] px-1 py-1 ${advanced ? statusTone(activity.status) : ""}`}
											key={`${activity.id}-${day.toISOString()}`}
										>
											&nbsp;
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
			<p className="mt-4 text-xs uppercase text-[#596765]">Nota: {notes}</p>
		</div>
	);
}

function DataRow({
	label,
	value,
	last = false,
}: {
	label: string;
	value: string;
	last?: boolean;
}) {
	return (
		<div
			className={`flex justify-between gap-4 ${last ? "" : "border-b border-[var(--border)] pb-2"}`}
		>
			<dt className="text-[var(--muted)]">{label}</dt>
			<dd className="text-right font-medium">{value}</dd>
		</div>
	);
}

function Metric({
	label,
	value,
	icon: Icon,
	accent,
}: {
	label: string;
	value: number;
	icon: LucideIcon;
	accent: string;
}) {
	return (
		<article className="portal-card portal-metric relative overflow-hidden p-5">
			<span
				className="absolute inset-x-0 top-0 h-[3px]"
				style={{
					background: `linear-gradient(90deg, ${accent} 0%, transparent 100%)`,
				}}
			/>
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
					{label}
				</p>
				<span
					className="grid size-10 shrink-0 place-items-center rounded-xl"
					style={{
						backgroundColor: `color-mix(in srgb, ${accent} 16%, var(--surface))`,
						color: accent,
					}}
				>
					<Icon aria-hidden="true" size={18} />
				</span>
			</div>
			<p className="mt-4 text-3xl font-semibold tabular-nums">{value}</p>
		</article>
	);
}

function SummaryTile({
	label,
	value,
	detail,
}: {
	label: string;
	value: string;
	detail: string;
}) {
	return (
		<div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--foreground)_3%,var(--surface))] p-4 shadow-[0_10px_26px_rgba(37,48,51,0.06)]">
			<p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
				{label}
			</p>
			<p className="mt-2 text-2xl font-semibold">{value}</p>
			<p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
		</div>
	);
}

function ActivityMonitor({
	name,
	previous,
	current,
	today,
	unit,
	status,
	issues,
}: {
	name: string;
	previous: number;
	current: number;
	today: number;
	unit: string | null;
	status: string;
	issues: string | null;
}) {
	const change = Math.max(0, current - previous);
	return (
		<div className="rounded-xl border border-[var(--border)] bg-[var(--glass-surface)] p-4 shadow-[0_10px_24px_rgba(37,48,51,0.05)] backdrop-blur-xl backdrop-saturate-150">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="font-semibold">{name}</p>
					<p className="mt-1 text-sm text-[var(--muted)]">
						{activityStatus(status)} - Hoy {today.toFixed(2)} {unit ?? ""}
					</p>
				</div>
				<div className="text-right">
					<p className="text-lg font-semibold">{percent(current)}</p>
					<p className="text-xs font-semibold text-[var(--success)]">
						+{percent(change)}
					</p>
				</div>
			</div>
			<div className="mt-4 space-y-2">
				<div className="h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,var(--surface))]">
					<div
						className="h-full rounded-full bg-[var(--danger)]"
						style={{ width: percent(previous) }}
					/>
				</div>
				<div className="h-3 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,var(--surface))]">
					<div
						className="h-full rounded-full"
						style={{
							width: percent(current),
							backgroundColor: statusColor(status),
						}}
					/>
				</div>
			</div>
			{issues ? (
				<p className="mt-3 rounded-lg bg-[color-mix(in_srgb,var(--warning)_18%,var(--surface))] px-3 py-2 text-sm text-[var(--warning)]">
					{issues}
				</p>
			) : null}
		</div>
	);
}

function ResourceLine({
	icon: Icon,
	label,
	value,
	detail,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
	detail: string;
}) {
	return (
		<div className="flex items-center gap-3 rounded-xl bg-[color-mix(in_srgb,var(--foreground)_4%,var(--surface))] p-4">
			<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-[var(--success)] shadow-sm">
				<Icon aria-hidden="true" size={18} />
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-semibold">{label}</p>
				<p className="text-xs text-[var(--muted)]">{detail}</p>
			</div>
			<strong className="text-right">{value}</strong>
		</div>
	);
}

function SectionHeader({
	icon: Icon,
	title,
	detail,
}: {
	icon: LucideIcon;
	title: string;
	detail: string;
}) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3">
			<div className="flex items-center gap-3">
				<span className="grid size-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--brand-red)_12%,var(--surface))] text-[var(--brand-red)] shadow-sm">
					<Icon aria-hidden="true" size={19} />
				</span>
				<div>
					<h2 className="text-xl font-semibold">{title}</h2>
					<p className="text-sm text-[var(--muted)]">{detail}</p>
				</div>
			</div>
		</div>
	);
}

function EmptyState({ text }: { text: string }) {
	return (
		<p className="py-10 text-center text-sm text-[var(--muted)]">{text}</p>
	);
}
