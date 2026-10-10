import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CastGame } from '../src/components/CastGame';
import { FishingScene } from '../src/components/FishingScene';
import { venues } from '../src/data/venues';
import { advanceInteraction, castLine, createInitialState, getIdealCastPower } from '../src/game/engine';
import { getAnglingCue, getAnglingPose, getAnglingWindow } from '../src/game/angling';
import { getLiveFishMotion } from '../src/game/fishMotion';
import type { ExpeditionState } from '../src/types';

const noChange = () => { throw new Error('Rendering must not advance an encounter'); };
function pilot(venueId = 'amazon', zoneId = 'roots', gearId = 'surface', seasonId = 'rising-water'): ExpeditionState {
  const state: ExpeditionState = { ...createInitialState(), stage: 'habitat', venueId, zoneId, gearId, seasonId, assistMode: true };
  return castLine(state, getIdealCastPower(state));
}
function game(state: ExpeditionState, paused = false) {
  return renderToStaticMarkup(<CastGame state={state} venue={venues.find(item => item.id === state.venueId)!} setState={noChange} paused={paused} layoutNotice=""/>);
}
function scene(state: ExpeditionState, paused = false, engaged = false) {
  return renderToStaticMarkup(<FishingScene state={state} venue={venues.find(item => item.id === state.venueId)!} paused={paused} engaged={engaged}/>);
}

describe('habitat angling presentation', () => {
  it('uses each saved behavior window for countdown, instruction and one-window assistance', () => {
    for (const start of [pilot(), pilot('florida-bay', 'creek', 'roots', 'spring-exchange'), pilot('florida-bay', 'seagrass', 'flat', 'dry-salinity')]) {
      const venue = venues.find(item => item.id === start.venueId)!;
      for (let beat = 0; beat < 55; beat++) {
        // The compatibility phase deliberately disagrees: the saved beat owns presentation.
        const state = { ...start, anglingBeat: beat, fightPhase: 'run' as const, phaseProgress: 999 };
        const window = getAnglingWindow(state, venue)!; const html = game(state);
        expect(html).toContain(window.label); expect(html).toContain(window.instruction);
        expect(html).toContain(`${(window.remaining * .25).toFixed(1)}s`);
        expect(html).toContain(`CREW RESPONSE · ${window.instruction}`);
        expect(html).toContain('One tap applies this response for one window.');
        expect(html).toContain(window.advice);
        const cue = getAnglingCue(window); if (cue) expect(html).toContain(cue);
      }
    }
  });

  it('waits for explicit readiness and explains both hold and release responses', () => {
    const state = { ...pilot(), assistMode: false }; const before = JSON.stringify(state); const html = game(state);
    expect(html).toContain('Ready when you are'); expect(html).toContain('Timer paused');
    expect(html).toContain('Read each behavior. Hold to guide or recover; release through bursts and rolls. The crew models rod-angle/drag adjustments.');
    expect(html).toContain('Start fishing'); expect(html).not.toContain('aria-pressed="true"');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('draws distinct pilot species in selected habitat, with a loaded rod and saved fish position', () => {
    for (const state of [pilot(), pilot('florida-bay', 'creek', 'roots', 'spring-exchange'), pilot('florida-bay', 'seagrass', 'flat', 'dry-salinity')]) {
      const venue = venues.find(item => item.id === state.venueId)!; const window = getAnglingWindow(state, venue)!;
      const pose = getLiveFishMotion(state, window.species, window, getAnglingWindow({ ...state, anglingBeat: Math.max(0, state.anglingBeat - window.elapsed - 1) }, venue));
      const html = scene(state);
      expect(html).toContain(`data-species="${window.species}"`); expect(html).toContain(`data-habitat="${state.zoneId}"`);
      expect(html).toContain(`transform="translate(${pose.x} ${pose.y})"`); expect(html).toContain(`data-load="${getAnglingPose(state, window).load}"`);
      expect(html).toContain('angling-live-fish'); expect(html).toContain('angling-live-fish__fallback'); expect(html).toContain('behavior schematic');
      expect(html).not.toContain('angling-boat'); expect(html).not.toContain('angling-crew');
      expect(html).not.toContain('class="fish-shadow"'); expect(html).not.toContain('class="water-ring');
    }
  });

  it('keeps the saved fish pose stable when input clears on pause or after rendering again', () => {
    const state = { ...pilot(), anglingBeat: 11, interactionProgress: 37, lineTension: 63 }; const before = JSON.stringify(state);
    const moving = scene(state, false, true), paused = scene(state, true, false), pausedHeld = scene(state, true, true);
    const position = (html: string) => html.match(/class="angling-target" transform="([^"]+)"/)![1];
    expect(position(moving)).toBe(position(paused)); expect(position(pausedHeld)).toBe(position(paused));
    expect(paused).toContain('fishing-scene--paused'); expect(pausedHeld).not.toContain('angling-rod--responding');
    expect(game(state, true)).toMatch(/interaction-control--assist" disabled=""/);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('shows authored missed-response consequences beside the current instruction', () => {
    let state = pilot();
    for (let tick = 0; tick < 3; tick++) state = advanceInteraction(state, true);
    expect(state.interactionMistakes).toBeGreaterThan(0);
    const html = game(state);
    expect(html).toContain('angling-response-feedback'); expect(html).toContain(state.fightMessage);
    const clean = advanceInteraction(pilot(), false);
    expect(game(clean)).not.toContain('angling-response-feedback');
  });

  it('preserves classic scene and control teaching for archived casts', () => {
    const state = { ...pilot(), anglingRules: 'classic' as const }; const html = game(state);
    expect(html).toContain('Let it run'); expect(html).toContain('LET THIS RUN PASS'); expect(html).toContain('class="fish-shadow"');
    expect(html).not.toContain('fishing-scene--angling-pilot'); expect(html).not.toContain('CREW RESPONSE');
  });
});
