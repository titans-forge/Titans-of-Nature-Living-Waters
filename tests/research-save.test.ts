import { describe, expect, it } from 'vitest';
import playedV10 from './fixtures/v10-played-journey.json';
import { getLearningQuestion, recordLearningAnswer } from '../src/data/learning';
import { researchProjects } from '../src/data/researchProjects';
import { venueById } from '../src/data/venues';
import { advanceAssistedInteraction, askQuestion, beginDebrief, beginQuestions, castLine, chooseSnagApproach, completeDebrief, createInitialState, finishGear, finishQuestions, getCurrentEncounter, handleEncounter, selectGear, selectHabitat, selectVenue, revealEncounter } from '../src/game/engine';
import { correctLimitationId, getProjectEvidenceStatus, getResearchLimitations, recordLearningRevision } from '../src/game/research';
import { parseExpedition, serializeExpedition, validateExpedition } from '../src/game/save';
import { getExpeditionBackupRaw, loadStoredExpedition, MIGRATION_BACKUP_KEY, SAVE_KEY, saveStoredExpeditionIfUnchanged } from '../src/game/storage';
import type { ExpeditionState } from '../src/types';

function completeRelevant(state: ExpeditionState, projectId: string, venueId: string): ExpeditionState {
  const venue = venueById[venueId];
  const requirement = researchProjects.find(project => project.id === projectId)!.evidenceRequirements.find(stop => stop.venueId === venueId)!;
  let base = beginQuestions(selectVenue(state, venueId));
  base = askQuestion(askQuestion(base, venue.questions[0].id), venue.questions[1].id);
  base = finishQuestions(base);
  for (const gear of venue.gearSets) for (const habitat of venue.habitats.filter(habitat => habitat.safe !== false)) {
    let trial = castLine(selectHabitat(finishGear(selectGear(base, gear.id)), habitat.id), venue.idealPower[habitat.id]);
    if (!requirement.routes.some(route => route.encounterId === trial.encounterId && route.habitatId === habitat.id && route.method === gear.method)) continue;
    trial = chooseSnagApproach(trial, 'back-out');
    for (let tick = 0; tick < 600 && !trial.lineResolved; tick++) trial = advanceAssistedInteraction(trial);
    if (!trial.lineResolved) throw new Error('Native test route did not resolve');
    const handling = getCurrentEncounter(trial)!.handling.find(option => option.safe)!;
    return completeDebrief(beginDebrief(handleEncounter(revealEncounter(trial), handling.id)), 'full-notes');
  }
  throw new Error('No relevant native test route for ' + venueId);
}

function paired(projectId = 'project:floods') {
  let state = createInitialState();
  for (const venueId of researchProjects.find(project => project.id === projectId)!.venueIds) state = completeRelevant(state, projectId, venueId);
  return state;
}

