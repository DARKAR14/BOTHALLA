import { Collection, PermissionFlagsBits } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import command from "./public/role.command.js";
import type { CommandContext } from "./types.js";

describe("/role self", () => {
  it("asigna el rol base del tier ranked 1v1 vinculado", async () => {
    const platinum = {
      id: "platinum",
      name: "Platinum",
      editable: true,
      toString: () => "<@&platinum>",
    };
    const add = vi.fn().mockResolvedValue(undefined);
    const bot = {
      permissions: {
        has: (permission: bigint) => permission === PermissionFlagsBits.ManageRoles,
      },
    };
    const guild = {
      members: {
        fetchMe: vi.fn().mockResolvedValue(bot),
        fetch: vi.fn(),
      },
      roles: {
        fetch: vi.fn().mockResolvedValue(new Collection([[platinum.id, platinum]])),
      },
    };
    const member = {
      guild,
      manageable: true,
      roles: {
        cache: new Collection(),
        remove: vi.fn(),
        add,
      },
    };
    guild.members.fetch.mockResolvedValue(member);
    const editReply = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      user: { id: "discord-user" },
      guild,
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply,
    };
    const context = {
      profiles: {
        findByDiscordUserId: vi.fn().mockResolvedValue({ brawlhallaId: 6_485_815 }),
      },
      api: {
        getPlayerStats: vi.fn().mockResolvedValue({
          brawlhalla_id: 6_485_815,
          name: "DARKAR14",
          games: 10,
          wins: 6,
          legends: [],
          rating: 1_750,
          tier: "Platinum 2",
        }),
        findRankingByPlayer: vi.fn().mockResolvedValue(undefined),
      },
      emojis: {
        rankMention: vi.fn().mockReturnValue("<:Banner_Rank_Platinum:rank>"),
      },
    } as unknown as CommandContext;

    await command.execute(interaction as never, context);

    expect(add).toHaveBeenCalledWith(platinum, expect.stringContaining("Platinum"));
    expect(editReply).toHaveBeenCalledOnce();
  });
});
