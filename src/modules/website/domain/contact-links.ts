type SocialNetwork = "facebook" | "instagram";

export type ContactLink = {
	href: string | null;
	label: string;
};

function asExternalUrl(value: string) {
	const trimmed = value.trim();
	if (!trimmed) return null;

	const candidate = /^https?:\/\//i.test(trimmed)
		? trimmed
		: /^(?:www\.)?(?:facebook|instagram)\.com\//i.test(trimmed)
			? `https://${trimmed}`
			: null;

	if (!candidate) return null;

	try {
		const url = new URL(candidate);
		return url.protocol === "http:" || url.protocol === "https:" ? url : null;
	} catch {
		return null;
	}
}

function profileName(url: URL) {
	const segments = url.pathname.split("/").filter(Boolean);
	const lastSegment = segments.at(-1);
	if (
		!lastSegment ||
		lastSegment === "profile.php" ||
		lastSegment === "share"
	) {
		return null;
	}

	try {
		return decodeURIComponent(lastSegment).replace(/^@/, "");
	} catch {
		return lastSegment.replace(/^@/, "");
	}
}

export function getSocialContact(
	network: SocialNetwork,
	rawValue: string,
): ContactLink | null {
	const value = rawValue.trim();
	if (!value) return null;

	const url = asExternalUrl(value);
	if (url) {
		const name = profileName(url);
		return {
			href: url.toString(),
			label:
				network === "instagram"
					? name
						? `@${name}`
						: "Instagram"
					: (name?.replace(/[._-]+/g, " ") ?? "Facebook"),
		};
	}

	const handle = value.replace(/^@/, "").trim();
	if (network === "instagram" && /^[a-z0-9._]+$/i.test(handle)) {
		return {
			href: `https://www.instagram.com/${encodeURIComponent(handle)}/`,
			label: `@${handle}`,
		};
	}

	return { href: null, label: value };
}

export function getWhatsAppLink(phone: string) {
	let digits = phone.replace(/\D/g, "");
	if (digits.startsWith("00")) digits = digits.slice(2);
	if (digits.length === 8) digits = `502${digits}`;
	return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

export function getGmailComposeLink(email: string) {
	const recipient = email.trim();
	return recipient
		? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}`
		: null;
}
