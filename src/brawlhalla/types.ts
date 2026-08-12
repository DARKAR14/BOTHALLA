export type StatsMode = "all" | "ranked_1v1" | "ranked_3v3";
export type GameMode = "1v1" | "2v2" | "3v3";

export interface RegionRank {
  region: string;
  rank?: number | null;
}

export interface LegendStats {
  legend_id: number;
  games?: number;
  wins?: number;
  damage_dealt?: number;
  damage_taken?: number;
  kos?: number;
  falls?: number;
  suicides?: number;
  team_kos?: number;
  match_time?: number;
  damage_unarmed?: number;
  damage_thrown_item?: number;
  damage_weapon_one?: number;
  damage_weapon_two?: number;
  damage_gadgets?: number;
  ko_unarmed?: number;
  ko_weapon_one?: number;
  ko_weapon_two?: number;
  ko_gadgets?: number;
  time_held_weapon_one?: number;
  time_held_weapon_two?: number;
  xp?: number;
  level?: number;
  xp_percentage?: number;
  rating?: number | null;
  peak_rating?: number | null;
  tier?: string | null;
}

export interface PlayerStats {
  brawlhalla_id: number;
  name: string;
  games: number;
  wins: number;
  xp?: number;
  xp_percentage?: number;
  level?: number;
  rating?: number | null;
  peak_rating?: number | null;
  tier?: string | null;
  region?: string | null;
  region_ranks?: RegionRank[];
  global_rank?: number | null;
  damage_bomb?: number;
  damage_mine?: number;
  damage_spikeball?: number;
  damage_sidekick?: number;
  hit_snowball?: number;
  ko_bomb?: number;
  ko_mine?: number;
  ko_sidekick?: number;
  ko_snowball?: number;
  ko_spikeball?: number;
  legends: LegendStats[];
}

export interface Team {
  brawlhalla_id_one: number;
  brawlhalla_id_two: number;
  username_one: string;
  username_two: string;
  rating?: number | null;
  peak_rating?: number | null;
  tier?: string | null;
  wins: number;
  games: number;
  region: string;
  region_ranks?: RegionRank[];
  global_rank?: number | null;
}

export interface PlayerTeamsResponse {
  brawlhalla_id: number;
  teams: { ranked_2v2: Team[] };
}

export interface GuildPlayer {
  guild_id: number;
  guild_name?: string;
  personal_xp: number;
  personal_xp_this_week: number;
  personal_points: number;
  join_date: number;
  rank: string;
}

export interface PlayerGuildResponse {
  brawlhalla_id: number;
  guild: GuildPlayer | null;
}

export interface GuildStats {
  guild_id: number;
  name: string;
  create_date: number;
  xp: number;
  legacy_xp?: number;
  notice?: string;
  tags?: string[];
  discord_invite_code?: string;
  guild_points?: number;
  rank?: number;
  is_recruiting?: boolean;
  member_count: number;
}

export interface GuildMember {
  brawlhalla_id: number;
  name?: string;
  rank: string;
  join_date: number;
  xp: number;
  guild_points: number;
}

export interface GuildMembersResponse {
  guild_id: number;
  guild_members: GuildMember[];
}

export interface RankingPlayer {
  id?: number;
  username?: string;
}

export interface Ranking {
  players: RankingPlayer[];
  best_rating?: number | null;
  rank: number;
  rating?: number | null;
  wins?: number | null;
  losses?: number | null;
  region?: string | null;
  tier?: string | null;
}

export interface RankingsResponse {
  rankings: Ranking[];
  total_pages: number;
}

export interface Legend {
  legend_id: number;
  legend_name: string;
  bio_name: string;
  bio_aka: string;
  bio_quote: string;
  bio_quote_about_attrib: string;
  bio_quote_from: string;
  bio_quote_from_attrib: string;
  bio_text: string;
  bot_name: string;
  weapon_one: string;
  weapon_two: string;
  strength: number;
  dexterity: number;
  defense: number;
  speed: number;
}

export interface LegendsResponse {
  legends: Legend[];
  total_pages: number;
}

export interface PlayerSearchMatch {
  id: number;
  username: string;
  rating: number | null;
  tier: string | null;
  rank: number | null;
  regions: string[];
  modes: GameMode[];
}
