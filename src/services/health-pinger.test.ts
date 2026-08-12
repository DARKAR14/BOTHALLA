import { afterEach, describe, expect, it, vi } from "vitest";
import { Logger } from "../logger.js";
import { pingHealth } from "./health-pinger.js";

describe("health pinger", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("consulta la URL configurada mediante GET", async () => {
    const request = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", request);

    await expect(pingHealth("https://bothalla.onrender.com/healt", new Logger("error")))
      .resolves.toBe(true);
    expect(request).toHaveBeenCalledWith(
      "https://bothalla.onrender.com/healt",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("no lanza una excepción cuando el servicio no responde", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(pingHealth("https://bothalla.onrender.com/healt", new Logger("error")))
      .resolves.toBe(false);
  });
});
