import type { InventoryMaterial, StockMovement, Warehouse } from "@prisma/client";

export type InventoryMaterialClient = {
  id: string;
  code: string;
  name: string;
  resourceType: InventoryMaterial["resourceType"];
  specification: string | null;
  brand: string | null;
  model: string | null;
  trackIndividually: boolean;
  unit: string;
  unitCost: number;
  minimumStock: number;
  active: boolean;
  notes: string | null;
};

export type WarehouseClient = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  active: boolean;
  notes: string | null;
};

export function serializeMaterial(material: InventoryMaterial): InventoryMaterialClient {
  return {
    id: material.id,
    code: material.code,
    name: material.name,
    resourceType: material.resourceType,
    specification: material.specification,
    brand: material.brand,
    model: material.model,
    trackIndividually: material.trackIndividually,
    unit: material.unit,
    unitCost: material.unitCost.toNumber(),
    minimumStock: material.minimumStock.toNumber(),
    active: material.active,
    notes: material.notes
  };
}

export function serializeWarehouse(warehouse: Warehouse): WarehouseClient {
  return {
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    location: warehouse.location,
    active: warehouse.active,
    notes: warehouse.notes
  };
}

export function serializeMovement(movement: StockMovement & { material: InventoryMaterial; warehouse: Warehouse; project?: { id: string; code: string; name: string } | null; createdBy?: { name: string } | null }) {
  const createdAtLabel = new Intl.DateTimeFormat("es-GT", { dateStyle: "short", timeStyle: "medium" }).format(movement.createdAt).replace(/\u00a0/g, " ");

  return {
    id: movement.id,
    materialId: movement.materialId,
    warehouseId: movement.warehouseId,
    projectId: movement.projectId,
    type: movement.type,
    quantity: movement.quantity.toNumber(),
    unitCost: movement.unitCost.toNumber(),
    totalCost: movement.totalCost.toNumber(),
    reference: movement.reference,
    notes: movement.notes,
    responsibleName: movement.responsibleName,
    expectedReturnDate: movement.expectedReturnDate?.toISOString() ?? null,
    createdAt: movement.createdAt.toISOString(),
    createdAtLabel,
    transferGroupId: movement.transferGroupId,
    material: serializeMaterial(movement.material),
    warehouse: serializeWarehouse(movement.warehouse),
    project: movement.project ?? null,
    createdBy: movement.createdBy ?? null
  };
}
