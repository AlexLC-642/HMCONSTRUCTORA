import {
	Banknote,
	CreditCard,
	LayoutDashboard,
	ReceiptText,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export const financeTabs = [
	{ key: "resumen", label: "Resumen", icon: LayoutDashboard },
	{ key: "gastos", label: "Gastos", icon: ReceiptText },
	{ key: "proveedores", label: "Cuentas por pagar", icon: CreditCard },
	{ key: "abonos", label: "Abonos del cliente", icon: Banknote },
] as const;
export type FinanceTabKey = (typeof financeTabs)[number]["key"];

export function resolveFinanceTab(value: string | undefined): FinanceTabKey {
	return financeTabs.some((tab) => tab.key === value)
		? (value as FinanceTabKey)
		: "resumen";
}

/**
 * Tabs are links (?tab=...) so a reload, the back button or a shared link
 * keeps the same view instead of always falling back to the first tab.
 */
export function FinanceWorkspaceTabs({
	active,
	projectId,
	counts,
}: {
	active: FinanceTabKey;
	projectId: string;
	counts: Partial<Record<FinanceTabKey, number>>;
}) {
	return (
		<nav aria-label="Secciones de finanzas" className="fin-tabs">
			{financeTabs.map((tab) => {
				const Icon = tab.icon;
				const count = counts[tab.key];
				return (
					<Link
						aria-current={tab.key === active ? "page" : undefined}
						className="focus-ring"
						data-tab={tab.key}
						href={`/finances?projectId=${projectId}&tab=${tab.key}` as Route}
						key={tab.key}
						scroll={false}
					>
						<Icon aria-hidden="true" size={17} />
						{tab.label}
						{count !== undefined ? <span>{count}</span> : null}
					</Link>
				);
			})}
		</nav>
	);
}
