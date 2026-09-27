import { ArrowDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { hdImage } from "@/modules/website/domain/hd-images";

type PublicPageHeroProps = {
	eyebrow: string;
	title: string;
	lede?: string;
	image: string;
	imagePosition?: string;
	next: { href: string; label: string };
	children?: React.ReactNode;
};

/** Photographic opening shared by Servicios, Construcciones and Contacto. */
export function PublicPageHero({
	eyebrow,
	title,
	lede,
	image,
	imagePosition = "center",
	next,
	children,
}: PublicPageHeroProps) {
	return (
		<section className="hm-page-hero">
			<div
				aria-hidden="true"
				className="hm-page-hero__media"
				data-parallax="0.08"
			>
				<Image
					alt=""
					fill
					priority
					quality={90}
					sizes="100vw"
					src={hdImage(image)}
					style={{ objectPosition: imagePosition }}
					unoptimized={image.startsWith("/api/")}
				/>
			</div>
			<div aria-hidden="true" className="hm-veil" />
			<div aria-hidden="true" className="hm-worklight" />
			<div className="hm-page-hero__inner">
				<nav
					aria-label="Ruta"
					className="hm-crumbs hm-rise"
					style={{ "--d": 0 } as React.CSSProperties}
				>
					<Link href="/">Inicio</Link>
					<span aria-hidden="true">/</span>
					<span aria-current="page">{eyebrow}</span>
				</nav>
				<h1 className="hm-rise" style={{ "--d": 1 } as React.CSSProperties}>
					{title}
				</h1>
				{lede ? (
					<p
						className="hm-page-hero__lede hm-rise"
						style={{ "--d": 2 } as React.CSSProperties}
					>
						{lede}
					</p>
				) : null}
				{children}
			</div>
			<a className="hm-scroll-cue" href={next.href}>
				<span>{next.label}</span>
				<ArrowDown aria-hidden="true" size={16} />
			</a>
		</section>
	);
}
