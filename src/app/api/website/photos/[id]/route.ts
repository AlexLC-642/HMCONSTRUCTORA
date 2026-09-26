import { getCurrentUser } from "@/modules/auth/application/current-user";
import { prisma } from "@/shared/lib/prisma";
import { hasPermission } from "@/shared/permissions/has-permission";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const photo = await prisma.websiteProjectPhoto.findUnique({
		where: { id },
		select: { active: true, imageData: true, imageMimeType: true },
	});
	if (!photo?.imageData || !photo.imageMimeType)
		return new Response(null, { status: 404 });
	if (!photo.active) {
		const user = await getCurrentUser();
		if (!user || !hasPermission(user.permissions, "sitio.editar"))
			return new Response(null, { status: 404 });
	}
	return new Response(new Uint8Array(photo.imageData), {
		headers: {
			"Content-Type": photo.imageMimeType,
			"Cache-Control": "private, no-store",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
