import { ArrowUpRight, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { hdImage } from "@/modules/website/domain/hd-images";

/** Closing call to action: a lit photographic band instead of a flat box. */
export function PublicCtaBand({
	heading,
	text,
	image = "/site/images/hero-fachada.jpg",
	whatsAppHref,
}: {
	heading: string;
	text: string;
	image?: string;
	whatsAppHref?: string | null;
}) {
	return (
		<section className="hm-cta">
			<div aria-hidden="true" className="hm-cta__media" data-parallax="0.07">
				<Image alt="" fill quality={90} sizes="100vw" src={hdImage(image)} />
			</div>
			<div aria-hidden="true" className="hm-cta__veil" />
			<div aria-hidden="true" className="hm-worklight" />
			<div className="hm-cta__inner">
				<h2 data-reveal="up">{heading}</h2>
				<p data-reveal="up" style={{ "--d": 1 } as React.CSSProperties}>
					{text}
				</p>
				<div
					className="hm-cta__actions"
					data-reveal="up"
					style={{ "--d": 2 } as React.CSSProperties}
				>
					<Link
						className="hm-btn hm-btn--primary hm-btn--lg"
						href="/contacto#formulario"
					>
						Solicitar cotización
						<ArrowUpRight aria-hidden="true" size={20} />
					</Link>
					{whatsAppHref ? (
						<a
							className="hm-btn hm-btn--ghost hm-btn--lg"
							href={whatsAppHref}
							rel="noreferrer"
							target="_blank"
						>
							<MessageCircle aria-hidden="true" size={19} />
							Escríbenos por WhatsApp
						</a>
					) : null}
				</div>
			</div>
		</section>
	);
}
