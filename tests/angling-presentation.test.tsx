import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CastGame } from '../src/components/CastGame';
import { FishingScene } from '../src/components/FishingScene';
import { ControlCoach } from '../src/components/ControlCoach';
import { underwaterFishByEncounterId } from '../src/data/underwaterFish';
import { venues } from '../src/data/venues';
import { advanceInteraction, castLine, createInitialState, getIdealCastPower } from '../src/game/engine';
import { getAnglingCue, getAnglingWindow } from '../src/game/angling';
import { getSkillFishingCue } from '../src/game/skillFishing';
import { getUnderwaterFishPose, getUnderwaterLine, getUnderwaterMeshPoint } from '../src/game/underwaterMotion';
import type { ExpeditionState } from '../src/types';
import { legacyCastLine } from './helpers/fishing';

const noChange = () => { throw new Error('Rendering must not advance an encounter'); };
function pilot(venueId = 'amazon', zoneId = 'roots', gearId = 'surface', seasonId = 'rising-water'): ExpeditionState {
  const state: ExpeditionState = { ...createInitialState(), stage: 'habitat', venueId, zoneId, gearId, seasonId, assistMode: true };
  return legacyCastLine(state, getIdealCastPower(state));
}
function game(state: ExpeditionState, paused = false) {
  return renderToStaticMarkup(<CastGame state={state} venue={venues.find(item => item.id === state.venueId)!} setState={noChange} paused={paused} layoutNotice=""/>);
}
function scene(state: ExpeditionState, paused = false, engaged = false) {
  return renderToStaticMarkup(<FishingScene state={state} venue={venues.find(item => item.id === state.venueId)!} paused={paused} engaged={engaged}/>);
}
function savedScenePose(html: string) {
  return ['data-mouth-x', 'data-mouth-y', 'data-beat', 'data-species'].map(attribute => html.match(new RegExp(`${attribute}="([^"]+)"`))?.[1]);
}
// Match balanced divs so nested progress/phase markup cannot hide a meter
// incorrectly placed in the scrollable reading area.
function divContents(html: string, className: string) {
  const open = new RegExp(`<div[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`).exec(html);
  if (!open) throw new Error(`Missing ${className}`);
  const start = open.index + open[0].length;
  const tags = /<div\b[^>]*>|<\/div>/g; tags.lastIndex = start;
  let depth = 1;
  for (let tag = tags.exec(html); tag; tag = tags.exec(html)) {
    depth += tag[0].startsWith('</') ? -1 : 1;
    if (!depth) return html.slice(start, tag.index);
  }
  throw new Error(`Unclosed ${className}`);
}

