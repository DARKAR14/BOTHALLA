import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type InteractionEditReplyOptions,
} from "discord.js";
import type { BrawlhallaClient } from "../brawlhalla/client.js";
import type { LegendStats, PlayerStats } from "../brawlhalla/types.js";
import type { ApplicationEmojiService } from "../services/application-emojis.js";
import type { LegendCatalog } from "../services/legend-catalog.js";
import { COLORS } from "./colors.js";
import { componentId, type StatsView } from "./custom-ids.js";
import { formatDuration, formatNumber, formatPercent, winRate } from "./format.js";

const LEGENDS_PER_PAGE = 5;

export class StatsPresenter {
  public constructor(
    private readonly api: BrawlhallaClient,
    private readonly legends: LegendCatalog,
    private readonly emojis: ApplicationEmojiService,
  ) {}

  public async render(
    brawlhallaId: number,
    view: StatsView,
    ownerId: string,
    requestedPage = 0,
  ): Promise<InteractionEditReplyOptions> {
    const player = await this.api.getPlayerStats(brawlhallaId, "all");
    const sortedLegends = [...player.legends].sort(
      (a, b) => (b.games ?? 0) - (a.games ?? 0),
    );
    const pageCount = Math.max(1, Math.ceil(sortedLegends.length / LEGENDS_PER_PAGE));
    const page = Math.min(Math.max(requestedPage, 0), pageCount - 1);

    let embed: EmbedBuilder;
    if (view === "legends") embed = this.legendsEmbed(player, sortedLegends, page, pageCount);
    else if (view === "combat") embed = this.combatEmbed(player);
    else if (view === "guild") embed = await this.guildEmbed(player);
    else embed = this.overviewEmbed(player, sortedLegends);

    const components: ActionRowBuilder<ButtonBuilder>[] = [
      this.navigation(ownerId, brawlhallaId, view),
    ];
    if (view === "legends" && pageCount > 1) {
      components.push(this.pagination(ownerId, brawlhallaId, page, pageCount));
    }

    return { embeds: [embed], components };
  }

  private overviewEmbed(player: PlayerStats, sortedLegends: LegendStats[]): EmbedBuilder {
    const top = sortedLegends.slice(0, 3);
    const topLines = top.length
      ? top.map((legend, index) => this.legendSummary(legend, index + 1)).join("\n")
      : "Todavía no hay leyendas registradas.";
    const topLegend = top[0] ? this.legends.get(top[0].legend_id) : undefined;
    const thumbnail = topLegend ? this.emojis.legendThumbnail(topLegend.bio_name) : undefined;

    const embed = baseStatsEmbed(player)
      .setTitle(`${player.name} · Estadísticas`)
      .setDescription(`Brawlhalla ID **${player.brawlhalla_id}**`)
      .addFields(
        { name: "Partidas", value: formatNumber(player.games), inline: true },
        { name: "Victorias", value: formatNumber(player.wins), inline: true },
        { name: "Tasa de victorias", value: winRate(player.wins, player.games), inline: true },
        { name: "Nivel", value: formatNumber(player.level), inline: true },
        {
          name: "Progreso del nivel",
          value: formatPercent(player.xp_percentage ?? 0),
          inline: true,
        },
        { name: "XP total", value: formatNumber(player.xp), inline: true },
        { name: "Leyendas más usadas", value: topLines },
      );
    if (thumbnail) embed.setThumbnail(thumbnail);
    return embed;
  }

