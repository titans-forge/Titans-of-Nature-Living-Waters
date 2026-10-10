import { resolveSeasonEncounter } from "./seasons";
import type { ExpeditionState, GearMethod, InteractionKind, Venue } from "../types";

/** Authored kit methods: a camera, receiver and sampler have different jobs. */
export function getGearMethod(state: ExpeditionState, venue: Venue): GearMethod {
  return venue.gearSets.find(gear => gear.id === state.gearId)?.method ?? "angling";
}

/** A tether can snag even when the kit has no hook. Incidents take precedence. */
export function getInteractionKind(state: ExpeditionState, venue: Venue): InteractionKind {
  const encounter = state.encounterId ? venue.encounters[state.encounterId] : null;
  if (encounter?.interaction) return encounter.interaction;
  const method = getGearMethod(state, venue);
  if (method !== "angling") return method;
  if (encounter?.type === "snag" || encounter?.type === "plant") return "snag";
  if (encounter?.type === "reptile" || encounter?.type === "invertebrate") return "bycatch";
  return "fish";
}

export function needsSnagApproach(state: ExpeditionState, venue: Venue): boolean {
  return getInteractionKind(state, venue) === "snag" && !state.lineResolved && state.snagApproach !== "back-out";
}

/** One routing decision for fresh casts and unfinished legacy encounter recovery. */
export function getRoutedEncounterId(state: ExpeditionState, venue: Venue, power: number): string {
  const routed = venue.overcastZoneId === state.zoneId && power > 82 && venue.overcastEncounterId
    ? venue.overcastEncounterId : venue.encounterRules[`${state.zoneId}:${state.gearId}`] ?? venue.fallbackEncounterId;
  return resolveSeasonEncounter(venue, state.seasonId, routed, state.gearId ?? undefined);
}

/** Completed older routes remain literal field history, even after route repair. */
export function hasEarlierCompletedEncounter(state: ExpeditionState, venue: Venue): boolean {
  return Boolean(state.lineResolved && state.encounterId && state.castPower !== null
    && getRoutedEncounterId(state, venue, state.castPower) !== state.encounterId);
}
