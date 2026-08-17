import { MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import command from "./public/rank.command.js";
import { loadCommands } from "./loader.js";
import type { CommandContext } from "./types.js";

describe("/rank self", () => {
  it("fusiona roles desde la carpeta admin sin duplicar el comando público", async () => {
    const commands = await loadCommands();
    const json = commands.get("rank")!.data.toJSON();
    expect(json.options?.some((option) => option.name === "roles")).toBe(true);
    expect(commands.get("rank")!.access).toBe("public");
  });

  it("responde en privado y abre la portada ranked", async () => {
    const deferReply = vi.fn().mockResolvedValue(undefined);
    const editReply = vi.fn().mockResolvedValue(undefined);
    const render = vi.fn().mockResolvedValue({ embeds: [], components: [] });
    const interaction = {
      user: { id: "discord-user" },
      options: {
        getSubcommand: vi.fn().mockReturnValue("self"),
      },
      deferReply,
      editReply,
    };
    const context = {
      profiles: {
        findByDiscordUserId: vi.fn().mockResolvedValue({
          discordUserId: "discord-user",
          brawlhallaId: 6_485_815,
        }),
      },
      api: {},
      rankPresenter: { render },
    } as unknown as CommandContext;

    await command.execute(interaction as never, context);

    expect(deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    expect(render).toHaveBeenCalledWith(6_485_815, "main", "discord-user");
    expect(editReply).toHaveBeenCalledOnce();
  });
});
