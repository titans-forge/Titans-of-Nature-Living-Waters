import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CastGame } from '../src/components/CastGame';
import { FishingScene } from '../src/components/FishingScene';
import { describe, expect, it } from 'vitest';
import { askQuestion, beginQuestions, castLine, chooseSnagApproach, createInitialState, finishGear, finishQuestions, selectGear, selectHabitat, selectVenue, advanceAssistedInteraction } from '../src/game/engine';
import { parseExpedition, serializeExpedition } from '../src/game/save';
import { getExpeditionBackupRaw, LEGACY_SAVE_KEYS, loadStoredExpedition, MIGRATION_BACKUP_KEY, saveStoredExpeditionIfUnchanged, SAVE_KEY } from '../src/game/storage';
import { needsSnagApproach } from '../src/game/interactions';
import { venueById } from '../src/data/venues';

function snag() {
  let state = beginQuestions(selectVenue(createInitialState(), 'amazon'));
  state = askQuestion(askQuestion(state, 'water-rise'), 'gear');
  return castLine(selectHabitat(finishGear(selectGear(finishQuestions(state), 'balanced')), 'roots'), 44);
}
function v9() {
  const { snagApproach: _approach, learningRevisions: _reviews, anglingRules: _rules, anglingBeat: _beat, rodSide: _side, ...state } = snag();
  // Old genuine line-control actions must never be mistaken for a new assessment.
  return { ...state, version: 9, lineTurn: 3, lineActions: ['give', 'hold', 'reel'] };
}

