import { advanceRecommendedInteraction } from './helpers/fishing';
import { describe, expect, it } from 'vitest';
import { venues } from '../src/data/venues';
import { learningQuestions } from '../src/data/learning';
import { advanceInteraction, chooseSnagApproach, getRecommendedEngagement, askQuestion, beginDebrief, beginQuestions, castLine, completeDebrief, continueExpedition, createInitialState, finishGear, finishQuestions, handleEncounter, revealEncounter, selectGear, selectHabitat, selectVenue } from '../src/game/engine';
import { MAX_SAVE_BYTES, parseExpedition, serializeExpedition, validateExpedition } from '../src/game/save';
import type { ExpeditionState } from '../src/types';

function prepared() {
  let state = beginQuestions(selectVenue(createInitialState(), 'amazon'));
  state = askQuestion(askQuestion(state, 'water-rise'), 'gear');
  return finishGear(selectGear(finishQuestions(state), 'surface'));
}
function recorded() {
  let state = castLine(selectHabitat(prepared(), 'roots'), 42);
  for (let tick = 0; tick < 1000 && !state.lineResolved; tick += 1) state = advanceRecommendedInteraction(state);
  return handleEncounter(revealEncounter(state), 'steady-release');
}
function legacy(state: ExpeditionState, version: number) {
  const value = JSON.parse(JSON.stringify(state));
  value.version = version;
  for (const key of ['observations', 'learningAnswers', 'expeditionNumber', 'castUsedAssistance', 'snagApproach', 'learningRevisions', 'anglingRules', 'anglingBeat', 'rodSide']) delete value[key];
  if (version < 7) for (const key of ['experienceMode', 'assistMode', 'castAttempts', 'tripJournalIds', 'tripSafeJournalIds']) delete value[key];
  if (version <= 2) { delete value.venueId; delete value.activeAssignmentId; value.journalIds = value.journalIds.map((id: string) => id.replace('amazon:', '')); }
  return value;
}

