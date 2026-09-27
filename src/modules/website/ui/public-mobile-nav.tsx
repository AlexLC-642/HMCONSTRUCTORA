"use client";

import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { publicFontVariables } from "./public-fonts";
import { usePublicPathname } from "./public-preview-path";

type NavLink = { href: Route; label: string };

export function PublicMobileNav({
	links,
	phone,
	phoneHref,
}: {
	links: NavLink[];
	phone?: string;
	phoneHref?: string | null;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePublicPathname();
	const dialogRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const doc = triggerRef.current?.ownerDocument ?? document;
		const view = doc.defaultView ?? window;
		const previousOverflow = doc.body.style.overflow;
		const previousFocus = doc.activeElement as HTMLElement | null;
		doc.body.style.overflow = "hidden";
		const focusableSelector =
			'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
		const focusFirstControl = view.requestAnimationFrame(() => {
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
			if (event.shiftKey && doc.activeElement === first) {
				event.preventDefault();
				last?.focus();
			} else if (!event.shiftKey && doc.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		view.addEventListener("keydown", containFocus);
		return () => {
			view.cancelAnimationFrame(focusFirstControl);
			doc.body.style.overflow = previousOverflow;
			view.removeEventListener("keydown", containFocus);
			(previousFocus ?? triggerRef.current)?.focus();
		};
	}, [isOpen]);

	return (
		<>
			<button
				aria-expanded={isOpen}
				aria-haspopup="dialog"
				aria-label="Abrir menú"
				className="hm-nav__menu"
				onClick={() => setIsOpen(true)}
				ref={triggerRef}
				type="button"
			>
				<Menu aria-hidden="true" size={22} />
			</button>

			{isOpen
				? createPortal(
						<div
							aria-label="Menú"
							aria-modal="true"
							className={`hm-mnav ${publicFontVariables}`}
							ref={dialogRef}
							role="dialog"
						>
							<div className="hm-mnav__head">
								<Image
									alt="HM Constructora"
									height={52}
									src="/assets/plates/brand-logo.png"
									width={57}
								/>
								<button
									aria-label="Cerrar menú"
									className="hm-nav__menu"
									onClick={() => setIsOpen(false)}
									type="button"
								>
									<X aria-hidden="true" size={22} />
								</button>
							</div>
							<nav aria-label="Navegación principal" className="hm-mnav__links">
								{links.map((link, index) => {
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
											style={{ "--i": index } as React.CSSProperties}
										>
											{link.label}
											<ArrowUpRight aria-hidden="true" size={26} />
										</Link>
									);
								})}
							</nav>
							<div className="hm-mnav__foot">
								<Link
									className="hm-btn hm-btn--primary"
									href={"/contacto" as Route}
									onClick={() => setIsOpen(false)}
								>
									Solicitar cotización
									<ArrowUpRight aria-hidden="true" size={18} />
								</Link>
								{phone && phoneHref ? (
									<a
										className="hm-mnav__phone"
										href={phoneHref}
										rel="noreferrer"
										target="_blank"
									>
										<Phone aria-hidden="true" size={16} />
										{phone}
									</a>
								) : null}
							</div>
						</div>,
						triggerRef.current?.ownerDocument.body ?? document.body,
					)
				: null}
		</>
	);
}
