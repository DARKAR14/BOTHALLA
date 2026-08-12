import type { Logger } from "../logger.js";

export const HEALTH_PING_INTERVAL_MS = 13 * 60_000;
const HEALTH_PING_TIMEOUT_MS = 10_000;

export function startHealthPinger(url: string | undefined, logger: Logger): NodeJS.Timeout | undefined {
  if (!url) {
    logger.info("Autoconsulta de salud desactivada", { environmentVariable: "HEALTHCHECK_URL" });
    return undefined;
  }

  let running = false;
  const timer = setInterval(() => {
    if (running) return;
    running = true;
    void pingHealth(url, logger).finally(() => { running = false; });
  }, HEALTH_PING_INTERVAL_MS);

  logger.info("Autoconsulta de salud programada", {
    url,
    intervalMinutes: 13,
  });
  return timer;
}

export async function pingHealth(url: string, logger: Logger): Promise<boolean> {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "Bothalla-Health-Pinger/1.0" },
      signal: AbortSignal.timeout(HEALTH_PING_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn("Autoconsulta de salud respondió con error", {
        status: response.status,
        durationMs: Date.now() - startedAt,
      });
      return false;
    }
    logger.info("Autoconsulta de salud completada", {
      status: response.status,
      durationMs: Date.now() - startedAt,
    });
    return true;
  } catch (error) {
    logger.warn("Autoconsulta de salud falló", { error, durationMs: Date.now() - startedAt });
    return false;
  }
}
