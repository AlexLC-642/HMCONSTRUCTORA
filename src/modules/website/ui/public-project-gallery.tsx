"use client";

import {
	ArrowUpRight,
	ChevronLeft,
	ChevronRight,
	Images,
	Search,
	X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type GalleryPhoto = { id: string; image: string; alt: string };
type ProjectAlbum = { id: string; title: string; photos: GalleryPhoto[] };

const normalize = (value: string) =>
	value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function PublicProjectGallery({ albums }: { albums: ProjectAlbum[] }) {
	const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
	const [selectedPhoto, setSelectedPhoto] = useState(0);
	const [query, setQuery] = useState("");
	const dialogRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const normalizedQuery = normalize(query);
	const filteredAlbums = albums
		.map((item, index) => ({ item, index }))
		.filter(({ item }) => normalize(item.title).includes(normalizedQuery));
	const album = selectedAlbum === null ? null : albums[selectedAlbum];
	const photoCount = albums.reduce(
		(total, item) => total + item.photos.length,
		0,
	);

	useEffect(() => {
		if (!album) return;
		const doc = closeButtonRef.current?.ownerDocument ?? document;
		const view = doc.defaultView ?? window;
		const previousOverflow = doc.body.style.overflow;
		doc.body.style.overflow = "hidden";
		closeButtonRef.current?.focus();

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setSelectedAlbum(null);
			if (event.key === "Tab" && dialogRef.current) {
				const controls = Array.from(
					dialogRef.current.querySelectorAll<HTMLButtonElement>(
						"button:not([disabled])",
					),
				);
				const first = controls[0];
				const last = controls.at(-1);
				if (event.shiftKey && doc.activeElement === first) {
					event.preventDefault();
					last?.focus();
				} else if (!event.shiftKey && doc.activeElement === last) {
					event.preventDefault();
					first?.focus();
				}
			}
			if (event.key === "ArrowLeft")
				setSelectedPhoto(
					(current) =>
						(current - 1 + album.photos.length) % album.photos.length,
				);
			if (event.key === "ArrowRight")
				setSelectedPhoto((current) => (current + 1) % album.photos.length);
		};
		view.addEventListener("keydown", onKeyDown);
		return () => {
			doc.body.style.overflow = previousOverflow;
			view.removeEventListener("keydown", onKeyDown);
			triggerRef.current?.focus();
		};
	}, [album]);

	const current = album?.photos[selectedPhoto] ?? album?.photos[0];

	return (
		<>
			<div className="hm-gallery-bar" data-reveal="up">
				<p role="status">
					<strong>{filteredAlbums.length}</strong>{" "}
					{filteredAlbums.length === 1 ? "obra" : "obras"}
					<span aria-hidden="true"> · </span>
					{photoCount} fotografías reales
				</p>
				<label className="hm-search">
					<span className="hm-visually-hidden">Buscar una obra</span>
					<Search aria-hidden="true" size={18} />
					<input
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Buscar una obra…"
						type="search"
						value={query}
					/>
				</label>
			</div>
			{filteredAlbums.length === 0 ? (
				<p className="hm-empty">
					No hay obras con ese nombre. Prueba otra búsqueda.
				</p>
			) : null}
			<div className="hm-mosaic">
				{filteredAlbums.map(({ item, index }, position) => (
					<button
						aria-label={`Abrir galería de ${item.title}, ${item.photos.length} ${item.photos.length === 1 ? "foto" : "fotos"}`}
						className="hm-tile hm-photo-card"
						data-reveal="up"
						key={item.id}
						onClick={(event) => {
							triggerRef.current = event.currentTarget;
							setSelectedPhoto(0);
							setSelectedAlbum(index);
						}}
						style={{ "--d": position % 3 } as React.CSSProperties}
						type="button"
					>
						<Image
							alt=""
							className="hm-tile__image"
							fill
							sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 30vw"
							src={item.photos[0]?.image ?? "/site/images/proyecto1.jpg"}
							unoptimized
						/>
						<span className="hm-tile__shade" />
						{item.photos.length > 1 ? (
							<span className="hm-tile__count">
								<Images aria-hidden="true" size={14} />
								{item.photos.length} fotos
							</span>
						) : null}
						<span className="hm-tile__meta">
							<strong>{item.title}</strong>
							<span className="hm-card-cta">
								{item.photos.length === 1
									? "Ver fotografía"
									: "Ver álbum completo"}
								<ArrowUpRight aria-hidden="true" size={16} />
							</span>
						</span>
					</button>
				))}
			</div>

			{album && current ? (
				<div
					aria-label={`Galería de ${album.title}`}
					aria-modal="true"
					className="hm-lightbox"
					onMouseDown={(event) => {
						if (event.currentTarget === event.target) setSelectedAlbum(null);
					}}
					ref={dialogRef}
					role="dialog"
				>
					<header className="hm-lightbox__header">
						<div>
							<h2>{album.title}</h2>
							<p>
								{selectedPhoto + 1} de {album.photos.length}
							</p>
						</div>
						<button
							aria-label="Cerrar galería"
							className="hm-round-btn"
							onClick={() => setSelectedAlbum(null)}
							ref={closeButtonRef}
							type="button"
						>
							<X aria-hidden="true" size={20} />
						</button>
					</header>

					<div className="hm-lightbox__stage">
						<Image
							alt={current.alt}
							className="hm-lightbox__image"
							fill
							key={current.id}
							priority
							sizes="95vw"
							src={current.image}
							unoptimized
						/>
						{album.photos.length > 1 ? (
							<>
								<button
									aria-label="Foto anterior"
									className="hm-round-btn hm-lightbox__arrow hm-lightbox__arrow--prev"
									onClick={() =>
										setSelectedPhoto(
											(value) =>
												(value - 1 + album.photos.length) % album.photos.length,
										)
									}
									type="button"
								>
									<ChevronLeft aria-hidden="true" size={24} />
								</button>
								<button
									aria-label="Foto siguiente"
									className="hm-round-btn hm-lightbox__arrow hm-lightbox__arrow--next"
									onClick={() =>
										setSelectedPhoto(
											(value) => (value + 1) % album.photos.length,
										)
									}
									type="button"
								>
									<ChevronRight aria-hidden="true" size={24} />
								</button>
							</>
						) : null}
					</div>

					{album.photos.length > 1 ? (
						<nav
							aria-label="Fotos del proyecto"
							className="hm-lightbox__thumbs"
						>
							{album.photos.map((photo, index) => (
								<button
									aria-label={`Ver foto ${index + 1}`}
									aria-pressed={selectedPhoto === index}
									key={photo.id}
									onClick={() => setSelectedPhoto(index)}
									type="button"
								>
									<Image
										alt=""
										fill
										sizes="96px"
										src={photo.image}
										unoptimized
									/>
								</button>
							))}
						</nav>
					) : null}
				</div>
			) : null}
		</>
	);
}
