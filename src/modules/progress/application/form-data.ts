import type { DailyReportInput } from "../domain/validation";

function stringValue(formData: FormData, key: string) {
	const value = formData.get(key);
	return typeof value === "string" ? value : "";
}

function activeLaborRows(
	formData: FormData,
	count: number,
): DailyReportInput["laborEntries"] {
	return Array.from({ length: count }, (_, index) => ({
		workerLabel: stringValue(formData, `laborEntries.${index}.workerLabel`),
		role: stringValue(formData, `laborEntries.${index}.role`),
		people: stringValue(formData, `laborEntries.${index}.people`),
		hours: stringValue(formData, `laborEntries.${index}.hours`),
		rate: stringValue(formData, `laborEntries.${index}.rate`),
		notes: stringValue(formData, `laborEntries.${index}.notes`),
		position: index + 1,
	})).filter(
		(row) =>
			row.workerLabel ||
			row.role ||
			Number(row.people) > 0 ||
			Number(row.hours) > 0 ||
			Number(row.rate) > 0,
	);
}

function activeMaterialRows(
	formData: FormData,
	count: number,
): DailyReportInput["materialEntries"] {
	return Array.from({ length: count }, (_, index) => ({
		materialId: stringValue(formData, `materialEntries.${index}.materialId`),
		warehouseId: stringValue(formData, `materialEntries.${index}.warehouseId`),
		materialName: stringValue(
			formData,
			`materialEntries.${index}.materialName`,
		),
		warehouse: stringValue(formData, `materialEntries.${index}.warehouse`),
		quantityUsed: stringValue(
			formData,
			`materialEntries.${index}.quantityUsed`,
		),
		unit: stringValue(formData, `materialEntries.${index}.unit`),
		wasteQuantity: stringValue(
			formData,
			`materialEntries.${index}.wasteQuantity`,
		),
		returnedQuantity: stringValue(
			formData,
			`materialEntries.${index}.returnedQuantity`,
		),
		activityCode: stringValue(
			formData,
			`materialEntries.${index}.activityCode`,
		),
		notes: stringValue(formData, `materialEntries.${index}.notes`),
		position: index + 1,
	})).filter(
		(row) =>
			row.materialId ||
			row.materialName ||
			Number(row.quantityUsed) > 0 ||
			row.unit ||
			row.activityCode,
	);
}

export function readDailyReportFormData(formData: FormData): DailyReportInput {
	const activityCount = Number(stringValue(formData, "activityCount") || "0");
	const laborCount = Number(stringValue(formData, "laborCount") || "0");
	const materialCount = Number(stringValue(formData, "materialCount") || "0");

	return {
		reportId: stringValue(formData, "reportId"),
		reportNumber: stringValue(formData, "reportNumber"),
		reportDate: stringValue(formData, "reportDate"),
		siteManager: stringValue(formData, "siteManager"),
		location: stringValue(formData, "location"),
		workShift: stringValue(formData, "workShift"),
		startTime: stringValue(formData, "startTime"),
		endTime: stringValue(formData, "endTime"),
		weather: stringValue(formData, "weather"),
		generalObservations: stringValue(formData, "generalObservations"),
		activities: Array.from({ length: activityCount }, (_, index) => ({
			id: stringValue(formData, `activities.${index}.id`),
			scheduleActivityId: stringValue(
				formData,
				`activities.${index}.scheduleActivityId`,
			),
			activityCode: stringValue(formData, `activities.${index}.activityCode`),
			activityName: stringValue(formData, `activities.${index}.activityName`),
			budgetSectionCode: stringValue(
				formData,
				`activities.${index}.budgetSectionCode`,
			),
			budgetSectionName: stringValue(
				formData,
				`activities.${index}.budgetSectionName`,
			),
			workDescription: stringValue(
				formData,
				`activities.${index}.workDescription`,
			),
			unit: stringValue(formData, `activities.${index}.unit`),
			contractedQuantity: stringValue(
				formData,
				`activities.${index}.contractedQuantity`,
			),
			previousQuantity: stringValue(
				formData,
				`activities.${index}.previousQuantity`,
			),
			todayQuantity: stringValue(formData, `activities.${index}.todayQuantity`),
			previousProgress: stringValue(
				formData,
				`activities.${index}.previousProgress`,
			),
			status: stringValue(
				formData,
				`activities.${index}.status`,
			) as DailyReportInput["activities"][number]["status"],
			issues: stringValue(formData, `activities.${index}.issues`),
			position: index + 1,
		})),
		laborEntries: activeLaborRows(formData, laborCount),
		materialEntries: activeMaterialRows(formData, materialCount),
	};
}
