"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 6;

type Point = { x: number; y: number };

function clampScale(value: number) {
	return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

/**
 * Wheel-zoom + drag-to-pan + pinch-to-zoom viewer for a single image (plans,
 * photos). Uses Pointer Events so mouse and touch share one code path.
 * Deliberately quiet at rest: no visible chrome until the image is actually
 * zoomed, then just a small pill (percentage + reset) - no toolbar, no
 * always-on controls.
 */
export function ZoomableImage({ src, alt }: { src: string; alt: string }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);
	const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
	const dragState = useRef<{
		pointers: Map<number, Point>;
		lastCenter: Point | null;
		lastDistance: number | null;
	}>({ pointers: new Map(), lastCenter: null, lastDistance: null });

	const clampOffset = useCallback((nextScale: number, next: Point): Point => {
		const container = containerRef.current;
		if (!container) return next;
		const rect = container.getBoundingClientRect();
		// At nextScale, the image is (nextScale - 1) * rect wider/taller than
		// the frame - offset can't exceed that overflow in either direction.
		const maxX = (rect.width * (nextScale - 1)) / 2;
		const maxY = (rect.height * (nextScale - 1)) / 2;
		return {
			x: Math.min(maxX, Math.max(-maxX, next.x)),
			y: Math.min(maxY, Math.max(-maxY, next.y)),
		};
	}, []);

	const zoomAt = useCallback(
		(anchor: Point, nextScaleRaw: number) => {
			const container = containerRef.current;
			if (!container) return;
			const nextScale = clampScale(nextScaleRaw);
			setScale((currentScale) => {
				if (nextScale === currentScale) return currentScale;
				const rect = container.getBoundingClientRect();
				const cx = anchor.x - (rect.left + rect.width / 2);
				const cy = anchor.y - (rect.top + rect.height / 2);
				setOffset((currentOffset) => {
					const ratio = nextScale / currentScale;
					const next = {
						x: cx - (cx - currentOffset.x) * ratio,
						y: cy - (cy - currentOffset.y) * ratio,
					};
					return nextScale <= MIN_SCALE
						? { x: 0, y: 0 }
						: clampOffset(nextScale, next);
				});
				return nextScale;
			});
		},
		[clampOffset],
	);

	function reset() {
		setScale(1);
		setOffset({ x: 0, y: 0 });
	}

	function containerCenter(): Point {
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };
		return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
	}

	function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
		event.preventDefault();
		const factor = Math.exp(-event.deltaY * 0.0018);
		zoomAt({ x: event.clientX, y: event.clientY }, scale * factor);
	}

	function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
		if (scale <= MIN_SCALE) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		dragState.current.pointers.set(event.pointerId, {
			x: event.clientX,
			y: event.clientY,
		});
		if (dragState.current.pointers.size === 2) {
			const points = Array.from(dragState.current.pointers.values());
			dragState.current.lastCenter = {
				x: (points[0].x + points[1].x) / 2,
				y: (points[0].y + points[1].y) / 2,
			};
			dragState.current.lastDistance = Math.hypot(
				points[0].x - points[1].x,
				points[0].y - points[1].y,
			);
		}
	}

	function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
		const pointers = dragState.current.pointers;
		if (!pointers.has(event.pointerId)) return;
		const previous = pointers.get(event.pointerId);
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

		if (pointers.size === 2) {
			const points = Array.from(pointers.values());
			const distance = Math.hypot(
				points[0].x - points[1].x,
				points[0].y - points[1].y,
			);
			const center = {
				x: (points[0].x + points[1].x) / 2,
				y: (points[0].y + points[1].y) / 2,
			};
			if (dragState.current.lastDistance) {
				const nextScale = scale * (distance / dragState.current.lastDistance);
				zoomAt(center, nextScale);
			}
			dragState.current.lastDistance = distance;
			dragState.current.lastCenter = center;
			return;
		}

		if (scale <= MIN_SCALE || !previous) return;
		const dx = event.clientX - previous.x;
		const dy = event.clientY - previous.y;
		setOffset((current) =>
			clampOffset(scale, { x: current.x + dx, y: current.y + dy }),
		);
	}

	function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
		dragState.current.pointers.delete(event.pointerId);
		if (dragState.current.pointers.size < 2) {
			dragState.current.lastDistance = null;
			dragState.current.lastCenter = null;
		}
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
		const step = 40;
		if (event.key === "+" || event.key === "=") {
			event.preventDefault();
			zoomAt(containerCenter(), scale * 1.4);
		} else if (event.key === "-") {
			event.preventDefault();
			zoomAt(containerCenter(), scale / 1.4);
		} else if (event.key === "0") {
			event.preventDefault();
			reset();
		} else if (scale > MIN_SCALE) {
			if (event.key === "ArrowUp") {
				event.preventDefault();
				setOffset((current) =>
					clampOffset(scale, { ...current, y: current.y + step }),
				);
			} else if (event.key === "ArrowDown") {
				event.preventDefault();
				setOffset((current) =>
					clampOffset(scale, { ...current, y: current.y - step }),
				);
			} else if (event.key === "ArrowLeft") {
				event.preventDefault();
				setOffset((current) =>
					clampOffset(scale, { ...current, x: current.x + step }),
				);
			} else if (event.key === "ArrowRight") {
				event.preventDefault();
				setOffset((current) =>
					clampOffset(scale, { ...current, x: current.x - step }),
				);
			}
		}
	}

	const zoomed = scale > MIN_SCALE + 0.01;

	return (
		<div
			aria-label={`${alt} - visor con zoom. Usa la rueda del mouse, pellizca o las teclas + y - para acercar.`}
			className="relative h-full w-full touch-none select-none overflow-hidden focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
			onDoubleClick={(event) =>
				zoomAt({ x: event.clientX, y: event.clientY }, zoomed ? 1 : 2.5)
			}
			onKeyDown={handleKeyDown}
			onPointerCancel={handlePointerUp}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onWheel={handleWheel}
			ref={containerRef}
			role="application"
			style={{ cursor: zoomed ? "grab" : "zoom-in" }}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: custom pan/zoom widget with its own keyboard scheme (arrows/+/-/0), needs focus like role="application" widgets Biome doesn't recognize as interactive.
			tabIndex={0}
		>
			{/* biome-ignore lint/performance/noImgElement: needs direct transform
			    control for zoom/pan; next/image already rendered unoptimized here. */}
			<img
				alt={alt}
				className="pointer-events-none mx-auto h-full max-h-full w-full max-w-full select-none object-contain"
				draggable={false}
				src={src}
				style={{
					transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
					transformOrigin: "center",
					transition:
						dragState.current.pointers.size > 0
							? "none"
							: "transform 120ms ease-out",
				}}
			/>
			{zoomed ? (
				<div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
					<button
						aria-label="Alejar"
						className="grid size-6 place-items-center rounded-full hover:bg-white/15"
						onClick={() => zoomAt(containerCenter(), scale / 1.4)}
						type="button"
					>
						<Minus aria-hidden="true" size={13} />
					</button>
					<span className="w-10 text-center tabular-nums">
						{Math.round(scale * 100)}%
					</span>
					<button
						aria-label="Acercar"
						className="grid size-6 place-items-center rounded-full hover:bg-white/15"
						onClick={() => zoomAt(containerCenter(), scale * 1.4)}
						type="button"
					>
						<Plus aria-hidden="true" size={13} />
					</button>
					<button
						aria-label="Restablecer zoom"
						className="ml-1 flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 hover:bg-white/25"
						onClick={reset}
						type="button"
					>
						<RotateCcw aria-hidden="true" size={11} />
					</button>
				</div>
			) : null}
		</div>
	);
}
