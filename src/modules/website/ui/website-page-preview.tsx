"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PublicWebsiteContent } from "../domain/public-content";
import { PublicContactContent } from "./public-contact-content";
import { PublicHomeContent } from "./public-home-content";
import { PublicPreviewPath } from "./public-preview-path";
import { PublicProjectsContent } from "./public-projects-content";
import { PublicServicesContent } from "./public-services-content";
import { PublicSiteFrame } from "./public-site-frame";

type Page = "inicio" | "servicios" | "proyectos" | "contacto";
export function WebsitePagePreview({
	content,
	section,
}: {
	content: PublicWebsiteContent;
	section: string;
}) {
	const frame = useRef<HTMLIFrameElement>(null);
	const container = useRef<HTMLDivElement>(null);
	const [mount, setMount] = useState<HTMLElement | null>(null);
	const [width, setWidth] = useState(400);
	const [mobile, setMobile] = useState(false);
	const [page, setPage] = useState<Page>("inicio");
	useEffect(() => {
		setPage(
			section === "contacto"
				? "contacto"
				: section === "paginas"
					? "servicios"
					: "inicio",
		);
	}, [section]);
	useEffect(() => {
		if (!container.current) return;
		const observer = new ResizeObserver(([entry]) =>
			setWidth(entry.contentRect.width),
		);
		observer.observe(container.current);
		return () => observer.disconnect();
	}, []);
	const viewport = mobile ? 390 : 1280;
	const scale = Math.min(width / viewport, 1);
	function initialize() {
		const doc = frame.current?.contentDocument;
		if (!doc) return;
		for (const style of document.querySelectorAll(
			'link[rel="stylesheet"], style',
		))
			doc.head.appendChild(style.cloneNode(true));
		const reset = doc.createElement("style");
		reset.textContent =
			"html,body{margin:0;padding:0;background:#f5f5f5}body{min-width:0}.public-site{min-height:100vh}";
		doc.head.appendChild(reset);
		setMount(doc.body);
	}
	const views = {
		inicio: PublicHomeContent,
		servicios: PublicServicesContent,
		proyectos: PublicProjectsContent,
		contacto: PublicContactContent,
	};
	const View = views[page];
	return (
		<aside className="website-live-preview website-page-preview">
			<div className="website-live-preview__bar">
				<strong>Vista previa real</strong>
			</div>
			<div className="website-preview-controls">
				<label>
					Página{" "}
					<select
						value={page}
						onChange={(event) => setPage(event.target.value as Page)}
					>
						<option value="inicio">Inicio</option>
						<option value="servicios">Servicios</option>
						<option value="proyectos">Construcciones</option>
						<option value="contacto">Contacto</option>
					</select>
				</label>
				<label>
					Dispositivo{" "}
					<select
						value={mobile ? "mobile" : "desktop"}
						onChange={(event) => setMobile(event.target.value === "mobile")}
					>
						<option value="desktop">Computadora</option>
						<option value="mobile">Teléfono</option>
					</select>
				</label>
			</div>
			<p className="website-preview-note">
				Desplázate dentro de la vista para revisar la página. Los enlaces y
				formularios están desactivados aquí.
			</p>
			<div ref={container} style={{ height: 760 * scale, overflow: "hidden" }}>
				<iframe
					ref={frame}
					title="Vista previa del sitio web"
					sandbox="allow-same-origin"
					srcDoc={
						'<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>'
					}
					onLoad={initialize}
					style={{
						width: viewport,
						height: 760,
						border: 0,
						transform: `scale(${scale})`,
						transformOrigin: "top left",
					}}
				/>
			</div>
			{mount &&
				createPortal(
					<div
						className="website-preview-interaction-guard"
						onClickCapture={(event) => {
							if ((event.target as Element).closest("a, button")) {
								event.preventDefault();
								event.stopPropagation();
							}
						}}
						onSubmitCapture={(event) => event.preventDefault()}
					>
						<PublicPreviewPath value={page === "inicio" ? "/" : `/${page}`}>
							<PublicSiteFrame settings={content.settings}>
								<View {...content} />
							</PublicSiteFrame>
						</PublicPreviewPath>
					</div>,
					mount,
				)}
		</aside>
	);
}
