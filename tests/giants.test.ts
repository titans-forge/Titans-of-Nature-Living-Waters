import { advanceRecommendedInteraction } from './helpers/fishing';
import { describe, expect, it } from 'vitest';
import { venues } from '../src/data/venues';
import { advanceInteraction, askQuestion, beginQuestions, castLine, createInitialState, finishGear, finishQuestions, getFightProfile, handleEncounter, revealEncounter, selectGear, selectHabitat, selectVenue } from '../src/game/engine';
import { parseExpedition } from '../src/game/save';
function cast(venueId:string, gear:string, habitat:string, visit=0) {
 const venue=venues.find(v=>v.id===venueId)!;
 let s=beginQuestions(selectVenue({...createInitialState(), venueVisitCounts:{[venueId]:visit}},venueId));
 s=askQuestion(askQuestion(s,venue.informedQuestionByZone[habitat]),venue.questions.find(q=>q.id!==venue.informedQuestionByZone[habitat])!.id);
 return castLine(selectHabitat(finishGear(selectGear(finishQuestions(s),gear)),habitat),venue.idealPower[habitat]);
}
describe('giant fish expeditions',()=>{
 it('makes arapaima reachable in rising and high water, not falling water',()=>{
  expect(cast('amazon','arapaima-kit','roots').encounterId).toBe('arapaima');
  expect(cast('amazon','arapaima-kit','roots',1).encounterId).toBe('arapaima');
  expect(cast('amazon','arapaima-kit','roots',2).encounterId).not.toBe('arapaima');
 });
 it('preserves non-capture beluga telemetry alongside the new migration research fight',()=>{
  expect(cast('danube','telemetry','navigation').encounterId).toBe('beluga-sturgeon');
  expect(getFightProfile(cast('danube','telemetry','navigation')).id).toBe('telemetry');
  expect(cast('danube','research-cradle','navigation').encounterId).toBe('beluga-research');
  expect(cast('danube','research-cradle','navigation',1).encounterId).not.toBe('beluga-research');
 });
 it.each([['amazon','arapaima-kit','roots','arapaima'],['danube','research-cradle','navigation','beluga-research']])('completes and saves %s giant fish handling', (id,gear,habitat,fish)=>{
  let s=cast(id,gear,habitat);const v=venues.find(v=>v.id===id)!;
  expect(s.anglingRules).toBe('habitat-v2');
  for(let i=0;i<220&&!s.lineResolved;i++)s=advanceRecommendedInteraction(s);
  expect(s.lineResolved).toBe(true);
  s=handleEncounter(revealEncounter(s),v.encounters[fish].handling.find(h=>h.safe)!.id);
  expect(s.journalIds).toContain(`${id}:${fish}`);
  expect(parseExpedition(JSON.stringify(s)).ok).toBe(true);
 });
});
