/*
 * THESIS: una ficha competitiva nativa de Discord; rechaza simular una web dentro del chat.
 * OWN-WORLD: embeds sobrios, azul de acción, color semántico y datos organizados por apartados.
 * STORY: identificar al jugador, entender el rendimiento y navegar al detalle sin repetir comandos.
 * FIRST VIEWPORT: identidad y métricas clave arriba; apartados estables en una fila de botones debajo.
 * FORM: operate, controles nativos y densidad progresiva. Seed: discord-native-scorecard.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type InteractionEditReplyOptions,
} from "discord.js";
import type { PlayerSearchMatch } from "../brawlhalla/types.js";
import {
  BrawlhallaApiError,
  LinkedProfileNotFoundError,
  PlayerNotFoundError,
  RankedDataNotFoundError,
} from "../brawlhalla/errors.js";
import { COLORS } from "./colors.js";
import { componentId } from "./custom-ids.js";
import { formatNumber, truncate } from "./format.js";

export function playerSelection(
  matches: PlayerSearchMatch[],
  destination: "stats" | "rank",
  ownerId: string,
): InteractionEditReplyOptions {
  if (matches.length === 0) {
    return {
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.warning)
          .setTitle("No encontré ese nombre")
          .setDescription(
            "La API v1.0 busca nombres mediante los leaderboards. El jugador debe aparecer en ranked para poder resolver su Brawlhalla ID.",
          ),
      ],
      components: [],
    };
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(componentId("pick", destination, ownerId))
    .setPlaceholder("Elige el jugador correcto")
    .addOptions(
      matches.map((match) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(truncate(match.username, 100))
          .setValue(String(match.id))
          .setDescription(
            truncate(
              `ID ${match.id} · ${match.tier ?? "Sin rango"} · ${match.modes.join(", ")}`,
              100,
            ),
          ),
      ),
    );

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.brand)
        .setTitle("Encontré varios jugadores")
        .setDescription("Selecciona el perfil que quieres consultar."),
    ],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
  };
}

export function clanSelection(
  matches: Array<{ guild_id: number; name: string; rank?: number }>,
  ownerId: string,
): InteractionEditReplyOptions {
  if (matches.length === 0) {
    return {
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.warning)
          .setTitle("Clan todavía desconocido")
          .setDescription(
            "Brawlhalla API v1.0 no permite buscar clanes globalmente por nombre. Durante esta sesión solo puedo encontrar clanes consultados antes mediante ID, mención o perfil propio.",
          ),
      ],
      components: [],
    };
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(componentId("pick", "clan", ownerId))
    .setPlaceholder("Elige el clan correcto")
    .addOptions(
      matches.map((guild) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(truncate(guild.name, 100))
          .setValue(String(guild.guild_id))
          .setDescription(
            truncate(
              `ID ${guild.guild_id} · Puesto ${formatNumber(guild.rank)}`,
              100,
            ),
          ),
      ),
    );

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.brand)
        .setTitle("Clanes conocidos por Bothalla")
        .setDescription("Selecciona un clan del índice temporal de esta sesión."),
    ],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
  };
}

export function errorPayload(error: unknown): InteractionEditReplyOptions {
  const message = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.error)
        .setTitle("No pude completar la consulta")
        .setDescription(message)
        .setFooter({ text: recoveryMessage(error) }),
    ],
    components: [],
  };
}

function recoveryMessage(error: unknown): string {
  if (error instanceof LinkedProfileNotFoundError) {
    return "Vincula la cuenta con /create y vuelve a ejecutar el comando.";
  }
  if (error instanceof PlayerNotFoundError) {
    return "Comprueba el Brawlhalla ID e inténtalo otra vez.";
  }
  if (error instanceof RankedDataNotFoundError) {
    return "Cambia de modo con los botones o prueba después de jugar ranked.";
  }
  if (error instanceof BrawlhallaApiError && error.retryable) {
    return "La fuente está temporalmente indisponible; inténtalo de nuevo en unos segundos.";
  }
  return "Revisa los datos introducidos y vuelve a intentarlo.";
}

export function linkProfileButton(ownerId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(componentId("help", "create", ownerId))
      .setLabel("Cómo vincular mi cuenta")
      .setStyle(ButtonStyle.Primary),
  );
}
