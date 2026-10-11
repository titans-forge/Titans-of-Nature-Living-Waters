import { advanceRecommendedInteraction } from './helpers/fishing';
import { describe, expect, it } from "vitest";
import { venues, venueById } from "../src/data/venues";
import { buildAssignment, didCompleteCurrentAssignment, getActiveAssignment } from "../src/game/assignments";
import { hasLostFish, retryFish, advanceAssistedInteraction, advanceInteraction, askQuestion, beginDebrief, beginQuestions, castLine, completeDebrief, continueExpedition, createInitialState, finishGear, finishQuestions, getHabitatBlockReason, chooseSnagApproach, handleEncounter, revealEncounter, selectGear, selectHabitat, selectVenue } from "../src/game/engine";
import { needsSnagApproach } from "../src/game/interactions";
import { getVenueProgress } from "../src/game/progress";
import type { ExpeditionState } from "../src/types";

function prepare(state = createInitialState(), assistMode = false) {
  let current = beginQuestions(selectVenue({ ...state, assistMode }, "amazon"));
  current = askQuestion(askQuestion(current, "water-rise"), "gear");
  return selectHabitat(finishGear(selectGear(finishQuestions(current), "surface")), "roots");
}

function catchBass(state: ExpeditionState, policy: "rhythm" | "hold" | "assisted" = "rhythm", safe = true) {
  let current = castLine(state, 44);
  for (let tick = 0; tick < 300 && !current.lineResolved; tick += 1) current = policy === "assisted"
    ? advanceAssistedInteraction(current) : policy === "hold" && current.interactionMistakes < 4 ? advanceInteraction(current, true) : advanceRecommendedInteraction(current);
  if (hasLostFish(current)) { current = retryFish(current); for (let tick = 0; tick < 300 && !current.lineResolved; tick++) current = advanceRecommendedInteraction(current); }
  expect(current.lineResolved).toBe(true);
  return handleEncounter(revealEncounter(current), venueById.amazon.encounters["peacock-bass"].handling.find((option) => option.safe === safe)!.id);
}

function repeat(state: ExpeditionState) {
  return selectHabitat(finishGear(selectGear(continueExpedition(state), "surface")), "roots");
}

describe("durable field records", () => {
  it("records each cast immutably, including repeated subjects, and shares only the current expedition", () => {
    const initial = prepare();
    const first = catchBass(initial);
    const second = catchBass(repeat(first));
    expect(initial.observations).toEqual([]);
    expect(first.observations).toHaveLength(1);
    expect(second.observations).toHaveLength(2);
    expect(second.observations.map((observation) => observation.id)).toEqual([1, 2]);
    expect(second.observations[0]).toMatchObject({ expedition: 1, venueId: "amazon", seasonId: "rising-water", habitatId: "roots", gearId: "surface", encounterId: "peacock-bass", handlingId: "steady-release", castAccuracy: 100, controlMistakes: 0, assisted: false, shared: false });
    expect(second.journalIds).toEqual(["amazon:peacock-bass"]);
    const privateReturn = completeDebrief(beginDebrief(second), "private-notes");
    const nextVisit = catchBass(prepare({ ...privateReturn, learningAnswers: [{ questionId: "example", answerId: "response", correct: true }] }));
    expect(nextVisit.expeditionNumber).toBe(2);
    expect(nextVisit.observations.at(-1)).toMatchObject({ id: 3, expedition: 2, seasonId: "high-water" });
    expect(nextVisit.learningAnswers).toEqual([{ questionId: "example", answerId: "response", correct: true }]);
    const shared = completeDebrief(beginDebrief(nextVisit), "full-notes");
    expect(shared.observations.map((observation) => observation.shared)).toEqual([false, false, true]);
    expect(nextVisit.observations.every((observation) => !observation.shared)).toBe(true);
    expect(selectVenue(shared, "galapagos").observations).toEqual(shared.observations);
  });

  it("records assistance actually used even if the player changes controls before handling", () => {
    let current = castLine(prepare(), 44);
    current = advanceAssistedInteraction(current);
    current = { ...current, assistMode: false };
    for (let tick = 0; tick < 300 && !current.lineResolved; tick += 1) current = advanceRecommendedInteraction(current);
    const result = handleEncounter(revealEncounter(current), "steady-release");
    expect(result.observations[0].assisted).toBe(true);
    expect(continueExpedition(result).castUsedAssistance).toBe(false);
    const assistedPlacement = castLine(prepare(createInitialState(), true), 44);
    expect(assistedPlacement.castUsedAssistance).toBe(true);
  });

  it("gives repeated identical catches no duplicate awards but recognizes technique improvement once", () => {
    const first = catchBass(prepare(), "hold");
    const second = catchBass(repeat(first), "hold");
    const missedResponses = second.observations.at(-1)!.controlMistakes;
    expect(missedResponses).toBeGreaterThan(0);
    for (const key of ["fieldcraft", "biology", "ecology", "trust"] as const) expect(second[key]).toBe(first[key]);
    const improved = catchBass(repeat(second));
    // A species-specific fight can break before the old fixed four-mistake
    // script. Recognize the actual saved technique improvement, capped at four.
    expect(improved.fieldcraft - second.fieldcraft).toBe(Math.min(4, missedResponses));
    expect(improved.biology).toBe(second.biology);
    expect(improved.ecology).toBe(second.ecology);
    expect(improved.observations).toHaveLength(3);
    expect(continueExpedition(improved)).toEqual(improved);
  });

  it("preserves unsafe evidence and lets a later safe attempt correct assignment eligibility", () => {
    const unsafe = catchBass(prepare(), "rhythm", false);
    expect(unsafe.tripSafeJournalIds).toEqual([]);
    const corrected = catchBass(repeat(unsafe));
    expect(corrected.biology - unsafe.biology).toBe(4);
    expect(corrected.observations[0].handlingId).not.toBe(corrected.observations[1].handlingId);
    expect(completeDebrief(beginDebrief(corrected), "full-notes").completedAssignmentIds).toContain("amazon:peacock-bass");
    expect(completeDebrief(beginDebrief(unsafe), "full-notes").completedAssignmentIds).toEqual([]);
  });
});

