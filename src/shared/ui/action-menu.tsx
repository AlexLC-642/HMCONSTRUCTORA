"use client";

import { MoreVertical } from "lucide-react";
import {
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

/**
 * Menú de acciones por registro. Se abre de tres formas con las mismas
 * opciones: el botón ⋮ (teclado, lector de pantalla), clic derecho sobre la
 * fila y pulsación larga en pantallas táctiles (estas dos vía
 * ActionMenuScope). Las opciones se pasan como children y pueden ser enlaces
 * o formularios con Server Actions renderizados en el servidor.
 *
 * El panel se monta en un portal: los paneles con backdrop-filter crean un
 * nuevo contexto de posicionamiento y recortarían un menú `fixed`.
 */

const OPEN_EVENT = "action-menu:open";
const ITEM_SELECTOR =
	'a[href], button:not([disabled]), [role="menuitem"]:not([aria-disabled="true"])';
const MENU_WIDTH = 224;
const VIEWPORT_GAP = 8;

type Point = { x: number; y: number };

export function ActionMenu({
	children,
	hideTrigger = false,
	label = "Más acciones",
	triggerClassName = "focus-ring flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--muted)] transition hover:bg-[#f4f0ed] hover:text-[var(--foreground)]",
}: {
	children: ReactNode;
	/**
	 * Sin botón ⋮ visible: solo clic derecho / pulsación larga. Únicamente
	 * para filas que ya muestran las mismas acciones en pantalla (p. ej. el
	 * panel de detalle de Compras) o que ya son un botón.
	 */
	hideTrigger?: boolean;
	label?: string;
	triggerClassName?: string;
}) {
	const [anchor, setAnchor] = useState<Point | null>(null);
	const [position, setPosition] = useState<Point | null>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const openedAtRef = useRef(0);
	const menuId = useId();
	const open = anchor !== null;

	const close = useCallback((restoreFocus: boolean) => {
		setAnchor(null);
		setPosition(null);
		if (restoreFocus && !hideTrigger) triggerRef.current?.focus();
	}, [hideTrigger]);

	const openFromTrigger = () => {
		const rect = triggerRef.current?.getBoundingClientRect();
		if (!rect) return;
		// Alineado a la derecha del botón, debajo de él.
		setAnchor({ x: rect.right - MENU_WIDTH, y: rect.bottom + 4 });
	};

	// Clic derecho / pulsación larga llegan como evento personalizado.
	useEffect(() => {
		const trigger = triggerRef.current;
		if (!trigger) return;
		function onOpen(event: Event) {
			const detail = (event as CustomEvent<Point>).detail;
			setAnchor({ x: detail.x, y: detail.y });
		}
		trigger.addEventListener(OPEN_EVENT, onOpen);
		return () => trigger.removeEventListener(OPEN_EVENT, onOpen);
	}, []);

	// Ajusta la posición para que el menú no salga de la pantalla.
	useLayoutEffect(() => {
		if (!anchor || !panelRef.current) return;
		openedAtRef.current = performance.now();
		const { offsetWidth, offsetHeight } = panelRef.current;
		const maxX = window.innerWidth - offsetWidth - VIEWPORT_GAP;
		const maxY = window.innerHeight - offsetHeight - VIEWPORT_GAP;
		let y = anchor.y;
		if (y > maxY) {
			// Si no cabe abajo, se abre hacia arriba desde el punto de origen.
			const trigger = triggerRef.current?.getBoundingClientRect();
			const above =
				(trigger && anchor.y === trigger.bottom + 4 ? trigger.top - 4 : y) -
				offsetHeight;
			y = above >= VIEWPORT_GAP ? above : Math.max(VIEWPORT_GAP, maxY);
		}
		const next = {
			x: Math.min(
				Math.max(VIEWPORT_GAP, anchor.x),
				Math.max(VIEWPORT_GAP, maxX),
			),
			y,
		};
		// Se aplica directo al DOM para poder enfocar ya: un elemento con
		// visibility: hidden no acepta el foco.
		const panel = panelRef.current;
		panel.style.left = `${next.x}px`;
		panel.style.top = `${next.y}px`;
		panel.style.visibility = "visible";
		setPosition(next);
		panel
			.querySelector<HTMLElement>(ITEM_SELECTOR)
			?.focus({ preventScroll: true });
	}, [anchor]);

	useEffect(() => {
		if (!open) return;
		function onPointerDown(event: PointerEvent) {
			const target = event.target as Node;
			if (
				panelRef.current?.contains(target) ||
				triggerRef.current?.contains(target)
			)
				return;
			close(false);
		}
		function onViewportChange(event: Event) {
			if (panelRef.current?.contains(event.target as Node)) return;
			// Un desplazamiento que ya venía en curso (inercia del touchpad) no
			// debe cerrar el menú recién abierto.
			if (performance.now() - openedAtRef.current < 300) return;
			close(false);
		}
		function onKeyDown(event: KeyboardEvent) {
			if (
				event.key === "Escape" &&
				!panelRef.current?.contains(document.activeElement)
			)
				close(true);
		}
		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("pointerdown", onPointerDown);
		window.addEventListener("scroll", onViewportChange, true);
		window.addEventListener("resize", onViewportChange);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("scroll", onViewportChange, true);
			window.removeEventListener("resize", onViewportChange);
		};
	}, [open, close]);

	function onPanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
		const items = Array.from(
			panelRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [],
		);
		const index = items.indexOf(document.activeElement as HTMLElement);
		const focusAt = (next: number) => {
			event.preventDefault();
			items[(next + items.length) % items.length]?.focus();
		};
		if (event.key === "ArrowDown") focusAt(index + 1);
		else if (event.key === "ArrowUp") focusAt(index - 1);
		else if (event.key === "Home") focusAt(0);
		else if (event.key === "End") focusAt(items.length - 1);
		else if (event.key === "Escape") {
			event.preventDefault();
			close(true);
		} else if (event.key === "Tab") close(false);
	}

	function onPanelClick(event: ReactMouseEvent<HTMLDivElement>) {
		const item = (event.target as HTMLElement).closest("a, button");
		if (!item) return;
		// Los botones type="button" (p. ej. confirmar eliminación) abren su
		// propio diálogo dentro del menú: el menú debe seguir montado.
		if (
			item instanceof HTMLButtonElement &&
			item.type === "button" &&
			!item.hasAttribute("data-close-menu")
		)
			return;
		// Se cierra después de que el navegador inicie la navegación/envío.
		window.setTimeout(() => close(false), 0);
	}

	return (
		<>
			<button
				aria-controls={open ? menuId : undefined}
				aria-expanded={open}
				aria-haspopup="menu"
				aria-label={label}
				className={triggerClassName}
				data-action-menu-trigger=""
				hidden={hideTrigger}
				onClick={() => (open ? close(false) : openFromTrigger())}
				ref={triggerRef}
				title={`${label} (también con clic derecho sobre el registro)`}
				type="button"
			>
				<MoreVertical aria-hidden="true" size={15} />
			</button>
			{open
				? createPortal(
						<div
							aria-label={label}
							className="action-menu fixed z-[90] w-56 overflow-hidden rounded-xl border border-[#dfe3dc] bg-white py-1 text-[13px] shadow-[0_16px_42px_rgba(22,27,29,0.16)]"
							id={menuId}
							onClick={onPanelClick}
							onKeyDown={onPanelKeyDown}
							ref={panelRef}
							role="menu"
							style={{
								left: position?.x ?? anchor.x,
								top: position?.y ?? anchor.y,
								visibility: position ? "visible" : "hidden",
							}}
							tabIndex={-1}
						>
							{children}
						</div>,
						document.body,
					)
				: null}
		</>
	);
}

