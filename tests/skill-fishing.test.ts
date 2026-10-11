import { describe, expect, it } from 'vitest';
import { venueById } from '../src/data/venues';
import { advanceAssistedInteraction, advanceInteraction, castLine, chooseSnagApproach, continueExpedition,
  getCurrentEncounter, handleEncounter, hasLostFish, manageLine, revealEncounter, retryFish, setRodSide } from '../src/game/engine';
import { getSkillFishingCue, getRecommendedFishingInput } from '../src/game/skillFishing';
import { getInteractionKind, needsSnagApproach } from '../src/game/interactions';
import { parseExpedition, serializeExpedition, validateExpedition } from '../src/game/save';
import { nativeRoutes, advanceRecommendedInteraction } from './helpers/fishing';
import type { ExpeditionState } from '../src/types';

const routes = nativeRoutes();
const fishRoutes = routes.filter(route => route.state.anglingRules === 'habitat-v2');
type Policy = 'aware' | 'wide-pulse' | 'delayed' | 'fixed-pulse' | 'old-cue' | 'always-hold' | 'never-reel';
function play(start: ExpeditionState, policy: Policy = 'aware') {
  const venue = venueById[start.venueId!]; let state = start;
  const inputs: ReturnType<typeof getRecommendedFishingInput>[] = [];
  let held = false;
  for (let tick = 0; tick < 400 && !state.lineResolved && !hasLostFish(state); tick++) {
    let input = getRecommendedFishingInput(state, venue); const cue = getSkillFishingCue(state, venue)!;
    // Two ticks = 500 ms, applied to both pressure decisions and newly seen
    // rod directions. The opening instruction is visible before Start.
    if (policy === 'delayed') { inputs.push(input); input = inputs[Math.max(0, inputs.length - 3)]; }
    if (policy === 'wide-pulse') {
      if (!cue.engage) held = false;
      else if (state.lineTension <= cue.safeMin + 18) held = true;
      else if (state.lineTension >= cue.safeMax - 12) held = false;
      input.engaged = held;
    }
    if (policy === 'fixed-pulse') input.engaged = cue.engage && tick % 4 < 2;
    if (policy === 'old-cue') input.engaged = cue.engage;
    if (policy === 'always-hold') input.engaged = true;
    if (policy === 'never-reel') input.engaged = false;
    state = advanceInteraction(setRodSide(state, input.rodSide), input.engaged);
  }
  return state;
}

