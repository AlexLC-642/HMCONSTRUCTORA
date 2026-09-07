import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/application/current-user";
import { getSystemNotifications } from "@/modules/notifications/application/queries";

export async function GET() {
	const user = await getCurrentUser();
	if (!user)
		return NextResponse.json({ message: "No autorizado" }, { status: 401 });
	return NextResponse.json({
		notifications: await getSystemNotifications(user),
	});
}
