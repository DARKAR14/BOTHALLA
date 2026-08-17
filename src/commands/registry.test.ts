import { Collection, type Client } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { loadCommands } from "./loader.js";
import { syncCommands } from "./registry.js";

describe("command registry", () => {
  it("sincroniza globalmente todos los módulos descubiertos", async () => {
    const commands = await loadCommands();
    const set = vi.fn().mockResolvedValue(
      new Collection(commands.map((command, name) => [name, command])),
    );
    const guildSet = vi.fn().mockResolvedValue(new Collection());
    const client = {
      application: { commands: { set } },
      guilds: {
        cache: new Collection([["guild-1", { id: "guild-1", commands: { set: guildSet } }]]),
      },
    } as unknown as Client<true>;

    const result = await syncCommands(client, commands);

    expect(set).toHaveBeenCalledOnce();
    expect(guildSet).toHaveBeenCalledOnce();
    expect(guildSet).toHaveBeenCalledWith([]);
    expect(set.mock.calls[0]?.[0]).toHaveLength(6);
    expect(result).toEqual({
      count: 6,
      scope: "global",
      guildsCleaned: 1,
    });
  });
});
