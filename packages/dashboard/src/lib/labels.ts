import type { TranslationKey } from "../i18n/translations.js";

type Translator = (key: TranslationKey) => string;

export function translateSeverity(severity: string, t: Translator) {
  if (severity === "critical") {
    return t("criticalSeverity");
  }

  if (severity === "warning") {
    return t("warningSeverity");
  }

  if (severity === "info") {
    return t("infoSeverity");
  }

  return severity;
}

export function translateAgentStatus(status: string, t: Translator) {
  if (status === "online") {
    return t("statusOnline");
  }

  if (status === "offline") {
    return t("statusOffline");
  }

  return status;
}

export function translateAuditStatus(status: string, t: Translator) {
  if (status === "ok") {
    return t("statusOk");
  }

  if (status === "warning") {
    return t("warningSeverity");
  }

  if (status === "critical") {
    return t("criticalSeverity");
  }

  if (status === "unavailable") {
    return t("statusUnavailable");
  }

  if (status === "open") {
    return t("statusOpen");
  }

  if (status === "resolved") {
    return t("statusResolved");
  }

  return status;
}

export function translateRiskLevel(level: string, t: Translator) {
  if (level === "safe") {
    return t("riskSafe");
  }

  if (level === "warning") {
    return t("warningSeverity");
  }

  if (level === "danger") {
    return t("riskDanger");
  }

  return level;
}
