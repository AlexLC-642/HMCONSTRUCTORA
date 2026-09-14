import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ensureDocumentCategories } from "@/modules/documents/application/service";
import { storeProjectDocumentFile } from "@/modules/documents/application/storage";
import { prisma } from "@/shared/lib/prisma";
import {
	type ExpenseDocumentInput,
	type ExpenseInput,
	expenseDocumentInputSchema,
	expenseInputSchema,
	type PaymentInput,
	type PurchaseInvoiceInput,
	paymentInputSchema,
	purchaseInvoiceInputSchema,
	type SupplierPaymentInput,
	supplierPaymentInputSchema,
} from "../domain/validation";

type FinanceContext = { userId: string };

function nullable(value?: string | null) {
	const clean = value?.trim();
	return clean ? clean : null;
}

function decimal(value: number | string | Prisma.Decimal) {
	return new Prisma.Decimal(value || 0).toDecimalPlaces(2);
}

function date(value: string) {
	return new Date(`${value}T00:00:00.000Z`);
}

function normalizeDocumentNumber(value?: string | null) {
	const clean = value?.trim().replace(/\s+/g, " ");
	return clean ? clean.toUpperCase() : null;
}

export async function createPurchaseInvoice(
	rawInput: unknown,
	file: File,
	context: FinanceContext,
) {
	const parsed = purchaseInvoiceInputSchema.parse(
		rawInput,
	) as PurchaseInvoiceInput;
	if (!(file instanceof File) || file.size <= 0) {
		throw new Error("Adjunte el archivo de la factura.");
	}
	const order = await prisma.purchaseOrder.findUnique({
		where: { id: parsed.purchaseOrderId },
		include: {
			supplier: {
				select: { id: true, code: true, businessName: true },
			},
			financialExpenses: { where: { status: "VALID" } },
		},
	});
	if (!order || !["ISSUED", "PARTIAL", "RECEIVED"].includes(order.status)) {
		throw new Error("La factura debe corresponder a una orden emitida.");
	}
	if (!order.projectId) {
		throw new Error(
			"La orden debe estar vinculada a un proyecto para facturarla.",
		);
	}
	if (order.projectId !== parsed.projectId) {
		throw new Error("La orden no pertenece al proyecto seleccionado.");
	}
	const invoiceTotal = decimal(parsed.subtotal);
	const invoiced = order.financialExpenses.reduce(
		(sum, expense) => sum.add(expense.subtotal),
		new Prisma.Decimal(0),
	);
	const available = order.total.sub(invoiced).toDecimalPlaces(2);
	if (invoiceTotal.gt(available)) {
		throw new Error(
			`La factura supera el saldo por facturar de la orden (${available.toString()}).`,
		);
	}
	const documentNumber = normalizeDocumentNumber(
		parsed.documentNumber,
	) as string;
	const duplicate = await prisma.financialExpense.findFirst({
		where: { supplierId: order.supplierId, documentNumber, status: "VALID" },
		select: { id: true },
	});
	if (duplicate)
		throw new Error(
			`La factura ${documentNumber} ya esta registrada para este proveedor.`,
		);

	const categories = await ensureDocumentCategories();
	const category = categories.find((item) => item.key === "comprobantes");
	if (!category)
		throw new Error("No se encontro la categoria de facturas y recibos.");
	const documentId = randomUUID();
	const storedFile = await storeProjectDocumentFile(
		order.projectId,
		documentId,
		file,
		undefined,
		context.userId,
	);

	return prisma.$transaction(async (tx) => {
		await tx.projectDocument.create({
			data: {
				id: documentId,
				projectId: order.projectId as string,
				categoryId: category.id,
				title: `Factura ${documentNumber}`,
				description: `Factura de ${order.supplier.businessName} para ${order.number}`,
				tags: "finanzas, factura, orden de compra",
				authorId: context.userId,
				versions: {
					create: {
						versionNumber: 1,
						...storedFile,
						uploadedById: context.userId,
					},
				},
			},
		});
		const expense = await tx.financialExpense.create({
			data: {
				projectId: order.projectId as string,
				supplierId: order.supplierId,
				purchaseOrderId: order.id,
				expenseDate: date(parsed.expenseDate),
				description: `Compra ${order.number}`,
				vendor: order.supplier.businessName,
				quantity: decimal(1),
				unit: "global",
				subtotal: invoiceTotal,
				type: "Compra",
				documentNumber,
				documentType: "FACTURA",
				supportingDocumentId: documentId,
				notes: nullable(parsed.notes),
				createdById: context.userId,
			},
		});
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "CREATE",
				entityType: "FinancialExpense",
				entityId: expense.id,
				metadata: {
					purchaseOrderId: order.id,
					documentNumber,
					subtotal: invoiceTotal.toString(),
				},
			},
		});
		return expense;
	});
}

