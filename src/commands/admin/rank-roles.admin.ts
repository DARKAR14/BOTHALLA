import { EmbedBuilder, MessageFlags, type SlashCommandBuilder } from "discord.js";
import { RANK_ROLE_DEFINITIONS, ensureRankRoles } from "../../services/ranked-roles.js";
import { COLORS } from "../../ui/colors.js";
import type { AdminSubcommand } from "../types.js";

const command: AdminSubcommand = {
  access: "admin",
  commandName: "rank",
  subcommandName: "roles",
  apply(builder: SlashCommandBuilder) {
    builder.addSubcommand((subcommand) =>
      subcommand.setName("roles").setDescription("Crea, colorea y ordena los siete roles ranked"));
  },
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!interaction.guild) throw new Error("/rank roles solo puede usarse dentro de un servidor.");

    const result = await ensureRankRoles(
      interaction.guild,
      `Configuración ranked solicitada por ${interaction.user.tag} (${interaction.user.id})`,
    );
    const created = result.created.length
      ? result.created.map((role) => role.toString()).join(" · ")
      : "Ninguno; los siete rangos ya existían.";
    const existing = result.existing.length
      ? result.existing.map((role) => role.toString()).join(" · ")
      : "Ninguno.";
    const colorsUpdated = result.colorsUpdated.length
      ? result.colorsUpdated.map((role) => role.toString()).join(" · ")
      : "Ninguno; los colores ya eran correctos.";
    const finalOrder = result.ordered.map((role) => {
      const definition = RANK_ROLE_DEFINITIONS.find(({ name }) =>
        name.toLocaleLowerCase("en-US") === role.name.trim().toLocaleLowerCase("en-US"));
      const color = definition?.color.toString(16).padStart(6, "0").toUpperCase() ?? "000000";
      return `${role} · \`#${color}\``;
    }).join("\n");

    await interaction.editReply({ embeds: [new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle("Roles ranked preparados")
      .setDescription(`${RANK_ROLE_DEFINITIONS.length} rangos validados, coloreados y colocados inmediatamente debajo de ${result.botRole}.`)
      .addFields(
        { name: `Creados (${result.created.length})`, value: created },
        { name: `Ya existentes (${result.existing.length})`, value: existing },
        { name: `Colores corregidos (${result.colorsUpdated.length})`, value: colorsUpdated },
        { name: "Orden final · mayor a menor", value: finalOrder },
      )
      .setFooter({ text: "Puedes volver a ejecutar este comando: corrige cambios sin duplicar roles." })] });
  },
};

export default command;
