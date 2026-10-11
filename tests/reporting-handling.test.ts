import { advanceRecommendedInteraction } from './helpers/fishing';
import { describe, expect, it } from 'vitest';
import v8Journey from './fixtures/audit-journey-v8.json';
import { venueById, venues } from '../src/data/venues';
import { advanceInteraction, askQuestion, beginDebrief, beginQuestions, castLine, completeDebrief, continueExpedition, createInitialState, finishGear, finishQuestions, getHandlingOptions, getObservationCapacityReason, handleEncounter, MAX_FIELD_OBSERVATIONS, revealEncounter, selectGear, selectHabitat, selectVenue } from '../src/game/engine';
import { parseExpedition, serializeExpedition, validateExpedition } from '../src/game/save';
import { encodeJourneyEnvelope, journeyByteLength, MAX_SAVE_BYTES, NEXT_OBSERVATION_RESERVE_BYTES } from '../src/game/limits';
import type { DebriefChoice, ExpeditionState } from '../src/types';

function prepare(previous = createInitialState()) {
  let state = beginQuestions(selectVenue(previous, 'amazon'));
  state = askQuestion(askQuestion(state, 'water-rise'), 'gear');
  return selectHabitat(finishGear(selectGear(finishQuestions(state), 'surface')), 'roots');
}

function record(prepared = prepare()) {
  let state = castLine(prepared, 44);
  for (let tick = 0; tick < 1000 && !state.lineResolved; tick++) state = advanceRecommendedInteraction(state);
  state = revealEncounter(state);
  return handleEncounter(state, getHandlingOptions(state).find(option => option.safe)!.id);
}

function repeat(state: ExpeditionState) {
  return selectHabitat(finishGear(selectGear(continueExpedition(state), 'surface')), 'roots');
}

function version8(state: ExpeditionState) {
  const { snagApproach: _approach, learningRevisions: _reviews, anglingRules: _rules, anglingBeat: _beat, rodSide: _side, ...oldState } = state;
  return {
    ...oldState,
    version: 8,
    observations: state.observations.map(({ reportingStatus: _status, ...observation }) => observation),
  };
}

function longJourney(count: number): ExpeditionState {
  const observation = {
    id: 1, expedition: 1, venueId: 'galapagos', seasonId: 'cool-upwelling', habitatId: 'pelagic-edge',
    gearId: 'acoustic-array', encounterId: 'scalloped-hammerhead', handlingId: 'passive-detection',
    castAccuracy: 100, controlMistakes: 0, assisted: false, shared: true, reportingStatus: 'full-notes' as const,
  };
  return { ...createInitialState(), expeditionNumber: count, observations: Array.from({ length: count }, (_, index) => ({ ...observation, id: index + 1, expedition: index + 1 })),
    journalIds: ['galapagos:scalloped-hammerhead'], completedAssignmentIds: ['galapagos:scalloped-hammerhead'], venueVisitCounts: { galapagos: count } };
}

