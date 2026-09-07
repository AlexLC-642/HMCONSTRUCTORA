"use client";

import { useId, useState } from "react";

type RoleOption = {
	id: string;
	key: string;
	name: string;
	description: string | null;
	permissionCount: number;
};

export function RoleChecklist({
	disabledRoleKeys = [],
	hasSuperAdministrator,
	initialSelectedIds,
	roles,
}: {
	disabledRoleKeys?: string[];
	hasSuperAdministrator: boolean;
	initialSelectedIds: string[];
	roles: RoleOption[];
}) {
	const helpId = useId();
	const [selectedIds, setSelectedIds] = useState(initialSelectedIds);

	function toggle(roleId: string, checked: boolean) {
		setSelectedIds((current) =>
			checked
				? Array.from(new Set([...current, roleId]))
				: current.filter((id) => id !== roleId),
		);
	}

	return (
		<fieldset aria-describedby={helpId} className="grid gap-3">
			<legend className="text-sm font-bold text-[#26302c]">
				Roles asignados
			</legend>
			<p className="text-xs leading-5 text-[#65706b]" id={helpId}>
				Selecciona uno o varios. Cada rol habilita automáticamente sus módulos y
				acciones.
			</p>
			<div className="grid gap-2 sm:grid-cols-2">
				{roles.map((role) => {
					const selected = selectedIds.includes(role.id);
					const disabled =
						disabledRoleKeys.includes(role.key) ||
						(role.key === "superadministrador" &&
							hasSuperAdministrator &&
							!selected);
					return (
						<label
							className={`group flex min-h-24 items-start gap-3 rounded-xl p-3 shadow-[inset_0_0_0_1px_rgba(203,210,204,0.95)] transition ${disabled ? "cursor-not-allowed bg-[#f1f2ef] opacity-60" : selected ? "cursor-pointer bg-[#e9f5ef] shadow-[inset_0_0_0_1px_rgba(35,131,95,0.75),0_8px_22px_rgba(25,31,33,0.07)]" : "cursor-pointer bg-white hover:bg-[#f6faf7] hover:shadow-[inset_0_0_0_1px_rgba(35,131,95,0.55),0_8px_22px_rgba(25,31,33,0.07)]"}`}
							key={role.id}
						>
							<input
								checked={selected}
								className="mt-1 size-4 shrink-0 accent-[#23835f]"
								disabled={disabled}
								name="roleIds"
								onChange={(event) => toggle(role.id, event.target.checked)}
								required={selectedIds.length === 0 && !disabled}
								type="checkbox"
								value={role.id}
							/>
							<span className="min-w-0">
								<strong className="block text-sm text-[#202629]">
									{role.name}
								</strong>
								<span className="mt-1 block text-xs leading-4 text-[#65706b]">
									{role.description}
								</span>
								<span className="mt-2 block text-[11px] font-bold text-[#287258]">
									{role.permissionCount} accesos incluidos
								</span>
							</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}
