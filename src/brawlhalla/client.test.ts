import { afterEach, describe, expect, it, vi } from "vitest";
import { Logger } from "../logger.js";
import { BrawlhallaClient } from "./client.js";
import { PlayerNotFoundError, RankedDataNotFoundError } from "./errors.js";

describe("BrawlhallaClient empty states", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("interpreta 404 de guild como jugador sin clan", async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      new Response("Player not found", { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new BrawlhallaClient("https://api.example/v1", new Logger("error"));
    await expect(client.getPlayerGuild(42)).resolves.toEqual({
      brawlhalla_id: 42,
      guild: null,
    });
    await expect(client.getPlayerGuild(42)).resolves.toEqual({
      brawlhalla_id: 42,
      guild: null,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("interpreta 404 de teams como lista vacía", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
    const client = new BrawlhallaClient("https://api.example/v1", new Logger("error"));
    await expect(client.getPlayerTeams(42)).resolves.toEqual({
      brawlhalla_id: 42,
      teams: { ranked_2v2: [] },
    });
  });

  it("distingue la ausencia de ranked de un jugador inexistente", async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      new Response("Player not found", { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new BrawlhallaClient("https://api.example/v1", new Logger("error"));
    await expect(client.getPlayerStats(42, "ranked_1v1")).rejects.toBeInstanceOf(
      RankedDataNotFoundError,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("confirma tres veces antes de declarar inexistente un perfil completo", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(async () =>
      new Response("Player not found", { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new BrawlhallaClient("https://api.example/v1", new Logger("error"));
    const result = expect(client.getPlayerStats(42)).rejects.toBeInstanceOf(
      PlayerNotFoundError,
    );
    await vi.runAllTimersAsync();
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("se recupera si Brawlhalla responde un 404 temporal", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("Player not found", { status: 404 }))
      .mockResolvedValueOnce(playerResponse());
    vi.stubGlobal("fetch", fetchMock);
    const client = new BrawlhallaClient("https://api.example/v1", new Logger("error"));

    const result = client.getPlayerStats(42);
    await vi.runAllTimersAsync();

    await expect(result).resolves.toMatchObject({ brawlhalla_id: 42, name: "Ada" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("mode=all");
  });

  it("comparte una sola petición cuando llegan consultas idénticas a la vez", async () => {
    const fetchMock = vi.fn().mockResolvedValue(playerResponse());
    vi.stubGlobal("fetch", fetchMock);
    const client = new BrawlhallaClient("https://api.example/v1", new Logger("error"));

    const [first, second] = await Promise.all([
      client.getPlayerStats(42),
      client.getPlayerStats(42),
    ]);

    expect(first.name).toBe("Ada");
    expect(second.name).toBe("Ada");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

});

function playerResponse(): Response {
  return new Response(JSON.stringify({
    brawlhalla_id: 42,
    name: "Ada",
    xp: 0,
    level: 1,
    xp_percentage: 0,
    games: 0,
    wins: 0,
    legends: [],
  }), { status: 200, headers: { "content-type": "application/json" } });
}
