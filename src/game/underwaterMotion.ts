import type { ExpeditionState, RodSide, Venue } from '../types';
import { getAnglingWindow, type AnglingWindow } from './angling';
import { getFightProfile, hasLostFish } from './engine';
import { getInteractionKind, hasEarlierCompletedEncounter } from './interactions';
import { underwaterFishByEncounterId, type UnderwaterFishDefinition, type UnderwaterFishFrame } from '../data/underwaterFish';
import { getSkillFishingCue } from './skillFishing';

export interface UnderwaterPose {
  /** Mouth position in the scene, also the exact fishing-line endpoint. */
  x: number;
  y: number;
  clock: number;
  /** Swimming path tangent, in radians. Never an independently authored facing. */
  heading: number;
  /** Continuous camera yaw: -1 is left profile, 0 is the genuine front view. */
  facing: number;
  /** Dorsal-up screen pitch. A left turn never rotates the fish upside down. */
  pitch: number;
  bend: number;
  tailPhase: number;
  effort: number;
  load: number;
  scale: number;
  surface: boolean;
  lost: boolean;
  resolved: boolean;
  speciesId: string;
  rodSide: RodSide;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const smooth = (v: number) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };

/** A presentation pilot, never a migration or a new interaction rule. Resolved
 * and lost current casts retain the same camera so landing/retry cannot flash
 * through the old surface fight. Historical records and every other water keep
 * their existing presentation. */
export function supportsAmazonUnderwater(state: ExpeditionState, venue: Venue) {
  return venue.id === 'amazon' && state.venueId === venue.id && state.encounterId === 'peacock-bass'
    && state.anglingRules === 'habitat-v1' && getInteractionKind(state, venue) === 'fish'
    && !hasEarlierCompletedEncounter(state, venue);
}

export function supportsUnderwaterFishing(state: ExpeditionState, venue: Venue) {
  const encounter = state.encounterId ? venue.encounters[state.encounterId] : null;
  return state.venueId === venue.id && encounter?.type === 'fish'
    && venue.gearSets.some(gear => gear.id === state.gearId && gear.method === 'angling')
    && getInteractionKind(state, venue) === 'fish' && !hasEarlierCompletedEncounter(state, venue)
    && Boolean(underwaterFishByEncounterId[encounter.id]);
}

function waypoint(id: AnglingWindow['id'], progress: number, fish: UnderwaterFishDefinition) {
  const bottom = fish.behavior === 'bottom' || fish.behavior === 'flatfish';
  const deep = fish.behavior === 'flatfish' ? 78 : fish.behavior === 'bottom' ? 71 : fish.behavior === 'undulatory' ? 66 : fish.behavior === 'steady' ? 54 : 61;
  const breadth = fish.behavior === 'pelagic' ? 1.10 : fish.behavior === 'steady' ? .76 : bottom ? .66 : 1;
  const coordinate = (x: number, y: number) => ({ x: 45 + (x - 45) * breadth, y });
  switch (id) {
    case 'burst': case 'tidal-surge': return coordinate(79 - progress * .19, deep - progress * .10);
    case 'cover': return coordinate(55 - progress * .15, Math.min(80, deep + (bottom ? 2 : 6)) - progress * .09);
    case 'roll': return coordinate(50 - progress * .12, bottom ? deep - progress * .12 : 29);
    case 'headshake': return coordinate(49 - progress * .12, deep - progress * .12);
    default: return coordinate(44 - progress * .10, deep - 9 - progress * .13);
  }
}

/** Pure saved-clock pose. Waypoints are cinematic framing, not metres or a
 * physiological claim. Runs move away, guiding turns clear the root edge,
 * recovery moves toward the overhead line, and a roll rises to the surface.
 * Smooth endpoints decelerate before the real front/oblique artwork reverses
 * direction; the side texture is never flattened into a paper-thin turn. */
