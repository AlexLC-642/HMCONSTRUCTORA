"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type GalleryPhoto = { id: string; image: string; alt: string };
type ProjectAlbum = { id: string; title: string; photos: GalleryPhoto[] };

export function PublicProjectGallery({ albums }: { albums: ProjectAlbum[] }) {
	const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
	const [selectedPhoto, setSelectedPhoto] = useState(0);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const album = selectedAlbum === null ? null : albums[selectedAlbum];

	useEffect(() => {
		if (!album) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		closeButtonRef.current?.focus();

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setSelectedAlbum(null);
			if (event.key === "ArrowLeft") {
				setSelectedPhoto(
					(current) =>
						(current - 1 + album.photos.length) % album.photos.length,
				);
			}
			if (event.key === "ArrowRight") {
				setSelectedPhoto((current) => (current + 1) % album.photos.length);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [album]);

	function openAlbum(index: number) {
		setSelectedPhoto(0);
		setSelectedAlbum(index);
	}

	return (
		<>
			<div className="public-gallery">
				{albums.map((item, index) => (
					<button
						aria-label={`Abrir galería de ${item.title}, ${item.photos.length} ${item.photos.length === 1 ? "foto" : "fotos"}`}
						className="public-gallery__item focus-ring"
						key={item.id}
						onClick={() => openAlbum(index)}
						type="button"
					>
						<span className="public-gallery__media">
							<Image
								alt={item.photos[0]?.alt ?? item.title}
								className="public-gallery__image"
								fill
								sizes="(max-width: 720px) 100vw, (max-width: 1040px) 50vw, 33vw"
								src={item.photos[0]?.image ?? "/site/images/proyecto1.jpg"}
							/>
							<span className="public-gallery__shade" />
						</span>
						<span className="public-gallery__caption">
							<strong>{item.title}</strong>
							<span>{item.photos.length === 1 ? "Ver foto" : "Ver álbum"}</span>
						</span>
					</button>
				))}
			</div>

			{album ? (
				<div
					aria-label={`Galería de ${album.title}`}
					aria-modal="true"
					className="public-lightbox"
					onMouseDown={(event) => {
						if (event.currentTarget === event.target) setSelectedAlbum(null);
					}}
					role="dialog"
				>
					<div className="public-lightbox__panel">
						<header className="public-lightbox__header">
							<div>
								<h2>{album.title}</h2>
								<p>
									{selectedPhoto + 1} de {album.photos.length}
								</p>
							</div>
							<button
								aria-label="Cerrar galería"
								className="public-lightbox__close focus-ring"
								onClick={() => setSelectedAlbum(null)}
								ref={closeButtonRef}
								type="button"
							>
								<X aria-hidden="true" size={20} />
							</button>
						</header>

						<div className="public-lightbox__stage">
							<Image
								alt={album.photos[selectedPhoto]?.alt ?? album.title}
								className="public-lightbox__image"
								fill
								priority
								sizes="95vw"
								src={
									album.photos[selectedPhoto]?.image ?? album.photos[0].image
								}
							/>
							{album.photos.length > 1 ? (
								<>
									<button
										aria-label="Foto anterior"
										className="public-lightbox__arrow public-lightbox__arrow--previous focus-ring"
										onClick={() =>
											setSelectedPhoto(
												(current) =>
													(current - 1 + album.photos.length) %
													album.photos.length,
											)
										}
										type="button"
									>
										<ChevronLeft aria-hidden="true" size={24} />
									</button>
									<button
										aria-label="Foto siguiente"
										className="public-lightbox__arrow public-lightbox__arrow--next focus-ring"
										onClick={() =>
											setSelectedPhoto(
												(current) => (current + 1) % album.photos.length,
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
								className="public-lightbox__thumbs"
							>
								{album.photos.map((photo, index) => (
									<button
										aria-label={`Ver foto ${index + 1}`}
										aria-pressed={selectedPhoto === index}
										className="public-lightbox__thumb focus-ring"
										key={photo.id}
										onClick={() => setSelectedPhoto(index)}
										type="button"
									>
										<Image alt="" fill sizes="88px" src={photo.image} />
									</button>
								))}
							</nav>
						) : null}
					</div>
				</div>
			) : null}
		</>
	);
}