async function nextPaymentNumber(
	tx: Prisma.TransactionClient,
	projectId: string,
) {
	const payments = await tx.clientPayment.findMany({
		where: { projectId },
		select: { paymentNumber: true },
	});
	const max = payments.reduce((currentMax, payment) => {
		const match = /^AB-(\d{6})$/.exec(payment.paymentNumber);
		return match ? Math.max(currentMax, Number(match[1])) : currentMax;
	}, 0);

	return `AB-${String(max + 1).padStart(6, "0")}`;
}

export async function createExpense(
	rawInput: unknown,
	context: FinanceContext,
	receiptFile?: File,
) {
	const parsed = expenseInputSchema.parse(rawInput) as ExpenseInput;
	const hasReceipt = receiptFile instanceof File && receiptFile.size > 0;
	if (Boolean(parsed.documentNumber?.trim()) !== hasReceipt) {
		throw new Error(
			"El número y el archivo del comprobante deben registrarse juntos.",
		);
	}
	if (hasReceipt && !parsed.documentType) {
		throw new Error("Selecciona si el comprobante es factura, recibo u otro.");
	}

	let supportingDocument:
		| {
				id: string;
				categoryId: string;
				storedFile: Awaited<ReturnType<typeof storeProjectDocumentFile>>;
		  }
		| undefined;
	if (hasReceipt && receiptFile) {
		const categories = await ensureDocumentCategories();
		const category = categories.find((item) => item.key === "comprobantes");
		if (!category)
			throw new Error("No se encontró la categoría de facturas y recibos.");
		const id = randomUUID();
		supportingDocument = {
			id,
			categoryId: category.id,
			storedFile: await storeProjectDocumentFile(
				parsed.projectId,
				id,
				receiptFile,
				undefined,
				context.userId,
			),
		};
	}

	return prisma.$transaction(async (tx) => {
		const vendor = nullable(parsed.vendor);
		const documentNumber = normalizeDocumentNumber(parsed.documentNumber);

		if (documentNumber && vendor) {
			const duplicate = await tx.financialExpense.findFirst({
				where: {
					projectId: parsed.projectId,
					vendor,
					documentNumber,
					status: "VALID",
				},
				select: { id: true },
			});

			if (duplicate) {
				throw new Error(
					`Ya existe la factura ${documentNumber} registrada para este proveedor.`,
				);
			}
		}

		if (supportingDocument) {
			await tx.projectDocument.create({
				data: {
					id: supportingDocument.id,
					projectId: parsed.projectId,
					categoryId: supportingDocument.categoryId,
					title: `${parsed.documentType === "FACTURA" ? "Factura" : parsed.documentType === "RECIBO" ? "Recibo" : "Comprobante"} ${documentNumber}`,
					description: `Comprobante de ${parsed.description}`,
					tags: "finanzas, comprobante",
					authorId: context.userId,
					versions: {
						create: {
							versionNumber: 1,
							...supportingDocument.storedFile,
							uploadedById: context.userId,
						},
					},
				},
			});
		}

		const expense = await tx.financialExpense.create({
			data: {
				projectId: parsed.projectId,
				expenseDate: date(parsed.expenseDate),
				description: parsed.description,
				vendor,
				quantity: decimal(parsed.quantity),
				unit: nullable(parsed.unit),
				subtotal: decimal(parsed.subtotal),
				type: nullable(parsed.type),
				phase: nullable(parsed.phase),
				budgetSectionNo: nullable(parsed.budgetSectionNo),
				activity: nullable(parsed.activity),
				documentNumber,
				documentType: supportingDocument ? nullable(parsed.documentType) : null,
				supportingDocumentId: supportingDocument?.id,
				paymentMethod: nullable(parsed.paymentMethod),
				notes: nullable(parsed.notes),
				createdById: context.userId,
			},
		});

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "CREATE",
				entityType: "FinancialExpense",
				entityId: expense.id,
				metadata: {
					projectId: expense.projectId,
					subtotal: expense.subtotal.toString(),
				},
			},
		});

		return expense;
	});
}

