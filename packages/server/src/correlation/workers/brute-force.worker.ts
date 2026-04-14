import type { MessagePort } from "node:worker_threads";
import { workerData } from "node:worker_threads";

import type { SecurityEvent } from "@monitor/shared";

import { applyBruteForceRule } from "../rules/brute-force.rule.js";

interface Payload {
  type: "event";
  data: SecurityEvent;
}

const port = workerData.port as MessagePort;
const failures = new Map<string, number[]>();

port.on("message", (payload: Payload) => {
  if (payload.type !== "event") {
    return;
  }

  const candidate = applyBruteForceRule(failures, payload.data);

  if (candidate) {
    port.postMessage({
      type: "alert-candidate",
      candidate
    });
  }
});

port.start();
