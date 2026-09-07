import { ArrowLeft, ClipboardList, PackageSearch } from "lucide-react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { getProjectDashboard } from "@/modules/projects/application/dashboard";

export default async function ProjectResourcesPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("proyectos.ver");
  const { id } = await params;
  const dashboard = await getProjectDashboard(id);
  if (!dashboard) notFound();

  return (
    <main className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">Recursos del proyecto</h1><p className="text-sm text-[var(--muted)]">{dashboard.project.code} - {dashboard.project.name}</p></div>
        <a className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold shadow-sm" href={`/projects/${id}`}><ArrowLeft size={16} />Resumen</a>
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="project-panel overflow-hidden p-0">
          <div className="project-panel-header px-5 py-4"><div><h2>Requerimientos activos</h2><p>Solicitudes relacionadas al proyecto.</p></div><a href={`/requisitions?projectId=${id}`}>Requerimientos</a></div>
          {dashboard.requisitions.map((request) => <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-sm" key={request.id}><span className="flex items-center gap-2"><ClipboardList size={16} />{request.title}</span><strong>{request.items.length} items</strong></div>)}
          {dashboard.requisitions.length === 0 ? <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">Sin requerimientos activos.</p> : null}
        </article>
        <article className="project-panel overflow-hidden p-0">
          <div className="project-panel-header px-5 py-4"><div><h2>Movimientos de inventario</h2><p>Entradas y salidas recientes.</p></div><a href="/inventory">Inventario</a></div>
          {dashboard.stockMovements.map((movement) => <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-sm" key={movement.id}><span className="flex items-center gap-2"><PackageSearch size={16} />{movement.type}</span><strong>{movement.quantity.toString()}</strong></div>)}
          {dashboard.stockMovements.length === 0 ? <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">Sin movimientos de inventario.</p> : null}
        </article>
      </section>
    </main>
  );
}
