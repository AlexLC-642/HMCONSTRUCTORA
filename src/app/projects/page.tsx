import type { ProjectStatus } from "@prisma/client";
import {
	Calculator,
	CalendarDays,
	ClipboardList,
	FolderKanban,
	MapPin,
	Plus,
	Search,
	UserRound,
} from "lucide-react";
import {
	hasPortfolioAccess,
	requirePermission,
} from "@/modules/auth/application/authorization";
import { listProjects } from "@/modules/projects/application/queries";
import {
	projectStatuses,
	projectStatusLabels,
} from "@/modules/projects/domain/validation";
import { displayUserName } from "@/shared/utils/display-user-name";

const currencyFormatter = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});
const compactCurrencyFormatter = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
	notation: "compact",
	maximumFractionDigits: 1,
});

const inputClass =
	"focus-ring h-11 w-full rounded-xl border border-[#d3d9d3] bg-white px-3 text-sm text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_rgba(17,24,39,0.02)] transition placeholder:text-[#8a9490] hover:border-[#b7bfb8]";
const panelClass =
	"rounded-[20px] border border-[#d7dcd5] bg-white shadow-[0_18px_44px_rgba(23,29,31,0.08),0_2px_0_rgba(255,255,255,0.85)]";

const statusTone: Record<ProjectStatus, string> = {
	DRAFT: "bg-[#eef1ef] text-[#58635f] ring-[#d8ddd7]",
	PLANNING: "bg-blue-50 text-blue-800 ring-blue-200",
	ACTIVE: "bg-emerald-50 text-emerald-800 ring-emerald-200",
	PAUSED: "bg-amber-50 text-amber-900 ring-amber-200",
	COMPLETED: "bg-[#eaf1ff] text-[#1d4ed8] ring-blue-200",
	ARCHIVED: "bg-[#f4f0ed] text-[#59615d] ring-[#d8d7d2]",
	CANCELED: "bg-red-50 text-red-800 ring-red-200",
};

function statusRisk(status: ProjectStatus, progress: number) {
	if (status === "ARCHIVED") return "Archivado";
	if (status === "CANCELED") return "Detenido";
	if (status === "PAUSED") return "Pausado";
	if (status === "COMPLETED" || progress >= 100) return "Finalizado";
	if (status === "ACTIVE" && progress >= 20) return "En ritmo";
	if (status === "ACTIVE") return "Arranque";
	return "Planificacion";
}

function Metric({
	label,
	value,
	detail,
	tone,
}: {
	label: string;
	value: string;
	detail: string;
	tone: "red" | "green" | "amber" | "steel";
}) {
	const toneClass = {
		red: "bg-[var(--brand-red)]",
		green: "bg-[var(--success)]",
		amber: "bg-[var(--safety)]",
		steel: "bg-[var(--steel)]",
	}[tone];

	return (
		<div className="rounded-lg border border-[#cfd5ce] bg-white/80 p-4 shadow-[0_12px_30px_rgba(22,27,29,0.06)] backdrop-blur-xl backdrop-saturate-150">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#58635f]">
						{label}
					</p>
					<p className="mt-2 text-3xl font-semibold leading-none tabular-nums text-[#101416]">
						{value}
					</p>
					<p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
				</div>
				<span className={`mt-1 h-12 w-2 rounded-full ${toneClass}`} />
			</div>
		</div>
	);
}

type ProjectsPageProps = {
	searchParams: Promise<{
		search?: string;
		status?: string;
	}>;
};

