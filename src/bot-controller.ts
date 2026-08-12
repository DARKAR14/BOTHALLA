import {
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Collection,
  type Interaction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { LinkedProfileNotFoundError } from "./brawlhalla/errors.js";
import type { BotCommand, CommandContext } from "./commands/types.js";
import type { Logger } from "./logger.js";
import { InteractionRateLimiter } from "./services/interaction-rate-limiter.js";
import { errorPayload, linkProfileButton } from "./ui/common.js";
import { parseComponentId } from "./ui/custom-ids.js";

export class BotController {
  public constructor(
    private readonly commands: Collection<string, BotCommand>,
    private readonly context: CommandContext,
    private readonly logger: Logger,
    private readonly rateLimiter = new InteractionRateLimiter(),
  ) {}

  public async handle(interaction: Interaction): Promise<void> {
    try {
      if (isHandledInteraction(interaction) && !await this.allowInteraction(interaction)) return;
      if (interaction.isChatInputCommand()) await this.handleCommand(interaction);
      else if (interaction.isButton()) await this.handleButton(interaction);
      else if (interaction.isStringSelectMenu()) await this.handleSelect(interaction);
    } catch (error) {
      this.logger.error("Interacción fallida", {
        error,
        interactionId: interaction.id,
        userId: interaction.user.id,
      });
      await this.respondWithError(interaction, error);
    }
  }

  private async allowInteraction(interaction: Interaction): Promise<boolean> {
    const decision = this.rateLimiter.consume(interaction.user.id);
    if (decision.allowed) return true;
    if (interaction.isRepliable()) {
      await interaction.reply({
        content: `Estás haciendo consultas demasiado rápido. Espera ${Math.ceil(decision.retryAfterMs / 1_000)} s e inténtalo de nuevo.`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => undefined);
    }
    return false;
  }

  private async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.commands.get(interaction.commandName);
    if (!command) {
      await interaction.reply({
        content: "Ese comando ya no está disponible. Reinicia Discord e inténtalo de nuevo.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (command.access === "developer" && !this.context.developerIds.has(interaction.user.id)) {
      await interaction.reply({
        content: "Este comando es privado y solo está disponible para los desarrolladores configurados de Bothalla.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await command.execute(interaction, this.context);
  }

  private async handleButton(interaction: ButtonInteraction): Promise<void> {
    const action = parseComponentId(interaction.customId);
    if (!action) return;
    if (interaction.user.id !== action.ownerId) {
      await interaction.reply({
        content: "Este panel pertenece a otra persona. Ejecuta el comando para abrir el tuyo.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action.area === "help") {
      await interaction.reply({
        content: "Usa `/create brawlhalla_id:<tu ID>` para vincular tu cuenta.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferUpdate();
    if (action.area === "stats") {
      await interaction.editReply(
        await this.context.statsPresenter.render(
          action.entityId,
          action.view,
          action.ownerId,
          action.page,
        ),
      );
    } else if (action.area === "rank") {
      await interaction.editReply(
        await this.context.rankPresenter.render(
          action.entityId,
          action.view,
          action.ownerId,
          action.page,
        ),
      );
    } else if (action.area === "clan") {
      await interaction.editReply(
        await this.context.clanPresenter.render(
          action.entityId,
          action.view,
          action.ownerId,
          action.page,
        ),
      );
    }
  }

  private async handleSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const action = parseComponentId(interaction.customId);
    if (!action || action.area !== "pick") return;
    if (interaction.user.id !== action.ownerId) {
      await interaction.reply({
        content: "Esta selección pertenece a otra persona.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const selectedId = Number(interaction.values[0]);
    if (!Number.isSafeInteger(selectedId) || selectedId <= 0) {
      throw new Error("La selección recibida no contiene un ID válido.");
    }

    await interaction.deferUpdate();
    if (action.view === "stats") {
      await interaction.editReply(
        await this.context.statsPresenter.render(selectedId, "overview", action.ownerId),
      );
    } else if (action.view === "rank") {
      await interaction.editReply(
        await this.context.rankPresenter.render(selectedId, "main", action.ownerId),
      );
    } else {
      await interaction.editReply(
        await this.context.clanPresenter.render(selectedId, "overview", action.ownerId),
      );
    }
  }

  private async respondWithError(interaction: Interaction, error: unknown): Promise<void> {
    if (!interaction.isRepliable()) return;
    const payload = errorPayload(error);
    if (error instanceof LinkedProfileNotFoundError) {
      payload.components = [linkProfileButton(interaction.user.id)];
    }

    const embeds = payload.embeds ?? [];
    const components = payload.components ?? [];

    if (interaction.isMessageComponent() && interaction.deferred) {
      await interaction.followUp({
        embeds,
        components,
        flags: MessageFlags.Ephemeral,
      }).catch(() => undefined);
      return;
    }
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds, components }).catch(() => undefined);
      return;
    }
    await interaction.reply({
      embeds,
      components,
      flags: MessageFlags.Ephemeral,
    }).catch(() => undefined);
  }
}

function isHandledInteraction(
  interaction: Interaction,
): interaction is ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction {
  return interaction.isChatInputCommand()
    || interaction.isButton()
    || interaction.isStringSelectMenu();
}
