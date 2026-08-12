import type { Client } from "discord.js";
import type { Collection } from "discord.js";
import type { BotCommand } from "./types.js";

export interface CommandSyncResult {
  count: number;
  scope: string;
  guildsCleaned: number;
}

export async function syncCommands(
  client: Client<true>,
  commands: Collection<string, BotCommand>,
): Promise<CommandSyncResult> {
  const data = commands.map((command) => command.data.toJSON());
  const guilds = [...client.guilds.cache.values()];

  // Un comando global y otro de servidor con el mismo nombre aparecen duplicados.
  // Eliminamos cualquier copia antigua de servidor y conservamos una única fuente global.
  await Promise.all(guilds.map((guild) => guild.commands.set([])));
  const registered = await client.application.commands.set(data);

  return {
    count: registered.size,
    scope: "global",
    guildsCleaned: guilds.length,
  };
}
