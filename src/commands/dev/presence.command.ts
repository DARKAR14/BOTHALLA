import {
  ActivityType,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type PresenceStatusData,
} from "discord.js";
import { COLORS } from "../../ui/colors.js";
import type { BotCommand } from "../types.js";

const activityTypes: Record<string, ActivityType> = {
  jugando: ActivityType.Playing,
  escuchando: ActivityType.Listening,
  viendo: ActivityType.Watching,
  compitiendo: ActivityType.Competing,
};

const command: BotCommand = {
  access: "developer",
  data: new SlashCommandBuilder()
    .setName("presence")
    .setDescription("Configura la presencia del bot")
    .addSubcommand((subcommand) => subcommand
      .setName("set")
      .setDescription("Establece una actividad y un estado")
      .addStringOption((option) => option
        .setName("texto")
        .setDescription("Texto que mostrará el bot")
        .setRequired(true)
        .setMaxLength(128))
      .addStringOption((option) => option
        .setName("tipo")
        .setDescription("Tipo de actividad")
        .setRequired(true)
        .addChoices(
          { name: "Jugando", value: "jugando" },
          { name: "Escuchando", value: "escuchando" },
          { name: "Viendo", value: "viendo" },
          { name: "Compitiendo", value: "compitiendo" },
        ))
      .addStringOption((option) => option
        .setName("estado")
        .setDescription("Estado del bot")
        .addChoices(
          { name: "En línea", value: "online" },
          { name: "Ausente", value: "idle" },
          { name: "No molestar", value: "dnd" },
          { name: "Invisible", value: "invisible" },
        )))
    .addSubcommand((subcommand) => subcommand
      .setName("clear")
      .setDescription("Limpia la actividad y vuelve al estado en línea")),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const action = interaction.options.getSubcommand(true);
    if (action === "clear") {
      interaction.client.user.setPresence({ status: "online", activities: [] });
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle("Presencia restablecida")
          .setDescription("El bot quedó en línea y sin actividad personalizada.")],
      });
      return;
    }

    const text = interaction.options.getString("texto", true);
    const type = interaction.options.getString("tipo", true);
    const status = (interaction.options.getString("estado") ?? "online") as PresenceStatusData;
    interaction.client.user.setPresence({
      status,
      activities: [{ name: text, type: activityTypes[type] ?? ActivityType.Playing }],
    });
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle("Presencia actualizada")
        .setDescription(`El bot ahora está **${type} ${text}** con estado **${status}**.`)],
    });
  },
};

export default command;
