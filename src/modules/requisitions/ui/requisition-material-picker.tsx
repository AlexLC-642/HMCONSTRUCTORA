export type MaterialOption = {
	id: string;
	code: string;
	name: string;
	unit: string;
	unitCost: string;
	minimumStock: string;
	resourceType: "MATERIAL" | "TOOL" | "EQUIPMENT";
	specification: string;
	brand: string;
	model: string;
	trackIndividually: boolean;
};

export type MaterialPlan = {
	id: string;
	budgetLineItemId: string;
	projectId: string;
	name: string;
	unit: string;
	planned: number;
	requested: number;
	purchased: number;
	received: number;
	pending: number;
	unitPrice: number;
	budgetVersion: number;
	source: "budget";
};

export type ActivityOption = {
	id: string;
	code: string;
	description: string;
	projectId: string;
};