describe("assignments and collection claims", () => {
  it.each([
    { report: "private-notes" as const, safe: true, expected: false },
    { report: "identity-only" as const, safe: true, expected: false },
    { report: "full-notes" as const, safe: false, expected: false },
    { report: "full-notes" as const, safe: true, expected: true },
  ])("judges a repeated assignment by this trip's $report and safe=$safe response", ({ report, safe, expected }) => {
    // A preserved historical collection can already contain every completed task.
    const historical = { ...createInitialState(), completedAssignmentIds: Object.keys(venueById.amazon.encounters).map((id) => `amazon:${id}`) };
    const catchResult = catchBass(prepare(historical), "rhythm", safe);
    expect(catchResult.activeAssignmentId).toBe("amazon:peacock-bass");
    expect(catchResult.completedAssignmentIds).toContain("amazon:peacock-bass");
    expect(didCompleteCurrentAssignment(catchResult)).toBe(false);
    const returned = completeDebrief(beginDebrief(catchResult), report);
    expect(didCompleteCurrentAssignment(returned)).toBe(expected);
  });

  it("keeps Baikal's seasonal alternatives compatible with the selected equipment", () => {
    const venue = venueById.baikal;
    for (let seasonIndex = 0; seasonIndex < venue.seasons.length; seasonIndex += 1) {
      for (const gear of venue.gearSets) for (const habitat of venue.habitats) {
        let state = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { baikal: seasonIndex } }, "baikal"));
        state = askQuestion(askQuestion(state, "endemic-life"), "deepest-cast");
        state = selectHabitat(finishGear(selectGear(finishQuestions(state), gear.id)), habitat.id);
        state = castLine(state, venue.idealPower[habitat.id]);
        const encounter = venue.encounters[state.encounterId!];
        expect(encounter.type === "fish").toBe(gear.hook !== "No hook");
        expect(venue.seasons[seasonIndex].availableEncounterIds).toContain(encounter.id);
      }
    }
  });

  it("closes the Alaska bycatch station for this expedition and permits a move elsewhere", () => {
    let state = beginQuestions(selectVenue(createInitialState(), "alaska-kelp"));
    state = askQuestion(askQuestion(state, "depth-release"), "tide-exposure");
    state = selectHabitat(finishGear(selectGear(finishQuestions(state), "jig")), "ledge");
    state = castLine(state, 78);
    expect(state.encounterId).toBe("black-rockfish");
    for (let turn = 0; turn < 20 && !state.lineResolved; turn += 1) state = advanceAssistedInteraction(state);
    expect(state.lineResolved).toBe(true);
    state = handleEncounter(revealEncounter(state), "descend-release");
    state = selectHabitat(finishGear(selectGear(continueExpedition(state), "jig")), "ledge");
    expect(getHabitatBlockReason(state, "ledge")).toContain("station is closed");
    expect(castLine(state, 78)).toBe(state);
    const relocated = selectHabitat(state, "kelp");
    expect(getHabitatBlockReason(relocated, "kelp")).toBeNull();
    expect(castLine(relocated, 38).castAttempts).toBe(2);
    expect(getHabitatBlockReason(selectVenue(state, "alaska-kelp"), "ledge")).toBeNull();
  });

  it("omits the exact kit and habitat recipe from Field prose", () => {
    for (const venue of venues) for (const id of Object.keys(venue.encounters)) {
      const assignment = buildAssignment(venue, id)!;
      const gear = venue.gearSets.find((item) => item.id === assignment.gearId)!;
      const habitat = venue.habitats.find((item) => item.id === assignment.habitatId)!;
      const text = `${assignment.title} ${assignment.objective}`.toLowerCase();
      expect(text).not.toContain(gear.name.toLowerCase());
      expect(text).not.toContain(habitat.name.toLowerCase());
    }
  });

  it("completes all 80 assignments using the current engine and each season's authored route", () => {
    let completed = 0;
    for (const venue of venues) {
      let state = createInitialState();
      for (let visit = 0; visit < 24 && state.completedAssignmentIds.length < Object.keys(venue.encounters).length; visit += 1) {
        state = selectVenue(state, venue.id);
        const assignment = getActiveAssignment(state)!;
        state = askQuestion(beginQuestions(state), assignment.questionId);
        state = askQuestion(state, venue.questions.find((question) => question.id !== assignment.questionId)!.id);
        state = selectHabitat(finishGear(selectGear(finishQuestions(state), assignment.gearId)), assignment.habitatId);
        state = castLine(state, venue.idealPower[assignment.habitatId]);
        expect(state.encounterId).toBe(assignment.targetEncounterId);
        if (needsSnagApproach(state, venue)) state = chooseSnagApproach(state, "back-out");
        for (let turn = 0; turn < 30 && !state.lineResolved; turn += 1) state = advanceAssistedInteraction(state);
        expect(state.lineResolved).toBe(true);
        state = handleEncounter(revealEncounter(state), venue.encounters[state.encounterId!].handling.find((option) => option.safe)!.id);
        state = completeDebrief(beginDebrief(state), "full-notes");
      }
      expect(state.completedAssignmentIds).toHaveLength(Object.keys(venue.encounters).length);
      expect(getVenueProgress(state, venue).label).toBe("Survey coverage complete");
      completed += state.completedAssignmentIds.length;
    }
    expect(completed).toBe(80);
  });
});