describe('all-water pressure and rod-angle fishing', () => {
  it('covers all 414 safe native routes, enabling only the 200 genuine angling fish routes in 14 waters', () => {
    expect(routes).toHaveLength(414); expect(fishRoutes).toHaveLength(200);
    expect(new Set(fishRoutes.map(route => route.venue.id)).size).toBe(14);
    expect(new Set(fishRoutes.map(route => route.state.encounterId)).size).toBe(45);
    for (const route of routes) {
      const fish = getInteractionKind(route.state, route.venue) === 'fish';
      expect(route.state.anglingRules, route.name).toBe(fish ? 'habitat-v2' : 'classic');
      expect(Boolean(getSkillFishingCue(route.state, route.venue)), route.name).toBe(fish);
      expect(validateExpedition(route.state), route.name).toBe(true);
      if (!fish) {
        let state = needsSnagApproach(route.state, route.venue) ? chooseSnagApproach(route.state, 'back-out') : route.state;
        for (let tick = 0; tick < 300 && !state.lineResolved; tick++) state = advanceRecommendedInteraction(state);
        expect(state.lineResolved, route.name).toBe(true); expect(state.interactionMistakes, route.name).toBe(0);
        expect(state.fishDistance, route.name).toBe(0); expect(state.anglingBeat, route.name).toBe(0);
        expect(validateExpedition(state), route.name).toBe(true);
      }
    }
  });

  it('lands every fish cleanly in 35–70 seconds with a fixed pressure band and round-trippable state at every tick', () => {
    for (const route of fishRoutes) {
      let state = route.state; const first = getSkillFishingCue(state, route.venue)!;
      const windows = new Set<string>();
      for (let tick = 0; tick < 280 && !state.lineResolved; tick++) {
        const cue = getSkillFishingCue(state, route.venue)!; windows.add(cue.id);
        expect([cue.safeMin, cue.safeMax], route.name).toEqual([first.safeMin, first.safeMax]);
        expect(cue.ticks, route.name).toBeGreaterThanOrEqual(12); expect(cue.ticks, route.name).toBeLessThanOrEqual(24);
        expect(state.fightPhase, route.name).toBe(cue.engage ? 'rest' : 'run');
        expect(state.phaseProgress, route.name).toBe(cue.elapsed);
        state = advanceRecommendedInteraction(state);
        expect(parseExpedition(serializeExpedition(state)), route.name).toMatchObject({ ok: true, migrated: false, state });
      }
      expect(state.lineResolved, route.name).toBe(true); expect(hasLostFish(state), route.name).toBe(false);
      expect(state.interactionMistakes, route.name).toBe(0);
      expect(state.lineTurn / 4, route.name).toBeGreaterThanOrEqual(35); expect(state.lineTurn / 4, route.name).toBeLessThanOrEqual(70);
      expect(windows.has('cover'), route.name).toBe(true); expect(windows.has('recover'), route.name).toBe(true);
      expect(state.fieldcraft - route.state.fieldcraft, route.name).toBe(5);
    }
  }, 20000);

  it('allows 500 ms human reaction delays without erasing physical load or charging missed recovery releases', () => {
    for (const route of fishRoutes) {
      for (const policy of ['delayed', 'wide-pulse'] as const) {
      const state = play(route.state, policy);
      expect(state.lineResolved, route.name).toBe(true); expect(state.interactionMistakes, route.name).toBe(0);
      expect(state.lineTurn / 4, route.name).toBeGreaterThanOrEqual(35); expect(state.lineTurn / 4, route.name).toBeLessThanOrEqual(70);
      }
    }
    const start = fishRoutes[0].state; let state = start;
    for (let tick = 0; tick < 3; tick++) state = advanceInteraction(state, true);
    expect(state.lineTension).toBeGreaterThan(start.lineTension); expect(state.interactionMistakes).toBe(0);
    expect(advanceInteraction(state, true).interactionMistakes).toBe(1);
    let recovery = start;
    while (getSkillFishingCue(recovery, venueById[recovery.venueId!])!.id !== 'recover') recovery = advanceRecommendedInteraction(recovery);
    const released = advanceInteraction(recovery, false);
    expect(released.lineTension).toBe(recovery.lineTension - 4);
    expect(released.interactionMistakes).toBe(recovery.interactionMistakes);
    expect(released.interactionProgress).toBe(recovery.interactionProgress);
  });

  it('makes pressure-aware decisions outperform fixed pulses and the old always-hold recovery policy on every fish route', () => {
    for (const route of fishRoutes) {
      const skilled = play(route.state);
      for (const policy of ['fixed-pulse', 'old-cue', 'always-hold', 'never-reel'] as const) {
        const naive = play(route.state, policy);
        expect(naive.lineResolved, `${route.name}/${policy}`).toBe(false);
        expect(naive.interactionProgress, `${route.name}/${policy}`).toBeLessThan(skilled.interactionProgress);
        if (policy === 'old-cue' || policy === 'always-hold') expect(hasLostFish(naive), `${route.name}/${policy}`).toBe(true);
        if (policy === 'never-reel') expect(naive.interactionProgress, route.name).toBe(0);
      }
    }
  });

  it('signals the selected habitat cover side, asks for the opposite latched angle, and penalizes a missed turn only after grace', () => {
    for (const route of fishRoutes) {
      let state = route.state;
      while (getSkillFishingCue(state, route.venue)!.id !== 'cover') state = advanceRecommendedInteraction(state);
      const cue = getSkillFishingCue(state, route.venue)!;
      expect(cue.coverSide, route.name).toBe(route.habitat.position);
      expect(cue.requiredRodSide, route.name).toBe(route.habitat.position === 'left' ? 'right' : route.habitat.position === 'right' ? 'left' : 'center');
      expect(cue.needsRodSide, route.name).toBe(route.habitat.position !== 'center');
      if (!cue.needsRodSide) continue;
      const latched = setRodSide(state, cue.requiredRodSide); expect(latched.rodSide).toBe(cue.requiredRodSide);
      let correct = latched, wrong = setRodSide(state, cue.coverSide);
      for (let tick = 0; tick < 6; tick++) {
        correct = advanceInteraction(correct, getRecommendedFishingInput(correct, route.venue).engaged);
        wrong = advanceInteraction(wrong, getRecommendedFishingInput(wrong, route.venue).engaged);
        expect(correct.rodSide, route.name).toBe(cue.requiredRodSide);
      }
      expect(wrong.interactionMistakes, route.name).toBeGreaterThan(correct.interactionMistakes);
      expect(wrong.interactionProgress, route.name).toBeLessThan(correct.interactionProgress);
    }
  });

  it('recomputes both assisted controls for each tick and records aid before any possible completion reward', () => {
    for (const route of fishRoutes) {
      let state = route.state;
      while (!state.lineResolved) {
        const cue = getSkillFishingCue(state, route.venue)!;
        let manual = { ...state, castUsedAssistance: true };
        for (let tick = 0; tick < cue.remaining && !manual.lineResolved; tick++) manual = advanceRecommendedInteraction(manual);
        const assisted = advanceAssistedInteraction(state);
        expect(assisted, route.name).toEqual(manual); expect(assisted.castUsedAssistance, route.name).toBe(true);
        state = assisted;
      }
      expect(state.interactionMistakes, route.name).toBe(0);
      expect(state.fieldcraft, route.name).toBe(route.state.fieldcraft);
      const recorded = handleEncounter(revealEncounter(state), getCurrentEncounter(state)!.handling.find(option => option.safe)!.id);
      expect(recorded.observations).toHaveLength(1); expect(recorded.observations[0].assisted, route.name).toBe(true);
      const snapshot = structuredClone(recorded.observations);
      expect(continueExpedition(recorded).observations, route.name).toEqual(snapshot);
    }
  });

  it('preserves retry identity, mistakes and assistance; resets the latch and cannot bypass v2 with old line actions', () => {
    const route = fishRoutes.find(route => route.habitat.position !== 'center')!;
    let lost = setRodSide(route.state, 'left'); while (!hasLostFish(lost)) lost = advanceInteraction(lost, true);
    const retried = retryFish(lost);
    expect(retried).toMatchObject({ encounterId: lost.encounterId, castAttempts: lost.castAttempts, castPower: lost.castPower,
      castAccuracy: lost.castAccuracy, interactionMistakes: lost.interactionMistakes, castUsedAssistance: lost.castUsedAssistance,
      fieldcraft: lost.fieldcraft, observations: lost.observations, anglingRules: 'habitat-v2', anglingBeat: 0, rodSide: 'center' });
    expect(validateExpedition(retried)).toBe(true); expect(play(retried).lineResolved).toBe(true);
    const explicit = manageLine(route.state, 'reel'); const timed = advanceInteraction(route.state, true);
    expect(explicit).toEqual({ ...timed, lineActions: ['reel'] });
    const afterNewCast = castLine({ ...route.prepared, rodSide: 'left' }, route.venue.idealPower[route.habitat.id]);
    expect(afterNewCast.rodSide).toBe('center');
  });
});
