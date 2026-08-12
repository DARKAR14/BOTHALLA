import { describe, expect, it } from "vitest";
import { BrawlhallaApiError } from "./errors.js";
import { RequestGate } from "./request-gate.js";

describe("RequestGate", () => {
  it("limita concurrencia y rechaza cuando la cola está llena", async () => {
    const gate = new RequestGate({
      maximumConcurrency: 1,
      minimumStartIntervalMs: 0,
      maximumPending: 2,
    });
    let release!: () => void;
    const blocker = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = gate.run(async () => blocker);
    const second = gate.run(async () => "second");

    await expect(gate.run(async () => "overflow")).rejects.toBeInstanceOf(BrawlhallaApiError);
    expect(gate.snapshot()).toEqual({ active: 1, pending: 2, queued: 1 });

    release();
    await first;
    await expect(second).resolves.toBe("second");
    expect(gate.snapshot()).toEqual({ active: 0, pending: 0, queued: 0 });
  });
});
