export type StatsView = "overview" | "legends" | "combat" | "guild";
export type RankView = "main" | "2v2" | "legends" | "1v1" | "3v3";
export type ClanView = "overview" | "members";

export type ComponentAction =
  | { area: "stats"; view: StatsView; ownerId: string; entityId: number; page: number }
  | { area: "rank"; view: RankView; ownerId: string; entityId: number; page: number }
  | { area: "clan"; view: ClanView; ownerId: string; entityId: number; page: number }
  | { area: "pick"; view: "stats" | "rank" | "clan"; ownerId: string; entityId: 0; page: 0 }
  | { area: "help"; view: "create"; ownerId: string; entityId: 0; page: 0 };

export function componentId(
  area: ComponentAction["area"],
  view: string,
  ownerId: string,
  entityId = 0,
  page = 0,
): string {
  return [area, view, ownerId, entityId, page].join(":");
}

export function parseComponentId(value: string): ComponentAction | null {
  const [area, view, ownerId, entityIdRaw = "0", pageRaw = "0"] = value.split(":");
  if (!area || !view || !ownerId) return null;
  const entityId = Number(entityIdRaw);
  const page = Number(pageRaw);
  if (!Number.isSafeInteger(entityId) || !Number.isSafeInteger(page)) return null;

  if (area === "stats" && isStatsView(view)) {
    return { area, view, ownerId, entityId, page };
  }
  if (area === "rank" && isRankView(view)) {
    return { area, view, ownerId, entityId, page };
  }
  if (area === "clan" && isClanView(view)) {
    return { area, view, ownerId, entityId, page };
  }
  if (area === "pick" && (view === "stats" || view === "rank" || view === "clan")) {
    return { area, view, ownerId, entityId: 0, page: 0 };
  }
  if (area === "help" && view === "create") {
    return { area, view, ownerId, entityId: 0, page: 0 };
  }
  return null;
}

function isStatsView(value: string): value is StatsView {
  return ["overview", "legends", "combat", "guild"].includes(value);
}

function isRankView(value: string): value is RankView {
  return ["main", "2v2", "legends", "1v1", "3v3"].includes(value);
}

function isClanView(value: string): value is ClanView {
  return value === "overview" || value === "members";
}
