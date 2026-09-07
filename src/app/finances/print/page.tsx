import { requirePermission } from "@/modules/auth/application/authorization";
import { buildDocumentPreview } from "@/modules/documents/application/queries";
import { getFinanceWorkspace } from "@/modules/finances/application/queries";
import {
  classifiedExpenseTotal,
  expenseGroupLabel,
} from "@/modules/finances/application/statement";
import { AccountStatement } from "@/modules/finances/ui/account-statement";
import { FinanceStatementPrintSummary } from "@/modules/finances/ui/finance-statement-summary";
import { PrintActions } from "@/shared/ui/print-actions";

type FinancePrintPageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

export default async function FinancePrintPage({ searchParams }: FinancePrintPageProps) {
  const user = await requirePermission("finanzas.ver");
  const params = await searchParams;
  const { selectedProject, expenses, payments, payables, summary } = await getFinanceWorkspace(params.projectId);
  const backHref = selectedProject ? `/finances?projectId=${selectedProject.id}` : "/finances";
  const validExpenses = expenses.filter((expense) => expense.status === "VALID");
  const registeredPayments = payments.filter((payment) => payment.status === "REGISTERED");
  const supplierPaid = payables.reduce((sum, payable) => sum + payable.paid.toNumber(), 0);
  const supplierPending = payables.reduce((sum, payable) => sum + payable.pending.toNumber(), 0);
  const phaseTotals = Array.from(validExpenses.reduce((groups, expense) => {
    const label = expenseGroupLabel(expense);
    groups.set(label, (groups.get(label) ?? 0) + expense.subtotal.toNumber());
    return groups;
  }, new Map<string, number>())).map(([name, total]) => ({ name, total }));
  const statementDate = [
    ...validExpenses.map((expense) => expense.expenseDate),
    ...registeredPayments.map((payment) => payment.paymentDate),
  ].sort((left, right) => right.getTime() - left.getTime())[0] ?? new Date();
  const documentPreviews = Object.fromEntries(expenses.flatMap((expense) =>
    expense.supportingDocument
      ? [[expense.id, buildDocumentPreview(
          expense.supportingDocument,
          selectedProject,
          expense.supportingDocument.category,
        )]]
      : [],
  ));

  return (
    <>
      <PrintActions backHref={backHref} />
      <main className="print-surface mx-auto max-w-[1120px] bg-white px-8 py-6 text-[#111] print:p-0">
        <style>{`@page { size: letter portrait; margin: 0.3in; } @media print { body { background: white; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }`}</style>
        <AccountStatement
          canRegister={user.permissions.includes("finanzas.registrar")}
          documentPreviews={documentPreviews}
          projectId={selectedProject?.id ?? ""}
          projectName={selectedProject?.name ?? "PROYECTO"}
          expenses={validExpenses}
        />
        <FinanceStatementPrintSummary
          additionalWork={classifiedExpenseTotal(validExpenses, ["adicional"])}
          asOf={statementDate}
          budget={summary.totalBudget.toNumber()}
          budgetRemaining={summary.budgetDifference.toNumber()}
          cashBalance={summary.availableBalance.toNumber()}
          customerPayments={registeredPayments.map((payment) => ({
            id: payment.id,
            paymentNumber: payment.paymentNumber,
            paymentDate: payment.paymentDate,
            amount: payment.amount.toNumber(),
            method: payment.method,
            reference: payment.reference,
          }))}
          externalExpenses={classifiedExpenseTotal(validExpenses, ["externo", "distinto de obra"])}
          phaseTotals={phaseTotals}
          supervision={classifiedExpenseTotal(validExpenses, ["supervisión", "supervision"])}
          supplierPaid={supplierPaid}
          supplierPending={supplierPending}
          totalSpent={summary.totalExpenses.toNumber()}
        />
      </main>
    </>
  );
}
