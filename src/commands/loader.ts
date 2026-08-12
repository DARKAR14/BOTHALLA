import { readdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Collection } from "discord.js";
import type { Logger } from "../logger.js";
import type { BotCommand } from "./types.js";

const commandFilePattern = /\.command\.(?:js|ts)$/;

export async function loadCommands(logger?: Logger): Promise<Collection<string, BotCommand>> {
  const commandsDirectory = dirname(fileURLToPath(import.meta.url));
  const files = (await findCommandFiles(commandsDirectory)).sort();
  const commands = new Collection<string, BotCommand>();

  for (const file of files) {
    const relativeFile = relative(commandsDirectory, file);
    const category = relativeFile.split(sep)[0];
    const expectedAccess = category === "private"
      ? "developer"
      : category === "public"
        ? "public"
        : undefined;
    if (!expectedAccess) {
      throw new Error(
        `El comando ${relativeFile} debe vivir en commands/public o commands/private.`,
      );
    }

    const moduleUrl = pathToFileURL(file).href;
    const imported = await import(moduleUrl) as { default?: unknown };
    const command = imported.default;

    if (!isBotCommand(command)) {
      throw new Error(
        `El archivo ${relativeFile} no exporta por defecto un comando válido con access, data y execute.`,
      );
    }
    if (command.access !== expectedAccess) {
      throw new Error(
        `${relativeFile} declara access=${command.access}, pero la carpeta ${category} exige access=${expectedAccess}.`,
      );
    }
    if (commands.has(command.data.name)) {
      throw new Error(`El comando /${command.data.name} está duplicado en ${relativeFile}.`);
    }
    commands.set(command.data.name, command);
  }

  if (commands.size === 0) {
    throw new Error(`No se encontraron archivos *.command en ${commandsDirectory}.`);
  }

  logger?.info("Comandos descubiertos", {
    count: commands.size,
    public: commands.filter((command) => command.access === "public").size,
    private: commands.filter((command) => command.access === "developer").size,
    commands: [...commands.keys()].map((name) => `/${name}`),
  });
  return commands;
}

async function findCommandFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findCommandFiles(path);
    return entry.isFile() && commandFilePattern.test(entry.name) ? [path] : [];
  }));
  return nested.flat();
}

function isBotCommand(value: unknown): value is BotCommand {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BotCommand>;
  return Boolean(
    (candidate.access === "public" || candidate.access === "developer")
      && candidate.data
      && typeof candidate.data.name === "string"
      && candidate.data.name.length > 0
      && typeof candidate.data.toJSON === "function"
      && typeof candidate.execute === "function",
  );
}
