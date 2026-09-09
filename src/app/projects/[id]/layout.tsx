import { requireProjectAccess } from "@/modules/auth/application/authorization";

export default async function ProjectWorkspaceLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ id: string }>;
}>) {
	const { id } = await params;
	await requireProjectAccess(id);
	return children;
}