export default async function ProjectsPage({
	searchParams,
}: ProjectsPageProps) {
	const user = await requirePermission("proyectos.ver");
	const canSeePortfolio = hasPortfolioAccess(user);
	const params = await searchParams;
	const status =
		params.status === "ALL" ||
		params.status === "OPERATIVE" ||
		projectStatuses.includes(params.status as ProjectStatus)
			? (params.status as ProjectStatus | "ALL" | "OPERATIVE")
			: "OPERATIVE";
	const projects = await listProjects({ search: params.search, status }, user);
	const canCreate = user.permissions.includes("proyectos.crear");
	const activeProjects = projects.filter(
		(project) => project.status === "ACTIVE",
	).length;
	const planningProjects = projects.filter(
		(project) => project.status === "PLANNING" || project.status === "DRAFT",
	).length;
	const totalBudget = projects.reduce(
		(sum, project) => sum + project.baseBudget.toNumber(),
		0,
	);
	const averageProgress =
		projects.length > 0
			? projects.reduce(
					(sum, project) => sum + project.progressPercentage.toNumber(),
					0,
				) / projects.length
			: 0;
	const completedProjects = projects.filter(
		(project) => project.status === "COMPLETED",
	).length;
	const archivedProjects = projects.filter(
		(project) => project.status === "ARCHIVED",
	).length;

	return (
		<main className="mx-auto max-w-[1520px] space-y-5">
			<section className="overflow-hidden rounded-[22px] border border-[#1f2b2d] bg-[radial-gradient(circle_at_top_left,_rgba(74,88,92,0.34),transparent_38%),linear-gradient(135deg,#1a2124_0%,#171d1f_45%,#12181a_100%)] text-white shadow-[0_28px_64px_rgba(18,24,27,0.22),inset_0_1px_0_rgba(255,255,255,0.05)]">
				<div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
					<div>
						<div className="mb-4 flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
							<FolderKanban aria-hidden="true" size={15} />{" "}
							{canSeePortfolio ? "Cartera operativa" : "Proyectos asignados"}
						</div>
						<h1 className="text-4xl font-semibold tracking-[-0.06em] text-white">
							Proyectos
						</h1>
						<p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
							{canSeePortfolio
								? "Seguimiento central de obras, presupuesto base, responsables y accesos de operación diaria."
								: "Obras donde participas como responsable o integrante del equipo."}
						</p>
					</div>
					{canCreate ? (
						<a
							className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#df3948_0%,#c92431_100%)] px-4 text-sm font-semibold text-white shadow-[0_16px_26px_rgba(200,32,47,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_28px_rgba(200,32,47,0.33)]"
							href="/projects/new"
						>
							<Plus aria-hidden="true" size={18} /> Nuevo proyecto
						</a>
					) : null}
				</div>
			</section>

			<section className="kpi-grid grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<Metric
					detail={`${projects.length} visibles en esta vista`}
					label="Activos"
					tone="green"
					value={String(activeProjects)}
				/>
				<Metric
					detail={`${planningProjects} en preparacion`}
					label="Planificacion"
					tone="amber"
					value={String(planningProjects)}
				/>
				<Metric
					detail="Presupuesto base acumulado"
					label="Presupuesto"
					tone="steel"
					value={compactCurrencyFormatter.format(totalBudget)}
				/>
				<Metric
					detail={`${completedProjects} finalizados, ${archivedProjects} archivados`}
					label="Avance cartera"
					tone="red"
					value={`${averageProgress.toFixed(1)}%`}
				/>
			</section>

			<form
				className={`${panelClass} grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_240px_auto]`}
			>
				<div className="relative">
					<Search
						aria-hidden="true"
						className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8580]"
						size={18}
					/>
					<input
						className={`${inputClass} pl-10`}
						name="search"
						placeholder="Buscar por codigo, proyecto, cliente o identificador"
						defaultValue={params.search ?? ""}
					/>
				</div>
				<select className={inputClass} name="status" defaultValue={status}>
					<option value="OPERATIVE">Operativos</option>
					<option value="ALL">Todos los estados</option>
					{projectStatuses.map((item) => (
						<option key={item} value={item}>
							{projectStatusLabels[item]}
						</option>
					))}
				</select>
				<button
					className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#cfd5ce] bg-white px-4 text-sm font-semibold text-[#253033] transition hover:bg-[#f5f6f2]"
					type="submit"
				>
					Filtrar
				</button>
			</form>

			<section className={`${panelClass} overflow-hidden`}>
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe5df] bg-[#f8f7f4] px-5 py-4">
					<div>
						<h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#1b2225]">
							Seguimiento de proyectos
						</h2>
						<p className="mt-1 text-sm text-[var(--muted)]">
							Cada fila concentra estado, avance, presupuesto y accesos
							principales.
						</p>
					</div>
					<span className="rounded-full border border-[#dfe5df] bg-white px-3 py-1 text-xs font-semibold text-[#46504c] shadow-[0_6px_14px_rgba(16,20,20,0.04)]">
						{projects.length} resultados
					</span>
				</div>

				<div className="divide-y divide-[#e6e9e3] bg-[#f4f3f1]">
					{projects.map((project) => {
						const progress = project.progressPercentage.toNumber();
						const risk = statusRisk(project.status, progress);
						return (
							<article
								className="grid gap-4 border-b border-[#e4e8e1] bg-white/70 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_26px_rgba(17,24,39,0.06)] 2xl:grid-cols-[minmax(280px,1fr)_210px_180px_430px] 2xl:items-center"
								key={project.id}
							>
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-2">
										<a
											className="text-lg font-semibold text-[#101416] underline-offset-4 hover:underline"
											href={`/projects/${project.id}`}
										>
											{project.code}
										</a>
										<span
											className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusTone[project.status]}`}
										>
											{projectStatusLabels[project.status]}
										</span>
										<span className="rounded-full bg-[#f2f4f0] px-2.5 py-1 text-xs font-semibold text-[#46504c]">
											{risk}
										</span>
									</div>
									<h3 className="mt-1 truncate text-base font-semibold text-[#1a2326]">
										{project.name}
									</h3>
									<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
										<span className="inline-flex items-center gap-1.5">
											<UserRound aria-hidden="true" size={15} />
											{project.client?.name ?? "Sin cliente"}
										</span>
										<span className="inline-flex items-center gap-1.5">
											<MapPin aria-hidden="true" size={15} />
											{project.location ?? "Sin ubicacion"}
										</span>
									</div>
								</div>

								<div className="rounded-xl bg-[#f8faf8] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
									<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#58635f]">
										Responsable
									</p>
									<p className="mt-1 font-medium text-[#1d2427]">
										{displayUserName(
											project.responsible?.name ?? "Sin asignar",
										)}
									</p>
									<p className="mt-1 text-sm text-[var(--muted)]">
										{project.members.length} integrantes
									</p>
								</div>

								<div className="rounded-xl bg-[#f8faf8] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
									<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#58635f]">
										Presupuesto
									</p>
									<p className="mt-1 text-lg font-semibold tabular-nums text-[#1e272b]">
										{currencyFormatter.format(project.baseBudget.toNumber())}
									</p>
									<div className="mt-3 flex items-center gap-2">
										<div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e4e8e2]">
											<div
												className="h-full rounded-full bg-[linear-gradient(90deg,#1f7f64_0%,#4cc18a_100%)]"
												style={{
													width: `${Math.max(0, Math.min(100, progress))}%`,
												}}
											/>
										</div>
										<span className="text-sm font-semibold tabular-nums text-[#273238]">
											{progress.toFixed(1)}%
										</span>
									</div>
								</div>

								<div className="flex flex-wrap gap-2 2xl:justify-end">
									<a
										className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-[#cfd5ce] bg-white px-3 text-sm font-semibold text-[#253033] shadow-[0_8px_16px_rgba(17,24,39,0.04)] transition hover:-translate-y-0.5 hover:bg-[#f5f6f2] hover:shadow-[0_10px_18px_rgba(17,24,39,0.06)]"
										href={`/projects/${project.id}/budget`}
									>
										<Calculator aria-hidden="true" size={16} /> Presupuesto
									</a>
									<a
										className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-[#cfd5ce] bg-white px-3 text-sm font-semibold text-[#253033] shadow-[0_8px_16px_rgba(17,24,39,0.04)] transition hover:-translate-y-0.5 hover:bg-[#f5f6f2] hover:shadow-[0_10px_18px_rgba(17,24,39,0.06)]"
										href={`/projects/${project.id}/schedule`}
									>
										<CalendarDays aria-hidden="true" size={16} /> Cronograma
									</a>
									<a
										className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl bg-[linear-gradient(180deg,#1d8b63_0%,#167154_100%)] px-3 text-sm font-semibold text-white shadow-[0_14px_22px_rgba(24,123,90,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_24px_rgba(24,123,90,0.28)]"
										href={`/projects/${project.id}/progress`}
									>
										<ClipboardList aria-hidden="true" size={16} /> Avance diario
									</a>
									<a
										className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-[#cfd5ce] bg-[#fbfaf6] px-3 text-sm font-semibold text-[#253033] shadow-[0_8px_16px_rgba(17,24,39,0.04)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_18px_rgba(17,24,39,0.06)]"
										href={`/projects/${project.id}`}
									>
										Expediente
									</a>
								</div>
							</article>
						);
					})}
					{projects.length === 0 ? (
						<div className="grid min-h-[360px] place-items-center px-5 py-12 text-center">
							<div>
								<FolderKanban
									aria-hidden="true"
									className="mx-auto text-[#8d9792]"
									size={36}
								/>
								<p className="mt-3 font-semibold">
									{canSeePortfolio
										? "No hay proyectos con esos filtros."
										: "No tienes proyectos asignados con esos filtros."}
								</p>
								<p className="mt-1 text-sm text-[var(--muted)]">
									Ajusta la busqueda o registra un nuevo proyecto.
								</p>
							</div>
						</div>
					) : null}
				</div>
			</section>
		</main>
	);
}
