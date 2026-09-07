"use client";

import { Banknote, CreditCard, FileSpreadsheet, Layers3 } from "lucide-react";
import { motion } from "motion/react";
import { Children, type ReactNode, useState } from "react";

const tabs = [
	{ label: "Presupuesto y abonos", shortLabel: "Presupuesto", icon: Layers3 },
	{ label: "Estado de cuenta", shortLabel: "Estado", icon: FileSpreadsheet },
	{ label: "Cuentas por pagar", shortLabel: "Proveedores", icon: CreditCard },
	{ label: "Abonos recibidos", shortLabel: "Abonos", icon: Banknote },
];

export function FinanceWorkspaceTabs({
	children,
	counts,
}: {
	children: ReactNode;
	counts: [number, number, number, number];
}) {
	const [active, setActive] = useState(0);
	const panels = Children.toArray(children);

	return (
		<section className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_65px_rgba(19,29,31,0.11)]">
			<div className="border-b border-[#dbe0da] bg-[linear-gradient(120deg,#f7f9f5_0%,#ffffff_60%,#fff4f5_100%)] p-3 sm:p-4">
				<div className="mb-3 px-1">
					<h2 className="text-xl font-semibold text-[#172023]">Centro financiero</h2>
					<p className="mt-1 text-sm text-[#63716c]">Selecciona una sección para consultar o registrar información sin perder el contexto del proyecto.</p>
				</div>
				<div aria-label="Secciones de finanzas" className="flex gap-2 overflow-x-auto pb-1" role="tablist">
					{tabs.map((tab, index) => {
						const Icon = tab.icon;
						const selected = active === index;
						return (
							<button
								aria-selected={selected}
								className={`focus-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition ${selected ? "bg-[#172023] text-white shadow-[0_10px_26px_rgba(23,32,35,0.22)]" : "bg-white text-[#34413d] shadow-[0_5px_16px_rgba(22,27,29,0.07)] hover:-translate-y-0.5 hover:text-[#172023]"}`}
								onClick={() => setActive(index)}
								key={tab.label}
								role="tab"
								type="button"
							>
								<Icon aria-hidden="true" size={17} />
								<span className="hidden sm:inline">{tab.label}</span>
								<span className="sm:hidden">{tab.shortLabel}</span>
								<span className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${selected ? "bg-white/12 text-white" : "bg-[#eef1ed] text-[#5b6863]"}`}>{counts[index]}</span>
							</button>
						);
					})}
				</div>
			</div>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="p-3 [&>section]:!shadow-none sm:p-5"
				initial={{ opacity: 0.82, y: 5 }}
				key={active}
				transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
			>
				{panels[active] ?? null}
			</motion.div>
		</section>
	);
}
