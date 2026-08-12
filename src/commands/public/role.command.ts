import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { LinkedProfileNotFoundError } from "../../brawlhalla/errors.js";
import {
  rankedRoleNameFromTier,
  syncMemberRankRole,
} from "../../services/ranked-roles.js";
import { rankColor } from "../../ui/colors.js";
import { formatNumber } from "../../ui/format.js";
import type { BotCommand } from "../types.js";

const command: BotCommand = {
  access: "public",
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Sincroniza tu rol de Discord con tu rango de Brawlhalla")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("self")
        .setDescription("Asigna el rol correspondiente a tu rango ranked 1v1"),
    ),

  async execute(interaction, context) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!interaction.guild) {
      throw new Error("/role self solo puede usarse dentro de un servidor.");
    }

    const profile = await context.profiles.findByDiscordUserId(interaction.user.id);
    if (!profile) throw new LinkedProfileNotFoundError(interaction.user.id);

    const ranked = await context.api.getPlayerStats(profile.brawlhallaId, "ranked_1v1");
    const leaderboard = await context.api.findRankingByPlayer(
      profile.brawlhallaId,
      ranked.name,
      "1v1",
    );
    const tier = leaderboard?.tier ?? ranked.tier;
    const rank = rankedRoleNameFromTier(tier);
    if (!rank) {
      throw new Error(
        "Brawlhalla todavía no devuelve un tier ranked 1v1 reconocible para tu cuenta. Juega tus partidas de clasificación y vuelve a intentarlo.",
      );
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const result = await syncMemberRankRole(
      member,
      rank,
      `Rango ${rank} sincronizado desde Brawlhalla ID ${profile.brawlhallaId}`,
    );
    const rating = leaderboard?.rating ?? ranked.rating;
    const rankEmoji = context.emojis.rankMention(tier ?? rank);
    const changes = result.unchanged
      ? "Ya tenías el rol correcto; no fue necesario hacer cambios."
      : result.removed.length > 0
        ? `Retiré ${result.removed.map((role) => role.toString()).join(" · ")} y asigné ${result.assigned}.`
        : `Asigné ${result.assigned}.`;

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(rankColor(rank))
          .setTitle(result.unchanged ? "Tu rol ya estaba sincronizado" : "Rol ranked actualizado")
          .setDescription(changes)
          .addFields(
            { name: "Jugador", value: ranked.name, inline: true },
            {
              name: "Rango",
              value: `${rankEmoji ? `${rankEmoji} ` : ""}${tier ?? rank}`,
              inline: true,
            },
            { name: "Elo", value: formatNumber(rating), inline: true },
          ),
      ],
    });
  },
};

export default command;
