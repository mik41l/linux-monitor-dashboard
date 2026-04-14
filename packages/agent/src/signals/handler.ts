import type pino from "pino";

interface SignalHandlers {
  forceCollect: () => Promise<void>;
  dumpState: () => unknown;
  reloadConfig: () => unknown;
  shutdown: () => Promise<void>;
}

export function registerSignalHandlers(logger: pino.Logger, handlers: SignalHandlers) {
  const handleSignal = (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Shutdown signal received");
    void handlers.shutdown();
  };

  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);
  process.on("SIGHUP", () => {
    logger.info({ config: handlers.reloadConfig() }, "Configuration reload requested");
  });
  process.on("SIGUSR1", () => {
    logger.info("Force collection requested");
    void handlers.forceCollect();
  });
  process.on("SIGUSR2", () => {
    logger.info({ state: handlers.dumpState() }, "Debug state dump requested");
  });
}