describe('honest reporting history', () => {
  it.each(['full-notes', 'identity-only', 'private-notes'] as DebriefChoice[])('retains the exact %s choice for every trip record across travel and export', choice => {
    const first = record();
    const second = record(repeat(first));
    expect(second.observations.every(observation => observation.reportingStatus === 'pending' && !observation.shared)).toBe(true);
    const returned = completeDebrief(beginDebrief(second), choice);
    expect(returned.observations.map(observation => observation.reportingStatus)).toEqual([choice, choice]);
    expect(returned.observations.every(observation => observation.shared === (choice === 'full-notes'))).toBe(true);
    const next = record(prepare(returned));
    expect(next.observations.map(observation => observation.reportingStatus)).toEqual([choice, choice, 'pending']);
    expect(parseExpedition(serializeExpedition(next))).toMatchObject({ ok: true, migrated: false, state: next });
    expect(second.observations.every(observation => observation.reportingStatus === 'pending')).toBe(true);
  });

  it('migrates the real eight-record v8 playthrough without inventing the lost older privacy choice', () => {
    const original = structuredClone(v8Journey);
    const parsed = parseExpedition(JSON.stringify(v8Journey));
    expect(parsed).toMatchObject({ ok: true, migrated: true, state: { version: 13, expeditionNumber: 8 } });
    if (!parsed.ok) return;
    expect(parsed.state.observations.map(observation => observation.reportingStatus)).toEqual([
      'full-notes', 'full-notes', 'full-notes', 'full-notes', 'full-notes', 'full-notes', 'legacy-unknown', 'private-notes',
    ]);
    expect(parsed.state.observations.map(({ reportingStatus: _status, ...observation }) => observation)).toEqual(v8Journey.state.observations);
    expect(parsed.state.learningAnswers).toEqual(v8Journey.state.learningAnswers);
    expect(parsed.state.completedAssignmentIds).toEqual(v8Journey.state.completedAssignmentIds);
    expect(parseExpedition(serializeExpedition(parsed.state))).toMatchObject({ ok: true, migrated: false, state: parsed.state });
    expect(v8Journey).toEqual(original);
  });

  it.each([null, 'full-notes', 'identity-only', 'private-notes'] as const)('uses the known v8 active report %s and pending for an unreturned trip', choice => {
    const current = record();
    const source = choice ? completeDebrief(beginDebrief(current), choice) : current;
    const parsed = parseExpedition(JSON.stringify(version8(source)));
    expect(parsed).toMatchObject({ ok: true, state: { observations: [{ reportingStatus: choice ?? 'pending', shared: choice === 'full-notes' }] } });
  });

  it('rejects unsupported or inconsistent reporting claims and mismatched version envelopes', () => {
    const state = record();
    for (const patch of [{ reportingStatus: 'made-up' }, { reportingStatus: 'full-notes' }, { shared: true }, { reportingStatus: 'identity-only' }]) {
      expect(validateExpedition({ ...state, observations: [{ ...state.observations[0], ...patch }] })).toBe(false);
    }
    const privateTrip = completeDebrief(beginDebrief(record(repeat(state))), 'private-notes');
    const next = prepare(privateTrip);
    expect(validateExpedition({ ...next, observations: next.observations.map((observation, index) => index === 0 ? { ...observation, reportingStatus: 'identity-only' } : observation) })).toBe(false);
    expect(parseExpedition(JSON.stringify({ format: v8Journey.format, version: 9, state: v8Journey.state })).ok).toBe(false);
    const forged = structuredClone(v8Journey);
    Object.assign(forged.state.observations[0], { reportingStatus: 'full-notes' });
    expect(parseExpedition(JSON.stringify(forged)).ok).toBe(false);
  });
});

describe('handling choices require reading rather than memorizing A', () => {
  it('keeps positions stable through rerender, settings changes and a save roundtrip while scoring by option ID', () => {
    let state = castLine(prepare(), 44);
    for (let tick = 0; tick < 1000 && !state.lineResolved; tick++) state = advanceRecommendedInteraction(state);
    state = revealEncounter(state);
    const options = getHandlingOptions(state);
    const ids = options.map(option => option.id);
    expect(getHandlingOptions({ ...state, assistMode: !state.assistMode }).map(option => option.id)).toEqual(ids);
    const parsed = parseExpedition(serializeExpedition(state));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(getHandlingOptions(parsed.state).map(option => option.id)).toEqual(ids);
    const safe = options.find(option => option.safe)!;
    const unsafe = options.find(option => !option.safe)!;
    expect(handleEncounter(state, safe.id).tripSafeJournalIds).toContain('amazon:peacock-bass');
    expect(handleEncounter(state, unsafe.id).tripSafeJournalIds).toEqual([]);
    expect(venueById.amazon.encounters['peacock-bass'].handling.map(option => option.id)).toEqual(['steady-release', 'hard-pull']);
  });

  it('counterbalances every authored encounter across repeated expeditions and provides varied first-visit positions', () => {
    const firstVisitPositions = new Set<number>();
    let checked = 0;
    for (const venue of venues) for (const encounter of Object.values(venue.encounters)) {
      const seen = new Set<number>();
      for (let expedition = 1; expedition <= encounter.handling.length; expedition++) {
        const options = getHandlingOptions({ ...createInitialState(), venueId: venue.id, encounterId: encounter.id, expeditionNumber: expedition, castAttempts: 1 });
        expect(options.map(option => option.id).sort()).toEqual(encounter.handling.map(option => option.id).sort());
        const position = options.findIndex(option => option.safe);
        seen.add(position);
        if (expedition === 1) firstVisitPositions.add(position);
      }
      expect(seen.size, `${venue.id}:${encounter.id}`).toBe(encounter.handling.length);
      checked++;
    }
    expect(checked).toBe(80);
    expect(firstVisitPositions.size).toBeGreaterThan(1);
  });
});

