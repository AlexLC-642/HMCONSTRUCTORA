import { ArrowLeftRight, Boxes, PackageSearch, Rows3 } from "lucide-react";

type View = "stock" | "movement" | "catalog";
export function InventoryWorkspaceHeader({ view }: { view: View }) {
	const links = [
		["stock", "Stock", PackageSearch],
		["movement", "Movimientos", ArrowLeftRight],
		["catalog", "Catálogo", Rows3],
	] as const;

	return (
		<header className="sticky top-[var(--app-shell-header-height)] z-20 -mx-3 bg-[#f3f5f1]/92 px-3 py-3 backdrop-blur-md md:-mx-6 md:px-6">
			<div className="inventory-commandbar mx-auto flex max-w-[1520px] flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
				<div className="relative z-10 flex items-center gap-3.5">
					<span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
						<Boxes aria-hidden="true" size={20} />
					</span>
					<div className="inventory-commandbar__context">
						<h1 className="sr-only">Inventario</h1>
						<strong>Control de existencias</strong>
						<span>Consulta stock o registra movimientos.</span>
					</div>
				</div>
				<nav
					aria-label="Vistas de inventario"
					className="inventory-scrollbar relative z-10 flex max-w-full gap-1 overflow-x-auto rounded-xl bg-black/20 p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
				>
					{links.map(([key, label, Icon]) => (
						<a
							aria-current={view === key ? "page" : undefined}
							className="inventory-main-tab focus-ring inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-bold transition"
							href={`/inventory?view=${key}`}
							key={key}
						>
							<Icon aria-hidden="true" size={16} />
							{label}
						</a>
					))}
				</nav>
			</div>
		</header>
	);
}
