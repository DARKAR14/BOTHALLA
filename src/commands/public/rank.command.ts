import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { resolvePlayerTarget } from "../../services/player-target.js";
import {
  RANK_ROLE_DEFINITIONS,
  ensureRankRoles,
  mayConfigureRankRoles,
} from "../../services/ranked-roles.js";
import { COLORS } from "../../ui/colors.js";
import { playerSelection } from "../../ui/common.js";
import { addPlayerTargets } from "../player-targets.js";
import type { BotCommand } from "../types.js";

const command: BotCommand = {
  access: "public",
  data: addPlayerTargets(
    new SlashCommandBuilder()
      .setName("rank")
      .setDescription("Muestra información ranked de Brawlhalla"),
  ).addSubcommand((subcommand) =>
    subcommand
      .setName("roles")
      .setDescription("Crea, colorea y ordena los siete roles ranked"),
  ),

  async execute(interaction, context) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "roles") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (!interaction.guild) {
        throw new Error("/rank roles solo puede usarse dentro de un servidor.");
      }
      if (!await mayConfigureRankRoles(interaction, context.developerIds)) {
        throw new Error(
          "Solo un desarrollador configurado de Bothalla o un administrador del servidor puede usar /rank roles.",
        );
      }

      const result = await ensureRankRoles(
        interaction.guild,
        `Configuración ranked solicitada por ${interaction.user.tag} (${interaction.user.id})`,
      );
      const created = result.created.length > 0
        ? result.created.map((role) => role.toString()).join(" · ")
        : "Ninguno; los siete rangos ya existían.";
      const existing = result.existing.length > 0
        ? result.existing.map((role) => role.toString()).join(" · ")
        : "Ninguno.";
      const colorsUpdated = result.colorsUpdated.length > 0
        ? result.colorsUpdated.map((role) => role.toString()).join(" · ")
        : "Ninguno; los colores ya eran correctos.";
      const finalOrder = result.ordered.map((role) => {
        const definition = RANK_ROLE_DEFINITIONS.find(({ name }) =>
          name.toLocaleLowerCase("en-US") === role.name.trim().toLocaleLowerCase("en-US"),
        );
        const color = definition?.color.toString(16).padStart(6, "0").toUpperCase() ?? "000000";
        return `${role} · \`#${color}\``;
      }).join("\n");
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle("Roles ranked preparados")
            .setDescription(
              `${RANK_ROLE_DEFINITIONS.length} rangos validados, coloreados y colocados inmediatamente debajo de ${result.botRole}.`,
            )
            .addFields(
              { name: `Creados (${result.created.length})`, value: created },
              { name: `Ya existentes (${result.existing.length})`, value: existing },
              { name: `Colores corregidos (${result.colorsUpdated.length})`, value: colorsUpdated },
              { name: "Orden final · mayor a menor", value: finalOrder },
            )
            .setFooter({ text: "Puedes volver a ejecutar este comando: corrige cambios sin duplicar roles." }),
        ],
      });
      return;
    }

    const isSelf = subcommand === "self";
    await interaction.deferReply(isSelf ? { flags: MessageFlags.Ephemeral } : {});
    const target = await resolvePlayerTarget(interaction, context.profiles, context.api);
    if (target.kind === "choices") {
      await interaction.editReply(playerSelection(target.matches, "rank", interaction.user.id));
      return;
    }

    await interaction.editReply(
      await context.rankPresenter.render(target.brawlhallaId, "main", interaction.user.id),
    );
  },
};

export default command;
