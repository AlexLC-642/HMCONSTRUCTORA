"use client";

import { Menu, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type NavLink = { href: Route; label: string };

export function PublicMobileNav({ links }: { links: NavLink[] }) {
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePathname();
	const dialogRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const previousOverflow = document.body.style.overflow;
		const previousFocus = document.activeElement as HTMLElement | null;
		document.body.style.overflow = "hidden";
		const focusableSelector =
			'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
		const focusFirstControl = window.requestAnimationFrame(() => {
			dialogRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
		});
		const containFocus = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				setIsOpen(false);
				return;
			}
			if (event.key !== "Tab" || !dialogRef.current) return;
			const controls = Array.from(
				dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
			).filter((element) => !element.hasAttribute("disabled"));
			if (controls.length === 0) return;
			const first = controls[0];
			const last = controls.at(-1);
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last?.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		window.addEventListener("keydown", containFocus);
		return () => {
			window.cancelAnimationFrame(focusFirstControl);
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", containFocus);
			(previousFocus ?? triggerRef.current)?.focus();
		};
	}, [isOpen]);

	return (
		<>
			<button
				aria-expanded={isOpen}
				aria-haspopup="dialog"
				aria-label="Abrir menú"
				className="public-nav__menu-btn focus-ring"
				onClick={() => setIsOpen(true)}
				ref={triggerRef}
				type="button"
			>
				<Menu aria-hidden="true" size={24} />
			</button>

			{isOpen
				? createPortal(
						<div
							aria-label="Navegación"
							aria-modal="true"
							className="public-nav__mobile-panel"
							ref={dialogRef}
							role="dialog"
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
									{links.map((link) => {
										const active =
											link.href === "/"
												? pathname === "/"
												: pathname.startsWith(link.href);
										return (
											<Link
												aria-current={active ? "page" : undefined}
												data-active={active}
												href={link.href}
												key={link.href}
												onClick={() => setIsOpen(false)}
											>
												{link.label}
											</Link>
										);
									})}
								</nav>
								<Link
									className="public-nav__cta public-nav__cta--mobile"
									href={"/contacto" as Route}
									onClick={() => setIsOpen(false)}
								>
									Solicitar cotización
								</Link>
							</div>
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
