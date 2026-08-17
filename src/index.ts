import { Client, Events, GatewayIntentBits } from "discord.js";
import { createServer } from "node:http";
import { BrawlhallaClient } from "./brawlhalla/client.js";
import { BotController } from "./bot-controller.js";
import { loadCommands } from "./commands/loader.js";
import { syncCommands } from "./commands/registry.js";
import type { CommandContext } from "./commands/types.js";
import { loadConfig } from "./config.js";
import { ProfileRepository } from "./database/profiles.js";
import { Logger } from "./logger.js";
import { ApplicationEmojiService } from "./services/application-emojis.js";
import { GuildSessionIndex } from "./services/guild-index.js";
import { startHealthPinger } from "./services/health-pinger.js";
import { LegendCatalog } from "./services/legend-catalog.js";
import { ClanPresenter } from "./ui/clan-presenter.js";
import { RankPresenter } from "./ui/rank-presenter.js";
import { StatsPresenter } from "./ui/stats-presenter.js";

const config = loadConfig();
const logger = new Logger(config.LOG_LEVEL);
const discord = new Client({ intents: [GatewayIntentBits.Guilds] });
const api = new BrawlhallaClient(config.BRAWLHALLA_API_URL, logger);
logger.info("Brawlhalla API configurada", {
  baseUrl: config.BRAWLHALLA_API_URL,
  transport: "direct",
});
const profiles = new ProfileRepository(config.MONGODB_URI, config.MONGODB_DATABASE, logger);
const legends = new LegendCatalog(api);
const emojis = new ApplicationEmojiService();
const guildIndex = new GuildSessionIndex();
const context: CommandContext = {
  api,
  profiles,
  guildIndex,
  statsPresenter: new StatsPresenter(api, legends, emojis),
  rankPresenter: new RankPresenter(api, legends, emojis),
  clanPresenter: new ClanPresenter(api, guildIndex),
  emojis,
  developerIds: new Set(config.DEVELOPER_IDS),
};
let shuttingDown = false;
let healthPingTimer: NodeJS.Timeout | undefined;

async function start(): Promise<void> {
  startHealthServer();
  healthPingTimer = startHealthPinger(config.HEALTHCHECK_URL, logger);
  const commands = await loadCommands(logger);
  const controller = new BotController(commands, context, logger);

  discord.on(Events.InteractionCreate, (interaction) => {
    void controller.handle(interaction);
  });
  discord.once(Events.ClientReady, async (client) => {
    logger.info("Discord conectado", { user: client.user.tag, guilds: client.guilds.cache.size });

    try {
      const result = await syncCommands(client, commands);
      logger.info("Comandos sincronizados con Discord", result);
    } catch (error) {
      logger.error("No se pudieron sincronizar los comandos con Discord", error);
    }

    try {
      await Promise.all([legends.initialize(), emojis.initialize(client)]);
      logger.info("Catálogos preparados", {
        legends: legends.all().length,
        applicationEmojis: emojis.size(),
      });
    } catch (error) {
      logger.warn("El bot inició, pero no pudo precargar todos los catálogos", error);
    }
  });

  // Mongo no debe impedir que Discord conecte y publique los slash commands.
  void connectProfilesWithRetry();
  await discord.login(config.DISCORD_TOKEN);
}

function startHealthServer(): void {
  const server = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/healt") {
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ ok: true, uptime: Math.floor(process.uptime()) }));
      return;
    }
    response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Not found" }));
  });
  server.listen(config.PORT, "0.0.0.0", () => {
    logger.info("Ruta de salud disponible", { path: "/healt", port: config.PORT });
  });
}

async function connectProfilesWithRetry(): Promise<void> {
  let attempt = 0;
  while (!shuttingDown) {
    try {
      await profiles.connect();
      return;
    } catch (error) {
      attempt += 1;
      const retryInSeconds = Math.min(15 * attempt, 60);
      logger.error("MongoDB no está disponible; Discord seguirá conectado", {
        error,
        attempt,
        retryInSeconds,
      });
      await wait(retryInSeconds * 1_000);
    }
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function shutdown(signal: string): Promise<void> {
  shuttingDown = true;
  logger.info("Apagando el bot", { signal });
  if (healthPingTimer) clearInterval(healthPingTimer);
  discord.destroy();
  await profiles.close().catch((error) => logger.error("No se pudo cerrar MongoDB", error));
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

start().catch((error) => {
  logger.error("El bot no pudo iniciar", error);
  process.exitCode = 1;
});
