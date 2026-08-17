import { Collection, PermissionFlagsBits } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import {
  RANK_ROLE_DEFINITIONS,
  ensureRankRoles,
  rankedRoleNameFromTier,
  syncMemberRankRole,
} from "./ranked-roles.js";

describe("ranked roles", () => {
  it.each([
    ["Tin 1", "Tin"],
    ["Bronze 3", "Bronze"],
    ["Silver 2", "Silver"],
    ["Gold 5", "Gold"],
    ["Platinum 2", "Platinum"],
    ["Diamond", "Diamond"],
    ["Valhallan", "Valhallan"],
    [null, undefined],
    ["Master", undefined],
  ])("convierte el tier %s al rol base", (tier, expected) => {
    expect(rankedRoleNameFromTier(tier)).toBe(expected);
  });

  it("conserva los roles existentes y crea únicamente los faltantes", async () => {
    const goldColor = RANK_ROLE_DEFINITIONS.find(({ name }) => name === "Gold")!.color;
    const gold = fakeRole("gold", "Gold", goldColor);
    const roles = new Collection([[gold.id, gold]]);
    const create = vi.fn().mockImplementation(async ({ name, colors }) => {
      const role = fakeRole(name.toLocaleLowerCase("en-US"), name, colors.primaryColor);
      roles.set(role.id, role);
      return role;
    });
    const setPositions = vi.fn().mockResolvedValue(undefined);
    const guild = {
      members: { fetchMe: vi.fn().mockResolvedValue(botWithManageRoles()) },
      roles: { cache: roles, fetch: vi.fn().mockResolvedValue(roles), create, setPositions },
    };

    const result = await ensureRankRoles(guild as never, "test");

    expect(result.existing).toEqual([gold]);
    expect(result.created).toHaveLength(RANK_ROLE_DEFINITIONS.length - 1);
    expect(create).not.toHaveBeenCalledWith(expect.objectContaining({ name: "Gold" }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: "Platinum",
      colors: { primaryColor: RANK_ROLE_DEFINITIONS.find(({ name }) => name === "Platinum")!.color },
    }));
    expect(result.colorsUpdated).toHaveLength(0);
    expect(result.ordered.map((role) => role.name)).toEqual([
      "Valhallan",
      "Diamond",
      "Platinum",
      "Gold",
      "Silver",
      "Bronze",
      "Tin",
    ]);
    expect(setPositions).toHaveBeenCalledWith([
      { role: expect.objectContaining({ name: "Valhallan" }), position: 19 },
      { role: expect.objectContaining({ name: "Diamond" }), position: 18 },
      { role: expect.objectContaining({ name: "Platinum" }), position: 17 },
      { role: expect.objectContaining({ name: "Gold" }), position: 16 },
      { role: expect.objectContaining({ name: "Silver" }), position: 15 },
      { role: expect.objectContaining({ name: "Bronze" }), position: 14 },
      { role: expect.objectContaining({ name: "Tin" }), position: 13 },
    ]);
  });

  it("corrige el color de un rol existente sin duplicarlo", async () => {
    const roles = new Collection(
      RANK_ROLE_DEFINITIONS.map(({ name }) => {
        const role = fakeRole(name.toLowerCase(), name, 0);
        return [role.id, role] as const;
      }),
    );
    const create = vi.fn();
    const guild = {
      members: { fetchMe: vi.fn().mockResolvedValue(botWithManageRoles()) },
      roles: {
        cache: roles,
        fetch: vi.fn().mockResolvedValue(roles),
        create,
        setPositions: vi.fn().mockResolvedValue(undefined),
      },
    };

    const result = await ensureRankRoles(guild as never, "test");

    expect(create).not.toHaveBeenCalled();
    expect(result.colorsUpdated).toHaveLength(RANK_ROLE_DEFINITIONS.length);
    for (const definition of RANK_ROLE_DEFINITIONS) {
      const role = roles.get(definition.name.toLowerCase())!;
      expect(role.edit).toHaveBeenCalledWith({
        colors: {
          primaryColor: definition.color,
          secondaryColor: null,
          tertiaryColor: null,
        },
        reason: "test",
      });
    }
  });

  it("no intenta reordenar cuando la jerarquía ya es correcta", async () => {
    const roles = new Collection(
      [...RANK_ROLE_DEFINITIONS].reverse().map(({ name }, index) => {
        const role = fakeRole(name.toLowerCase(), name, 0, 19 - index);
        return [role.id, role] as const;
      }),
    );
    const setPositions = vi.fn();
    const guild = {
      members: { fetchMe: vi.fn().mockResolvedValue(botWithManageRoles()) },
      roles: {
        cache: roles,
        fetch: vi.fn().mockResolvedValue(roles),
        create: vi.fn(),
        setPositions,
      },
    };

    await ensureRankRoles(guild as never, "test");
    expect(setPositions).not.toHaveBeenCalled();
  });

  it("retira el rango anterior antes de asignar el actual", async () => {
    const gold = fakeRole("gold", "Gold");
    const platinum = fakeRole("platinum", "Platinum");
    const remove = vi.fn().mockResolvedValue(undefined);
    const add = vi.fn().mockResolvedValue(undefined);
    const guild = {
      members: { fetchMe: vi.fn().mockResolvedValue(botWithManageRoles()) },
      roles: {
        fetch: vi.fn().mockResolvedValue(new Collection([
          [gold.id, gold],
          [platinum.id, platinum],
        ])),
      },
    };
    const member = {
      guild,
      manageable: true,
      roles: {
        cache: new Collection([[gold.id, gold]]),
        remove,
        add,
      },
    };

    const result = await syncMemberRankRole(member as never, "Platinum", "test");

    expect(remove).toHaveBeenCalledWith([gold], "test");
    expect(add).toHaveBeenCalledWith(platinum, "test");
    expect(result).toMatchObject({ assigned: platinum, removed: [gold], unchanged: false });
  });
});

function botWithManageRoles() {
  return {
    permissions: {
      has: (permission: bigint) => permission === PermissionFlagsBits.ManageRoles,
    },
    roles: { highest: fakeRole("bot", "Bothalla", 0, 20) },
  };
}

function fakeRole(id: string, name: string, color = 0, position = 1) {
  const role = {
    id,
    name,
    color,
    colors: {
      primaryColor: color,
      secondaryColor: null as number | null,
      tertiaryColor: null as number | null,
    },
    editable: true,
    position,
    edit: vi.fn(),
    toString: () => `<@&${id}>`,
  };
  role.edit.mockImplementation(async ({ colors }) => {
    role.color = colors.primaryColor;
    role.colors = { ...colors };
    return role;
  });
  return role;
}
