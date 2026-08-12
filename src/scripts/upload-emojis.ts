import "dotenv/config";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { Client } from "discord.js";
import { z } from "zod";
import { legendEmojiName } from "../services/application-emojis.js";

const environment = z.object({ DISCORD_TOKEN: z.string().min(1) }).parse(process.env);
const directory = path.resolve("assets", "emojis", "legends");
const supportedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);
const maximumBytes = 256 * 1024;

const files = (await readdir(directory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
  .map((entry) => entry.name)
  .sort();

if (files.length === 0) {
  throw new Error(`No hay imágenes en ${directory}. Lee assets/emojis/legends/README.md.`);
}

const client = new Client({ intents: [] });
await client.login(environment.DISCORD_TOKEN);

try {
  if (!client.application) throw new Error("Discord no devolvió la aplicación del bot.");
  const existing = await client.application.emojis.fetch();
  const existingNames = new Set(
    [...existing.values()].map((emoji) => emoji.name).filter((name): name is string => Boolean(name)),
  );

  let created = 0;
  let skipped = 0;
  for (const file of files) {
    const filePath = path.join(directory, file);
    const fileStats = await stat(filePath);
    if (fileStats.size > maximumBytes) {
      console.warn(`OMITIDO ${file}: supera 256 KiB.`);
      skipped += 1;
      continue;
    }

    const baseName = path.basename(file, path.extname(file));
    const emojiName = legendEmojiName(baseName.replace(/^legend_/, ""));
    if (existingNames.has(emojiName)) {
      console.log(`YA EXISTE ${emojiName}`);
      skipped += 1;
      continue;
    }

    await client.application.emojis.create({ attachment: filePath, name: emojiName });
    existingNames.add(emojiName);
    created += 1;
    console.log(`CREADO ${emojiName}`);
  }

  console.log(`Listo: ${created} creados, ${skipped} omitidos.`);
} finally {
  client.destroy();
}
