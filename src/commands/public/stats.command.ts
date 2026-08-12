import { SlashCommandBuilder } from "discord.js";
import { resolvePlayerTarget } from "../../services/player-target.js";
import { playerSelection } from "../../ui/common.js";
import { addPlayerTargets } from "../player-targets.js";
import type { BotCommand } from "../types.js";

const command: BotCommand = {
  access: "public",
  data: addPlayerTargets(
    new SlashCommandBuilder()
      .setName("stats")
      .setDescription("Muestra estadísticas generales de Brawlhalla"),
  ),

  async execute(interaction, context) {
    await interaction.deferReply();
    const target = await resolvePlayerTarget(interaction, context.profiles, context.api);
    if (target.kind === "choices") {
      await interaction.editReply(playerSelection(target.matches, "stats", interaction.user.id));
      return;
    }

    await interaction.editReply(
      await context.statsPresenter.render(target.brawlhallaId, "overview", interaction.user.id),
    );
  },
};

export default command;
