import type { MessagePort } from "node:worker_threads";
import { workerData } from "node:worker_threads";

import type { SecurityEvent } from "@monitor/shared";

import {
  applyCrossServerRule,
  type CrossServerWindowEntry
} from "../rules/cross-server.rule.js";

interface Payload {
  type: "event";
  data: SecurityEvent;
}

const port = workerData.port as MessagePort;
const eventWindow = new Map<string, CrossServerWindowEntry[]>();

port.on("message", (payload: Payload) => {
  if (payload.type !== "event") {
    return;
  }

  const candidate = applyCrossServerRule(eventWindow, payload.data);

  if (candidate) {
    port.postMessage({
      type: "alert-candidate",
      candidate
    });
  }
});

port.start();
