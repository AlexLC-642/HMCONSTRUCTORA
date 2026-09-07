"use client";

import { Eye, FileCheck2, FileUp, Paperclip, ReceiptText, X } from "lucide-react";
import { useState } from "react";
import type { DocumentPreviewData } from "@/modules/documents/application/queries";
import { DocumentPreviewModal } from "@/modules/documents/ui/document-preview-modal";
import { attachExpenseDocumentAction } from "../application/actions";

type Props = {
	canRegister: boolean;
	document: DocumentPreviewData | null;
	documentNumber: string | null;
	expenseId: string;
	projectId: string;
};

const fieldClass =
	"focus-ring h-11 w-full rounded-lg border border-[#cbd3cc] bg-white px-3 text-sm text-[#172023] transition hover:border-[#9daaa1]";

export function ExpenseDocumentControl({
	canRegister,
	document,
	documentNumber,
	expenseId,
	projectId,
}: Props) {
	const [showPreview, setShowPreview] = useState(false);
	const [showUpload, setShowUpload] = useState(false);
	const [fileName, setFileName] = useState("");

	return (
		<>
			{document ? (
				<button
					className="focus-ring inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-semibold text-[#176f54] underline decoration-[#9acbb8] underline-offset-4 transition hover:bg-[#eaf6f0]"
					onClick={() => setShowPreview(true)}
					title="Abrir comprobante"
					type="button"
				>
					<Eye aria-hidden="true" size={14} /> {documentNumber ?? "Ver comprobante"}
				</button>
			) : canRegister ? (
				<button
					className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#aebbb4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#52615c] transition hover:-translate-y-0.5 hover:border-[#278362] hover:bg-[#eff8f3] hover:text-[#176f54]"
					onClick={() => setShowUpload(true)}
					type="button"
				>
					<Paperclip aria-hidden="true" size={14} />
					{documentNumber ? `Adjuntar ${documentNumber}` : "Adjuntar comprobante"}
				</button>
			) : (
				<span className="text-[#7a8581]">{documentNumber ?? "Sin comprobante"}</span>
			)}

			{showPreview && document ? (
				<DocumentPreviewModal document={document} onClose={() => setShowPreview(false)} variant="receipt" />
			) : null}

			{showUpload ? (
				<div className="fixed inset-0 z-[95] grid place-items-center bg-[#0d1415]/70 p-3 backdrop-blur-[3px] sm:p-6">
					<button aria-label="Cerrar ventana" className="absolute inset-0" onClick={() => setShowUpload(false)} type="button" />
					<section aria-modal="true" className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/70 bg-[#f8f8f5] shadow-[0_36px_100px_rgba(9,16,18,0.4)]" role="dialog">
						<header className="relative overflow-hidden bg-[#172023] px-5 py-5 text-white">
							<div className="pointer-events-none absolute -right-12 -top-20 size-48 rounded-full bg-[#c8202f]/25 blur-2xl" />
							<div className="relative flex items-start gap-3">
								<span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-red)] shadow-[0_10px_24px_rgba(200,32,47,0.3)]"><ReceiptText size={19} /></span>
								<div className="min-w-0 flex-1"><h2 className="text-xl font-semibold">Adjuntar comprobante</h2><p className="mt-1 text-sm text-white/70">Vincula el folio real con su factura o recibo.</p></div>
								<button aria-label="Cerrar" className="grid size-9 place-items-center rounded-lg bg-white/10 hover:bg-white/20" onClick={() => setShowUpload(false)} type="button"><X size={18} /></button>
							</div>
						</header>
						<form action={attachExpenseDocumentAction}>
							<input name="projectId" type="hidden" value={projectId} />
							<input name="financialExpenseId" type="hidden" value={expenseId} />
							<div className="grid gap-4 p-5 sm:grid-cols-2">
								<label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#53615c]">Tipo<select className={fieldClass} defaultValue="FACTURA" name="documentType"><option value="FACTURA">Factura</option><option value="RECIBO">Recibo</option><option value="OTRO">Otro comprobante</option></select></label>
								<label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#53615c]">Número exacto<input className={fieldClass} defaultValue={documentNumber ?? ""} name="documentNumber" placeholder="Folio del proveedor" required /></label>
								<label className="group sm:col-span-2 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#9fb0a8] bg-white p-4 text-center transition hover:border-[#278362] hover:bg-[#f2f8f4] hover:shadow-[0_12px_28px_rgba(31,122,91,0.1)]">
									<span className={`mb-2 grid size-10 place-items-center rounded-xl ${fileName ? "bg-[#e4f4eb] text-[#177153]" : "bg-[#eef1ee] text-[#5f6c67]"}`}>{fileName ? <FileCheck2 size={19} /> : <FileUp size={19} />}</span>
									<strong className="max-w-full truncate text-sm text-[#263330]">{fileName || "Seleccionar factura o recibo"}</strong>
									<span className="mt-1 text-xs text-[#71807a]">PDF, JPG, PNG o WEBP · máximo 80 MB</span>
									<input accept=".pdf,.png,.jpg,.jpeg,.webp" className="sr-only" name="documentFile" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} required type="file" />
								</label>
							</div>
							<footer className="flex justify-end gap-2 border-t border-[#d8ddd7] bg-white px-5 py-4"><button className="focus-ring h-11 rounded-lg border border-[#cbd3cc] bg-white px-4 font-semibold" onClick={() => setShowUpload(false)} type="button">Cancelar</button><button className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--brand-red)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(200,32,47,0.22)]" type="submit"><FileUp size={16} /> Guardar y vincular</button></footer>
						</form>
					</section>
				</div>
			) : null}
		</>
	);
}
