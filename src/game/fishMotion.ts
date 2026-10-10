import type { LiveFishSpecies } from '../data/liveFishSprites';
import type { ExpeditionState } from '../types';
import type { AnglingWindow } from './angling';

/** View framing, not a habitat coordinate or a new simulation rule. Combined
 * with a sprite no wider than 22% of the scene, the whole fish stays in water. */
export const LIVE_FISH_WATER_BOUNDS = { minX: 26, maxX: 72, minY: 56, maxY: 82 } as const;

export interface LiveFishMotion {
  /** Mouth position: the line, surface mark and sprite share this endpoint. */
  x: number;
  y: number;
  /** Horizontal perspective turn. Its sign changes; the dorsal side stays up. */
  facing: number;
  pitch: number;
  bodyBend: number;
  tailBend: number;
  surface: boolean;
}

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const smooth = (value: number) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
const direction = (window: AnglingWindow) => window.id === 'burst' || window.id === 'tidal-surge' ? 1 : -1;
const pitch = (window: AnglingWindow) => window.id === 'cover' ? 12 : window.id === 'recover' ? -14 : window.id === 'tidal-surge' ? 8 : window.id === 'burst' ? -12 : 0;
const anatomy: Record<LiveFishSpecies, { body: number; tail: number; rhythm: number }> = {
  'peacock-bass': { body: 1.8, tail: 6.5, rhythm: .95 },
  'common-snook': { body: 1.3, tail: 5.2, rhythm: .85 },
  'spotted-seatrout': { body: 1.6, tail: 5.8, rhythm: 1.05 },
  'giant-snakehead': { body: 2.4, tail: 4.3, rhythm: .68 },
};

/** Deterministic rendering from the saved encounter clock. There is no input,
 * animation timer, engine call, randomness or mutation here; a paused/reloaded
 * encounter has exactly the same mouth point, turn and tail posture. */
export function getLiveFishMotion(
  state: ExpeditionState,
  species: LiveFishSpecies,
  window: AnglingWindow | null,
  previousWindow: AnglingWindow | null = null,
): LiveFishMotion {
  const progress = clamp(state.interactionProgress, 0, 100);
  const clock = window ? state.anglingBeat : state.lineTurn;
  const elapsed = window ? window.elapsed : state.phaseProgress;
  const running = window ? !window.engage : state.fightPhase === 'run';
  const blend = window ? smooth(window.elapsed / window.ticks) : 0;
  const offsetX = window ? window.fromOffset[0] + (window.offset[0] - window.fromOffset[0]) * blend : running ? 5 : -3;
  const offsetY = window ? window.fromOffset[1] + (window.offset[1] - window.fromOffset[1]) * blend : 0;
  const targetFacing = window ? direction(window) : running ? 1 : -1;
  const firstClassicPhase = !window && state.lineTurn === state.phaseProgress;
  const previousFacing = previousWindow ? direction(previousWindow) : clock === 0 || firstClassicPhase ? targetFacing : -targetFacing;
  const turn = smooth(elapsed / 4);
  const facing = previousFacing + (targetFacing - previousFacing) * turn;
  const targetPitch = window ? pitch(window) : running ? -9 : -13;
  const previousPitch = previousWindow ? pitch(previousWindow) : targetPitch;
  const headshake = window?.id === 'headshake';
  const selected = anatomy[species];
  const rhythm = clock * (headshake ? 1.35 : selected.rhythm);
  const effort = running ? 1 : .65;
  const x = clamp((window ? 64 : 65) - progress * (window ? .30 : .23) + offsetX * .75,
    LIVE_FISH_WATER_BOUNDS.minX, LIVE_FISH_WATER_BOUNDS.maxX);
  const y = clamp((window ? 60 : species === 'giant-snakehead' ? 64 : 60) + progress * .22 + offsetY * .55,
    LIVE_FISH_WATER_BOUNDS.minY, LIVE_FISH_WATER_BOUNDS.maxY);
  return {
    x, y, facing,
    pitch: clamp(previousPitch + (targetPitch - previousPitch) * turn + (headshake ? Math.sin(rhythm) * 3 : 0), -18, 18),
    bodyBend: Math.sin(rhythm) * selected.body * effort,
    tailBend: Math.sin(rhythm - .7) * selected.tail * effort,
    surface: window?.id === 'roll' || headshake,
  };
}

