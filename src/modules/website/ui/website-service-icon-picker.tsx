"use client";

import { useState } from "react";
import {
	resolveWebsiteServiceIcon,
	websiteServiceIconLabels,
	websiteServiceIconOptions,
} from "../domain/icon-registry";

export function WebsiteServiceIconPicker({
	compact = false,
	defaultValue = "HardHat",
}: {
	compact?: boolean;
	defaultValue?: string | null;
}) {
	const initial = websiteServiceIconOptions.includes(defaultValue ?? "")
		? (defaultValue as string)
		: "HardHat";
	const [selected, setSelected] = useState(initial);

	return (
		<fieldset
			className={`website-icon-picker${compact ? " website-icon-picker--compact" : ""}`}
		>
			<legend>Ícono del servicio</legend>
			<input name="icon" type="hidden" value={selected} />
			<div className="website-icon-picker__grid">
				{websiteServiceIconOptions.map((icon) => {
					const Icon = resolveWebsiteServiceIcon(icon);
					const active = selected === icon;
					return (
						<button
							aria-pressed={active}
							className="focus-ring website-icon-picker__option"
							key={icon}
							onClick={() => setSelected(icon)}
							title={websiteServiceIconLabels[icon] ?? icon}
							type="button"
						>
							<Icon aria-hidden="true" size={20} />
							<span>{websiteServiceIconLabels[icon] ?? icon}</span>
						</button>
					);
				})}
			</div>
			<p>
				Seleccionado: <strong>{websiteServiceIconLabels[selected]}</strong>
			</p>
		</fieldset>
	);
}
