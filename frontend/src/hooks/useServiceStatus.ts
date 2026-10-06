import { useEffect, useState } from "react";

import { getHealth } from "../services/api";
import type { HealthResponse } from "../types/prediction";

export type ServiceState = "loading" | "online" | "offline";

export function useServiceStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [state, setState] = useState<ServiceState>("loading");

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const next = await getHealth();
        if (!active) {
          return;
        }
        setHealth(next);
        setState(next.status === "healthy" && next.model_loaded ? "online" : "offline");
      } catch {
        if (!active) {
          return;
        }
        setHealth(null);
        setState("offline");
      }
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return { health, state };
}
