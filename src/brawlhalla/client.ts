import {
  BrawlhallaApiError,
  PlayerNotFoundError,
  RankedDataNotFoundError,
} from "./errors.js";
import { TtlCache } from "./cache.js";
import { RequestGate } from "./request-gate.js";
import type {
  GameMode,
  GuildMembersResponse,
  GuildStats,
  Legend,
  LegendsResponse,
  PlayerGuildResponse,
  PlayerSearchMatch,
  PlayerStats,
  PlayerTeamsResponse,
  Ranking,
  RankingsResponse,
  StatsMode,
} from "./types.js";
import type { Logger } from "../logger.js";

const CACHE_TTL = {
  player: 2 * 60_000,
  ranking: 60_000,
  guild: 2 * 60_000,
  static: 6 * 60 * 60_000,
};
const REQUEST_TIMEOUT_MS = 7_000;
const MAX_ATTEMPTS = 2;
const PLAYER_STATS_ATTEMPTS = 3;

export class BrawlhallaClient {
  private readonly cache = new TtlCache();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly gate = new RequestGate({
    maximumConcurrency: 4,
    minimumStartIntervalMs: 175,
    maximumPending: 60,
  });

  public constructor(
    private readonly baseUrl: string,
    private readonly logger: Logger,
  ) {}

  public async getPlayerStats(id: number, mode: StatsMode = "all"): Promise<PlayerStats> {
    const key = `player:stats:${id}:${mode}`;
    try {
      return await this.getCached(
        key,
        CACHE_TTL.player,
        () => this.request<PlayerStats>(
          "/player/stats",
          mode === "all" ? { brawlhalla_id: id } : { brawlhalla_id: id, mode },
          mode === "all"
            ? { attempts: PLAYER_STATS_ATTEMPTS, retryNotFound: true }
            : { attempts: MAX_ATTEMPTS },
        ),
      );
    } catch (error) {
      if (error instanceof BrawlhallaApiError && error.status === 404) {
        throw playerStatsNotFound(id, mode);
      }
      throw error;
    }
  }

  public async getPlayerTeams(id: number): Promise<PlayerTeamsResponse> {
    return this.getCached(`player:teams:${id}`, CACHE_TTL.player, async () => {
      try {
        return await this.request<PlayerTeamsResponse>("/player/teams", { brawlhalla_id: id });
      } catch (error) {
        if (error instanceof BrawlhallaApiError && error.status === 404) {
          return { brawlhalla_id: id, teams: { ranked_2v2: [] } };
        }
        throw error;
      }
    });
  }

  public async getPlayerGuild(id: number): Promise<PlayerGuildResponse> {
    return this.getCached(`player:guild:${id}`, CACHE_TTL.guild, async () => {
      try {
        return await this.request<PlayerGuildResponse>("/player/guild", { brawlhalla_id: id });
      } catch (error) {
        if (error instanceof BrawlhallaApiError && error.status === 404) {
          return { brawlhalla_id: id, guild: null };
        }
        throw error;
      }
    });
  }

  public getGuildStats(id: number): Promise<GuildStats> {
    return this.getCached(`guild:stats:${id}`, CACHE_TTL.guild, () =>
      this.request<GuildStats>("/guild/stats", { guild_id: id }),
    );
  }

  public getGuildMembers(id: number): Promise<GuildMembersResponse> {
    return this.getCached(`guild:members:${id}`, CACHE_TTL.guild, () =>
      this.request<GuildMembersResponse>("/guild/members", { guild_id: id }),
    );
  }

  public getRankings(options: {
    gameMode: GameMode;
    region?: string;
    search?: string;
    page?: number;
    maxResults?: number;
  }): Promise<RankingsResponse> {
    const parameters: Record<string, string | number> = {
      game_mode: options.gameMode,
      region: options.region ?? "ALL",
      page: options.page ?? 1,
      max_results: options.maxResults ?? 10,
    };
    if (options.search) parameters.search = options.search;

    return this.getCached(
      `ranking:${JSON.stringify(parameters)}`,
      CACHE_TTL.ranking,
      () => this.request<RankingsResponse>("/leaderboard/ranked", parameters),
    );
  }

