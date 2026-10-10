import { describe, expect, it } from 'vitest';
import v8Journey from './fixtures/audit-journey-v8.json';
import { getLearningQuestion, learningQuestions } from '../src/data/learning';
import { researchProjects } from '../src/data/researchProjects';
import { venueById } from '../src/data/venues';
import { advanceInteraction, askQuestion, beginDebrief, beginQuestions, castLine, chooseSnagApproach, completeDebrief, createInitialState, finishGear, finishQuestions, getRecommendedEngagement, handleEncounter, revealEncounter, selectGear, selectHabitat, selectVenue } from '../src/game/engine';
import { needsSnagApproach } from '../src/game/interactions';
import { journeyByteLength, MAX_SAVE_BYTES } from '../src/game/limits';
import { correctLimitationId, getEvidenceForQuestion, getProjectEvidenceStatus, getResearchLimitations, getRevisionProblem, getRevisionValidation, isRevisionSupported, recordLearningRevision, researchLimitations, safeObservation } from '../src/game/research';
import { parseExpedition, serializeExpedition } from '../src/game/save';
import { resolveSeasonEncounter } from '../src/game/seasons';
import type { ExpeditionState, FieldObservation } from '../src/types';

function nativeRecord(venueId: string, habitatId: string, gearId: string, seasonIndex = 0): FieldObservation {
  const venue = venueById[venueId];
  const questionId = venue.informedQuestionByZone[habitatId];
  let state = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { [venueId]: seasonIndex } }, venueId));
  state = askQuestion(askQuestion(state, questionId), venue.questions.find(question => question.id !== questionId)!.id);
  state = castLine(selectHabitat(finishGear(selectGear(finishQuestions(state), gearId)), habitatId), venue.idealPower[habitatId]);
  if (needsSnagApproach(state, venue)) state = chooseSnagApproach(state, 'back-out');
  for (let tick = 0; tick < 1000 && !state.lineResolved; tick++) state = advanceInteraction(state, getRecommendedEngagement(state));
  expect(state.lineResolved).toBe(true);
  state = handleEncounter(revealEncounter(state), venue.encounters[state.encounterId!].handling.find(option => option.safe)!.id);
  state = completeDebrief(beginDebrief(state), 'full-notes');
  return state.observations[0];
}

function withRecords(records: FieldObservation[]): ExpeditionState {
  const observations = records.map((record, index) => ({ ...record, id: index + 1, expedition: index + 1 }));
  return { ...createInitialState(), observations, expeditionNumber: observations.length,
    journalIds: [...new Set(observations.map(record => `${record.venueId}:${record.encounterId}`))] };
}

function projectRecords(projectId: string, seasonIndex = 0): FieldObservation[] {
  const project = researchProjects.find(project => project.id === projectId)!;
  return project.evidenceRequirements.map(requirement => {
    const venue = venueById[requirement.venueId];
    const season = venue.seasons[seasonIndex];
    for (const route of requirement.routes) for (const gear of venue.gearSets.filter(gear => gear.method === route.method)) {
      const routed = venue.encounterRules[`${route.habitatId}:${gear.id}`] ?? venue.fallbackEncounterId;
      if (resolveSeasonEncounter(venue, season.id, routed, gear.id) === route.encounterId) return nativeRecord(venue.id, route.habitatId, gear.id, seasonIndex);
    }
    throw new Error(`No eligible native route for ${projectId}/${venue.id}/${season.id}`);
  });
}

