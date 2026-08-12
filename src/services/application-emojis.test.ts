import { Collection } from "discord.js";
import { describe, expect, it } from "vitest";
import { ApplicationEmojiService, legendEmojiName } from "./application-emojis.js";

describe("legendEmojiName", () => {
  it("normaliza nombres para emojis de aplicación", () => {
    expect(legendEmojiName("Queen Nai")).toBe("legend_queen_nai");
    expect(legendEmojiName("Sir Roland")).toBe("legend_sir_roland");
  });

  it("respeta el máximo de 32 caracteres", () => {
    expect(legendEmojiName("A".repeat(80))).toHaveLength(32);
  });

  it("reconoce los nombres sin prefijo ya cargados en Discord", async () => {
    const emojis = new Collection([
      ["1", fakeEmoji("1", "bodvar")],
      ["2", fakeEmoji("2", "Lord_Vraxx")],
      ["3", fakeEmoji("3", "nai")],
      ["4", fakeEmoji("4", "roland")],
      ["5", fakeEmoji("5", "red_raptor")],
      ["6", fakeEmoji("6", "onix")],
      ["7", fakeEmoji("7", "Banner_Rank_Platinum")],
      ["8", fakeEmoji("8", "Flag_of_United_States")],
      ["9", fakeEmoji("9", "Flag_of_Brazil")],
    ]);
    const service = new ApplicationEmojiService();
    await service.initialize({
      application: { emojis: { fetch: async () => emojis } },
    } as never);

    expect(service.legendMention("Bödvar")).toBe("<:bodvar:1>");
    expect(service.legendMention("Lord Vraxx")).toBe("<:Lord_Vraxx:2>");
    expect(service.legendMention("Queen Nai")).toBe("<:nai:3>");
    expect(service.legendMention("Sir Roland")).toBe("<:roland:4>");
    expect(service.legendMention("Red Raptor")).toBe("<:red_raptor:5>");
    expect(service.legendMention("Onyx")).toBe("<:onix:6>");
    expect(service.rankMention("Platinum 3")).toBe("<:Banner_Rank_Platinum:7>");
    expect(service.regionMention("US-E")).toBe("<:Flag_of_United_States:8>");
    expect(service.regionMention("BRZ")).toBe("<:Flag_of_Brazil:9>");
    expect(service.regionMention("EU")).toBe("");
    expect(service.size()).toBe(9);
  });
});

function fakeEmoji(id: string, name: string) {
  return {
    id,
    name,
    toString: () => `<:${name}:${id}>`,
    imageURL: () => `https://cdn.discordapp.com/emojis/${id}.webp`,
  };
}
