"use client";

import {
	ClipboardList,
	FileText,
	FolderKanban,
	Globe,
	LayoutDashboard,
	Package,
	UsersRound,
	WalletCards,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { hasPermission } from "@/shared/permissions/has-permission";

const navBase = "app-shell-nav-link focus-ring";
const navActive = "app-shell-nav-link--active";
const navInactive = "app-shell-nav-link--inactive";

function className(active: boolean) {
	return `${navBase} ${active ? navActive : navInactive}`;
}

export function SidebarNav({
	collapsed,
	permissions,
}: {
	collapsed?: boolean;
	permissions: readonly string[];
}) {
	const pathname = usePathname();
	const canViewProjects = hasPermission(permissions, "proyectos.ver");
	const canManageInventory = hasPermission(permissions, "inventario.mover");
	const canManageRequisitions =
		canManageInventory || hasPermission(permissions, "requerimiento.aprobar");
	const canViewFinances = hasPermission(permissions, "finanzas.ver");
	const canViewDocuments = canViewProjects;
	const canManageWebsite = hasPermission(permissions, "sitio.editar");

	return (
		<nav aria-label="Principal" className="app-shell-nav">
			<a
				aria-label="Dashboard"
				className={className(pathname === "/dashboard")}
				href="/dashboard"
				title={collapsed ? "Dashboard" : undefined}
			>
				<LayoutDashboard aria-hidden="true" size={18} />
				<span className="app-shell-nav-label">Dashboard</span>
			</a>
			{canViewProjects ? (
				<a
					aria-label="Proyectos"
					className={className(pathname.startsWith("/projects"))}
					href="/projects"
					title={collapsed ? "Proyectos" : undefined}
				>
					<FolderKanban aria-hidden="true" size={18} />
					<span className="app-shell-nav-label">Proyectos</span>
				</a>
			) : null}
			{canManageInventory ? (
				<a
					aria-label="Inventario"
					className={className(pathname.startsWith("/inventory"))}
					href="/inventory"
					title={collapsed ? "Inventario" : undefined}
				>
					<Package aria-hidden="true" size={18} />
					<span className="app-shell-nav-label">Inventario</span>
				</a>
			) : null}
			{canManageRequisitions ? (
				<a
					aria-label="Requerimientos"
					className={className(pathname.startsWith("/requisitions"))}
					href="/requisitions"
					title={collapsed ? "Requerimientos" : undefined}
				>
					<ClipboardList aria-hidden="true" size={18} />
					<span className="app-shell-nav-label">Requerimientos</span>
				</a>
			) : null}
			{canViewDocuments ? (
				<a
					aria-label="Documentos"
					className={className(pathname.startsWith("/documents"))}
					href="/documents"
					title={collapsed ? "Documentos" : undefined}
				>
					<FileText aria-hidden="true" size={18} />
					<span className="app-shell-nav-label">Documentos</span>
				</a>
			) : null}
			{canViewProjects ? (
				<a
					aria-label="Informes"
					className={className(pathname.startsWith("/reports"))}
					href="/reports"
					title={collapsed ? "Informes" : undefined}
				>
					<ClipboardList aria-hidden="true" size={18} />
					<span className="app-shell-nav-label">Informes</span>
				</a>
			) : null}

			<a
				aria-label="Usuarios y mi cuenta"
				className={className(pathname.startsWith("/users"))}
				href="/users"
				title={collapsed ? "Usuarios" : undefined}
			>
				<UsersRound aria-hidden="true" size={18} />
				<span className="app-shell-nav-label">Usuarios</span>
			</a>
			{canViewFinances ? (
				<a
					aria-label="Finanzas"
					className={className(pathname.startsWith("/finances"))}
					href="/finances"
					title={collapsed ? "Finanzas" : undefined}
				>
					<WalletCards aria-hidden="true" size={18} />
					<span className="app-shell-nav-label">Finanzas</span>
				</a>
			) : null}
			{canManageWebsite ? (
				<a
					aria-label="Sitio web"
					className={className(pathname.startsWith("/website"))}
					href="/website"
					title={collapsed ? "Sitio web" : undefined}
				>
					<Globe aria-hidden="true" size={18} />
					<span className="app-shell-nav-label">Sitio web</span>
				</a>
			) : null}
		</nav>
	);
}
