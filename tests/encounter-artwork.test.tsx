import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Handling, Debrief } from '../src/App';
import { FishingScene } from '../src/components/FishingScene';
import { getEncounterArtwork } from '../src/data/encounterArtwork';
import { liveFishSpriteByEncounterId } from '../src/data/liveFishSprites';
import { underwaterFishByEncounterId } from '../src/data/underwaterFish';
import { venues } from '../src/data/venues';
import { createInitialState, getIdealCastPower } from '../src/game/engine';
import { getUnderwaterFishFrameWidth, getUnderwaterFishPose, getUnderwaterLine, getUnderwaterMeshPoint } from '../src/game/underwaterMotion';
import type { ExpeditionState } from '../src/types';
import { legacyCastLine } from './helpers/fishing';

const noChange = () => { throw new Error('Artwork rendering must not change the journey'); };
const routes = [
  { venueId: 'florida-bay', habitat: 'seagrass', gear: 'flat', season: 'dry-salinity', subject: 'spotted-seatrout', label: 'Waterline encounter', purpose: 'waterline' },
  { venueId: 'amazon', habitat: 'plants', gear: 'light', season: 'rising-water', subject: 'river-turtle', label: 'Incidental encounter', purpose: 'incident' },
  { venueId: 'baikal', habitat: 'shelf', gear: 'camera', season: 'summer-open-water', subject: 'baikal-sponge', label: 'In-situ observation', purpose: 'observation' },
  { venueId: 'danube', habitat: 'navigation', gear: 'gravel-drift', season: 'summer-navigation', subject: 'mooring-snag', label: 'Equipment incident', purpose: 'habitat-care' },
  { venueId: 'galapagos', habitat: 'lava-shore', gear: 'shore-camera', season: 'cool-upwelling', subject: 'marine-iguana', label: 'In-situ observation', purpose: 'observation' },
];
function prepare(route: typeof routes[number]): ExpeditionState {
  const state: ExpeditionState = { ...createInitialState(), stage: 'habitat', venueId: route.venueId, zoneId: route.habitat, gearId: route.gear, seasonId: route.season, assistMode: true };
  const cast = legacyCastLine(state, getIdealCastPower(state));
  expect(cast.encounterId).toBe(route.subject);
  return cast;
}

describe('contextual encounter art', () => {
  it('illustrates all five authored routes with purpose-specific labels and response choices', () => {
    for (const route of routes) {
      const state = { ...prepare(route), stage: 'handling' as const, lineResolved: true };
      const venue = venues.find(item => item.id === route.venueId)!; const before = JSON.stringify(state);
      const art = getEncounterArtwork(state, venue)!;
      expect(art.purpose).toBe(route.purpose); expect(art.label).toBe(route.label);
      const html = renderToStaticMarkup(<Handling state={state} venue={venue} setState={noChange}/>);
      expect(html).toContain(art.src); expect(html).toContain(art.alt); expect(html).toContain(art.caption);
      expect(html).toContain(route.label); expect(html).not.toContain('supported after capture');
      for (const option of venue.encounters[route.subject].handling) expect(html).toContain(option.label);
      expect(JSON.stringify(state)).toBe(before);
    }
  });

  it('shows completion artwork for camera observations and incidents only after the loop resolves', () => {
    for (const route of routes) {
      const state = prepare(route); const venue = venues.find(item => item.id === route.venueId)!;
      const before = renderToStaticMarkup(<FishingScene state={state} venue={venue} paused={false}/>);
      expect(before).not.toContain('landed-reveal');
      const complete = { ...state, lineResolved: true };
      const html = renderToStaticMarkup(<FishingScene state={complete} venue={venue} paused={false}/>);
      expect(html).toContain('landed-reveal'); expect(html).toContain(getEncounterArtwork(complete, venue)!.caption);
      if (route.purpose !== 'waterline') expect(html).not.toContain('catch reconstruction');
    }
  });

  it('keeps illustrations neutral and shows an unsafe response truthfully on the postcard', () => {
    for (const route of routes) {
      const state = prepare(route); const venue = venues.find(item => item.id === route.venueId)!;
      const encounter = venue.encounters[route.subject];
      const safe = { ...state, lineResolved: true, handlingId: encounter.handling.find(option => option.safe)!.id };
      const unsafe = { ...safe, stage: 'debrief' as const, debriefChoice: 'identity-only' as const, handlingId: encounter.handling.find(option => !option.safe)!.id };
      expect(getEncounterArtwork(unsafe, venue)).toEqual(getEncounterArtwork(safe, venue));
      const html = renderToStaticMarkup(<Debrief state={unsafe} venue={venue} setState={noChange} onRepeat={noChange} onDestinations={noChange} onJournal={noChange}/>);
      expect(html).toContain(getEncounterArtwork(unsafe, venue)!.src); expect(html).toContain('Generated reconstruction');
      expect(html).toContain(route.purpose === 'waterline' ? 'Handling needs care' : 'Response needs review');
      expect(html).not.toContain('Careful handling'); expect(html).not.toContain('Careful response');
    }
  });

  it('does not repurpose a capture reconstruction for a receiver or unrelated field method', () => {
    const venue = venues.find(item => item.id === 'danube')!;
    const state: ExpeditionState = { ...createInitialState(), venueId: venue.id, encounterId: 'beluga-research', gearId: 'telemetry' };
    expect(getEncounterArtwork(state, venue)).toBeNull();
    const cameraRoute = prepare(routes[2]); const baikal = venues.find(item => item.id === 'baikal')!;
    expect(getEncounterArtwork({ ...cameraRoute, gearId: 'survey' }, baikal)).toBeNull();
  });

  it('uses honest habitat fallback for mismatched completed legacy routes and retains existing fish art', () => {
    const amazon = venues.find(item => item.id === 'amazon')!;
    const state: ExpeditionState = { ...createInitialState(), stage: 'habitat', venueId: 'amazon', gearId: 'surface', zoneId: 'roots', seasonId: 'rising-water' };
    const cast = legacyCastLine(state, getIdealCastPower(state));
    expect(getEncounterArtwork(cast, amazon)?.purpose).toBe('waterline');
    const oldRoute = { ...cast, lineResolved: true, encounterId: 'river-turtle', handlingId: 'pliers-release', stage: 'debrief' as const, debriefChoice: 'identity-only' as const };
    expect(getEncounterArtwork(oldRoute, amazon)).toBeNull();
    const html = renderToStaticMarkup(<Debrief state={oldRoute} venue={amazon} setState={noChange} onRepeat={noChange} onDestinations={noChange} onJournal={noChange}/>);
    expect(html).toContain(amazon.habitatImage); expect(html).toContain('habitat panorama');
    expect(html).not.toContain('river-turtle-waterline-v1.webp');
  });
});

