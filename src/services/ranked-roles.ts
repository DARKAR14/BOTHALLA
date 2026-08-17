import {
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildMember,
  type Role,
} from "discord.js";
import { COLORS } from "../ui/colors.js";

export const RANK_ROLE_DEFINITIONS = [
  { name: "Tin", color: COLORS.ranks.tin },
  { name: "Bronze", color: COLORS.ranks.bronze },
  { name: "Silver", color: COLORS.ranks.silver },
  { name: "Gold", color: COLORS.ranks.gold },
  { name: "Platinum", color: COLORS.ranks.platinum },
  { name: "Diamond", color: COLORS.ranks.diamond },
  { name: "Valhallan", color: COLORS.ranks.valhallan },
] as const;

export type RankedRoleName = (typeof RANK_ROLE_DEFINITIONS)[number]["name"];

export interface RankRoleSetupResult {
  created: Role[];
  existing: Role[];
  colorsUpdated: Role[];
  ordered: Role[];
  botRole: Role;
}

export interface RankRoleSyncResult {
  assigned: Role;
  removed: Role[];
  unchanged: boolean;
}

export async function mayConfigureRankRoles(
  interaction: ChatInputCommandInteraction,
  developerIds: ReadonlySet<string>,
): Promise<boolean> {
  if (developerIds.has(interaction.user.id)) return true;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (!interaction.guild) return false;

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => undefined);
  return Boolean(member?.permissions.has(PermissionFlagsBits.Administrator));
}

export function rankedRoleNameFromTier(tier: string | null | undefined): RankedRoleName | undefined {
  const normalized = tier?.trim().toLocaleLowerCase("en-US") ?? "";
  return RANK_ROLE_DEFINITIONS.find(({ name }) =>
    normalized === name.toLocaleLowerCase("en-US")
      || normalized.startsWith(`${name.toLocaleLowerCase("en-US")} `),
  )?.name;
}

export async function ensureRankRoles(
  guild: Guild,
  reason: string,
): Promise<RankRoleSetupResult> {
  const botMember = await guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error(
      "Necesito el permiso Administrar roles para crear los rangos. Actívalo en el rol del bot y vuelve a ejecutar /rank roles.",
    );
  }

  const roles = await guild.roles.fetch();
  const byName = new Map(
    [...roles.values()].map((role) => [normalizeRoleName(role.name), role] as const),
  );
  const created: Role[] = [];
  const existing: Role[] = [];
  const colorsUpdated: Role[] = [];

  const blocked = RANK_ROLE_DEFINITIONS
    .map(({ name }) => byName.get(normalizeRoleName(name)))
    .find((role) => role && !role.editable);
  if (blocked) {
    throw new Error(
      `No puedo corregir ${blocked.name} porque está por encima del rol de Bothalla. Mueve ese rol debajo del bot y ejecuta /rank roles otra vez.`,
    );
  }

  for (const definition of RANK_ROLE_DEFINITIONS) {
    const found = byName.get(normalizeRoleName(definition.name));
    if (found) {
      existing.push(found);
      if (found.colors.primaryColor !== definition.color
        || found.colors.secondaryColor !== null
        || found.colors.tertiaryColor !== null) {
        const updated = await found.edit({
          colors: {
            primaryColor: definition.color,
            secondaryColor: null,
            tertiaryColor: null,
          },
          reason,
        });
        byName.set(normalizeRoleName(definition.name), updated);
        colorsUpdated.push(updated);
      }
      continue;
    }
    const role = await guild.roles.create({
      name: definition.name,
      colors: { primaryColor: definition.color },
      reason,
    });
    byName.set(normalizeRoleName(role.name), role);
    created.push(role);
  }

  await guild.roles.fetch();
  const refreshedBotMember = await guild.members.fetchMe();
  const botRole = refreshedBotMember.roles.highest;
  const ordered = [...RANK_ROLE_DEFINITIONS]
    .reverse()
    .map(({ name }) => guild.roles.cache.find((role) =>
      normalizeRoleName(role.name) === normalizeRoleName(name),
    ))
    .filter((role): role is Role => Boolean(role));

  if (ordered.length !== RANK_ROLE_DEFINITIONS.length) {
    throw new Error("Discord no devolvió todos los roles recién configurados. Ejecuta /rank roles otra vez.");
  }
  if (ordered.some((role) => !role.editable)) {
    throw new Error(
      "No puedo colocar todos los rangos debajo del bot por la jerarquía actual. Mueve el rol de Bothalla por encima de los rangos y vuelve a intentarlo.",
    );
  }

  if (!rolesAreImmediatelyBelow(botRole, ordered)) {
    try {
      await guild.roles.setPositions(ordered.map((role, index) => ({
        role,
        position: botRole.position - 1 - index,
      })));
    } catch (error) {
      // Discord can apply the batch and still return an error if another role
      // update happened at the same time. Only ignore it after verifying the
      // final hierarchy from a fresh fetch.
      const refreshedRoles = await guild.roles.fetch();
      const refreshedBotRole = (await guild.members.fetchMe()).roles.highest;
      const refreshedOrdered = ordered.map((role) => refreshedRoles.get(role.id)).filter(
        (role): role is Role => Boolean(role),
      );
      if (refreshedOrdered.length !== ordered.length
        || !rolesAreImmediatelyBelow(refreshedBotRole, refreshedOrdered)) {
        throw error;
      }
    }
  }

  return { created, existing, colorsUpdated, ordered, botRole };
}

export async function syncMemberRankRole(
  member: GuildMember,
  rank: RankedRoleName,
  reason: string,
): Promise<RankRoleSyncResult> {
  const botMember = await member.guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error(
      "Necesito el permiso Administrar roles para sincronizar tu rango. Pídele a un administrador que lo active.",
    );
  }
  const roles = await member.guild.roles.fetch();
  const rankedRoles = [...roles.values()].filter((role) => isRankRoleName(role.name));
  const assigned = rankedRoles.find((role) => normalizeRoleName(role.name) === normalizeRoleName(rank));
  if (!assigned) {
    throw new Error(
      `Falta el rol ${rank}. Un desarrollador o administrador debe ejecutar /rank roles primero.`,
    );
  }
  if (!assigned.editable) {
    throw new Error(
      `No puedo asignar ${rank} porque está por encima del rol de Bothalla. Ajusta la jerarquía del servidor.`,
    );
  }

  const stale = rankedRoles.filter((role) => role.id !== assigned.id && member.roles.cache.has(role.id));
  const blocked = stale.find((role) => !role.editable);
  if (blocked) {
    throw new Error(
      `No puedo retirar el rol ${blocked.name} por la jerarquía del servidor. Coloca el rol de Bothalla por encima de todos los rangos.`,
    );
  }

  const alreadyAssigned = member.roles.cache.has(assigned.id);
  if (stale.length > 0) await member.roles.remove(stale, reason);
  if (!alreadyAssigned) await member.roles.add(assigned, reason);

  return {
    assigned,
    removed: stale,
    unchanged: alreadyAssigned && stale.length === 0,
  };
}

function isRankRoleName(value: string): boolean {
  const normalized = normalizeRoleName(value);
  return RANK_ROLE_DEFINITIONS.some(({ name }) => normalizeRoleName(name) === normalized);
}

function normalizeRoleName(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function rolesAreImmediatelyBelow(botRole: Role, ordered: readonly Role[]): boolean {
  return ordered.every((role, index) => role.position === botRole.position - 1 - index);
}
