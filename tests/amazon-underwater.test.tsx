import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CastGame } from '../src/components/CastGame';
import { FishingScene } from '../src/components/FishingScene';
import { getEncounterArtwork } from '../src/data/encounterArtwork';
import { liveFishSpriteByEncounterId } from '../src/data/liveFishSprites';
import { venueById, venues } from '../src/data/venues';
import { getAnglingCue, getAnglingWindow, getPilotSpecies } from '../src/game/angling';
import {
  advanceAssistedInteraction, advanceInteraction, askQuestion, beginQuestions,
  castLine, createInitialState, finishGear, finishQuestions, getRecommendedEngagement,
  handleEncounter, hasLostFish, retryFish, revealEncounter, selectGear, selectHabitat, selectVenue,
} from '../src/game/engine';
import { getInteractionKind, hasEarlierCompletedEncounter } from '../src/game/interactions';
import { parseExpedition, serializeExpedition, validateExpedition } from '../src/game/save';
import { getAmazonUnderwaterPose, getUnderwaterFishFrameWidth, getUnderwaterLine, getUnderwaterMeshPoint, interpolateUnderwaterPose, supportsAmazonUnderwater, supportsUnderwaterFishing } from '../src/game/underwaterMotion';
import type { ExpeditionState, Venue } from '../src/types';

const amazon = venueById.amazon;
const noChange = () => { throw new Error('Presentation must not advance an encounter'); };

function nativeCast(venueId = 'amazon', gearId = 'surface', habitatId = 'roots', seasonIndex = 0): ExpeditionState {
  const venue = venueById[venueId];
  let state = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { [venueId]: seasonIndex } }, venueId));
  const informed = venue.informedQuestionByZone[habitatId];
  state = askQuestion(askQuestion(state, informed), venue.questions.find(question => question.id !== informed)!.id);
  const cast = castLine(selectHabitat(finishGear(selectGear(finishQuestions(state), gearId)), habitatId), venue.idealPower[habitatId]);
  // Preserve explicit v1 encounter fixtures: new casts opt into v2, while this
  // suite proves the original pilot's saved rules remain playable unchanged.
  return getPilotSpecies(cast, venue) && getInteractionKind(cast, venue) === 'fish' ? { ...cast, anglingRules: 'habitat-v1', rodSide: 'center' } : cast;
}

function scene(state: ExpeditionState, paused = false, engaged = false, ready = true, venue: Venue = venueById[state.venueId!]) {
  return renderToStaticMarkup(<FishingScene state={state} venue={venue} paused={paused} engaged={engaged} ready={ready}/>);
}
function game(state: ExpeditionState, paused = false) {
  return renderToStaticMarkup(<CastGame state={state} venue={venueById[state.venueId!]} setState={noChange} paused={paused} layoutNotice=""/>);
}