export function getUnderwaterFishPose(state: ExpeditionState, venue: Venue, previousPose?: UnderwaterPose,
  viewport: { width: number; height: number } = { width: 100, height: 100 }): UnderwaterPose {
  const skill = getSkillFishingCue(state, venue);
  const window = skill ?? getAnglingWindow(state, venue);
  const fish = underwaterFishByEncounterId[state.encounterId ?? ''] ?? underwaterFishByEncounterId['peacock-bass'];
  const profile = getFightProfile(state);
  const progress = clamp(state.interactionProgress, 0, 100);
  const clock = Math.max(0, window ? state.anglingBeat : state.lineTurn);
  const windowStart = window ? clock - window.elapsed : 0;
  const priorState = { ...state, anglingBeat: windowStart - 1 };
  const prior = window && windowStart > 0 ? skill ? getSkillFishingCue(priorState, venue) : getAnglingWindow(priorState, venue) : null;
  const classicRun = state.fightPhase === 'run';
  const length = window?.ticks ?? (classicRun ? profile.runTicks : profile.restTicks);
  const from = waypoint(window ? prior?.id ?? 'recover' : classicRun ? 'recover' : 'burst', progress, fish);
  const to = waypoint(window?.id ?? (classicRun ? 'burst' : 'recover'), progress, fish);
  const fraction = window ? window.elapsed / window.ticks : clamp(state.phaseProgress / length, 0, 1);
  const ease = smooth(fraction);
  // Differentiate the exact visible path. Near a stationary reversal the fish
  // turns toward the camera rather than mirroring at full swimming speed.
  const rate = 6 * fraction * (1 - fraction) / length;
  const covering = skill?.needsRodSide === true;
  const toward = skill?.coverSide === 'left' ? -1 : skill?.coverSide === 'right' ? 1 : 0;
  const guided = covering && state.rodSide === skill.requiredRodSide;
  // A latched away-side rod cushions the approach to actual habitat structure.
  // Wrong steering drives closer to that same visible edge. The bulge returns
  // to a common endpoint, avoiding invented previous-control history on reload.
  const coverReach = covering ? toward * (guided ? 6 : 18) : 0;
  const coverBulge = Math.sin(Math.PI * fraction) ** 2 * coverReach;
  const coverVelocity = covering ? Math.PI * Math.sin(2 * Math.PI * fraction) * coverReach / length : 0;
  const dx = ((to.x - from.x) * rate + coverVelocity) * viewport.width / 100;
  const dy = (to.y - from.y) * rate * viewport.height / 100;
  let heading = Math.atan2(dy, dx);
  const speed = Math.hypot(dx, dy);
  let facing = speed < .001 ? 0 : dx / Math.sqrt(speed * speed + .04);
  const approach = smooth((progress - 78) / 22);
  const x = from.x + (to.x - from.x) * ease + coverBulge;
  const y = from.y + (to.y - from.y) * ease;
  // Pilot fishStamina is an engine compatibility counter (0..5 after a tick),
  // not a percentage. Visible fatigue is therefore derived from recovered
  // progress, avoiding an abrupt artificial collapse after the first tick.
  const stamina = 1 - progress / 100;
  const running = window ? !window.engage : classicRun;
  const struggle = running ? 1 : window?.id === 'cover' ? .82 : .58;
  const effort = struggle * (.38 + .62 * stamina) * (1 - approach * .40);
  const tailPhase = clock * Math.PI * fish.tailRate;
  let pitch = speed < .001 ? 0 : clamp(Math.atan2(dy, Math.abs(dx)) * Math.sign(dx || 1), -.16, .16);
  const mouthX = clamp(x + (38 - x) * approach, 30, 80);
  const mouthY = clamp(y + (29 - y) * approach, 28, 80);
  if (previousPose) {
    const travelX = (mouthX - previousPose.x) * viewport.width / 100;
    const travelY = (mouthY - previousPose.y) * viewport.height / 100;
    const travelSpeed = Math.hypot(travelX, travelY);
    if (travelSpeed > .001) {
      heading = Math.atan2(travelY, travelX);
      facing = travelX / Math.sqrt(travelSpeed * travelSpeed + .015);
      pitch = clamp(Math.atan2(travelY, Math.abs(travelX)) * Math.sign(travelX || 1), -.16, .16);
    } else {
      heading = previousPose.heading; facing = previousPose.facing; pitch = previousPose.pitch;
    }
  }
  return {
    x: mouthX,
    y: mouthY,
    clock, heading, facing: clamp(facing, -1, 1), pitch,
    bend: (.065 + effort * .060) * fish.bendScale,
    tailPhase, effort,
    load: clamp(state.lineTension / 100, 0, 1),
    scale: .86 + progress * .004,
    surface: (window?.id === 'roll' && fish.behavior !== 'bottom' && fish.behavior !== 'flatfish' && y <= 33) || approach > .80,
    lost: hasLostFish(state),
    resolved: state.lineResolved,
    speciesId: fish.id,
    rodSide: skill ? state.rodSide : 'center',
  };
}

