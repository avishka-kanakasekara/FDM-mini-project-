import type { BatchScoreResponse } from "../types/prediction";

export interface SavedCampaignScore {
  fileName: string;
  savedAt?: string;
  result: BatchScoreResponse;
}

const DB_NAME = "bankreach";
const STORE_NAME = "campaignFile";

function storageKey(userId: string): string {
  return `bankreach.campaignFile.v1.${userId}`;
}

function isScore(value: unknown): value is BatchScoreResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const score = value as BatchScoreResponse;
  return Boolean(score.summary) && Array.isArray(score.records) && Array.isArray(score.invalid);
}

export function isSavedCampaignScore(value: unknown): value is SavedCampaignScore {
  if (!value || typeof value !== "object") {
    return false;
  }
  const saved = value as SavedCampaignScore;
  return typeof saved.fileName === "string" && isScore(saved.result);
}

export function campaignScoreTime(saved: SavedCampaignScore): number {
  const time = Date.parse(saved.savedAt ?? "");
  return Number.isNaN(time) ? 0 : time;
}

export function readCampaignScore(userId: string): SavedCampaignScore | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    return isSavedCampaignScore(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCampaignScore(userId: string, saved: SavedCampaignScore): boolean {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(saved));
    return true;
  } catch {
    try {
      localStorage.removeItem(storageKey(userId));
    } catch {
      // The browser can refuse both the write and the cleanup when storage is full.
    }
    return false;
  }
}

export function removeCampaignScore(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // Ignore a blocked storage API. The indexed copy is removed separately.
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, 1);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function readCampaignScoreDb(userId: string): Promise<SavedCampaignScore | null> {
  const db = await openDb();
  if (!db) {
    return null;
  }
  try {
    const stored = await new Promise<unknown>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(storageKey(userId));
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
    return isSavedCampaignScore(stored) ? stored : null;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export async function writeCampaignScoreDb(userId: string, saved: SavedCampaignScore): Promise<boolean> {
  const db = await openDb();
  if (!db) {
    return false;
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(saved, storageKey(userId));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

export async function removeCampaignScoreDb(userId: string): Promise<void> {
  const db = await openDb();
  if (!db) {
    return;
  }
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(storageKey(userId));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    // A failed delete leaves the previous file until the next successful score.
  } finally {
    db.close();
  }
}
