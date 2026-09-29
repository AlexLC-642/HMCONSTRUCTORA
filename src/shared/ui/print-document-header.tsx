// Formal header shared by printable documents (budget, account statement).
export function PrintDocumentHeader({
	documentTitle,
	documentMeta,
	projectName,
	details,
}: {
	documentTitle: string;
	documentMeta: string[];
	projectName: string;
	details: { label: string; value: string; wide?: boolean }[];
}) {
	return (
		<header className="mb-6 text-[#1b2325]">
			<div className="flex items-end justify-between gap-4 border-b-2 border-[#c8202f] pb-3">
				<div className="flex items-center gap-3">
					{/* biome-ignore lint/performance/noImgElement: plain image renders reliably in printed PDFs */}
					<img
						alt="HM Constructora"
						className="h-auto w-12 object-contain"
						height={44}
						src="/brand/logo.png"
						width={48}
					/>
					<div>
						<p className="text-[15px] font-extrabold uppercase tracking-[0.04em]">
							HM Constructora
						</p>
						<p className="text-[10px] text-[#5d6a66]">Control de obra</p>
					</div>
				</div>
				<div className="text-right">
					<p className="text-[17px] font-extrabold uppercase tracking-[0.08em] text-[#c8202f]">
						{documentTitle}
					</p>
					{documentMeta.map((item) => (
						<p className="text-[10px] text-[#5d6a66]" key={item}>
							{item}
						</p>
					))}
				</div>
			</div>
			<h1 className="mt-4 mb-3 text-base font-extrabold uppercase leading-tight">
				{projectName}
			</h1>
			<dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border border-[#d7ddd9] bg-[#f3f5f4] px-3 py-2.5 text-[11px]">
				{details.map((detail) => (
					<div
						className={detail.wide ? "col-span-2" : undefined}
						key={detail.label}
					>
						<dt className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#5d6a66]">
							{detail.label}
						</dt>
						<dd className="mt-0.5 font-semibold">{detail.value}</dd>
					</div>
				))}
			</dl>
		</header>
	);
}
