import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FishingScene } from '../src/components/FishingScene';
import { liveFishSpriteByEncounterId, type LiveFishSpecies } from '../src/data/liveFishSprites';
import { venueById } from '../src/data/venues';
import { getAnglingWindow } from '../src/game/angling';
import { castLine, createInitialState, getIdealCastPower } from '../src/game/engine';
import { getDecodedLiveFishView, getLiveFishMotion, getLiveFishTransform, getLiveFishView, LIVE_FISH_WATER_BOUNDS } from '../src/game/fishMotion';
import type { ExpeditionState } from '../src/types';

function start(venueId = 'amazon', gearId = 'surface', zoneId = 'roots', seasonId = 'rising-water') {
  const state: ExpeditionState = { ...createInitialState(), stage: 'habitat', venueId, gearId, zoneId, seasonId };
  return castLine(state, getIdealCastPower(state));
}
const pilots = [start(), start('florida-bay', 'roots', 'creek', 'spring-exchange'), start('florida-bay', 'flat', 'seagrass', 'dry-salinity')];
const snakehead = start('tonle-sap', 'forest', 'forest', 'reverse-flow');

function motion(state: ExpeditionState) {
  const venue = venueById[state.venueId!];
  const window = getAnglingWindow(state, venue);
  const previous = window ? getAnglingWindow({ ...state, anglingBeat: Math.max(0, state.anglingBeat - window.elapsed - 1) }, venue) : null;
  return getLiveFishMotion(state, state.encounterId as LiveFishSpecies, window, previous);
}
function scene(state: ExpeditionState, paused = false, engaged = false) {
  return renderToStaticMarkup(<FishingScene state={state} venue={venueById[state.venueId!]} paused={paused} engaged={engaged}/>);
}

