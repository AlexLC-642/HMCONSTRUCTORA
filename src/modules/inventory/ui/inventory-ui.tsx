import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const inventoryInputClass =
	"focus-ring h-12 w-full rounded-xl border border-[#c9d0cc] bg-white px-3.5 text-sm text-[#17201f] shadow-[inset_0_1px_2px_rgba(19,31,29,0.04)] outline-none transition placeholder:text-[#7a8580] hover:border-[#aeb9b3] focus:border-[#c8202f] focus:ring-4 focus:ring-[#c8202f]/10 disabled:cursor-not-allowed disabled:bg-[#eef1ed] disabled:text-[#68736e]";

export const inventoryTextareaClass =
	"focus-ring min-h-24 w-full resize-y rounded-xl border border-[#c9d0cc] bg-white p-3.5 text-sm text-[#17201f] shadow-[inset_0_1px_2px_rgba(19,31,29,0.04)] outline-none transition placeholder:text-[#7a8580] hover:border-[#aeb9b3] focus:border-[#c8202f] focus:ring-4 focus:ring-[#c8202f]/10";

export const inventoryPrimaryButtonClass =
	"inventory-primary-action focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#c8202f] px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(160,20,35,0.24)] transition hover:-translate-y-0.5 hover:bg-[#af1c29] hover:shadow-[0_16px_32px_rgba(160,20,35,0.3)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none";

export const inventorySecondaryButtonClass =
	"inventory-secondary-action focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#cbd2ce] bg-white px-4 text-sm font-bold text-[#202a29] shadow-[0_8px_18px_rgba(28,40,38,0.08)] transition hover:-translate-y-0.5 hover:border-[#aeb8b3] hover:bg-[#f6f7f4] motion-reduce:transform-none motion-reduce:transition-none";

export const inventoryLabelClass =
	"text-[11px] font-bold uppercase tracking-[0.13em] text-[#4f5c57]";

export function InventoryPanel({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={`inventory-panel ${className}`}>{children}</section>
	);
}

export function InventorySectionHeader({
	icon: Icon,
	title,
	description,
	action,
}: {
	icon?: LucideIcon;
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#dce1dd] px-4 py-4 sm:px-5">
			<div className="flex min-w-0 items-start gap-3">
				{Icon ? (
					<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#202a2c] text-white shadow-[0_10px_22px_rgba(21,31,33,0.18)]">
						<Icon aria-hidden="true" size={18} />
					</span>
				) : null}
				<div className="min-w-0">
					<h2 className="text-lg font-bold tracking-[-0.02em] text-[#17201f]">
						{title}
					</h2>
					{description ? (
						<p className="mt-0.5 text-sm leading-5 text-[#5e6b66]">
							{description}
						</p>
					) : null}
				</div>
			</div>
			{action}
		</div>
	);
}

export function InventoryMetric({
	icon: Icon,
	label,
	value,
	detail,
	tone = "graphite",
}: {
	icon: LucideIcon;
	label: string;
	value: ReactNode;
	detail: string;
	tone?: "graphite" | "green" | "blue" | "amber" | "red";
}) {
	return (
		<article className="inventory-metric" data-tone={tone}>
			<div>
				<p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#53605b]">
					{label}
				</p>
				<strong className="mt-3 block text-[1.7rem] font-bold leading-none tracking-[-0.03em] text-[#17201f] tabular-nums">
					{value}
				</strong>
				<p className="mt-2 text-xs font-medium text-[#63706b]">{detail}</p>
			</div>
			<span className="inventory-metric-icon">
				<Icon aria-hidden="true" size={19} />
			</span>
		</article>
	);
}

export function InventoryEmpty({
	icon: Icon,
	title,
	description,
	action,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: ReactNode;
}) {
	return (
		<div className="grid min-h-52 place-items-center px-5 py-10 text-center">
			<div className="max-w-sm">
				<span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#edf0ec] text-[#40504a] shadow-[inset_0_0_0_1px_rgba(54,70,64,0.08)]">
					<Icon aria-hidden="true" size={21} />
				</span>
				<h3 className="mt-4 font-bold text-[#17201f]">{title}</h3>
				<p className="mx-auto mt-1 max-w-[36ch] text-sm leading-6 text-[#63706b]">
					{description}
				</p>
				{action ? (
					<div className="mt-4 flex justify-center">{action}</div>
				) : null}
			</div>
		</div>
	);
}

export function InventoryStatus({
	tone,
	children,
}: {
	tone: "success" | "warning" | "danger" | "neutral" | "info";
	children: ReactNode;
}) {
	return (
		<span className="inventory-status" data-tone={tone}>
			<span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
			{children}
		</span>
	);
}