describe('portable expedition saves', () => {
  it('round trips actual engine states through every stage and a repeat trip', () => {
    const states: ExpeditionState[] = [createInitialState(), selectVenue(createInitialState(), 'amazon'), prepared()];
    states.push({ ...selectHabitat(prepared(), 'roots'), stage: 'cast' });
    let state = castLine(selectHabitat(prepared(), 'roots'), 42); states.push(state);
    while (!state.lineResolved) { state = advanceRecommendedInteraction(state); states.push(state); }
    states.push(revealEncounter(state), recorded(), continueExpedition(recorded()), beginDebrief(recorded()));
    state = completeDebrief(beginDebrief(recorded()), 'full-notes'); states.push(state, selectVenue(state, 'okavango'));
    for (const item of states) {
      expect(validateExpedition(item), item.stage).toBe(true);
      expect(parseExpedition(serializeExpedition(item))).toMatchObject({ ok: true, state: item, migrated: false });
    }
  });
  it('accepts completed native records for every safe kit/habitat/season combination', () => {
    for (const venue of venues) for (const [seasonIndex] of venue.seasons.entries()) for (const habitat of venue.habitats.filter(h => h.safe !== false)) for (const gear of venue.gearSets) {
      let state = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { [venue.id]: seasonIndex } }, venue.id));
      state = askQuestion(askQuestion(state, venue.questions[0].id), venue.questions[1].id);
      state = finishGear(selectGear(finishQuestions(state), gear.id));
      state = castLine(selectHabitat(state, habitat.id), venue.idealPower[habitat.id]);
      if (venue.encounters[state.encounterId!].interaction === 'snag') state = chooseSnagApproach(state, 'back-out');
      for (let tick = 0; tick < 1000 && !state.lineResolved; tick += 1) state = advanceRecommendedInteraction(state);
      expect(state.lineResolved).toBe(true);
      const encounter = venue.encounters[state.encounterId!];
      state = handleEncounter(revealEncounter(state), encounter.handling.find(h => h.safe)!.id);
      expect(validateExpedition(state), `${venue.id}:${seasonIndex}:${habitat.id}:${gear.id}`).toBe(true);
      state = completeDebrief(beginDebrief(state), 'full-notes');
      expect(parseExpedition(serializeExpedition(state))).toMatchObject({ ok: true, state });
    }
  });
  it.each([1, 2, 3, 4, 5, 6, 7])('migrates a supported v%s synthetic legacy-shaped journal without inventing detailed history', version => {
    const parsed = parseExpedition(JSON.stringify(legacy(recorded(), version)));
    expect(parsed).toMatchObject({ ok: true, migrated: true, state: { version: 13, stage: 'journal', journalIds: ['amazon:peacock-bass'], observations: [], learningAnswers: [], tripSafeJournalIds: ['amazon:peacock-bass'] } });
  });
  it('preserves v6 safe assignment eligibility for a pending community report', () => {
    const parsed = parseExpedition(JSON.stringify(legacy(recorded(), 6)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const report = completeDebrief(beginDebrief(parsed.state), 'full-notes');
    expect(report.completedAssignmentIds).toContain('amazon:peacock-bass');
  });
  it('does not turn unsafe legacy handling into safe evidence', () => {
    const value = legacy(recorded(), 6); value.handlingId = venues[0].encounters['peacock-bass'].handling.find(h => !h.safe)!.id;
    const parsed = parseExpedition(JSON.stringify(value));
    expect(parsed).toMatchObject({ ok: true, state: { tripSafeJournalIds: [] } });
  });
  it('resumes the old v5 casting interaction at habitat selection with a notice', () => {
    const parsed = parseExpedition(JSON.stringify(legacy(castLine(selectHabitat(prepared(), 'roots'), 42), 5)));
    expect(parsed).toMatchObject({ ok: true, state: { stage: 'habitat', encounterId: null, castAttempts: 0 } });
    if (parsed.ok) expect(parsed.warnings.join(' ')).toContain('habitat selection');
  });
  it.each(['not JSON', 'null', '[]', '{}', '{"version":99}', '{"version":8,"journalIds":null}', '{"__proto__":{}}'])('rejects malformed or unsupported input safely: %s', raw => {
    expect(() => parseExpedition(raw)).not.toThrow(); expect(parseExpedition(raw).ok).toBe(false);
  });
  it('rejects oversize bytes including multibyte input', () => {
    expect(parseExpedition(' '.repeat(MAX_SAVE_BYTES + 1)).ok).toBe(false);
    expect(parseExpedition('あ'.repeat(Math.ceil(MAX_SAVE_BYTES / 3))).ok).toBe(false);
  });
  it.each([
    { journalIds: null }, { askedQuestions: ['missing'] }, { stage: 'handling' }, { venueVisitCounts: { amazon: -1 } },
    { journalIds: ['amazon:missing'] }, { completedAssignmentIds: ['amazon:peacock-bass'] }, { unknownField: true },
    { lineTension: 101 }, { fieldcraft: '100' }, { phaseProgress: -1 }, { gearId: '__proto__' }, { lineActions: ['jump'] }, { expeditionNumber: 1.5 },
  ])('rejects invalid nested/state fields %j', patch => {
    const value = { ...createInitialState(), ...patch };
    expect(parseExpedition(JSON.stringify(value)).ok).toBe(false);
    expect(validateExpedition(value)).toBe(false);
  });
  it('rejects nonfinite in-memory values and serialization rather than emitting a poisoned file', () => {
    expect(validateExpedition({ ...createInitialState(), castAccuracy: NaN })).toBe(false);
    expect(() => serializeExpedition({ ...createInitialState(), fieldcraft: Infinity })).toThrow();
  });
  it('rejects invalid observation details, ordering, and cross-venue combinations', () => {
    const state = recorded(); expect(state.observations).toHaveLength(1);
    for (const patch of [{ assisted: 'yes' }, { id: -1 }, { handlingId: 'missing' }, { venueId: 'okavango' }, { expedition: 0 }, { extra: true }, { castAccuracy: 101 }]) {
      expect(validateExpedition({ ...state, observations: [{ ...state.observations[0], ...patch }] }), JSON.stringify(patch)).toBe(false);
    }
    expect(validateExpedition({ ...state, observations: [...state.observations, ...state.observations] })).toBe(false);
  });
  it('validates learning correctness from authored content and preserves first-answer identity', () => {
    const question = learningQuestions[0]; const wrong = question.options.find(o => o.id !== question.correctId)!;
    const valid = { ...createInitialState(), learningAnswers: [{ questionId: question.id, answerId: wrong.id, correct: false }] };
    expect(validateExpedition(valid)).toBe(true);
    expect(validateExpedition({ ...valid, learningAnswers: [{ ...valid.learningAnswers[0], correct: true }] })).toBe(false);
    expect(validateExpedition({ ...valid, learningAnswers: [...valid.learningAnswers, ...valid.learningAnswers] })).toBe(false);
    expect(validateExpedition({ ...valid, learningAnswers: [{ questionId: 'made-up', answerId: 'yes', correct: true }] })).toBe(false);
  });
  it('does not mutate the source or active state while rejecting an import', () => {
    const current = recorded(); const snapshot = structuredClone(current);
    parseExpedition(JSON.stringify({ ...current, observations: null }));
    expect(current).toEqual(snapshot);
  });
});