describe('bounded Amazon underwater pilot', () => {
  it('selects only genuine new-rule Amazon peacock fights across every authored cast route', () => {
    let supported = 0;
    const kinds = new Set<string>();
    for (const venue of venues) {
      for (let seasonIndex = 0; seasonIndex < venue.seasons.length; seasonIndex++) {
        for (const habitat of venue.habitats.filter(item => item.safe !== false)) {
          for (const gear of venue.gearSets) {
            const state = nativeCast(venue.id, gear.id, habitat.id, seasonIndex);
            const kind = getInteractionKind(state, venue); kinds.add(kind);
            const expected = venue.id === 'amazon' && state.encounterId === 'peacock-bass'
              && state.anglingRules === 'habitat-v1' && kind === 'fish';
            const name = `${venue.id}/${state.seasonId}/${habitat.id}/${gear.id}`;
            expect(supportsAmazonUnderwater(state, venue), name).toBe(expected);
            if (expected) supported++;
            else if (!supportsUnderwaterFishing(state, venue)) expect(scene(state), name).not.toContain('data-motion-source="saved-encounter"');
          }
        }
      }
    }
    expect(supported).toBeGreaterThan(0);
    expect(kinds).toEqual(new Set(['fish', 'bycatch', 'snag', 'camera', 'telemetry', 'sampling']));
  });

  it('preserves classic rules while incompatible earlier records and incidental subjects stay outside the underwater renderer', () => {
    const cast = nativeCast();
    expect(cast.encounterId).toBe('peacock-bass');
    const classic = { ...cast, anglingRules: 'classic' as const };
    expect(supportsAmazonUnderwater(classic, amazon)).toBe(false);
    expect(scene(classic)).toContain('data-motion-source="saved-encounter"');
    expect(getAmazonUnderwaterPose(classic, amazon).clock).toBe(classic.lineTurn);
    const earlier = { ...cast, gearId: 'light', lineResolved: true };
    expect(hasEarlierCompletedEncounter(earlier, amazon)).toBe(true);
    expect(supportsAmazonUnderwater(earlier, amazon)).toBe(false);
    expect(scene(earlier)).toContain('Earlier field record');
    expect(scene(earlier)).not.toContain('data-motion-source="saved-encounter"');
    for (const state of [nativeCast('amazon', 'light', 'plants'), nativeCast('amazon', 'balanced', 'roots')]) {
      expect(supportsAmazonUnderwater(state, amazon)).toBe(false);
      expect(scene(state)).not.toContain('data-motion-source="saved-encounter"');
    }
    const giant = nativeCast('amazon', 'arapaima-kit', 'roots');
    expect(supportsAmazonUnderwater(giant, amazon)).toBe(false);
    expect(scene(giant)).toContain('data-species="arapaima"');
    expect(supportsAmazonUnderwater(cast, venueById['florida-bay'])).toBe(false);
    // Explicit incident classification must win even when an encounter shares
    // the pilot subject's ID and angling kit.
    const incidental = { ...amazon, encounters: { ...amazon.encounters, 'peacock-bass': { ...amazon.encounters['peacock-bass'], interaction: 'bycatch' as const } } };
    expect(supportsAmazonUnderwater(cast, incidental)).toBe(false);
  });

  it('shows the submerged view before readiness without advancing or changing the saved encounter', () => {
    const state = Object.freeze(nativeCast()); const before = serializeExpedition(state);
    const html = game(state);
    expect(html).toContain('data-motion-source="saved-encounter"');
    expect(html).toContain('data-underwater-phase="ready"');
    expect(html).toContain('class="underwater-fight-canvas" aria-hidden="true"');
    expect(html).toContain('Ready when you are'); expect(html).toContain('Timer paused');
    expect(html).toContain('Start fishing'); expect(html).toContain('HOLD:'); expect(html).toContain('RELEASE:');
    expect(html).not.toContain('class="angling-rod');
    expect(html).not.toContain(amazon.habitatImage);
    expect(serializeExpedition(state)).toBe(before);
    expect(validateExpedition(state)).toBe(true);
    const restored = parseExpedition(before);
    expect(restored).toMatchObject({ ok: true, migrated: false, state });
    if (restored.ok) expect(game(restored.state)).toBe(html);
  });

  it('keeps the saved mouth and behavior cue stable across pause, held input and reload', () => {
    let state = nativeCast();
    for (let tick = 0; tick < 21; tick++) state = advanceInteraction(state, getRecommendedEngagement(state));
    const frozen = Object.freeze(state); const raw = serializeExpedition(frozen);
    const pose = getAmazonUnderwaterPose(frozen, amazon);
    const window = getAnglingWindow(frozen, amazon)!;
    for (const html of [scene(frozen, false, true), scene(frozen, true), scene(frozen, true, true)]) {
      expect(html).toContain(`data-mouth-x="${pose.x}"`); expect(html).toContain(`data-mouth-y="${pose.y}"`);
      expect(html).toContain(window.label); expect(html).toContain(window.instruction);
      const cue = getAnglingCue(window); if (cue) expect(html).toContain(cue);
    }
    const restored = parseExpedition(raw); expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(getAmazonUnderwaterPose(restored.state, amazon)).toEqual(pose);
      expect(scene(restored.state, true)).toBe(scene(frozen, true));
    }
    expect(game({ ...frozen, assistMode: true }, true)).toMatch(/interaction-control--assist" disabled=""/);
    expect(serializeExpedition(frozen)).toBe(raw);
  });

  it('retains one-response assistance and a genuine waterline completion without duplicate observations', () => {
    let state = { ...nativeCast(), assistMode: true };
    for (let response = 0; response < 40 && !state.lineResolved; response++) {
      const window = getAnglingWindow(state, amazon)!;
      const html = game(state);
      expect(html).toContain(`CREW RESPONSE · ${window.instruction}`);
      expect(html).toContain('One tap applies this response for one window.');
      expect(scene(state)).not.toContain('landed-reveal');
      state = advanceAssistedInteraction(state);
      expect(validateExpedition(state)).toBe(true);
    }
    expect(state.lineResolved).toBe(true); expect(state.interactionMistakes).toBe(0);
    const art = getEncounterArtwork(state, amazon)!; const html = game(state);
    expect(html).toContain('landed-reveal'); expect(html).toContain(art.src); expect(html).toContain(art.caption);
    expect(html).toContain('data-underwater-phase="landed"'); expect(html).toContain('data-line-visible="false"');
    expect(html).toContain('Handle the encounter');
    const pose = getAmazonUnderwaterPose(state, amazon);
    expect(getUnderwaterLine(pose, 1000, 600)).toBeNull();
    const option = amazon.encounters[state.encounterId!].handling.find(item => item.safe)!;
    const recorded = handleEncounter(revealEncounter(state), option.id);
    expect(recorded.observations).toHaveLength(1);
    expect(handleEncounter(recorded, option.id)).toBe(recorded);
    expect(parseExpedition(serializeExpedition(recorded))).toMatchObject({ ok: true, migrated: false, state: recorded });
  });

  it('disconnects a broken line and preserves the existing retry identity and mistakes', () => {
    let lost = nativeCast();
    for (let tick = 0; tick < 60 && !hasLostFish(lost); tick++) lost = advanceInteraction(lost, true);
    expect(hasLostFish(lost)).toBe(true);
    const raw = serializeExpedition(lost); const html = game(lost);
    expect(html).toContain('The line broke'); expect(html).toContain('Retry timed'); expect(html).toContain('Retry with untimed crew');
    expect(html).toContain('data-underwater-phase="lost"'); expect(html).toContain('data-line-visible="false"');
    expect(getUnderwaterLine(getAmazonUnderwaterPose(lost, amazon), 1000, 600)).toBeNull();
    expect(serializeExpedition(lost)).toBe(raw);
    const retry = retryFish(lost);
    expect(retry).toMatchObject({ encounterId: lost.encounterId, gearId: lost.gearId, zoneId: lost.zoneId,
      interactionMistakes: lost.interactionMistakes, castAttempts: lost.castAttempts, fieldcraft: lost.fieldcraft,
      observations: lost.observations, journalIds: lost.journalIds, anglingBeat: 0, interactionProgress: 0 });
    expect(supportsAmazonUnderwater(retry, amazon)).toBe(true);
    expect(game(retry)).toContain('Start fishing');
    expect(validateExpedition(retry)).toBe(true);
  });
});

