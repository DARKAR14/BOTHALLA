import { BrawlhallaApiError } from "./errors.js";

export interface RequestGateOptions {
  maximumConcurrency: number;
  minimumStartIntervalMs: number;
  maximumPending: number;
}

interface Waiter {
  resolve(): void;
}

export class RequestGate {
  private active = 0;
  private pending = 0;
  private nextStartAt = 0;
  private readonly waiters: Waiter[] = [];
  private startSequence: Promise<void> = Promise.resolve();

  public constructor(private readonly options: RequestGateOptions) {
    if (options.maximumConcurrency <= 0 || options.maximumPending <= 0) {
      throw new Error("Los límites de RequestGate deben ser positivos.");
    }
  }

  public async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.pending >= this.options.maximumPending) {
      throw new BrawlhallaApiError(
        "Bothalla está atendiendo demasiadas consultas. Espera unos segundos e inténtalo nuevamente.",
        429,
        true,
      );
    }

    this.pending += 1;
    await this.acquire();
    try {
      await this.waitForRateSlot();
      return await task();
    } finally {
      this.pending -= 1;
      this.release();
    }
  }

  public snapshot(): { active: number; pending: number; queued: number } {
    return {
      active: this.active,
      pending: this.pending,
      queued: this.waiters.length,
    };
  }

  private async acquire(): Promise<void> {
    if (this.active < this.options.maximumConcurrency) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push({ resolve }));
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) {
      next.resolve();
      return;
    }
    this.active -= 1;
  }

  private async waitForRateSlot(): Promise<void> {
    const previous = this.startSequence;
    let release!: () => void;
    this.startSequence = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      const delay = Math.max(0, this.nextStartAt - Date.now());
      if (delay > 0) await sleep(delay);
      this.nextStartAt = Date.now() + this.options.minimumStartIntervalMs;
    } finally {
      release();
    }
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
