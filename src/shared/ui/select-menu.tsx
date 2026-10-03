"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

export type SelectMenuOption = {
	value: string;
	label: string;
	/** Texto secundario bajo la etiqueta (código, unidad, motivo). */
	description?: string;
	disabled?: boolean;
	/** Texto adicional que alimenta la búsqueda sin mostrarse. */
	keywords?: string;
};

type SelectMenuProps = {
	options: SelectMenuOption[];
	value: string;
	onChange: (value: string) => void;
	/** Si se indica, envía el valor con el formulario mediante un input oculto. */
	name?: string;
	id?: string;
	placeholder?: string;
	searchable?: boolean;
	searchPlaceholder?: string;
	emptyMessage?: string;
	invalid?: boolean;
	disabled?: boolean;
	"aria-label"?: string;
	"aria-labelledby"?: string;
	"aria-describedby"?: string;
};

type PopupPosition = {
	left: number;
	width: number;
	top?: number;
	bottom?: number;
	maxHeight: number;
};

const POPUP_GAP = 6;
const POPUP_MAX_HEIGHT = 320;

/**
 * Selector propio para formularios internos. Sustituye al <select> nativo
 * cuando la lista emergente del navegador no se puede controlar (espacios en
 * blanco, colores ajenos al tema, sin búsqueda). Se dibuja en un portal con
 * posición fija para que un modal con scroll no lo recorte.
 */
