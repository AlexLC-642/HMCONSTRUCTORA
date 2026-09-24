"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: Route; label: string };

function isCurrent(pathname: string, href: Route) {
	return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function PublicDesktopNav({ links }: { links: NavLink[] }) {
	const pathname = usePathname();

	return (
		<nav aria-label="Navegación principal" className="public-nav__links">
			{links.map((link) => {
				const active = isCurrent(pathname, link.href);
				return (
					<Link
						aria-current={active ? "page" : undefined}
						data-active={active}
						href={link.href}
						key={link.href}
					>
						{link.label}
					</Link>
				);
			})}
		</nav>
	);
}
