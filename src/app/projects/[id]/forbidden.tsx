import { ArrowLeft, FolderLock } from "lucide-react";
import Link from "next/link";

export default function ProjectForbidden() {
	return (
		<main className="grid min-h-[calc(100vh-8rem)] place-items-center px-4 py-10">
			<section className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[#303c3e] bg-[#172023] px-6 py-9 text-white shadow-[0_28px_72px_rgba(17,24,27,0.28)] sm:px-10">
				<div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#23835f_0_58%,#cf2435_58%_100%)]" />
				<div className="grid size-14 place-items-center rounded-xl bg-[#253235] text-[#75d7b2] shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
					<FolderLock aria-hidden="true" size={25} />
				</div>
				<h1 className="mt-6 text-3xl font-semibold tracking-[-0.035em]">
					Proyecto no asignado
				</h1>
				<p className="mt-3 max-w-md text-sm leading-6 text-[#c3ceca]">
					Tu cuenta no forma parte del equipo responsable de este proyecto.
				</p>
				<Link
					className="focus-ring mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#172023] shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition hover:bg-[#e9efec]"
					href="/projects"
				>
					<ArrowLeft aria-hidden="true" size={17} />
					Volver a mis proyectos
				</Link>
			</section>
		</main>
	);
}
