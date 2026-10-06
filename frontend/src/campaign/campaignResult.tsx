import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAuthUserId } from "../auth/AuthProvider";
import type { BatchScoreResponse } from "../types/prediction";
import {
  campaignScoreTime,
  readCampaignScore,
  readCampaignScoreDb,
  removeCampaignScore,
  removeCampaignScoreDb,
  writeCampaignScore,
  writeCampaignScoreDb,
  type SavedCampaignScore,
} from "./campaignStore";

export type { SavedCampaignScore };

interface CampaignResultContextValue {
  saved: SavedCampaignScore | null;
  ready: boolean;
  save: (fileName: string, result: BatchScoreResponse) => void;
  clear: () => void;
}

const CampaignResultContext = createContext<CampaignResultContextValue | null>(null);

export function CampaignResultProvider({ children }: { children: ReactNode }) {
  const userId = useAuthUserId();
  const loadId = useRef(0);
  const [saved, setSaved] = useState<SavedCampaignScore | null>(() => readCampaignScore(userId));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = loadId.current + 1;
    loadId.current = id;
    let active = true;
    const local = readCampaignScore(userId);
    setSaved(local);
    setReady(false);
    readCampaignScoreDb(userId)
      .then((fromDb) => {
        if (!active || loadId.current !== id || !fromDb) {
          return;
        }
        setSaved((current) => {
          if (!current || campaignScoreTime(fromDb) >= campaignScoreTime(current)) {
            return fromDb;
          }
          return current;
        });
        if (local && campaignScoreTime(local) > campaignScoreTime(fromDb)) {
          void writeCampaignScoreDb(userId, local);
        }
      })
      .finally(() => {
        if (active && loadId.current === id) {
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const value = useMemo<CampaignResultContextValue>(
    () => ({
      saved,
      ready,
      save(fileName, result) {
        const next = { fileName, savedAt: new Date().toISOString(), result };
        loadId.current += 1;
        setSaved(next);
        setReady(true);
        writeCampaignScore(userId, next);
        void writeCampaignScoreDb(userId, next);
      },
      clear() {
        loadId.current += 1;
        setSaved(null);
        setReady(true);
        removeCampaignScore(userId);
        void removeCampaignScoreDb(userId);
      },
    }),
    [ready, saved, userId],
  );

  return <CampaignResultContext.Provider value={value}>{children}</CampaignResultContext.Provider>;
}

export function useCampaignResult(): CampaignResultContextValue {
  const context = useContext(CampaignResultContext);
  if (!context) {
    throw new Error("useCampaignResult must be used within CampaignResultProvider");
  }
  return context;
}
