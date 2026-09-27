"use client";

import { useEffect, useRef } from "react";
import { publicFontVariables } from "./public-fonts";
import { usePublicPathname } from "./public-preview-path";

/**
 * Motion layer for the public site. Content is always rendered visible; motion
 * only switches on (data-motion="on") once this runs and the visitor has not
 * asked for reduced motion, so no-JS and reduced-motion visitors see everything.
 * Works inside the CMS preview iframe by using the root's own window.
 */
export function PublicExperience({ children }: { children: React.ReactNode }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const pathname = usePublicPathname();

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-arm observers for each route's new content.
	useEffect(() => {
		const rootNode = rootRef.current;
		const viewNode = rootNode?.ownerDocument.defaultView;
		if (!rootNode || !viewNode) return;
		const root = rootNode;
		const view = viewNode;
		const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
		const finePointer = view.matchMedia("(pointer: fine)");
		let frame = 0;
		const timers = new Set<number>();
		// Reveal, then drop the entrance transition so hover states respond
		// instantly instead of inheriting the staggered reveal timing.
		function show(element: HTMLElement) {
			element.dataset.shown = "true";
			const timer = view.setTimeout(() => {
				element.dataset.settled = "true";
				timers.delete(timer);
			}, 1800);
			timers.add(timer);
		}

		const reveal = new view.IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					show(entry.target as HTMLElement);
					reveal.unobserve(entry.target);
				}
			},
			{ rootMargin: "0px 0px -4% 0px", threshold: 0 },
		);
		function watch(scope: ParentNode) {
			for (const element of scope.querySelectorAll<HTMLElement>(
				"[data-reveal]:not([data-shown])",
			))
				reveal.observe(element);
		}
		const mutations = new view.MutationObserver((records) => {
			for (const record of records)
				for (const node of record.addedNodes)
					if (node instanceof view.HTMLElement) {
						if (node.matches("[data-reveal]:not([data-shown])"))
							reveal.observe(node);
						watch(node);
					}
		});

		function update() {
			frame = 0;
			if (!root || !view) return;
			const y = view.scrollY;
			const max =
				root.ownerDocument.documentElement.scrollHeight - view.innerHeight;
			// Safety net for fast jumps (anchors, restored scroll): anything whose
			// top has already entered the viewport is revealed immediately.
			for (const element of root.querySelectorAll<HTMLElement>(
				"[data-reveal]:not([data-shown])",
			))
				if (element.getBoundingClientRect().top < view.innerHeight) {
					show(element);
					reveal.unobserve(element);
				}
			root.style.setProperty(
				"--hm-progress",
				String(max > 0 ? Math.min(y / max, 1) : 0),
			);
			if (reduced.matches) return;
			const middle = view.innerHeight / 2;
			for (const element of root.querySelectorAll<HTMLElement>(
				"[data-parallax]",
			)) {
				const box = element.getBoundingClientRect();
				if (box.bottom < -200 || box.top > view.innerHeight + 200) continue;
				const speed = Number(element.dataset.parallax) || 0.1;
				const shift = (box.top + box.height / 2 - middle) * -speed;
				element.style.setProperty("--hm-shift", `${shift.toFixed(1)}px`);
			}
		}
		function schedule() {
			if (!frame) frame = view.requestAnimationFrame(update);
		}
		function pointer(event: PointerEvent) {
			if (!finePointer.matches || reduced.matches) return;
			const target = (event.target as Element | null)?.closest<HTMLElement>(
				"[data-glow]",
			);
			if (!target) return;
			const box = target.getBoundingClientRect();
			target.style.setProperty("--mx", `${event.clientX - box.left}px`);
			target.style.setProperty("--my", `${event.clientY - box.top}px`);
		}
		function applyPreference() {
			root.dataset.motion = reduced.matches ? "off" : "on";
			if (reduced.matches)
				for (const element of root.querySelectorAll<HTMLElement>(
					"[data-reveal]",
				)) {
					element.dataset.shown = "true";
					element.dataset.settled = "true";
				}
			schedule();
		}

		applyPreference();
		watch(root);
		mutations.observe(root, { childList: true, subtree: true });
		update();
		view.addEventListener("scroll", schedule, { passive: true });
		view.addEventListener("resize", schedule, { passive: true });
		root.addEventListener("pointermove", pointer, { passive: true });
		reduced.addEventListener("change", applyPreference);
		return () => {
			reveal.disconnect();
			mutations.disconnect();
			view.removeEventListener("scroll", schedule);
			view.removeEventListener("resize", schedule);
			root.removeEventListener("pointermove", pointer);
			reduced.removeEventListener("change", applyPreference);
			view.cancelAnimationFrame(frame);
			for (const timer of timers) view.clearTimeout(timer);
		};
	}, [pathname]);

	return (
		<div
			ref={rootRef}
			className={`public-site hm-experience ${publicFontVariables}`}
		>
			{children}
		</div>
	);
}
