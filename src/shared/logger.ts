import { LOG_PREFIX } from "./constants";

const SENSITIVE = /cookie|auth|token|bearer|password|credential|authorization|header/i;

export const isDev = Boolean(import.meta.env?.DEV);

function sanitize(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitize);

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE.test(key)) continue;
    out[key] = sanitize(nested);
  }
  return out;
}

export function logInfo(message: string, extra?: Record<string, unknown>): void {
  if (!isDev) return;
  if (extra) {
    console.log(LOG_PREFIX, message, sanitize(extra));
    return;
  }
  console.log(LOG_PREFIX, message);
}

export function logWarn(message: string, extra?: Record<string, unknown>): void {
  if (!isDev) return;
  if (extra) {
    console.warn(LOG_PREFIX, message, sanitize(extra));
    return;
  }
  console.warn(LOG_PREFIX, message);
}
