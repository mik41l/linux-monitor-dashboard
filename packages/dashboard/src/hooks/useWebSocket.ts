import { useEffect, useRef } from "react";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:5005/ws";

export function useWebSocket(onMessage: (payload: unknown) => void) {
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let closedByApp = false;

    const connect = () => {
      socket = new WebSocket(WS_URL);

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as unknown;
          onMessageRef.current(payload);
        } catch {
          // Ignore malformed frames.
        }
      };

      socket.onclose = () => {
        if (closedByApp) {
          return;
        }

        reconnectTimer = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      closedByApp = true;

      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }

      socket?.close();
    };
  }, []);
}
