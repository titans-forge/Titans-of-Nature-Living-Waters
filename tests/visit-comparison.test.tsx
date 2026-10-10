import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VisitComparison } from '../src/components/VisitComparison';
import { fieldDecisions } from '../src/data/fieldDecisions';
import { venueById, venues } from '../src/data/venues';
import { beginDebrief, completeDebrief, createInitialState, selectVenue } from '../src/game/engine';
import { describeVisitRecord, getVisitComparison } from '../src/game/visitComparison';
import type { ExpeditionState, FieldObservation } from '../src/types';

const amazon = venueById.amazon;
function record(id: number, expedition: number, patch: Partial<FieldObservation> = {}): FieldObservation {
  return { id, expedition, venueId: amazon.id, seasonId: amazon.seasons[0].id,
    habitatId: 'roots', gearId: 'surface', encounterId: 'peacock-bass', handlingId: 'steady-release',
    castAccuracy: 90, controlMistakes: 0, assisted: false, shared: false, reportingStatus: 'pending', ...patch };
}
function state(records: FieldObservation[], patch: Partial<ExpeditionState> = {}): ExpeditionState {
  return { ...createInitialState(), venueId: amazon.id, stage: 'journal', expeditionNumber: 3,
    seasonId: amazon.seasons[1].id, venueVisitCounts: { amazon: 2 }, observations: records, ...patch };
}
function html(current: ExpeditionState, venue = amazon) {
  return renderToStaticMarkup(<VisitComparison state={current} venue={venue} />);
}
const escapeText = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');