describe('live fish sprite framing', () => {
  it('uses preserved fish artwork and its own mouth anchors in submerged Florida fights', () => {
    const starts = [
      { ...createInitialState(), stage: 'habitat' as const, venueId: 'florida-bay', gearId: 'roots', zoneId: 'creek', seasonId: 'spring-exchange' },
      { ...createInitialState(), stage: 'habitat' as const, venueId: 'florida-bay', gearId: 'flat', zoneId: 'seagrass', seasonId: 'dry-salinity' },
    ];
    for (const start of starts) {
      const state = { ...legacyCastLine(start, getIdealCastPower(start)), anglingBeat: 11, interactionProgress: 36 };
      const venue = venues.find(item => item.id === state.venueId)!;
      const pose = getUnderwaterFishPose(state, venue), before = JSON.stringify(state);
      const fish = underwaterFishByEncounterId[state.encounterId!];
      const sprite = liveFishSpriteByEncounterId[state.encounterId as 'common-snook' | 'spotted-seatrout'];
      const html = renderToStaticMarkup(<FishingScene state={state} venue={venue} paused={false} engaged/>);
      const paused = renderToStaticMarkup(<FishingScene state={state} venue={venue} paused/>);
      expect(fish.side!.src).toBe(sprite.src); expect(fish.side!.aspectRatio).toBe(sprite.aspectRatio);
      expect(fish.oblique!.src).toBe(sprite.oblique.src); expect(fish.turn!.src).toBe(sprite.turn.src);
      for (const markup of [html, paused]) {
        expect(markup).toContain(`data-mouth-x="${pose.x}" data-mouth-y="${pose.y}"`);
        expect(markup).toContain(`data-species="${state.encounterId}"`); expect(markup).toContain('underwater-fight-canvas');
        expect(markup).toContain('data-motion-source="saved-encounter"');
        expect(markup).not.toContain(venue.habitatImage); expect(markup).not.toContain('landed-reveal');
      }
      const width = getUnderwaterFishFrameWidth(pose, 390, 350);
      expect(width).toBeGreaterThan(0);
      for (const frame of [fish.side!, fish.oblique!, fish.turn!]) {
        const frameWidth = width * frame.widthScale, frameHeight = frameWidth / frame.aspectRatio;
        expect(frameWidth / frameHeight).toBeCloseTo(frame.aspectRatio);
        expect(getUnderwaterMeshPoint(frame.mouthX / 100, frame.mouthY / 100, frameWidth, frameHeight, frame.mouthX, frame.mouthY, pose)).toEqual({ x: 0, y: 0 });
      }
      expect(getUnderwaterLine(pose, 390, 350)!.end).toEqual({ x: pose.x * 390 / 100, y: pose.y * 350 / 100 });
      expect(html).not.toContain('angling-boat'); expect(html).not.toContain('angling-crew');
      expect(html).not.toContain('angling-live-fish__piece'); expect(html).not.toContain('class="fish-shadow"');
      expect(JSON.stringify(state)).toBe(before);
    }
  });
});
