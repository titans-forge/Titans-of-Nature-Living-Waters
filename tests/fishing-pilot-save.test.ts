import { legacyCastLine as castLine } from './helpers/fishing';
import { describe, expect, it } from 'vitest';
import reviewedV11 from './fixtures/v11-reviewed-journey.json';
import midcastV11 from './fixtures/v11-midcast-reviewed-journey.json';
import nextTickV11 from './fixtures/v11-midcast-next-tick.json';
import { venueById } from '../src/data/venues';
import { advanceInteraction, askQuestion, beginDebrief, beginQuestions,  completeDebrief, createInitialState, finishGear, finishQuestions, getCurrentEncounter, getRecommendedEngagement, handleEncounter, revealEncounter, selectGear, selectHabitat, selectVenue } from '../src/game/engine';
import { getAnglingWindow } from '../src/game/angling';
import { parseExpedition, serializeExpedition, validateExpedition } from '../src/game/save';
import { getExpeditionBackupRaw, LEGACY_SAVE_KEYS, loadStoredExpedition, MIGRATION_BACKUP_KEY, SAVE_KEY, saveStoredExpeditionIfUnchanged } from '../src/game/storage';
import type { ExpeditionState } from '../src/types';

// reviewedV11 is an unchanged real browser export. Midcast and nextTick were
// produced by the retained pre-pilot schema11 engine, not relabeled new states.
const migrated = (state: typeof reviewedV11.state | typeof midcastV11.state) => ({ ...state, version: 13, anglingRules: 'classic', anglingBeat: 0, rodSide: 'center' });
function nativeCast(venueId: string, gearId: string, habitatId: string, seasonIndex = 0) {
  const venue = venueById[venueId];
  let state = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { [venueId]: seasonIndex } }, venueId));
  const informedId = venue.informedQuestionByZone[habitatId];
  const otherId = venue.questions.find(question => question.id !== informedId)!.id;
  state = askQuestion(askQuestion(state, informedId), otherId);
  return castLine(selectHabitat(finishGear(selectGear(finishQuestions(state), gearId)), habitatId), venue.idealPower[habitatId]);
}
function withClock(state: ExpeditionState, anglingBeat: number, lineTurn = state.lineTurn): ExpeditionState {
  const changed = { ...state, anglingBeat, lineTurn };
  const window = getAnglingWindow(changed, venueById[changed.venueId!])!;
  return { ...changed, fightPhase: window.engage ? 'rest' : 'run', phaseProgress: window.elapsed };
}
function storage(values = new Map<string, string>()) {
  const writes: string[] = [];
  return { values, writes, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); } };
}

describe('schema13 preserves genuine schema11 journeys', () => {
  it.each([reviewedV11, midcastV11])('preserves every earlier field, including first answers, latest review and field notes', fixture => {
    const original = structuredClone(fixture);
    const parsed = parseExpedition(JSON.stringify(fixture));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed).toMatchObject({ migrated: true, state: migrated(fixture.state) });
    expect(parsed.state).toEqual(migrated(fixture.state));
    expect(parsed.warnings).toContain('Existing encounters keep their original controls; new angling casts use pressure and rod-angle decisions.');
    expect(parseExpedition(serializeExpedition(parsed.state))).toMatchObject({ ok: true, migrated: false, state: parsed.state });
    expect(fixture).toEqual(original);
  });

  it('resumes an actual old midcast with exactly the pre-pilot next-tick result', () => {
    const parsed = parseExpedition(JSON.stringify(midcastV11));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.state.anglingRules).toBe('classic');
    expect(advanceInteraction(parsed.state, getRecommendedEngagement(parsed.state))).toEqual(migrated(nextTickV11.state));
  });

  it('rejects pilot markers and invalid reviews embedded in a claimed schema11 save', () => {
    for (const patch of [{ anglingRules: 'habitat-v1' }, { anglingBeat: 1 }, { unexpected: true },
      { learningRevisions: [{ ...reviewedV11.state.learningRevisions[0], evidenceIds: [1, 999] }] }]) {
      expect(parseExpedition(JSON.stringify({ ...reviewedV11, state: { ...reviewedV11.state, ...patch } })).ok).toBe(false);
    }
    const { learningRevisions: _reviews, ...missing } = reviewedV11.state;
    expect(parseExpedition(JSON.stringify({ ...reviewedV11, state: missing })).ok).toBe(false);
  });

  it('preserves exact prior bytes before writing the version13 key, leaving the old key intact', () => {
    const raw = JSON.stringify(midcastV11, null, 2);
    const memory = storage(new Map([['living-waters-save-v11', raw]]));
    expect(LEGACY_SAVE_KEYS[0]).toBe('living-waters-save-v12');
    expect(SAVE_KEY).toBe('living-waters-save-v13');
    const loaded = loadStoredExpedition(memory);
    expect(loaded).toMatchObject({ blocked: false, raw, state: migrated(midcastV11.state) });
    expect(memory.values.get(MIGRATION_BACKUP_KEY)).toBe(raw);
    expect(saveStoredExpeditionIfUnchanged(loaded.state, loaded.raw, memory).ok).toBe(true);
    expect(memory.values.get('living-waters-save-v11')).toBe(raw);
    expect(memory.writes.indexOf(MIGRATION_BACKUP_KEY)).toBeLessThan(memory.writes.indexOf(SAVE_KEY));
    expect(parseExpedition(memory.values.get(SAVE_KEY)!)).toMatchObject({ ok: true, migrated: false });
  });

  it.each([11, 10, 9])('honors v%s recovery pointers before its fallback copies', version => {
    const memory = storage(new Map([
      [`living-waters-memory-recovery-v${version}`, 'earlier-memory'],
      [`living-waters-replaced-v${version}`, 'latest-replacement'],
      [`living-waters-latest-recovery-v${version}`, `living-waters-replaced-v${version}`],
    ]));
    expect(getExpeditionBackupRaw(memory)).toBe('latest-replacement');
    memory.values.set(`living-waters-latest-recovery-v${version}`, 'untrusted-key');
    expect(getExpeditionBackupRaw(memory)).toBe('earlier-memory');
  });
});

