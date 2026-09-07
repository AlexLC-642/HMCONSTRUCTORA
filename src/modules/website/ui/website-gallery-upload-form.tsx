"use client";

import { ImagePlus, Images, Plus, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { addWebsitePhotoFromUploadAction } from "../application/actions";

function UploadButton() {
	const { pending } = useFormStatus();
	return (
		<button
			className="focus-ring website-gallery-submit"
			disabled={pending}
			type="submit"
		>
			<UploadCloud aria-hidden="true" size={18} />
			{pending ? "Publicando…" : "Publicar en el álbum"}
		</button>
	);
}

export function WebsiteGalleryUploadForm({ albums }: { albums: string[] }) {
	const [mode, setMode] = useState<"existing" | "new">(
		albums.length ? "existing" : "new",
	);
	const [selectedAlbum, setSelectedAlbum] = useState(albums[0] ?? "");
	const [newAlbum, setNewAlbum] = useState("");
	const [files, setFiles] = useState<File[]>([]);
	const previews = useMemo(
		() => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
		[files],
	);

	useEffect(
		() => () => {
			previews.forEach((preview) => {
				URL.revokeObjectURL(preview.url);
			});
		},
		[previews],
	);

	const title = mode === "existing" ? selectedAlbum : newAlbum;
	return (
		<form
			action={addWebsitePhotoFromUploadAction}
			className="website-gallery-uploader"
			encType="multipart/form-data"
		>
			<header>
				<span>
					<ImagePlus aria-hidden="true" size={19} />
				</span>
				<div>
					<h2>Agregar fotos</h2>
					<p>Elige el álbum donde aparecerán en la galería pública.</p>
				</div>
			</header>

			<fieldset className="website-gallery-mode">
				<legend className="sr-only">Destino de las fotos</legend>
				<button
					aria-pressed={mode === "existing"}
					disabled={albums.length === 0}
					onClick={() => setMode("existing")}
					type="button"
				>
					<Images size={16} /> Álbum existente
				</button>
				<button
					aria-pressed={mode === "new"}
					onClick={() => setMode("new")}
					type="button"
				>
					<Plus size={16} /> Álbum nuevo
				</button>
			</fieldset>

			<div className="website-gallery-field">
				<label htmlFor="website-gallery-album">
					{mode === "existing" ? "Seleccionar álbum" : "Nombre del álbum nuevo"}
				</label>
				{mode === "existing" ? (
					<select
						id="website-gallery-album"
						value={selectedAlbum}
						onChange={(event) => setSelectedAlbum(event.target.value)}
					>
						{albums.map((album) => (
							<option key={album} value={album}>
								{album}
							</option>
						))}
					</select>
				) : (
					<input
						id="website-gallery-album"
						value={newAlbum}
						onChange={(event) => setNewAlbum(event.target.value)}
						placeholder="Ej. Remodelación de cocina"
						required
					/>
				)}
			</div>
			<input name="title" type="hidden" value={title} />

			<label className="website-gallery-field">
				<span>Descripción de las imágenes</span>
				<input
					name="altText"
					placeholder="Ej. Cocina terminada con iluminación nueva"
				/>
			</label>

			<label className="website-gallery-dropzone">
				<UploadCloud aria-hidden="true" size={28} />
				<strong>
					{files.length
						? `${files.length} archivo${files.length === 1 ? "" : "s"} seleccionado${files.length === 1 ? "" : "s"}`
						: "Seleccionar imágenes"}
				</strong>
				<small>JPG, PNG o WEBP · puedes elegir varias</small>
				<input
					accept="image/png,image/jpeg,image/webp"
					multiple
					name="images"
					onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
					required
					type="file"
				/>
			</label>

			{previews.length ? (
				<div className="website-gallery-previews">
					{previews.slice(0, 4).map(({ file, url }) => (
						<figure key={`${file.name}-${file.lastModified}`}>
							{/* biome-ignore lint/performance/noImgElement: temporary local preview generated with URL.createObjectURL */}
							<img alt="" src={url} />
							<figcaption>{file.name}</figcaption>
						</figure>
					))}
					{previews.length > 4 ? <span>+{previews.length - 4}</span> : null}
				</div>
			) : null}

			<div className="website-gallery-destination">
				<Images size={17} />
				<span>
					Se publicará en <strong>{title || "un álbum por nombrar"}</strong>
				</span>
			</div>
			<UploadButton />
		</form>
	);
}
