export function InlineScript({ html }: { html: string }) {
	return (
		<script
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Next.js recommends this pre-paint script for persisted UI state; its value is generated internally, not from user input.
			dangerouslySetInnerHTML={{ __html: html }}
			suppressHydrationWarning
			type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
		/>
	);
}
