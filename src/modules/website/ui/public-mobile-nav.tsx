"use client";

import { Menu, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

type NavLink = { href: Route; label: string };

export function PublicMobileNav({ links }: { links: NavLink[] }) {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsOpen(false);
		};
		window.addEventListener("keydown", closeOnEscape);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", closeOnEscape);
		};
	}, [isOpen]);

	return (
		<>
			<button
				aria-expanded={isOpen}
				aria-label="Abrir menú"
				className="public-nav__menu-btn focus-ring"
				onClick={() => setIsOpen(true)}
				type="button"
			>
				<Menu aria-hidden="true" size={24} />
			</button>

			{isOpen ? (
				<div
					className="public-nav__mobile-panel"
					role="dialog"
					aria-modal="true"
					aria-label="Navegación"
				>
					<button
						aria-label="Cerrar menú"
						className="public-nav__mobile-backdrop"
						onClick={() => setIsOpen(false)}
						type="button"
					/>
					<div className="public-nav__mobile-sheet">
						<div className="public-nav__mobile-head">
							<span>Menú</span>
							<button
								aria-label="Cerrar menú"
								className="public-nav__menu-btn focus-ring"
								onClick={() => setIsOpen(false)}
								type="button"
							>
								<X aria-hidden="true" size={22} />
							</button>
						</div>
						<nav aria-label="Navegación principal">
							{links.map((link) => (
								<Link
									href={link.href}
									key={link.href}
									onClick={() => setIsOpen(false)}
								>
									{link.label}
								</Link>
							))}
						</nav>
						<Link
							className="public-nav__cta public-nav__cta--mobile"
							href={"/contacto" as Route}
							onClick={() => setIsOpen(false)}
						>
							Solicitar cotización
						</Link>
					</div>
				</div>
			) : null}
		</>
	);
}
