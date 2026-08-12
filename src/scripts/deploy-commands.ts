import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { z } from "zod";
import { loadCommands } from "../commands/loader.js";
import { syncCommands } from "../commands/registry.js";

const environment = z.object({
  DISCORD_TOKEN: z.string().min(1),
}).parse(process.env);

const commands = await loadCommands();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const ready = new Promise<Client<true>>((resolve) => client.once(Events.ClientReady, resolve));

await client.login(environment.DISCORD_TOKEN);
const authenticatedClient = await ready;
try {
  const result = await syncCommands(authenticatedClient, commands);
  console.log(
    `Registrados ${result.count} comandos (${result.scope}) para ${authenticatedClient.user.tag}.`,
  );
} finally {
  client.destroy();
}