describe('research evidence must answer the field question', () => {
  it('locates actionable validation at the answer, limitation, or missing evidence stop without technical wording', () => {
    const state = withRecords(projectRecords('project:floods'));
    expect(getRevisionValidation(state, 'project:floods', '', [], '')).toEqual({ text: 'Choose a conclusion from this question.', field: 'answer' });
    expect(getRevisionValidation(state, 'amazon:prediction', '', [], '')).toEqual({ text: 'Choose an explanation from this question.', field: 'answer' });
    expect(getRevisionValidation(state, 'project:floods', 'exchange', [1, 2], '')?.field).toBe('limitation');
    expect(getRevisionValidation(state, 'project:floods', 'exchange', [1], correctLimitationId)).toMatchObject({ field: 'evidence', venueId: 'tonle-sap' });
    expect(getRevisionValidation(state, 'project:floods', 'exchange', [2], correctLimitationId)).toMatchObject({ field: 'evidence', venueId: 'amazon' });
    expect(getRevisionValidation(state, 'amazon:prediction', 'forest', [], correctLimitationId)).toMatchObject({ field: 'evidence', venueId: 'amazon' });
    expect(getRevisionValidation(state, 'project:floods', 'exchange', null as unknown as number[], correctLimitationId)).toMatchObject({ field: 'evidence' });
    expect(getRevisionProblem(state, 'project:floods', '', [], '')).not.toContain('authored');
  });

  it('gives each field question contextual limitation choices while preserving recognized saved meanings', () => {
    const ids = researchLimitations.map(option => option.id).sort();
    const correctPositions = new Set<number>();
    const boundedTexts = new Set<string>();
    for (const question of learningQuestions) {
      const options = getResearchLimitations(question.id);
      expect(options.map(option => option.id).sort()).toEqual(ids);
      expect(options).toEqual(getResearchLimitations(question.id));
      expect(options.every(option => option.text.length > 30 && option.feedback.length > 30)).toBe(true);
      expect(options.map(option => option.text).join(' ')).not.toMatch(/prove every|across the whole region|every predicted event/);
      correctPositions.add(options.findIndex(option => option.id === correctLimitationId));
      boundedTexts.add(options.find(option => option.id === correctLimitationId)!.text);
    }
    expect(correctPositions.size).toBe(3);
    expect(boundedTexts.size).toBe(learningQuestions.length);
    expect(getResearchLimitations('amazon:reflection').find(option => option.id === correctLimitationId)?.text).toContain('water level, equipment, or effort');
    expect(getResearchLimitations('galapagos:reflection').find(option => option.id === correctLimitationId)?.text).toContain('receiver coverage');
    expect(getResearchLimitations('project:migration').find(option => option.id === correctLimitationId)?.text).toContain('passage performance');
    expect(getResearchLimitations('__proto__')).toBe(researchLimitations);
  });

  it.each(researchProjects.map(project => project.id))('%s offers native eligible evidence at both stops in every season', projectId => {
    for (let season = 0; season < 3; season++) {
      const state = withRecords(projectRecords(projectId, season));
      const status = getProjectEvidenceStatus(state, projectId);
      expect(status.ready).toBe(true);
      expect(status.attempted).toBe(false);
      expect(status.supported).toBe(false);
      expect(status.stops.map(stop => stop.candidates.length)).toEqual([1, 1]);
      expect(getEvidenceForQuestion(state, projectId)).toEqual(state.observations);
    }
  });

  it('does not unlock migration using the original playthrough’s sponge and mooring rope', () => {
    const parsed = parseExpedition(JSON.stringify(v8Journey));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.state.observations.find(record => record.encounterId === 'baikal-sponge')?.shared).toBe(true);
    expect(parsed.state.observations.find(record => record.encounterId === 'mooring-snag')?.shared).toBe(true);
    expect(getEvidenceForQuestion(parsed.state, 'project:migration')).toEqual([]);
    expect(getProjectEvidenceStatus(parsed.state, 'project:migration').ready).toBe(false);
  });

  it('requires safe handling and full shared notes, not merely a familiar venue or a matching species', () => {
    const state = withRecords(projectRecords('project:floods'));
    const first = state.observations[0];
    const encounter = venueById[first.venueId].encounters[first.encounterId];
    for (const patch of [
      { reportingStatus: 'identity-only' as const, shared: false },
      { reportingStatus: 'private-notes' as const, shared: false },
      { reportingStatus: 'pending' as const, shared: false },
      { reportingStatus: 'legacy-unknown' as const, shared: false },
      { reportingStatus: 'full-notes' as const, shared: false },
      { reportingStatus: 'identity-only' as const, shared: true },
      { handlingId: encounter.handling.find(option => !option.safe)!.id },
      { habitatId: 'plants' },
    ]) {
      const changed = { ...state, observations: [{ ...first, ...patch }, state.observations[1]] };
      expect(getProjectEvidenceStatus(changed, 'project:floods').ready, JSON.stringify(patch)).toBe(false);
    }
    const incident = nativeRecord('amazon', 'plants', 'light', 1);
    const rope = nativeRecord('danube', 'navigation', 'gravel-drift');
    const mixed = withRecords([incident, rope]);
    expect(safeObservation(mixed.observations[0])).toBe(true);
    expect(getEvidenceForQuestion(mixed, 'project:floods')).toEqual([]);
    expect(getEvidenceForQuestion(mixed, 'project:migration')).toEqual([]);
  });

  it('accepts telemetry as migration evidence and rejects the wrong observation method', () => {
    const state = withRecords([nativeRecord('baikal', 'delta', 'survey'), nativeRecord('danube', 'navigation', 'telemetry')]);
    expect(getProjectEvidenceStatus(state, 'project:migration').ready).toBe(true);
    const wrongMethod = { ...state, observations: state.observations.map(record => record.venueId === 'danube' ? { ...record, gearId: 'gravel-drift' } : record) };
    expect(getProjectEvidenceStatus(wrongMethod, 'project:migration').ready).toBe(false);
  });

  it('requires exactly two distinct records, one eligible record per required water', () => {
    const records = projectRecords('project:floods');
    const state = withRecords([records[0], records[0], records[1]]);
    const answer = getLearningQuestion('project:floods')!.correctId;
    for (const ids of [[], [1], [1, 1], [1, 2], [1, 3, 2], [1, 999], [1, NaN], [1, 2.5]]) {
      expect(getRevisionProblem(state, 'project:floods', answer, ids, correctLimitationId)).not.toBeNull();
      expect(recordLearningRevision(state, 'project:floods', answer, ids, correctLimitationId)).toBe(state);
    }
    expect(getRevisionProblem(state, 'project:floods', answer, [1, 3], correctLimitationId)).toBeNull();
    expect(getRevisionProblem(state, '__proto__', answer, [1, 3], correctLimitationId)).not.toBeNull();
    expect(getRevisionProblem(state, 'project:floods', 'made-up', [1, 3], correctLimitationId)).not.toBeNull();
    expect(getRevisionProblem(state, 'project:floods', answer, [1, 3], '__proto__')).not.toBeNull();
  });
});

