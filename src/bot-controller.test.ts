import { Collection } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { BotController } from "./bot-controller.js";
import type { BotCommand, CommandContext } from "./commands/types.js";
import type { Logger } from "./logger.js";

describe("private command access", () => {
  it("bloquea un comando privado para usuarios no configurados", async () => {
    const execute = vi.fn();
    const reply = vi.fn().mockResolvedValue(undefined);
    const controller = controllerWithPrivateCommand(execute, new Set(["developer"]));

    await controller.handle(interactionFor("member", reply) as never);

    expect(execute).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining("solo está disponible para los desarrolladores"),
    }));
  });

  it("ejecuta un comando privado para un desarrollador configurado", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const controller = controllerWithPrivateCommand(execute, new Set(["developer"]));

    await controller.handle(interactionFor("developer", vi.fn()) as never);

    expect(execute).toHaveBeenCalledOnce();
  });
});

function controllerWithPrivateCommand(execute: BotCommand["execute"], developerIds: Set<string>) {
  const command: BotCommand = {
    access: "developer",
    data: {
      name: "secret",
      toJSON: () => ({ name: "secret", description: "test", type: 1 }),
    },
    execute,
  };
  return new BotController(
    new Collection([["secret", command]]),
    { developerIds } as unknown as CommandContext,
    { error: vi.fn() } as unknown as Logger,
  );
}

function interactionFor(userId: string, reply: ReturnType<typeof vi.fn>) {
  return {
    id: "interaction",
    commandName: "secret",
    user: { id: userId },
    reply,
    isChatInputCommand: () => true,
    isButton: () => false,
    isStringSelectMenu: () => false,
  };
}
