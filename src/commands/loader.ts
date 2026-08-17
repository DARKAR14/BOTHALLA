import { readdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Collection, PermissionFlagsBits, type ChatInputCommandInteraction, type SlashCommandBuilder } from "discord.js";
import type { Logger } from "../logger.js";
import type { AdminSubcommand, BotCommand } from "./types.js";

const commandFilePattern = /\.command\.(?:js|ts)$/;
const adminFilePattern = /\.admin\.(?:js|ts)$/;

export async function loadCommands(logger?: Logger): Promise<Collection<string, BotCommand>> {
  const commandsDirectory = dirname(fileURLToPath(import.meta.url));
  const files = (await findCommandFiles(commandsDirectory)).sort();
  const commands = new Collection<string, BotCommand>();

  for (const file of files) {
    const relativeFile = relative(commandsDirectory, file);
    const category = relativeFile.split(sep)[0];
    const expectedAccess = category === "dev"
      ? "developer"
      : category === "public"
        ? "public"
        : undefined;
    if (!expectedAccess) {
      throw new Error(
        `El comando ${relativeFile} debe vivir en commands/public o commands/dev.`,
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

  const adminFiles = (await findFiles(commandsDirectory, adminFilePattern)).sort();
  for (const file of adminFiles) {
    const relativeFile = relative(commandsDirectory, file);
    if (relativeFile.split(sep)[0] !== "admin") {
      throw new Error(`El módulo administrativo ${relativeFile} debe vivir en commands/admin.`);
    }
    const imported = await import(pathToFileURL(file).href) as { default?: unknown };
    const fragment = imported.default;
    if (!isAdminSubcommand(fragment)) {
      throw new Error(`El archivo ${relativeFile} no exporta un subcomando administrativo válido.`);
    }
    const parent = commands.get(fragment.commandName);
    if (!parent) {
      throw new Error(`${relativeFile} intenta extender /${fragment.commandName}, pero ese comando público no existe.`);
    }
    fragment.apply(parent.data as SlashCommandBuilder);
    const previousExecute = parent.execute;
    parent.execute = async (interaction, context) => {
      if (interaction.options.getSubcommand(false) !== fragment.subcommandName) {
        return previousExecute(interaction, context);
      }
      if (!await mayUseAdminCommand(interaction)) {
        throw new Error("Solo un administrador del servidor puede usar este comando.");
      }
      return fragment.execute(interaction, context);
    };
  }

  if (commands.size === 0) {
    throw new Error(`No se encontraron archivos *.command en ${commandsDirectory}.`);
  }

  logger?.info("Comandos descubiertos", {
    count: commands.size,
    public: commands.filter((command) => command.access === "public").size,
    dev: commands.filter((command) => command.access === "developer").size,
    admin: adminFiles.length,
    commands: [...commands.keys()].map((name) => `/${name}`),
  });
  if (logger) {
    console.log(formatCommandTable(commands, adminFiles));
  }
  return commands;
}

export function formatCommandTable(
  commands: Collection<string, BotCommand>,
  adminFiles: readonly string[] = [],
): string {
  const rows: Array<[string, string]> = [
    ...commands
      .filter((command) => command.access === "public")
      .map((command): [string, string] => ["PUBLIC", `/${command.data.name}`]),
    ...adminFiles.map((file): [string, string] => ["ADMIN", adminCommandLabel(file)]),
    ...commands
      .filter((command) => command.access === "developer")
      .map((command): [string, string] => ["DEV", `/${command.data.name}`]),
  ].sort(([accessA, commandA], [accessB, commandB]) =>
    accessA.localeCompare(accessB) || commandA.localeCompare(commandB));
  const headings: [string, string] = ["ACCESO", "COMANDO"];
  const accessWidth = Math.max(headings[0].length, ...rows.map(([access]) => access.length));
  const commandWidth = Math.max(headings[1].length, ...rows.map(([, command]) => command.length));
  const border = `+${"-".repeat(accessWidth + 2)}+${"-".repeat(commandWidth + 2)}+`;
  const line = ([access, command]: readonly [string, string]) =>
    `| ${access.padEnd(accessWidth)} | ${command.padEnd(commandWidth)} |`;
  return ["\nComandos activos", border, line(headings), border, ...rows.map(line), border].join("\n");
}

function adminCommandLabel(file: string): string {
  const base = file.split(/[\\/]/).at(-1) ?? file;
  const [command, subcommand] = base.replace(/\.admin\.(?:js|ts)$/, "").split("-");
  return `/${command}${subcommand ? ` ${subcommand}` : ""}`;
}

async function findCommandFiles(directory: string): Promise<string[]> {
  return findFiles(directory, commandFilePattern);
}

async function findFiles(directory: string, pattern: RegExp): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findFiles(path, pattern);
    return entry.isFile() && pattern.test(entry.name) ? [path] : [];
  }));
  return nested.flat();
}

function isAdminSubcommand(value: unknown): value is AdminSubcommand {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AdminSubcommand>;
  return candidate.access === "admin"
    && typeof candidate.commandName === "string"
    && typeof candidate.subcommandName === "string"
    && typeof candidate.apply === "function"
    && typeof candidate.execute === "function";
}

async function mayUseAdminCommand(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (!interaction.guild) return false;
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => undefined);
  return Boolean(member?.permissions.has(PermissionFlagsBits.Administrator));
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
