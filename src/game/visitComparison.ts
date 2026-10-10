import { fieldDecisions, type FieldDecisionPlan } from '../data/fieldDecisions';
import type { ExpeditionState, FieldObservation, GearMethod, Venue } from '../types';

const methodLabels: Record<GearMethod, string> = {
  angling: 'Angling', camera: 'Camera observation', telemetry: 'Telemetry detection', sampling: 'Biological sampling',
};

export interface VisitRecordFacts {
  record: FieldObservation;
  subject: string;
  season: string;
  station: string;
  kit: string;
  method: string;
  handling: string;
  knownSeason: boolean;
  knownRoute: boolean;
  incident: boolean;
}

/** Only a saved handling record is a completed encounter. Setup, collection IDs
 * and a predicted route cannot stand in for an observation. Unknown season or
 * kit metadata stays unknown rather than falling back to today's setup. */
function isCompletedRecord(record: FieldObservation, venue: Venue): boolean {
  return Number.isSafeInteger(record.id) && record.id > 0
    && Number.isSafeInteger(record.expedition) && record.expedition > 0
    && record.venueId === venue.id
    && Boolean(venue.encounters[record.encounterId]?.handling.some(option => option.id === record.handlingId));
}

export function describeVisitRecord(record: FieldObservation, venue: Venue): VisitRecordFacts {
  const encounter = venue.encounters[record.encounterId];
  const season = venue.seasons.find(item => item.id === record.seasonId);
  const kit = venue.gearSets.find(item => item.id === record.gearId);
  const incident = encounter?.interaction ?? (kit?.method === 'angling'
    ? encounter?.type === 'snag' || encounter?.type === 'plant' ? 'snag'
      : encounter?.type === 'reptile' || encounter?.type === 'invertebrate' ? 'bycatch' : null
    : null);
  return {
    record,
    subject: encounter?.name ?? 'Subject unavailable',
    season: season?.name ?? 'Season not recorded or unavailable',
    station: venue.habitats.find(item => item.id === record.habitatId)?.name ?? 'Station unavailable',
    kit: kit?.name ?? 'Kit unavailable',
    method: incident === 'snag' ? 'Snag response' : incident === 'bycatch' ? 'Bycatch response'
      : kit ? methodLabels[kit.method] ?? 'Method unavailable' : 'Method unavailable',
    handling: encounter?.handling.find(option => option.id === record.handlingId)?.label ?? 'Handling unavailable',
    knownSeason: Boolean(season),
    knownRoute: Boolean(kit && venue.habitats.some(item => item.id === record.habitatId)),
    incident: Boolean(incident),
  };
}

function routeMatches(left: FieldObservation, right: FieldObservation): boolean {
  return left.gearId === right.gearId && left.habitatId === right.habitatId;
}

/** Next-visit prompts remain authored questions, with an available investigation
 * route in the actual next window. No meter value or ecological outcome is made
 * from having carried a kit. The first unreported visit can have no count entry;
 * only its known first-window record supports interpreting that absence as zero. */
function nextVisitQuestion(state: ExpeditionState, venue: Venue, latest: VisitRecordFacts, previous: VisitRecordFacts | null) {
  const visits = state.venueVisitCounts[venue.id] ?? (latest.record.seasonId === venue.seasons[0]?.id
    && state.seasonId === latest.record.seasonId && !state.debriefChoice ? 0 : undefined);
  const afterReturn = !state.debriefChoice;
  const season = typeof visits === 'number' && Number.isSafeInteger(visits) && visits >= 0 && venue.seasons.length
    ? venue.seasons[(visits + (afterReturn ? 1 : 0)) % venue.seasons.length] : undefined;
  const definition = fieldDecisions[venue.id];
  if (!season || !definition) return null;
  const plans = definition.plans.flatMap(plan => {
    const { seasonal, ...base } = plan;
    const resolved: Omit<FieldDecisionPlan, 'seasonal'> = { ...base, ...seasonal?.[season.id] };
    const kit = venue.gearSets.find(item => item.id === resolved.gearId);
    const station = venue.habitats.find(item => item.id === resolved.habitatId);
    const encounterId = venue.encounterRules[`${resolved.habitatId}:${resolved.gearId}`];
    const encounter = venue.encounters[encounterId];
    if (!kit || !station || station.safe === false || !encounter || encounter.interaction
      || !season.availableEncounterIds.includes(encounterId)) return [];
    return [{ question: resolved.question, kit: kit.name, station: station.name,
      gearId: kit.id, habitatId: station.id, season: season.name, afterReturn }];
  });
  const sameRoute = plans.find(plan => plan.gearId === latest.record.gearId && plan.habitatId === latest.record.habitatId);
  const otherRoute = plans.find(plan => plan.gearId !== latest.record.gearId || plan.habitatId !== latest.record.habitatId);
  // If route and season changed together, a repeat route can clarify the next
  // comparison. Repeated identical routes instead invite the other authored task.
  return previous && !routeMatches(latest.record, previous.record)
    ? sameRoute ?? otherRoute ?? plans[0] ?? null
    : otherRoute ?? sameRoute ?? plans[0] ?? null;
}

