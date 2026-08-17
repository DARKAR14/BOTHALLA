import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type InteractionEditReplyOptions,
} from "discord.js";
import type { BrawlhallaClient } from "../brawlhalla/client.js";
import { RankedDataNotFoundError } from "../brawlhalla/errors.js";
import type {
  LegendStats,
  PlayerStats,
  Ranking,
  StatsMode,
  Team,
} from "../brawlhalla/types.js";
import type { ApplicationEmojiService } from "../services/application-emojis.js";
import type { LegendCatalog } from "../services/legend-catalog.js";
import { rankColor } from "./colors.js";
import { componentId, type RankView } from "./custom-ids.js";
import { formatDetailedDuration, formatNumber, winRate } from "./format.js";

const TEAMS_PER_PAGE = 4;
const LEGENDS_PER_PAGE = 6;
const OPTIONAL_LEADERBOARD_TIMEOUT_MS = 3_000;

interface MainRankedData {
  player: PlayerStats;
  ranked1v1: PlayerStats | null;
  ranked1v1Entry: Ranking | undefined;
  rankedRotating: PlayerStats | null;
  rankedRotatingEntry: Ranking | undefined;
  teams: Team[];
  guildName: string | null;
}

export class RankPresenter {
  public constructor(
    private readonly api: BrawlhallaClient,
    private readonly legends: LegendCatalog,
    private readonly emojis: ApplicationEmojiService,
  ) {}

  public async render(
    brawlhallaId: number,
    requestedView: RankView,
    ownerId: string,
    requestedPage = 0,
  ): Promise<InteractionEditReplyOptions> {
    const view = normalizeRankView(requestedView);
    let embeds: EmbedBuilder[];
    let page = 0;
    let pageCount = 1;

    if (view === "main") {
      embeds = this.mainEmbeds(await this.loadMainData(brawlhallaId));
    } else if (view === "2v2") {
      const player = await this.api.getPlayerStats(brawlhallaId, "all");
      const teamsResponse = await this.api.getPlayerTeams(brawlhallaId);
      const teams = sortTeams(teamsResponse.teams.ranked_2v2);
      pageCount = Math.max(1, Math.ceil(teams.length / TEAMS_PER_PAGE));
      page = clampPage(requestedPage, pageCount);
      embeds = [this.teamsEmbed(player, teams, page)];
    } else {
      const player = await this.api.getPlayerStats(brawlhallaId, "all");
      const rankedLegends = [...player.legends].sort(
        (a, b) => (b.games ?? 0) - (a.games ?? 0),
      );
      pageCount = Math.max(1, Math.ceil(rankedLegends.length / LEGENDS_PER_PAGE));
      page = clampPage(requestedPage, pageCount);
      embeds = [this.legendsEmbed(player, rankedLegends, page)];
    }

    const components: ActionRowBuilder<ButtonBuilder>[] = [
      this.navigation(ownerId, brawlhallaId, view),
    ];
    if ((view === "2v2" || view === "legends") && pageCount > 1) {
      components.push(this.pagination(ownerId, brawlhallaId, view, page, pageCount));
    }
    return { embeds, components };
  }

  private async loadMainData(brawlhallaId: number): Promise<MainRankedData> {
    // The Brawlhalla backend can return a false 404 for the base profile when
    // several endpoints for the same player arrive together. Load the required
    // profile first; the remaining sections are optional and may safely follow.
    const player = await this.api.getPlayerStats(brawlhallaId, "all");
    const ranked1v1Promise = this.getRankedOrNull(brawlhallaId, "ranked_1v1");
    const rankedRotatingPromise = this.getRankedOrNull(brawlhallaId, "ranked_3v3");
    const ranked1v1EntryPromise = ranked1v1Promise.then((ranked) =>
      ranked ? this.findLeaderboardEntry(ranked, "1v1") : undefined,
    );
    const rankedRotatingEntryPromise = rankedRotatingPromise.then((ranked) =>
      ranked ? this.findLeaderboardEntry(ranked, "3v3") : undefined,
    );

    const [
      ranked1v1,
      rankedRotating,
      teamsResponse,
      guildResponse,
      ranked1v1Entry,
      rankedRotatingEntry,
    ] = await Promise.all([
      ranked1v1Promise,
      rankedRotatingPromise,
      this.api.getPlayerTeams(brawlhallaId),
      this.api.getPlayerGuild(brawlhallaId),
      ranked1v1EntryPromise,
      rankedRotatingEntryPromise,
    ]);

    return {
      player,
      ranked1v1,
      ranked1v1Entry,
      rankedRotating,
      rankedRotatingEntry,
      teams: sortTeams(teamsResponse.teams.ranked_2v2),
      guildName: guildResponse.guild
        ? guildResponse.guild.guild_name ?? `Clan #${guildResponse.guild.guild_id}`
        : null,
    };
  }

