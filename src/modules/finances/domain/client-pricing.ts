// Client price of each budget renglón. A renglón's `total` is its direct cost;
// the client pays the budget grand total, which also carries the site manager,
// contingency, administration, profit, VAT and financing. Each renglón gets
// that grand total in proportion to its cost, in exact integer cents, and the
// leftover cents go to the largest remainders so the prices always add up to
// the grand total exactly.

function toCents(amount: string) {
	const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(amount.trim());
	if (!match) throw new Error(`Monto inválido: ${amount}`);
	const cents =
		BigInt(match[2]) * BigInt(100) + BigInt((match[3] ?? "").padEnd(2, "0"));
	return match[1] ? -cents : cents;
}

function fromCents(cents: bigint) {
	const sign = cents < 0 ? "-" : "";
	const absolute = cents < 0 ? -cents : cents;
	const units = absolute / BigInt(100);
	const fraction = (absolute % BigInt(100)).toString().padStart(2, "0");
	return `${sign}${units}.${fraction}`;
}

export function allocateClientPrices(
	sections: { id: string; total: string }[],
	grandTotal: string,
): Map<string, string> {
	const costs = sections.map((section) => toCents(section.total));
	const costTotal = costs.reduce((sum, cost) => sum + cost, BigInt(0));
	const target = toCents(grandTotal);
	const prices = new Map<string, string>();

	if (costTotal <= 0 || target <= 0) {
		for (const section of sections) prices.set(section.id, "0.00");
		return prices;
	}

	const shares = costs.map((cost, index) => ({
		index,
		base: (cost * target) / costTotal,
		remainder: (cost * target) % costTotal,
	}));
	let leftover =
		target - shares.reduce((sum, share) => sum + share.base, BigInt(0));
	const byRemainder = [...shares].sort((left, right) =>
		right.remainder === left.remainder
			? left.index - right.index
			: right.remainder > left.remainder
				? 1
				: -1,
	);
	for (const share of byRemainder) {
		if (leftover <= 0) break;
		share.base += BigInt(1);
		leftover -= BigInt(1);
	}

	for (const share of shares) {
		prices.set(sections[share.index].id, fromCents(share.base));
	}
	return prices;
}
