import { SlashCommandBuilder } from "discord.js";
import { LinkedProfileNotFoundError } from "../../brawlhalla/errors.js";
import { clanSelection } from "../../ui/common.js";
import type { BotCommand } from "../types.js";

const command: BotCommand = {
  access: "public",
  data: new SlashCommandBuilder()
    .setName("clan")
    .setDescription("Muestra información de un clan de Brawlhalla")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("id")
        .setDescription("Consulta un clan usando su ID")
        .addIntegerOption((option) =>
          option
            .setName("clan_id")
            .setDescription("ID numérico del clan")
            .setRequired(true)
            .setMinValue(1),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("mention")
        .setDescription("Consulta el clan de una cuenta vinculada")
        .addUserOption((option) =>
          option
            .setName("usuario")
            .setDescription("Usuario de Discord que vinculó su Brawlhalla ID")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("name")
        .setDescription("Busca entre los clanes vistos por el bot en esta sesión")
        .addStringOption((option) =>
          option
            .setName("nombre")
            .setDescription("Nombre del clan")
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(100),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("self").setDescription("Consulta el clan de tu cuenta vinculada"),
    ),

  async execute(interaction, context) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "name") {
      const matches = context.guildIndex.search(interaction.options.getString("nombre", true));
      await interaction.editReply(clanSelection(matches, interaction.user.id));
      return;
    }

    let guildId: number;
    if (subcommand === "id") {
      guildId = interaction.options.getInteger("clan_id", true);
    } else {
      const discordUserId = subcommand === "self"
        ? interaction.user.id
        : interaction.options.getUser("usuario", true).id;
      const profile = await context.profiles.findByDiscordUserId(discordUserId);
      if (!profile) throw new LinkedProfileNotFoundError(discordUserId);
      const response = await context.api.getPlayerGuild(profile.brawlhallaId);
      if (!response.guild) {
        throw new Error("Ese jugador no pertenece a un clan o Brawlhalla no tiene el dato disponible.");
      }
      guildId = response.guild.guild_id;
    }

    await interaction.editReply(
      await context.clanPresenter.render(guildId, "overview", interaction.user.id),
    );
  },
};

export default command;
