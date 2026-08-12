export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Sin datos";
  return new Intl.NumberFormat("es-ES", { useGrouping: true }).format(value);
}

export function formatPercent(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    maximumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function winRate(wins: number | undefined, games: number | undefined): string {
  if (!games) return "Sin partidas";
  return formatPercent((wins ?? 0) / games);
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return "Sin datos";
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (hours > 0) return `${formatNumber(hours)} h ${minutes} min`;
  return `${minutes} min`;
}

export function formatDetailedDuration(seconds: number | undefined): string {
  if (!seconds) return "Sin datos";
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const parts = [
    hours > 0 ? `${formatNumber(hours)} h` : null,
    minutes > 0 ? `${minutes} min` : null,
    `${remainingSeconds} s`,
  ];
  return parts.filter(Boolean).join(" ");
}

export function discordDate(unixSeconds: number | undefined): string {
  return unixSeconds ? `<t:${unixSeconds}:D>` : "Sin datos";
}

export function truncate(value: string, maximum: number): string {
  if (value.length <= maximum) return value;
  return `${value.slice(0, Math.max(0, maximum - 1))}…`;
}

export function safeField(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Sin datos";
  return String(value);
}
