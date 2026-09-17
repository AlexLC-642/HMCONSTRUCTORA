import {
	Activity,
	ArrowRight,
	Building2,
	CheckCircle2,
	KeyRound,
	LockKeyhole,
	Mail,
	PencilLine,
	Phone,
	Plus,
	ShieldCheck,
	SlidersHorizontal,
	UserCheck,
	UserRound,
	UsersRound,
	UserX,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
	isSuperAdministrator,
	isUserAdministrator,
	requireAuthenticatedUser,
} from "@/modules/auth/application/authorization";
import { COMPANY_EMAIL_DOMAIN } from "@/modules/auth/domain/email-domain";
import { DevicePasskeyMark } from "@/modules/auth/ui/device-passkey-mark";
import {
	changeOwnPasswordAction,
	createInternalUserAction,
	resetInternalUserPasswordAction,
	revokeInternalUserPasskeysAction,
	updateInternalUserAction,
} from "@/modules/users/application/actions";
import {
	getOwnUserWorkspace,
	getUsersWorkspace,
} from "@/modules/users/application/queries";
import { ManagementDialog } from "@/modules/users/ui/management-dialog";
import { RevokePasskeysButton } from "@/modules/users/ui/revoke-passkeys-button";
import { RoleChecklist } from "@/modules/users/ui/role-checklist";
import { UserStatusToggle } from "@/modules/users/ui/user-status-toggle";

const fieldClass =
	"focus-ring h-11 w-full rounded-lg border border-[#cfd4ce] bg-white px-3 text-sm text-[#111719] shadow-[inset_0_1px_2px_rgba(19,31,29,0.04)] transition placeholder:text-[#7c8681] hover:border-[#9ea8a2]";
const permissionLabels: Record<string, string> = {
	"avance.aprobar": "Aprobar avances",
	"avance.crear": "Crear avances diarios",
	"avance.publicar": "Publicar informes",
	"avance.revisar": "Revisar avances",
	"cronograma.editar": "Editar cronograma",
	"cronograma.ver": "Ver cronograma",
	"documentos.compartir": "Compartir documentos",
	"finanzas.registrar": "Registrar finanzas",
	"finanzas.ver": "Ver finanzas",
	"inventario.mover": "Mover inventario",
	"inventario.desperdicio.revisar": "Revisar desperdicios",
	"portal.gestionar": "Gestionar portal cliente",
	"presupuesto.aprobar": "Aprobar presupuesto",
	"presupuesto.editar": "Editar presupuesto",
	"presupuesto.ver": "Ver presupuesto",
	"proyectos.crear": "Crear proyectos",
	"proyectos.editar": "Editar proyectos",
	"proyectos.ver": "Ver proyectos",
	"requerimiento.aprobar": "Aprobar requerimientos",
	"usuarios.administradores": "Gestionar administradores",
	"usuarios.gestionar": "Gestionar usuarios",
};