/** Compatibility entry point for the original focused Amazon pilot. */
export const getAmazonUnderwaterPose = getUnderwaterFishPose;

/** A short display interpolation between two actual saved samples. It never
 * calls the engine or extrapolates an unseen beat. Angles take their shortest
 * path. Tail phase also takes its shortest route: an assisted whole-window
 * response must not replay every skipped tailbeat in a fraction of a second. */
export function interpolateUnderwaterPose(from: UnderwaterPose, to: UnderwaterPose, fraction: number): UnderwaterPose {
  const t = clamp(fraction, 0, 1);
  if (t === 0) return { ...from };
  if (t === 1) return { ...to };
  // A reversal completes its genuine front-view turn while nearly stationary,
  // then leaves in the new direction. It cannot swim backwards for half of a
  // mirror interpolation. Other saved-sample motion keeps a steady velocity.
  const reversal = from.facing * to.facing < -.12;
  const movement = reversal ? smooth((t - .5) * 2) : t;
  const yaw = reversal ? smooth(t * 2) : t;
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const turn = Math.atan2(Math.sin(to.heading - from.heading), Math.cos(to.heading - from.heading));
  return {
    ...to,
    x: from.x + (to.x - from.x) * movement, y: from.y + (to.y - from.y) * movement, clock: lerp(from.clock, to.clock),
    heading: from.heading + turn * t,
    facing: from.facing + (to.facing - from.facing) * yaw, pitch: lerp(from.pitch, to.pitch),
    bend: lerp(from.bend, to.bend),
    tailPhase: from.tailPhase + Math.atan2(Math.sin(to.tailPhase - from.tailPhase), Math.cos(to.tailPhase - from.tailPhase)) * t,
    effort: lerp(from.effort, to.effort), load: lerp(from.load, to.load), scale: lerp(from.scale, to.scale),
    surface: t < 1 ? from.surface && to.surface : to.surface,
  };
}

export function getUnderwaterLine(pose: UnderwaterPose, width: number, height: number) {
  if (pose.lost || pose.resolved) return null;
  const start = { x: width * (pose.rodSide === 'left' ? .27 : pose.rodSide === 'right' ? .41 : .34), y: -height * .03 };
  const end = { x: width * pose.x / 100, y: height * pose.y / 100 };
  return {
    start, end,
    control: { x: (start.x + end.x) / 2 - width * .075 * (1 - pose.load),
      y: (start.y + end.y) / 2 + height * .09 * (1 - pose.load) },
  };
}

/** Mouth-relative continuous texture geometry; the shared source vertices keep
 * neighboring triangles joined. u/v are 0..1 source-image coordinates. */
