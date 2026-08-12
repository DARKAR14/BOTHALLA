import type { GuildStats } from "../brawlhalla/types.js";

export class GuildSessionIndex {
  private readonly guilds = new Map<number, GuildStats>();

  public remember(guild: GuildStats): void {
    this.guilds.set(guild.guild_id, guild);
  }

  public search(name: string): GuildStats[] {
    const query = normalize(name);
    return [...this.guilds.values()]
      .filter((guild) => normalize(guild.name).includes(query))
      .sort((a, b) => {
        const aExact = normalize(a.name) === query ? 1 : 0;
        const bExact = normalize(b.name) === query ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        return (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);
      })
      .slice(0, 25);
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("es-ES");
}
