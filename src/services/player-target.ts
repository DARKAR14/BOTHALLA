import type { ChatInputCommandInteraction } from "discord.js";
import type { BrawlhallaClient } from "../brawlhalla/client.js";
import { LinkedProfileNotFoundError } from "../brawlhalla/errors.js";
import type { PlayerSearchMatch } from "../brawlhalla/types.js";
import type { ProfileRepository } from "../database/profiles.js";

export type PlayerTargetResolution =
  | { kind: "resolved"; brawlhallaId: number }
  | { kind: "choices"; matches: PlayerSearchMatch[] };

export async function resolvePlayerTarget(
  interaction: ChatInputCommandInteraction,
  profiles: ProfileRepository,
  api: BrawlhallaClient,
): Promise<PlayerTargetResolution> {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "id") {
    return {
      kind: "resolved",
      brawlhallaId: interaction.options.getInteger("brawlhalla_id", true),
    };
  }

  if (subcommand === "self") {
    return {
      kind: "resolved",
      brawlhallaId: await linkedId(profiles, interaction.user.id),
    };
  }

  if (subcommand === "mention") {
    const user = interaction.options.getUser("usuario", true);
    return { kind: "resolved", brawlhallaId: await linkedId(profiles, user.id) };
  }

  if (subcommand === "username") {
    const username = interaction.options.getString("nombre", true);
    const matches = await api.searchPlayers(username);
    if (matches.length === 1) {
      return { kind: "resolved", brawlhallaId: matches[0]!.id };
    }
    return { kind: "choices", matches };
  }

  throw new Error(`Subcomando no compatible: ${subcommand}`);
}

async function linkedId(profiles: ProfileRepository, discordUserId: string): Promise<number> {
  const profile = await profiles.findByDiscordUserId(discordUserId);
  if (!profile) throw new LinkedProfileNotFoundError(discordUserId);
  return profile.brawlhallaId;
}