  public async getLegends(): Promise<Legend[]> {
    const response = await this.getCached("static:legends", CACHE_TTL.static, () =>
      this.request<LegendsResponse>("/static/legends", { max_results: 100 }),
    );
    return response.legends;
  }

  public async searchPlayers(username: string): Promise<PlayerSearchMatch[]> {
    const normalized = normalize(username);
    const oneVsOne = await this.searchRankings("1v1", username);
    const responses: Array<{ mode: GameMode; response: RankingsResponse }> = [
      { mode: "1v1", response: oneVsOne },
    ];
    const hasExactMatch = oneVsOne.rankings.some((ranking) =>
      ranking.players.some((player) => normalize(player.username ?? "") === normalized),
    );
    if (!hasExactMatch) {
      responses.push(...await Promise.all(
        (["2v2", "3v3"] as const).map(async (mode) => ({
          mode,
          response: await this.searchRankings(mode, username),
        })),
      ));
    }

    const matches = new Map<number, PlayerSearchMatch>();
    for (const { mode, response } of responses) {
      for (const ranking of response.rankings) {
        this.collectRankingMatches(matches, ranking, mode, normalized);
      }
    }

    return [...matches.values()]
      .sort((a, b) => {
        const aExact = normalize(a.username) === normalized ? 1 : 0;
        const bExact = normalize(b.username) === normalized ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        return (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);
      })
      .slice(0, 25);
  }

  public async findRankingByPlayer(
    brawlhallaId: number,
    username: string,
    gameMode: GameMode,
  ): Promise<Ranking | undefined> {
    for (const query of searchQueries(username).slice(0, 2)) {
      try {
        const response = await this.getRankings({
          gameMode,
          region: "ALL",
          search: query,
          maxResults: 25,
        });
        const match = response.rankings.find((ranking) =>
          ranking.players.some((candidate) => candidate.id === brawlhallaId),
        );
        if (match) return match;
      } catch (error) {
        if (error instanceof BrawlhallaApiError && error.status === 400) continue;
        throw error;
      }
    }
    return undefined;
  }

  private async searchRankings(gameMode: GameMode, username: string): Promise<RankingsResponse> {
    const normalized = normalize(username);
    const queries = searchQueries(username);
    let lastSuccessful: RankingsResponse | undefined;
    for (const query of queries) {
      try {
        const response = await this.getRankings({
          gameMode,
          region: "ALL",
          search: query,
          maxResults: 25,
        });
        lastSuccessful = response;
        const containsOriginal = response.rankings.some((ranking) =>
          ranking.players.some((player) =>
            player.username ? normalize(player.username).includes(normalized) : false,
          ),
        );
        if (containsOriginal || queries.length === 1) return response;
      } catch (error) {
        if (error instanceof BrawlhallaApiError && error.status === 400) continue;
        throw error;
      }
    }
    return lastSuccessful ?? { rankings: [], total_pages: 0 };
  }

  private collectRankingMatches(
    matches: Map<number, PlayerSearchMatch>,
    ranking: Ranking,
    mode: GameMode,
    query: string,
  ): void {
    for (const player of ranking.players) {
      if (!player.id || !player.username || !normalize(player.username).includes(query)) continue;
      const current = matches.get(player.id);
      if (current) {
        if (!current.modes.includes(mode)) current.modes.push(mode);
        if (ranking.region && !current.regions.includes(ranking.region)) {
          current.regions.push(ranking.region);
        }
        continue;
      }

      matches.set(player.id, {
        id: player.id,
        username: player.username,
        rating: ranking.rating ?? null,
        tier: ranking.tier ?? null,
        rank: ranking.rank ?? null,
        regions: ranking.region ? [ranking.region] : [],
        modes: [mode],
      });
    }
  }

