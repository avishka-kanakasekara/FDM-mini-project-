import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAuthUserId } from "../auth/AuthProvider";
import type { PredictionRequest, PredictionResponse } from "../types/prediction";

function storageKey(userId: string): string {
  return `bankreach.callList.v1.${userId}`;
}

export interface CallListItem {
  id: string;
  addedAt: string;
  request: PredictionRequest;
  result: PredictionResponse;
}

interface CallListContextValue {
  items: CallListItem[];
  add: (request: PredictionRequest, result: PredictionResponse) => "added" | "updated";
  addMany: (entries: { request: PredictionRequest; result: PredictionResponse }[]) => { added: number; updated: number };
  remove: (id: string) => void;
  clear: () => void;
  contains: (request: PredictionRequest) => boolean;
}

const CallListContext = createContext<CallListContextValue | null>(null);

function sameCustomer(left: PredictionRequest, right: PredictionRequest): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function readStored(userId: string): CallListItem[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as CallListItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CallListProvider({ children }: { children: ReactNode }) {
  const userId = useAuthUserId();
  const storedFor = useRef(userId);
  const [items, setItems] = useState<CallListItem[]>(() => readStored(userId));

  useEffect(() => {
    if (storedFor.current !== userId) {
      storedFor.current = userId;
      setItems(readStored(userId));
      return;
    }
    localStorage.setItem(storageKey(userId), JSON.stringify(items));
  }, [items, userId]);

  const value = useMemo<CallListContextValue>(() => {
    return {
      items: [...items].sort((left, right) => right.result.probability - left.result.probability),
      add(request, result) {
        const existing = items.find((item) => sameCustomer(item.request, request));
        if (existing) {
          setItems((current) =>
            current.map((item) =>
              item.id === existing.id ? { ...item, result, addedAt: new Date().toISOString() } : item,
            ),
          );
          return "updated";
        }
        const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
        setItems((current) => [...current, { id, addedAt: new Date().toISOString(), request, result }]);
        return "added";
      },
      addMany(entries) {
        const now = new Date().toISOString();
        const next = [...items];
        let added = 0;
        let updated = 0;
        entries.forEach((entry) => {
          const index = next.findIndex((item) => sameCustomer(item.request, entry.request));
          if (index >= 0) {
            next[index] = { ...next[index], result: entry.result, addedAt: now };
            updated += 1;
            return;
          }
          const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${added}`;
          next.push({ id, addedAt: now, request: entry.request, result: entry.result });
          added += 1;
        });
        setItems(next);
        return { added, updated };
      },
      remove(id) {
        setItems((current) => current.filter((item) => item.id !== id));
      },
      clear() {
        setItems([]);
      },
      contains(request) {
        return items.some((item) => sameCustomer(item.request, request));
      },
    };
  }, [items]);

  return <CallListContext.Provider value={value}>{children}</CallListContext.Provider>;
}

export function useCallList(): CallListContextValue {
  const context = useContext(CallListContext);
  if (!context) {
    throw new Error("useCallList must be used within CallListProvider");
  }
  return context;
}
