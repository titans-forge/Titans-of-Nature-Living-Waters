import { venueById, venues } from '../../src/data/venues';
import { getPilotSpecies } from '../../src/game/angling';
import { advanceInteraction, askQuestion, beginQuestions, castLine, createInitialState, finishGear, finishQuestions,
  getRecommendedEngagement, selectGear, selectHabitat, selectVenue, setRodSide } from '../../src/game/engine';
import { getRecommendedFishingInput, getSkillFishingCue } from '../../src/game/skillFishing';
import type { ExpeditionState } from '../../src/types';

/** Retained rules fixture for tests of existing classic/v1 behavior. New native
 * casts are exercised separately over the entire route matrix in skill-fishing. */
export function legacyCastLine(state: ExpeditionState, power = 50): ExpeditionState {
  const next = castLine(state, power);
  if (next === state || next.anglingRules !== 'habitat-v2') return next;
  const venue = venueById[next.venueId!];
  return { ...next, anglingRules: getPilotSpecies(next, venue) ? 'habitat-v1' : 'classic', anglingBeat: 0, rodSide: 'center' };
}
export function advanceRecommendedInteraction(state: ExpeditionState): ExpeditionState {
  const venue = venueById[state.venueId!];
  if (!venue || !getSkillFishingCue(state, venue)) return advanceInteraction(state, getRecommendedEngagement(state));
  const input = getRecommendedFishingInput(state, venue);
  return advanceInteraction(setRodSide(state, input.rodSide), input.engaged);
}
export function nativeRoutes() {
  return venues.flatMap(venue => venue.seasons.flatMap((season, seasonIndex) => venue.habitats.filter(h => h.safe !== false).flatMap(habitat => venue.gearSets.map(gear => {
    let prepared = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { [venue.id]: seasonIndex } }, venue.id));
    const informed = venue.informedQuestionByZone[habitat.id];
    prepared = finishQuestions(askQuestion(askQuestion(prepared, informed), venue.questions.find(q => q.id !== informed)!.id));
    prepared = selectHabitat(finishGear(selectGear(prepared, gear.id)), habitat.id);
    const state = castLine(prepared, venue.idealPower[habitat.id]);
    return { name: `${venue.id}/${season.id}/${habitat.id}/${gear.id}`, venue, habitat, gear, prepared, state };
  }))));
}
