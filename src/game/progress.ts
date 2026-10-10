import { venueById, venues } from "../data/venues";
import type { EcosystemLink, ExpeditionState, JournalDiscovery, Venue } from "../types";
import { getEncounterPurpose } from "./assignments";

export function getDiscoveries(state: ExpeditionState, venueId: string | "all" = "all"): JournalDiscovery[] {
  return state.journalIds.flatMap((journalId) => {
    const [entryVenueId, encounterId] = journalId.split(":");
    if (venueId !== "all" && entryVenueId !== venueId) return [];
    const venue = venueById[entryVenueId];
    const encounter = venue?.encounters[encounterId];
    return venue && encounter ? [{ journalId, venue, encounter }] : [];
  });
}

export function getVenueProgress(state: ExpeditionState, venue: Venue) {
  const encountered = new Set(getDiscoveries(state, venue.id).map((item) => item.encounter.id));
  const found = encountered.size;
  const total = Object.keys(venue.encounters).length;
  const percent = total ? Math.round((found / total) * 100) : 0;
  const tally = (purpose: "investigation" | "incident-response" | "habitat-care") => {
    const selected = Object.values(venue.encounters).filter(encounter => getEncounterPurpose(encounter) === purpose);
    const found = selected.filter(encounter => encountered.has(encounter.id)).length;
    return { found, total: selected.length, percent: selected.length ? Math.round(found / selected.length * 100) : 0 };
  };
  const investigations = tally("investigation");
  const incidentResponses = tally("incident-response");
  const habitatCare = tally("habitat-care");
  const label = found === 0 ? "Uncharted" : investigations.total > 0 && investigations.found === investigations.total ? "Survey coverage complete"
    : investigations.percent >= 60 ? "Field record growing" : "Survey underway";
  return { found, total, percent, label, investigations, incidentResponses, habitatCare,
    investigationFound: investigations.found, investigationTotal: investigations.total, investigationPercent: investigations.percent };
}

export function parseConnections(discovery: JournalDiscovery): EcosystemLink[] {
  return discovery.encounter.connections.map((connection, index) => {
    const [from, ...rest] = connection.split("->");
    return { id: `${discovery.journalId}:${index}`, from: from.trim(), to: rest.join("->").trim() };
  });
}

export function getComparedVenues(state: ExpeditionState): Venue[] {
  return venues.filter((venue) => getVenueProgress(state, venue).found > 0);
}