describe('submerged fish geometry', () => {
  const sprite = liveFishSpriteByEncounterId['peacock-bass'];
  const artworkFrames = [
    { widthScale: 1, aspectRatio: sprite.aspectRatio, mouthX: sprite.mouthX, mouthY: sprite.mouthY, strength: 1, mirrored: true },
    { ...sprite.oblique, strength: .45, mirrored: true },
    { ...sprite.turn, strength: .15, mirrored: false },
  ];

  it('keeps the mouth anchored while continuous body deformation never folds a textured triangle', () => {
    const start = nativeCast();
    const area = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
      (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    for (let beat = 0; beat < 88; beat += 2) {
      const pose = getAmazonUnderwaterPose({ ...start, anglingBeat: beat, interactionProgress: 35 }, amazon);
      for (const art of artworkFrames) {
        const width = 350 * art.widthScale, height = width / art.aspectRatio;
        const point = (u: number, v: number) => getUnderwaterMeshPoint(u, v, width, height, art.mouthX, art.mouthY, pose, art.strength);
        expect(point(art.mouthX / 100, art.mouthY / 100)).toEqual({ x: 0, y: 0 });
        for (let column = 0; column < 26; column++) {
          for (let row = 0; row < 3; row++) {
            const a = point(column / 26, row / 3), b = point((column + 1) / 26, row / 3);
            const c = point((column + 1) / 26, (row + 1) / 3), d = point(column / 26, (row + 1) / 3);
            expect(area(a, b, c)).toBeGreaterThan(0); expect(area(a, c, d)).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('fits the whole pitched and deformed fish in phone, short landscape and desktop scenes', () => {
    const start = nativeCast();
    for (const progress of [0, 78, 95, 100]) {
      for (let beat = 0; beat < 88; beat += 4) {
        const pose = getAmazonUnderwaterPose({ ...start, anglingBeat: beat, interactionProgress: progress }, amazon);
        for (const [sceneWidth, sceneHeight] of [[1100, 650], [390, 350], [740, 260]]) {
          const frameWidth = getUnderwaterFishFrameWidth(pose, sceneWidth, sceneHeight);
          expect(frameWidth).toBeGreaterThan(0);
          const margin = Math.min(sceneWidth, sceneHeight) * .025;
          const cos = Math.cos(pose.pitch), sin = Math.sin(pose.pitch);
          for (const art of artworkFrames) {
            const width = frameWidth * art.widthScale, height = width / art.aspectRatio;
            const mirror = art.mirrored && pose.facing < 0 ? -1 : 1;
            for (let column = 0; column <= 26; column++) {
              for (let row = 0; row <= 3; row++) {
                const point = getUnderwaterMeshPoint(column / 26, row / 3, width, height, art.mouthX, art.mouthY, pose, art.strength);
                const x = sceneWidth * pose.x / 100 + point.x * mirror * cos - point.y * sin;
                const y = sceneHeight * pose.y / 100 + point.x * mirror * sin + point.y * cos;
                expect(x).toBeGreaterThanOrEqual(margin - .000001); expect(x).toBeLessThanOrEqual(sceneWidth - margin + .000001);
                expect(y).toBeGreaterThanOrEqual(margin - .000001); expect(y).toBeLessThanOrEqual(sceneHeight - margin + .000001);
              }
            }
          }
        }
      }
    }
  });

  it('keeps fish size continuous when the front-view yaw crosses zero near the right frame edge', () => {
    const saved = getAmazonUnderwaterPose(nativeCast(), amazon);
    for (const [width, height] of [[832, 650], [390, 350]]) {
      for (const pitch of [-.16, 0, .16]) {
        for (const tailPhase of [0, Math.PI / 2, Math.PI]) {
          const pose = { ...saved, x: 79, y: 61, pitch, tailPhase };
          const widths = [-.0001, 0, .0001].map(facing => getUnderwaterFishFrameWidth({ ...pose, facing }, width, height));
          expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(.000001);
          expect(widths.every(value => value > 0 && Number.isFinite(value))).toBe(true);
        }
      }
    }
  });

  it.each([[390, 350], [740, 260], [1100, 650]])('derives the live nose from pixel travel in a %sx%s scene', (width, height) => {
    const viewport = { width, height };
    let state = nativeCast();
    let previous = getAmazonUnderwaterPose(state, amazon, undefined, viewport);
    let measured = 0;
    for (let tick = 0; tick < 600 && !state.lineResolved; tick++) {
      state = advanceInteraction(state, getRecommendedEngagement(state));
      const current = getAmazonUnderwaterPose(state, amazon, previous, viewport);
      const dx = (current.x - previous.x) * width / 100, dy = (current.y - previous.y) * height / 100;
      const distance = Math.hypot(dx, dy);
      if (!state.lineResolved && distance > .1) {
        const forward = (dx * Math.cos(current.heading) + dy * Math.sin(current.heading)) / distance;
        expect(forward, `beat ${state.anglingBeat} at ${width}x${height}`).toBeCloseTo(1, 10);
        if (Math.abs(current.facing) > .4 && Math.abs(dx) > .01) expect(dx * current.facing).toBeGreaterThan(0);
        measured++;
      }
      previous = current;
    }
    expect(state.lineResolved).toBe(true); expect(measured).toBeGreaterThan(25);
  });

  it.each(['clean', 'occasional missed response'] as const)('faces along actual %s travel and turns before reversing movement', scenario => {
    let state = nativeCast();
    let previous = getAmazonUnderwaterPose(state, amazon);
    let measured = 0;
    for (let tick = 0; tick < 600 && !state.lineResolved && !hasLostFish(state); tick++) {
      const recommended = getRecommendedEngagement(state);
      state = advanceInteraction(state, scenario !== 'clean' && tick % 17 === 5 ? !recommended : recommended);
      // This is the renderer's live orientation input. Reload has the same
      // canonical saved mouth/cue, but no previous display trajectory to face.
      const current = getAmazonUnderwaterPose(state, amazon, previous);
      if (!state.lineResolved && !hasLostFish(state)) {
        const dx = current.x - previous.x, dy = current.y - previous.y;
        const distance = Math.hypot(dx, dy);
        if (distance > .05) {
          const forward = (dx * Math.cos(current.heading) + dy * Math.sin(current.heading)) / distance;
          expect(forward, `beat ${state.anglingBeat}: displacement ${dx},${dy} with heading ${current.heading}`).toBeGreaterThan(0);
          if (Math.abs(current.facing) > .4 && Math.abs(dx) > .01) expect(dx * current.facing).toBeGreaterThan(0);
          measured++;
        }
        let frameBefore = previous;
        for (let frame = 1; frame <= 20; frame++) {
          const view = interpolateUnderwaterPose(previous, current, frame / 20);
          const frameDx = view.x - frameBefore.x;
          // The genuine front view can turn while stationary. Once a side or
          // oblique view travels again its nose must agree with screen motion.
          if (Math.abs(frameDx) > .005 && Math.abs(view.facing) > .4) {
            expect(frameDx * view.facing, `beat ${state.anglingBeat}, frame ${frame}`).toBeGreaterThan(0);
          }
          frameBefore = view;
        }
      }
      previous = current;
    }
    expect(state.lineResolved).toBe(true);
    expect(measured).toBeGreaterThan(25);
    if (scenario !== 'clean') expect(state.interactionMistakes).toBeGreaterThan(0);
  });

  it('keeps the mouth inside the water frame and line joined at desktop and phone aspect ratios', () => {
    const start = nativeCast();
    for (const progress of [0, 25, 50, 75, 95]) {
      for (let beat = 0; beat < 130; beat++) {
        const pose = getAmazonUnderwaterPose({ ...start, anglingBeat: beat, lineTurn: beat, interactionProgress: progress }, amazon);
        for (const value of [pose.x, pose.y, pose.heading, pose.pitch, pose.bend, pose.tailPhase, pose.scale, pose.load]) expect(Number.isFinite(value)).toBe(true);
        expect(pose.x).toBeGreaterThan(0); expect(pose.x).toBeLessThan(100);
        expect(pose.y).toBeGreaterThan(0); expect(pose.y).toBeLessThan(100);
        expect(Math.cos(pose.pitch)).toBeGreaterThan(.9);
        for (const [width, height] of [[1100, 650], [390, 350], [740, 260]]) {
          const line = getUnderwaterLine(pose, width, height)!;
          expect(line.end.x).toBeCloseTo(pose.x * width / 100, 8);
          expect(line.end.y).toBeCloseTo(pose.y * height / 100, 8);
          expect(line.start.y).toBeLessThan(line.end.y);
        }
      }
    }
  });

  it('interpolates saved positions without teleporting or overshooting an assisted response', () => {
    const start = nativeCast(); const next = advanceAssistedInteraction(start);
    const from = getAmazonUnderwaterPose(start, amazon), to = getAmazonUnderwaterPose(next, amazon);
    expect(interpolateUnderwaterPose(from, to, 0)).toEqual(from);
    expect(interpolateUnderwaterPose(from, to, 1)).toEqual(to);
    let previous = from;
    for (let frame = 1; frame <= 100; frame++) {
      const pose = interpolateUnderwaterPose(from, to, frame / 100);
      expect(pose.x).toBeGreaterThanOrEqual(Math.min(from.x, to.x)); expect(pose.x).toBeLessThanOrEqual(Math.max(from.x, to.x));
      expect(pose.y).toBeGreaterThanOrEqual(Math.min(from.y, to.y)); expect(pose.y).toBeLessThanOrEqual(Math.max(from.y, to.y));
      expect(Math.abs(pose.x - previous.x)).toBeLessThan(1);
      expect(Math.abs(pose.y - previous.y)).toBeLessThan(1);
      expect(Math.cos(pose.pitch)).toBeGreaterThan(.9);
      previous = pose;
    }
  });
});
