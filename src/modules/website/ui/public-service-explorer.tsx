"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { serviceCardPhoto } from "../domain/service-card-photos";

type Service = {
	id: string;
	title: string;
	description: string;
	position: number;
};

/**
 * Scroll-driven service story: every service is fully readable in the list,
 * and the sticky photo beside it follows whichever service is at the centre
 * of the screen. No hover or click is needed to see anything; on phones each
 * service carries its own photo inline instead of the sticky stage.
 */
export function PublicServiceExplorer({ services }: { services: Service[] }) {
	const [activeId, setActiveId] = useState<string | undefined>(services[0]?.id);
	const listRef = useRef<HTMLOListElement>(null);

	useEffect(() => {
		const list = listRef.current;
		const view = list?.ownerDocument.defaultView;
		if (!list || !view) return;
		const observer = new view.IntersectionObserver(
			(entries) => {
				for (const entry of entries)
					if (entry.isIntersecting)
						setActiveId((entry.target as HTMLElement).dataset.id);
			},
			{ rootMargin: "-45% 0px -45% 0px" },
		);
		for (const item of list.querySelectorAll("[data-id]"))
			observer.observe(item);
		return () => observer.disconnect();
	}, []);

	if (!services.length) return null;
	const activeIndex = Math.max(
		services.findIndex((service) => service.id === activeId),
		0,
	);
	const active = services[activeIndex];

	return (
		<div className="hm-story">
			<ol className="hm-story__list" ref={listRef}>
				{services.map((service) => (
					<li
						className="hm-story__item"
						data-active={service.id === active.id}
						data-id={service.id}
						key={service.id}
					>
						<div className="hm-story__photo">
							<Image
								alt=""
								fill
								sizes="92vw"
								src={serviceCardPhoto(service.position)}
							/>
						</div>
						<h3>{service.title}</h3>
						<p>{service.description}</p>
						<Link href="/contacto#formulario">
							Consultar este servicio
							<ArrowUpRight aria-hidden="true" size={17} />
						</Link>
					</li>
				))}
			</ol>
			<div aria-hidden="true" className="hm-story__stage">
				<div className="hm-story__frames">
					{services.map((service) => (
						<div
							className="hm-story__frame"
							data-current={service.id === active.id}
							key={service.id}
						>
							<Image
								alt=""
								fill
								sizes="(min-width: 960px) 36vw, 1px"
								src={serviceCardPhoto(service.position)}
							/>
						</div>
					))}
					<div className="hm-story__caption">
						<span>
							{String(activeIndex + 1).padStart(2, "0")}
							<small> / {String(services.length).padStart(2, "0")}</small>
						</span>
						<strong>{active.title}</strong>
					</div>
				</div>
				<div className="hm-story__meter">
					<span
						style={{
							transform: `scaleY(${(activeIndex + 1) / services.length})`,
						}}
					/>
				</div>
			</div>
		</div>
	);
}