describe('observation capacity is checked before a new encounter', () => {
  it('exports the 9500-record regression with compact JSON and retains the envelope and every record', () => {
    const state = longJourney(9500);
    expect(validateExpedition(state)).toBe(true);
    const formatted = JSON.stringify(JSON.parse(encodeJourneyEnvelope(state)), null, 2);
    expect(new TextEncoder().encode(formatted).byteLength).toBeGreaterThan(MAX_SAVE_BYTES);
    const compact = serializeExpedition(state);
    expect(new TextEncoder().encode(compact).byteLength).toBeLessThan(MAX_SAVE_BYTES);
    expect(parseExpedition(compact)).toMatchObject({ ok: true, migrated: false, state });
  });

  it('allows a large supported v8 journal to migrate and export without whitespace consuming the byte budget', () => {
    const state = longJourney(9500);
    const old = version8(state);
    const raw = JSON.stringify({ format: v8Journey.format, version: 8, state: old }, null, 2);
    expect(new TextEncoder().encode(raw).byteLength).toBeLessThanOrEqual(MAX_SAVE_BYTES);
    const parsed = parseExpedition(raw);
    expect(parsed).toMatchObject({ ok: true, migrated: true });
    if (!parsed.ok) return;
    expect(parsed.state.observations).toEqual(state.observations);
    expect(parseExpedition(serializeExpedition(parsed.state))).toMatchObject({ ok: true, migrated: false, state: parsed.state });
  });

  it('checks actual UTF-8 bytes and reserved headroom independently of the observation-count guard', () => {
    const base = prepare();
    const baselineBytes = journeyByteLength(base);
    const repeats = Math.ceil((MAX_SAVE_BYTES - NEXT_OBSERVATION_RESERVE_BYTES - baselineBytes + 1) / 3);
    // This is a synthetic oversized in-memory message to exercise the byte guard,
    // not a claim that the native UI or strict save parser creates such a message.
    const state = { ...base, fightMessage: 'あ'.repeat(repeats) };
    expect(encodeJourneyEnvelope(state).length).toBeLessThan(MAX_SAVE_BYTES - NEXT_OBSERVATION_RESERVE_BYTES);
    expect(journeyByteLength(state)).toBeLessThan(MAX_SAVE_BYTES);
    expect(journeyByteLength(state) + NEXT_OBSERVATION_RESERVE_BYTES).toBeGreaterThan(MAX_SAVE_BYTES);
    expect(state.observations).toHaveLength(0);
    expect(validateExpedition(state)).toBe(false);
    expect(getObservationCapacityReason(state)).toContain('save-size limit');
    expect(castLine(state, 44)).toBe(state);
  });

  it('permits a genuine final observation and debrief on a large valid journey without making export fail', () => {
    const ready = prepare(longJourney(MAX_FIELD_OBSERVATIONS - 1));
    expect(validateExpedition(ready)).toBe(true);
    expect(getObservationCapacityReason(ready)).toBeNull();
    const returned = completeDebrief(beginDebrief(record(ready)), 'full-notes');
    expect(returned.observations).toHaveLength(MAX_FIELD_OBSERVATIONS);
    expect(validateExpedition(returned)).toBe(true);
    expect(journeyByteLength(returned)).toBeLessThan(MAX_SAVE_BYTES);
    expect(parseExpedition(serializeExpedition(returned))).toMatchObject({ ok: true, state: returned });
    expect(getObservationCapacityReason(returned)).toContain('Export');
  });

  it('allows the last supported observation but prevents starting an unsavable 10001st record', () => {
    const observation = record().observations[0];
    const full = { ...prepare(), observations: Array.from({ length: MAX_FIELD_OBSERVATIONS }, (_, index) => ({ ...observation, id: index + 1 })) };
    expect(getObservationCapacityReason(full)).toContain('Export');
    expect(castLine(full, 44)).toBe(full);
    const oneSlot = { ...full, observations: full.observations.slice(0, -1) };
    expect(getObservationCapacityReason(oneSlot)).toBeNull();
    expect(castLine(oneSlot, 44).stage).toBe('cast');
  });
});
