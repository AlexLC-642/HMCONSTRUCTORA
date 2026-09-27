/**
 * Slow ticker of the real service names. The list is rendered twice so the
 * CSS loop is seamless; it is hidden from assistive tech because the same
 * services are listed properly further down the page.
 */
export function PublicMarquee({ items }: { items: string[] }) {
	if (!items.length) return null;
	return (
		<div aria-hidden="true" className="hm-marquee">
			{[0, 1].map((copy) => (
				<ul className="hm-marquee__track" key={copy}>
					{items.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			))}
		</div>
	);
}