  private mainEmbeds(data: MainRankedData): EmbedBuilder[] {
    const oneTier = data.ranked1v1Entry?.tier ?? data.ranked1v1?.tier;
    const totalPlaytime = data.player.legends.reduce(
      (total, legend) => total + (legend.match_time ?? 0),
      0,
    );
    const accountLosses = Math.max(data.player.games - data.player.wins, 0);
    const topTeam = data.teams[0];
    const rotatingTier = data.rankedRotatingEntry?.tier ?? data.rankedRotating?.tier;

    const primary = new EmbedBuilder()
      .setColor(rankColor(oneTier))
      .setTitle(`Estadísticas ranked de ${data.player.name}`)
      .setDescription(
        [
          `Brawlhalla ID **${data.player.brawlhalla_id}**`,
          `Clan: **${data.guildName ?? "Sin clan"}**`,
        ].join("\n"),
      )
      .addFields(
        {
          name: "Ranked 1v1",
          value: this.soloSummary(data.ranked1v1, data.ranked1v1Entry, "Ranked 1v1"),
          inline: true,
        },
        {
          name: "Cuenta",
          value: [
            `Tiempo total: **${formatDetailedDuration(totalPlaytime)}**`,
            `Partidas: **${formatNumber(data.player.games)}**`,
            `Victorias: **${formatNumber(data.player.wins)}**`,
            `Derrotas: **${formatNumber(accountLosses)}** · ${winRate(data.player.wins, data.player.games)}`,
          ].join("\n"),
          inline: true,
        },
      );

    const secondary = new EmbedBuilder()
      .setColor(rankColor(topTeam?.tier ?? rotatingTier))
      .setTitle("Modos de equipo")
      .addFields(
        {
          name: "Ranked 2v2",
          value: topTeam
            ? this.teamSummary(topTeam)
            : "No tiene equipos Ranked 2v2 en la temporada actual.",
          inline: true,
        },
        {
          name: "Ranked rotativo · 3v3",
          value: this.soloSummary(
            data.rankedRotating,
            data.rankedRotatingEntry,
            "Ranked rotativo",
          ),
          inline: true,
        },
      );

    return [primary, secondary];
  }

  private soloSummary(
    player: PlayerStats | null,
    ranking: Ranking | undefined,
    label: string,
  ): string {
    if (!player) return `No ha jugado ${label} en la temporada actual.`;

    const wins = ranking?.wins ?? player.wins;
    const losses = ranking?.losses ?? Math.max(player.games - player.wins, 0);
    const games = ranking ? (ranking.wins ?? 0) + (ranking.losses ?? 0) : player.games;
    const tier = ranking?.tier ?? player.tier ?? "Tier no publicado";
    const rating = ranking?.rating ?? player.rating;
    const peakRating = ranking?.best_rating ?? player.peak_rating;
    const globalRank = ranking?.rank ?? player.global_rank;
    const rankEmoji = this.emojis.rankMention(tier);
    const region = ranking?.region ?? player.region;
    const regionEmoji = this.emojis.regionMention(region);
    return [
      `${rankEmoji ? `${rankEmoji} ` : ""}**${tier}** · Elo **${formatNumber(rating)}** / pico **${formatNumber(peakRating)}**`,
      `**${formatNumber(wins)}** victorias · **${formatNumber(losses)}** derrotas`,
      `**${formatNumber(games)}** partidas · ${winRate(wins ?? 0, games)}`,
      `${regionEmoji ? `${regionEmoji} ` : ""}Región: **${regionName(region)}**${globalRank == null ? "" : ` · Global **#${formatNumber(globalRank)}**`}`,
    ].join("\n");
  }

  private teamSummary(team: Team, includePlayers = true): string {
    const losses = Math.max(team.games - team.wins, 0);
    const rankEmoji = this.emojis.rankMention(team.tier);
    const regionEmoji = this.emojis.regionMention(team.region);
    return [
      includePlayers ? `**${team.username_one}** y **${team.username_two}**` : null,
      `${rankEmoji ? `${rankEmoji} ` : ""}**${team.tier ?? "Tier no publicado"}** · Elo **${formatNumber(team.rating)}** / pico **${formatNumber(team.peak_rating)}**`,
      `**${formatNumber(team.wins)}** victorias · **${formatNumber(losses)}** derrotas`,
      `**${formatNumber(team.games)}** partidas · ${winRate(team.wins, team.games)}`,
      `${regionEmoji ? `${regionEmoji} ` : ""}Región: **${regionName(team.region)}**${team.global_rank == null ? "" : ` · Global **#${formatNumber(team.global_rank)}**`}`,
    ].filter(Boolean).join("\n");
  }

