"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const destinations: Array<{ href: Route; label: string }> = [
	{ href: "/", label: "Inicio" },
	{ href: "/servicios", label: "Servicios" },
	{ href: "/proyectos", label: "Construcciones" },
	{ href: "/contacto", label: "Contacto" },
];

export function PublicHeroRail() {
	const pathname = usePathname();

	return (
		<div className="public-hero-rail">
			<nav aria-label="Secciones del sitio">
				{destinations.map((destination) => {
					const active =
						destination.href === "/"
							? pathname === "/"
							: pathname.startsWith(destination.href);
					return (
						<Link
							aria-current={active ? "page" : undefined}
							data-active={active}
							href={destination.href}
							key={destination.href}
						>
							<span aria-hidden="true" />
							{destination.label}
						</Link>
					);
				})}
			</nav>
			<p>Construyendo un mejor mañana</p>
		</div>
	);
}