export async function attachExpenseDocument(
	rawInput: unknown,
	file: File,
	context: FinanceContext,
) {
	const parsed = expenseDocumentInputSchema.parse(
		rawInput,
	) as ExpenseDocumentInput;
	if (!(file instanceof File) || file.size <= 0) {
		throw new Error("Selecciona la factura o recibo que deseas adjuntar.");
	}
	const expense = await prisma.financialExpense.findUniqueOrThrow({
		where: { id: parsed.financialExpenseId },
		select: {
			id: true,
			projectId: true,
			description: true,
			vendor: true,
			supportingDocumentId: true,
		},
	});
	if (expense.supportingDocumentId) {
		throw new Error("Este gasto ya tiene un comprobante adjunto.");
	}
	const documentNumber = normalizeDocumentNumber(parsed.documentNumber);
	const duplicate = await prisma.financialExpense.findFirst({
		where: {
			projectId: expense.projectId,
			vendor: expense.vendor,
			documentNumber,
			status: "VALID",
			id: { not: expense.id },
		},
		select: { id: true },
	});
	if (duplicate) {
		throw new Error(
			`Ya existe el comprobante ${documentNumber} para este proveedor.`,
		);
	}

	const categories = await ensureDocumentCategories();
	const category = categories.find((item) => item.key === "comprobantes");
	if (!category)
		throw new Error("No se encontró la categoría de facturas y recibos.");
	const documentId = randomUUID();
	const storedFile = await storeProjectDocumentFile(
		expense.projectId,
		documentId,
		file,
		undefined,
		context.userId,
	);
	const label =
		parsed.documentType === "FACTURA"
			? "Factura"
			: parsed.documentType === "RECIBO"
				? "Recibo"
				: "Comprobante";

	return prisma.$transaction(async (tx) => {
		await tx.projectDocument.create({
			data: {
				id: documentId,
				projectId: expense.projectId,
				categoryId: category.id,
				title: `${label} ${documentNumber}`,
				description: `Comprobante de ${expense.description}`,
				tags: "finanzas, comprobante",
				authorId: context.userId,
				versions: {
					create: {
						versionNumber: 1,
						...storedFile,
						uploadedById: context.userId,
					},
				},
			},
		});
		const updated = await tx.financialExpense.update({
			where: { id: expense.id },
			data: {
				documentNumber,
				documentType: parsed.documentType,
				supportingDocumentId: documentId,
			},
		});
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "UPDATE",
				entityType: "FinancialExpense",
				entityId: expense.id,
				metadata: {
					documentId,
					documentNumber,
					documentType: parsed.documentType,
				},
			},
		});
		return updated;
	});
}

