import { describe, expect, it } from 'vitest';
import {
  advanceAssistedInteraction, advanceInteraction, askQuestion, beginQuestions, castLine,
  chooseSnagApproach, createInitialState, finishGear, finishQuestions, getCurrentEncounter,
  getPressureFeedback, getRecommendedEngagement, getVenue, handleEncounter, hasLostFish,
  revealEncounter, retryFish, selectGear, selectHabitat, selectVenue,
} from '../src/game/engine';
import {
  advanceInteractionAudio, createInteractionAudioTrace, getInteractionSoundPlan, getSafeHandlingSound,
  INTERACTION_SOUND_MASTER_GAIN, PRESSURE_SOUND_COOLDOWN_MS, TIMED_SOUND_GAP_MS,
  type InteractionAudioTrace, type InteractionSound, type InteractionSoundEvent,
} from '../src/game/interactionAudio';
import { getInteractionKind, needsSnagApproach } from '../src/game/interactions';
import { venues } from '../src/data/venues';
import type { ExpeditionState, InteractionKind } from '../src/types';

function routes() {
  return venues.flatMap(venue => venue.seasons.flatMap((season, seasonIndex) => venue.habitats
    .filter(habitat => habitat.safe !== false).flatMap(habitat => venue.gearSets.map(gear => {
      let prepared = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { [venue.id]: seasonIndex } }, venue.id));
      const informed = venue.informedQuestionByZone[habitat.id];
      prepared = askQuestion(askQuestion(prepared, informed), venue.questions.find(question => question.id !== informed)!.id);
      prepared = selectHabitat(finishGear(selectGear(finishQuestions(prepared), gear.id)), habitat.id);
      return { prepared, state: castLine(prepared, venue.idealPower[habitat.id]) };
    }))));
}
const allRoutes = routes();
function example(kind: InteractionKind) {
  const found = allRoutes.find(({ state }) => getInteractionKind(state, getVenue(state)!) === kind);
  expect(found, `authored ${kind} route`).toBeDefined();
  return found!;
}

function observer(options: { enabled?: boolean; paused?: boolean; resetKey?: number } = {}) {
  let trace: InteractionAudioTrace = createInteractionAudioTrace();
  let now = 0;
  let defaults = { enabled: true, paused: false, resetKey: 0, ...options };
  return {
    step(state: ExpeditionState, change: Partial<typeof defaults> & { gap?: number } = {}) {
      const { gap = 250, ...settings } = change;
      now += gap; defaults = { ...defaults, ...settings };
      const result = advanceInteractionAudio(trace, { state, ...defaults, now });
      trace = result.trace;
      return result.events.map(event => event.type);
    },
  };
}