export interface VisitComparisonResult {
  latest: VisitRecordFacts;
  candidates: VisitRecordFacts[];
  previous: VisitRecordFacts | null;
  selectionUnavailable: boolean;
  acrossVisits: boolean;
  changes: string;
  limitation: string;
  nextVisit: ReturnType<typeof nextVisitQuestion>;
}

/** Derived local history only. IDs identify records; neither array order nor the
 * current field setup changes the facts. An explicit missing selection must not
 * silently become another record. */
export function getVisitComparison(state: ExpeditionState, venue: Venue, priorRecordId?: number): VisitComparisonResult | null {
  if (state.venueId !== venue.id) return null;
  const records = state.observations.filter(record => isCompletedRecord(record, venue))
    .slice().sort((left, right) => right.id - left.id);
  const newest = records.find(record => record.expedition === state.expeditionNumber);
  if (!newest) return null;
  const latest = describeVisitRecord(newest, venue);
  const candidates = records.filter(record => record.id < newest.id && record.expedition <= newest.expedition)
    .map(record => describeVisitRecord(record, venue));
  const olderVisits = candidates.filter(item => item.record.expedition < newest.expedition);
  const differentSeasons = latest.knownSeason ? olderVisits.filter(item => item.knownSeason && item.record.seasonId !== newest.seasonId) : [];
  // Prefer changing the seasonal window while holding the saved route and actual
  // method constant. A same-kit incident is a different method, and unavailable
  // metadata cannot make a better-supported comparison than usable history.
  const sameRouteSeason = latest.knownRoute && latest.method !== 'Method unavailable'
    ? differentSeasons.find(item => item.knownRoute && routeMatches(item.record, newest) && item.method === latest.method) : undefined;
  const withinTripRoute = candidates.find(item => item.record.expedition === newest.expedition && !routeMatches(item.record, newest));
  const suggested = sameRouteSeason ?? differentSeasons[0] ?? olderVisits[0] ?? withinTripRoute ?? candidates[0];
  const previous = (priorRecordId === undefined ? suggested : candidates.find(item => item.record.id === priorRecordId)) ?? null;
  const selectionUnavailable = priorRecordId !== undefined && !previous;
  const acrossVisits = Boolean(previous && previous.record.expedition < newest.expedition);
  const changes: string[] = [];
  if (previous) {
    if (!latest.knownSeason || !previous.knownSeason) changes.push('A season is unavailable, so a seasonal change cannot be compared.');
    else if (latest.record.seasonId !== previous.record.seasonId) changes.push(`Season changed from ${previous.season} to ${latest.season}.`);
    if (!latest.knownRoute || !previous.knownRoute) changes.push('Station or kit metadata is unavailable; keep this route comparison incomplete.');
    if (latest.record.encounterId !== previous.record.encounterId) changes.push(`Subject changed from ${previous.subject} to ${latest.subject}.`);
    if (latest.knownRoute && previous.knownRoute) {
      if (latest.record.habitatId !== previous.record.habitatId) changes.push(`Station changed from ${previous.station} to ${latest.station}.`);
      if (latest.record.gearId !== previous.record.gearId) changes.push(`Kit changed from ${previous.kit} to ${latest.kit}.`);
    }
    if (latest.method === 'Method unavailable' || previous.method === 'Method unavailable') changes.push('A recorded method is unavailable, so a method change cannot be compared.');
    else if (latest.method !== previous.method) changes.push(`Recorded method changed from ${previous.method.toLowerCase()} to ${latest.method.toLowerCase()}.`);
    if (changes.length === 0) changes.push('The subject, station, kit, recorded method and season match in these two records.');
  }
  const routeChanged = previous && (!routeMatches(latest.record, previous.record) || latest.method !== previous.method);
  const limitation = !previous ? '' : latest.incident || previous.incident
    ? 'An incident response records what happened and how it was handled; it does not answer the intended survey question.'
    : routeChanged && latest.knownSeason && previous.knownSeason && newest.seasonId !== previous.record.seasonId
    ? 'Season and field route changed together, so these two records cannot separate their effects.'
    : acrossVisits ? 'A pair of encounters cannot establish a seasonal pattern or explain why a subject was recorded.'
    : 'These are two attempts within one expedition; they cannot establish a change across seasons.';
  return { latest, candidates, previous, selectionUnavailable, acrossVisits,
    changes: changes.join(' '), limitation, nextVisit: nextVisitQuestion(state, venue, latest, previous) };
}
