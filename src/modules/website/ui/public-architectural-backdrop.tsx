import Image from "next/image";

type PublicArchitecturalBackdropProps = {
	src: string;
	priority?: boolean;
	position?: string;
};

export function PublicArchitecturalBackdrop({
	src,
	priority = false,
	position = "center",
}: PublicArchitecturalBackdropProps) {
	return (
		<div aria-hidden="true" className="public-architecture">
			<Image
				alt=""
				className="public-architecture__image"
				fill
				priority={priority}
				sizes="100vw"
				src={src}
				style={{ objectPosition: position }}
			/>
			<div className="public-architecture__veil" />
			<div className="public-architecture__grid" />
			<div className="public-architecture__monogram">
				<span className="public-architecture__letter-h" />
				<span className="public-architecture__letter-m" />
			</div>
			<div className="public-architecture__datum" />
		</div>
	);
}
