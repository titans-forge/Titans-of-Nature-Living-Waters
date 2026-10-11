import type { ExpeditionState, RodSide, Venue } from '../types';
import { getInteractionKind } from './interactions';

export type SkillFishingBehavior = 'burst' | 'pelagic' | 'undulatory' | 'bottom' | 'flatfish' | 'steady';
export type SkillWindowId = 'burst' | 'cover' | 'recover' | 'roll' | 'headshake' | 'tidal-surge';
interface SkillBeat {
  id: SkillWindowId; label: string; ticks: number; engage: boolean; gain: number;
  tensionGain: number; instruction: string; advice: string; offset: [number, number];
}
export interface SkillFishingCue extends SkillBeat {
  species: string; behavior: SkillFishingBehavior; index: number; elapsed: number; remaining: number;
  cycle: number; next: SkillBeat; fromOffset: [number, number]; safeMin: number; safeMax: number;
  pressureTarget: number; tensionRelease: number; coverSide: RodSide; requiredRodSide: RodSide;
  needsRodSide: boolean; grace: boolean; actionLabel: string;
}

// Authored play archetypes, not measured fish physiology. Explicit IDs keep a
// changing name or biological description from changing saved fight behavior.
const pelagic = new Set(['common-snook', 'silver-arowana', 'tigerfish', 'coho-salmon', 'baikal-omul', 'hilsa', 'giant-trevally', 'spanish-mackerel']);
const undulatory = new Set(['arapaima', 'giant-snakehead', 'ricefield-snakehead', 'sharptooth-catfish', 'african-catfish', 'mesopotamian-catfish']);
const bottom = new Set(['red-drum', 'kelp-greenling', 'baikal-sturgeon', 'channel-catfish', 'bunni', 'shabout', 'goonch', 'beluga-research', 'common-barbel', 'round-goby', 'black-rockfish', 'yellow-drum']);
const steady = new Set(['three-spot-tilapia', 'trey-riel', 'baikal-grayling', 'bluegill', 'nile-tilapia', 'rohu', 'red-seabream', 'small-yellow-croaker']);
export function getSkillFishingBehavior(encounterId: string): SkillFishingBehavior {
  return encounterId === 'pacific-halibut' ? 'flatfish' : pelagic.has(encounterId) ? 'pelagic'
    : undulatory.has(encounterId) ? 'undulatory' : bottom.has(encounterId) ? 'bottom' : steady.has(encounterId) ? 'steady' : 'burst';
}
const bands: Record<SkillFishingBehavior, { safeMin: number; safeMax: number; tensionGain: number; gain: number }> = {
  burst: { safeMin: 24, safeMax: 80, tensionGain: 4, gain: 1.55 },
  pelagic: { safeMin: 26, safeMax: 80, tensionGain: 4.5, gain: 1.65 },
  undulatory: { safeMin: 28, safeMax: 84, tensionGain: 3.5, gain: 1.5 },
  bottom: { safeMin: 28, safeMax: 86, tensionGain: 3, gain: 1.45 },
  flatfish: { safeMin: 26, safeMax: 86, tensionGain: 3, gain: 1.4 },
  steady: { safeMin: 22, safeMax: 84, tensionGain: 3.5, gain: 1.5 },
};
export function supportsSkillFishing(state: ExpeditionState, venue: Venue): boolean {
  return state.anglingRules === 'habitat-v2' && venue.id === state.venueId && Boolean(state.encounterId)
    && getInteractionKind(state, venue) === 'fish'
    && venue.gearSets.find(gear => gear.id === state.gearId)?.method === 'angling';
}
export function getSkillFishingCue(state: ExpeditionState, venue: Venue): SkillFishingCue | null {
  if (!supportsSkillFishing(state, venue)) return null;
  const species = state.encounterId!; const behavior = getSkillFishingBehavior(species); const band = bands[behavior];
  const coverSide = venue.habitats.find(habitat => habitat.id === state.zoneId)?.position ?? 'center';
  const requiredRodSide: RodSide = coverSide === 'left' ? 'right' : coverSide === 'right' ? 'left' : 'center';
  const recovery = (ticks: number): SkillBeat => ({ id: 'recover', label: 'Measured recovery', ticks, engage: true, gain: band.gain,
    tensionGain: band.tensionGain, instruction: 'Pulse to recover line; release before pressure reaches the red band',
    advice: 'Recover line while pressure is controlled. Releasing to ease pressure is part of a clean recovery.', offset: [0, 0] });
  const runId = behavior === 'pelagic' ? 'tidal-surge' : 'burst';
  const run: SkillBeat = { id: runId, label: behavior === 'bottom' || behavior === 'flatfish' ? 'Deep pull' : runId === 'tidal-surge' ? 'Current-assisted surge' : 'Open-water burst',
    ticks: behavior === 'bottom' || behavior === 'undulatory' ? 16 : 12, engage: false, gain: 0, tensionGain: band.tensionGain + 3,
    instruction: 'Release through the surge', advice: 'Give line through the surge; winding against it raises pressure without recovering distance.', offset: [12, behavior === 'bottom' || behavior === 'flatfish' ? 7 : -7] };
  const cover: SkillBeat = { id: 'cover', label: coverSide === 'center' ? 'Cross-current turn' : 'Turn from cover', ticks: 12, engage: true, gain: .6,
    tensionGain: band.tensionGain + 1, instruction: coverSide === 'center' ? 'Keep controlled contact through the turn'
      : `Select rod ${requiredRodSide}; pulse away from ${coverSide} cover`,
    advice: coverSide === 'center' ? 'This open station needs pressure control, with no sideways rod command.'
      : `The fish approaches structure on the ${coverSide}. Latch the rod ${requiredRodSide} once, then pulse while pressure stays controlled.`, offset: [coverSide === 'left' ? -9 : coverSide === 'right' ? 9 : 3, 2] };
  const interruption: SkillBeat = { id: behavior === 'undulatory' ? 'roll' : 'headshake', label: behavior === 'undulatory' ? 'Surface roll' : 'Headshake', ticks: 12,
    engage: false, gain: 0, tensionGain: band.tensionGain + 4, instruction: 'Release while the fish turns',
    advice: 'Ease the pressure through this change of direction, then return to measured recovery.', offset: [3, -2] };
  const pattern = [run, cover, recovery(24), interruption, recovery(24)];
  const total = pattern.reduce((sum, beat) => sum + beat.ticks, 0); const clock = state.anglingBeat % total;
  let start = 0;
  for (let index = 0; index < pattern.length; index++) {
    const beat = pattern[index];
    if (clock < start + beat.ticks) {
      const elapsed = clock - start; const needsRodSide = beat.id === 'cover' && coverSide !== 'center';
      const pressureTarget = (band.safeMin + band.safeMax) / 2;
      const actionLabel = !beat.engage ? beat.instruction
        : state.lineTension >= band.safeMax - 12 ? 'Release to ease pressure'
          : state.lineTension <= band.safeMin + 18 ? 'Hold to recover line' : 'Pulse reel within controlled pressure';
      return { ...beat, ...band, tensionGain: beat.tensionGain, gain: beat.gain, tensionRelease: 4,
        species, behavior, index, elapsed, remaining: start + beat.ticks - clock, cycle: Math.floor(state.anglingBeat / total),
        next: pattern[(index + 1) % pattern.length], fromOffset: pattern[(index + pattern.length - 1) % pattern.length].offset,
        coverSide, requiredRodSide: needsRodSide ? requiredRodSide : 'center', needsRodSide, grace: elapsed < 3, pressureTarget,
        actionLabel };
    }
    start += beat.ticks;
  }
  return null;
}
/** An untimed aid selects side and reel input again for EACH 250 ms tick. */
export function getRecommendedFishingInput(state: ExpeditionState, venue: Venue): { engaged: boolean; rodSide: RodSide } {
  const cue = getSkillFishingCue(state, venue);
  return cue ? { engaged: cue.engage && state.lineTension < cue.pressureTarget, rodSide: cue.needsRodSide ? cue.requiredRodSide : 'center' }
    : { engaged: state.fightPhase === 'rest', rodSide: 'center' };
}
