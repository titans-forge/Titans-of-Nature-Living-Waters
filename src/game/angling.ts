import type { ExpeditionState, Venue } from '../types';

export type PilotSpecies = 'peacock-bass' | 'common-snook' | 'spotted-seatrout';
type BeatKind = 'burst' | 'cover' | 'recover' | 'roll' | 'headshake' | 'tidal-surge';
interface Beat {
  id: BeatKind; label: string; ticks: number; engage: boolean;
  gain: number; tensionGain: number; safeMax: number;
  instruction: string; advice: string; miss: string; offset: [number, number];
}
export interface AnglingWindow extends Beat {
  species: PilotSpecies; index: number; elapsed: number; remaining: number;
  cycle: number; next: Beat; fromOffset: [number, number];
}

export function getPilotSpecies(state: Pick<ExpeditionState, 'venueId' | 'encounterId' | 'gearId'>, venue: Venue): PilotSpecies | null {
  if (venue.id !== state.venueId || venue.gearSets.find(gear => gear.id === state.gearId)?.method !== 'angling') return null;
  if (venue.id === 'amazon' && state.encounterId === 'peacock-bass') return 'peacock-bass';
  if (venue.id === 'florida-bay' && (state.encounterId === 'common-snook' || state.encounterId === 'spotted-seatrout')) return state.encounterId;
  return null;
}

const recover = (ticks: number): Beat => ({ id: 'recover', label: 'Measured recovery', ticks, engage: true,
  gain: 2, tensionGain: 3, safeMax: 82, instruction: 'Hold to recover line',
  advice: 'The fish is in clear water. Hold for measured recovery; the crew keeps the rod loaded without forcing it.',
  miss: 'The recovery window passes and the fish regains a little distance.', offset: [0, 0] });
const burst = (ticks: number): Beat => ({ id: 'burst', label: 'Open-water burst', ticks, engage: false,
  gain: 0, tensionGain: 6, safeMax: 80, instruction: 'Release through the burst',
  advice: 'The fish accelerates into open water. Release the control while the crew gives line through the drag.',
  miss: 'Reeling against the burst loads the line and gives back distance.', offset: [12, -7] });
const cover = (ticks: number): Beat => ({ id: 'cover', label: 'Turn from cover', ticks, engage: true,
  gain: 1, tensionGain: 4, safeMax: 76, instruction: 'Hold to guide away from cover',
  advice: 'The fish turns toward structure. Hold for a crew-assisted change of rod angle, with modest progress toward clear water.',
  miss: 'Without guiding contact the fish gains room toward cover.', offset: [-9, 2] });
const roll: Beat = { id: 'roll', label: 'Surface roll', ticks: 6, engage: false,
  gain: 0, tensionGain: 7, safeMax: 74, instruction: 'Release during the roll',
  advice: 'A surface roll interrupts recovery. Release while the crew eases pressure, then read the next window.',
  miss: 'Holding through the roll adds pressure without recovering line.', offset: [3, -2] };
const headshake: Beat = { ...roll, id: 'headshake', label: 'Headshake', instruction: 'Release during the headshake',
  advice: 'The fish shakes beside the grass edge. Release while the crew cushions the movement; recovery resumes when it settles.',
  miss: 'Holding through the headshake strains the connection.', offset: [4, 1] };
const tidalSurge = (ticks: number): Beat => ({ ...burst(ticks), id: 'tidal-surge', label: 'Current-assisted surge',
  instruction: 'Release through the tidal surge', advice: 'The fish takes line along the current seam. Release and let the crew manage the drag before guiding it back.', offset: [10, 6] });

/** Authored game windows, not measured fish physiology or real handling advice.
 * Season adjustments are explicit IDs, not inferred from prose. The persisted
 * per-cast beat is the sole clock; phase fields are compatibility outputs. */
export function getAnglingWindow(state: ExpeditionState, venue: Venue): AnglingWindow | null {
  const species = getPilotSpecies(state, venue);
  if (state.anglingRules !== 'habitat-v1' || !species) return null;
  const precise = state.castAccuracy >= 70;
  const pattern: Beat[] = species === 'peacock-bass'
    ? [burst(state.seasonId === 'falling-water' ? 10 : 8), cover(precise ? 8 : 10), recover(10), roll, recover(8)]
    : species === 'common-snook'
      ? [burst(state.seasonId === 'spring-exchange' ? 11 : 9), cover(precise ? 7 : 9), tidalSurge(state.seasonId === 'spring-exchange' ? 11 : 9), recover(12), cover(5)]
      : [burst(6), recover(state.seasonId === 'dry-salinity' ? 11 : 9), headshake, recover(11)];
  const total = pattern.reduce((sum, beat) => sum + beat.ticks, 0);
  const clock = state.anglingBeat % total;
  let start = 0;
  for (let index = 0; index < pattern.length; index++) {
    const beat = pattern[index];
    if (clock < start + beat.ticks) return { ...beat, species, index, elapsed: clock - start,
      remaining: start + beat.ticks - clock, cycle: Math.floor(state.anglingBeat / total),
      next: pattern[(index + 1) % pattern.length], fromOffset: pattern[(index + pattern.length - 1) % pattern.length].offset };
    start += beat.ticks;
  }
  return null;
}

export function getAnglingCue(window: { remaining: number; next: { label: string; instruction: string } }): string | null {
  return window.remaining <= 3 ? `Next: ${window.next.label.toLowerCase()} — ${window.next.instruction.toLowerCase()}.` : null;
}

/** Rendering is a consequence of the same saved beat/progress as the engine. */
export function getAnglingPose(state: ExpeditionState, window: AnglingWindow) {
  const blend = window.elapsed / window.ticks;
  const offsetX = window.fromOffset[0] + (window.offset[0] - window.fromOffset[0]) * blend;
  const offsetY = window.fromOffset[1] + (window.offset[1] - window.fromOffset[1]) * blend;
  // Missed guidance already changes persisted progress. Transient input must
  // not move the fish when pause clears a held control or after a reload.
  const x = Math.max(22, Math.min(88, 64 - state.interactionProgress * .30 + offsetX));
  const y = Math.max(28, Math.min(86, 46 + state.interactionProgress * .33 + offsetY));
  const heading = window.id === 'cover' ? 155 : window.engage ? 135 : -25;
  const load = Math.max(0, Math.min(1, state.lineTension / 100));
  return { x, y, heading, load, surface: window.id === 'roll' || window.id === 'headshake' };
}
