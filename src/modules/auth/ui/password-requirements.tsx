"use client";

import { Check, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { passwordRules } from "../domain/password-policy";

/**
 * Live checklist for a new-password input (linked by id). The server applies
 * the same rules through strongPasswordSchema; this only guides the person
 * while typing.
 */
export function PasswordRequirements({ inputId }: { inputId: string }) {
	const [value, setValue] = useState("");

	useEffect(() => {
		const input = document.getElementById(inputId);
		if (!(input instanceof HTMLInputElement)) return;
		const form = input.form;
		const sync = () => setValue(input.value);
		const clear = () => setValue("");
		sync();
		input.addEventListener("input", sync);
		form?.addEventListener("reset", clear);
		return () => {
			input.removeEventListener("input", sync);
			form?.removeEventListener("reset", clear);
		};
	}, [inputId]);

	return (
		<ul
			aria-label="Requisitos de la contraseña"
			className="grid gap-1 text-xs sm:grid-cols-2"
		>
			{passwordRules.map((rule) => {
				const met = rule.test(value);
				return (
					<li
						className={`flex items-center gap-1.5 transition-colors ${
							met ? "text-[#1f7a4d]" : "text-[#65706b]"
						}`}
						key={rule.id}
					>
						{met ? (
							<Check aria-hidden="true" size={14} strokeWidth={2.6} />
						) : (
							<Circle aria-hidden="true" size={12} />
						)}
						<span>
							{rule.label}
							<span className="sr-only">
								{met ? " (cumplido)" : " (pendiente)"}
							</span>
						</span>
					</li>
				);
			})}
		</ul>
	);
}
