"use client";

import { ChevronLeft, ChevronRight, Download, Play, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ZoomableImage } from "@/modules/documents/ui/zoomable-image";

export type MediaViewerItem = {
	id: string;
	src: string;
	mimeType: string;
	title: string;
	subtitle?: string;
	description?: string | null;
};

/**
 * Miniaturas + visor en ventana para fotos y videos. Las fotos admiten zoom;
 * flechas del teclado navegan y Escape cierra.
 */
export function MediaViewerGrid({ items }: { items: MediaViewerItem[] }) {
	const [index, setIndex] = useState<number | null>(null);
	const open = index !== null ? items[index] : null;

	const close = useCallback(() => setIndex(null), []);
	const step = useCallback(
		(direction: 1 | -1) =>
			setIndex((current) =>
				current === null
					? current
					: (current + direction + items.length) % items.length,
			),
		[items.length],
	);

	useEffect(() => {
		if (index === null) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") close();
			if (event.key === "ArrowRight") step(1);
			if (event.key === "ArrowLeft") step(-1);
		}
		window.addEventListener("keydown", onKeyDown);
		return () => {
			document.body.style.overflow = previous;
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [index, close, step]);

	return (
		<>
			<div className="media-viewer__grid">
				{items.map((item, itemIndex) => (
					<button
						className="media-viewer__thumb focus-ring"
						key={item.id}
						onClick={() => setIndex(itemIndex)}
						type="button"
					>
						<span className="media-viewer__frame">
							{item.mimeType.startsWith("image/") ? (
								// biome-ignore lint/performance/noImgElement: miniatura de archivo local autenticado.
								<img alt="" loading="lazy" src={item.src} />
							) : (
								<>
									<video muted preload="metadata" src={`${item.src}#t=0.1`} />
									<span className="media-viewer__play">
										<Play aria-hidden="true" size={18} />
									</span>
								</>
							)}
						</span>
						<strong>{item.title}</strong>
						{item.subtitle ? <small>{item.subtitle}</small> : null}
					</button>
				))}
			</div>
			{open
				? createPortal(
						<div
							aria-label={open.title}
							aria-modal="true"
							className="media-viewer__overlay"
							role="dialog"
						>
							<button
								aria-label="Cerrar"
								className="media-viewer__backdrop"
								onClick={close}
								type="button"
							/>
							<section className="media-viewer__panel">
								<header className="media-viewer__header">
									<div className="min-w-0">
										<h2>{open.title}</h2>
										{open.subtitle ? <p>{open.subtitle}</p> : null}
									</div>
									<div className="media-viewer__actions">
										<span className="media-viewer__counter">
											{(index ?? 0) + 1} / {items.length}
										</span>
										<a
											aria-label="Descargar"
											className="media-viewer__icon focus-ring"
											download
											href={open.src}
										>
											<Download aria-hidden="true" size={17} />
										</a>
										<button
											aria-label="Cerrar"
											className="media-viewer__icon focus-ring"
											onClick={close}
											type="button"
										>
											<X aria-hidden="true" size={18} />
										</button>
									</div>
								</header>
								<div className="media-viewer__stage">
									{open.mimeType.startsWith("image/") ? (
										<ZoomableImage
											alt={open.title}
											key={open.id}
											src={open.src}
										/>
									) : (
										<video
											className="media-viewer__video"
											controls
											key={open.id}
											src={open.src}
										>
											<track kind="captions" />
										</video>
									)}
									{items.length > 1 ? (
										<>
											<button
												aria-label="Anterior"
												className="media-viewer__nav media-viewer__nav--prev focus-ring"
												onClick={() => step(-1)}
												type="button"
											>
												<ChevronLeft aria-hidden="true" size={22} />
											</button>
											<button
												aria-label="Siguiente"
												className="media-viewer__nav media-viewer__nav--next focus-ring"
												onClick={() => step(1)}
												type="button"
											>
												<ChevronRight aria-hidden="true" size={22} />
											</button>
										</>
									) : null}
								</div>
								{open.description ? (
									<p className="media-viewer__caption">{open.description}</p>
								) : null}
							</section>
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