describe('evidence review save integrity', () => {
  it.each(researchProjects.map(project => project.id))('round trips a native supported %s without changing first answers on revision or travel', projectId => {
    let state = paired(projectId);
    const question = getLearningQuestion(projectId)!;
    const wrong = question.options.find(option => option.id !== question.correctId)!.id;
    state = recordLearningAnswer(state, projectId, wrong);
    const first = structuredClone(state.learningAnswers);
    const evidence = state.observations.map(record => record.id);
    state = recordLearningRevision(state, projectId, question.correctId, evidence, correctLimitationId);
    expect(validateExpedition(state)).toBe(true);
    expect(getProjectEvidenceStatus(state, projectId).supported).toBe(true);
    expect(parseExpedition(serializeExpedition(state))).toMatchObject({ ok: true, migrated: false, state });
    const moved = selectVenue(state, 'florida-bay');
    expect(moved.learningAnswers).toEqual(first);
    expect(moved.learningRevisions).toEqual(state.learningRevisions);
    expect(validateExpedition(moved)).toBe(true);
  });

  it('keeps a recognized wrong conclusion and limitation as valid revisable data', () => {
    const state = paired();
    const question = getLearningQuestion('project:floods')!;
    const wrong = question.options.find(option => option.id !== question.correctId)!.id;
    const reviewed = recordLearningRevision(state, question.id, wrong, [1, 2], 'population-proof');
    expect(parseExpedition(serializeExpedition(reviewed))).toMatchObject({ ok: true, state: reviewed });
    expect(getProjectEvidenceStatus(reviewed, question.id)).toMatchObject({ attempted: true, supported: false });
  });

  it.each(['sample-limits', 'population-proof', 'whole-route-proof'])('preserves schema 12 first answers and stable links for contextual %s choices', limitationId => {
    const question = getLearningQuestion('project:floods')!;
    const initial = recordLearningAnswer(paired(), question.id, 'area');
    const reviewed = recordLearningRevision(initial, question.id, question.correctId, [1, 2], limitationId);
    const parsed = parseExpedition(serializeExpedition(reviewed));
    expect(parsed).toMatchObject({ ok: true, migrated: false });
    if (!parsed.ok) return;
    expect(parsed.state.version).toBe(12);
    expect(parsed.state.learningAnswers).toEqual(initial.learningAnswers);
    expect(parsed.state.learningRevisions[0]).toMatchObject({ questionId: question.id, answerId: question.correctId, evidenceIds: [1, 2], limitationId });
    expect(getProjectEvidenceStatus(parsed.state, question.id).supported).toBe(limitationId === correctLimitationId);
    expect(getResearchLimitations(question.id).some(option => option.id === parsed.state.learningRevisions[0].limitationId)).toBe(true);
  });

  it('rejects forged correctness, duplicate reviews, unknown limitations and broken evidence links', () => {
    const state = paired();
    const reviewed = recordLearningRevision(state, 'project:floods', getLearningQuestion('project:floods')!.correctId, [1, 2], correctLimitationId);
    const review = reviewed.learningRevisions[0];
    for (const learningRevisions of [[{ ...review, correct: false }], [review, review], [{ ...review, limitationId: 'fabricated' }], [{ ...review, evidenceIds: [1, 999] }], [{ ...review, evidenceIds: [1, 1] }]]) {
      expect(parseExpedition(JSON.stringify({ ...reviewed, learningRevisions })).ok).toBe(false);
    }
    expect(validateExpedition({ ...reviewed, learningAnswers: [] })).toBe(false);
    expect(validateExpedition({ ...reviewed, observations: [] })).toBe(false);
  });

  it('retains a genuine browser-played version 10 journey byte-for-field and invents no reviews', () => {
    const parsed = parseExpedition(JSON.stringify(playedV10));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.state).toEqual({ ...playedV10.state, version: 12, learningRevisions: [], anglingRules: 'classic', anglingBeat: 0 });
    expect(parsed.warnings.join(' ')).toContain('first answers');
    expect(parseExpedition(serializeExpedition(parsed.state))).toMatchObject({ ok: true, migrated: false });
  });

  it('preserves a historical correct project answer as answered with unlinked evidence', () => {
    const state = paired('project:migration');
    const { learningRevisions: _reviews, anglingRules: _rules, anglingBeat: _beat, ...old } = recordLearningAnswer(state, 'project:migration', 'access');
    const parsed = parseExpedition(JSON.stringify({ ...old, version: 10 }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.state.learningAnswers).toEqual(old.learningAnswers);
    expect(getProjectEvidenceStatus(parsed.state, 'project:migration')).toMatchObject({ attempted: true, ready: true, supported: false });
  });

  it('does not launder version 10 unknown fields into a current state', () => {
    expect(parseExpedition(JSON.stringify({ ...playedV10, state: { ...playedV10.state, learningRevisions: [] } })).ok).toBe(false);
    expect(parseExpedition(JSON.stringify({ ...playedV10, state: { ...playedV10.state, snagApproach: 'fabricated' } })).ok).toBe(false);
  });

  it('preserves exact version 10 bytes before saving the current version and respects its latest recovery pointer', () => {
    const raw = JSON.stringify(playedV10, null, 2);
    const values = new Map([['living-waters-save-v10', raw], ['living-waters-memory-recovery-v10', 'earlier-copy'], ['living-waters-replaced-v10', 'latest-copy'], ['living-waters-latest-recovery-v10', 'living-waters-replaced-v10']]);
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(getExpeditionBackupRaw(storage)).toBe('latest-copy');
    const loaded = loadStoredExpedition(storage);
    expect(loaded.blocked).toBe(false);
    expect(values.get(MIGRATION_BACKUP_KEY)).toBe(raw);
    expect(saveStoredExpeditionIfUnchanged(loaded.state, loaded.raw, storage).ok).toBe(true);
    expect(values.get('living-waters-save-v10')).toBe(raw);
    expect(parseExpedition(values.get(SAVE_KEY)!)).toMatchObject({ ok: true, migrated: false });
  });
});
