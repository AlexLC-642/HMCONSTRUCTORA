"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePublicPathname } from "./public-preview-path";

type NavLink = { href: Route; label: string };

function isCurrent(pathname: string, href: Route) {
	return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function PublicDesktopNav({ links }: { links: NavLink[] }) {
	const pathname = usePublicPathname();

	return (
		<nav aria-label="Navegación principal" className="hm-nav__links">
			{links.map((link) => {
				const active = isCurrent(pathname, link.href);
				return (
					<Link
						aria-current={active ? "page" : undefined}
						data-active={active}
						href={link.href}
						key={link.href}
						onClick={(event) => {
							// Mouse clicks shouldn't leave a focus ring on the new page;
							// keyboard activation (detail 0) keeps focus visible.
							if (event.detail > 0) event.currentTarget.blur();
						}}
					>
						{link.label}
					</Link>
				);
			})}
		</nav>
	);
}
