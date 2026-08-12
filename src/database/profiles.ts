import { MongoClient, type Collection } from "mongodb";
import type { Logger } from "../logger.js";

export interface LinkedProfile {
  discordUserId: string;
  brawlhallaId: number;
}

export class ProfileRepository {
  private readonly client: MongoClient;
  private collection?: Collection<LinkedProfile>;

  public constructor(
    uri: string,
    private readonly databaseName: string,
    private readonly logger: Logger,
  ) {
    this.client = new MongoClient(uri, {
      appName: "Bothalla",
      maxPoolSize: 8,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  public async connect(): Promise<void> {
    await this.client.connect();
    this.collection = this.client.db(this.databaseName).collection<LinkedProfile>("profiles");
    await this.collection.createIndex({ discordUserId: 1 }, { unique: true });
    this.logger.info("MongoDB conectado", { database: this.databaseName });
  }

  public async close(): Promise<void> {
    await this.client.close();
  }

  public async link(discordUserId: string, brawlhallaId: number): Promise<LinkedProfile> {
    const collection = this.getCollection();
    await collection.updateOne(
      { discordUserId },
      { $set: { discordUserId, brawlhallaId } },
      { upsert: true },
    );
    return { discordUserId, brawlhallaId };
  }

  public async findByDiscordUserId(discordUserId: string): Promise<LinkedProfile | null> {
    return this.getCollection().findOne(
      { discordUserId },
      { projection: { _id: 0, discordUserId: 1, brawlhallaId: 1 } },
    );
  }

  private getCollection(): Collection<LinkedProfile> {
    if (!this.collection) throw new Error("ProfileRepository todavía no está conectado.");
    return this.collection;
  }
}
