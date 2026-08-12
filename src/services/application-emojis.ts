import type { ApplicationEmoji, Client } from "discord.js";

export class ApplicationEmojiService {
  private readonly emojisByName = new Map<string, ApplicationEmoji>();
  private readonly legendEmojis = new Map<string, ApplicationEmoji>();

  public async initialize(client: Client<true>): Promise<void> {
    if (!client.application) return;
    const emojis = await client.application.emojis.fetch();
    this.emojisByName.clear();
    this.legendEmojis.clear();
    for (const emoji of emojis.values()) {
      if (!emoji.name) continue;
      const normalized = normalizeEmojiKey(emoji.name);
      this.emojisByName.set(normalized, emoji);
      if (normalized.startsWith("banner_rank_") || normalized.startsWith("flag_of_")) {
        continue;
      }
      const key = normalized.startsWith("legend_")
        ? normalized.slice("legend_".length)
        : normalized;
      // Si existen ambos formatos, se conserva primero el nombre legend_* explícito.
      if (normalized.startsWith("legend_") || !this.legendEmojis.has(key)) {
        this.legendEmojis.set(key, emoji);
      }
    }
  }

  public legend(name: string): ApplicationEmoji | undefined {
    const key = legendEmojiKey(name);
    return this.legendEmojis.get(LEGEND_EMOJI_ALIASES[key] ?? key)
      ?? this.legendEmojis.get(key);
  }

  public legendMention(name: string): string {
    const emoji = this.legend(name);
    return emoji ? emoji.toString() : "";
  }

  public legendThumbnail(name: string): string | undefined {
    return this.legend(name)?.imageURL({ extension: "webp", size: 128 });
  }

  public rankMention(tier: string | null | undefined): string {
    const normalized = tier?.trim().toLocaleLowerCase("en-US") ?? "";
    const rank = ["valhallan", "diamond", "platinum", "gold", "silver", "bronze", "tin"]
      .find((candidate) => normalized === candidate || normalized.startsWith(`${candidate} `));
    return rank ? this.mention(`banner_rank_${rank}`) : "";
  }

  public regionMention(region: string | null | undefined): string {
    const emojiName = REGION_EMOJI_NAMES[region?.trim().toLocaleUpperCase("en-US") ?? ""];
    return emojiName ? this.mention(emojiName) : "";
  }

  public size(): number {
    return this.emojisByName.size;
  }

  private mention(name: string): string {
    return this.emojisByName.get(normalizeEmojiKey(name))?.toString() ?? "";
  }
}

export function legendEmojiName(name: string): string {
  return `legend_${legendEmojiKey(name)}`.slice(0, 32);
}

export function legendEmojiKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

const LEGEND_EMOJI_ALIASES: Readonly<Record<string, string>> = {
  onyx: "onix",
  queen_nai: "nai",
  sir_roland: "roland",
};

const REGION_EMOJI_NAMES: Readonly<Record<string, string>> = {
  "US-E": "flag_of_united_states",
  "US-W": "flag_of_united_states",
  USE: "flag_of_united_states",
  USW: "flag_of_united_states",
  USA: "flag_of_united_states",
  BRZ: "flag_of_brazil",
  BRA: "flag_of_brazil",
  AUS: "flag_of_australia",
  JPS: "flag_of_japan",
  JPN: "flag_of_japan",
  SEA: "flag_of_singapore",
  SGP: "flag_of_singapore",
  CAN: "flag_of_canada",
  BUL: "flag_of_bulgaria",
  FIN: "flag_of_finland",
  GER: "flag_of_germany",
  DEU: "flag_of_germany",
  NOR: "flag_of_norway",
};

function normalizeEmojiKey(name: string): string {
  return legendEmojiKey(name).slice(0, 32);
}
