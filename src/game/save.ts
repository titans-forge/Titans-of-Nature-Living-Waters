import { venues, venueById } from '../data/venues';
import { getLearningQuestion } from '../data/learning';
import { createInitialState, getRoutedEncounterId } from './engine';
import { getInteractionKind } from './interactions';
import { getAnglingWindow, getPilotSpecies } from './angling';
import { getRevisionProblem } from './research';
import { encodeJourneyEnvelope, journeyByteLength, MAX_FIELD_OBSERVATIONS, MAX_SAVE_BYTES, SAVE_FORMAT, SAVE_VERSION } from './limits';
import type { ExpeditionState, FieldObservation } from '../types';

export { MAX_SAVE_BYTES, SAVE_FORMAT, SAVE_VERSION } from './limits';
export const MAX_OBSERVATIONS = MAX_FIELD_OBSERVATIONS;
export type ParseExpeditionResult = { ok: true; state: ExpeditionState; migrated: boolean; warnings: string[] } | { ok: false; error: string };
type ObjectValue = Record<string, unknown>;
const stages = ['venue', 'arrival', 'questions', 'gear', 'habitat', 'cast', 'handling', 'journal', 'debrief'];
const stateKeys = ['observations', 'learningAnswers', 'learningRevisions', 'expeditionNumber', 'castUsedAssistance', 'version', 'venueId', 'stage', 'askedQuestions', 'gearId', 'zoneId', 'encounterId', 'castPower', 'castAccuracy', 'lineTurn', 'lineTension', 'lineActions', 'anglingRules', 'anglingBeat', 'snagApproach', 'lineQuality', 'lineResolved', 'fishDistance', 'fishMaxDistance', 'fishStamina', 'fightPhase', 'phaseProgress', 'fightMessage', 'interactionProgress', 'interactionMistakes', 'handlingId', 'fieldcraft', 'biology', 'ecology', 'trust', 'journalIds', 'activeAssignmentId', 'completedAssignmentIds', 'debriefChoice', 'seasonId', 'venueVisitCounts', 'experienceMode', 'assistMode', 'castAttempts', 'tripJournalIds', 'tripSafeJournalIds'];
const pilotKeys = ['anglingRules', 'anglingBeat'];
const pilotMigrationWarning = 'Existing encounters keep their original controls; new pilot casts use behavior-specific windows.';
const newKeys = ['observations', 'learningAnswers', 'expeditionNumber', 'castUsedAssistance'];
const legacyObservationKeys = ['id', 'expedition', 'venueId', 'seasonId', 'habitatId', 'gearId', 'encounterId', 'handlingId', 'castAccuracy', 'controlMistakes', 'assisted', 'shared'];
const observationKeys = [...legacyObservationKeys, 'reportingStatus'];
const reportingStatuses = ['full-notes', 'identity-only', 'private-notes', 'pending', 'legacy-unknown'];
const journalIds = new Set(venues.flatMap(v => Object.keys(v.encounters).map(id => `${v.id}:${id}`)));
const own = (value: ObjectValue, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const object = (value: unknown): value is ObjectValue => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const exact = (value: ObjectValue, keys: string[], requireAll = true) => Object.keys(value).every(k => keys.includes(k)) && (!requireAll || keys.every(k => own(value, k)));
const number = (value: unknown, min: number, max: number, integer = true): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
const text = (value: unknown, max = 500): value is string => typeof value === 'string' && value.length <= max;
const strings = (value: unknown, allowed: (id: string) => boolean, max: number, unique = true): value is string[] => Array.isArray(value) && value.length <= max && value.every(id => text(id, 120) && allowed(id)) && (!unique || new Set(value).size === value.length);
const optionalId = (value: unknown, allowed: (id: string) => boolean) => value === null || (text(value, 120) && allowed(value));

function validObservation(value: unknown, legacy = false): value is FieldObservation {
  if (!object(value) || !exact(value, legacy ? legacyObservationKeys : observationKeys)) return false;
  if (!number(value.id, 1, 1000000) || !number(value.expedition, 1, 1000000) || !text(value.venueId, 120)) return false;
  const venue = venueById[value.venueId];
  if (!own(venueById, value.venueId) || !venue || !text(value.encounterId, 120)) return false;
  const encounter = venue.encounters[value.encounterId];
  return Boolean(encounter && venue.seasons.some(s => s.id === value.seasonId && s.availableEncounterIds.includes(value.encounterId as string))
    && venue.habitats.some(h => h.id === value.habitatId && h.safe !== false)
    && venue.gearSets.some(g => g.id === value.gearId)
    && encounter.handling.some(h => h.id === value.handlingId)
    && number(value.castAccuracy, 0, 100, false) && number(value.controlMistakes, 0, 1000000)
    && typeof value.assisted === 'boolean' && typeof value.shared === 'boolean'
    && (legacy || (reportingStatuses.includes(value.reportingStatus as string)
      && value.shared === (value.reportingStatus === 'full-notes'))));
}

function stateError(value: unknown, legacyVersion: 8 | 9 | 10 | 11 | null = null): string | null {
  const expectedKeys = legacyVersion ? stateKeys.filter(key => !pilotKeys.includes(key) && (legacyVersion === 11 || key !== 'learningRevisions') && (legacyVersion >= 10 || key !== 'snagApproach')) : stateKeys;
  if (!object(value) || !exact(value, expectedKeys) || value.version !== (legacyVersion ?? SAVE_VERSION)) return 'The saved state has missing, unknown, or unsupported fields.';
  if (!text(value.stage) || !stages.includes(value.stage) || !optionalId(value.venueId, id => own(venueById, id))) return 'The saved destination or stage is invalid.';
  const venue = typeof value.venueId === 'string' ? venueById[value.venueId] : null;
  if ((value.stage === 'venue') !== (venue === null)) return 'The saved stage does not match its destination.';
  if (!strings(value.askedQuestions, id => Boolean(venue?.questions.some(q => q.id === id)), 2)) return 'The saved local questions are invalid.';
  if (!optionalId(value.gearId, id => Boolean(venue?.gearSets.some(g => g.id === id)))
    || !optionalId(value.zoneId, id => Boolean(venue?.habitats.some(h => h.id === id)))
    || !optionalId(value.encounterId, id => Boolean(venue && own(venue.encounters, id)))
    || !optionalId(value.seasonId, id => Boolean(venue?.seasons.some(s => s.id === id)))) return 'The saved kit, habitat, encounter, or season is unknown.';
  const encounter = venue && typeof value.encounterId === 'string' ? venue.encounters[value.encounterId] : null;
  if (!legacyVersion) {
    if (!['classic', 'habitat-v1'].includes(value.anglingRules as string) || !number(value.anglingBeat, 0, 1000000)) return 'The saved angling rules or behavior counter is invalid.';
    if (value.anglingRules === 'classic' && value.anglingBeat !== 0) return 'Classic encounters cannot contain a pilot behavior counter.';
    if (value.anglingRules === 'habitat-v1') {
      if (!venue || !getPilotSpecies(value as unknown as ExpeditionState, venue) || !['cast', 'handling', 'journal', 'debrief'].includes(value.stage)) return 'The saved pilot rules do not belong to this subject, method, or stage.';
    }
  }
  if (!optionalId(value.handlingId, id => Boolean(encounter?.handling.some(h => h.id === id)))) return 'The saved handling response does not belong to the encounter.';
  if (!optionalId(value.activeAssignmentId, id => Boolean(venue && id.startsWith(`${venue.id}:`) && journalIds.has(id)))) return 'The saved assignment is unknown.';
  if (!strings(value.journalIds, id => journalIds.has(id), journalIds.size)
    || !strings(value.completedAssignmentIds, id => journalIds.has(id), journalIds.size)
    || !strings(value.tripJournalIds, id => Boolean(venue && id.startsWith(`${venue.id}:`) && journalIds.has(id)), 3)
    || !strings(value.tripSafeJournalIds, id => Boolean(venue && id.startsWith(`${venue.id}:`) && journalIds.has(id)), 3)) return 'The saved discovery collections are invalid.';
  if (!value.completedAssignmentIds.every(id => (value.journalIds as string[]).includes(id))
    || !value.tripJournalIds.every(id => (value.journalIds as string[]).includes(id))
    || !value.tripSafeJournalIds.every(id => (value.tripJournalIds as string[]).includes(id))) return 'The saved assignment or handling evidence is missing its discovery.';
  if (!object(value.venueVisitCounts) || !Object.entries(value.venueVisitCounts).every(([id, count]) => own(venueById, id) && number(count, 0, 1000000))) return 'The saved visit counts are invalid.';
  if (!number(value.expeditionNumber, 0, 1000000) || (venue && value.expeditionNumber < 1)) return 'The expedition counter is invalid.';
  if (!['guided', 'field'].includes(value.experienceMode as string) || typeof value.assistMode !== 'boolean' || typeof value.castUsedAssistance !== 'boolean' || typeof value.lineResolved !== 'boolean'
    || !['run', 'rest'].includes(value.fightPhase as string) || ![null, 'full-notes', 'identity-only', 'private-notes'].includes(value.debriefChoice as null)) return 'The saved mode or decision flags are invalid.';
  if ((!legacyVersion || legacyVersion >= 10) && !['unassessed', 'back-out', 'pull-through'].includes(value.snagApproach as string)) return 'The saved snag approach is invalid.';
  for (const key of ['lineTurn', 'lineQuality', 'interactionMistakes']) if (!number(value[key], 0, 1000000)) return 'A saved interaction counter is invalid.';
  if (!number(value.phaseProgress, 0, 1000000) || !number(value.lineTension, 0, 100, false) || !number(value.castAccuracy, 0, 100, false)
    || !number(value.interactionProgress, 0, 100, false) || !number(value.fishDistance, 0, 100) || !number(value.fishMaxDistance, 0, 100) || !number(value.fishStamina, 0, 100)
    || !number(value.castAttempts, 0, 3) || !(value.castPower === null || number(value.castPower, 0, 100, false)) || !text(value.fightMessage, 1000)
    || !strings(value.lineActions, id => ['reel', 'hold', 'give'].includes(id), 100000, false)) return 'The saved interaction values are invalid.';
  for (const key of ['fieldcraft', 'biology', 'ecology', 'trust']) if (!number(value[key], key === 'trust' ? -1000000 : 0, 1000000)) return 'A saved score is outside its supported range.';
  if ((value.lineQuality as number) > (value.lineTurn as number) || (value.interactionMistakes as number) > (value.lineTurn as number) || (value.lineActions as string[]).length > (value.lineTurn as number) || (value.phaseProgress as number) > (value.lineTurn as number)) return 'The interaction counters disagree with the number of recorded turns.';
  if (!legacyVersion && value.anglingRules === 'habitat-v1') {
    const window = getAnglingWindow(value as unknown as ExpeditionState, venue!);
    if ((value.anglingBeat as number) > (value.lineTurn as number) || !window || value.fightPhase !== (window.engage ? 'rest' : 'run') || value.phaseProgress !== window.elapsed) return 'The saved pilot phase does not agree with its behavior clock.';
  }
  if (venue && !value.seasonId) return 'The active expedition has no ecological window.';
  if (['venue', 'arrival', 'questions'].includes(value.stage) && (value.gearId !== null || value.zoneId !== null || value.encounterId !== null || value.handlingId !== null || value.castAttempts !== 0)) return 'The early expedition stage contains a later encounter.';
  if (value.stage === 'arrival' && value.askedQuestions.length !== 0) return 'The arrival stage contains answered local questions.';
  if (['gear', 'habitat', 'cast', 'handling', 'journal', 'debrief'].includes(value.stage) && value.askedQuestions.length !== 2) return 'The expedition is missing its two local questions.';
  if (['habitat', 'cast', 'handling', 'journal', 'debrief'].includes(value.stage) && value.gearId === null) return 'The expedition is missing its selected kit.';
  if (['cast', 'handling', 'journal', 'debrief'].includes(value.stage) && (!value.zoneId || venue?.habitats.find(h => h.id === value.zoneId)?.safe === false)) return 'The encounter requires a safe selected habitat.';
  if (['venue', 'arrival', 'questions', 'gear', 'habitat'].includes(value.stage) && (value.encounterId !== null || value.handlingId !== null)) return 'The saved encounter appears before casting.';
  if (['handling', 'journal', 'debrief'].includes(value.stage) && (!encounter || !value.lineResolved)) return 'The encounter has not resolved before handling.';
  if (['journal', 'debrief'].includes(value.stage) && !value.handlingId) return 'The field record has no handling response.';
  if (!['journal', 'debrief'].includes(value.stage) && value.handlingId !== null) return 'The handling response appears before the field record.';
  if (value.stage !== 'debrief' && value.debriefChoice !== null) return 'The community report appears before the debrief.';
  if (encounter && (value.castPower === null || value.castAttempts < 1)) return 'The encounter has no cast record.';
  if (!encounter && (value.castPower !== null || value.lineResolved)) return 'The cast record has no encounter.';
  if (value.tripJournalIds.length > value.castAttempts) return 'The trip contains more discoveries than casts.';
  if (['journal', 'debrief'].includes(value.stage) && !(value.tripJournalIds as string[]).includes(`${value.venueId}:${value.encounterId}`)) return 'The current encounter is absent from the trip journal.';
  if (!Array.isArray(value.observations) || value.observations.length > MAX_OBSERVATIONS) return 'The observation record exceeds the supported save limit.';
  let lastId = 0; let lastExpedition = 0;
  const expeditionVenues = new Map<number, string>(); const expeditionSeasons = new Map<number, string>(); const expeditionCounts = new Map<number, number>();
  const expeditionReports = new Map<number, string>();
  for (const item of value.observations) {
    if (!validObservation(item, legacyVersion === 8) || item.id <= lastId || item.expedition < lastExpedition || item.expedition > value.expeditionNumber || !(value.journalIds as string[]).includes(`${item.venueId}:${item.encounterId}`)) return 'The saved observation record is invalid or out of order.';
    if (expeditionSeasons.has(item.expedition) && expeditionSeasons.get(item.expedition) !== item.seasonId) return 'An expedition observation uses a different ecological window.';
    if (venue && item.expedition === value.expeditionNumber && (item.venueId !== venue.id || item.seasonId !== value.seasonId || item.shared !== (value.debriefChoice === 'full-notes'))) return 'Current observations disagree with the active expedition or report.';
    if (legacyVersion !== 8) {
      if (venue && item.expedition === value.expeditionNumber && item.reportingStatus !== (value.debriefChoice ?? 'pending')) return 'Current reporting history disagrees with the active expedition or report.';
      if (expeditionReports.has(item.expedition) && expeditionReports.get(item.expedition) !== item.reportingStatus) return 'Observations from one expedition have different reporting choices.';
      expeditionReports.set(item.expedition, item.reportingStatus);
    }
    if (expeditionVenues.has(item.expedition) && expeditionVenues.get(item.expedition) !== item.venueId) return 'An expedition observation uses a different destination.';
    const count = (expeditionCounts.get(item.expedition) ?? 0) + 1;
    if (count > 3) return 'An expedition contains more than three observations.';
    expeditionCounts.set(item.expedition, count); expeditionVenues.set(item.expedition, item.venueId); expeditionSeasons.set(item.expedition, item.seasonId); lastId = item.id; lastExpedition = item.expedition;
  }
  if (venue && (expeditionCounts.get(value.expeditionNumber as number) ?? 0) > (value.castAttempts as number)) return 'The current expedition contains more observations than casts.';
  if (!Array.isArray(value.learningAnswers) || value.learningAnswers.length > venues.length * 2 + 3) return 'The learning record is invalid.';
  const answered = new Set<string>();
  for (const answer of value.learningAnswers) {
    if (!object(answer) || !exact(answer, ['questionId', 'answerId', 'correct']) || !text(answer.questionId, 120) || !text(answer.answerId, 120) || typeof answer.correct !== 'boolean' || answered.has(answer.questionId)) return 'A saved learning answer is malformed or repeated.';
    const question = getLearningQuestion(answer.questionId);
    if (!question || !question.options.some(option => option.id === answer.answerId) || answer.correct !== (answer.answerId === question.correctId)) return 'A saved learning answer does not match the authored question.';
    answered.add(answer.questionId);
  }
  if (!legacyVersion || legacyVersion === 11) {
    if (!Array.isArray(value.learningRevisions) || value.learningRevisions.length > venues.length * 2 + 3) return 'The evidence review record is invalid.';
    const reviewed = new Set<string>();
    for (const review of value.learningRevisions) {
      if (!object(review) || !exact(review, ['questionId', 'answerId', 'correct', 'evidenceIds', 'limitationId'])
        || !text(review.questionId, 120) || !text(review.answerId, 120) || !text(review.limitationId, 120)
        || typeof review.correct !== 'boolean' || reviewed.has(review.questionId) || !answered.has(review.questionId)
        || !Array.isArray(review.evidenceIds) || review.evidenceIds.length < 1 || review.evidenceIds.length > 2
        || !review.evidenceIds.every(id => number(id, 1, 1000000)) || new Set(review.evidenceIds).size !== review.evidenceIds.length) return 'A saved evidence review is malformed or repeated.';
      const question = getLearningQuestion(review.questionId);
      if (!question || review.correct !== (review.answerId === question.correctId)
        || getRevisionProblem(value as unknown as ExpeditionState, review.questionId, review.answerId, review.evidenceIds, review.limitationId, { checkCapacity: false })) return 'A saved evidence review has unknown choices or missing eligible field records.';
      reviewed.add(review.questionId);
    }
  }
  return null;
}

export function validateExpedition(value: unknown): value is ExpeditionState {
  try { return stateError(value) === null && journeyByteLength(value) <= MAX_SAVE_BYTES; } catch { return false; }
}

function completeMigration(state: ExpeditionState, warnings: string[]): ParseExpeditionResult {
  if (journeyByteLength(state) > MAX_SAVE_BYTES) return { ok: false, error: 'This older journey is too close to the 4 MiB limit to add the new save fields. Keep the original file for a compatible version; the current journey was not changed.' };
  return { ok: true, state, migrated: true, warnings };
}

function migrateLegacy(input: ObjectValue): ExpeditionState {
  const version = input.version as number;
  const legacyKeys = stateKeys.filter(key => !newKeys.includes(key) && !pilotKeys.includes(key) && key !== 'snagApproach' && key !== 'learningRevisions');
  if (!exact(input, legacyKeys, false)) throw new Error('The legacy save contains unknown fields. Its original data has been preserved.');
  for (const key of ['stage', 'askedQuestions', 'gearId', 'zoneId', 'encounterId', 'handlingId', 'journalIds', 'fieldcraft', 'biology', 'ecology', 'trust']) if (!own(input, key)) throw new Error('The legacy save is missing essential progress fields.');
  const migrated = { ...createInitialState(), ...input, version: SAVE_VERSION, observations: [], learningAnswers: [], castUsedAssistance: false, anglingRules: 'classic', anglingBeat: 0 } as ExpeditionState;
  if (version <= 2) migrated.venueId = input.stage === 'venue' ? null : 'amazon';
  for (const key of ['journalIds', 'completedAssignmentIds', 'tripJournalIds', 'tripSafeJournalIds'] as const) {
    const raw = migrated[key];
    if (!Array.isArray(raw) || !raw.every(id => text(id, 120))) throw new Error('The legacy discovery list is malformed.');
    migrated[key] = [...new Set(raw.map(id => version <= 2 && !id.includes(':') ? `amazon:${id}` : id))];
  }
  const venue = migrated.venueId ? venueById[migrated.venueId] : null;
  if (migrated.encounterId && migrated.assistMode === true) migrated.castUsedAssistance = true;
  if (venue && !migrated.seasonId) migrated.seasonId = venue.seasons[0].id;
  if (!object(migrated.venueVisitCounts) || !Object.values(migrated.venueVisitCounts).every(count => number(count, 0, 1000000))) throw new Error('The legacy visit counts are malformed.');
  const totalVisits = Object.values(migrated.venueVisitCounts).reduce((sum, count) => sum + count, 0);
  migrated.expeditionNumber = Math.min(1000000, totalVisits + (venue ? 1 : 0));
  if (version < 7) {
    migrated.castAttempts = migrated.encounterId ? 1 : 0;
    if (migrated.encounterId && migrated.castPower === null && venue && migrated.zoneId) migrated.castPower = venue.idealPower[migrated.zoneId] ?? 50;
    if (['journal', 'debrief'].includes(migrated.stage) && venue && migrated.encounterId) {
      const encounter = venue.encounters[migrated.encounterId];
      const handling = encounter?.handling.find(option => option.id === migrated.handlingId);
      if (handling) {
        const id = `${venue.id}:${encounter.id}`;
        migrated.tripJournalIds = [...new Set([...migrated.tripJournalIds, id])];
        if (handling.safe) migrated.tripSafeJournalIds = [...new Set([...migrated.tripSafeJournalIds, id])];
      }
    }
  }
  if (version === 5 && migrated.stage === 'cast') {
    Object.assign(migrated, { stage: 'habitat', encounterId: null, castPower: null, castAttempts: 0, lineActions: [], lineResolved: false, handlingId: null, tripJournalIds: [], tripSafeJournalIds: [] });
  }
  const error = stateError(migrated);
  if (error) throw new Error(error);
  return migrated;
}

function migrateVersion8(input: ObjectValue): ExpeditionState {
  const error = stateError(input, 8);
  if (error) throw new Error(error);
  const observations = (input.observations as Omit<FieldObservation, 'reportingStatus'>[]).map(observation => ({
    ...observation,
    reportingStatus: observation.expedition === input.expeditionNumber && input.venueId !== null
      ? (input.debriefChoice ?? 'pending')
      : observation.shared ? 'full-notes' : 'legacy-unknown',
  }));
  const migrated = { ...input, version: SAVE_VERSION, observations, snagApproach: 'unassessed', learningRevisions: [], anglingRules: 'classic', anglingBeat: 0 } as unknown as ExpeditionState;
  const migratedError = stateError(migrated);
  if (migratedError) throw new Error(migratedError);
  return migrated;
}

/** Older seasonal routes sometimes paired a kit with the wrong subject. Only
 * an unfinished interaction is restarted; completed field evidence is history. */
function normalizePendingLegacyEncounter(state: ExpeditionState): { state: ExpeditionState; warnings: string[] } {
  const venue = state.venueId ? venueById[state.venueId] : null;
  if (!venue || state.stage !== 'cast' || !state.encounterId || state.lineResolved || state.castPower === null) return { state, warnings: [] };
  const encounterId = getRoutedEncounterId(state, venue, state.castPower);
  if (encounterId === state.encounterId) return { state, warnings: [] };
  const physicalFish = getInteractionKind({ ...state, encounterId }, venue) === 'fish';
  const pressureOffset = state.castAccuracy >= 70 ? -6 : state.castAccuracy >= 40 ? 0 : 8;
  const lineTension = Math.max(18, Math.min(90, (venue.initialTension[encounterId] ?? 48) + pressureOffset));
  const distance = physicalFish ? Math.max(6, Math.min(10, Math.round((lineTension - 40) / 10) + 6)) : 0;
  return { state: { ...state, encounterId, lineTension, lineQuality: 0, interactionProgress: 0,
    fishDistance: distance, fishMaxDistance: distance, fishStamina: Math.ceil(distance / 2),
    snagApproach: 'unassessed', fightPhase: 'run', phaseProgress: 0,
    fightMessage: 'This unfinished older encounter has restarted with a subject compatible with your field kit. Start when ready.' },
    warnings: ['The seasonal route for an unfinished older encounter has changed. Its interaction has restarted with the subject on the current route. Your cast attempt, prior mistakes, activity points and completed records are preserved; no new cast points were awarded.'] };
}

export function parseExpedition(raw: string): ParseExpeditionResult {
  try {
    if (typeof raw !== 'string' || raw.length > MAX_SAVE_BYTES || new TextEncoder().encode(raw).byteLength > MAX_SAVE_BYTES) return { ok: false, error: 'The save is larger than the supported 4 MiB limit.' };
    const parsed: unknown = JSON.parse(raw);
    if (!object(parsed)) return { ok: false, error: 'Choose a Living Waters save file.' };
    let data = parsed;
    if (own(parsed, 'format')) {
      if (!exact(parsed, ['format', 'version', 'state']) || parsed.format !== SAVE_FORMAT || !number(parsed.version, 1, SAVE_VERSION) || !object(parsed.state) || parsed.state.version !== parsed.version) return { ok: false, error: 'This save format or version is not supported. The current journey was not changed.' };
      data = parsed.state;
    }
    if (data.version === SAVE_VERSION) {
      const error = stateError(data);
      return error ? { ok: false, error } : journeyByteLength(data) > MAX_SAVE_BYTES ? { ok: false, error: 'This journey exceeds the supported 4 MiB portable-save limit.' } : { ok: true, state: data as unknown as ExpeditionState, migrated: false, warnings: [] };
    }
    if (data.version === 11) {
      const error = stateError(data, 11);
      if (error) return { ok: false, error };
      const state = { ...data, version: SAVE_VERSION, anglingRules: 'classic', anglingBeat: 0 } as unknown as ExpeditionState;
      const migratedError = stateError(state);
      return migratedError ? { ok: false, error: migratedError } : completeMigration(state, ['Updated version 11 to version 12. Your first answers, evidence reviews, field records and decisions are preserved.', pilotMigrationWarning]);
    }
    if (data.version === 10) {
      const error = stateError(data, 10);
      if (error) return { ok: false, error };
      const state = { ...data, version: SAVE_VERSION, learningRevisions: [], anglingRules: 'classic', anglingBeat: 0 } as unknown as ExpeditionState;
      const migratedError = stateError(state);
      return migratedError ? { ok: false, error: migratedError } : completeMigration(state, ['Updated version 10 to version 12. Your first answers, field records and decisions are preserved. Earlier research answers have no selected evidence links; review them to build a supported conclusion.', pilotMigrationWarning]);
    }
    if (data.version === 9) {
      const error = stateError(data, 9);
      if (error) return { ok: false, error };
      const normalized = normalizePendingLegacyEncounter({ ...data, version: SAVE_VERSION, snagApproach: 'unassessed', learningRevisions: [], anglingRules: 'classic', anglingBeat: 0 } as unknown as ExpeditionState);
      const state = normalized.state;
      const migratedError = stateError(state);
      return migratedError ? { ok: false, error: migratedError } : completeMigration(state, ['Updated version 9 to version 12. Your records, first answers and reporting choices are preserved. Earlier research answers have no selected evidence links; any unfinished snag needs a fresh recovery assessment.', pilotMigrationWarning, ...normalized.warnings]);
    }
    if (data.version === 8) {
      const normalized = normalizePendingLegacyEncounter(migrateVersion8(data));
      return completeMigration(normalized.state, ['Updated version 8 reporting history to version 12. Earlier records without full notes are marked as an unknown legacy reporting choice; no past privacy decision was invented. First answers are preserved; evidence reviews begin with new play.', pilotMigrationWarning, ...normalized.warnings]);
    }
    if (!number(data.version, 1, 7)) return { ok: false, error: 'This save version is not supported. Keep the original file for a compatible release.' };
    const normalized = normalizePendingLegacyEncounter(migrateLegacy(data));
    const state = normalized.state;
    return completeMigration(state, [`Updated version ${data.version} progress to version 12. Older saves have no detailed observation or learning-answer history; those records begin with new play.`, pilotMigrationWarning, ...normalized.warnings, ...(data.version === 5 && data.stage === 'cast' ? ['The older casting interaction resumes at habitat selection.'] : [])]);
  } catch (error) {
    return { ok: false, error: error instanceof SyntaxError ? 'The file is not valid JSON. Your current journey was not changed.' : error instanceof Error ? error.message : 'The save could not be read safely.' };
  }
}

export function serializeExpedition(state: ExpeditionState): string {
  const error = stateError(state);
  if (error) throw new Error(error);
  const raw = encodeJourneyEnvelope(state);
  if (new TextEncoder().encode(raw).byteLength > MAX_SAVE_BYTES) throw new Error('The observation record exceeds the supported 4 MiB save limit.');
  return raw;
}
