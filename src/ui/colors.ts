export const COLORS = {
  brand: 0x4f7cff,
  success: 0x33c27f,
  warning: 0xf0a83b,
  error: 0xe45b68,
  neutral: 0x667085,
  ranks: {
    valhallan: 0xff4f87,
    diamond: 0x55b8ff,
    platinum: 0x71d8c5,
    gold: 0xe4b34c,
    silver: 0xb9c1cf,
    bronze: 0xb77949,
    tin: 0x8d918f,
  },
} as const;

export function rankColor(tier: string | null | undefined): number {
  const normalized = tier?.toLocaleLowerCase("en-US") ?? "";
  for (const [rank, color] of Object.entries(COLORS.ranks)) {
    if (normalized.includes(rank)) return color;
  }
  return COLORS.brand;
}
