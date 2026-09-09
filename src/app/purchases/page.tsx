import { requirePermission } from "@/modules/auth/application/authorization";
import { getPurchaseWorkspace } from "@/modules/purchases/application/queries";
import { PurchasesWorkspace } from "@/modules/purchases/ui/purchases-workspace";

function first(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export default async function PurchasesPage({
	searchParams,
}: {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
	const user = await requirePermission("compras.ver");
	const params = searchParams ? await searchParams : {};
	const data = await getPurchaseWorkspace(user, {
		query: first(params.q),
		status: first(params.status),
		supplierId: first(params.supplierId),
	});
	const rawView = first(params.view);
	const initialView =
		rawView === "suppliers" || rawView === "requisitions"
			? rawView
			: data.orders.length === 0 && data.readyRequisitions.length > 0
				? "requisitions"
				: "orders";

	return (
		<main className="mx-auto max-w-[1440px] px-1 pb-10 md:px-2">
			<PurchasesWorkspace
				canManage={user.permissions.includes("compras.gestionar")}
				canRegisterFinance={user.permissions.includes("finanzas.registrar")}
				data={data}
				initialRequisitionId={first(params.requisitionId) ?? ""}
				initialView={initialView}
				today={new Date().toISOString().slice(0, 10)}
			/>
		</main>
	);
}
