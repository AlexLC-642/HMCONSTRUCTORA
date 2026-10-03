"use client";

import { CircleHelp } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

const GAP = 8;
const WIDTH = 256;

/**
 * Ayuda contextual detrás de un "?". Se abre al pasar el cursor, al enfocar
 * con teclado o al tocar en móvil. Se dibuja en un portal con posición fija
 * para que un modal con scroll o transformado no la recorte.
 */
export function HelpTip({
	children,
	label = "Ayuda",
}: {
	children: ReactNode;
	label?: string;
}) {
	const tipId = useId();
	const triggerRef = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const [pinned, setPinned] = useState(false);
	const [position, setPosition] = useState<{ left: number; top: number } | null>(
		null,
	);

	const place = useCallback(() => {
		const rect = triggerRef.current?.getBoundingClientRect();
		if (!rect) return;
		const width = Math.min(WIDTH, window.innerWidth - 16);
		const left = Math.min(
			Math.max(8, rect.left + rect.width / 2 - width / 2),
			window.innerWidth - width - 8,
		);
		setPosition({ left, top: rect.bottom + GAP });
	}, []);

	const close = useCallback(() => {
		setOpen(false);
		setPinned(false);
	}, []);

	useLayoutEffect(() => {
		if (open) place();
	}, [open, place]);

	useEffect(() => {
		if (!open) return;
		function onPointerDown(event: PointerEvent) {
			if (!triggerRef.current?.contains(event.target as Node)) close();
		}
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				// Cierra solo la ayuda, no el formulario que la contiene.
				event.preventDefault();
				close();
			}
		}
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		window.addEventListener("scroll", close, true);
		window.addEventListener("resize", close);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("scroll", close, true);
			window.removeEventListener("resize", close);
		};
	}, [open, close]);

	return (
		<>
			<button
				aria-describedby={open ? tipId : undefined}
				aria-expanded={open}
				aria-label={label}
				className="help-tip__trigger focus-ring"
				onBlur={() => {
					if (!pinned) setOpen(false);
				}}
				onClick={() => {
					if (pinned) close();
					else {
						setPinned(true);
						setOpen(true);
					}
				}}
				onFocus={() => setOpen(true)}
				onPointerEnter={(event) => {
					if (event.pointerType === "mouse") setOpen(true);
				}}
				onPointerLeave={(event) => {
					if (event.pointerType === "mouse" && !pinned) setOpen(false);
				}}
				ref={triggerRef}
				type="button"
			>
				<CircleHelp aria-hidden="true" size={15} />
			</button>
			{open && position
				? createPortal(
						<div
							className="help-tip__bubble"
							id={tipId}
							role="tooltip"
							style={{ left: position.left, top: position.top }}
						>
							{children}
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
