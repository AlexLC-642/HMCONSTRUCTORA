import { headers } from "next/headers";

/** Best-effort client IP for a Server Action (no direct Request object available). */
export async function requestIp() {
	const headerList = await headers();
	const forwardedFor = headerList.get("x-forwarded-for");
	if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? null;
	return headerList.get("x-real-ip");
}
