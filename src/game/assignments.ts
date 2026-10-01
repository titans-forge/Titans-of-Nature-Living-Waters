import { venueById } from "../data/venues";
import type { ExpeditionState, FieldAssignment, Venue } from "../types";
import { getSeason } from "./seasons";

function routeToEncounter(venue: Venue, targetEncounterId: string) {
  const direct = Object.entries(venue.encounterRules).find(([route, encounterId]) => encounterId === targetEncounterId
    && venue.habitats.some((habitat) => habitat.id === route.split(":")[0] && habitat.safe !== false));
  if (direct) {
    const [habitatId, gearId] = direct[0].split(":");
    return { habitatId, gearId };
  }

  if (venue.overcastEncounterId === targetEncounterId && venue.overcastZoneId) {
    return { habitatId: venue.overcastZoneId, gearId: venue.gearSets[0].id };
  }

  if (venue.fallbackEncounterId === targetEncounterId) {
    for (const habitat of venue.habitats.filter((item) => item.safe !== false)) {
      for (const gear of venue.gearSets) {
        if (!venue.encounterRules[`${habitat.id}:${gear.id}`]) return { habitatId: habitat.id, gearId: gear.id };
      }
    }
  }

  return null;
}

export function buildAssignment(venue: Venue, targetEncounterId: string): FieldAssignment | null {
  const route = routeToEncounter(venue, targetEncounterId);
  const encounter = venue.encounters[targetEncounterId];
  if (!route || !encounter) return null;
  const questionId = venue.informedQuestionByZone[route.habitatId];
  const incidentalRockfish = venue.id === "alaska-kelp" && targetEncounterId === "black-rockfish";
  return {
    id: `${venue.id}:${targetEncounterId}`,
    venueId: venue.id,
    targetEncounterId,
    habitatId: route.habitatId,
    gearId: route.gearId,
    questionId,
    title: incidentalRockfish ? "Respond to incidental bycatch" : `Investigate ${encounter.name}`,
    objective: incidentalRockfish
      ? "During this simulated permitted survey, be ready to document an incidental black rockfish. Plan a return to depth and a move to another station rather than seeking further rockfish encounters."
      : `Find and document ${encounter.name} in this ecological window. Use local evidence to choose where and how to observe it, then return the habitat and handling record.`,
  };
}

export function getNextAssignment(state: ExpeditionState, venue: Venue): FieldAssignment | null {
  const season = getSeason(venue, state.seasonId);
  const available = season.availableEncounterIds
    .map((encounterId) => buildAssignment(venue, encounterId))
    .filter((assignment): assignment is FieldAssignment => Boolean(assignment));
  return available.find((assignment) => !state.completedAssignmentIds.includes(assignment.id)) ?? available[state.journalIds.length % Math.max(1, available.length)] ?? null;
}

export function getActiveAssignment(state: ExpeditionState): FieldAssignment | null {
  if (!state.activeAssignmentId || !state.venueId) return null;
  const venue = venueById[state.venueId];
  const targetEncounterId = state.activeAssignmentId.slice(state.venueId.length + 1);
  return venue ? buildAssignment(venue, targetEncounterId) : null;
}

export function didCompleteCurrentAssignment(state: ExpeditionState): boolean {
  const assignment = getActiveAssignment(state);
  return Boolean(assignment && state.debriefChoice === "full-notes" && state.tripSafeJournalIds.includes(assignment.id));
}

export function getAssignmentProgress(state: ExpeditionState, venue: Venue) {
  const total = Object.keys(venue.encounters).filter((id) => buildAssignment(venue, id)).length;
  const completed = state.completedAssignmentIds.filter((id) => id.startsWith(`${venue.id}:`)).length;
  return { completed, total };
}