describe('saved-clock fish motion', () => {
  it('keeps all pilot species and snakehead mouths within submerged mobile-safe framing', () => {
    for (const route of [...pilots, snakehead]) {
      for (const progress of [0, 25, 50, 75, 100]) {
        for (let clock = 0; clock < 100; clock++) {
          const view = motion({ ...route, interactionProgress: progress, anglingBeat: clock, lineTurn: clock, phaseProgress: clock % 12 });
          expect(view.x).toBeGreaterThanOrEqual(LIVE_FISH_WATER_BOUNDS.minX);
          expect(view.x).toBeLessThanOrEqual(LIVE_FISH_WATER_BOUNDS.maxX);
          expect(view.y).toBeGreaterThanOrEqual(LIVE_FISH_WATER_BOUNDS.minY);
          expect(view.y).toBeLessThanOrEqual(LIVE_FISH_WATER_BOUNDS.maxY);
          expect(Math.abs(view.pitch)).toBeLessThanOrEqual(18);
          expect(Math.abs(view.facing)).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('turns continuously across behavior boundaries without rotating the dorsal side down', () => {
    for (const route of pilots) {
      let previous = motion(route);
      const facings = new Set<number>();
      for (let clock = 1; clock < 110; clock++) {
        const view = motion({ ...route, interactionProgress: 30, anglingBeat: clock, lineTurn: clock });
        // Compare a fixed progress value after the first frame, across two full cycles.
        if (clock > 1) {
          expect(Math.abs(view.x - previous.x)).toBeLessThan(4);
          expect(Math.abs(view.y - previous.y)).toBeLessThan(2);
          expect(Math.abs(view.facing - previous.facing)).toBeLessThanOrEqual(.7);
          expect(Math.abs(view.pitch - previous.pitch)).toBeLessThan(14);
        }
        // Horizontal mirroring leaves the dorsal (0, -1) vector pointing up.
        expect(-Math.cos(view.pitch * Math.PI / 180)).toBeLessThan(-.95);
        expect(getLiveFishTransform(view)).not.toMatch(/scaleY|rotate\((?:135|155)/);
        facings.add(Math.sign(view.facing));
        previous = view;
      }
      expect(facings.has(-1)).toBe(true); expect(facings.has(1)).toBe(true);
    }
  });

  it('joins the same deterministic mouth to line, ripple and articulated image in every live species', () => {
    for (const route of [...pilots, snakehead]) {
      const state = { ...route, anglingBeat: 11, lineTurn: 11, phaseProgress: 3, interactionProgress: 36 };
      const view = motion(state), sprite = liveFishSpriteByEncounterId[state.encounterId as LiveFishSpecies];
      const html = scene(state);
      expect(html).toContain(`data-mouth-x="${view.x}" data-mouth-y="${view.y}"`);
      expect(html).toContain(`left:${view.x}%;top:${view.y}%;aspect-ratio:${sprite.aspectRatio}`);
      expect(html).toContain(` ${view.x} ${view.y}&quot;)`);
      expect(html).toContain(`transform-origin:${sprite.mouthX}% ${sprite.mouthY}%;transform:${getLiveFishTransform(view)}`);
      expect(html).toContain('angling-live-fish__body'); expect(html).toContain('angling-live-fish__tail');
      expect(html).toContain(`left:${sprite.mouthX}%;top:${sprite.mouthY}%;width:${sprite.turn.widthScale * 100}%;height:auto;aspect-ratio:${sprite.turn.aspectRatio}`);
      expect(html).toContain(`transform:translate(-${sprite.turn.mouthX}%, -${sprite.turn.mouthY}%)`);
      expect(html).toContain(`left:${sprite.mouthX}%;top:${sprite.mouthY}%;width:${sprite.oblique.widthScale * 100}%;height:auto;aspect-ratio:${sprite.oblique.aspectRatio}`);
      expect(html).toContain(`transform-origin:${sprite.oblique.mouthX}% ${sprite.oblique.mouthY}%;transform:translate(-${sprite.oblique.mouthX}%, -${sprite.oblique.mouthY}%) scaleX(`);
      expect(html).toContain(sprite.turn.src);
      expect(html).toContain(sprite.oblique.src);
      expect(html.match(/class="angling-live-fish__piece/g)).toHaveLength(5);
      expect(html).not.toContain('rotate(135deg)'); expect(html).not.toContain('rotate(155deg)');
    }
  });

  it('uses actual oblique and front cutouts at saved turning poses without compressing an image', () => {
    for (const facing of [-1, -.6875, 0, .6875, 1]) {
      const view = getLiveFishView({ facing });
      expect(view.sideOpacity + view.obliqueOpacity + view.turnOpacity).toBe(1);
      expect(view.sideOpacity).toBe(Math.abs(facing) === 1 ? 1 : 0);
      expect(view.obliqueOpacity).toBe(Math.abs(facing) === .6875 ? 1 : 0);
      expect(view.turnOpacity).toBe(facing === 0 ? 1 : 0);
      expect(view.artworkView).toBe(facing === 0 ? 'turn' : Math.abs(facing) === 1 ? 'side' : 'oblique');
      expect(Math.abs(view.sideScaleX)).toBe(1);
      expect(Math.abs(view.obliqueScaleX)).toBe(1);
      expect(Math.sign(view.sideScaleX)).toBe(facing < 0 ? -1 : 1);
      expect(Math.sign(view.obliqueScaleX)).toBe(facing < 0 ? -1 : 1);
      expect(getLiveFishTransform({ facing, pitch: -13 })).toBe('rotate(-13deg)');
    }
    // Adjacent handoffs are narrow, and never overlay all three silhouettes.
    for (let step = -100; step <= 100; step++) {
      const facing = step / 100, view = getLiveFishView({ facing });
      for (const opacity of [view.sideOpacity, view.obliqueOpacity, view.turnOpacity]) {
        expect(opacity).toBeGreaterThanOrEqual(0);
        expect(opacity).toBeLessThanOrEqual(1);
      }
      expect(view.sideOpacity + view.obliqueOpacity + view.turnOpacity).toBeCloseTo(1, 12);
      expect([view.sideOpacity, view.obliqueOpacity, view.turnOpacity].filter(opacity => opacity > 0).length).toBeLessThanOrEqual(2);
      if (view.sideOpacity > 0 && view.sideOpacity < 1) {
        expect(Math.abs(facing)).toBeGreaterThan(.85);
        expect(Math.abs(facing)).toBeLessThan(.95);
        expect(view.turnOpacity).toBe(0);
      }
      if (view.turnOpacity > 0 && view.turnOpacity < 1) {
        expect(Math.abs(facing)).toBeGreaterThan(.30);
        expect(Math.abs(facing)).toBeLessThan(.40);
        expect(view.sideOpacity).toBe(0);
      }
      expect(getLiveFishView({ facing: -facing }).turnOpacity).toBe(view.turnOpacity);
      expect(getLiveFishView({ facing: -facing }).obliqueOpacity).toBe(view.obliqueOpacity);
    }
  });

  it('selects oblique artwork on each side of every saved pilot and snakehead reversal', () => {
    for (const route of pilots) {
      const signs = new Set<number>();
      for (let clock = 1; clock < 110; clock++) {
        const state = { ...route, anglingBeat: clock, lineTurn: clock };
        const pose = motion(state);
        if (Math.abs(pose.facing) !== .6875) continue;
        signs.add(Math.sign(pose.facing));
        const html = scene(state);
        expect(html).toContain('data-artwork-view="oblique"');
        expect(html).toContain('data-view="oblique" data-view-opacity="1"');
        expect(html).toContain(`scaleX(${Math.sign(pose.facing)})`);
        expect(html).not.toContain('scaleX(0)');
      }
      expect(signs).toEqual(new Set([-1, 1]));
    }
    for (const phaseProgress of [1, 3]) {
      const state = { ...snakehead, fightPhase: 'rest' as const, lineTurn: 12 + phaseProgress, phaseProgress };
      expect(Math.abs(motion(state).facing)).toBe(.6875);
      expect(scene(state)).toContain('data-artwork-view="oblique"');
    }
  });

  it('chooses the nearest ready camera view when requested artwork is missing, with a vector if all fail', () => {
    for (const [facing, decoded, expected] of [
      [0, { side: false, oblique: false, turn: false }, 'side'],
      [0, { side: true, oblique: false, turn: false }, 'side'],
      [0, { side: false, oblique: true, turn: false }, 'oblique'],
      [0, { side: false, oblique: false, turn: true }, 'turn'],
      [0, { side: true, oblique: true, turn: false }, 'oblique'],
      [.6875, { side: true, oblique: false, turn: true }, 'side'],
      [1, { side: false, oblique: true, turn: true }, 'oblique'],
      [.90, { side: false, oblique: true, turn: true }, 'oblique'],
      [.35, { side: true, oblique: false, turn: true }, 'turn'],
    ] as const) {
      const view = getDecodedLiveFishView({ facing }, decoded);
      expect(view.artworkView).toBe(expected);
      expect(view.fallback).toBe(!decoded.side && !decoded.oblique && !decoded.turn);
      expect(view.sideOpacity).toBe(expected === 'side' ? 1 : 0);
      expect(view.obliqueOpacity).toBe(expected === 'oblique' ? 1 : 0);
      expect(view.turnOpacity).toBe(expected === 'turn' ? 1 : 0);
    }
  });

  it('never leaves a blank fish for any decoded-resource combination or orientation', () => {
    for (let bits = 0; bits < 8; bits++) {
      const decoded = { side: Boolean(bits & 1), oblique: Boolean(bits & 2), turn: Boolean(bits & 4) };
      for (let step = -100; step <= 100; step++) {
        const facing = step / 100, view = getDecodedLiveFishView({ facing }, decoded);
        expect(view.sideOpacity + view.obliqueOpacity + view.turnOpacity).toBeCloseTo(1, 12);
        expect(view.fallback).toBe(bits === 0);
        if (bits !== 0) {
          if (!decoded.side) expect(view.sideOpacity).toBe(0);
          if (!decoded.oblique) expect(view.obliqueOpacity).toBe(0);
          if (!decoded.turn) expect(view.turnOpacity).toBe(0);
        }
        if (bits === 7) expect(view).toEqual({ ...getLiveFishView({ facing }), fallback: false });
      }
    }
  });

  it('selects real turn artwork in both pilot directions and the snakehead phase reversal', () => {
    for (const route of pilots) {
      const directions = new Set<number>();
      for (let clock = 1; clock < 110; clock++) {
        const state = { ...route, anglingBeat: clock, lineTurn: clock };
        const pose = motion(state);
        if (pose.facing !== 0) continue;
        directions.add(Math.sign(motion({ ...state, anglingBeat: clock - 1, lineTurn: clock - 1 }).facing));
        const html = scene(state);
        expect(html).toContain('data-artwork-view="turn"');
        expect(html).toContain('data-view="turn" data-view-opacity="1"');
        expect(html).not.toContain('scaleX(0)');
        const turnElement = html.match(/<div class="angling-live-fish__view angling-live-fish__view--turn[^>]+>/)![0];
        expect(turnElement).not.toContain('scaleX');
      }
      expect(directions).toEqual(new Set([-1, 1]));
    }
    const halfway = { ...snakehead, fightPhase: 'rest' as const, lineTurn: 14, phaseProgress: 2 };
    expect(scene(halfway)).toContain('data-artwork-view="turn"');
    expect(getLiveFishView(motion(halfway)).turnOpacity).toBe(1);
  });

  it('retains the side silhouette until the requested front artwork has decoded', () => {
    const halfway = { ...snakehead, fightPhase: 'rest' as const, lineTurn: 14, phaseProgress: 2 };
    const html = scene(halfway);
    const side = html.match(/<div class="angling-live-fish__view angling-live-fish__view--side[^>]+>/)![0];
    const turn = html.match(/<div class="angling-live-fish__view angling-live-fish__view--turn[^>]+>/)![0];
    expect(side).toContain('data-view-opacity="0"');
    expect(side).toContain('style="opacity:1;');
    expect(side).not.toContain('is-decoded');
    expect(turn).toContain('data-view-opacity="1"');
    expect(turn).toContain('opacity:0;');
    expect(turn).not.toContain('is-decoded');
    expect(html).toContain('angling-live-fish__fallback');
  });

  it('keeps all camera mouths at the shared screen anchor across mobile and desktop framing and discrete mirrors', () => {
    for (const route of [...pilots, snakehead]) {
      const sprite = liveFishSpriteByEncounterId[route.encounterId as LiveFishSpecies];
      expect(sprite.turn.src).not.toBe(sprite.src);
      expect(sprite.oblique.src).not.toBe(sprite.src);
      expect(sprite.oblique.src).not.toBe(sprite.turn.src);
      for (const frame of [sprite.oblique, sprite.turn]) {
        expect(frame.aspectRatio).toBeGreaterThan(0);
        expect(frame.widthScale).toBeGreaterThan(0);
        expect(frame.widthScale * sprite.aspectRatio / frame.aspectRatio).toBeLessThanOrEqual(1.25);
      }
      for (const width of [44, 64, 92, 130]) {
        const height = width / sprite.aspectRatio;
        const localMouth = { x: width * sprite.mouthX / 100, y: height * sprite.mouthY / 100 };
        for (const frame of [sprite.oblique, sprite.turn]) {
          const frameWidth = width * frame.widthScale;
          const frameHeight = frameWidth / frame.aspectRatio;
          const ownMouth = { x: frameWidth * frame.mouthX / 100, y: frameHeight * frame.mouthY / 100 };
          const offset = { x: localMouth.x - ownMouth.x, y: localMouth.y - ownMouth.y };
          // CSS translate(...) scaleX(...) applies the signed scale first
          // about this frame's mouth, followed by the frame offset. Shared
          // pitch is also about the resulting mouth and cannot move the join.
          for (const mirror of [-1, 1]) {
            const mirroredMouthX = ownMouth.x + (ownMouth.x - ownMouth.x) * mirror;
            expect(Math.abs(offset.x + mirroredMouthX - localMouth.x)).toBeLessThan(.008);
            expect(Math.abs(offset.y + ownMouth.y - localMouth.y)).toBeLessThan(.008);
          }
        }
      }
    }
  });

  it('restores the same saved oblique frame while paused or reloaded without changing records', () => {
    const states = [...pilots.flatMap(route => {
      const byDirection = new Map<number, ExpeditionState>();
      for (let clock = 1; clock < 110; clock++) {
        const state = { ...route, anglingBeat: clock, lineTurn: clock };
        const facing = motion(state).facing;
        if (Math.abs(facing) === .6875 && !byDirection.has(Math.sign(facing))) byDirection.set(Math.sign(facing), state);
      }
      expect([...byDirection.keys()].sort()).toEqual([-1, 1]);
      return [...byDirection.values()];
    }), ...[1, 3].map(phaseProgress => ({ ...snakehead, fightPhase: 'rest' as const, lineTurn: 12 + phaseProgress, phaseProgress }))];
    for (const route of states) {
      const state = Object.freeze({ ...route, interactionProgress: 40 });
      const saved = JSON.stringify(state);
      const artwork = (html: string) => html.match(/<div class="angling-live-fish [\s\S]*?<div class="scene-caption">/)![0];
      expect(artwork(scene(state, false, true))).toBe(artwork(scene(state, true, false)));
      expect(artwork(scene(state, true))).toBe(artwork(scene(JSON.parse(saved), true)));
      expect(getLiveFishView(motion(state)).obliqueOpacity).toBe(1);
      expect(JSON.stringify(state)).toBe(saved);
    }
  });

  it('begins the snakehead run facing forward and turns from its previous phase without a reset', () => {
    expect(snakehead.encounterId).toBe('giant-snakehead');
    for (let clock = 0; clock <= 4; clock++) {
      expect(motion({ ...snakehead, lineTurn: clock, phaseProgress: clock }).facing).toBe(1);
    }
    const before = motion({ ...snakehead, lineTurn: 11, phaseProgress: 11 });
    const boundary = motion({ ...snakehead, fightPhase: 'rest', lineTurn: 12, phaseProgress: 0 });
    expect(boundary.facing).toBe(before.facing);
    const halfway = motion({ ...snakehead, fightPhase: 'rest', lineTurn: 14, phaseProgress: 2 });
    expect(halfway.facing).toBe(0);
    expect(motion({ ...snakehead, fightPhase: 'rest', lineTurn: 16, phaseProgress: 4 }).facing).toBe(-1);
  });

  it('does not advance, change posture with held input, or restart after pause, resolution and reload', () => {
    for (const route of [...pilots, snakehead]) {
      const state = Object.freeze({ ...route, anglingBeat: 19, lineTurn: 19, phaseProgress: 3, interactionProgress: 40 });
      const before = JSON.stringify(state);
      expect(motion(JSON.parse(before))).toEqual(motion(state));
      const anatomy = (html: string) => html.match(/<div class="angling-live-fish [\s\S]*?<\/div>\s*<\/div>/)![0];
      expect(anatomy(scene(state, false, true))).toBe(anatomy(scene(state, true, false)));
      expect(anatomy(scene(state, true, true))).toBe(anatomy(scene(JSON.parse(before), true, false)));
      const resolved = { ...state, lineResolved: true };
      expect(anatomy(scene(resolved))).toBe(anatomy(scene(resolved, true)));
      expect(scene({ ...state, lineTension: 100 })).not.toContain('data-mouth-x=');
      expect(JSON.stringify(state)).toBe(before);
    }
  });

  it('restores the same saved front frame while paused or after reload, without changing records', () => {
    const routeStates = [...pilots.flatMap(route => {
      for (let clock = 1; clock < 55; clock++) {
        const state = { ...route, anglingBeat: clock, lineTurn: clock };
        if (motion(state).facing === 0) return [state];
      }
      throw new Error('Pilot must include a direction reversal');
    }), { ...snakehead, fightPhase: 'rest' as const, lineTurn: 14, phaseProgress: 2 }];
    for (const route of routeStates) {
      const state = Object.freeze({ ...route, interactionProgress: 40 });
      const saved = JSON.stringify(state);
      const artwork = (html: string) => html.match(/<div class="angling-live-fish [\s\S]*?<div class="scene-caption">/)![0];
      expect(artwork(scene(state, false, true))).toBe(artwork(scene(state, true, false)));
      expect(artwork(scene(state, true))).toBe(artwork(scene(JSON.parse(saved), true)));
      expect(getLiveFishView(motion(state)).turnOpacity).toBe(1);
      expect(JSON.stringify(state)).toBe(saved);
    }
  });

  it('keeps the original classic pilot and nonfish rendering outside the new live view', () => {
    const classic = { ...pilots[0], anglingRules: 'classic' as const };
    expect(scene(classic)).toContain('class="fish-shadow"');
    expect(scene(classic)).not.toContain('angling-live-fish__orientation');
    for (const [state, marker] of [
      [start('baikal', 'camera', 'shelf', 'summer-open-water'), 'camera-marker'],
      [start('amazon', 'light', 'plants', 'rising-water'), 'incident-shadow'],
      [start('danube', 'gravel-drift', 'navigation', 'summer-navigation'), 'snag-shadow'],
      [start('danube', 'telemetry', 'navigation', 'summer-navigation'), 'receiver-marker'],
    ] as const) {
      expect(scene(state)).toContain(marker);
      expect(scene(state)).not.toContain('angling-live-fish__orientation');
    }
    const earlier = { ...pilots[0], lineResolved: true, gearId: 'light', zoneId: 'plants' };
    expect(scene(earlier)).toContain('Earlier field record');
    expect(scene(earlier)).not.toContain('angling-live-fish__orientation');
  });
});
