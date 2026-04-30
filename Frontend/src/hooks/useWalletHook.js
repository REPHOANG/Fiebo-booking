import { useEffect, useRef } from "react";

export default function useWalletStream(userId, onTopup) {
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const url = `${API_BASE_URL}/api/wallet/stream?userId=${userId}`;
    const es = new EventSource(url);

    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        console.log("SSE:", data);

        if (data.type === "wallet_topup") {
          onTopup?.(data.amount);
        }
      } catch (err) {
        console.error("Parse SSE error", err);
      }
    };

    es.onerror = (err) => {
      console.error("SSE error:", err);
    };

    return () => {
      es.close();
    };
  }, [userId, onTopup]);
}