export function getUnderwaterMeshPoint(u: number, v: number, width: number, height: number,
  mouthX: number, mouthY: number, pose: UnderwaterPose, strength = 1) {
  const aft = clamp((mouthX / 100 - u) / .82, 0, 1);
  const fish = underwaterFishByEncounterId[pose.speciesId] ?? underwaterFishByEncounterId['peacock-bass'];
  const exponent = fish.behavior === 'undulatory' ? 1.35 : 2;
  const sway = Math.sin(pose.tailPhase - aft * fish.waveLength) * width * pose.bend * aft ** exponent * strength;
  const tangent = Math.cos(pose.tailPhase - aft * fish.waveLength) * pose.bend * aft * strength;
  const across = (v - mouthY / 100) * height;
  return { x: (u - mouthX / 100) * width - across * tangent, y: across + sway };
}

export function getUnderwaterTexturePoint(frame: Pick<UnderwaterFishFrame, 'sourceRect'>, u: number, v: number,
  imageWidth: number, imageHeight: number) {
  const rect = frame.sourceRect ?? { x: 0, y: 0, width: imageWidth, height: imageHeight };
  return { x: rect.x + u * rect.width, y: rect.y + v * rect.height };
}

/** Bound the entire deformed image frame, including true front/oblique views,
 * rather than merely clamping the mouth point. This preserves the body and
 * dorsal fin above narrow phone scene crops and during the surface approach. */
export function getUnderwaterFishFrameWidth(pose: UnderwaterPose, sceneWidth: number, sceneHeight: number) {
  const fish = underwaterFishByEncounterId[pose.speciesId] ?? underwaterFishByEncounterId['peacock-bass'];
  const desired = Math.min(sceneHeight * .90, clamp(sceneWidth * .31 * pose.scale,
    Math.min(118, sceneWidth * .35), sceneWidth * .42));
  // Both profile mirrors share one conservative frame. At a genuine front-view
  // crossover, changing yaw sign must never resize the fish instantaneously.
  const side = fish.side ?? { aspectRatio: fish.aspectRatio, mouthX: 98, mouthY: 50, widthScale: 1 };
  const mirrored = [{ width: side.widthScale, ratio: side.aspectRatio, mouthX: side.mouthX, mouthY: side.mouthY, strength: 1 },
    ...(fish.oblique ? [{ width: fish.oblique.widthScale, ratio: fish.oblique.aspectRatio, mouthX: fish.oblique.mouthX, mouthY: fish.oblique.mouthY, strength: .45 }] : [])]
    .flatMap(profile => [-1, 1].map(mirror => ({ ...profile, mirror })));
  const profiles = [...mirrored,
    ...(fish.turn ? [{ width: fish.turn.widthScale, ratio: fish.turn.aspectRatio, mouthX: fish.turn.mouthX, mouthY: fish.turn.mouthY, strength: .15, mirror: 1 }] : []),
  ];
  const cos = Math.cos(pose.pitch), sin = Math.sin(pose.pitch);
  const mouth = { x: sceneWidth * pose.x / 100, y: sceneHeight * pose.y / 100 };
  const margin = Math.min(sceneWidth, sceneHeight) * .025;
  let maximum = desired;
  for (const profile of profiles) {
    for (let column = 0; column <= 26; column++) {
      for (let row = 0; row <= 3; row++) {
        const p = getUnderwaterMeshPoint(column / 26, row / 3, profile.width, profile.width / profile.ratio,
          profile.mouthX, profile.mouthY, pose, profile.strength);
        const x = p.x * profile.mirror * cos - p.y * sin;
        const y = p.x * profile.mirror * sin + p.y * cos;
        if (x < 0) maximum = Math.min(maximum, (mouth.x - margin) / -x);
        if (x > 0) maximum = Math.min(maximum, (sceneWidth - margin - mouth.x) / x);
        if (y < 0) maximum = Math.min(maximum, (mouth.y - margin) / -y);
        if (y > 0) maximum = Math.min(maximum, (sceneHeight - margin - mouth.y) / y);
      }
    }
  }
  return Math.max(1, maximum);
}
