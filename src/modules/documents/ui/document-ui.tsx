import type { LucideIcon } from "lucide-react";

type MetricTone = "neutral" | "red" | "green" | "amber";

export function DocumentMetric({
	icon: Icon,
	label,
	value,
	detail,
	tone = "neutral",
}: {
	icon: LucideIcon;
	label: string;
	value: number | string;
	detail: string;
	tone?: MetricTone;
}) {
	return (
		<article className={`documents-metric documents-metric--${tone}`}>
			<div>
				<p className="documents-label">{label}</p>
				<p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-[#152022]">
					{value}
				</p>
				<p className="mt-1 text-xs font-medium text-[#65736e]">{detail}</p>
			</div>
			<span className="documents-metric__icon">
				<Icon aria-hidden="true" size={19} strokeWidth={1.8} />
			</span>
		</article>
	);
}

export function DocumentEmpty({
	icon: Icon,
	title,
	detail,
	action,
}: {
	icon: LucideIcon;
	title: string;
	detail: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="documents-empty">
			<span className="documents-empty__icon">
				<Icon aria-hidden="true" size={25} strokeWidth={1.7} />
			</span>
			<p className="mt-4 text-base font-bold text-[#172123]">{title}</p>
			<p className="mt-1 max-w-md text-sm leading-6 text-[#65736e]">{detail}</p>
			{action ? <div className="mt-4">{action}</div> : null}
		</div>
	);
}

export function DocumentStatus({
	status,
	label,
}: {
	status: string;
	label: string;
}) {
	const tone =
		status === "APPROVED"
			? "success"
			: status === "REVIEW"
				? "warning"
				: status === "ARCHIVED"
					? "neutral"
					: "draft";

	return (
		<span className={`documents-status documents-status--${tone}`}>
			<span aria-hidden="true" />
			{label}
		</span>
	);
}

export const documentInputClass = "documents-input focus-ring";
