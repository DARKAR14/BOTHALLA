import { describe, expect, it } from "vitest";
import { loadCommands } from "./loader.js";

describe("command loader", () => {
  it("descubre cada archivo *.command sin una lista central", async () => {
    const commands = await loadCommands();
    expect([...commands.keys()].sort()).toEqual(["clan", "create", "presence", "rank", "role", "stats"]);
  });

  it("todos los comandos descubiertos producen JSON y tienen ejecutor", async () => {
    const commands = await loadCommands();
    for (const [name, command] of commands) {
      expect(command.data.toJSON().name).toBe(name);
      expect(command.access).toBe(name === "presence" ? "developer" : "public");
      expect(command.execute).toBeTypeOf("function");
    }
  });

  it("fusiona el subcomando administrativo /rank roles sin duplicar /rank", async () => {
    const commands = await loadCommands();
    const rank = commands.get("rank")!.data.toJSON();
    expect(rank.options?.map((option) => option.name)).toContain("roles");
    expect(commands.filter((_command, name) => name === "rank")).toHaveLength(1);
  });
});
