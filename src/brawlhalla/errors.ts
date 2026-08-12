export class BrawlhallaApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "BrawlhallaApiError";
  }
}

export class PlayerNotFoundError extends Error {
  public constructor(public readonly brawlhallaId: number) {
    super(`No se encontró el jugador con Brawlhalla ID ${brawlhallaId}.`);
    this.name = "PlayerNotFoundError";
  }
}

export class RankedDataNotFoundError extends Error {
  public constructor(
    public readonly brawlhallaId: number,
    public readonly mode: "ranked_1v1" | "ranked_3v3",
  ) {
    super(`El jugador no tiene datos disponibles para ${mode.replace("ranked_", "ranked ")}.`);
    this.name = "RankedDataNotFoundError";
  }
}

export class LinkedProfileNotFoundError extends Error {
  public constructor(public readonly discordUserId: string) {
    super("Ese usuario todavía no vinculó un Brawlhalla ID.");
    this.name = "LinkedProfileNotFoundError";
  }
}
