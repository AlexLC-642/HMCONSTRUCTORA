import { ArrowLeft, CalendarRange, FolderKanban, UsersRound } from "lucide-react";
import { requirePermission } from "@/modules/auth/application/authorization";
import { createProjectAction } from "@/modules/projects/application/actions";
import { listAssignableUsers } from "@/modules/projects/application/queries";
import { ProjectForm } from "@/modules/projects/ui/project-form";

export default async function NewProjectPage() {
  await requirePermission("proyectos.crear");
  const users = await listAssignableUsers();

  return (
    <main className="project-create-workspace mx-auto max-w-[1280px] space-y-6 pb-10">
      <section className="project-create-hero relative overflow-hidden rounded-2xl bg-[#20282b] px-5 py-6 text-white shadow-[0_24px_70px_rgba(20,27,29,0.25)] sm:px-7 sm:py-7">
        <div aria-hidden="true" className="absolute inset-y-0 right-0 w-[44%] opacity-15 [background-image:linear-gradient(135deg,transparent_45%,#fff_45%,#fff_46%,transparent_46%,transparent_54%,#fff_54%,#fff_55%,transparent_55%)] [background-size:72px_72px]" />
        <div className="relative">
          <a className="focus-ring mb-6 inline-flex items-center gap-2 rounded-lg bg-white/[0.08] px-3 py-2 text-xs font-bold text-white/75 transition hover:bg-white/[0.12] hover:text-white" href="/projects"><ArrowLeft aria-hidden="true" size={15} /> Volver a proyectos</a>
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div><h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Crear nuevo proyecto</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#c8cfcc] sm:text-base">Construye el expediente inicial de la obra</p></div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/10 text-xs font-semibold text-white/65">
              <span className="flex items-center gap-2 bg-white/5 px-3 py-3"><FolderKanban aria-hidden="true" size={15} /> Datos</span>
              <span className="flex items-center gap-2 bg-white/5 px-3 py-3"><CalendarRange aria-hidden="true" size={15} /> Plan</span>
              <span className="flex items-center gap-2 bg-white/5 px-3 py-3"><UsersRound aria-hidden="true" size={15} /> Equipo</span>
            </div>
          </div>
        </div>
      </section>
      <ProjectForm action={createProjectAction} users={users} submitLabel="Crear proyecto" />
    </main>
  );
}
