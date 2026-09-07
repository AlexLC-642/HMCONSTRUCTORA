"use client";

import { Check, X } from "lucide-react";
import { useRef, useState } from "react";

export function UserStatusToggle({
	active,
	disabled = false,
}: {
	active: boolean;
	disabled?: boolean;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isActive, setIsActive] = useState(active);
	const state = isActive ? "active" : "inactive";

	return (
		<label
			className={`user-status-toggle inline-flex items-center gap-2.5 ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
			title={
				disabled
					? "El superadministrador no puede desactivarse"
					: isActive
						? "Desactivar usuario"
						: "Activar usuario"
			}
		>
			{disabled ? <input name="active" type="hidden" value="ACTIVE" /> : null}
			<input
				aria-label={isActive ? "Desactivar usuario" : "Activar usuario"}
				className="peer sr-only"
				defaultChecked={active}
				disabled={disabled}
				name="active"
				onChange={(event) => {
					setIsActive(event.currentTarget.checked);
					inputRef.current?.form?.requestSubmit();
				}}
				ref={inputRef}
				type="checkbox"
				value="ACTIVE"
			/>
			<span
				className="user-status-toggle__track relative flex h-7 w-[3.25rem] shrink-0 items-center rounded-full p-1 transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-checked:[&>span]:translate-x-6 motion-reduce:transition-none"
				data-state={state}
			>
				<span className="user-status-toggle__thumb grid size-5 place-items-center rounded-full transition-transform duration-200 motion-reduce:transition-none">
					{isActive ? (
						<Check aria-hidden="true" size={12} strokeWidth={3} />
					) : (
						<X aria-hidden="true" size={11} strokeWidth={3} />
					)}
				</span>
			</span>
			<span
				className="user-status-toggle__label min-w-[4.5rem] text-left text-sm font-bold"
				data-state={state}
			>
				{isActive ? "Activo" : "Inactivo"}
			</span>
		</label>
	);
}
