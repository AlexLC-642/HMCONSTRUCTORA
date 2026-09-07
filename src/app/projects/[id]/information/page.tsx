import {
	ArrowLeft,
	Building2,
	CalendarDays,
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
					<div className="rounded-xl bg-[#fbfaf6] p-4">
						<Building2 className="mb-3 text-[var(--brand-red)]" size={20} />
						<p className="text-xs font-bold uppercase text-[var(--muted)]">
							Cliente
						</p>
						<p className="mt-1 font-semibold">
							{project.client?.name ?? "Sin cliente"}
						</p>
					</div>
					<div className="rounded-xl bg-[#fbfaf6] p-4">
						<MapPin className="mb-3 text-[var(--success)]" size={20} />
						<p className="text-xs font-bold uppercase text-[var(--muted)]">
							Ubicación
						</p>
						<p className="mt-1 font-semibold">
							{project.location ?? "Sin ubicación"}
						</p>
					</div>
					<div className="rounded-xl bg-[#fbfaf6] p-4">
						<Users className="mb-3 text-[var(--steel)]" size={20} />
						<p className="text-xs font-bold uppercase text-[var(--muted)]">
							Responsable
						</p>
						<p className="mt-1 font-semibold">
							{project.responsible?.name ?? "Sin responsable"}
						</p>
					</div>
					<div className="rounded-xl bg-[#fbfaf6] p-4">
						<CalendarDays className="mb-3 text-[var(--safety)]" size={20} />
						<p className="text-xs font-bold uppercase text-[var(--muted)]">
							Planificación
						</p>
						<p className="mt-1 font-semibold">
							{formatDate(project.startDate)} -{" "}
							{formatDate(project.expectedEndDate)}
						</p>
					</div>
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
