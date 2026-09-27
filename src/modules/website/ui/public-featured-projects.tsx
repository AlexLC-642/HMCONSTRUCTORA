"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Project = {
	id: string;
	title: string;
	imageUrl: string;
	altText: string | null;
	count: number;
};

/** Horizontal, draggable rail of real project albums with scroll progress. */
export function PublicFeaturedProjects({ projects }: { projects: Project[] }) {
	const railRef = useRef<HTMLUListElement>(null);
	const [progress, setProgress] = useState(0);
	const [edges, setEdges] = useState({ start: true, end: false });

	useEffect(() => {
		const rail = railRef.current;
		if (!rail) return;
		const measure = () => {
			const max = rail.scrollWidth - rail.clientWidth;
			setProgress(max > 0 ? rail.scrollLeft / max : 1);
			setEdges({ start: rail.scrollLeft < 8, end: rail.scrollLeft > max - 8 });
		};
		measure();
		rail.addEventListener("scroll", measure, { passive: true });
		const view = rail.ownerDocument.defaultView ?? window;
		view.addEventListener("resize", measure);

		// Mouse drag-to-scroll; touch and trackpads keep native scrolling.
		let startX = 0;
		let startScroll = 0;
		let dragging = false;
		let moved = false;
		const down = (event: PointerEvent) => {
			if (event.pointerType !== "mouse" || event.button !== 0) return;
			dragging = true;
			moved = false;
			startX = event.clientX;
			startScroll = rail.scrollLeft;
		};
		const move = (event: PointerEvent) => {
			if (!dragging) return;
			const delta = event.clientX - startX;
			if (Math.abs(delta) > 6 && !moved) {
				moved = true;
				rail.dataset.dragging = "true";
			}
			if (moved) rail.scrollLeft = startScroll - delta;
		};
		const up = () => {
			dragging = false;
			delete rail.dataset.dragging;
		};
		const click = (event: MouseEvent) => {
			if (moved) {
				event.preventDefault();
				event.stopPropagation();
				moved = false;
			}
		};
		rail.addEventListener("pointerdown", down);
		view.addEventListener("pointermove", move);
		view.addEventListener("pointerup", up);
		rail.addEventListener("click", click, true);
		return () => {
			rail.removeEventListener("scroll", measure);
			view.removeEventListener("resize", measure);
			rail.removeEventListener("pointerdown", down);
			view.removeEventListener("pointermove", move);
			view.removeEventListener("pointerup", up);
			rail.removeEventListener("click", click, true);
		};
	}, []);

	function step(direction: 1 | -1) {
		const rail = railRef.current;
		const card = rail?.querySelector("li");
		if (!rail || !card) return;
		rail.scrollBy({
			left: direction * (card.getBoundingClientRect().width + 24),
			behavior: "smooth",
		});
	}

	return (
		<div className="hm-rail" data-reveal="up">
			<ul className="hm-rail__track" ref={railRef}>
				{projects.map((project) => (
					<li className="hm-rail__item" key={project.id}>
						<Link
							className="hm-project-card hm-photo-card"
							draggable={false}
							href="/proyectos"
						>
							<span className="hm-project-card__media">
								<Image
									alt={project.altText ?? project.title}
									draggable={false}
									fill
									sizes="(min-width: 960px) 34vw, 80vw"
									src={project.imageUrl}
									unoptimized
								/>
							</span>
							<span className="hm-project-card__meta">
								{project.count > 1 ? (
									<span className="hm-project-card__count">
										{project.count} fotos
									</span>
								) : null}
								<strong>{project.title}</strong>
								<span className="hm-card-cta">
									Ver obra
									<ArrowUpRight aria-hidden="true" size={16} />
								</span>
							</span>
						</Link>
					</li>
				))}
			</ul>
			<div className="hm-wrap hm-rail__controls">
				<div aria-hidden="true" className="hm-rail__progress">
					<span style={{ transform: `scaleX(${Math.max(progress, 0.06)})` }} />
				</div>
				<div className="hm-rail__buttons">
					<button
						aria-label="Proyectos anteriores"
						disabled={edges.start}
						onClick={() => step(-1)}
						type="button"
					>
						<ArrowLeft aria-hidden="true" size={20} />
					</button>
					<button
						aria-label="Más proyectos"
						disabled={edges.end}
						onClick={() => step(1)}
						type="button"
					>
						<ArrowRight aria-hidden="true" size={20} />
					</button>
				</div>
			</div>
		</div>
	);
}
