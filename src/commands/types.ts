import type { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type { BrawlhallaClient } from "../brawlhalla/client.js";
import type { ProfileRepository } from "../database/profiles.js";
import type { GuildSessionIndex } from "../services/guild-index.js";
import type { ApplicationEmojiService } from "../services/application-emojis.js";
import type { ClanPresenter } from "../ui/clan-presenter.js";
import type { RankPresenter } from "../ui/rank-presenter.js";
import type { StatsPresenter } from "../ui/stats-presenter.js";

export interface CommandContext {
  api: BrawlhallaClient;
  profiles: ProfileRepository;
  guildIndex: GuildSessionIndex;
  statsPresenter: StatsPresenter;
  rankPresenter: RankPresenter;
  clanPresenter: ClanPresenter;
  emojis: ApplicationEmojiService;
  developerIds: ReadonlySet<string>;
}

export type CommandAccess = "public" | "developer";

export interface BotCommand {
  access: CommandAccess;
  data: {
    readonly name: string;
    toJSON(): ReturnType<SlashCommandBuilder["toJSON"]>;
  };
  execute(interaction: ChatInputCommandInteraction, context: CommandContext): Promise<void>;
}

export interface AdminSubcommand {
  access: "admin";
  commandName: string;
  subcommandName: string;
  apply(command: SlashCommandBuilder): void;
  execute(interaction: ChatInputCommandInteraction, context: CommandContext): Promise<void>;
}
