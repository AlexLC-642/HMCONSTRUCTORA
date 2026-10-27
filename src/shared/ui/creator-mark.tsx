/**
 * Sello del autor del sistema: monograma "AL" (la pierna derecha de la A se
 * prolonga en el trazo de la L) y, opcionalmente, el nombre. Usa currentColor
 * para adaptarse al fondo donde se coloque y se mantiene discreto a propósito.
 */
export const CREATOR_NAME = "Alex Lem";

export function CreatorMonogram({
	className,
	size = 18,
}: {
	className?: string;
	size?: number;
}) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			height={size}
			viewBox="0 0 24 24"
			width={size}
		>
			<rect
				height="21"
				opacity="0.35"
				rx="6"
				stroke="currentColor"
				strokeWidth="1.2"
				width="21"
				x="1.5"
				y="1.5"
			/>
			{/* A: dos trazos que se unen en la cima, con barra corta. */}
			<path
				d="M5.5 17.5 10 6.5l3.1 7.6"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.8"
			/>
			<path
				d="M7.4 13.2h4.2"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="1.8"
			/>
			{/* L: vertical y base, que cierra el monograma. */}
			<path
				d="M15.2 6.5v11h3.6"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.8"
			/>
		</svg>
	);
}

export function CreatorSignature({
	className = "",
	prefix,
}: {
	className?: string;
	/** Texto antes del nombre, p. ej. "Desarrollado por". */
	prefix?: string;
}) {
	return (
		<span
			className={`creator-sign ${className}`}
			title={`Sistema diseñado y desarrollado por ${CREATOR_NAME}`}
		>
			<CreatorMonogram className="creator-sign__mark" />
			<span className="creator-sign__name">
				{prefix ? `${prefix} ` : null}
				{CREATOR_NAME}
			</span>
		</span>
	);
}
