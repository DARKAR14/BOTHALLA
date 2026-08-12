import type { SlashCommandBuilder } from "discord.js";

export function addPlayerTargets(command: SlashCommandBuilder): SlashCommandBuilder {
  command
    .addSubcommand((subcommand) =>
      subcommand
        .setName("id")
        .setDescription("Consulta usando un Brawlhalla ID")
        .addIntegerOption((option) =>
          option
            .setName("brawlhalla_id")
            .setDescription("ID numérico de la cuenta de Brawlhalla")
            .setRequired(true)
            .setMinValue(1),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("mention")
        .setDescription("Consulta la cuenta vinculada de un usuario de Discord")
        .addUserOption((option) =>
          option
            .setName("usuario")
            .setDescription("Usuario de Discord que vinculó su Brawlhalla ID")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("self").setDescription("Consulta tu cuenta vinculada"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("username")
        .setDescription("Busca un jugador dentro de los leaderboards ranked")
        .addStringOption((option) =>
          option
            .setName("nombre")
            .setDescription("Nombre actual del jugador en Brawlhalla")
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(100),
        ),
    );
  return command;
}