  private async getCached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const cached = this.cache.get<T>(key);
    if (cached !== undefined) return cached;
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const pending = loader()
      .then((value) => {
        this.cache.set(key, value, ttlMs);
        return value;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, pending);
    return pending;
  }

  private async request<T>(
    path: string,
    parameters: Record<string, string | number>,
    options: { attempts?: number; retryNotFound?: boolean } = {},
  ): Promise<T> {
    const url = new URL(`${this.baseUrl.replace(/\/$/, "")}${path}`);
    for (const [key, value] of Object.entries(parameters)) {
      url.searchParams.set(key, String(value));
    }

    const maximumAttempts = options.attempts ?? MAX_ATTEMPTS;
    for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
      try {
        const response = await this.gate.run(async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
          try {
            const headers: Record<string, string> = {
              Accept: "application/json",
              "User-Agent": "Bothalla/1.0 (Discord bot; Brawlhalla API v1)",
            };
            return await fetch(url, {
              headers,
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timeout);
          }
        });

        if (response.ok) return (await response.json()) as T;

        const body = compactDiagnosticBody(await response.text());
        const retryable = response.status === 429
          || response.status >= 500
          || (response.status === 404 && options.retryNotFound === true);
        const responseContext = {
          status: response.status,
          endpoint: `${url.origin}${url.pathname}`,
          contentType: response.headers.get("content-type"),
          cloudflareRay: response.headers.get("cf-ray"),
          body,
        };

        if (retryable && attempt < maximumAttempts - 1) {
          const retryAfterHeader = response.headers.get("retry-after");
          const retryAfter = retryAfterHeader === null ? Number.NaN : Number(retryAfterHeader);
          const delay = Number.isFinite(retryAfter)
            ? Math.max(retryAfter * 1_000, 500)
            : 600 * (attempt + 1);
          this.logger.warn("Brawlhalla API solicitó reintento", {
            ...responseContext,
            attempt: attempt + 1,
            maximumAttempts,
            delay,
          });
          await sleep(delay);
          continue;
        }

        this.logger.warn("Brawlhalla API respondió con un error", responseContext);

        throw new BrawlhallaApiError(
          apiErrorMessage(response.status),
          response.status,
          retryable,
        );
      } catch (error) {
        if (error instanceof BrawlhallaApiError) throw error;
        if (attempt < maximumAttempts - 1) {
          await sleep(500 * (attempt + 1));
          continue;
        }
        throw new BrawlhallaApiError(
          error instanceof Error && error.name === "AbortError"
            ? "La API de Brawlhalla tardó demasiado en responder."
            : "No se pudo conectar con la API de Brawlhalla.",
          0,
          true,
        );
      }
    }

    throw new BrawlhallaApiError("No se pudo completar la solicitud.", 0, true);
  }
}

function playerStatsNotFound(id: number, mode: StatsMode): Error {
  return mode === "all" ? new PlayerNotFoundError(id) : new RankedDataNotFoundError(id, mode);
}

function apiErrorMessage(status: number): string {
  if (status === 401) return "Brawlhalla rechazó la conexión: se requiere HTTPS.";
  if (status === 404) return "Brawlhalla no encontró ese recurso o los parámetros no son válidos.";
  if (status === 429) return "Brawlhalla está limitando temporalmente las consultas.";
  if (status === 503) return "Brawlhalla está en mantenimiento. Inténtalo más tarde.";
  if (status >= 500) return "Brawlhalla tuvo un error interno. Inténtalo más tarde.";
  return `La API de Brawlhalla respondió con el estado ${status}.`;
}

function compactDiagnosticBody(value: string): string | undefined {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact ? compact.slice(0, 160) : undefined;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function searchQueries(username: string): string[] {
  const full = username.trim();
  const tokens = full.match(/[\p{L}\p{N}_'-]{2,}/gu) ?? [];
  return [...new Set([full, ...tokens.sort((a, b) => b.length - a.length)])].filter(Boolean);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
