import type { LucideIcon } from "lucide-react";

type MetricTone = "neutral" | "red" | "amber" | "green";

const metricToneClass: Record<MetricTone, string> = {
	neutral: "reports-metric--neutral",
	red: "reports-metric--red",
	amber: "reports-metric--amber",
	green: "reports-metric--green",
};

export function ReportMetric({
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
		<article className={`reports-metric ${metricToneClass[tone]}`}>
			<div>
				<p className="reports-eyebrow">{label}</p>
				<p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[#111819]">
					{value}
				</p>
				<p className="mt-1 text-xs font-medium text-[#62706a]">{detail}</p>
			</div>
			<span className="reports-metric__icon">
				<Icon aria-hidden="true" size={19} strokeWidth={1.8} />
			</span>
		</article>
	);
}

export function ReportEmpty({
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
		<div className="reports-empty">
			<span className="reports-empty__icon">
				<Icon aria-hidden="true" size={24} strokeWidth={1.65} />
			</span>
			<p className="mt-4 text-base font-bold text-[#172021]">{title}</p>
			<p className="mt-1 max-w-md text-sm leading-6 text-[#66736e]">{detail}</p>
			{action ? <div className="mt-4">{action}</div> : null}
		</div>
	);
}

export function ReportStatus({
	status,
	label,
}: {
	status: string;
	label: string;
}) {
	const tone =
		status === "PUBLISHED" || status === "APPROVED"
			? "success"
			: status === "SUBMITTED" || status === "REVIEWED"
				? "warning"
				: "neutral";

	return (
		<span className={`reports-status reports-status--${tone}`}>
			<span aria-hidden="true" className="reports-status__dot" />
			{label}
		</span>
	);
}
