const currencyFullFormatter = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function moneyFull(value: number) {
	return currencyFullFormatter.format(value);
}

export function moneyCompact(value: number) {
	if (Math.abs(value) >= 1_000_000)
		return `Q ${(value / 1_000_000).toFixed(2)}M`;
	if (Math.abs(value) >= 1_000) return `Q ${(value / 1_000).toFixed(0)}K`;
	return moneyFull(value);
}

export function percent(value: number | null | undefined, decimals = 1) {
	if (value === null || value === undefined || Number.isNaN(value))
		return "Sin datos";
	return `${value.toFixed(decimals)}%`;
}

export function progressGap(value: number | null | undefined, decimals = 1) {
	if (value === null || value === undefined || Number.isNaN(value))
		return "Sin datos";
	if (Math.abs(value) < 0.05) return "Al día";

	const magnitude = Number(Math.abs(value).toFixed(decimals)).toString();
	return value < 0 ? `Atraso de ${magnitude}%` : `Adelanto de ${magnitude}%`;
}

export function shortDate(value: string) {
	return new Intl.DateTimeFormat("es-GT", {
		day: "2-digit",
		month: "short",
	}).format(new Date(value));
}
