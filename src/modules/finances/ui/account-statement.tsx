import type { Prisma } from "@prisma/client";
import type { DocumentPreviewData } from "@/modules/documents/application/queries";
import { expenseGroupLabel } from "@/modules/finances/application/statement";
import { ExpenseDocumentControl } from "./expense-document-control";

const currencyFormatter = new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" });
const numberFormatter = new Intl.NumberFormat("es-GT", { maximumFractionDigits: 2 });

type ExpenseRow = {
  id: string;
  description: string;
  vendor: string | null;
  quantity: Prisma.Decimal;
  unit: string | null;
  subtotal: Prisma.Decimal;
  type: string | null;
  phase: string | null;
  documentNumber: string | null;
  paymentMethod: string | null;
  budgetSectionNo: string | null;
  status: string;
  requisitionItem?: {
    budgetLineItem?: { section: { code: string; name: string } } | null;
    scheduleActivity?: { budgetSectionCode?: string | null; budgetSectionName?: string | null } | null;
  } | null;
};

type AccountStatementProps = {
  projectName: string;
  expenses: ExpenseRow[];
  documentPreviews?: Record<string, DocumentPreviewData>;
  canRegister?: boolean;
  projectId?: string;
};

function groupedExpenses(expenses: ExpenseRow[]): Array<[string, ExpenseRow[]]> {
  const groups = new Map<string, ExpenseRow[]>();
  for (const expense of expenses.filter((row) => row.status === "VALID")) {
    const key = expenseGroupLabel(expense).toUpperCase();
    groups.set(key, [...(groups.get(key) ?? []), expense]);
  }
  const entries = Array.from(groups.entries());
  return entries.length > 0 ? entries : [["SIN ETAPA ASIGNADA", []]];
}

function rowClass(expense: ExpenseRow) {
  const marker = `${expense.type ?? ""} ${expense.paymentMethod ?? ""} ${expense.description}`.toLowerCase();
  if (marker.includes("deposit") || marker.includes("abono")) return "deposit-row";
  return "expense-row";
}

export function AccountStatement({ projectName, expenses, documentPreviews, canRegister = false, projectId = "" }: AccountStatementProps) {
  const groups = groupedExpenses(expenses);

  return (
    <div className="account-statement space-y-5 text-[#111]">
      <style>{`
        .account-statement table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        .account-statement th, .account-statement td { border: 2px solid #111; padding: 3px 4px; font-size: 12px; line-height: 1.2; vertical-align: middle; }
        .account-statement th { background: #d0d0d0; font-weight: 700; text-align: center; }
        .account-statement .title-row th { font-size: 16px; padding: 4px 5px; }
        .account-statement .desc-cell { text-align: left; }
        .account-statement .center-cell { text-align: center; }
        .account-statement .money-cell { text-align: right; white-space: nowrap; }
        .account-statement .total-label { text-align: right; }
        .account-statement .expense-row { background: #c9edf8; }
        .account-statement .deposit-row { background: #dcefd2; }
        .account-statement .total-amount { background: #55c3dd; font-weight: 700; }
        .account-statement .col-no { width: 34px; }
        .account-statement .col-desc { width: 43%; }
        .account-statement .col-company { width: 13%; }
        .account-statement .col-qty { width: 12%; }
        .account-statement .col-unit { width: 9%; }
        .account-statement .col-total { width: 10%; }
        .account-statement .col-doc { width: 13%; }
        .account-statement .empty-row td { height: 34px; }
        @media print {
          .account-statement, .account-statement * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .account-statement th, .account-statement td { border-width: 1.5px; font-size: 9px; padding: 2px 3px; }
          .account-statement .title-row th { font-size: 12px; }
          .account-statement .empty-row td { height: 24px; }
          .account-statement section { page-break-inside: avoid; }
          .account-statement button { color: #111 !important; padding: 0 !important; text-decoration: none !important; }
          .account-statement button svg { display: none; }
        }
      `}</style>
      {groups.map(([phase, rows]) => {
        const total = rows.reduce((sum, expense) => sum + expense.subtotal.toNumber(), 0);

        return (
          <section key={phase}>
            <table aria-label={`${phase} estado de cuenta de gastos`}>
              <colgroup>
                <col className="col-no" />
                <col className="col-desc" />
                <col className="col-company" />
                <col className="col-qty" />
                <col className="col-unit" />
                <col className="col-total" />
                <col className="col-doc" />
              </colgroup>
              <thead>
                <tr className="title-row">
                  <th colSpan={7}>{phase} - COMPRAS Y GASTOS REGISTRADOS EN {projectName.toUpperCase()}</th>
                </tr>
                <tr>
                  <th>No.</th>
                  <th>DESCRIPCION DE GASTOS</th>
                  <th>EMPRESA</th>
                  <th>CANTIDAD</th>
                  <th>UM</th>
                  <th>SUB TOTAL</th>
                  <th>FACTURA/RECIBO</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0
                  ? <tr><td className="center-cell" colSpan={7}>Sin compras ni gastos válidos registrados.</td></tr>
                  : rows.map((expense, index) => (
                      <tr key={expense.id}>
                        <td className="center-cell">{index + 1}</td>
                        <td className={`desc-cell ${rowClass(expense)}`}>{expense.description}</td>
                        <td className="center-cell">{expense.vendor ?? "-"}</td>
                        <td className="center-cell">{expense.quantity.gt(0) ? numberFormatter.format(expense.quantity.toNumber()) : "-"}</td>
                        <td className="center-cell">{expense.unit ?? "-"}</td>
                        <td className="money-cell">{currencyFormatter.format(expense.subtotal.toNumber())}</td>
                        <td className="center-cell">
                          {documentPreviews ? (
                            <ExpenseDocumentControl
                              canRegister={canRegister}
                              document={documentPreviews[expense.id] ?? null}
                              documentNumber={expense.documentNumber}
                              expenseId={expense.id}
                              projectId={projectId}
                            />
                          ) : expense.documentNumber ?? "-"}
                        </td>
                      </tr>
                    ))}
                <tr>
                  <th colSpan={5} className="total-label">TOTAL {phase}</th>
                  <th className="money-cell total-amount">{currencyFormatter.format(total)}</th>
                  <th />
                </tr>
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