const LONG_PRESS_MS = 550;
const LONG_PRESS_TOLERANCE = 10;

/**
 * Envuelve una lista o tabla para abrir el ActionMenu de cada registro con
 * clic derecho o pulsación larga. Cada registro se marca con
 * `data-action-row` y debe contener un ActionMenu. Shift + clic derecho, los
 * campos de texto y el texto seleccionado conservan el menú del navegador.
 */
export function ActionMenuScope({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	const pressRef = useRef<{
		timer: number;
		x: number;
		y: number;
	} | null>(null);
	const suppressClickRef = useRef(false);

	function openAt(target: EventTarget | null, x: number, y: number) {
		if (!(target instanceof Element)) return false;
		if (target.closest("input, textarea, select, [contenteditable]"))
			return false;
		const selection = window.getSelection();
		if (selection && !selection.isCollapsed && selection.toString().trim())
			return false;
		const row = target.closest("[data-action-row]");
		const trigger = row?.querySelector("[data-action-menu-trigger]");
		if (!trigger) return false;
		trigger.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { x, y } }));
		return true;
	}

	function cancelPress() {
		if (pressRef.current) window.clearTimeout(pressRef.current.timer);
		pressRef.current = null;
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: atajo de ratón/táctil; la vía accesible es el botón ⋮ de cada registro.
		<div
			className={className}
			onClickCapture={(event) => {
				// La pulsación larga no debe terminar también en un "tap" que navegue.
				if (suppressClickRef.current) {
					suppressClickRef.current = false;
					event.preventDefault();
					event.stopPropagation();
				}
			}}
			onContextMenu={(event) => {
				if (event.shiftKey) return;
				// Teclado (tecla Menú / Shift+F10) llega con coordenadas 0,0.
				const fromKeyboard = event.clientX === 0 && event.clientY === 0;
				let { clientX: x, clientY: y } = event;
				if (fromKeyboard && event.target instanceof Element) {
					const rect = event.target.getBoundingClientRect();
					x = rect.left;
					y = rect.bottom;
				}
				if (openAt(event.target, x, y)) {
					event.preventDefault();
					cancelPress();
				}
			}}
			onPointerCancel={cancelPress}
			onPointerDown={(event) => {
				if (event.pointerType !== "touch") return;
				cancelPress();
				const { clientX: x, clientY: y, target } = event;
				pressRef.current = {
					x,
					y,
					timer: window.setTimeout(() => {
						pressRef.current = null;
						if (!openAt(target, x, y)) return;
						suppressClickRef.current = true;
						// Si el navegador no genera el clic posterior, no se traga el siguiente.
						window.setTimeout(() => {
							suppressClickRef.current = false;
						}, 800);
					}, LONG_PRESS_MS),
				};
			}}
			onPointerMove={(event) => {
				const press = pressRef.current;
				if (
					press &&
					Math.hypot(event.clientX - press.x, event.clientY - press.y) >
						LONG_PRESS_TOLERANCE
				)
					cancelPress();
			}}
			onPointerUp={cancelPress}
		>
			{children}
		</div>
	);
}