export function SelectMenu({
	options,
	value,
	onChange,
	name,
	id,
	placeholder = "Seleccionar",
	searchable = false,
	searchPlaceholder = "Buscar",
	emptyMessage = "Sin resultados.",
	invalid = false,
	disabled = false,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	"aria-describedby": ariaDescribedBy,
}: SelectMenuProps) {
	const generatedId = useId();
	const triggerId = id ?? `${generatedId}-trigger`;
	const listId = `${generatedId}-list`;
	const triggerRef = useRef<HTMLButtonElement>(null);
	const popupRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(-1);
	const [position, setPosition] = useState<PopupPosition | null>(null);

	const selected = options.find((option) => option.value === value);
	const filtered = useMemo(() => {
		const search = query.trim().toLowerCase();
		if (!search) return options;
		return options.filter((option) =>
			`${option.label} ${option.description ?? ""} ${option.keywords ?? ""}`
				.toLowerCase()
				.includes(search),
		);
	}, [options, query]);

	const updatePosition = useCallback(() => {
		const trigger = triggerRef.current;
		if (!trigger) return;
		const rect = trigger.getBoundingClientRect();
		const viewportHeight = window.innerHeight;
		const spaceBelow = viewportHeight - rect.bottom - POPUP_GAP - 8;
		const spaceAbove = rect.top - POPUP_GAP - 8;
		const openAbove = spaceBelow < 200 && spaceAbove > spaceBelow;
		const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16);
		const left = Math.min(
			Math.max(8, rect.left),
			window.innerWidth - width - 8,
		);
		setPosition(
			openAbove
				? {
						left,
						width,
						bottom: viewportHeight - rect.top + POPUP_GAP,
						maxHeight: Math.min(POPUP_MAX_HEIGHT, spaceAbove),
					}
				: {
						left,
						width,
						top: rect.bottom + POPUP_GAP,
						maxHeight: Math.min(POPUP_MAX_HEIGHT, Math.max(spaceBelow, 160)),
					},
		);
	}, []);

	const close = useCallback((restoreFocus: boolean) => {
		setOpen(false);
		setPosition(null);
		setQuery("");
		setActiveIndex(-1);
		if (restoreFocus) triggerRef.current?.focus();
	}, []);

	const openMenu = () => {
		if (disabled) return;
		const selectedIndex = options.findIndex((option) => option.value === value);
		setActiveIndex(selectedIndex);
		setOpen(true);
	};

	useLayoutEffect(() => {
		if (!open) return;
		updatePosition();
	}, [open, updatePosition]);

	const popupReady = open && position !== null;
	useEffect(() => {
		// El popup se monta un render después de abrir (cuando ya hay posición);
		// el foco debe moverse entonces para que Escape y las flechas lleguen aquí.
		if (!popupReady) return;
		(searchable ? searchRef.current : listRef.current)?.focus({
			preventScroll: true,
		});
	}, [popupReady, searchable]);

	useEffect(() => {
		if (!open) return;
		function onPointerDown(event: PointerEvent) {
			const target = event.target as Node;
			if (
				popupRef.current?.contains(target) ||
				triggerRef.current?.contains(target)
			) {
				return;
			}
			close(false);
		}
		document.addEventListener("pointerdown", onPointerDown);
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
		};
	}, [open, close, updatePosition]);

	useEffect(() => {
		if (!open || activeIndex < 0) return;
		listRef.current
			?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
			?.scrollIntoView({ block: "nearest" });
	}, [open, activeIndex]);

	const choose = (option: SelectMenuOption | undefined) => {
		if (!option || option.disabled) return;
		onChange(option.value);
		close(true);
	};

	const moveActive = (direction: 1 | -1) => {
		if (filtered.length === 0) return;
		let next = activeIndex;
		for (let step = 0; step < filtered.length; step += 1) {
			next = (next + direction + filtered.length) % filtered.length;
			if (!filtered[next]?.disabled) break;
		}
		setActiveIndex(next);
	};

	const onPopupKeyDown = (event: KeyboardEvent) => {
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				moveActive(1);
				break;
			case "ArrowUp":
				event.preventDefault();
				moveActive(-1);
				break;
			case "Home":
				if (!searchable) {
					event.preventDefault();
					setActiveIndex(0);
				}
				break;
			case "End":
				if (!searchable) {
					event.preventDefault();
					setActiveIndex(filtered.length - 1);
				}
				break;
			case "Enter":
				event.preventDefault();
				choose(filtered[activeIndex]);
				break;
			case "Escape":
				event.preventDefault();
				event.stopPropagation();
				close(true);
				break;
			case "Tab":
				close(false);
				break;
		}
	};

	const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
			event.preventDefault();
			openMenu();
		}
	};

	const activeOptionId =
		activeIndex >= 0 && filtered[activeIndex]
			? `${listId}-${activeIndex}`
			: undefined;

	return (
		<>
			{name ? <input name={name} type="hidden" value={value} /> : null}
			<button
				aria-controls={open ? listId : undefined}
				aria-describedby={ariaDescribedBy}
				aria-expanded={open}
				aria-haspopup="listbox"
				aria-invalid={invalid || undefined}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledBy}
				className="select-menu__trigger focus-ring"
				data-open={open || undefined}
				data-placeholder={!selected || undefined}
				disabled={disabled}
				id={triggerId}
				onClick={() => (open ? close(false) : openMenu())}
				onKeyDown={onTriggerKeyDown}
				ref={triggerRef}
				type="button"
			>
				<span className="select-menu__value">
					{selected ? selected.label : placeholder}
				</span>
				<ChevronDown
					aria-hidden="true"
					className="select-menu__chevron"
					size={16}
				/>
			</button>
			{open && position
				? createPortal(
						// biome-ignore lint/a11y/noStaticElementInteractions: el contenedor centraliza el teclado del buscador y de la lista (patrón combobox con aria-activedescendant).
						<div
							className="select-menu__popup"
							onKeyDown={onPopupKeyDown}
							ref={popupRef}
							style={{
								left: position.left,
								width: position.width,
								top: position.top,
								bottom: position.bottom,
								maxHeight: position.maxHeight,
							}}
						>
							{searchable ? (
								<div className="select-menu__search">
									<Search aria-hidden="true" size={15} />
									<input
										aria-activedescendant={activeOptionId}
										aria-autocomplete="list"
										aria-controls={listId}
										aria-expanded="true"
										aria-label={searchPlaceholder}
										onChange={(event) => {
											setQuery(event.target.value);
											setActiveIndex(0);
										}}
										placeholder={searchPlaceholder}
										ref={searchRef}
										role="combobox"
										type="text"
										value={query}
									/>
								</div>
							) : null}
							<div
								aria-activedescendant={searchable ? undefined : activeOptionId}
								aria-label={ariaLabel}
								aria-labelledby={ariaLabel ? undefined : ariaLabelledBy}
								className="select-menu__list"
								id={listId}
								ref={listRef}
								role="listbox"
								tabIndex={searchable ? -1 : 0}
							>
								{filtered.length === 0 ? (
									<p className="select-menu__empty">{emptyMessage}</p>
								) : (
									filtered.map((option, index) => {
										const isSelected = option.value === value;
										return (
											// biome-ignore lint/a11y/useKeyWithClickEvents: Enter y flechas se atienden en el contenedor vía aria-activedescendant.
											<div
												aria-disabled={option.disabled || undefined}
												aria-selected={isSelected}
												className="select-menu__option"
												data-active={index === activeIndex || undefined}
												data-index={index}
												id={`${listId}-${index}`}
												key={option.value || `empty-${index}`}
												onClick={() => choose(option)}
												onPointerMove={() => {
													if (!option.disabled && index !== activeIndex) {
														setActiveIndex(index);
													}
												}}
												role="option"
												tabIndex={-1}
											>
												<span>
													<strong>{option.label}</strong>
													{option.description ? (
														<small>{option.description}</small>
													) : null}
												</span>
												{isSelected ? (
													<Check aria-hidden="true" size={15} />
												) : null}
											</div>
										);
									})
								)}
							</div>
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
