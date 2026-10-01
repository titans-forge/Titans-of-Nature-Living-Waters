import type { ExpeditionState, Venue, VenueSeason } from "../types";

export function getSeason(venue: Venue, seasonId: string | null): VenueSeason {
  return venue.seasons.find((season) => season.id === seasonId) ?? venue.seasons[0];
}

export function getNextSeason(state: ExpeditionState, venue: Venue): VenueSeason {
  const visits = state.venueVisitCounts[venue.id] ?? 0;
  return venue.seasons[visits % venue.seasons.length];
}

export function resolveSeasonEncounter(venue: Venue, seasonId: string | null, encounterId: string, gearId?: string): string {
  const season = getSeason(venue, seasonId);
  if (season.availableEncounterIds.includes(encounterId)) return encounterId;
  return (gearId && season.fallbackByGear?.[gearId]) || season.fallbackEncounterId;
}
