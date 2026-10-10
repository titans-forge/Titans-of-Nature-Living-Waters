import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Handling, Debrief } from '../src/App';
import { FishingScene } from '../src/components/FishingScene';
import { getEncounterArtwork } from '../src/data/encounterArtwork';
import { liveFishSpriteByEncounterId } from '../src/data/liveFishSprites';
import { venues } from '../src/data/venues';
import { castLine, createInitialState, getIdealCastPower } from '../src/game/engine';
import { getAnglingWindow } from '../src/game/angling';
import { getLiveFishMotion } from '../src/game/fishMotion';
import type { ExpeditionState } from '../src/types';

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
  const cast = castLine(state, getIdealCastPower(state));
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
    const cast = castLine(state, getIdealCastPower(state));
    expect(getEncounterArtwork(cast, amazon)?.purpose).toBe('waterline');
    const oldRoute = { ...cast, lineResolved: true, encounterId: 'river-turtle', handlingId: 'pliers-release', stage: 'debrief' as const, debriefChoice: 'identity-only' as const };
    expect(getEncounterArtwork(oldRoute, amazon)).toBeNull();
    const html = renderToStaticMarkup(<Debrief state={oldRoute} venue={amazon} setState={noChange} onRepeat={noChange} onDestinations={noChange} onJournal={noChange}/>);
    expect(html).toContain(amazon.habitatImage); expect(html).toContain('habitat panorama');
    expect(html).not.toContain('river-turtle-waterline-v1.webp');
  });
});

describe('live fish sprite framing', () => {
  it('preserves natural image aspect, saved pose and a silhouette until decode', () => {
    const starts = [
      { ...createInitialState(), stage: 'habitat' as const, venueId: 'amazon', gearId: 'surface', zoneId: 'roots', seasonId: 'rising-water' },
      { ...createInitialState(), stage: 'habitat' as const, venueId: 'florida-bay', gearId: 'roots', zoneId: 'creek', seasonId: 'spring-exchange' },
      { ...createInitialState(), stage: 'habitat' as const, venueId: 'florida-bay', gearId: 'flat', zoneId: 'seagrass', seasonId: 'dry-salinity' },
    ];
    for (const start of starts) {
      const state = { ...castLine(start, getIdealCastPower(start)), anglingBeat: 11, interactionProgress: 36 };
      const venue = venues.find(item => item.id === state.venueId)!; const window = getAnglingWindow(state, venue)!;
      const pose = getLiveFishMotion(state, window.species, window, getAnglingWindow({ ...state, anglingBeat: Math.max(0, state.anglingBeat - window.elapsed - 1) }, venue));
      const sprite = liveFishSpriteByEncounterId[window.species];
      const html = renderToStaticMarkup(<FishingScene state={state} venue={venue} paused={false} engaged/>);
      const paused = renderToStaticMarkup(<FishingScene state={state} venue={venue} paused/>);
      expect(html).toContain(sprite.src); expect(html).toContain('angling-live-fish__fallback');
      expect(html).toContain(`left:${pose.x}%;top:${pose.y}%;aspect-ratio:${sprite.aspectRatio}`);
      expect(paused).toContain(`left:${pose.x}%;top:${pose.y}%;aspect-ratio:${sprite.aspectRatio}`);
      expect(html).toContain(`transform-origin:${sprite.mouthX}% ${sprite.mouthY}%`);
      expect(html).toContain('decoding="async" draggable="false"');
      expect(html).not.toContain('angling-boat'); expect(html).not.toContain('angling-crew');
      expect(html).not.toContain('angling-cover'); expect(html).not.toContain('angling-grass');
    }
  });
});