/** Pitch is shared by all artwork views around their common mouth endpoint.
 * Side and oblique mirroring change while hidden beneath the front artwork. */
export function getLiveFishTransform(motion: Pick<LiveFishMotion, 'pitch' | 'facing'>) {
  return `rotate(${motion.pitch}deg)`;
}

export type LiveFishArtworkView = 'side' | 'oblique' | 'turn';
export interface LiveFishView {
  sideOpacity: number;
  obliqueOpacity: number;
  turnOpacity: number;
  sideScaleX: number;
  obliqueScaleX: number;
  artworkView: LiveFishArtworkView;
}

const artworkViews = ['side', 'oblique', 'turn'] as const;
const viewBreadth = { side: 1, oblique: .6875, turn: 0 } as const;
const dominantView = (opacity: Record<LiveFishArtworkView, number>): LiveFishArtworkView =>
  artworkViews.reduce((best, view) => opacity[view] > opacity[best] ? view : best);

/** Uses real side, oblique and front artwork rather than flattening a profile.
 * Saved whole-tick poses choose one image. Narrow, adjacent handoffs support
 * intermediate poses without ever overlaying all three silhouettes. */
export function getLiveFishView(motion: Pick<LiveFishMotion, 'facing'>): LiveFishView {
  const facing = clamp(motion.facing, -1, 1);
  const breadth = Math.abs(facing);
  const sideOpacity = smooth((breadth - .85) / .1);
  const turnOpacity = 1 - smooth((breadth - .30) / .1);
  const obliqueOpacity = clamp(1 - sideOpacity - turnOpacity, 0, 1);
  const mirror = facing < 0 ? -1 : 1;
  return {
    sideOpacity, obliqueOpacity, turnOpacity,
    // Mirroring is discrete and must not receive a CSS transform transition.
    // Both mirrored images are invisible at the sign change. Their genuine
    // camera views retain their natural proportions at every orientation.
    sideScaleX: mirror,
    obliqueScaleX: mirror,
    artworkView: dominantView({ side: sideOpacity, oblique: obliqueOpacity, turn: turnOpacity }),
  };
}

/** Resource readiness only affects which artwork is visible, never the saved
 * pose. Renormalize ready requested views, otherwise choose the nearest ready
 * camera angle. With no ready image, retain the existing vector silhouette. */
export function getDecodedLiveFishView(
  motion: Pick<LiveFishMotion, 'facing'>,
  decoded: Record<LiveFishArtworkView, boolean>,
): LiveFishView & { fallback: boolean } {
  const requested = getLiveFishView(motion);
  const weights = { side: requested.sideOpacity, oblique: requested.obliqueOpacity, turn: requested.turnOpacity };
  const opacity = { side: 0, oblique: 0, turn: 0 };
  const total = artworkViews.reduce((sum, view) => sum + (decoded[view] ? weights[view] : 0), 0);
  const available = artworkViews.filter(view => decoded[view]);
  if (total > 0) {
    for (const view of available) opacity[view] = weights[view] / total;
  } else if (available.length > 0) {
    const breadth = Math.abs(clamp(motion.facing, -1, 1));
    const nearest = available.reduce((best, view) =>
      Math.abs(viewBreadth[view] - breadth) < Math.abs(viewBreadth[best] - breadth) ? view : best);
    opacity[nearest] = 1;
  } else {
    opacity.side = 1;
  }
  return {
    ...requested,
    sideOpacity: opacity.side,
    obliqueOpacity: opacity.oblique,
    turnOpacity: opacity.turn,
    artworkView: dominantView(opacity),
    fallback: available.length === 0,
  };
}
