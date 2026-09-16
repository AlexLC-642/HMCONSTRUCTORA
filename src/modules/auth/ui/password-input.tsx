"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";

export function PasswordInput() {
	const [visible, setVisible] = useState(false);

	return (
		<div className="login-field flex h-11 items-center rounded-lg pl-3.5 pr-1.5">
			<LockKeyhole
				aria-hidden="true"
				className="shrink-0 text-[var(--muted)]"
				size={16}
			/>
			<input
				autoComplete="current-password"
				className="min-w-0 flex-1 bg-transparent px-2.5 text-sm text-[var(--foreground)] outline-none"
				id="login-password"
				name="password"
				required
				type={visible ? "text" : "password"}
			/>
			<button
				aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
				aria-pressed={visible}
				className="focus-ring grid size-8 shrink-0 place-items-center rounded-md text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
				onClick={() => setVisible((current) => !current)}
				type="button"
			>
				{visible ? (
					<EyeOff aria-hidden="true" size={16} />
				) : (
					<Eye aria-hidden="true" size={16} />
				)}
			</button>
		</div>
	);
}
