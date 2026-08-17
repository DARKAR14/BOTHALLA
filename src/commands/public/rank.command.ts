import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { resolvePlayerTarget } from "../../services/player-target.js";
import { playerSelection } from "../../ui/common.js";
import { addPlayerTargets } from "../player-targets.js";
import type { BotCommand } from "../types.js";

const command: BotCommand = {
  access: "public",
  data: addPlayerTargets(
    new SlashCommandBuilder()
      .setName("rank")
      .setDescription("Muestra información ranked de Brawlhalla"),
  ),

  async execute(interaction, context) {
    const subcommand = interaction.options.getSubcommand();
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
