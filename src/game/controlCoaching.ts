/** Session-only coaching. This never advances a field interaction or enters a save. */
export interface CoachingSample { lineTurn: number; interactionProgress: number; interactionMistakes: number }
export interface CoachingWatch { last: CoachingSample; stalledTicks: number; mistakesAtProgress: number }
export const COACHING_STALL_TICKS = 48;
export function beginCoachingWatch(sample: CoachingSample): CoachingWatch {
  return { last: { ...sample }, stalledTicks: 0, mistakesAtProgress: sample.interactionMistakes };
}
export function observeControlProgress(watch: CoachingWatch, sample: CoachingSample): { watch: CoachingWatch; offer: boolean } {
  if (sample.lineTurn < watch.last.lineTurn || sample.interactionMistakes < watch.mistakesAtProgress) {
    return { watch: beginCoachingWatch(sample), offer: false };
  }
  const advanced = Math.max(0, sample.lineTurn - watch.last.lineTurn);
  const progress = sample.interactionProgress > watch.last.interactionProgress;
  const next: CoachingWatch = { last: { ...sample }, stalledTicks: progress ? 0 : watch.stalledTicks + advanced,
    mistakesAtProgress: progress ? sample.interactionMistakes : watch.mistakesAtProgress };
  return { watch: next, offer: next.stalledTicks >= COACHING_STALL_TICKS && sample.interactionMistakes - next.mistakesAtProgress >= 2 };
}
