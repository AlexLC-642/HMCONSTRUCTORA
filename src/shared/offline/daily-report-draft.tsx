"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { offlineDb } from "./db";

type OfflineDraftBridgeProps = {
  draftKey: string;
  projectId: string;
};

type SyncState = "idle" | "saving" | "syncing" | "synced" | "failed";

function formSnapshot(form: HTMLFormElement) {
  const data = new FormData(form);
  const snapshot: Record<string, string> = {};
  for (const [key, value] of data.entries()) {
    if (typeof value === "string") snapshot[key] = value;
  }
  return snapshot;
}

function restoreForm(form: HTMLFormElement, data: Record<string, string>) {
  for (const [name, value] of Object.entries(data)) {
    const field = form.elements.namedItem(name);
    if (!field) continue;
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
      field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

async function enqueueSyncOperation(draftKey: string, projectId: string, formData: Record<string, string>) {
  const now = new Date().toISOString();
  const idempotencyKey = `${draftKey}:${formData.reportNumber || "sin-numero"}`;
  await offlineDb.syncOperations.put({
    id: idempotencyKey,
    idempotencyKey,
    operationType: "dailyReport.saveDraft",
    payload: { projectId, formData },
    status: "pending",
    createdAt: now,
    updatedAt: now
  });
  return idempotencyKey;
}

async function syncOperation(operationId: string) {
  const operation = await offlineDb.syncOperations.get(operationId);
  if (!operation || operation.status === "synced") return true;

  const payload = operation.payload as { projectId?: string; formData?: Record<string, string> };
  if (!payload.projectId || !payload.formData) return false;

  await offlineDb.syncOperations.update(operationId, {
    status: "syncing",
    updatedAt: new Date().toISOString(),
    lastError: undefined
  });

  const response = await fetch(`/api/projects/${payload.projectId}/progress/offline-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idempotencyKey: operation.idempotencyKey,
      operationType: "dailyReport.saveDraft",
      formData: payload.formData
    })
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    const message = result?.error?.message ?? "No se pudo sincronizar.";
    await offlineDb.syncOperations.update(operationId, {
      status: "failed",
      updatedAt: new Date().toISOString(),
      lastError: message
    });
    return false;
  }

  await offlineDb.syncOperations.update(operationId, {
    status: "synced",
    updatedAt: new Date().toISOString(),
    lastError: undefined
  });
  return true;
}

export function OfflineDailyReportDraft({ draftKey, projectId }: OfflineDraftBridgeProps) {
  const [hasDraft, setHasDraft] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const statusText = useMemo(() => {
    if (syncState === "syncing") return "Sincronizando informe...";
    if (syncState === "synced") return "Informe sincronizado";
    if (syncState === "failed") return lastError ?? "Sincronizacion pendiente";
    if (isPending || syncState === "saving") return "Guardando borrador local...";
    if (savedAt) return `Borrador local ${new Date(savedAt).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" })}`;
    return "Borrador local activo";
  }, [isPending, lastError, savedAt, syncState]);

  const saveCurrentDraft = useCallback(async () => {
    const form = document.querySelector<HTMLFormElement>(`form[data-offline-draft-key="${draftKey}"]`);
    if (!form) return null;
    const now = new Date().toISOString();
    const formData = formSnapshot(form);
    await offlineDb.dailyReportDrafts.put({ id: draftKey, projectId, formData, createdAt: now, updatedAt: now });
    setHasDraft(true);
    setSavedAt(now);
    return formData;
  }, [draftKey, projectId]);

  const autoSyncDraft = useCallback(async (formData: Record<string, string>) => {
    if (!navigator.onLine) return;

    setSyncState("syncing");
    setLastError(null);
    const operationId = await enqueueSyncOperation(draftKey, projectId, formData);
    const ok = await syncOperation(operationId);

    if (!ok) {
      const failed = await offlineDb.syncOperations.get(operationId);
      setSyncState("failed");
      setLastError(failed?.lastError ?? "El envío quedo pendiente.");
      return;
    }

    await offlineDb.dailyReportDrafts.delete(draftKey);
    setHasDraft(false);
    setSavedAt(null);
    setSyncState("synced");
  }, [draftKey, projectId]);

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>(`form[data-offline-draft-key="${draftKey}"]`);
    if (!form) return;

    let timeoutId: number | undefined;

    offlineDb.dailyReportDrafts.get(draftKey).then((draft) => {
      if (draft) {
        setHasDraft(true);
        setSavedAt(draft.updatedAt);
      }
    });

    const save = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        startTransition(() => {
          setSyncState("saving");
          saveCurrentDraft()
            .then((formData) => formData ? autoSyncDraft(formData) : undefined)
            .catch(() => setSyncState("failed"));
        });
      }, 500);
    };

    form.addEventListener("input", save);
    form.addEventListener("change", save);

    return () => {
      window.clearTimeout(timeoutId);
      form.removeEventListener("input", save);
      form.removeEventListener("change", save);
    };
  }, [autoSyncDraft, draftKey, saveCurrentDraft]);

  useEffect(() => {
    const updateOnline = () => {
      setOnline(true);
      offlineDb.syncOperations.where("status").anyOf("pending", "failed").toArray().then(async (operations) => {
        for (const operation of operations) await syncOperation(operation.id);
        if (operations.length > 0) window.location.reload();
      });
    };
    const updateOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOffline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOffline);
    };
  }, []);

  const restoreDraft = async () => {
    const form = document.querySelector<HTMLFormElement>(`form[data-offline-draft-key="${draftKey}"]`);
    const draft = await offlineDb.dailyReportDrafts.get(draftKey);
    if (form && draft) restoreForm(form, draft.formData);
  };

  const discardDraft = async () => {
    await offlineDb.dailyReportDrafts.delete(draftKey);
    setHasDraft(false);
    setSavedAt(null);
    setSyncState("idle");
    setLastError(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[#f8fbf8] px-3 py-2 text-sm text-[var(--muted)]">
      <span>{statusText}</span>
      <span className="rounded-full border border-[#cfe8d8] bg-[#eefaf2] px-2 py-1 text-[11px] font-semibold text-[#23734e]">
        {online ? "Guardado automático" : "Guardado sin conexión"}
      </span>
      {hasDraft ? (
        <>
          <button className="focus-ring rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs font-medium text-[var(--foreground)]" type="button" onClick={restoreDraft}>
            Recuperar
          </button>
          <button className="focus-ring rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs font-medium text-[var(--muted)]" type="button" onClick={discardDraft}>
            Descartar
          </button>
        </>
      ) : null}
    </div>
  );
}