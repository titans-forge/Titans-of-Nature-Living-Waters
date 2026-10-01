import { venueById, venues } from "../data/venues";
import type { EcosystemLink, ExpeditionState, JournalDiscovery, Venue } from "../types";

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
  const found = new Set(getDiscoveries(state, venue.id).map((item) => item.encounter.id)).size;
  const total = Object.keys(venue.encounters).length;
  const percent = total ? Math.round((found / total) * 100) : 0;
  const label = found === 0 ? "Uncharted" : found === total ? "Collection complete" : found / total >= 0.6 ? "Collection growing" : "Survey underway";
  return { found, total, percent, label };
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
