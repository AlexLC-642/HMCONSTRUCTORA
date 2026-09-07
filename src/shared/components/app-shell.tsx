"use client";

import {
	Activity,
	Bell,
	ChevronDown,
	LogOut,
	Menu,
	PanelLeftClose,
	PanelLeftOpen,
	UserCircle,
	X,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { logoutAction } from "@/modules/auth/application/actions";
import type { AuthenticatedUser } from "@/modules/auth/domain/types";
import type { SystemNotification } from "@/modules/notifications/domain/types";
import { DevicePasskeyMark } from "@/modules/auth/ui/device-passkey-mark";
import { PwaRuntime } from "@/shared/offline/pwa-runtime";
import { displayUserName } from "@/shared/utils/display-user-name";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";

type AppShellProps = {
	user: AuthenticatedUser;
	initialNotifications: SystemNotification[];
	children: React.ReactNode;
};

function BrandLogo({ size }: { size: number }) {
	return (
		<div
			className="relative shrink-0 overflow-hidden rounded-md border border-[var(--border)] bg-white"
			style={{ height: size, width: size }}
		>
			<Image
				alt="Logo del sistema"
				className="object-contain p-1"
				fill
				sizes={`${size}px`}
				src="/brand/logo.png"
			/>
		</div>
	);
}

export function AppShell({
	user,
	initialNotifications,
	children,
}: AppShellProps) {
	const shortName = displayUserName(user.name);
	const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
	const [isRefreshingNotifications, setIsRefreshingNotifications] =
		useState(false);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
	const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
	const notificationStorageKey = `hm-notifications-resolved:${user.id}`;
	const sidebarStorageKey = `hm-sidebar-collapsed:${user.id}`;

	useEffect(() => {
		setIsSidebarCollapsed(
			window.localStorage.getItem(sidebarStorageKey) === "true",
		);
	}, [sidebarStorageKey]);

	useEffect(() => {
		if (!isMobileNavigationOpen) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsMobileNavigationOpen(false);
		};
		window.addEventListener("keydown", closeOnEscape);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", closeOnEscape);
		};
	}, [isMobileNavigationOpen]);

	function toggleDesktopSidebar() {
		setIsSidebarCollapsed((current) => {
			const next = !current;
			window.localStorage.setItem(sidebarStorageKey, String(next));
			return next;
		});
	}

	const [notifications, setNotifications] =
		useState<SystemNotification[]>(initialNotifications);

	useEffect(() => {
		let resolvedIds = new Set<string>();
		try {
			const stored = window.localStorage.getItem(notificationStorageKey);
			if (stored) resolvedIds = new Set(JSON.parse(stored) as string[]);
		} catch {
			resolvedIds = new Set();
		}

		setNotifications(
			initialNotifications.filter(
				(notification) => !resolvedIds.has(notification.id),
			),
		);
	}, [initialNotifications, notificationStorageKey]);

	const unreadCount = useMemo(
		() => notifications.filter((notification) => notification.unread).length,
		[notifications],
	);

	function resolveNotification(id: string) {
		setNotifications((current) =>
			current.filter((notification) => notification.id !== id),
		);
		persistResolvedNotifications([id]);
	}

	function resolveAllNotifications() {
		persistResolvedNotifications(
			notifications.map((notification) => notification.id),
		);
		setNotifications([]);
	}

	function persistResolvedNotifications(ids: string[]) {
		try {
			const stored = window.localStorage.getItem(notificationStorageKey);
			const resolved = new Set<string>(
				stored ? (JSON.parse(stored) as string[]) : [],
			);
			for (const id of ids) resolved.add(id);
			window.localStorage.setItem(
				notificationStorageKey,
				JSON.stringify(Array.from(resolved)),
			);
		} catch {
			// El estado visual se mantiene aunque el navegador bloquee el almacenamiento local.
		}
	}

	async function refreshNotifications() {
		setIsRefreshingNotifications(true);
		try {
			const response = await fetch("/api/notifications", { cache: "no-store" });
			if (!response.ok) return;
			const payload = (await response.json()) as {
				notifications: SystemNotification[];
			};
			const stored = window.localStorage.getItem(notificationStorageKey);
			const resolved = new Set<string>(
				stored ? (JSON.parse(stored) as string[]) : [],
			);
			setNotifications(
				payload.notifications.filter(
					(notification) => !resolved.has(notification.id),
				),
			);
		} catch {
			// Conserva el último estado disponible si la conexión se interrumpe.
		} finally {
			setIsRefreshingNotifications(false);
		}
	}

	function handleNotificationClick(notificationHref: Route) {
		setIsNotificationsOpen(false);
		window.location.assign(notificationHref);
	}

	return (
		<div
			className="app-shell min-h-screen"
			data-mobile-open={isMobileNavigationOpen}
			data-sidebar-collapsed={isSidebarCollapsed}
		>
			<button
				aria-label="Cerrar menú"
				className="app-shell-mobile-backdrop print:hidden"
				onClick={() => setIsMobileNavigationOpen(false)}
				type="button"
			/>
			<aside className="app-shell-sidebar print:hidden" id="main-navigation">
				<div className="app-shell-brandbar">
					<BrandLogo size={40} />
					<div className="app-shell-brandcopy">
						<p className="font-semibold">Control de obra</p>
						<p className="text-xs text-[var(--muted)]">Sistema interno</p>
					</div>
					<button
						aria-label="Cerrar menú"
						className="app-shell-mobile-close focus-ring"
						onClick={() => setIsMobileNavigationOpen(false)}
						type="button"
					>
						<X aria-hidden="true" size={19} />
					</button>
				</div>

				<div className="app-shell-nav-scroll">
					<SidebarNav
						collapsed={isSidebarCollapsed}
						permissions={user.permissions}
					/>
				</div>
				<button
					aria-label={
						isSidebarCollapsed
							? "Mostrar barra lateral"
							: "Ocultar barra lateral"
					}
					aria-pressed={isSidebarCollapsed}
					className="app-shell-collapse focus-ring"
					onClick={toggleDesktopSidebar}
					type="button"
				>
					{isSidebarCollapsed ? (
						<PanelLeftOpen aria-hidden="true" size={18} />
					) : (
						<PanelLeftClose aria-hidden="true" size={18} />
					)}
					<span className="app-shell-collapse-label">
						{isSidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}
					</span>
				</button>
			</aside>

			<div className="app-shell-content print:pl-0">
				<header className="app-shell-topbar sticky top-0 z-40 border-b border-[var(--border)] px-4 print:hidden lg:px-6">
					<div className="flex h-full items-center justify-between gap-4">
						<div className="app-shell-mobile-brand">
							<button
								aria-controls="main-navigation"
								aria-expanded={isMobileNavigationOpen}
								aria-label="Abrir menú principal"
								className="app-shell-menu-button focus-ring"
								onClick={() => setIsMobileNavigationOpen(true)}
								type="button"
							>
								<Menu aria-hidden="true" size={20} />
							</button>
							<BrandLogo size={32} />
							<span className="app-shell-mobile-title">Control de obra</span>
						</div>
						<div className="app-shell-actions ml-auto flex items-center gap-3">
							<PwaRuntime />
							<ThemeToggle />

							<div className="relative">
								<button
									aria-label="Notificaciones"
									aria-expanded={isNotificationsOpen}
									className="app-shell-bell focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[#f9faf8] text-[var(--foreground)] transition hover:bg-[#f3f5f1]"
									onClick={() => {
										setIsNotificationsOpen((current) => !current);
										void refreshNotifications();
									}}
									type="button"
								>
									<Bell aria-hidden="true" size={18} />
									{unreadCount > 0 ? (
										<span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-red)] px-1 text-[10px] font-bold text-white">
											{unreadCount}
										</span>
									) : null}
								</button>

								{isNotificationsOpen ? (
									<div className="app-shell-notifications absolute right-0 top-full z-50 mt-3 overflow-hidden rounded-xl border border-[var(--border)] shadow-[0_18px_48px_rgba(37,48,51,0.14)]">
										<div className="app-shell-notifications__header flex items-center justify-between border-b border-[var(--border)] bg-[#f7f9f7] px-4 py-3">
											<div>
												<p className="text-sm font-semibold">Notificaciones</p>
												<p
													aria-live="polite"
													className="text-xs text-[var(--muted)]"
												>
													{isRefreshingNotifications
														? "Actualizando…"
														: `${unreadCount} pendientes`}
												</p>
											</div>
											{unreadCount > 0 ? (
												<button
													className="text-xs font-semibold text-[var(--primary)]"
													onClick={resolveAllNotifications}
													type="button"
												>
													Descartar todo
												</button>
											) : null}
										</div>

										<div className="max-h-[32rem] overflow-y-auto">
											{notifications.length > 0 ? (
												notifications.map((notification) => (
													<div
														className={`app-shell-notification border-b border-[var(--border)] p-3 ${notification.unread ? "bg-[#f8fbf9]" : "bg-white"}`}
														key={notification.id}
													>
														<div className="flex items-start gap-3">
															<div className="app-shell-notification__icon mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#edf6ef] text-[var(--success)]">
																{notification.type === "alert" ? (
																	<Bell aria-hidden="true" size={14} />
																) : (
																	<Activity aria-hidden="true" size={14} />
																)}
															</div>
															<div className="min-w-0 flex-1">
																<div className="flex items-center justify-between gap-3">
																	<p className="app-shell-notification__title text-sm font-semibold text-[#1b2325]">
																		{notification.title}
																	</p>
																	<span className="app-shell-notification__read text-[10px] font-bold uppercase tracking-[0.12em] text-[#5a6661]">
																		{notification.module}
																	</span>
																</div>
																<p className="mt-1 text-xs leading-5 text-[var(--muted)]">
																	{notification.detail}
																</p>
																<div className="mt-2 flex items-center justify-between gap-2">
																	<button
																		className="text-xs font-semibold text-[var(--primary)]"
																		onClick={() =>
																			handleNotificationClick(
																				notification.href as Route,
																			)
																		}
																		type="button"
																	>
																		{notification.actionLabel}
																	</button>
																	<button
																		className="app-shell-notification__resolve text-xs font-semibold text-[#2f8d5a]"
																		onClick={() =>
																			resolveNotification(notification.id)
																		}
																		type="button"
																	>
																		Descartar
																	</button>
																</div>
															</div>
														</div>
													</div>
												))
											) : (
												<div className="p-4 text-sm text-[var(--muted)]">
													No hay notificaciones pendientes.
												</div>
											)}
										</div>
									</div>
								) : null}
							</div>

							<details className="global-user-menu">
								<summary>
									<UserCircle aria-hidden="true" size={18} />
									<span className="hidden min-w-0 text-left sm:block">
										<span className="block max-w-44 truncate text-sm font-semibold">
											{shortName}
										</span>
										<span className="block max-w-44 truncate text-xs text-[var(--muted)]">
											{user.email}
										</span>
									</span>
									<ChevronDown aria-hidden="true" size={14} />
								</summary>
								<div className="space-y-2">
									<Link
										className="app-shell-user-link focus-ring flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[#30383b] transition hover:bg-[#f3f5f1]"
										href={"/account/security" as Route}
									>
										<DevicePasskeyMark size={17} />
										Seguridad de acceso
									</Link>
									<form action={logoutAction}>
										<button
											className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--brand-red)] px-3 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(200,32,47,0.18)] transition hover:bg-[#b51d2a]"
											type="submit"
										>
											<LogOut aria-hidden="true" size={16} />
											Cerrar sesion
										</button>
									</form>
								</div>
							</details>
						</div>
					</div>
				</header>

				<div className="app-shell-main print:p-0">{children}</div>
			</div>
		</div>
	);
}