describe('encounter decisions and previous journeys', () => {
  it('preserves v9 progress and old actions without inventing a snag assessment', () => {
    const old = v9();
    const parsed = parseExpedition(JSON.stringify(old));
    expect(parsed).toMatchObject({ ok: true, migrated: true, state: { version: 13, snagApproach: 'unassessed', lineActions: old.lineActions, observations: old.observations } });
    if (!parsed.ok) return;
    expect(needsSnagApproach(parsed.state, venueById.amazon)).toBe(true);
    expect(advanceAssistedInteraction(parsed.state)).toEqual(parsed.state);
  });
  it.each(['back-out', 'pull-through'] as const)('round trips a genuine %s decision without changing mistake history', approach => {
    const state = chooseSnagApproach(snag(), approach);
    expect(parseExpedition(serializeExpedition(state))).toMatchObject({ ok: true, migrated: false, state });
  });
  it('does not charge or rewrite the same unsuccessful assessment twice', () => {
    const state = chooseSnagApproach(snag(), 'pull-through');
    expect(chooseSnagApproach(state, 'pull-through')).toBe(state);
  });
  it('rejects malformed v9 input rather than laundering it into a new save', () => {
    expect(parseExpedition(JSON.stringify({ ...v9(), observations: 'bad' })).ok).toBe(false);
    expect(parseExpedition(JSON.stringify({ ...v9(), snagApproach: 'back-out' })).ok).toBe(false);
    expect(parseExpedition(JSON.stringify({ ...snag(), snagApproach: 'rip-out' })).ok).toBe(false);
  });
  it('preserves the exact v9 storage original before a guarded current save', () => {
    const values = new Map<string, string>();
    const memory = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const raw = JSON.stringify({ format: 'titans-forge-living-waters', version: 9, state: v9() });
    values.set('living-waters-save-v9', raw);
    expect(LEGACY_SAVE_KEYS).toContain('living-waters-save-v9');
    const loaded = loadStoredExpedition(memory);
    expect(loaded.blocked).toBe(false);
    expect(values.get(MIGRATION_BACKUP_KEY)).toBe(raw);
    expect(saveStoredExpeditionIfUnchanged(loaded.state, loaded.raw, memory).ok).toBe(true);
    expect(values.get('living-waters-save-v9')).toBe(raw);
    expect(parseExpedition(values.get(SAVE_KEY)!)).toMatchObject({ ok: true, migrated: false });
    expect(getExpeditionBackupRaw(memory)).toBe(raw);
  });
  it('honors the previous recovery pointer instead of exporting an older displaced copy', () => {
    const values = new Map([
      ['living-waters-memory-recovery-v9', 'older-memory-copy'],
      ['living-waters-replaced-v9', 'newer-replacement-copy'],
      ['living-waters-latest-recovery-v9', 'living-waters-replaced-v9'],
    ]);
    const memory = { getItem: (key: string) => values.get(key) ?? null, setItem: () => {} };
    expect(getExpeditionBackupRaw(memory)).toBe('newer-replacement-copy');
    values.set('living-waters-latest-recovery-v9', 'untrusted-key');
    expect(getExpeditionBackupRaw(memory)).toBe('older-memory-copy');
  });
  it('restarts an unfinished v9 seasonal equipment mismatch without changing history or awarding a cast', () => {
    let state = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { 'great-barrier-reef': 2 } }, 'great-barrier-reef'));
    const venue = venueById['great-barrier-reef'];
    state = askQuestion(askQuestion(state, venue.questions[0].id), venue.questions[1].id);
    state = castLine(selectHabitat(finishGear(selectGear(finishQuestions(state), 'pelagic')), 'channel'), 74);
    const { snagApproach: _approach, learningRevisions: _reviews, anglingRules: _rules, anglingBeat: _beat, rodSide: _side, ...old } = state;
    const legacy = { ...old, version: 9, encounterId: 'green-turtle', lineTurn: 18, phaseProgress: 5, interactionProgress: 42, interactionMistakes: 2 };
    const parsed = parseExpedition(JSON.stringify(legacy));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.state).toMatchObject({ encounterId: state.encounterId, interactionProgress: 0, phaseProgress: 0, interactionMistakes: 2,
      castAttempts: legacy.castAttempts, castPower: legacy.castPower, castAccuracy: legacy.castAccuracy,
      journalIds: legacy.journalIds, observations: legacy.observations, fieldcraft: legacy.fieldcraft, biology: legacy.biology, ecology: legacy.ecology, trust: legacy.trust });
    expect(parsed.warnings.join(' ')).toContain('seasonal route');
    expect(parseExpedition(serializeExpedition(parsed.state))).toMatchObject({ ok: true, migrated: false });
  });
  it('preserves a resolved earlier route and presents literal history without new catching claims', () => {
    const venue = venueById['great-barrier-reef'];
    let state = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { [venue.id]: 2 } }, venue.id));
    state = askQuestion(askQuestion(state, venue.questions[0].id), venue.questions[1].id);
    state = castLine(selectHabitat(finishGear(selectGear(finishQuestions(state), 'pelagic')), 'channel'), 74);
    const { snagApproach: _approach, learningRevisions: _reviews, anglingRules: _rules, anglingBeat: _beat, rodSide: _side, ...old } = state;
    const legacy = { ...old, version: 9, encounterId: 'green-turtle', lineResolved: true, interactionProgress: 100, lineTurn: 18, fishDistance: 0, fishStamina: 0 };
    const parsed = parseExpedition(JSON.stringify(legacy));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.state).toMatchObject({ encounterId: 'green-turtle', lineResolved: true, interactionProgress: 100, fieldcraft: legacy.fieldcraft });
    const scene = renderToStaticMarkup(createElement(FishingScene, { state: parsed.state, venue, paused: false }));
    const controls = renderToStaticMarkup(createElement(CastGame, { state: parsed.state, venue, paused: false, layoutNotice: '', setState: () => {} }));
    expect(scene).toContain('Earlier field encounter');
    expect(scene).not.toContain('fish-shadow');
    expect(scene).not.toContain('Alongside the boat');
    expect(controls).toContain('Review the field encounter');
    expect(controls).not.toContain('Burst runner');
    expect(controls).not.toContain('Line pressure');
  });
  it('still exposes a v9 displaced journey after an application upgrade', () => {
    const raw = JSON.stringify(v9());
    const memory = { getItem: (key: string) => key === 'living-waters-memory-recovery-v9' ? raw : null, setItem: () => {} };
    expect(getExpeditionBackupRaw(memory)).toBe(raw);
  });
});
