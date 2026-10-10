import { describe, expect, it } from 'vitest';
import { beginCoachingWatch, observeControlProgress } from '../src/game/controlCoaching';

describe('session control coaching', () => {
  it('offers help after sustained lack of progress and repeated misses, including coalesced ticks', () => {
    const start = { lineTurn: 10, interactionProgress: 20, interactionMistakes: 4 };
    let watch = beginCoachingWatch(start);
    const sample = { lineTurn: 40, interactionProgress: 20, interactionMistakes: 6 };
    const first = observeControlProgress(watch, sample); watch = first.watch;
    expect(first.offer).toBe(false);
    expect(observeControlProgress(watch, { ...sample, lineTurn: 58 }).offer).toBe(true);
    expect(start).toEqual({ lineTurn: 10, interactionProgress: 20, interactionMistakes: 4 });
  });
  it('does not treat ordinary waiting without mistakes as a stalled player', () => {
    const start = { lineTurn: 0, interactionProgress: 0, interactionMistakes: 0 };
    expect(observeControlProgress(beginCoachingWatch(start), { ...start, lineTurn: 100 }).offer).toBe(false);
  });
  it('resets the window when productive control resumes instead of counting a whole catch as a stall', () => {
    const start = { lineTurn: 0, interactionProgress: 0, interactionMistakes: 0 };
    const stalled = observeControlProgress(beginCoachingWatch(start), { ...start, lineTurn: 45, interactionMistakes: 3 }).watch;
    const resumed = observeControlProgress(stalled, { lineTurn: 46, interactionProgress: 2, interactionMistakes: 3 });
    expect(resumed.watch.stalledTicks).toBe(0); expect(resumed.offer).toBe(false);
    expect(observeControlProgress(resumed.watch, { lineTurn: 70, interactionProgress: 2, interactionMistakes: 4 }).offer).toBe(false);
  });
  it('ignores repeated renders and safely rebases a new encounter clock', () => {
    const start = { lineTurn: 80, interactionProgress: 30, interactionMistakes: 5 };
    const watch = beginCoachingWatch(start);
    expect(observeControlProgress(watch, start).watch.stalledTicks).toBe(0);
    expect(observeControlProgress(watch, { lineTurn: 0, interactionProgress: 0, interactionMistakes: 0 }).offer).toBe(false);
  });
});