  private teamsEmbed(
    player: PlayerStats,
    teams: Team[],
    page: number,
  ): EmbedBuilder {
    const items = teams.slice(page * TEAMS_PER_PAGE, (page + 1) * TEAMS_PER_PAGE);
    const totalGames = teams.reduce((total, team) => total + team.games, 0);
    const totalWins = teams.reduce((total, team) => total + team.wins, 0);
    const embed = new EmbedBuilder()
      .setColor(rankColor(items[0]?.tier))
      .setTitle(`Ranked 2v2 de ${player.name}`)
      .setDescription(
        items.length
          ? `Brawlhalla ID **${player.brawlhalla_id}**\n**${formatNumber(totalGames)}** partidas · ${winRate(totalWins, totalGames)} de victorias`
          : "No tiene equipos Ranked 2v2 en la temporada actual.",
      );

    for (const team of items) {
      embed.addFields({
        name: `${team.username_one} y ${team.username_two}`,
        value: this.teamSummary(team, false),
      });
    }

    return embed;
  }

  private legendsEmbed(
    player: PlayerStats,
    legends: LegendStats[],
    page: number,
  ): EmbedBuilder {
    const items = legends.slice(page * LEGENDS_PER_PAGE, (page + 1) * LEGENDS_PER_PAGE);
    const embed = new EmbedBuilder()
      .setColor(rankColor(player.tier))
      .setTitle(`Leyendas más jugadas de ${player.name}`)
      .setDescription(
        items.length
          ? `Brawlhalla ID **${player.brawlhalla_id}** · incluye partidas 1v1, 2v2, 3v3 y otros modos registrados por la API.`
          : "No hay partidas registradas por leyenda para esta cuenta.",
      );

    for (const legend of items) {
      const data = this.legends.get(legend.legend_id);
      const name = data?.bio_name ?? `Leyenda #${legend.legend_id}`;
      const emoji = this.emojis.legendMention(name);
      const losses = Math.max((legend.games ?? 0) - (legend.wins ?? 0), 0);
      embed.addFields({
        name: `${emoji ? `${emoji} ` : ""}${name}`,
        value: [
          `**${formatNumber(legend.wins)}** victorias · **${formatNumber(losses)}** derrotas`,
          `**${formatNumber(legend.games)}** partidas · ${winRate(legend.wins, legend.games)}`,
        ].join("\n"),
      });
    }

    const top = items[0] ? this.legends.get(items[0].legend_id) : undefined;
    const thumbnail = top ? this.emojis.legendThumbnail(top.bio_name) : undefined;
    if (thumbnail) embed.setThumbnail(thumbnail);
    return embed;
  }

  private async getRankedOrNull(
    brawlhallaId: number,
    mode: Extract<StatsMode, "ranked_1v1" | "ranked_3v3">,
  ): Promise<PlayerStats | null> {
    try {
      return await this.api.getPlayerStats(brawlhallaId, mode);
    } catch (error) {
      if (error instanceof RankedDataNotFoundError) return null;
      throw error;
    }
  }

  private async findLeaderboardEntry(
    player: PlayerStats,
    gameMode: "1v1" | "3v3",
  ): Promise<Ranking | undefined> {
    try {
      return await withTimeout(
        this.api.findRankingByPlayer(player.brawlhalla_id, player.name, gameMode),
        OPTIONAL_LEADERBOARD_TIMEOUT_MS,
      );
    } catch {
      return undefined;
    }
  }

  private navigation(
    ownerId: string,
    brawlhallaId: number,
    current: Exclude<RankView, "1v1" | "3v3">,
  ): ActionRowBuilder<ButtonBuilder> {
    const definitions: Array<[Exclude<RankView, "1v1" | "3v3">, string]> = [
      ["main", "Principal"],
      ["2v2", "Ranked 2v2"],
      ["legends", "Leyendas"],
    ];
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      definitions.map(([view, label]) =>
        new ButtonBuilder()
          .setCustomId(componentId("rank", view, ownerId, brawlhallaId))
          .setLabel(label)
          .setStyle(view === current ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(view === current),
      ),
    );
  }

  private pagination(
    ownerId: string,
    brawlhallaId: number,
    view: "2v2" | "legends",
    page: number,
    pageCount: number,
  ): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${componentId("rank", view, ownerId, brawlhallaId, page - 1)}:previous`)
        .setLabel("Anterior")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`${componentId("rank", view, ownerId, brawlhallaId, page + 1)}:next`)
        .setLabel("Siguiente")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= pageCount - 1),
    );
  }
}

async function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T | undefined> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        timeout = setTimeout(() => resolve(undefined), milliseconds);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function normalizeRankView(view: RankView): "main" | "2v2" | "legends" {
  if (view === "1v1" || view === "3v3") return "main";
  return view;
}

function sortTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

function clampPage(page: number, pageCount: number): number {
  return Math.min(Math.max(page, 0), pageCount - 1);
}

function regionName(region: string | null | undefined): string {
  if (!region) return "Sin datos";
  const regions: Record<string, string> = {
    "US-E": "Este de EE. UU.",
    "US-W": "Oeste de EE. UU.",
    EU: "Europa",
    SEA: "Sudeste Asiático",
    BRZ: "Brasil",
    AUS: "Australia",
    JPS: "Japón",
    SA: "Sudáfrica",
    ME: "Oriente Medio",
    ALL: "Global",
  };
  return regions[region] ?? region;
}
