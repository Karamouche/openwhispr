import { useState, useCallback, useEffect } from "react";

interface ReasoningRetryPayload {
  text: string;
  model: string;
  agentName: string | null;
  config: Record<string, unknown>;
}

const STORAGE_KEY = "pendingReasoningInput";

export function useReasoningRetry() {
  const [retryPayload, setRetryPayload] = useState<ReasoningRetryPayload | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRetryPayload(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const clearRetry = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setRetryPayload(null);
  }, []);

  const refreshRetry = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRetryPayload(JSON.parse(stored));
      } else {
        setRetryPayload(null);
      }
    } catch {
      setRetryPayload(null);
    }
  }, []);

  return {
    hasPendingRetry: retryPayload !== null,
    retryPayload,
    clearRetry,
    refreshRetry,
  };
}
