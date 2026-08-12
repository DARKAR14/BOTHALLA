import type { BrawlhallaClient } from "../brawlhalla/client.js";
import type { Legend } from "../brawlhalla/types.js";

export class LegendCatalog {
  private legends = new Map<number, Legend>();

  public constructor(private readonly api: BrawlhallaClient) {}

  public async initialize(): Promise<void> {
    await this.refresh();
  }

  public async refresh(): Promise<void> {
    const legends = await this.api.getLegends();
    this.legends = new Map(legends.map((legend) => [legend.legend_id, legend]));
  }

  public get(id: number): Legend | undefined {
    return this.legends.get(id);
  }

  public name(id: number): string {
    const legend = this.get(id);
    return legend?.bio_name ?? `Leyenda #${id}`;
  }

  public all(): Legend[] {
    return [...this.legends.values()].sort((a, b) => a.legend_id - b.legend_id);
  }
}
