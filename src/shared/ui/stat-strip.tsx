import type { ReactNode } from "react";

/**
 * Franja de indicadores: un solo panel dividido en celdas. Cada celda lleva a
 * su vista con `href` (páginas de servidor) o `onActivate` (componentes de
 * cliente). `attention` marca con un punto solo lo que requiere acción.
 */
export type StatItem = {
	key: string;
	label: string;
	value: ReactNode;
	detail?: ReactNode;
	attention?: "primary" | "warning" | "danger";
	active?: boolean;
	href?: string;
	onActivate?: () => void;
};

export function StatStrip({
	items,
	label,
}: {
	items: StatItem[];
	label: string;
}) {
	return (
		<section aria-label={label} className="hm-stats">
			{items.map((item) => {
				const content = (
					<>
						<span className="hm-stat__label">{item.label}</span>
						<strong className="hm-stat__value">{item.value}</strong>
						{item.detail ? (
							<span className="hm-stat__detail">{item.detail}</span>
						) : null}
					</>
				);
				const common = {
					className: "hm-stat focus-ring",
					"data-attention": item.attention,
					"data-active": item.active || undefined,
				};
				if (item.href) {
					return (
						<a
							{...common}
							aria-current={item.active ? "true" : undefined}
							href={item.href}
							key={item.key}
						>
							{content}
						</a>
					);
				}
				if (item.onActivate) {
					return (
						<button
							{...common}
							key={item.key}
							onClick={item.onActivate}
							type="button"
						>
							{content}
						</button>
					);
				}
				return (
					<div {...common} key={item.key}>
						{content}
					</div>
				);
			})}
		</section>
	);
}
