type WebsocketMessage =
  | { type: "metric"; data: unknown }
  | { type: "event"; data: unknown }
  | { type: "alert"; data: unknown }
  | { type: "sshd-audit"; data: unknown }
  | { type: "port-scan"; data: unknown }
  | { type: "firewall-audit"; data: unknown }
  | { type: "hardening-report"; data: unknown }
  | { type: "login-activity"; data: unknown }
  | { type: "summary"; data: unknown };

interface MinimalSocket {
  readyState?: number;
  send: (payload: string) => void;
}

export class WebSocketHub {
  private readonly clients = new Set<MinimalSocket>();

  public addClient(client: MinimalSocket | null | undefined) {
    if (!client || typeof client.send !== "function") {
      return;
    }

    this.clients.add(client);
  }

  public removeClient(client: MinimalSocket | null | undefined) {
    if (!client) {
      return;
    }

    this.clients.delete(client);
  }

  public broadcast(message: WebsocketMessage) {
    const payload = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState !== undefined && client.readyState !== 1) {
        continue;
      }

      client.send(payload);
    }
  }
}
