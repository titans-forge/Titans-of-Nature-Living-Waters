import { fieldDecisions, type FieldDecisionPlan } from '../data/fieldDecisions';
import type { ExpeditionState, GearSet, Habitat, Venue } from '../types';
import { finishGear, getHabitatBlockReason, getObservationCapacityReason, getVenue, MAX_CAST_ATTEMPTS, selectGear, selectHabitat } from './engine';
import { getRoutedEncounterId } from './interactions';
import { getSeason } from './seasons';

export interface FieldDecisionChoice extends Omit<FieldDecisionPlan, 'seasonal'> {
  gear: GearSet;
  habitat: Habitat;
  expectedEncounterId: string;
  blockReason: string | null;
  selected: boolean;
}

/** A season-qualified ID lets an old UI callback fail safely after travel or a
 * season change, rather than silently applying a different seasonal plan. */
export function getFieldDecision(state: ExpeditionState, venue: Venue) {
  const actualVenue = getVenue(state);
  const definition = fieldDecisions[venue.id];
  if (!definition || !actualVenue || actualVenue.id !== venue.id) return null;
  if (state.seasonId && !actualVenue.seasons.some(season => season.id === state.seasonId)) return null;
  const season = getSeason(actualVenue, state.seasonId);
  const choices: FieldDecisionChoice[] = definition.plans.flatMap(plan => {
    const { seasonal, ...base } = plan;
    const resolved = { ...base, ...seasonal?.[season.id] };
    const gear = actualVenue.gearSets.find(item => item.id === resolved.gearId);
    const habitat = actualVenue.habitats.find(item => item.id === resolved.habitatId);
    if (!gear || !habitat) return [];
    const proposed = { ...state, gearId: gear.id, zoneId: habitat.id };
    const rawEncounterId = actualVenue.encounterRules[`${habitat.id}:${gear.id}`];
    const expectedEncounterId = getRoutedEncounterId(proposed, actualVenue, actualVenue.idealPower[habitat.id]);
    // A plan is an investigation, never a request to manufacture an incident.
    // An unavailable seasonal fish route otherwise silently becomes a snag.
    const routeProblem = !rawEncounterId || !actualVenue.encounters[expectedEncounterId]
      ? 'This plan has no supported investigation route. Choose a custom kit and station.'
      : !season.availableEncounterIds.includes(rawEncounterId) || rawEncounterId !== expectedEncounterId
      ? `This investigation is not available in ${season.name}. Choose the other plan or a custom kit and station.`
      : actualVenue.encounters[expectedEncounterId].interaction
      ? 'An incidental encounter is a response exercise, not an investigation to seek. Choose another plan.'
      : null;
    const stageProblem = state.stage !== 'habitat' || state.encounterId !== null || state.castPower !== null
      ? 'Choose an investigation before starting the encounter.'
      : state.castAttempts >= MAX_CAST_ATTEMPTS
      ? 'This trip has no attempts remaining. Return to the landing before a new investigation.'
      : getObservationCapacityReason(state);
    return [{ ...resolved, id: `${actualVenue.id}:${season.id}:${plan.id}`, gear, habitat, expectedEncounterId,
      blockReason: stageProblem ?? getHabitatBlockReason(proposed, habitat.id) ?? routeProblem,
      selected: state.gearId === gear.id && state.zoneId === habitat.id }];
  });
  return { question: definition.question, season, choices };
}

export function applyFieldDecision(state: ExpeditionState, venue: Venue, choiceId: string): ExpeditionState {
  const choice = getFieldDecision(state, venue)?.choices.find(item => item.id === choiceId);
  if (!choice || choice.blockReason || choice.selected) return state;
  // Selectors run as one state update. The user never enters a partially changed
  // setup and no cast, catch, question answer or reward is produced here.
  const changed = selectHabitat(finishGear(selectGear({ ...state, stage: 'gear' }, choice.gearId)), choice.habitatId);
  if (changed.stage !== 'habitat' || changed.gearId !== choice.gearId || changed.zoneId !== choice.habitatId) return state;
  // Only setup fields belong to this decision. Keep all recorded answers,
  // mistakes, attempt counts, assignments, scores and encounter history literal.
  return { ...state, gearId: changed.gearId, zoneId: changed.zoneId };
}
