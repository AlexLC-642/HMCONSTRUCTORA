import { Search } from "lucide-react";
import { requirePermission } from "@/modules/auth/application/authorization";
import {
	getInventoryCatalog,
	getMovementHistory,
	getStockDashboard,
} from "@/modules/inventory/application/queries";
import { InventoryCatalog } from "@/modules/inventory/ui/inventory-catalog";
import { InventoryMovements } from "@/modules/inventory/ui/inventory-movements";
import { InventoryStockDashboard } from "@/modules/inventory/ui/inventory-stock-dashboard";
import { inventoryInputClass } from "@/modules/inventory/ui/inventory-ui";
import { InventoryWorkspaceHeader } from "@/modules/inventory/ui/inventory-workspace-header";
import { AutoFilterForm } from "@/shared/ui/auto-filter-form";

function first(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function filterValue(value: string | string[] | undefined) {
	return first(value) ?? "";
}

export default async function InventoryPage({
	searchParams,
}: {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
	const user = await requirePermission("inventario.mover");
	const params = searchParams ? await searchParams : {};
	const rawView = first(params.view);
	const view =
		rawView === "movement" || rawView === "catalog" ? rawView : "stock";

	if (view === "catalog") {
		const data = await getInventoryCatalog({
			query: first(params.q),
			status: first(params.status),
			unit: first(params.unit),
			resourceType: first(params.resourceType),
			page: Number(first(params.page) ?? "1"),
			pageSize: Number(first(params.pageSize) ?? "25"),
		});
		return (
			<main className="mx-auto max-w-[1520px] space-y-5 px-3 pb-10 md:px-6">
				<InventoryWorkspaceHeader view="catalog" />
				<InventoryCatalog data={data} params={params} />
			</main>
		);
	}

	if (view === "movement") {
		const data = await getMovementHistory(
			{
				query: first(params.q),
				type: first(params.type),
				warehouseId: first(params.warehouseId),
				projectId: first(params.projectId),
				review: first(params.review),
				page: Number(first(params.page) ?? "1"),
				pageSize: Number(first(params.pageSize) ?? "25"),
			},
			user,
		);
		return (
			<main className="mx-auto max-w-[1520px] space-y-5 px-3 pb-10 md:px-6">
				<InventoryWorkspaceHeader view="movement" />
				<InventoryMovements
					canReviewWaste={user.permissions.includes(
						"inventario.desperdicio.revisar",
					)}
					data={data}
					params={params}
				/>
			</main>
		);
	}

	const data = await getStockDashboard({
		query: first(params.q),
		materialId: first(params.materialId),
		warehouseId: first(params.warehouseId),
		status: first(params.status),
	});

	return (
		<main className="mx-auto max-w-[1520px] space-y-5 px-3 pb-10 md:px-6">
			<InventoryWorkspaceHeader view="stock" />
			<InventoryStockDashboard
				activeStatus={filterValue(params.status)}
				activeWarehouse={filterValue(params.warehouseId)}
				data={data}
				toolbar={
					<AutoFilterForm
						action="/inventory"
						className="inventory-stock-filters"
						key="stock-filters"
					>
						<input name="view" type="hidden" value="stock" />
						<label className="relative">
							<span className="sr-only">Buscar material o código</span>
							<Search
								aria-hidden="true"
								className="absolute left-3.5 top-3.5 text-[#6d7974]"
								size={18}
							/>
							<input
								className={`${inventoryInputClass} pl-10`}
								defaultValue={filterValue(params.q)}
								name="q"
								placeholder="Buscar material o código"
								type="text"
							/>
						</label>
						<label>
							<span className="sr-only">Filtrar por bodega</span>
							<select
								className={inventoryInputClass}
								defaultValue={filterValue(params.warehouseId)}
								name="warehouseId"
							>
								<option value="">Todas las bodegas</option>
								{data.warehouses.map((warehouse) => (
									<option key={warehouse.id} value={warehouse.id}>
										{warehouse.code} · {warehouse.name}
									</option>
								))}
							</select>
						</label>
						<label>
							<span className="sr-only">Filtrar por estado</span>
							<select
								className={inventoryInputClass}
								defaultValue={filterValue(params.status)}
								name="status"
							>
								<option value="">Todos los estados</option>
								<option value="available">Disponible</option>
								<option value="low">Bajo mínimo</option>
								<option value="empty">Sin existencias</option>
							</select>
						</label>
					</AutoFilterForm>
				}
			/>
		</main>
	);
}
