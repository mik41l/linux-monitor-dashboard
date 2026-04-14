import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";

import { WebSocketHub } from "./ws-hub.js";

interface SocketCandidate {
  readyState?: number;
  send: (payload: string) => void;
  on: (event: "close", callback: () => void) => void;
}

export async function registerWebSocketServer(app: FastifyInstance, hub: WebSocketHub) {
  await app.register(websocket);

  app.get(
    "/ws",
    { websocket: true },
    (connection: {
      readyState?: number;
      send?: (payload: string) => void;
      on?: (event: "close", callback: () => void) => void;
      socket?: SocketCandidate;
    }) => {
      const socket = connection.socket ?? connection;

      if (typeof socket.send !== "function" || typeof socket.on !== "function") {
        return;
      }

      const liveSocket = socket as SocketCandidate;

      hub.addClient(liveSocket);

      liveSocket.send(
        JSON.stringify({
          type: "summary",
          data: {
            connected: true
          }
        })
      );

      liveSocket.on("close", () => {
        hub.removeClient(liveSocket);
      });
    }
  );
}