describe('explanations can change while first answers remain honest', () => {
  it.each(researchProjects.map(project => project.id))('%s requires a correct conclusion, explicit records and a bounded limitation for supported status', projectId => {
    const state = withRecords(projectRecords(projectId));
    const question = getLearningQuestion(projectId)!;
    const wrong = question.options.find(option => option.id !== question.correctId)!.id;
    const initial = recordLearningRevision(state, projectId, wrong, [1, 2], correctLimitationId);
    expect(initial.learningAnswers).toEqual([{ questionId: projectId, answerId: wrong, correct: false }]);
    expect(getProjectEvidenceStatus(initial, projectId)).toMatchObject({ ready: true, attempted: true, supported: false });
    expect(parseExpedition(serializeExpedition(initial)).ok).toBe(true);
    const overclaim = recordLearningRevision(initial, projectId, question.correctId, [1, 2], 'whole-route-proof');
    expect(getProjectEvidenceStatus(overclaim, projectId).supported).toBe(false);
    expect(parseExpedition(serializeExpedition(overclaim)).ok).toBe(true);
    const supported = recordLearningRevision(overclaim, projectId, question.correctId, [1, 2], correctLimitationId);
    expect(getProjectEvidenceStatus(supported, projectId).supported).toBe(true);
    expect(supported.learningAnswers).toEqual(initial.learningAnswers);
    expect(supported.learningRevisions).toHaveLength(1);
    expect(supported.learningRevisions[0]).toMatchObject({ answerId: question.correctId, correct: true, evidenceIds: [1, 2], limitationId: correctLimitationId });
    expect(parseExpedition(serializeExpedition(supported))).toMatchObject({ ok: true, state: supported });
    expect(state.learningAnswers).toEqual([]);
    expect(initial.learningRevisions[0].answerId).toBe(wrong);
  });

  it('keeps legacy answered projects attempted until an evidence-linked review is submitted', () => {
    const state = withRecords(projectRecords('project:floods'));
    const legacy = { ...state, learningAnswers: [{ questionId: 'project:floods', answerId: 'exchange', correct: true }] };
    expect(getProjectEvidenceStatus(legacy, 'project:floods')).toMatchObject({ ready: true, attempted: true, supported: false });
  });

  it('supports revising all 30 local questions using one safe contextual record, including private notes', () => {
    let count = 0;
    for (const question of learningQuestions.filter(question => question.venueId)) {
      const venue = venueById[question.venueId!];
      const habitat = venue.habitats.find(habitat => habitat.safe !== false)!;
      const record = nativeRecord(venue.id, habitat.id, venue.gearSets[0].id);
      const state = withRecords([{ ...record, reportingStatus: 'private-notes', shared: false }]);
      expect(getEvidenceForQuestion(state, question.id)).toEqual(state.observations);
      expect(getRevisionProblem(state, question.id, question.correctId, [1], correctLimitationId)).toBeNull();
      const reviewed = recordLearningRevision(state, question.id, question.correctId, [1], correctLimitationId);
      expect(isRevisionSupported(reviewed, reviewed.learningRevisions[0])).toBe(true);
      expect(parseExpedition(serializeExpedition(reviewed)).ok).toBe(true);
      expect(getRevisionProblem(state, question.id, question.correctId, [], correctLimitationId)).not.toBeNull();
      expect(getRevisionProblem(state, question.id, question.correctId, [1, 1], correctLimitationId)).not.toBeNull();
      count++;
    }
    expect(count).toBe(30);
    expect(researchLimitations.find(option => option.id === correctLimitationId)?.text).toContain('not proof');
  });

  it('keeps an unsure first prediction, permits pending local evidence, and copies selected IDs immutably', () => {
    const question = getLearningQuestion('amazon:prediction')!;
    const state = withRecords([{ ...nativeRecord('amazon', 'roots', 'surface'), reportingStatus: 'pending', shared: false }]);
    const original = { ...state, learningAnswers: [{ questionId: question.id, answerId: 'not-sure', correct: false }] };
    const evidenceIds = [1];
    const reviewed = recordLearningRevision(original, question.id, question.correctId, evidenceIds, correctLimitationId);
    evidenceIds.push(99);
    expect(reviewed.learningAnswers).toBe(original.learningAnswers);
    expect(reviewed.learningRevisions[0].evidenceIds).toEqual([1]);
    expect(isRevisionSupported(reviewed, reviewed.learningRevisions[0])).toBe(true);
    const foreign = withRecords([nativeRecord('tonle-sap', 'forest', 'forest')]);
    expect(getEvidenceForQuestion(foreign, question.id)).toEqual([]);
    expect(recordLearningRevision(foreign, question.id, question.correctId, [1], correctLimitationId)).toBe(foreign);
  });

  it('derives support from the answer rather than trusting a stored correctness flag', () => {
    const state = withRecords(projectRecords('project:floods'));
    const wrong = getLearningQuestion('project:floods')!.options.find(option => option.id !== 'exchange')!.id;
    const revision = { questionId: 'project:floods', answerId: wrong, correct: true, evidenceIds: [1, 2], limitationId: correctLimitationId };
    expect(isRevisionSupported(state, revision)).toBe(false);
  });

  it('refuses a prospective explanation that exceeds the byte cap without adding a first answer or review', () => {
    const ready = withRecords(projectRecords('project:floods'));
    const initialSize = journeyByteLength(ready);
    // Synthetic large message isolates the budget check; it is not a native UI
    // or parser-valid message and does not establish a normal-play size failure.
    const state = { ...ready, fightMessage: 'x'.repeat(MAX_SAVE_BYTES - initialSize - 1) };
    expect(journeyByteLength(state)).toBeLessThan(MAX_SAVE_BYTES);
    const problem = getRevisionProblem(state, 'project:floods', 'exchange', [1, 2], correctLimitationId);
    expect(problem).toContain('save-size limit');
    expect(recordLearningRevision(state, 'project:floods', 'exchange', [1, 2], correctLimitationId)).toBe(state);
    expect(state.learningAnswers).toEqual([]);
    expect(state.learningRevisions).toEqual([]);
    expect(getRevisionProblem(state, 'project:floods', 'exchange', [1, 2], correctLimitationId, { checkCapacity: false })).toBeNull();
  });
});
