import { describe, expect, it } from "vitest";
import { loadCommands } from "./loader.js";

describe("command loader", () => {
  it("descubre cada archivo *.command sin una lista central", async () => {
    const commands = await loadCommands();
    expect([...commands.keys()].sort()).toEqual(["clan", "create", "rank", "role", "stats"]);
  });

  it("todos los comandos descubiertos producen JSON y tienen ejecutor", async () => {
    const commands = await loadCommands();
    for (const [name, command] of commands) {
      expect(command.data.toJSON().name).toBe(name);
      expect(command.access).toBe("public");
      expect(command.execute).toBeTypeOf("function");
    }
  });
});