describe('session-only field action sounds', () => {
  it('is silent on initial load, enabling, disabling and re-enabling a completed encounter', () => {
    const start = example('fish').state;
    const completed = { ...start, lineResolved: true, interactionProgress: 100, lineTurn: 90 };
    const audio = observer({ enabled: false });
    expect(audio.step(start)).toEqual([]);
    expect(audio.step(completed)).toEqual([]);
    expect(audio.step(completed, { enabled: true })).toEqual([]);
    expect(audio.step(completed)).toEqual([]);
    expect(audio.step(completed, { enabled: false })).toEqual([]);
    expect(audio.step(completed, { enabled: true })).toEqual([]);
  });

  it('recognizes the real placement screen transition once and uses a distinct deployment for surveys/incidents', () => {
    for (const kind of ['fish', 'camera', 'telemetry', 'sampling', 'bycatch', 'snag'] as const) {
      const { prepared, state } = example(kind);
      const audio = observer();
      // App has already entered Cast while the placement UI is empty.
      expect(audio.step({ ...prepared, stage: 'cast' })).toEqual([]);
      expect(audio.step(state)).toEqual([kind === 'fish' ? 'cast' : 'deploy']);
      expect(audio.step(state)).toEqual([]);
      expect(audio.step(advanceInteraction(state, getRecommendedEngagement(state)))).not.toContain('cast');
    }
  });

  it('never treats opening a restored cast, method/species changes or destination browsing as a new cast', () => {
    const { prepared, state } = example('fish');
    const changes: ExpeditionState[] = [
      { ...state, encounterId: 'arapaima' }, { ...state, gearId: 'heavy' },
      { ...state, zoneId: 'open' }, { ...state, seasonId: 'falling-water' },
      { ...state, expeditionNumber: state.expeditionNumber + 1 },
      { ...state, castAttempts: state.castAttempts + 1 }, { ...state, stage: 'venue' },
    ];
    for (const changed of changes) {
      const audio = observer(); expect(audio.step(state)).toEqual([]); expect(audio.step(changed)).toEqual([]);
    }
    const audio = observer();
    audio.step({ ...prepared, stage: 'cast' });
    // Importing can have the exact same trip/attempt identity as a local cast.
    expect(audio.step(state, { resetKey: 1 })).toEqual([]);
    expect(audio.step({ ...state, lineResolved: true, lineTurn: 1 }, { resetKey: 2 })).toEqual([]);
    expect(audio.step({ ...state, lineResolved: true, lineTurn: 1 })).toEqual([]);
  });

  it('uses silent baselines for paused transitions, resume and stale timed gaps', () => {
    const state = example('fish').state;
    const audio = observer(); audio.step(state);
    expect(audio.step({ ...state, lineTurn: 1, lineResolved: true }, { paused: true })).toEqual([]);
    expect(audio.step({ ...state, lineTurn: 1, lineResolved: true }, { paused: false })).toEqual([]);
    const gap = observer(); gap.step(state);
    expect(gap.step({ ...state, lineTurn: 1, lineResolved: true }, { gap: TIMED_SOUND_GAP_MS + 1 })).toEqual([]);
    const jump = observer(); jump.step(state);
    expect(jump.step({ ...state, lineTurn: 80, lineResolved: true })).toEqual([]);
    expect(jump.step({ ...state, lineTurn: 80, lineResolved: true })).toEqual([]);
  });

  it('classifies genuine completion once on every authored route without fish fanfare for surveys/incidents', () => {
    expect(allRoutes).toHaveLength(414);
    const completion: Record<InteractionKind, InteractionSound> = {
      fish: 'fish-alongside', camera: 'observation-ready', telemetry: 'observation-ready',
      sampling: 'observation-ready', bycatch: 'incident-stable', snag: 'line-free',
    };
    for (const route of allRoutes) {
      let current = route.state;
      const kind = getInteractionKind(current, getVenue(current)!);
      const audio = observer(); audio.step(current);
      if (needsSnagApproach(current, getVenue(current)!)) {
        current = chooseSnagApproach(current, 'back-out'); audio.step(current);
      }
      const heard: InteractionSound[] = [];
      for (let tick = 0; tick < 300 && !current.lineResolved; tick++) {
        current = advanceInteraction(current, getRecommendedEngagement(current)); heard.push(...audio.step(current));
      }
      expect(current.lineResolved).toBe(true);
      expect(heard, `${current.venueId}/${current.encounterId}`).toEqual([completion[kind]]);
      expect(audio.step(current)).toEqual([]);
      expect(audio.step(revealEncounter(current))).toEqual([]);
    }
  });

  it('allows a deliberate untimed window after reading, while rejecting a save-sized jump', () => {
    let current = { ...example('fish').state, assistMode: true };
    const audio = observer(); audio.step(current);
    const heard: InteractionSound[] = [];
    for (let step = 0; step < 50 && !current.lineResolved; step++) {
      current = advanceAssistedInteraction(current); heard.push(...audio.step(current, { gap: 20000 }));
    }
    expect(current.lineResolved).toBe(true); expect(heard).toEqual(['fish-alongside']);
    const jump = observer(); jump.step({ ...example('fish').state, assistMode: true });
    expect(jump.step({ ...current, lineTurn: 200 }, { gap: 20000 })).toEqual([]);
  });

  it('warns only on a fresh pressure crossing, limits recrossing, and prioritizes an actual line break', () => {
    const initial = example('fish').state;
    const safeMax = getPressureFeedback(initial).safeMax;
    const audio = observer(); let turn = 0;
    const step = (tension: number, gap = 250) => audio.step({ ...initial, lineTurn: turn++, lineTension: tension }, { gap });
    expect(step(safeMax)).toEqual([]);
    expect(step(safeMax + 1)).toEqual(['pressure']);
    for (let tick = 0; tick < 8; tick++) expect(step(safeMax + 2)).toEqual([]);
    expect(step(safeMax)).toEqual([]);
    expect(step(safeMax + 1)).toEqual([]);
    // Spend a full cooldown in an active, controlled state (not a stale gap).
    for (let tick = 0; tick < PRESSURE_SOUND_COOLDOWN_MS / 250; tick++) expect(step(safeMax)).toEqual([]);
    expect(step(safeMax + 1)).toEqual(['pressure']);
    expect(step(100)).toEqual(['line-break']);
    expect(step(100)).toEqual([]);
  });

  it('plays one line-break cue under real continuous holding and stays silent when retry resets the attempt', () => {
    let current = example('fish').state;
    const audio = observer(); audio.step(current);
    const heard: InteractionSound[] = [];
    for (let tick = 0; tick < 300 && !hasLostFish(current); tick++) {
      current = advanceInteraction(current, true); heard.push(...audio.step(current));
    }
    expect(hasLostFish(current)).toBe(true);
    expect(heard.filter(sound => sound === 'line-break')).toHaveLength(1);
    expect(audio.step(current)).toEqual([]);
    expect(audio.step(retryFish(current))).toEqual([]);
  });

  it('uses release water only for a real safe fish/bycatch handling decision and a record cue for other kinds', () => {
    for (const kind of ['fish', 'camera', 'telemetry', 'sampling', 'bycatch', 'snag'] as const) {
      const handling = revealEncounter({ ...example(kind).state, lineResolved: true, interactionProgress: 100 });
      const encounter = getCurrentEncounter(handling)!;
      const safe = encounter.handling.find(option => option.safe)!;
      const unsafe = encounter.handling.find(option => !option.safe)!;
      const audio = observer(); audio.step(handling);
      const done = handleEncounter(handling, safe.id);
      expect(audio.step(done)).toEqual([kind === 'fish' || kind === 'bycatch' ? 'release' : 'care-recorded']);
      expect(audio.step(done)).toEqual([]);
      const incorrect = observer(); incorrect.step(handling);
      expect(incorrect.step(handleEncounter(handling, unsafe.id))).toEqual([]);
      const restored = observer(); restored.step(handling);
      expect(restored.step(done, { resetKey: 1 })).toEqual([]);
      const merelyBrowsing = observer(); merelyBrowsing.step(handling);
      expect(merelyBrowsing.step({ ...handling, stage: 'journal', handlingId: safe.id })).toEqual([]);
    }
  });

  it('records round-goby regulations neutrally instead of inventing a release, including real handling transitions', () => {
    const route = allRoutes.find(({ state }) => state.venueId === 'danube' && state.encounterId === 'round-goby')!;
    expect(route).toBeDefined();
    const handling = revealEncounter({ ...route.state, lineResolved: true, interactionProgress: 100 });
    const safe = getCurrentEncounter(handling)!.handling.find(option => option.safe)!;
    expect(safe.id).toBe('record-regulation');
    expect(safe.result).toContain('without inventing a universal release rule');
    const audio = observer(); audio.step(handling);
    expect(audio.step(handleEncounter(handling, safe.id))).toEqual(['care-recorded']);
  });

  it('does not turn descending-device release, unknown/retained disposition or camera observation into a surface splash', () => {
    const rockfish = allRoutes.find(({ state }) => state.venueId === 'alaska-kelp' && state.encounterId === 'black-rockfish')!;
    expect(rockfish).toBeDefined();
    const handling = revealEncounter({ ...rockfish.state, lineResolved: true, interactionProgress: 100 });
    const safe = getCurrentEncounter(handling)!.handling.find(option => option.safe)!;
    expect(safe.id).toBe('descend-release'); expect(safe.result).toContain('at depth');
    const audio = observer(); audio.step(handling);
    expect(audio.step(handleEncounter(handling, safe.id))).toEqual(['care-recorded']);
    expect(getSafeHandlingSound({ venueId: 'future-water', encounterId: 'legal-harvest',
      handlingId: 'retain-within-rules', kind: 'fish', safe: true })).toBe('care-recorded');
    expect(getSafeHandlingSound({ venueId: 'amazon', encounterId: 'peacock-bass',
      handlingId: 'new-safe-choice', kind: 'fish', safe: true })).toBe('care-recorded');
    // Even a familiar animal/release ID cannot override the current method.
    expect(getSafeHandlingSound({ venueId: 'amazon', encounterId: 'peacock-bass',
      handlingId: 'steady-release', kind: 'camera', safe: true })).toBe('care-recorded');
    expect(getSafeHandlingSound({ venueId: 'amazon', encounterId: 'peacock-bass',
      handlingId: 'steady-release', kind: 'fish', safe: false })).toBeNull();
  });

  it('matches reviewed safe disposition on every authored route, keeping surveys and incidents contextual', () => {
    for (const { state } of allRoutes) {
      const handling = revealEncounter({ ...state, lineResolved: true, interactionProgress: 100 });
      const kind = getInteractionKind(handling, getVenue(handling)!);
      const safe = getCurrentEncounter(handling)!.handling.find(option => option.safe)!;
      const audio = observer(); audio.step(handling);
      const surfaceRelease = (kind === 'fish' || kind === 'bycatch')
        && !(state.venueId === 'danube' && state.encounterId === 'round-goby')
        && !(state.venueId === 'alaska-kelp' && state.encounterId === 'black-rockfish');
      expect(audio.step(handleEncounter(handling, safe.id)), `${state.venueId}/${state.encounterId}/${kind}`)
        .toEqual([surfaceRelease ? 'release' : 'care-recorded']);
    }
  });

  it('keeps every procedural gesture short, varied and bounded with no loops or media dependencies', () => {
    const types: InteractionSound[] = [
      'cast', 'deploy', 'pressure', 'line-break', 'fish-alongside', 'observation-ready',
      'incident-stable', 'line-free', 'release', 'care-recorded',
    ];
    expect(INTERACTION_SOUND_MASTER_GAIN).toBeLessThanOrEqual(.35);
    for (const type of types) {
      for (const kind of ['fish', 'camera', 'bycatch', 'snag', 'telemetry', 'sampling'] as const) {
        const event: InteractionSoundEvent = { type, kind, variant: 0 };
        const plan = getInteractionSoundPlan(event);
        expect(plan.length).toBeGreaterThan(0); expect(plan.length).toBeLessThanOrEqual(3);
        expect(getInteractionSoundPlan({ ...event, variant: 1 })).not.toEqual(plan);
        let combinedPeak = 0;
        for (const segment of plan) {
          expect(segment.duration).toBeGreaterThan(segment.attack);
          expect(segment.delay).toBeGreaterThanOrEqual(0);
          expect(segment.delay + segment.duration).toBeLessThanOrEqual(1);
          expect(segment.gain).toBeGreaterThan(0); expect(segment.gain).toBeLessThanOrEqual(.2);
          expect(segment.frequency).toBeGreaterThan(0); expect(segment.endFrequency).toBeGreaterThan(0);
          combinedPeak += segment.gain;
        }
        expect(combinedPeak * INTERACTION_SOUND_MASTER_GAIN).toBeLessThan(.13);
      }
    }
  });
});