  private legendsEmbed(
    player: PlayerStats,
    legends: LegendStats[],
    page: number,
    pageCount: number,
  ): EmbedBuilder {
    const pageItems = legends.slice(page * LEGENDS_PER_PAGE, (page + 1) * LEGENDS_PER_PAGE);
    const embed = baseStatsEmbed(player)
      .setTitle(`${player.name} · Leyendas`)
      .setDescription(
        pageItems.length
          ? "Ordenadas por partidas jugadas."
          : "No hay datos de leyendas disponibles para este jugador.",
      );

    for (const legend of pageItems) {
      const data = this.legends.get(legend.legend_id);
      const name = data?.bio_name ?? `Leyenda #${legend.legend_id}`;
      const emoji = this.emojis.legendMention(name);
      embed.addFields({
        name: `${emoji ? `${emoji} ` : ""}${name}`,
        value: [
          `Nivel **${formatNumber(legend.level)}** · ${formatNumber(legend.games)} partidas · ${winRate(legend.wins, legend.games)}`,
          `${formatNumber(legend.kos)} KOs · ${formatNumber(legend.damage_dealt)} daño · ${formatDuration(legend.match_time)}`,
          data ? `${data.weapon_one} / ${data.weapon_two}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }

    return embed;
  }

  private combatEmbed(player: PlayerStats): EmbedBuilder {
    const totals = player.legends.reduce(
      (sum, legend) => ({
        kos: sum.kos + (legend.kos ?? 0),
        falls: sum.falls + (legend.falls ?? 0),
        damageDealt: sum.damageDealt + (legend.damage_dealt ?? 0),
        damageTaken: sum.damageTaken + (legend.damage_taken ?? 0),
        suicides: sum.suicides + (legend.suicides ?? 0),
        teamKos: sum.teamKos + (legend.team_kos ?? 0),
        matchTime: sum.matchTime + (legend.match_time ?? 0),
      }),
      { kos: 0, falls: 0, damageDealt: 0, damageTaken: 0, suicides: 0, teamKos: 0, matchTime: 0 },
    );

    return baseStatsEmbed(player)
      .setTitle(`${player.name} · Combate`)
      .setDescription("Totales acumulados a partir de las estadísticas de sus leyendas.")
      .addFields(
        { name: "KOs", value: formatNumber(totals.kos), inline: true },
        { name: "Caídas", value: formatNumber(totals.falls), inline: true },
        {
          name: "Relación KOs/caídas",
          value: totals.falls ? (totals.kos / totals.falls).toFixed(2) : "Sin datos",
          inline: true,
        },
        { name: "Daño causado", value: formatNumber(totals.damageDealt), inline: true },
        { name: "Daño recibido", value: formatNumber(totals.damageTaken), inline: true },
        { name: "Tiempo en partida", value: formatDuration(totals.matchTime), inline: true },
        { name: "Suicidios", value: formatNumber(totals.suicides), inline: true },
        { name: "KOs de equipo", value: formatNumber(totals.teamKos), inline: true },
        {
          name: "Gadgets",
          value: [
            `Bombas: ${formatNumber(player.ko_bomb)} KOs / ${formatNumber(player.damage_bomb)} daño`,
            `Minas: ${formatNumber(player.ko_mine)} KOs / ${formatNumber(player.damage_mine)} daño`,
            `Spikeballs: ${formatNumber(player.ko_spikeball)} KOs / ${formatNumber(player.damage_spikeball)} daño`,
          ].join("\n"),
        },
      );
  }

  private async guildEmbed(player: PlayerStats): Promise<EmbedBuilder> {
    const response = await this.api.getPlayerGuild(player.brawlhalla_id);
    const embed = baseStatsEmbed(player).setTitle(`${player.name} · Clan`);
    if (!response.guild) {
      return embed.setDescription("Este jugador no pertenece a un clan o la API no tiene el dato disponible.");
    }

    const guild = response.guild;
    return embed
      .setDescription(`**${guild.guild_name ?? `Clan #${guild.guild_id}`}**`)
      .addFields(
        { name: "Rango", value: guild.rank, inline: true },
        { name: "XP personal", value: formatNumber(guild.personal_xp), inline: true },
        {
          name: "XP esta semana",
          value: formatNumber(guild.personal_xp_this_week),
          inline: true,
        },
        { name: "Puntos del clan", value: formatNumber(guild.personal_points), inline: true },
        { name: "Clan ID", value: formatNumber(guild.guild_id), inline: true },
      );
  }

  private legendSummary(legend: LegendStats, position: number): string {
    const data = this.legends.get(legend.legend_id);
    const name = data?.bio_name ?? `Leyenda #${legend.legend_id}`;
    const emoji = this.emojis.legendMention(name);
    return `**${position}.** ${emoji ? `${emoji} ` : ""}**${name}** · ${formatNumber(legend.games)} partidas · ${winRate(legend.wins, legend.games)}`;
  }

  private navigation(
    ownerId: string,
    brawlhallaId: number,
    current: StatsView,
  ): ActionRowBuilder<ButtonBuilder> {
    const definitions: Array<[StatsView, string]> = [
      ["overview", "Resumen"],
      ["legends", "Leyendas"],
      ["combat", "Combate"],
      ["guild", "Clan"],
    ];
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      definitions.map(([view, label]) =>
        new ButtonBuilder()
          .setCustomId(componentId("stats", view, ownerId, brawlhallaId))
          .setLabel(label)
          .setStyle(view === current ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(view === current),
      ),
    );
  }

  private pagination(
    ownerId: string,
    brawlhallaId: number,
    page: number,
    pageCount: number,
  ): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${componentId("stats", "legends", ownerId, brawlhallaId, page - 1)}:previous`)
        .setLabel("Anterior")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`${componentId("stats", "legends", ownerId, brawlhallaId, page + 1)}:next`)
        .setLabel("Siguiente")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= pageCount - 1),
    );
  }
}

function baseStatsEmbed(player: PlayerStats): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.brand);
}
