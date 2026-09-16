import {
	ArrowLeft,
	Building2,
	CalendarDays,
	type LucideIcon,
	MapPin,
	Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { updateProjectAction } from "@/modules/projects/application/actions";
import {
	getProjectById,
	listAssignableUsers,
} from "@/modules/projects/application/queries";
import { ProjectForm } from "@/modules/projects/ui/project-form";

const dateFormatter = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" });

function formatDate(value?: Date | null) {
	return value ? dateFormatter.format(value) : "Sin fecha";
}

function InfoTile({
	icon: Icon,
	label,
	value,
	tone,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
	tone: string;
}) {
	return (
		<div className="group relative overflow-hidden rounded-xl bg-[#fbfaf6] p-4 transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_36px_rgba(37,48,51,0.12)] motion-reduce:transform-none motion-reduce:transition-none">
			<span
				className="mb-3 grid size-9 place-items-center rounded-lg text-white shadow-[0_8px_18px_rgba(37,48,51,0.12)] transition duration-200 group-hover:-rotate-3 group-hover:scale-105"
				style={{ backgroundColor: tone }}
			>
				<Icon aria-hidden="true" size={17} />
			</span>
			<p className="text-xs font-bold uppercase text-[var(--muted)]">{label}</p>
			<p className="mt-1 font-semibold">{value}</p>
			<span
				className="pointer-events-none absolute inset-x-0 top-0 h-[3px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
				style={{ backgroundColor: tone }}
			/>
		</div>
	);
}

export default async function ProjectInformationPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const user = await requirePermission("proyectos.ver");
	const { id } = await params;
	const [project, users] = await Promise.all([
		getProjectById(id),
		listAssignableUsers(),
	]);

	if (!project) notFound();

	const canEdit = user.permissions.includes("proyectos.editar");
	const action = updateProjectAction.bind(null, project.id);

	return (
		<main className="mx-auto max-w-7xl space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Información del proyecto</h1>
					<p className="text-sm text-[var(--muted)]">
						{project.code} - {project.name}
					</p>
				</div>
				<a
					className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold shadow-sm"
					href={`/projects/${id}`}
				>
					<ArrowLeft aria-hidden="true" size={16} />
					Resumen
				</a>
			</div>

			<section className="project-panel">
				<div className="kpi-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<InfoTile
						icon={Building2}
						label="Cliente"
						tone="var(--brand-red)"
						value={project.client?.name ?? "Sin cliente"}
					/>
					<InfoTile
						icon={MapPin}
						label="Ubicación"
						tone="var(--success)"
						value={project.location ?? "Sin ubicación"}
					/>
					<InfoTile
						icon={Users}
						label="Responsable"
						tone="var(--steel)"
						value={project.responsible?.name ?? "Sin responsable"}
					/>
					<InfoTile
						icon={CalendarDays}
						label="Planificación"
						tone="var(--safety)"
						value={`${formatDate(project.startDate)} - ${formatDate(project.expectedEndDate)}`}
					/>
				</div>
				{project.observations ? (
					<p className="mt-4 rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">
						{project.observations}
					</p>
				) : null}
			</section>

			{canEdit ? (
				<section className="space-y-3">
					<div>
						<h2 className="text-xl font-semibold">Editar datos</h2>
						<p className="text-sm text-[var(--muted)]">
							Solo información administrativa y planificación general.
						</p>
					</div>
					<ProjectForm
						action={action}
						users={users}
						project={project}
						submitLabel="Guardar cambios"
					/>
				</section>
			) : (
				<section className="project-panel">
					<p className="text-sm text-[var(--muted)]">
						No tienes permiso para editar este proyecto.
					</p>
				</section>
			)}
		</main>
	);
}