describe('literal visit comparison', () => {
  it('needs a completed current-trip record and never fabricates history from collection or setup fields', () => {
    const empty = state([], { journalIds: ['amazon:peacock-bass'], encounterId: 'peacock-bass', handlingId: 'steady-release' });
    expect(getVisitComparison(empty, amazon)).toBeNull();
    expect(html(empty)).toBe('');
    expect(getVisitComparison(state([record(1, 1)]), amazon)).toBeNull();
    expect(getVisitComparison(state([record(2, 3, { handlingId: 'not-completed' })]), amazon)).toBeNull();
    expect(getVisitComparison(state([record(2, 3)], { venueId: 'baikal' }), amazon)).toBeNull();
  });

  it('keeps the first completed record invitation short and does not invent a previous season', () => {
    const current = state([record(3, 3)]);
    const comparison = getVisitComparison(current, amazon)!;
    expect(comparison.previous).toBeNull();
    expect(comparison.candidates).toEqual([]);
    const markup = html(current);
    expect(markup).toContain('first completed record');
    expect(markup).not.toContain('<section');
    expect(markup).not.toContain('Season changed');
    expect(markup).not.toContain('<select');
  });

  it('finds the newest current record and actual different-season visit without trusting array order or other waters', () => {
    const earlierSeason = record(1, 1);
    const sameSeason = record(2, 2, { seasonId: amazon.seasons[1].id });
    const latest = record(6, 3, { seasonId: amazon.seasons[1].id });
    const current = state([latest, record(8, 4), record(5, 3), sameSeason,
      record(4, 2, { venueId: 'baikal' }), earlierSeason]);
    const before = JSON.stringify(current);
    const comparison = getVisitComparison(current, amazon)!;
    expect(comparison.latest.record.id).toBe(6);
    expect(comparison.previous?.record.id).toBe(1);
    expect(comparison.candidates.map(item => item.record.id)).toEqual([5, 2, 1]);
    expect(comparison.acrossVisits).toBe(true);
    expect(comparison.changes).toBe(`Season changed from ${amazon.seasons[0].name} to ${amazon.seasons[1].name}.`);
    expect(JSON.stringify(current)).toBe(before);
  });

  it('uses a real earlier same-season visit if no different-season history exists', () => {
    const sameSeason = amazon.seasons[1].id;
    const comparison = getVisitComparison(state([record(1, 1, { seasonId: sameSeason }),
      record(2, 2, { seasonId: sameSeason }), record(3, 3, { seasonId: sameSeason })]), amazon)!;
    expect(comparison.previous?.record.id).toBe(2);
    expect(comparison.changes).toContain('match in these two records');
    expect(comparison.changes).not.toContain('Season changed');
    expect(comparison.limitation).toContain('cannot establish a seasonal pattern');
  });

  it('suggests the matching route and actual method before a newer different-route or same-kit incident record', () => {
    const matchingRoute = record(1, 1);
    const latest = record(3, 3, { seasonId: amazon.seasons[1].id });
    const arowana = amazon.encounters['silver-arowana'];
    const newerDifferentRoute = record(2, 1, { gearId: 'balanced', habitatId: 'channel',
      encounterId: arowana.id, handlingId: arowana.handling.find(option => option.safe)!.id });
    const newerSameKitIncident = record(2, 1, { encounterId: 'root-snag', handlingId: 'change-angle' });
    for (const newerRecord of [newerDifferentRoute, newerSameKitIncident]) {
      const current = state([newerRecord, latest, matchingRoute]);
      const before = JSON.stringify(current);
      const suggested = getVisitComparison(current, amazon)!;
      expect(suggested.previous?.record.id).toBe(1);
      expect(suggested.changes).toBe(`Season changed from ${amazon.seasons[0].name} to ${amazon.seasons[1].name}.`);
      expect(suggested.limitation).not.toContain('field route changed together');
      expect(html(current)).toContain('<option value="1" selected="">');
      expect(getVisitComparison(current, amazon, 2)!.previous?.record.id).toBe(2);
      // The newer record remains the correct fallback if there is no matching
      // route/method record; no preferred evidence is invented or discarded.
      expect(getVisitComparison(state([newerRecord, latest]), amazon)!.previous?.record.id).toBe(2);
      expect(JSON.stringify(current)).toBe(before);
    }
    const unknownRoute = { ...matchingRoute, gearId: 'missing-kit', habitatId: 'missing-station' };
    expect(getVisitComparison(state([unknownRoute, newerDifferentRoute, latest]), amazon)!.previous?.record.id).toBe(2);
    const unknownSeason = { ...matchingRoute, seasonId: 'unknown-season' };
    expect(getVisitComparison(state([unknownSeason, newerDifferentRoute, latest]), amazon)!.previous?.record.id).toBe(2);
  });

  it('allows the player to choose the exact earlier record and refuses an invalid or self selection', () => {
    const current = state([record(1, 1), record(2, 2), record(3, 3, { seasonId: amazon.seasons[1].id })]);
    expect(getVisitComparison(current, amazon, 2)!.previous?.record.id).toBe(2);
    for (const id of [3, 99, NaN]) {
      const invalid = getVisitComparison(current, amazon, id)!;
      expect(invalid.previous).toBeNull();
      expect(invalid.selectionUnavailable).toBe(true);
      expect(invalid.changes).toBe('');
    }
    const markup = html(current);
    expect(markup).toContain('Compare with earlier record');
    expect(markup).toContain('<select id=');
    expect(markup).toContain('<option value="2" selected="">');
    expect(markup).toContain('<option value="1">');
  });

  it('uses a useful different-route within-trip comparison when there is no earlier visit', () => {
    const priorRoute = record(1, 3, { gearId: 'balanced', habitatId: 'channel' });
    const current = state([priorRoute, record(2, 3), record(3, 3)]);
    const comparison = getVisitComparison(current, amazon)!;
    expect(comparison.previous?.record.id).toBe(1);
    expect(comparison.acrossVisits).toBe(false);
    expect(comparison.changes).toContain('Station changed');
    expect(comparison.changes).toContain('Kit changed');
    expect(comparison.changes).not.toContain('Season changed');
    expect(comparison.limitation).toContain('two attempts within one expedition');
    expect(html(current)).toContain('Within this expedition');
  });

  it('compares repeated same-subject casts literally without awarding or claiming stability', () => {
    const current = state([record(1, 3), record(2, 3)], { fieldcraft: 11, biology: 12, ecology: 13, trust: 14 });
    const before = structuredClone(current);
    expect(getVisitComparison(current, amazon)!.changes).toContain('match in these two records');
    const markup = html(current);
    expect(markup).toContain('Peacock bass');
    expect(markup).not.toMatch(/stable population|population increased|points|mastery|grade/i);
    expect(current).toEqual(before);
  });

  it('does not turn missing or unknown seasonal metadata into the first authored season', () => {
    for (const seasonId of ['', 'unknown-season']) {
      const current = state([record(1, 1, { seasonId }), record(2, 3, { seasonId: amazon.seasons[1].id })]);
      const comparison = getVisitComparison(current, amazon)!;
      expect(comparison.previous?.knownSeason).toBe(false);
      expect(comparison.previous?.season).toBe('Season not recorded or unavailable');
      expect(comparison.changes).toContain('seasonal change cannot be compared');
      expect(comparison.changes).not.toContain('Season changed');
      expect(html(current)).toContain('Season not recorded or unavailable');
    }
    const current = state([record(1, 1), record(2, 3, { seasonId: 'unknown-season' })]);
    expect(getVisitComparison(current, amazon)!.latest.knownSeason).toBe(false);
  });

  it('labels incidental snag responses by the actual encounter instead of the normal camera method', () => {
    const venue = venueById['seto-inland-sea'];
    const camera = venue.gearSets.find(item => item.method === 'camera')!;
    const snag = Object.values(venue.encounters).find(item => item.interaction === 'snag')!;
    const safeHandling = snag.handling.find(item => item.safe)!;
    const latest = record(2, 3, { venueId: venue.id, gearId: camera.id, habitatId: venue.habitats[0].id,
      seasonId: venue.seasons[0].id, encounterId: snag.id, handlingId: safeHandling.id });
    const prior = { ...latest, id: 1, expedition: 1 };
    const current = state([prior, latest], { venueId: venue.id, venueVisitCounts: { [venue.id]: 1 } });
    const facts = describeVisitRecord(latest, venue);
    expect(facts.kit).toBe(camera.name);
    expect(facts.method).toBe('Snag response');
    expect(facts.incident).toBe(true);
    expect(getVisitComparison(current, venue)!.limitation).toContain('does not answer the intended survey question');
    expect(html(current, venue)).toContain('Snag response');
    expect(html(current, venue)).not.toContain('<dd>Camera observation</dd>');
  });

  it('does not default unknown kit or station metadata to angling or the current route', () => {
    const unavailable = record(1, 1, { gearId: 'missing-kit', habitatId: 'missing-station' });
    const current = state([unavailable, record(2, 3)]);
    const comparison = getVisitComparison(current, amazon)!;
    expect(comparison.previous).toMatchObject({ kit: 'Kit unavailable', station: 'Station unavailable', method: 'Method unavailable' });
    expect(comparison.changes).toContain('route comparison incomplete');
    expect(comparison.changes).toContain('method change cannot be compared');
    expect(comparison.changes).not.toContain('Recorded method changed');
    expect(comparison.changes).not.toContain('Station changed');
  });

  it('uses existing authored questions and available next-season kits and stations at every water', () => {
    for (const venue of venues) for (let visitCount = 1; visitCount <= venue.seasons.length; visitCount += 1) {
      const encounter = Object.values(venue.encounters).find(item => !item.interaction)!;
      const latest = record(2, 3, { venueId: venue.id, seasonId: venue.seasons[visitCount - 1].id,
        gearId: venue.gearSets[0].id, habitatId: venue.habitats[0].id,
        encounterId: encounter.id, handlingId: encounter.handling[0].id });
      const current = state([{ ...latest, id: 1, expedition: 1 }, latest], {
        venueId: venue.id, venueVisitCounts: { [venue.id]: visitCount }, debriefChoice: 'private-notes' });
      const next = getVisitComparison(current, venue)!.nextVisit!;
      expect(next, `${venue.id}, next visit ${visitCount}`).not.toBeNull();
      const nextSeason = venue.seasons[visitCount % venue.seasons.length];
      expect(next.season).toBe(nextSeason.name);
      const plans = fieldDecisions[venue.id].plans.map(plan => ({ ...plan, ...plan.seasonal?.[nextSeason.id] }));
      expect(plans.some(plan => plan.question === next.question && plan.gearId === next.gearId && plan.habitatId === next.habitatId)).toBe(true);
      const targetId = venue.encounterRules[`${next.habitatId}:${next.gearId}`];
      expect(nextSeason.availableEncounterIds).toContain(targetId);
      expect(venue.encounters[targetId].interaction).toBeUndefined();
      expect(html(current, venue)).toContain(escapeText(next.question));
    }
  });

  it('does not assume the next season when the visit count is missing or invalid', () => {
    for (const count of [undefined, -1, NaN, 1.5]) {
      const current = state([record(1, 1), record(2, 3)], { venueVisitCounts: count === undefined ? {} : { amazon: count } });
      expect(getVisitComparison(current, amazon)!.nextVisit).toBeNull();
      expect(html(current)).not.toContain('visit-comparison__next');
    }
  });

  it('predicts the actual next window after community return before and after reporting', () => {
    const current = state([record(1, 1), record(2, 3, { seasonId: amazon.seasons[1].id })], {
      venueVisitCounts: { amazon: 1 }, encounterId: 'peacock-bass', handlingId: 'steady-release' });
    const beforeReturn = getVisitComparison(current, amazon)!.nextVisit!;
    expect(beforeReturn.afterReturn).toBe(true);
    const returned = completeDebrief(beginDebrief(current), 'private-notes');
    const afterReturn = getVisitComparison(returned, amazon)!.nextVisit!;
    const nextState = selectVenue(returned, amazon.id);
    expect(beforeReturn.season).toBe(amazon.seasons.find(item => item.id === nextState.seasonId)!.name);
    expect(afterReturn.season).toBe(beforeReturn.season);
    expect(afterReturn.afterReturn).toBe(false);
    expect(html(current)).toContain('Next visit after community return');
    const firstTrip = state([record(1, 1), record(2, 1)], { expeditionNumber: 1, seasonId: amazon.seasons[0].id,
      venueVisitCounts: {}, encounterId: 'peacock-bass', handlingId: 'steady-release' });
    expect(getVisitComparison(firstTrip, amazon)!.nextVisit?.season).toBe(amazon.seasons[1].name);
  });

  it('renders factual details and bounded limits without rewriting report choices, answers, scores or records', () => {
    const current = state([record(1, 1, { reportingStatus: 'legacy-unknown' }),
      record(2, 2, { reportingStatus: 'identity-only' }), record(3, 3, { seasonId: amazon.seasons[1].id })], {
      learningAnswers: [{ questionId: 'amazon:prediction', answerId: 'deep', correct: false }],
      learningRevisions: [{ questionId: 'amazon:prediction', answerId: 'forest', correct: true, evidenceIds: [1, 3], limitationId: 'sample-limits' }],
    });
    const before = JSON.stringify(current);
    const markup = html(current);
    expect(markup).toContain('<details class="visit-comparison__details"><summary>Record facts and comparison limits</summary>');
    expect(markup).toContain('<dt>Season</dt>');
    expect(markup).toContain('<dt>Station</dt>');
    expect(markup).toContain('<dt>Kit</dt>');
    expect(markup).toContain('<dt>Recorded method</dt>');
    expect(markup).toContain('do not contain oxygen or salinity measurements, animal counts');
    expect(markup).not.toMatch(/oxygen improved|salinity increased|population declined|caused by/i);
    expect(JSON.stringify(current)).toBe(before);
  });
});
