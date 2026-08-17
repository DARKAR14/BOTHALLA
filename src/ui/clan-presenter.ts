import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type InteractionEditReplyOptions,
} from "discord.js";
import type { BrawlhallaClient } from "../brawlhalla/client.js";
import type { GuildMember, GuildStats } from "../brawlhalla/types.js";
import type { GuildSessionIndex } from "../services/guild-index.js";
import { COLORS } from "./colors.js";
import { componentId, type ClanView } from "./custom-ids.js";
import { discordDate, formatNumber, truncate } from "./format.js";

const MEMBERS_PER_PAGE = 6;

export class ClanPresenter {
  public constructor(
    private readonly api: BrawlhallaClient,
    private readonly index: GuildSessionIndex,
  ) {}

  public async render(
    guildId: number,
    view: ClanView,
    ownerId: string,
    requestedPage = 0,
  ): Promise<InteractionEditReplyOptions> {
    const [guild, membersResponse] = await Promise.all([
      this.api.getGuildStats(guildId),
      this.api.getGuildMembers(guildId),
    ]);
    this.index.remember(guild);

    const members = [...membersResponse.guild_members].sort(
      (a, b) => b.guild_points - a.guild_points,
    );
    const pageCount = Math.max(1, Math.ceil(members.length / MEMBERS_PER_PAGE));
    const page = Math.min(Math.max(requestedPage, 0), pageCount - 1);
    const embed = view === "members"
      ? this.membersEmbed(guild, members, page, pageCount)
      : this.overviewEmbed(guild, members);

    const components: ActionRowBuilder<ButtonBuilder>[] = [
      this.navigation(ownerId, guildId, view),
    ];
    if (view === "members" && pageCount > 1) {
      components.push(this.pagination(ownerId, guildId, page, pageCount));
    }

    return { embeds: [embed], components };
  }

  private overviewEmbed(guild: GuildStats, members: GuildMember[]): EmbedBuilder {
    const leaders = members.filter((member) =>
      ["leader", "officer"].includes(member.rank.toLocaleLowerCase("en-US")),
    );
    const embed = new EmbedBuilder()
      .setColor(COLORS.brand)
      .setTitle(guild.name || `Clan #${guild.guild_id}`)
      .setDescription(guild.notice ? truncate(guild.notice, 500) : "Sin anuncio del clan.")
      .addFields(
        { name: "Clan ID", value: formatNumber(guild.guild_id), inline: true },
        { name: "Puesto", value: `#${formatNumber(guild.rank)}`, inline: true },
        { name: "Miembros", value: formatNumber(guild.member_count), inline: true },
        { name: "XP", value: formatNumber(guild.xp), inline: true },
        { name: "XP histórico", value: formatNumber(guild.legacy_xp), inline: true },
        { name: "Puntos del clan", value: formatNumber(guild.guild_points), inline: true },
        { name: "Creado", value: discordDate(guild.create_date), inline: true },
        {
          name: "Reclutamiento",
          value: guild.is_recruiting ? "Abierto" : "Cerrado o sin datos",
          inline: true,
        },
        {
          name: "Etiquetas",
          value: guild.tags?.length ? guild.tags.map((tag) => `\`${tag}\``).join(" ") : "Sin etiquetas",
        },
        {
          name: "Liderazgo",
          value: leaders.length
            ? leaders.slice(0, 8).map((member) => `**${member.name ?? `ID ${member.brawlhalla_id}`}** · ${member.rank}`).join("\n")
            : "Sin datos de liderazgo",
        },
      );

    if (guild.discord_invite_code) {
      embed.addFields({
        name: "Discord del clan",
        value: `https://discord.gg/${guild.discord_invite_code}`,
      });
    }
    return embed;
  }

  private membersEmbed(
    guild: GuildStats,
    members: GuildMember[],
    page: number,
    pageCount: number,
  ): EmbedBuilder {
    const items = members.slice(page * MEMBERS_PER_PAGE, (page + 1) * MEMBERS_PER_PAGE);
    const embed = new EmbedBuilder()
      .setColor(COLORS.brand)
      .setTitle(`${guild.name || `Clan #${guild.guild_id}`} · Miembros`)
      .setDescription("Ordenados por puntos del clan.");

    for (const member of items) {
      embed.addFields({
        name: `${member.name ?? `Jugador #${member.brawlhalla_id}`} · ${member.rank}`,
        value: `ID **${member.brawlhalla_id}** · ${formatNumber(member.guild_points)} puntos · ${formatNumber(member.xp)} XP\nIngresó ${discordDate(member.join_date)}`,
      });
    }

    return embed;
  }

  private navigation(
    ownerId: string,
    guildId: number,
    current: ClanView,
  ): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(componentId("clan", "overview", ownerId, guildId))
        .setLabel("Resumen")
        .setStyle(current === "overview" ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(current === "overview"),
      new ButtonBuilder()
        .setCustomId(componentId("clan", "members", ownerId, guildId))
        .setLabel("Miembros")
        .setStyle(current === "members" ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(current === "members"),
    );
  }

  private pagination(
    ownerId: string,
    guildId: number,
    page: number,
    pageCount: number,
  ): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${componentId("clan", "members", ownerId, guildId, page - 1)}:previous`)
        .setLabel("Anterior")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`${componentId("clan", "members", ownerId, guildId, page + 1)}:next`)
        .setLabel("Siguiente")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= pageCount - 1),
    );
  }
}