function initials(name: string) {
	return (
		name
			.split(" ")
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join("") || "C"
	);
}
function roleCode(name: string) {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}
function formatAccessDate(value: Date) {
	return new Intl.DateTimeFormat("es-GT", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(value);
}
function companyEmailUser(email: string) {
	const suffix = `@${COMPANY_EMAIL_DOMAIN}`;
	return email.toLowerCase().endsWith(suffix)
		? email.slice(0, -suffix.length)
		: (email.split("@")[0] ?? email);
}
function FieldLabel({ children }: { children: ReactNode }) {
	return (
		<span className="text-xs font-semibold text-[#3f4a46]">{children}</span>
	);
}

function Stat({
	detail,
	icon: Icon,
	label,
	progress,
	tone,
	value,
}: {
	detail: string;
	icon: typeof UsersRound;
	label: string;
	progress: number;
	tone: "red" | "green" | "amber" | "steel";
	value: number;
}) {
	const tones = {
		red: {
			bar: "bg-[#cf2435]",
			icon: "bg-[#fde9eb] text-[#b52130]",
			value: "text-[#b52130]",
			accent: "#cf2435",
		},
		green: {
			bar: "bg-[#23835f]",
			icon: "bg-[#e5f5ed] text-[#176c4b]",
			value: "text-[#176c4b]",
			accent: "#23835f",
		},
		amber: {
			bar: "bg-[#b77912]",
			icon: "bg-[#fff2d6] text-[#895b0d]",
			value: "text-[#895b0d]",
			accent: "#b77912",
		},
		steel: {
			bar: "bg-[#30383b]",
			icon: "bg-[#e9ece9] text-[#30383b]",
			value: "text-[#111719]",
			accent: "#30383b",
		},
	}[tone];
	return (
		<article
			className="access-kpi group relative overflow-hidden rounded-2xl p-5 shadow-[0_16px_40px_rgba(25,31,33,0.11),0_2px_8px_rgba(25,31,33,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(25,31,33,0.15),0_3px_10px_rgba(25,31,33,0.06)] motion-reduce:transform-none motion-reduce:transition-none"
			style={{ "--kpi-accent": tones.accent } as React.CSSProperties}
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.12em] text-[#65706b]">
						{label}
					</p>
					<p
						className={`mt-3 text-4xl font-bold leading-none tabular-nums tracking-[-0.04em] ${tones.value}`}
					>
						{value}
					</p>
				</div>
				<span
					className={`grid size-11 place-items-center rounded-xl ${tones.icon}`}
				>
					<Icon aria-hidden="true" size={20} strokeWidth={2} />
				</span>
			</div>
			<p className="mt-3 text-sm font-medium text-[#4f5a55]">{detail}</p>
			<div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e8ebe6]">
				<div
					className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${tones.bar}`}
					style={{ width: `${Math.max(progress, value > 0 ? 8 : 0)}%` }}
				/>
			</div>
		</article>
	);
}

export default async function UsersPage() {
	const currentUser = await requireAuthenticatedUser();
	const canManageUsers = isUserAdministrator(currentUser.roles);
	const currentUserIsSuperAdministrator = isSuperAdministrator(
		currentUser.roles,
	);
	const { users, roles } = canManageUsers
		? await getUsersWorkspace()
		: await getOwnUserWorkspace(currentUser.id);
	const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
	const inactiveUsers = users.length - activeUsers;
	const assignedRoles = roles.filter((role) => role._count.users > 0).length;
	const hasSuperAdministrator = users.some((user) =>
		user.roles.some(({ role }) => role.key === "superadministrador"),
	);

	return (
		<main className="users-workspace mx-auto max-w-[1440px] space-y-6 px-1 pb-10">
			<section className="users-hero relative overflow-hidden rounded-2xl bg-[#202629] px-5 py-6 text-white shadow-[0_22px_58px_rgba(25,31,33,0.24)] sm:px-7 sm:py-7">
				<div
					aria-hidden="true"
					className="absolute inset-y-0 right-0 w-[42%] opacity-20 [background-image:linear-gradient(135deg,transparent_45%,#fff_45%,#fff_46%,transparent_46%,transparent_54%,#fff_54%,#fff_55%,transparent_55%)] [background-size:72px_72px]"
				/>
				<div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
					<div className="max-w-2xl">
						<h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
							{canManageUsers ? "Usuarios y accesos" : "Mi cuenta y seguridad"}
						</h1>
						<p className="mt-2 max-w-xl text-sm leading-6 text-[#d7ddda] sm:text-base">
							{canManageUsers
								? "Administra cuentas, roles y accesos del personal."
								: "Administra tu contraseña y los accesos biométricos de tus dispositivos."}
						</p>
					</div>
					{canManageUsers ? (
						<ManagementDialog
							description="Crea una cuenta interna y asigna su acceso inicial."
							icon={<UserRound aria-hidden="true" size={19} />}
							title="Nuevo usuario"
							trigger={
								<>
									<Plus aria-hidden="true" size={18} /> Nuevo usuario
								</>
							}
							triggerClassName="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--brand-red)] px-5 text-sm font-bold text-white shadow-[0_10px_26px_rgba(200,32,47,0.3)] transition hover:bg-[#ae1c29]"
						>
							<form action={createInternalUserAction} className="grid gap-5">
								<input name="status" type="hidden" value="ACTIVE" />
								<div className="rounded-xl bg-white p-4 shadow-[0_10px_28px_rgba(25,31,33,0.08)] sm:p-5">
									<div className="mb-4 flex items-center gap-3">
										<span className="grid size-9 place-items-center rounded-lg bg-[#edf0ec] text-[#30383b]">
											<UserRound aria-hidden="true" size={18} />
										</span>
										<div>
											<h3 className="font-bold">Datos de la cuenta</h3>
											<p className="text-xs text-[#65706b]">
												El acceso se creará activo. Después podrá configurar su
												propio dispositivo.
											</p>
										</div>
									</div>
									<div className="grid gap-4">
										<label className="grid gap-1.5">
											<FieldLabel>Nombre completo</FieldLabel>
											<input
												autoComplete="name"
												className={fieldClass}
												name="name"
												required
												placeholder="Ej. Ana López"
											/>
										</label>
										<label className="grid gap-1.5">
											<FieldLabel>Usuario corporativo</FieldLabel>
											<div className="flex h-12 overflow-hidden rounded-lg border border-[#c7cdc7] bg-white shadow-[inset_0_1px_2px_rgba(25,31,33,0.04)] transition focus-within:border-[#76817b] focus-within:ring-2 focus-within:ring-[#202629]/15">
												<span className="grid w-12 shrink-0 place-items-center border-r border-[#dde1dc] bg-[#f1f3ef] text-[#5f6964]">
													<Mail aria-hidden="true" size={18} />
												</span>
												<input
													aria-describedby="company-domain"
													autoComplete="username"
													className="min-w-0 flex-1 px-3 text-base outline-none placeholder:text-[#7c8681]"
													name="email"
													required
													placeholder="ana.lopez"
												/>
												<span
													className="hidden shrink-0 items-center border-l border-[#dde1dc] bg-[#f1f3ef] px-3 text-sm font-semibold text-[#4f5a55] sm:flex"
													id="company-domain"
												>
													@{COMPANY_EMAIL_DOMAIN}
												</span>
											</div>
											<span className="text-xs text-[#65706b] sm:hidden">
												Se agregará @{COMPANY_EMAIL_DOMAIN}
											</span>
										</label>
										<label className="grid gap-1.5">
											<FieldLabel>Teléfono</FieldLabel>
											<div className="flex h-12 overflow-hidden rounded-lg border border-[#c7cdc7] bg-white shadow-[inset_0_1px_2px_rgba(25,31,33,0.04)] transition focus-within:border-[#76817b] focus-within:ring-2 focus-within:ring-[#202629]/15">
												<span className="grid w-12 shrink-0 place-items-center border-r border-[#dde1dc] bg-[#f1f3ef] text-[#5f6964]">
													<Phone aria-hidden="true" size={18} />
												</span>
												<input
													aria-describedby="phone-help"
													autoComplete="tel-national"
													className="min-w-0 flex-1 px-3 text-base tabular-nums outline-none placeholder:text-[#7c8681]"
													inputMode="numeric"
													maxLength={8}
													minLength={8}
													name="phone"
													pattern="[0-9]{8}"
													required
													placeholder="55551234"
												/>
											</div>
											<span className="text-xs text-[#65706b]" id="phone-help">
												Número nacional de 8 dígitos, sin espacios ni guiones.
											</span>
										</label>
									</div>
								</div>
								<div className="rounded-xl bg-[#f4f7f4] p-4 shadow-[inset_0_0_0_1px_rgba(207,214,208,0.9)] sm:p-5">
									<RoleChecklist
										disabledRoleKeys={
											currentUserIsSuperAdministrator
												? []
												: ["administrador", "superadministrador"]
										}
										hasSuperAdministrator={hasSuperAdministrator}
										initialSelectedIds={[]}
										roles={roles.map((role) => ({
											id: role.id,
											key: role.key,
											name: role.name,
											description: role.description,
											permissionCount: role.permissions.length,
										}))}
									/>
								</div>
								<label className="grid gap-1.5">
									<FieldLabel>Contraseña inicial</FieldLabel>
									<div className="flex h-12 overflow-hidden rounded-lg border border-[#c7cdc7] bg-white transition focus-within:border-[#76817b] focus-within:ring-2 focus-within:ring-[#202629]/15">
										<span className="grid w-12 shrink-0 place-items-center border-r border-[#dde1dc] bg-[#f1f3ef] text-[#5f6964]">
											<LockKeyhole aria-hidden="true" size={18} />
										</span>
										<input
											autoComplete="new-password"
											className="min-w-0 flex-1 px-3 text-base outline-none placeholder:text-[#7c8681]"
											name="password"
											required
											minLength={10}
											placeholder="Mínimo 10 caracteres"
											type="password"
										/>
									</div>
								</label>
								<div className="flex items-center justify-between gap-4 border-t border-[#d9ddd7] pt-4">
									<p className="max-w-56 text-xs leading-5 text-[#65706b]">
										Los permisos se combinan automáticamente cuando asignas más
										de un rol.
									</p>
									<button
										className="focus-ring inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[var(--brand-red)] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(200,32,47,0.28)] transition hover:-translate-y-0.5 hover:bg-[#ae1c29] motion-reduce:transform-none"
										type="submit"
									>
										<CheckCircle2 aria-hidden="true" size={17} /> Crear acceso
									</button>
								</div>
							</form>
						</ManagementDialog>
					) : (
						<Link
							className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[#202629] shadow-[0_10px_26px_rgba(0,0,0,0.2)] transition hover:bg-[#f2f4f1]"
							href={"/account/security" as Route}
						>
							<DevicePasskeyMark size={18} /> Configurar huella o patrón
						</Link>
					)}
				</div>
			</section>

			{canManageUsers ? (
				<section
					className="kpi-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
					aria-label="Resumen de accesos"
				>
					<Stat
						detail="Cuentas registradas"
						icon={UsersRound}
						label="Personal"
						progress={100}
						tone="steel"
						value={users.length}
					/>
					<Stat
						detail={`${users.length > 0 ? Math.round((activeUsers / users.length) * 100) : 0}% con acceso vigente`}
						icon={UserCheck}
						label="Accesos activos"
						progress={users.length > 0 ? (activeUsers / users.length) * 100 : 0}
						tone="green"
						value={activeUsers}
					/>
					<Stat
						detail="Acceso temporalmente detenido"
						icon={UserX}
						label="Suspendidos"
						progress={
							users.length > 0 ? (inactiveUsers / users.length) * 100 : 0
						}
						tone="red"
						value={inactiveUsers}
					/>
					<Stat
						detail={`${roles.length} perfiles configurados`}
						icon={Activity}
						label="Roles en uso"
						progress={
							roles.length > 0 ? (assignedRoles / roles.length) * 100 : 0
						}
						tone="amber"
						value={assignedRoles}
					/>
				</section>
			) : null}

			<section className="users-panel overflow-hidden rounded-2xl bg-white shadow-[0_18px_52px_rgba(25,31,33,0.12)]">
				<div className="flex flex-col gap-4 border-b border-[#dde0da] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<div>
						<h2 className="text-xl font-bold tracking-[-0.02em]">
							{canManageUsers ? "Directorio interno" : "Mi acceso"}
						</h2>
						<p className="mt-1 text-sm text-[#65706b]">
							{canManageUsers
								? "Consulta y administra cada cuenta desde su propia ventana."
								: "Por privacidad, aquí únicamente puedes consultar y ajustar tu propia cuenta."}
						</p>
					</div>
					<div className="inline-flex items-center gap-2 self-start rounded-lg bg-[#f1f3ef] px-3 py-2 text-xs font-semibold text-[#4b5651]">
						<Mail aria-hidden="true" size={15} /> @{COMPANY_EMAIL_DOMAIN}
					</div>
				</div>
				<div className="hidden grid-cols-[minmax(260px,1.4fr)_minmax(180px,1fr)_190px_130px] gap-5 border-b border-[#d9ddd7] bg-[#ebece8] px-6 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#58625d] lg:grid">
					<span>Usuario</span>
					<span>Rol</span>
					<span>Acceso</span>
					<span className="text-right">Acciones</span>
				</div>
				<div className="divide-y divide-[#e5e7e2]">
					{users.length === 0 ? (
						<div className="grid min-h-64 place-items-center px-6 py-10 text-center">
							<div>
								<UsersRound
									aria-hidden="true"
									className="mx-auto text-[#87908c]"
									size={30}
								/>
								<h3 className="mt-3 font-bold">Todavía no hay usuarios</h3>
								<p className="mt-1 text-sm text-[#65706b]">
									Crea el primer acceso para comenzar.
								</p>
							</div>
						</div>
					) : (
						users.map((internalUser) => {
							const targetIsSuperAdministrator = internalUser.roles.some(
								({ role }) => role.key === "superadministrador",
							);
							const targetIsAdministrator = internalUser.roles.some(
								({ role }) => role.key === "administrador",
							);
							const isOwnAccount = currentUser.id === internalUser.id;
							const isProtectedAccount =
								targetIsSuperAdministrator || targetIsAdministrator;
							const canManageAccount =
								currentUserIsSuperAdministrator || !isProtectedAccount;
							const selectedRoleIds = new Set(
								internalUser.roles.map(({ roleId }) => roleId),
							);
							const updateAction = updateInternalUserAction.bind(
								null,
								internalUser.id,
							);
							const resetAction = isOwnAccount
								? changeOwnPasswordAction
								: resetInternalUserPasswordAction.bind(null, internalUser.id);
							const revokePasskeysAction =
								revokeInternalUserPasskeysAction.bind(null, internalUser.id);
							const latestPasskeyUse = internalUser.passkeys.find(
								(passkey) => passkey.lastUsedAt,
							)?.lastUsedAt;
							return (
								<article
									className="grid gap-4 px-5 py-4 transition hover:bg-[#faf9f6] sm:px-6 lg:grid-cols-[minmax(260px,1.4fr)_minmax(180px,1fr)_190px_130px] lg:items-center lg:gap-5"
									key={internalUser.id}
								>
									<div className="flex min-w-0 items-center gap-3">
										<span
											className={`grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white ${targetIsSuperAdministrator ? "bg-[#9a650e]" : "bg-[#202629]"}`}
										>
											{initials(internalUser.name)}
										</span>
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<p className="truncate font-bold">
													{internalUser.name}
												</p>
												{targetIsSuperAdministrator ? (
													<ShieldCheck
														aria-label="Cuenta protegida"
														className="shrink-0 text-[#9a650e]"
														size={16}
													/>
												) : null}
											</div>
											<p className="truncate text-sm text-[#65706b]">
												{internalUser.email}
											</p>
											<span
												className={`mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold ${internalUser.passkeys.length > 0 ? "text-[#176c4b]" : "text-[#7a847f]"}`}
											>
												<DevicePasskeyMark size={14} />
												{internalUser.passkeys.length > 0
													? `${internalUser.passkeys.length} dispositivo${internalUser.passkeys.length === 1 ? "" : "s"} vinculado${internalUser.passkeys.length === 1 ? "" : "s"}`
													: "Acceso por dispositivo sin configurar"}
											</span>
										</div>
									</div>
									<div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#303a36]">
										<Building2
											aria-hidden="true"
											className="mr-1 text-[#7a847f]"
											size={16}
										/>
										{internalUser.roles.length > 0 ? (
											internalUser.roles.map(({ role, roleId }) => (
												<span
													className="rounded-lg bg-[#edf1ed] px-2.5 py-1.5"
													key={roleId}
												>
													{role.name}
												</span>
											))
										) : (
											<span>Sin rol</span>
										)}
									</div>
									{canManageUsers && canManageAccount ? (
										<form
											action={updateAction}
											className="w-fit rounded-xl bg-[#f2f4f0] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(202,208,201,0.8)]"
										>
											<input
												name="name"
												type="hidden"
												value={internalUser.name}
											/>
											<input
												name="email"
												type="hidden"
												value={internalUser.email}
											/>
											<input
												name="phone"
												type="hidden"
												value={internalUser.phone ?? ""}
											/>
											{internalUser.roles.map(({ roleId }) => (
												<input
													key={roleId}
													name="roleIds"
													type="hidden"
													value={roleId}
												/>
											))}
											<UserStatusToggle
												active={internalUser.status === "ACTIVE"}
												disabled={targetIsSuperAdministrator}
											/>
										</form>
									) : canManageUsers && isProtectedAccount ? (
										<span className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#fff4d8] px-3 py-2 text-sm font-bold text-[#81550b]">
											<ShieldCheck aria-hidden="true" size={16} /> Protegido
										</span>
									) : (
										<span className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#e7f4ed] px-3 py-2 text-sm font-bold text-[#176c4b]">
											<CheckCircle2 aria-hidden="true" size={16} /> Cuenta
											activa
										</span>
									)}
									<div className="lg:text-right">
										{canManageAccount || isOwnAccount ? (
											<ManagementDialog
												description={
													canManageUsers
														? "Organiza la cuenta por datos, roles y seguridad."
														: "Cambia tu contraseña y administra el acceso biométrico de tus equipos."
												}
												icon={<PencilLine aria-hidden="true" size={18} />}
												title={`Administrar ${internalUser.name}`}
												trigger={
													<>
														<span>Administrar</span>
														<ArrowRight aria-hidden="true" size={16} />
													</>
												}
												triggerClassName="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cfd4ce] bg-white px-3 text-sm font-bold text-[#303a36] transition hover:border-[#202629] hover:bg-[#f7f6f2]"
												width="wide"
											>
												<div className="user-management-tabs space-y-6">
													<input
														className="sr-only"
														defaultChecked
														id={`tab-datos-${internalUser.id}`}
														name={`admin-tab-${internalUser.id}`}
														type="radio"
													/>
													<input
														className="sr-only"
														id={`tab-roles-${internalUser.id}`}
														name={`admin-tab-${internalUser.id}`}
														type="radio"
													/>
													<input
														className="sr-only"
														id={`tab-seguridad-${internalUser.id}`}
														name={`admin-tab-${internalUser.id}`}
														type="radio"
													/>
													<nav
														aria-label="Secciones de administración"
														className="user-management-nav"
													>
														<label htmlFor={`tab-datos-${internalUser.id}`}>
															Datos
														</label>
														<label htmlFor={`tab-roles-${internalUser.id}`}>
															Roles
														</label>
														<label htmlFor={`tab-seguridad-${internalUser.id}`}>
															Seguridad
														</label>
													</nav>
													<div className="user-management-panels">
														{canManageUsers && canManageAccount ? (
															<form
																action={updateAction}
																className="manage-user-form grid gap-4"
															>
																<input
																	name="active"
																	type="hidden"
																	value={internalUser.status}
																/>
																<div
																	className="user-account-editor panel-datos grid gap-4 rounded-xl bg-white p-4 shadow-[0_10px_28px_rgba(25,31,33,0.08)] sm:grid-cols-2"
																	id={`account-${internalUser.id}`}
																>
																	<div className="flex items-center gap-3 border-b border-[#e1e4df] pb-3 sm:col-span-2">
																		<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf0ec] text-[#30383b]">
																			<UserRound aria-hidden="true" size={17} />
																		</span>
																		<h3 className="font-bold">
																			Datos de la cuenta
																		</h3>
																	</div>
																	<label className="grid gap-1.5">
																		<FieldLabel>Nombre completo</FieldLabel>
																		<input
																			autoComplete="name"
																			className={fieldClass}
																			defaultValue={internalUser.name}
																			minLength={3}
																			name="name"
																			required
																		/>
																	</label>
																	<label className="grid gap-1.5">
																		<FieldLabel>Teléfono</FieldLabel>
																		<input
																			autoComplete="tel-national"
																			className={`${fieldClass} tabular-nums`}
																			defaultValue={internalUser.phone ?? ""}
																			inputMode="numeric"
																			maxLength={8}
																			minLength={8}
																			name="phone"
																			pattern="[0-9]{8}"
																			placeholder="55551234"
																		/>
																		<span className="text-xs text-[#65706b]">
																			8 dígitos, sin espacios ni guiones.
																		</span>
																	</label>
																	<label className="grid gap-1.5 sm:col-span-2">
																		<FieldLabel>Usuario del correo</FieldLabel>
																		<div className="user-email-field flex h-11 overflow-hidden rounded-lg border border-[#cfd4ce] bg-white">
																			<input
																				aria-label="Usuario del correo corporativo"
																				autoComplete="username"
																				className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
																				defaultValue={companyEmailUser(
																					internalUser.email,
																				)}
																				name="email"
																				required
																			/>
																			<span className="flex shrink-0 items-center border-l border-[#dde1dc] bg-[#f1f3ef] px-3 text-xs font-bold">
																				@{COMPANY_EMAIL_DOMAIN}
																			</span>
																		</div>
																	</label>
																</div>
																<div
																	className="user-role-editor panel-roles"
																	id={`roles-${internalUser.id}`}
																>
																	{targetIsSuperAdministrator ? (
																		<div className="grid gap-2 rounded-xl bg-[#fff4d8] p-4 text-[#81550b]">
																			<div className="flex items-center gap-2 text-sm font-bold">
																				<ShieldCheck
																					aria-hidden="true"
																					size={16}
																				/>{" "}
																				Roles protegidos
																			</div>
																			<p className="text-xs leading-5">
																				La cuenta principal utiliza únicamente
																				el rol Superadministrador.
																			</p>
																			{internalUser.roles.map(({ roleId }) => (
																				<input
																					key={roleId}
																					name="roleIds"
																					type="hidden"
																					value={roleId}
																				/>
																			))}
																		</div>
																	) : (
																		<RoleChecklist
																			disabledRoleKeys={
																				currentUserIsSuperAdministrator
																					? []
																					: [
																							"administrador",
																							"superadministrador",
																						]
																			}
																			hasSuperAdministrator={
																				hasSuperAdministrator
																			}
																			initialSelectedIds={[...selectedRoleIds]}
																			roles={roles.map((role) => ({
																				id: role.id,
																				key: role.key,
																				name: role.name,
																				description: role.description,
																				permissionCount:
																					role.permissions.length,
																			}))}
																		/>
																	)}
																</div>
																<button
																	className="panel-footer-button focus-ring h-11 rounded-lg bg-[#202629] px-5 text-sm font-bold text-white transition hover:bg-[#0f1315]"
																	type="submit"
																>
																	Guardar cambios
																</button>
															</form>
														) : (
															<div className="panel-datos panel-roles flex items-start gap-3 rounded-xl bg-[#eaf4ef] p-4 text-[#245c49]">
																<ShieldCheck
																	aria-hidden="true"
																	className="mt-0.5 shrink-0"
																	size={18}
																/>
																<p className="text-sm leading-5">
																	<strong className="block text-[#173f32]">
																		Tu rol está protegido
																	</strong>
																	Solo el superadministrador puede modificar tu
																	rol o estado de acceso.
																</p>
															</div>
														)}
														<div
															className="user-security-grid panel-seguridad"
															id={`security-${internalUser.id}`}
														>
															<div className="user-security-section">
																<div className="mb-3 flex items-center gap-2">
																	<KeyRound aria-hidden="true" size={17} />
																	<h3 className="font-bold">
																		Cambiar contraseña
																	</h3>
																</div>
																<form
																	action={resetAction}
																	className="grid gap-3 sm:grid-cols-[1fr_auto]"
																>
																	<label className="grid gap-1.5">
																		<span className="sr-only">
																			Nueva contraseña
																		</span>
																		<input
																			autoComplete="new-password"
																			className={fieldClass}
																			name="password"
																			minLength={10}
																			required
																			placeholder="Nueva contraseña (mínimo 10 caracteres)"
																			type="password"
																		/>
																	</label>
																	<button
																		className="focus-ring h-11 rounded-lg border border-[#cfd4ce] px-4 text-sm font-bold transition hover:bg-[#f7f6f2]"
																		type="submit"
																	>
																		Actualizar
																	</button>
																</form>
															</div>
															<div className="user-security-section">
																<div className="flex items-start gap-3">
																	<span
																		className={`grid size-10 shrink-0 place-items-center rounded-xl ${internalUser.passkeys.length > 0 ? "bg-[#e7f4ed] text-[#176c4b]" : "bg-[#eef0ec] text-[#5f6964]"}`}
																	>
																		<DevicePasskeyMark size={22} />
																	</span>
																	<div>
																		<h3 className="font-bold">
																			Huella o patrón
																		</h3>
																		<p className="mt-1 text-sm leading-5 text-[#65706b]">
																			Permite entrar usando la seguridad del
																			teléfono o computadora.
																		</p>
																	</div>
																</div>
																<div className="mt-4 rounded-xl bg-[#f3f5f1] p-4">
																	<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
																		<div>
																			<p className="text-sm font-bold text-[#26302c]">
																				{internalUser.passkeys.length > 0
																					? `${internalUser.passkeys.length} equipo${internalUser.passkeys.length === 1 ? " vinculado" : "s vinculados"}`
																					: "Sin activar"}
																			</p>
																			<p className="mt-1 text-xs leading-5 text-[#65706b]">
																				{latestPasskeyUse
																					? `Último acceso: ${formatAccessDate(latestPasskeyUse)}`
																					: internalUser.passkeys.length > 0
																						? "Todavía no se ha utilizado."
																						: currentUser.id === internalUser.id
																							? "Actívalo desde este equipo para vincular su huella, rostro, PIN o patrón."
																							: "El usuario debe activarlo al iniciar sesión desde su propio equipo."}
																			</p>
																		</div>
																		{(canManageAccount || isOwnAccount) &&
																		internalUser.passkeys.length > 0 ? (
																			<form action={revokePasskeysAction}>
																				<RevokePasskeysButton />
																			</form>
																		) : null}
																	</div>
																	{currentUser.id === internalUser.id ? (
																		<Link
																			className="focus-ring mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-[#202629] px-3 text-sm font-bold !text-white transition hover:bg-[#101416]"
																			href={"/account/security" as Route}
																			style={{ color: "#ffffff" }}
																		>
																			<DevicePasskeyMark
																				className="text-white"
																				size={17}
																			/>{" "}
																			Configurar mi equipo
																		</Link>
																	) : null}
																</div>
															</div>
														</div>
													</div>
												</div>
											</ManagementDialog>
										) : (
											<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#81550b]">
												<ShieldCheck aria-hidden="true" size={14} /> Solo
												superadministrador
											</span>
										)}
									</div>
								</article>
							);
						})
					)}
				</div>
			</section>

			{canManageUsers ? (
				<section className="users-panel overflow-hidden rounded-2xl bg-white shadow-[0_18px_52px_rgba(25,31,33,0.12)]">
					<div className="flex flex-col gap-3 border-b border-[#dde0da] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
						<div>
							<h2 className="text-xl font-bold tracking-[-0.02em]">
								Roles del sistema
							</h2>
							<p className="mt-1 text-sm text-[#65706b]">
								Cada rol incluye accesos predefinidos. Al combinar roles, sus
								accesos se suman automáticamente.
							</p>
						</div>
						<span className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#f1f3ef] px-3 py-2 text-xs font-semibold text-[#4b5651]">
							<SlidersHorizontal aria-hidden="true" size={15} /> Configuración
							automática
						</span>
					</div>
					<div className="grid gap-px bg-[#e3e6e1] sm:grid-cols-2 xl:grid-cols-3">
						{roles.map((role) => {
							const isProtected = role.key === "superadministrador";
							return (
								<article
									className="flex min-h-52 flex-col gap-5 bg-white p-5 transition hover:bg-[#faf9f6]"
									key={role.id}
								>
									<div className="flex items-start gap-3">
										<span
											className={`grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold text-white ${isProtected ? "bg-[#9a650e]" : "bg-[#202629]"}`}
										>
											{roleCode(role.name)}
										</span>
										<div className="min-w-0">
											<h3 className="truncate font-bold">{role.name}</h3>
											<p className="mt-1 line-clamp-2 text-sm leading-5 text-[#65706b]">
												{role.description}
											</p>
										</div>
									</div>
									<div className="mt-auto flex items-center justify-between gap-3 rounded-lg bg-[#f2f4f0] px-3 py-2.5">
										<div className="text-xs text-[#65706b]">
											<strong className="text-base text-[#111719]">
												{role._count.users}
											</strong>{" "}
											usuarios ·{" "}
											<strong className="text-[#111719]">
												{role.permissions.length}
											</strong>{" "}
											permisos
										</div>
										<ShieldCheck
											aria-label="Permisos predefinidos"
											className="shrink-0 text-[#23835f]"
											size={18}
										/>
									</div>
									<details className="group rounded-lg bg-[#f8f9f6] px-3 py-2 text-sm">
										<summary className="focus-ring cursor-pointer font-bold text-[#35413c]">
											Ver accesos incluidos
										</summary>
										<ul className="mt-3 grid gap-2 border-t border-[#dfe3dd] pt-3 text-xs text-[#59645f]">
											{role.permissions.map(({ permission }) => (
												<li
													className="flex items-center gap-2"
													key={permission.id}
												>
													<CheckCircle2
														aria-hidden="true"
														className="shrink-0 text-[#23835f]"
														size={14}
													/>
													{permissionLabels[permission.key] ?? permission.key}
												</li>
											))}
										</ul>
									</details>
								</article>
							);
						})}
					</div>
				</section>
			) : null}
		</main>
	);
}