/** Separador visual entre grupos de opciones del menú. */
export function ActionMenuSeparator() {
	return <hr className="my-1 h-px border-0 bg-[#e5e7eb]" />;
}

const ITEM_BASE_CLASS =
	"flex w-full items-center gap-2.5 px-3 py-2 text-left transition focus:outline-none focus-visible:bg-[#f4f0ed] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0";

const ITEM_TONE_CLASS = {
	default: "text-[var(--foreground)] hover:bg-[#f9f7f4]",
	muted: "text-[var(--muted)] hover:bg-[#f9f7f4]",
	success: "text-[#0f766e] hover:bg-[#ecfeff]",
	warning: "text-[#7c2d12] hover:bg-[#fef2f2]",
	danger: "text-[#b3261e] hover:bg-[#fef2f2]",
} as const;

export type ActionMenuTone = keyof typeof ITEM_TONE_CLASS;

export function actionMenuItemClass(tone: ActionMenuTone = "default") {
	return `${ITEM_BASE_CLASS} ${ITEM_TONE_CLASS[tone]}`;
}

/** Opción de menú que navega. `icon` se pasa ya renderizado (<Eye size={14} />). */
export function ActionMenuLink({
	children,
	download,
	href,
	icon,
	tone,
}: {
	children: ReactNode;
	download?: boolean;
	href: string;
	icon?: ReactNode;
	tone?: ActionMenuTone;
}) {
	return (
		<a
			className={actionMenuItemClass(tone)}
			download={download}
			href={href}
			role="menuitem"
		>
			{icon}
			<span>{children}</span>
		</a>
	);
}

/**
 * Opción de menú que envía el <form> que la contiene (Server Action con sus
 * campos ocultos, renderizado por la página) o ejecuta `onClick` en vistas
 * cliente.
 */
export function ActionMenuButton({
	children,
	disabled,
	icon,
	onClick,
	tone,
	type = "submit",
}: {
	children: ReactNode;
	disabled?: boolean;
	icon?: ReactNode;
	onClick?: () => void;
	tone?: ActionMenuTone;
	type?: "submit" | "button";
}) {
	return (
		<button
			className={actionMenuItemClass(tone)}
			data-close-menu={type === "button" ? "" : undefined}
			disabled={disabled}
			onClick={onClick}
			role="menuitem"
			type={type}
		>
			{icon}
			<span>{children}</span>
		</button>
	);
}