describe('habitat angling presentation', () => {
  it('gives v2 pressure decisions instead of legacy whole-window holding advice', () => {
    const prepared = { ...createInitialState(), stage: 'habitat' as const, venueId: 'amazon', zoneId: 'roots', gearId: 'surface', seasonId: 'rising-water', assistMode: true };
    const start = castLine(prepared, getIdealCastPower(prepared));
    const venue = venues.find(item => item.id === 'amazon')!;
    for (const lineTension of [30, 55, 79]) {
      for (const anglingBeat of [0, 12, 24, 48, 60]) {
        const state = { ...start, anglingBeat, lineTension };
        const cue = getSkillFishingCue(state, venue)!;
        const html = game(state);
        expect(html).toContain(`Now: ${cue.actionLabel}`);
        expect(html).toContain(`Next behavior: ${cue.next.label}. Keep watching pressure beside the reel.`);
        expect(html).not.toContain('Keep following “Now” until it changes.');
        if (cue.id === 'headshake') expect(cue.actionLabel).toBe('Release while the fish turns');
        const stale = game({ ...state, fightMessage: 'Contact is light. Pulse the reel to rebuild controlled pressure.' });
        expect(stale).not.toContain('Contact is light. Pulse the reel to rebuild controlled pressure.');
        expect(stale).not.toContain('angling-response-feedback');
      }
    }
    const coach = (pressureFishing: boolean) => renderToStaticMarkup(<ControlCoach paused={false} pressureFishing={pressureFishing} onContinue={noChange} onAssist={noChange}/>);
    expect(coach(true)).toContain('Reel in short holds while pressure is controlled.');
    expect(coach(true)).toContain('At cover, select the opposite rod side.');
    expect(coach(true)).not.toContain('HOLD means keeping the control pressed');
    expect(coach(false)).toContain('HOLD means keeping the control pressed');
  });

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

  it('shows every pilot species submerged with one mouth anchor for the fish and line', () => {
    for (const state of [pilot(), pilot('florida-bay', 'creek', 'roots', 'spring-exchange'), pilot('florida-bay', 'seagrass', 'flat', 'dry-salinity')]) {
      const venue = venues.find(item => item.id === state.venueId)!;
      const pose = getUnderwaterFishPose(state, venue), fish = underwaterFishByEncounterId[state.encounterId!];
      const html = scene(state);
      expect(html).toContain(`data-species="${state.encounterId}"`);
      expect(savedScenePose(html)).toEqual([`${pose.x}`, `${pose.y}`, `${pose.clock}`, state.encounterId]);
      expect(html).toContain('underwater-fight-canvas'); expect(html).toContain('data-motion-source="saved-encounter"');
      expect(html).toContain('Underwater learning view'); expect(html).not.toContain(venue.habitatImage);
      expect(getUnderwaterLine(pose, 740, 260)!.end).toEqual({ x: pose.x * 740 / 100, y: pose.y * 260 / 100 });
      for (const frame of [fish.side!, fish.oblique!, fish.turn!]) {
        const width = 120 * frame.widthScale, height = width / frame.aspectRatio;
        expect(getUnderwaterMeshPoint(frame.mouthX / 100, frame.mouthY / 100, width, height, frame.mouthX, frame.mouthY, pose)).toEqual({ x: 0, y: 0 });
      }
      expect(html).not.toContain('angling-boat'); expect(html).not.toContain('angling-crew');
      expect(html).not.toContain('angling-live-fish__piece');
      expect(html).not.toContain('class="fish-shadow"'); expect(html).not.toContain('class="water-ring');
    }
  });

  it('keeps the saved fish pose stable when input clears on pause or after rendering again', () => {
    const state = { ...pilot('florida-bay', 'creek', 'roots', 'spring-exchange'), anglingBeat: 11, interactionProgress: 37, lineTension: 63 }; const before = JSON.stringify(state);
    const moving = scene(state, false, true), paused = scene(state, true, false), pausedHeld = scene(state, true, true);
    expect(savedScenePose(moving)).toEqual(savedScenePose(paused)); expect(savedScenePose(pausedHeld)).toEqual(savedScenePose(paused));
    expect(savedScenePose(scene(JSON.parse(before), true))).toEqual(savedScenePose(paused));
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

  it('preserves classic controls and saved clock while moving genuine fish below the water', () => {
    const state = { ...pilot(), anglingRules: 'classic' as const }; const html = game(state);
    expect(html).toContain('Let it run'); expect(html).toContain('LET THIS RUN PASS'); expect(html).toContain('data-motion-source="saved-encounter"');
    expect(html).toContain(`data-beat="${state.lineTurn}"`); expect(html).not.toContain('class="fish-shadow"');
    expect(html).not.toContain('fishing-scene--angling-pilot'); expect(html).not.toContain('CREW RESPONSE');
  });

  it('keeps v2 live pressure beside the action and the latched rod choice visible through pause and reload', () => {
    const prepared = { ...createInitialState(), stage: 'habitat' as const, venueId: 'amazon', zoneId: 'roots', gearId: 'surface', seasonId: 'rising-water' };
    const start = castLine(prepared, getIdealCastPower(prepared));
    expect(start.anglingRules).toBe('habitat-v2');
    const venue = venues.find(item => item.id === 'amazon')!;
    let cover = start;
    for (let beat = 0; beat < 100; beat++) {
      cover = { ...start, anglingBeat: beat };
      if (getSkillFishingCue(cover, venue)?.needsRodSide) break;
    }
    const cue = getSkillFishingCue(cover, venue)!; expect(cue.needsRodSide).toBe(true);
    for (const rodSide of ['left', 'right'] as const) {
      const state = Object.freeze({ ...cover, rodSide, lineTension: 47 }); const saved = JSON.stringify(state);
      for (const html of [game(state), game(state, true), game(JSON.parse(saved), true)]) {
        const reading = divContents(html, 'interaction-reading');
        const action = divContents(html, 'interaction-actions');
        const instruments = divContents(html, 'skill-fight-instruments');
        expect(reading).not.toContain('role="meter"'); expect(reading).not.toContain('rod-side-controls');
        expect(action).toContain('skill-fight-instruments'); expect(instruments).toContain('aria-valuenow="47"');
        expect(instruments).toContain('role="meter"'); expect(instruments).toContain('aria-label="Line pressure"');
        expect(instruments).toContain('aria-label="Rod side away from cover"');
        const buttons = [...instruments.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*>([^<]*)<\/button>/g)];
        expect(buttons).toHaveLength(2);
        expect(buttons.map(button => button[1])).toEqual(rodSide === 'left' ? ['true', 'false'] : ['false', 'true']);
        expect(html).toContain(`data-rod-side="${rodSide}"`);
        expect(html).toContain(`data-required-rod-side="${cue.requiredRodSide}"`);
      }
      expect(JSON.stringify(state)).toBe(saved);
    }
  });

  it('shows 99 percent until the v2 encounter actually resolves, including its accessible progress', () => {
    const prepared = { ...createInitialState(), stage: 'habitat' as const, venueId: 'amazon', zoneId: 'roots', gearId: 'surface', seasonId: 'rising-water', assistMode: true };
    const state = { ...castLine(prepared, getIdealCastPower(prepared)), interactionProgress: 99.9 };
    expect(state.anglingRules).toBe('habitat-v2');
    const before = JSON.stringify(state);
    for (const paused of [false, true]) {
      const active = game(state, paused);
      expect(active).toContain('99% recovered'); expect(active).not.toContain('100% recovered');
      expect(active).not.toContain('<strong>100%</strong>');
      expect(active).toMatch(/role="progressbar" aria-label="Catch progress"[^>]*aria-valuenow="99"/);
      expect(active).not.toContain('data-underwater-phase="landed"');
      const resolved = game({ ...state, lineResolved: true }, paused);
      expect(resolved).toContain('100% recovered');
      expect(resolved).toMatch(/role="progressbar" aria-label="Catch progress"[^>]*aria-valuenow="100"/);
      expect(resolved).toContain('data-underwater-phase="landed"'); expect(resolved).toContain('landed-reveal');
    }
    expect(JSON.stringify(state)).toBe(before);
  });
});
