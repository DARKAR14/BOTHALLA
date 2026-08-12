import { EmbedBuilder } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import type { BrawlhallaClient } from "../brawlhalla/client.js";
import type { ApplicationEmojiService } from "../services/application-emojis.js";
import type { LegendCatalog } from "../services/legend-catalog.js";
import { RankPresenter } from "./rank-presenter.js";

const allPlayer = {
  brawlhalla_id: 6_485_815,
  name: "DARKAR14",
  games: 17_886,
  wins: 8_987,
  legends: [
    { legend_id: 1, games: 10_000, wins: 5_000, match_time: 3_055_270 },
  ],
};

const ranked1v1 = {
  brawlhalla_id: 6_485_815,
  name: "DARKAR14",
  games: 20,
  wins: 12,
  rating: 1_420,
  peak_rating: 1_480,
  region: "US-E",
  region_ranks: [],
  legends: [],
};

const ranked3v3 = {
  brawlhalla_id: 6_485_815,
  name: "DARKAR14",
  games: 4,
  wins: 3,
  rating: 1_300,
  peak_rating: 1_360,
  region: "US-E",
  region_ranks: [],
  legends: [],
};

const team = {
  brawlhalla_id_one: 6_485_815,
  brawlhalla_id_two: 5_281,
  username_one: "DARKAR14",
  username_two: "deybis5281",
  rating: 899,
  peak_rating: 928,
  tier: "Bronze 0",
  wins: 2,
  games: 3,
  region: "US-E",
  global_rank: 75_000,
};

describe("RankPresenter", () => {
  it("construye la portada con perfil, clan, 1v1, cuenta, 2v2 y rotativo", async () => {
    const presenter = createPresenter();
    const payload = await presenter.render(6_485_815, "main", "discord-user");
    const embeds = payload.embeds as EmbedBuilder[];
    const primary = embeds[0]!.toJSON();
    const secondary = embeds[1]!.toJSON();

    expect(embeds).toHaveLength(2);
    expect(primary.title).toBe("Estadísticas ranked de DARKAR14");
    expect(primary.description).toContain("Sombrero Volteao");
    expect(primary.fields?.find((field) => field.name === "Cuenta")?.value)
      .toContain("848 h 41 min 10 s");
    expect(primary.fields?.find((field) => field.name === "Cuenta")?.value)
      .toContain("8.987");
    expect(secondary.fields?.find((field) => field.name === "Ranked 2v2")?.value)
      .toContain("deybis5281");
    expect(secondary.fields?.find((field) => field.name.includes("rotativo"))?.value)
      .toContain("**3** victorias");
    expect(primary.fields?.find((field) => field.name === "Ranked 1v1")?.value)
      .toContain("<:Banner_Rank_Gold:rank>");
    expect(primary.fields?.find((field) => field.name === "Ranked 1v1")?.value)
      .toContain("<:Flag_of_United_States:region>");
    expect(primary.footer).toBeUndefined();
    expect(primary.timestamp).toBeUndefined();

    const row = payload.components?.[0]!.toJSON();
    expect(row.components.map((button) => button.label)).toEqual([
      "Principal",
      "Ranked 2v2",
      "Leyendas",
    ]);
    expect(row.components[0]?.disabled).toBe(true);
  });

  it("muestra cada equipo en la vista 2v2 y selecciona su botón", async () => {
    const presenter = createPresenter();
    const payload = await presenter.render(6_485_815, "2v2", "discord-user");
    const embed = (payload.embeds?.[0] as EmbedBuilder).toJSON();

    expect(embed.title).toBe("Ranked 2v2 de DARKAR14");
    expect(embed.description).toContain("**3** partidas");
    expect(embed.fields?.[0]?.name).toBe("DARKAR14 y deybis5281");
    expect(embed.fields?.[0]?.value).toContain("Bronze 0");
    expect(embed.fields?.[0]?.value).toContain("<:Banner_Rank_Bronze:rank>");
    expect(embed.fields?.[0]?.value).toContain("<:Flag_of_United_States:region>");
    expect(embed.footer).toBeUndefined();
    expect(embed.timestamp).toBeUndefined();
    expect(payload.components?.[0]!.toJSON().components[1]?.disabled).toBe(true);
  });
});

function createPresenter(): RankPresenter {
  const api = {
    getPlayerStats: vi.fn(async (_id: number, mode: string) => {
      if (mode === "ranked_1v1") return ranked1v1;
      if (mode === "ranked_3v3") return ranked3v3;
      return allPlayer;
    }),
    getPlayerTeams: vi.fn().mockResolvedValue({
      brawlhalla_id: 6_485_815,
      teams: { ranked_2v2: [team] },
    }),
    getPlayerGuild: vi.fn().mockResolvedValue({
      brawlhalla_id: 6_485_815,
      guild: { guild_id: 42, guild_name: "Sombrero Volteao" },
    }),
    findRankingByPlayer: vi.fn(async (_id: number, _name: string, mode: string) => ({
      players: [{ id: 6_485_815, username: "DARKAR14" }],
      rank: mode === "1v1" ? 1_200 : 2_500,
      rating: mode === "1v1" ? 1_420 : 1_300,
      best_rating: mode === "1v1" ? 1_480 : 1_360,
      wins: mode === "1v1" ? 12 : 3,
      losses: mode === "1v1" ? 8 : 1,
      region: "US-E",
      tier: mode === "1v1" ? "Gold 2" : "Silver 4",
    })),
  } as unknown as BrawlhallaClient;

  return new RankPresenter(
    api,
    { get: vi.fn() } as unknown as LegendCatalog,
    {
      legendMention: vi.fn(),
      legendThumbnail: vi.fn(),
      rankMention: vi.fn((tier: string) => tier.includes("Gold") || tier.includes("Bronze")
        ? `<:Banner_Rank_${tier.split(" ")[0]}:rank>`
        : ""),
      regionMention: vi.fn((region: string) => region === "US-E"
        ? "<:Flag_of_United_States:region>"
        : ""),
    } as unknown as ApplicationEmojiService,
  );
}
