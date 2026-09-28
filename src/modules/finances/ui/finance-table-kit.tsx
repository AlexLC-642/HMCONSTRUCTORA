"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";

export const money = new Intl.NumberFormat("es-GT", {
	style: "currency",
	currency: "GTQ",
});
const shortDate = new Intl.DateTimeFormat("es-GT", {
	day: "2-digit",
	month: "short",
	year: "numeric",
	timeZone: "UTC",
});

/** Dates travel as ISO strings; show them the same way everywhere. */
export function formatDate(iso: string | null | undefined) {
	return iso ? shortDate.format(new Date(iso)) : "—";
}

/** Accent/case-insensitive "contains" used by every finance search box. */
export function matches(
	query: string,
	...values: Array<string | null | undefined>
) {
	const needle = normalize(query);
	if (!needle) return true;
	return values.some((value) => normalize(value ?? "").includes(needle));
}
function normalize(value: string) {
	return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function SearchField({
	value,
	onChange,
	label,
	placeholder,
}: {
	value: string;
	onChange: (value: string) => void;
	label: string;
	placeholder: string;
}) {
	return (
		<label className="fin-field fin-field--grow">
			<span>{label}</span>
			<div className="fin-search">
				<Search aria-hidden="true" size={16} />
				<input
					className="fin-input"
					onChange={(event) => onChange(event.target.value)}
					placeholder={placeholder}
					type="search"
					value={value}
				/>
			</div>
		</label>
	);
}

export function SelectField({
	label,
	value,
	onChange,
	children,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	children: ReactNode;
}) {
	return (
		<label className="fin-field">
			<span>{label}</span>
			<select
				className="fin-input"
				onChange={(event) => onChange(event.target.value)}
				value={value}
			>
				{children}
			</select>
		</label>
	);
}

export function ResultMeta({
	shown,
	total,
	noun,
	filtered,
	onReset,
	note,
}: {
	shown: number;
	total: number;
	noun: [string, string];
	filtered: boolean;
	onReset: () => void;
	/** Replaces the default count text (e.g. to explain hidden rows). */
	note?: string;
}) {
	return (
		<div aria-live="polite" className="fin-toolbar__meta">
			<span>
				{note ??
					(filtered
						? `${shown} de ${total} ${total === 1 ? noun[0] : noun[1]}`
						: `${total} ${total === 1 ? noun[0] : noun[1]}`)}
			</span>
			{filtered ? (
				<button className="fin-link-button" onClick={onReset} type="button">
					Limpiar filtros
				</button>
			) : null}
		</div>
	);
}

export function EmptyRow({
	colSpan,
	filtered,
	emptyText,
}: {
	colSpan: number;
	filtered: boolean;
	emptyText: string;
}) {
	return (
		<tr>
			<td className="fin-empty" colSpan={colSpan}>
				{filtered ? (
					<>
						<strong>Ningún resultado con esos filtros</strong>
						Prueba otra búsqueda o limpia los filtros.
					</>
				) : (
					emptyText
				)}
			</td>
		</tr>
	);
}
