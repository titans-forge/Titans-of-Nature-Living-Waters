import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { UnderwaterFishingScene } from '../src/components/UnderwaterFishingScene';
import { underwaterFishByEncounterId } from '../src/data/underwaterFish';
import { venueById, venues } from '../src/data/venues';
import { createInitialState } from '../src/game/engine';
import { getSkillFishingBehavior, getSkillFishingCue } from '../src/game/skillFishing';
import { getUnderwaterFishFrameWidth, getUnderwaterFishPose, getUnderwaterLine, getUnderwaterMeshPoint, getUnderwaterTexturePoint, supportsUnderwaterFishing } from '../src/game/underwaterMotion';
import type { ExpeditionState, Venue } from '../src/types';

function subject(venue: Venue, encounterId: string): ExpeditionState {
  return { ...createInitialState(), stage: 'cast', venueId: venue.id, gearId: venue.gearSets.find(gear => gear.method === 'angling')?.id ?? venue.gearSets[0].id,
    encounterId, zoneId: venue.habitats[0].id, castPower: null, anglingRules: 'classic', lineTurn: 15, fightPhase: 'run', phaseProgress: 3 };
}

describe('species-aware underwater rendering', () => {
  it('covers genuine fish subjects while camera, telemetry, and incidental animals keep their original interaction', () => {
    const seen = new Set<string>();
    for (const venue of venues) {
      for (const encounter of Object.values(venue.encounters)) {
        const state = subject(venue, encounter.id);
        const target = encounter.type === 'fish' && !encounter.interaction && venue.gearSets.some(gear => gear.method === 'angling');
        expect(supportsUnderwaterFishing(state, venue), `${venue.id}:${encounter.id}`).toBe(target);
        if (target) seen.add(encounter.id);
        for (const gear of venue.gearSets.filter(gear => gear.method !== 'angling')) {
          expect(supportsUnderwaterFishing({ ...state, gearId: gear.id }, venue)).toBe(false);
        }
      }
    }
    expect(seen.size).toBe(45);
    expect(Object.keys(underwaterFishByEncounterId).sort()).toEqual([...seen].sort());
  });

  it('uses different depth, waveform, and silhouette families rather than copying bass behavior everywhere', () => {
    const cases = [['amazon', 'peacock-bass'], ['tonle-sap', 'giant-snakehead'], ['alaska-kelp', 'pacific-halibut'], ['danube', 'beluga-research'], ['great-barrier-reef', 'spanish-mackerel'], ['nile', 'nile-tilapia']];
    const definitions = cases.map(([, id]) => underwaterFishByEncounterId[id]);
    expect(new Set(definitions.map(fish => fish.behavior)).size).toBe(6);
    const poses = cases.map(([venueId, id]) => getUnderwaterFishPose(subject(venueById[venueId], id), venueById[venueId]));
    expect(poses[2].y).toBeGreaterThan(poses[0].y);
    expect(poses[3].y).toBeGreaterThan(poses[5].y);
    expect(poses[1].bend).toBeGreaterThan(poses[2].bend);
    expect(poses[4].tailPhase).not.toBe(poses[3].tailPhase);
    for (const fish of Object.values(underwaterFishByEncounterId)) expect(fish.behavior, fish.id).toBe(getSkillFishingBehavior(fish.id));
  });

  it('binds visible cover approach and overhead line angle to the saved away-side rod choice', () => {
    for (const venue of [venueById.amazon, venueById['florida-bay'], venueById['yellow-river-delta']]) {
      const encounterId = Object.keys(venue.encounters).find(id => underwaterFishByEncounterId[id])!;
      for (const habitat of venue.habitats.filter(habitat => habitat.position !== 'center')) {
        let state = { ...subject(venue, encounterId), zoneId: habitat.id, anglingRules: 'habitat-v2' as const, interactionProgress: 50, anglingBeat: 0 };
        for (let beat = 0; beat < 100; beat++) {
          state = { ...state, anglingBeat: beat };
          const cue = getSkillFishingCue(state, venue)!;
          if (cue.id === 'cover' && cue.elapsed === 6) break;
        }
        const cue = getSkillFishingCue(state, venue)!;
        expect(cue.needsRodSide).toBe(true);
        const correct = getUnderwaterFishPose({ ...state, rodSide: cue.requiredRodSide }, venue);
        const wrong = getUnderwaterFishPose({ ...state, rodSide: cue.coverSide }, venue);
        if (cue.coverSide === 'left') expect(correct.x).toBeGreaterThan(wrong.x);
        else expect(correct.x).toBeLessThan(wrong.x);
        expect(correct.clock).toBe(state.anglingBeat);
        const line = getUnderwaterLine(correct, 1000, 600)!;
        expect(line.start.x).toBe(cue.requiredRodSide === 'left' ? 270 : 410);
        expect(line.end.x).toBeCloseTo(correct.x * 10);
        const html = renderToStaticMarkup(<UnderwaterFishingScene state={{ ...state, rodSide: cue.requiredRodSide }} venue={venue} paused={false}/>);
        expect(html).toContain(`data-cover-side="${cue.coverSide}"`);
        expect(html).toContain('data-steering="away-from-cover"');
      }
    }
  });

  it('samples an atlas cell without stretching or sampling the neighboring species', () => {
    const frame = { sourceRect: { x: 1024, y: 512, width: 320, height: 160 } };
    expect(getUnderwaterTexturePoint(frame, 0, 0, 2048, 2048)).toEqual({ x: 1024, y: 512 });
    expect(getUnderwaterTexturePoint(frame, 1, 1, 2048, 2048)).toEqual({ x: 1344, y: 672 });
    expect(getUnderwaterTexturePoint(frame, .5, .5, 2048, 2048)).toEqual({ x: 1184, y: 592 });
    expect(getUnderwaterTexturePoint({}, .5, .5, 768, 480)).toEqual({ x: 384, y: 240 });
  });

  it('keeps all family meshes joined at the mouth and free of folded triangles', () => {
    const cross = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    for (const fish of Object.values(underwaterFishByEncounterId)) {
      const venue = venues.find(venue => venue.encounters[fish.id])!;
      const base = getUnderwaterFishPose(subject(venue, fish.id), venue);
      for (let phase = 0; phase < 8; phase++) {
        const pose = { ...base, tailPhase: phase * Math.PI / 4, bend: .125 * fish.bendScale };
        const frames = [{ frame: fish.side ?? { aspectRatio: fish.aspectRatio, mouthX: 98, mouthY: 50, widthScale: 1 }, strength: 1 },
          ...(fish.oblique ? [{ frame: fish.oblique, strength: .45 }] : []), ...(fish.turn ? [{ frame: fish.turn, strength: .15 }] : [])];
        for (const { frame, strength } of frames) {
          const width = 300 * frame.widthScale, height = width / frame.aspectRatio;
          expect(getUnderwaterMeshPoint(frame.mouthX / 100, frame.mouthY / 100, width, height, frame.mouthX, frame.mouthY, pose, strength)).toEqual({ x: 0, y: 0 });
          const vertex = (u: number, v: number) => getUnderwaterMeshPoint(u, v, width, height, frame.mouthX, frame.mouthY, pose, strength);
          for (let column = 0; column < 26; column++) for (let row = 0; row < 3; row++) {
            const a = vertex(column / 26, row / 3), b = vertex((column + 1) / 26, row / 3), c = vertex((column + 1) / 26, (row + 1) / 3), d = vertex(column / 26, (row + 1) / 3);
            expect(cross(a, b, c), fish.id).toBeGreaterThan(0); expect(cross(a, c, d), fish.id).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('bounds every available true view and both mirrored profiles, with no size jump during turns', () => {
    for (const fish of Object.values(underwaterFishByEncounterId)) {
      const venue = venues.find(venue => venue.encounters[fish.id])!;
      const base = getUnderwaterFishPose(subject(venue, fish.id), venue);
      for (const [sceneWidth, sceneHeight] of [[390, 350], [740, 260], [1100, 650]]) {
        for (const [x, y] of [[79, 61], [38, 29], [44, 76]]) {
          const pose = { ...base, x, y, pitch: -.16, tailPhase: 1.2 };
          const width = getUnderwaterFishFrameWidth(pose, sceneWidth, sceneHeight);
          expect(getUnderwaterFishFrameWidth({ ...pose, facing: -1 }, sceneWidth, sceneHeight)).toBe(width);
          expect(getUnderwaterFishFrameWidth({ ...pose, facing: 1 }, sceneWidth, sceneHeight)).toBe(width);
          const margin = Math.min(sceneWidth, sceneHeight) * .025;
          const frames = [{ frame: fish.side ?? { aspectRatio: fish.aspectRatio, mouthX: 98, mouthY: 50, widthScale: 1 }, strength: 1, mirrors: [-1, 1] },
            ...(fish.oblique ? [{ frame: fish.oblique, strength: .45, mirrors: [-1, 1] }] : []), ...(fish.turn ? [{ frame: fish.turn, strength: .15, mirrors: [1] }] : [])];
          for (const { frame, strength, mirrors } of frames) for (const mirror of mirrors) for (let column = 0; column <= 26; column++) for (let row = 0; row <= 3; row++) {
            const point = getUnderwaterMeshPoint(column / 26, row / 3, width * frame.widthScale, width * frame.widthScale / frame.aspectRatio, frame.mouthX, frame.mouthY, pose, strength);
            const px = x * sceneWidth / 100 + point.x * mirror * Math.cos(pose.pitch) - point.y * Math.sin(pose.pitch);
            const py = y * sceneHeight / 100 + point.x * mirror * Math.sin(pose.pitch) + point.y * Math.cos(pose.pitch);
            expect(px, fish.id).toBeGreaterThanOrEqual(margin - .00001); expect(px, fish.id).toBeLessThanOrEqual(sceneWidth - margin + .00001);
            expect(py, fish.id).toBeGreaterThanOrEqual(margin - .00001); expect(py, fish.id).toBeLessThanOrEqual(sceneHeight - margin + .00001);
          }
        }
      }
    }
  });

  it('keeps legacy clock, reload pose, landing, and species identity literal', () => {
    const venue = venueById['alaska-kelp'];
    const state = subject(venue, 'pacific-halibut');
    const before = structuredClone(state);
    const pose = getUnderwaterFishPose(state, venue);
    expect(pose.clock).toBe(state.lineTurn);
    expect(pose.speciesId).toBe('pacific-halibut');
    expect(getUnderwaterFishPose(structuredClone(state), venue)).toEqual(pose);
    const html = renderToStaticMarkup(<UnderwaterFishingScene state={state} venue={venue} paused={true} ready={false} habitatSrc="/test/alaska.webp"/>);
    expect(html).toContain('data-species="pacific-halibut"'); expect(html).toContain('data-fish-family="flatfish"'); expect(html).toContain('Fish hooked');
    expect(html).not.toContain('Amazon ·'); expect(state).toEqual(before);
    const resolved = getUnderwaterFishPose({ ...state, lineResolved: true, interactionProgress: 100 }, venue);
    expect(getUnderwaterLine(resolved, 740, 260)).toBeNull();
  });
});
