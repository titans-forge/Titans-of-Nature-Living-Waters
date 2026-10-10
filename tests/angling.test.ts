import { describe, expect, it } from 'vitest';
import { venues, venueById } from '../src/data/venues';
import { getAnglingWindow, getAnglingPose } from '../src/game/angling';
import { advanceAssistedInteraction, advanceInteraction, askQuestion, beginQuestions, castLine, createInitialState,
  finishGear, finishQuestions, getRecommendedEngagement, hasLostFish, retryFish, selectGear, selectHabitat, selectVenue } from '../src/game/engine';
import { parseExpedition, serializeExpedition } from '../src/game/save';
import type { ExpeditionState } from '../src/types';

function pilotRoutes() {
  const result: ExpeditionState[] = [];
  for (const venue of venues.filter(v => ['amazon', 'florida-bay'].includes(v.id))) for (let season = 0; season < venue.seasons.length; season++) {
    for (const gear of venue.gearSets) for (const habitat of venue.habitats) {
      let s = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { [venue.id]: season } }, venue.id));
      s = finishQuestions(askQuestion(askQuestion(s, venue.questions[0].id), venue.questions[1].id));
      s = castLine(selectHabitat(finishGear(selectGear(s, gear.id)), habitat.id), venue.idealPower[habitat.id]);
      if (s.anglingRules === 'habitat-v1') result.push(s);
    }
  }
  return result;
}
function windowFor(s: ExpeditionState) { return getAnglingWindow(s, venueById[s.venueId!])!; }
function resolve(s: ExpeditionState, assisted = false) {
  for (let i = 0; i < 400 && !s.lineResolved; i++) s = assisted ? advanceAssistedInteraction(s) : advanceInteraction(s, getRecommendedEngagement(s));
  return s;
}

describe('habitat angling pilot', () => {
  it('completes every eligible native route with visible taught windows and valid saves', () => {
    const routes = pilotRoutes();
    expect(new Set(routes.map(s => s.encounterId))).toEqual(new Set(['peacock-bass', 'common-snook', 'spotted-seatrout']));
    for (const start of routes) {
      let s = start;
      const labels = new Set<string>();
      for (let i = 0; i < 400 && !s.lineResolved; i++) {
        const window = windowFor(s); labels.add(window.id);
        expect(s.fightPhase).toBe(window.engage ? 'rest' : 'run'); expect(s.phaseProgress).toBe(window.elapsed);
        s = advanceInteraction(s, getRecommendedEngagement(s));
        expect(parseExpedition(serializeExpedition(s)).ok).toBe(true);
      }
      expect(s.lineResolved).toBe(true); expect(s.interactionMistakes).toBe(0);
      expect(labels.has('recover')).toBe(true); expect(labels.size).toBeGreaterThanOrEqual(3);
      expect(s.fieldcraft - start.fieldcraft).toBe(5);
    }
  });

  it('advances precisely one untimed window, even when adjacent windows share the same control', () => {
    for (const start of pilotRoutes()) {
      let s = start;
      for (let i = 0; i < 50 && !s.lineResolved; i++) {
        const before = windowFor(s); let timed = s;
        for (let tick = 0; tick < before.remaining && !timed.lineResolved; tick++) timed = advanceInteraction(timed, getRecommendedEngagement(timed));
        const assisted = advanceAssistedInteraction(s);
        expect(assisted).toEqual({ ...timed, castUsedAssistance: true });
        expect(assisted.anglingBeat - s.anglingBeat).toBeLessThanOrEqual(before.remaining);
        if (!assisted.lineResolved) expect(windowFor(assisted).elapsed).toBe(0);
        s = assisted;
      }
      expect(s.lineResolved).toBe(true);
    }
  });

  it('gives a missed guide-away a distance consequence while correctly holding guides toward clear water', () => {
    let start = pilotRoutes().find(s => s.encounterId === 'peacock-bass')!;
    start = advanceAssistedInteraction(start);
    expect(windowFor(start).id).toBe('cover');
    let guided = start, missed = start;
    for (let i = 0; i < 4; i++) { guided = advanceInteraction(guided, true); missed = advanceInteraction(missed, false); }
    expect(guided.interactionProgress).toBeGreaterThan(missed.interactionProgress);
    expect(missed.interactionMistakes).toBeGreaterThan(guided.interactionMistakes);
    const guidePose = getAnglingPose(guided, windowFor(guided));
    const missPose = getAnglingPose(missed, windowFor(missed));
    expect(guidePose.x).toBeLessThan(missPose.x);
  });

  it('cannot finish with continuous holding or without holding, and retries restart the saved beat without erasing mistakes', () => {
    for (const start of pilotRoutes()) {
      let held = start, idle = start;
      for (let i = 0; i < 400 && !hasLostFish(held); i++) held = advanceInteraction(held, true);
      for (let i = 0; i < 400; i++) idle = advanceInteraction(idle, false);
      expect(hasLostFish(held)).toBe(true); expect(idle.lineResolved).toBe(false); expect(idle.interactionProgress).toBe(0);
      const retry = retryFish(held);
      expect(retry.anglingBeat).toBe(0); expect(retry.anglingRules).toBe('habitat-v1');
      expect(retry.interactionMistakes).toBe(held.interactionMistakes); expect(retry.fieldcraft).toBe(start.fieldcraft);
      expect(resolve(retry).lineResolved).toBe(true);
    }
  });

  it('resumes a portable mid-window at exactly its saved clock', () => {
    for (const start of pilotRoutes()) {
      let s = start;
      for (let i = 0; i < 17; i++) s = advanceInteraction(s, getRecommendedEngagement(s));
      const parsed = parseExpedition(serializeExpedition(s)); expect(parsed.ok).toBe(true);
      if (!parsed.ok) continue;
      expect(windowFor(parsed.state)).toEqual(windowFor(s));
      expect(getAnglingPose(parsed.state, windowFor(parsed.state))).toEqual(getAnglingPose(s, windowFor(s)));
      expect(advanceAssistedInteraction(parsed.state)).toEqual(advanceAssistedInteraction(s));
    }
  });

  it('keeps classic encounters on their existing profile and marks only eligible fresh casts', () => {
    const start = pilotRoutes()[0];
    const old = { ...start, anglingRules: 'classic' as const, anglingBeat: 0 };
    expect(getAnglingWindow(old, venueById[old.venueId!])).toBeNull();
    expect(advanceInteraction(old, false).anglingBeat).toBe(0);
    expect(resolve(old).lineResolved).toBe(true);
  });
});
