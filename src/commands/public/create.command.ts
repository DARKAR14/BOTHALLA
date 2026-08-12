import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { COLORS } from "../../ui/colors.js";
import { componentId } from "../../ui/custom-ids.js";
import type { BotCommand } from "../types.js";

const command: BotCommand = {
  access: "public",
  data: new SlashCommandBuilder()
    .setName("create")
    .setDescription("Crea o actualiza tu perfil de Bothalla")
    .addIntegerOption((option) =>
      option
        .setName("brawlhalla_id")
        .setDescription("Tu Brawlhalla ID numérico")
        .setRequired(true)
        .setMinValue(1),
    ),

  async execute(interaction, context) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const brawlhallaId = interaction.options.getInteger("brawlhalla_id", true);
    const player = await context.api.getPlayerStats(brawlhallaId, "all");
    await context.profiles.link(interaction.user.id, brawlhallaId);

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle("Cuenta vinculada")
      .setDescription(
        `**${player.name}** quedó vinculado a <@${interaction.user.id}>. Desde ahora puedes usar los subcomandos \`self\` y otras personas pueden consultarte con \`mention\`.`,
      )
      .addFields({ name: "Brawlhalla ID", value: String(brawlhallaId), inline: true })
      .setFooter({ text: "MongoDB solo guarda esta vinculación; no almacena tus estadísticas." });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(componentId("stats", "overview", interaction.user.id, brawlhallaId))
        .setLabel("Ver mis estadísticas")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(componentId("rank", "main", interaction.user.id, brawlhallaId))
        .setLabel("Ver mi ranked")
        .setStyle(ButtonStyle.Secondary),
    );
    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};

export default command;
