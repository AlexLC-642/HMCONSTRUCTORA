export const laborUnitOptions = [
	{ value: "persona", label: "Persona", quantityLabel: "Personal" },
	{ value: "día", label: "Día", quantityLabel: "Días" },
	{ value: "m²", label: "Metro cuadrado (m²)", quantityLabel: "Cantidad (m²)" },
	{ value: "m³", label: "Metro cúbico (m³)", quantityLabel: "Cantidad (m³)" },
	{ value: "unidad", label: "Unidad", quantityLabel: "Cantidad" },
	{ value: "global", label: "Global / por trato", quantityLabel: "Trato" },
] as const;

export const generalUnitOptions = [
	{ value: "unidad", label: "Unidad" },
	{ value: "m", label: "Metro lineal (m)" },
	{ value: "m²", label: "Metro cuadrado (m²)" },
	{ value: "m³", label: "Metro cúbico (m³)" },
	{ value: "kg", label: "Kilogramo (kg)" },
	{ value: "saco", label: "Saco" },
	{ value: "galón", label: "Galón" },
	{ value: "lote", label: "Lote" },
	{ value: "global", label: "Global" },
] as const;

const legacyDayUnits = new Set(["dia", "dias", "día", "días"]);

function cleanUnit(unit: string | null | undefined) {
	return unit?.trim().toLocaleLowerCase("es-GT") ?? "";
}

export function laborUnitUsesJornadas(unit: string | null | undefined) {
	return cleanUnit(unit) === "persona";
}

export function persistedLaborLineUsesJornadas(
	unit: string | null | undefined,
	days: { gt(value: number): boolean } | string | number | null | undefined,
) {
	if (laborUnitUsesJornadas(unit)) return true;
	const hasDays =
		typeof days === "object" && days !== null && "gt" in days
			? days.gt(0)
			: Number(days ?? 0) > 0;
	return legacyDayUnits.has(cleanUnit(unit)) && hasDays;
}

export function normalizeLaborUnit(
	unit: string | null | undefined,
	days?: string | number | null,
) {
	const cleaned = cleanUnit(unit);
	if (legacyDayUnits.has(cleaned))
		return Number(days ?? 0) > 0 ? "persona" : "día";
	return laborUnitOptions.some((option) => option.value === unit)
		? (unit as (typeof laborUnitOptions)[number]["value"])
		: "persona";
}

export function laborQuantityLabel(unit: string | null | undefined) {
	return (
		laborUnitOptions.find((option) => option.value === unit)?.quantityLabel ??
		"Cantidad"
	);
}

export function budgetUnitLabel(unit: string | null | undefined) {
	const normalized = cleanUnit(unit);
	if (normalized === "persona") return "persona";
	if (legacyDayUnits.has(normalized)) return "día";
	if (normalized === "global") return "global / trato";
	return unit ?? "";
}
