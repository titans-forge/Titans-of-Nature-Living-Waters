import { venueById } from "../data/venues";
import type { Encounter, ExpeditionState, FieldAssignment, Venue } from "../types";
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
  const gear = venue.gearSets.find(gear => gear.id === route.gearId);
  if (!gear || !questionId) return null;
  const purpose = getEncounterPurpose(encounter);
  const method = gear.method;
  const title = purpose === "incident-response" ? `Optional bycatch response practice: ${encounter.name}`
    : purpose === "habitat-care" ? `Optional habitat-care practice: ${encounter.name}`
    : method === "telemetry" ? `Listen for ${encounter.name}`
    : method === "camera" ? `Observe ${encounter.name}`
    : method === "sampling" ? `Sample ${encounter.name}` : `Investigate ${encounter.name}`;
  const objective = purpose === "incident-response"
    ? "This simulated accidental encounter is a response exercise, not an animal to seek or catch deliberately. Prepare a careful release, record the context, then change location or method to prevent another incident."
    : purpose === "habitat-care"
    ? "Practice a simulated gear obstruction. Protect living habitat, recover only loose material when safe, and report fixed hazards. Creating another snag or collecting debris is not the goal."
    : method === "telemetry"
    ? `Listen for ${encounter.name} without bait, capture, or pursuit. Record the signal with its time, position, and water conditions, then share what the detection can and cannot show.`
    : method === "camera"
    ? `Observe ${encounter.name} in place without bait, capture, or pursuit. Keep the animal's route and living habitat clear, then return the images and their field context.`
    : method === "sampling"
    ? `Make a clean ${encounter.name} record. Keep the station sample separate, log its habitat and water conditions, and return the evidence without treating a detection as a count of animals.`
    : `Investigate ${encounter.name} during a permitted simulated angling session. Use local evidence to choose a suitable approach, respond carefully, and return the habitat and handling record.`;
  return {
    id: `${venue.id}:${targetEncounterId}`,
    venueId: venue.id,
    targetEncounterId,
    habitatId: route.habitatId,
    gearId: route.gearId,
    questionId,
    purpose,
    title,
    objective,
  };
}

export function getEncounterPurpose(encounter: Encounter): FieldAssignment["purpose"] {
  if (encounter.interaction === "bycatch") return "incident-response";
  if (encounter.interaction === "snag" || encounter.type === "snag" || encounter.type === "plant") return "habitat-care";
  return "investigation";
}

export function getNextAssignment(state: ExpeditionState, venue: Venue): FieldAssignment | null {
  const season = getSeason(venue, state.seasonId);
  const available = season.availableEncounterIds
    .map((encounterId) => buildAssignment(venue, encounterId))
    .filter((assignment): assignment is FieldAssignment => Boolean(assignment));
  const investigations = available.filter(assignment => assignment.purpose === "investigation");
  return investigations.find(assignment => !state.completedAssignmentIds.includes(assignment.id))
    ?? available.find(assignment => assignment.purpose !== "investigation" && !state.completedAssignmentIds.includes(assignment.id))
    ?? investigations[state.journalIds.length % Math.max(1, investigations.length)] ?? null;
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
  const assignments = Object.keys(venue.encounters).map(id => buildAssignment(venue, id)).filter((assignment): assignment is FieldAssignment => Boolean(assignment));
  const tally = (purpose: FieldAssignment["purpose"]) => {
    const selected = assignments.filter(assignment => assignment.purpose === purpose);
    return { completed: selected.filter(assignment => state.completedAssignmentIds.includes(assignment.id)).length, total: selected.length };
  };
  return { completed: assignments.filter(assignment => state.completedAssignmentIds.includes(assignment.id)).length, total: assignments.length,
    investigations: tally("investigation"), incidentResponses: tally("incident-response"), habitatCare: tally("habitat-care") };
}

/** Match the presentation to the same careful-record gate used at community return. */
export function getCurrentAssignmentStatus(state: ExpeditionState) {
  const assignment = getActiveAssignment(state);
  const reached = Boolean(assignment && state.tripJournalIds.includes(assignment.id));
  const ready = Boolean(assignment && state.tripSafeJournalIds.includes(assignment.id));
  if (assignment?.purpose === "incident-response") {
    if (ready) return { ready, title: "Careful incident response ready", detail: "Share the full response record at community return. Do not seek another accidental capture; preventing repetition is part of the exercise." };
    if (reached) return { ready, title: "Incident response needs review", detail: "Your response is preserved, but it does not meet the careful-handling requirement. Review the release procedure before another simulated practice. Do not create bycatch to complete a record." };
    return { ready, title: "Different field evidence recorded", detail: "Useful evidence recorded. The optional simulated response exercise remains available; avoid deliberately creating an incident." };
  }
  if (assignment?.purpose === "habitat-care") {
    if (ready) return { ready, title: "Habitat-care response ready", detail: "Share the full response record at community return. Preserve the habitat and avoid another obstruction rather than seeking more debris." };
    if (reached) return { ready, title: "Habitat-care response needs review", detail: "Your record is preserved. Review how to free the gear without damaging living habitat before another simulated practice." };
    return { ready, title: "Different field evidence recorded", detail: "Useful evidence recorded. The optional obstruction exercise remains available; creating a snag is not the objective." };
  }
  if (ready) return { ready, title: "Careful target record ready", detail: "Share the full field record at community return to complete the assignment. This trip’s careful target response remains on record even after another encounter." };
  if (reached) return { ready, title: "Target found · handling needs review", detail: "This response does not meet the careful-handling requirement. Your observation is preserved. Try a careful response on another permitted attempt, or return and revisit the assignment later." };
  return { ready, title: "Unexpected observation recorded", detail: state.castAttempts < 3 ? "Useful evidence recorded. Change habitat or kit and keep looking for the assignment target." : "Useful evidence recorded. The original assignment remains available next time." };
}
