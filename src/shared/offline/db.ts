"use client";

import Dexie, { type Table } from "dexie";

export type LocalSyncOperation = {
  id: string;
  idempotencyKey: string;
  operationType: string;
  payload: unknown;
  status: "pending" | "syncing" | "synced" | "failed";
  createdAt: string;
  updatedAt: string;
  lastError?: string;
};

export type LocalDailyReportDraft = {
  id: string;
  projectId: string;
  formData: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

class OfflineDatabase extends Dexie {
  syncOperations!: Table<LocalSyncOperation, string>;
  dailyReportDrafts!: Table<LocalDailyReportDraft, string>;

  constructor() {
    super("constructora_hm_offline");
    this.version(1).stores({
      syncOperations: "id, idempotencyKey, status, createdAt"
    });
    this.version(2).stores({
      syncOperations: "id, idempotencyKey, status, createdAt",
      dailyReportDrafts: "id, projectId, updatedAt"
    });
  }
}

export const offlineDb = new OfflineDatabase();