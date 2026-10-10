import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { venues, venueById } from '../src/data/venues';
import { fieldDecisions } from '../src/data/fieldDecisions';
import { FieldDecision, FieldDecisionOutcome } from '../src/components/FieldDecision';
import { applyFieldDecision, getFieldDecision } from '../src/game/fieldDecisions';
import { advanceAssistedInteraction, askQuestion, beginQuestions, castLine, createInitialState, finishGear, finishQuestions,
  getFightProfile, handleEncounter, revealEncounter, selectGear, selectVenue } from '../src/game/engine';
import { getInteractionKind } from '../src/game/interactions';
import { parseExpedition, serializeExpedition } from '../src/game/save';
import type { ExpeditionState, Venue } from '../src/types';

function prepare(venue: Venue, seasonIndex = 0) {
  let state = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { [venue.id]: seasonIndex } }, venue.id));
  state = askQuestion(askQuestion(state, venue.questions[0].id), venue.questions[1].id);
  return finishGear(selectGear(finishQuestions(state), venue.gearSets[0].id));
}

const visits = venues.flatMap(venue => venue.seasons.map((season, index) => ({ venue, season, state: prepare(venue, index) })));

describe('field investigation decisions', () => {
  it('authors two specific investigation questions for all 15 waters and every seasonal visit', () => {
    expect(venues).toHaveLength(15);
    expect(Object.keys(fieldDecisions).sort()).toEqual(venues.map(venue => venue.id).sort());
    expect(visits).toHaveLength(45);
    for (const { venue, season, state } of visits) {
      const decision = getFieldDecision(state, venue)!;
      expect(decision.season.id).toBe(season.id);
      expect(decision.choices, `${venue.id}/${season.id}`).toHaveLength(2);
      expect(new Set(decision.choices.map(choice => choice.question)).size).toBe(2);
      expect(new Set(decision.choices.map(choice => `${choice.gearId}:${choice.habitatId}`)).size).toBe(2);
      expect(decision.choices.some(choice => !choice.blockReason), `${venue.id}/${season.id} has a safe plan`).toBe(true);
      for (const choice of decision.choices) {
        expect(choice.habitat.safe).not.toBe(false);
        expect(choice.evidence.length).toBeGreaterThan(30);
        expect(choice.tradeoff.length).toBeGreaterThan(30);
        if (choice.blockReason) {
          expect(venue.id).toBe('alaska-kelp');
          expect(choice.blockReason).toContain('not available');
        } else {
          expect(season.availableEncounterIds).toContain(choice.expectedEncounterId);
          expect(venue.encounters[choice.expectedEncounterId].interaction).toBeUndefined();
        }
      }
    }
  });

  it('changes actual encounter or survey method, including the seasonal alternatives', () => {
    for (const { venue, season, state } of visits) {
      const choices = getFieldDecision(state, venue)!.choices.filter(choice => !choice.blockReason);
      const results = choices.map(choice => {
        const setup = applyFieldDecision(state, venue, choice.id);
        const cast = castLine(setup, venue.idealPower[choice.habitatId]);
        expect(cast.stage, `${venue.id}/${season.id}/${choice.title}`).toBe('cast');
        expect(cast.encounterId).toBe(choice.expectedEncounterId);
        return { encounter: cast.encounterId, kind: getInteractionKind(cast, venue), profile: getFightProfile(cast).id };
      });
      if (results.length === 2) expect(results[0], `${venue.id}/${season.id} changes what is examined`).not.toEqual(results[1]);
    }
  });

  it('changes only kit and station, preserving schema, original answers, records and attempts', () => {
    for (const { venue, state } of visits) {
      const enriched: ExpeditionState = { ...state, castAttempts: 1, interactionMistakes: 2,
        observations: [{ id: 1, expedition: 0, venueId: 'amazon', seasonId: 'rising-water', gearId: 'surface', habitatId: 'roots',
          encounterId: 'peacock-bass', handlingId: 'steady-release', castAccuracy: 92, controlMistakes: 3,
          assisted: true, shared: true, reportingStatus: 'full-notes' }],
        learningAnswers: [{ questionId: 'amazon:prediction', answerId: 'root-edge', correct: false }],
        learningRevisions: [{ questionId: 'amazon:prediction', answerId: 'root-edge', correct: false, evidenceIds: [1], limitationId: 'sample-limits' }],
      };
      const choice = getFieldDecision(enriched, venue)!.choices.find(item => !item.blockReason)!;
      const selected = applyFieldDecision(enriched, venue, choice.id);
      expect({ ...selected, gearId: enriched.gearId, zoneId: enriched.zoneId }).toEqual(enriched);
      expect(selected.version).toBe(12);
      expect(selected.observations).toBe(enriched.observations);
      expect(selected.learningAnswers).toBe(enriched.learningAnswers);
      expect(selected.learningRevisions).toBe(enriched.learningRevisions);
      expect(selected.activeAssignmentId).toBe(enriched.activeAssignmentId);
      expect(selected.castAttempts).toBe(1);
      expect(selected.encounterId).toBe(null);
    }
  });

  it('preserves selected setup through normal schema-12 saving before the cast', () => {
    for (const { venue, state } of visits) {
      const choice = getFieldDecision(state, venue)!.choices.find(item => !item.blockReason)!;
      const selected = applyFieldDecision(state, venue, choice.id);
      const parsed = parseExpedition(serializeExpedition(selected));
      expect(parsed.ok, `${venue.id}/${state.seasonId}`).toBe(true);
      if (parsed.ok) {
        expect(parsed.state.gearId).toBe(choice.gearId);
        expect(parsed.state.zoneId).toBe(choice.habitatId);
        expect(parsed.state.version).toBe(12);
        expect(parsed.state.learningAnswers).toEqual(selected.learningAnswers);
        expect(parsed.state.castAttempts).toBe(selected.castAttempts);
      }
    }
  });

  it('records the chosen kit, station and actual encounter only after completing the normal interaction', () => {
    let completed = 0;
    for (const { venue, state } of visits) for (const choice of getFieldDecision(state, venue)!.choices.filter(item => !item.blockReason)) {
      let trial = castLine({ ...applyFieldDecision(state, venue, choice.id), assistMode: true }, venue.idealPower[choice.habitatId]);
      for (let steps = 0; steps < 100 && !trial.lineResolved; steps++) trial = advanceAssistedInteraction(trial);
      expect(trial.lineResolved, choice.id).toBe(true);
      trial = revealEncounter(trial);
      const safe = venue.encounters[trial.encounterId!].handling.find(option => option.safe)!;
      trial = handleEncounter(trial, safe.id);
      expect(trial.observations.at(-1)).toMatchObject({ gearId: choice.gearId, habitatId: choice.habitatId, encounterId: choice.expectedEncounterId });
      const parsed = parseExpedition(serializeExpedition(trial));
      expect(parsed.ok, `${choice.id} completed save`).toBe(true);
      completed++;
    }
    expect(completed).toBe(88);
  });

  it('rejects unknown, stale, out-of-stage and unavailable decisions without altering state', () => {
    const amazon = venueById.amazon;
    const state = prepare(amazon);
    const choice = getFieldDecision(state, amazon)!.choices[0];
    expect(applyFieldDecision(state, amazon, 'missing')).toBe(state);
    for (const stage of ['gear', 'questions', 'cast', 'handling', 'journal', 'debrief'] as const) {
      const other = { ...state, stage };
      expect(applyFieldDecision(other, amazon, choice.id)).toBe(other);
    }
    const changedSeason = { ...state, seasonId: 'high-water' };
    expect(applyFieldDecision(changedSeason, amazon, choice.id)).toBe(changedSeason);
    const wrongVenue = prepare(venueById.galapagos);
    expect(applyFieldDecision(wrongVenue, amazon, choice.id)).toBe(wrongVenue);
    const corruptSeason = { ...state, seasonId: 'not-a-season' };
    expect(applyFieldDecision(corruptSeason, amazon, choice.id)).toBe(corruptSeason);
    const activeCast = { ...state, encounterId: 'peacock-bass', castPower: 44 };
    expect(applyFieldDecision(activeCast, amazon, choice.id)).toBe(activeCast);
    for (const visit of visits) for (const unavailable of getFieldDecision(visit.state, visit.venue)!.choices.filter(item => item.blockReason)) {
      expect(applyFieldDecision(visit.state, visit.venue, unavailable.id)).toBe(visit.state);
    }
  });

  it('rechecks station closures against current records before applying a previously displayed choice', () => {
    const venue = venueById.amazon;
    const state = prepare(venue);
    const choice = getFieldDecision(state, venue)!.choices[0];
    // Older imported incidents can close a site; applying a plan must respect the
    // literal incident history even if today's authored route differs from it.
    const closed: ExpeditionState = { ...state, observations: [{ id: 1, expedition: state.expeditionNumber, venueId: venue.id,
      seasonId: state.seasonId!, habitatId: choice.habitatId, gearId: 'light', encounterId: 'river-turtle', handlingId: 'pliers-release',
      castAccuracy: 60, controlMistakes: 0, assisted: false, shared: false, reportingStatus: 'pending' }] };
    expect(getFieldDecision(closed, venue)!.choices[0].blockReason).toContain('closed after an incidental encounter');
    expect(applyFieldDecision(closed, venue, choice.id)).toBe(closed);
    expect(getFieldDecision(closed, venue)!.choices[1].blockReason).toBeNull();
  });

  it('does not allow plans to bypass remaining-attempt and journal-capacity limits', () => {
    const venue = venueById.amazon;
    const state = prepare(venue);
    const choice = getFieldDecision(state, venue)!.choices[0];
    const exhausted = { ...state, castAttempts: 3 };
    expect(getFieldDecision(exhausted, venue)!.choices[0].blockReason).toContain('no attempts remaining');
    expect(applyFieldDecision(exhausted, venue, choice.id)).toBe(exhausted);
    const full = { ...state, observations: [{ id: 1000000, expedition: 0, venueId: venue.id,
      seasonId: 'rising-water', habitatId: 'roots', gearId: 'surface', encounterId: 'peacock-bass', handlingId: 'steady-release',
      castAccuracy: 90, controlMistakes: 0, assisted: false, shared: false, reportingStatus: 'pending' as const }] };
    expect(getFieldDecision(full, venue)!.choices[0].blockReason).toContain('journal');
    expect(applyFieldDecision(full, venue, choice.id)).toBe(full);
  });

  it('keeps assignment and custom choices legible, with unavailable Alaska work explicitly disabled', () => {
    const state = prepare(venueById.amazon);
    const choice = getFieldDecision(state, venueById.amazon)!.choices[1];
    const selected = applyFieldDecision(state, venueById.amazon, choice.id);
    const html = renderToStaticMarkup(<FieldDecision state={selected} venue={venueById.amazon} setState={() => {}} />);
    expect(html).toContain('Your field assignment:');
    expect(html).toContain('This setup investigates another question. Your field assignment remains available.');
    expect(html).toContain('Choose a custom kit');
    expect(html).toContain('aria-pressed="true"');
    const alaska = renderToStaticMarkup(<FieldDecision state={prepare(venueById['alaska-kelp'])} venue={venueById['alaska-kelp']} setState={() => {}} />);
    expect(alaska).toContain('not available in Spring bloom');
    expect(alaska).toContain('disabled=""');
    expect(alaska).not.toContain('Use plan: Catch rockfish');
  });

  it('closes the evidence loop without inventing a saved plan choice or successful goal', () => {
    const venue = venueById.amazon;
    const prepared = prepare(venue);
    const choice = getFieldDecision(prepared, venue)!.choices[0];
    const selected = applyFieldDecision(prepared, venue, choice.id);
    const journal: ExpeditionState = { ...selected, stage: 'journal', observations: [{ id: 1, expedition: selected.expeditionNumber,
      venueId: venue.id, seasonId: selected.seasonId!, habitatId: choice.habitatId, gearId: choice.gearId,
      encounterId: 'peacock-bass', handlingId: 'steady-release', castAccuracy: 90, controlMistakes: 0,
      assisted: false, shared: false, reportingStatus: 'pending' }] };
    const html = renderToStaticMarkup(<FieldDecisionOutcome state={journal} venue={venue} />);
    expect(html).toContain('This route examines:');
    expect(html).toContain('Recorded: Peacock bass');
    expect(html).not.toContain('You selected');
    expect(html).not.toContain('goal completed');
    const incident = { ...journal, observations: journal.observations.map(record => ({ ...record, encounterId: 'root-snag', handlingId: 'change-angle' })) };
    const incidentHtml = renderToStaticMarkup(<FieldDecisionOutcome state={incident} venue={venue} />);
    expect(incidentHtml).toContain('The actual record differs from the intended investigation');
    expect(incidentHtml).toContain('Recorded: Submerged root snag');
  });
});