export async function createClientPayment(
	rawInput: unknown,
	context: FinanceContext,
) {
	const parsed = paymentInputSchema.parse(rawInput) as PaymentInput;

	return prisma.$transaction(async (tx) => {
		if (parsed.budgetSectionId) {
			const section = await tx.budgetSection.findFirst({
				where: {
					id: parsed.budgetSectionId,
					budgetVersion: {
						budget: { projectId: parsed.projectId },
						status: "APPROVED",
					},
				},
				select: {
					id: true,
					total: true,
					clientPayments: {
						where: { status: "REGISTERED" },
						select: { amount: true },
					},
				},
			});
			if (!section)
				throw new Error(
					"El renglón seleccionado no pertenece al presupuesto aprobado del proyecto.",
				);
			const applied = section.clientPayments.reduce(
				(sum, payment) => sum.add(payment.amount),
				new Prisma.Decimal(0),
			);
			const pending = section.total.sub(applied).toDecimalPlaces(2);
			if (decimal(parsed.amount).gt(pending)) {
				throw new Error(
					`El abono excede el saldo pendiente del renglón (${pending.toString()}).`,
				);
			}
		}
		const payment = await tx.clientPayment.create({
			data: {
				projectId: parsed.projectId,
				paymentNumber:
					parsed.paymentNumber?.trim() ||
					(await nextPaymentNumber(tx, parsed.projectId)),
				paymentDate: date(parsed.paymentDate),
				amount: decimal(parsed.amount),
				method: nullable(parsed.method),
				reference: nullable(parsed.reference),
				observations: nullable(parsed.observations),
				concept: nullable(parsed.concept),
				budgetSectionId: nullable(parsed.budgetSectionId),
				createdById: context.userId,
			},
		});

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "CREATE",
				entityType: "ClientPayment",
				entityId: payment.id,
				metadata: {
					projectId: payment.projectId,
					amount: payment.amount.toString(),
				},
			},
		});

		return payment;
	});
}

async function nextSupplierPaymentNumber(
	tx: Prisma.TransactionClient,
	financialExpenseId: string,
) {
	const payments = await tx.supplierPayment.findMany({
		where: { financialExpenseId },
		select: { paymentNumber: true },
	});
	const max = payments.reduce((currentMax, payment) => {
		const match = /^PAGO-(\d{2})$/.exec(payment.paymentNumber);
		return match ? Math.max(currentMax, Number(match[1])) : currentMax;
	}, 0);

	return `PAGO-${String(max + 1).padStart(2, "0")}`;
}

// A purchase (FinancialExpense) is an obligation to the vendor; a SupplierPayment
// is money actually leaving the project's account against that obligation. They
// stay separate so partial payments never overwrite or duplicate the purchase.
export async function recordSupplierPayment(
	rawInput: unknown,
	context: FinanceContext,
) {
	const parsed = supplierPaymentInputSchema.parse(
		rawInput,
	) as SupplierPaymentInput;

	return prisma.$transaction(async (tx) => {
		const expense = await tx.financialExpense.findUniqueOrThrow({
			where: { id: parsed.financialExpenseId },
			include: { supplierPayments: { where: { status: "REGISTERED" } } },
		});
		if (expense.status !== "VALID") {
			throw new Error("Solo se pueden abonar compras validas.");
		}

		const paidSoFar = expense.supplierPayments.reduce(
			(sum, payment) => sum.add(payment.amount),
			new Prisma.Decimal(0),
		);
		const pending = expense.subtotal.sub(paidSoFar).toDecimalPlaces(2);
		const amount = decimal(parsed.amount);
		if (amount.gt(pending)) {
			throw new Error(
				`El pago excede el saldo pendiente (${pending.toString()}).`,
			);
		}

		const payment = await tx.supplierPayment.create({
			data: {
				financialExpenseId: expense.id,
				paymentNumber: await nextSupplierPaymentNumber(tx, expense.id),
				paymentDate: date(parsed.paymentDate),
				amount,
				method: nullable(parsed.method),
				reference: nullable(parsed.reference),
				notes: nullable(parsed.notes),
				createdById: context.userId,
			},
		});

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "CREATE",
				entityType: "SupplierPayment",
				entityId: payment.id,
				metadata: {
					financialExpenseId: expense.id,
					projectId: expense.projectId,
					amount: payment.amount.toString(),
					pendingAfter: pending.sub(amount).toString(),
				},
			},
		});

		return payment;
	});
}
