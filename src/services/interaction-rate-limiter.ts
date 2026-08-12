export interface InteractionRateDecision {
  allowed: boolean;
  retryAfterMs: number;
}

export class InteractionRateLimiter {
  private readonly events = new Map<string, number[]>();
  private checks = 0;

  public constructor(
    private readonly maximumEvents = 5,
    private readonly windowMs = 10_000,
  ) {
    if (!Number.isSafeInteger(maximumEvents) || maximumEvents <= 0 || windowMs <= 0) {
      throw new Error("Los límites de interacción deben ser positivos.");
    }
  }

  public consume(userId: string, now = Date.now()): InteractionRateDecision {
    const cutoff = now - this.windowMs;
    const recent = (this.events.get(userId) ?? []).filter((timestamp) => timestamp > cutoff);

    if (recent.length >= this.maximumEvents) {
      this.events.set(userId, recent);
      return {
        allowed: false,
        retryAfterMs: Math.max(1, recent[0]! + this.windowMs - now),
      };
    }

    recent.push(now);
    this.events.set(userId, recent);
    this.checks += 1;
    if (this.checks % 250 === 0) this.prune(cutoff);
    return { allowed: true, retryAfterMs: 0 };
  }

  private prune(cutoff: number): void {
    for (const [userId, timestamps] of this.events) {
      const recent = timestamps.filter((timestamp) => timestamp > cutoff);
      if (recent.length === 0) this.events.delete(userId);
      else this.events.set(userId, recent);
    }
  }
}
