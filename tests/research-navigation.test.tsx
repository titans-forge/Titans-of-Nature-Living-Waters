import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getResearchReturn } from '../src/game/researchNavigation';
import { createInitialState } from '../src/game/engine';
import { ResearchAtlas } from '../src/components/ResearchAtlas';
import { FieldPlanPractice } from '../src/components/FieldPlanPractice';
import type { FieldObservation } from '../src/types';

const amazon: FieldObservation = { id: 1, expedition: 1, venueId: 'amazon', seasonId: 'rising-water', habitatId: 'roots', gearId: 'surface', encounterId: 'peacock-bass', handlingId: 'steady-release', castAccuracy: 96, controlMistakes: 0, assisted: false, shared: true, reportingStatus: 'full-notes' };
const sponge: FieldObservation = { ...amazon, venueId: 'baikal', seasonId: 'spring-migration', habitatId: 'shelf', gearId: 'camera', encounterId: 'baikal-sponge', handlingId: 'lift-clear' };
const stateFor = (record: FieldObservation) => ({ ...createInitialState(), expeditionNumber: record.expedition, venueId: record.venueId, observations: [record] });
describe('research return routing', () => {
  it('follows eligible full context from the returned record to a named missing task', () => {
    const result = getResearchReturn(stateFor(amazon));
    expect(result?.project.id).toBe('project:floods'); expect(result?.nextVenueId).toBe('tonle-sap');
    expect(result?.currentRecordRelevant).toBe(true); expect(result?.nextFieldTask).toContain('giant snakehead');
  });
  it('does not infer sturgeon research from a Baikal sponge or a private fish record', () => {
    expect(getResearchReturn(stateFor(sponge))).toBe(null);
    expect(getResearchReturn(stateFor({ ...amazon, shared: false, reportingStatus: 'private-notes' }))).toBe(null);
  });
  it('retains an explicitly selected journey and identifies an unrelated current observation', () => {
    const result = getResearchReturn(stateFor(sponge), 'project:floods');
    expect(result?.project.id).toBe('project:floods'); expect(result?.currentRecordRelevant).toBe(false);
    expect(result?.nextVenueId).toBe('amazon');
  });
  it('does not use an earlier trip as the just-returned observation', () => {
    const state = { ...stateFor(amazon), expeditionNumber: 2 };
    expect(getResearchReturn(state)).toBe(null);
  });
  it('opens the requested project instead of always showing the first project', () => {
    const html = renderToStaticMarkup(<ResearchAtlas state={createInitialState()} setState={() => {}} onSelect={() => {}} selectedProjectId="project:migration" />);
    expect(html).toContain('Baikal evidence · choose one record'); expect(html).toContain('Danube evidence · choose one record');
    expect(html).not.toContain('Amazon evidence · choose one record');
  });
  it('presents a new scoped planning task without points, saved grades or an answer on load', () => {
    const html = renderToStaticMarkup(<FieldPlanPractice />);
    expect(html).toContain('Optional practice · no points or saved grade');
    expect(html).toContain('Inspect the sheltered roots'); expect(html).toContain('Observe the outlet'); expect(html).toContain('Survey the main channel');
    expect(html).not.toContain('role="status"');
  });
});