describe('schema13 pilot rules are bounded and internally consistent', () => {
  it.each([
    ['amazon', 'surface', 'roots', 'peacock-bass', 0],
    ['florida-bay', 'roots', 'mangroves', 'common-snook', 0],
    ['florida-bay', 'flat', 'seagrass', 'spotted-seatrout', 1],
  ] as const)('round trips native %s/%s casts, every control tick and their completed field record', (venueId, gearId, habitatId, encounterId, seasonIndex) => {
    let state = nativeCast(venueId, gearId, habitatId, seasonIndex);
    expect(state.encounterId).toBe(encounterId);
    expect(state.anglingRules).toBe('habitat-v1');
    expect(state.anglingBeat).toBe(0);
    expect(validateExpedition(state)).toBe(true);
    for (let tick = 0; tick < 600 && !state.lineResolved; tick++) {
      state = advanceInteraction(state, getRecommendedEngagement(state));
      expect(validateExpedition(state), `${encounterId}:${tick}`).toBe(true);
      expect(parseExpedition(serializeExpedition(state))).toMatchObject({ ok: true, migrated: false, state });
    }
    expect(state.lineResolved).toBe(true);
    state = revealEncounter(state);
    expect(validateExpedition(state)).toBe(true);
    state = handleEncounter(state, getCurrentEncounter(state)!.handling.find(option => option.safe)!.id);
    expect(parseExpedition(serializeExpedition(state))).toMatchObject({ ok: true, state });
    state = beginDebrief(state);
    expect(validateExpedition(state)).toBe(true);
    state = completeDebrief(state, 'full-notes');
    expect(validateExpedition(state)).toBe(true);
  });

  it('requires both new fields and known rules; classic always has zero behavior ticks', () => {
    const classic = createInitialState();
    expect(validateExpedition(classic)).toBe(true);
    for (const patch of [{ anglingRules: 'future' }, { anglingRules: null }, { anglingBeat: 1 }, { anglingBeat: '0' }]) {
      expect(validateExpedition({ ...classic, ...patch })).toBe(false);
    }
    for (const field of ['anglingRules', 'anglingBeat']) {
      const missing = { ...classic } as Record<string, unknown>; delete missing[field];
      expect(parseExpedition(JSON.stringify(missing)).ok).toBe(false);
    }
  });

  it('rejects noninteger, nonfinite, out-of-bounds and turn-ahead pilot clocks', () => {
    const pilot = nativeCast('amazon', 'surface', 'roots');
    for (const anglingBeat of [-1, 0.5, NaN, Infinity, 1000001, '1', null]) {
      expect(validateExpedition({ ...pilot, anglingBeat })).toBe(false);
      expect(() => serializeExpedition({ ...pilot, anglingBeat } as never)).toThrow();
    }
    expect(validateExpedition(withClock(pilot, 1, 0))).toBe(false);
    expect(validateExpedition(withClock(pilot, 1000000, 1000000))).toBe(true);
  });

  it('does not allow the stored phase or elapsed-window field to disagree with the sole clock', () => {
    const pilot = withClock(nativeCast('amazon', 'surface', 'roots'), 8, 8);
    expect(validateExpedition(pilot)).toBe(true);
    expect(validateExpedition({ ...pilot, fightPhase: pilot.fightPhase === 'rest' ? 'run' : 'rest' })).toBe(false);
    expect(validateExpedition({ ...pilot, phaseProgress: pilot.phaseProgress + 1 })).toBe(false);
  });

  it('rejects pilot markers on another fish, another venue, physical snags, surveys and early stages', () => {
    const amazon = nativeCast('amazon', 'surface', 'roots');
    expect(validateExpedition({ ...amazon, encounterId: 'arapaima' })).toBe(false);
    const florida = nativeCast('florida-bay', 'roots', 'mangroves');
    expect(validateExpedition({ ...florida, encounterId: 'red-drum' })).toBe(false);
    for (const state of [nativeCast('amazon', 'balanced', 'roots'), nativeCast('galapagos', 'shore-camera', 'lava-shore'),
      nativeCast('okavango', 'channel', 'channel'), selectVenue(createInitialState(), 'amazon')]) {
      expect(validateExpedition({ ...state, anglingRules: 'habitat-v1', anglingBeat: 0 })).toBe(false);
    }
  });
});
