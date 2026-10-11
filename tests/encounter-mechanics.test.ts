import { legacyCastLine as castLine } from './helpers/fishing';
import { describe, expect, it } from "vitest";
import { venues } from "../src/data/venues";
import { advanceAssistedInteraction, advanceInteraction, askQuestion, beginDebrief, beginQuestions,  chooseSnagApproach, completeDebrief, continueExpedition, createInitialState, finishGear, finishQuestions, getFightProfile, getFishCue, getHabitatBlockReason, getInteractionCue, getPressureFeedback, getRecommendedEngagement, getRecommendedLineAction, getVenue, handleEncounter, hasLostFish, isActiveFishFight, manageLine, revealEncounter, selectGear, selectHabitat, selectVenue } from "../src/game/engine";
import { getInteractionKind, needsSnagApproach } from "../src/game/interactions";
import { parseExpedition, serializeExpedition } from "../src/game/save";
import type { ExpeditionState, InteractionKind } from "../src/types";

function casts() {
  return venues.flatMap(venue => venue.seasons.flatMap((season, seasonIndex) => venue.habitats.filter(habitat => habitat.safe !== false).flatMap(habitat => venue.gearSets.map(gear => {
    let state = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { [venue.id]: seasonIndex } }, venue.id));
    const informed = venue.informedQuestionByZone[habitat.id];
    state = askQuestion(askQuestion(state, informed), venue.questions.find(question => question.id !== informed)!.id);
    state = selectHabitat(finishGear(selectGear(finishQuestions(state), gear.id)), habitat.id);
    return { name: `${venue.id}/${season.id}/${habitat.id}/${gear.id}`, prepared: state, state: castLine(state, venue.idealPower[habitat.id]) };
  }))));
}

const allCasts = casts();
function example(kind: InteractionKind) {
  const found = allCasts.find(({ state }) => getInteractionKind(state, getVenue(state)!) === kind);
  expect(found, `authored ${kind} route`).toBeDefined();
  return found!.state;
}
function assess(state: ExpeditionState) { return needsSnagApproach(state, getVenue(state)!) ? chooseSnagApproach(state, "back-out") : state; }
function finish(state: ExpeditionState) {
  let current = assess(state);
  for (let tick = 0; tick < 300 && !current.lineResolved; tick++) current = advanceInteraction(current, getRecommendedEngagement(current));
  expect(current.lineResolved).toBe(true);
  return current;
}
function nextPhase(state: ExpeditionState, engaged: boolean) {
  let current = state;
  for (let tick = 0; tick < 100 && current.fightPhase === state.fightPhase && !current.lineResolved; tick++) current = advanceInteraction(current, engaged);
  return current;
}

describe("distinct encounter mechanics", () => {
  it("uses the authored method and incident classification on every route", () => {
    expect(allCasts).toHaveLength(414);
    expect(new Set(allCasts.map(({ state }) => getInteractionKind(state, getVenue(state)!)))).toEqual(new Set(["fish", "bycatch", "snag", "camera", "telemetry", "sampling"]));
    for (const { name, state } of allCasts) {
      const venue = getVenue(state)!; const kind = getInteractionKind(state, venue);
      expect(isActiveFishFight(state, venue), name).toBe(kind === "fish");
      if (kind !== "fish") {
        expect(getFightProfile(state).id, name).toBe(kind);
        expect(state.fishDistance, name).toBe(0); expect(state.fishMaxDistance, name).toBe(0); expect(state.fishStamina, name).toBe(0);
      }
    }
  });

  it("stabilizes bycatch through released movement and steady calm without exhausting it", () => {
    const start = example("bycatch");
    const eased = advanceInteraction(start, false);
    expect(eased.interactionProgress).toBeGreaterThan(start.interactionProgress);
    expect(eased.fishStamina).toBe(0); expect(eased.fishDistance).toBe(0);
    const calm = nextPhase(start, false);
    expect(calm.fightPhase).toBe("rest");
    const steadied = advanceInteraction(calm, true);
    expect(steadied.interactionProgress).toBeGreaterThan(calm.interactionProgress);
    expect(steadied.fightMessage).toContain("without reeling");
    const completed = finish(start);
    expect(completed.interactionMistakes).toBe(0);
    expect(completed.fightMessage).toContain("stabilized");
    expect(hasLostFish({ ...start, lineTension: 100 })).toBe(false);
  });

  it.each(["bycatch", "snag"] as const)("cannot finish %s by holding through pressure or by never steadying contact", kind => {
    const start = assess(example(kind));
    let held = start, idle = start;
    for (let tick = 0; tick < 300; tick++) { held = advanceInteraction(held, true); idle = advanceInteraction(idle, false); }
    expect(held.lineResolved).toBe(false); expect(idle.lineResolved).toBe(false);
    expect(hasLostFish(held)).toBe(false); expect(hasLostFish(idle)).toBe(false);
    expect(held.fieldcraft).toBe(start.fieldcraft); expect(idle.fieldcraft).toBe(start.fieldcraft);
    const resumed = finish(held);
    expect(resumed.lineResolved).toBe(true);
    expect(getPressureFeedback(resumed).danger).toBe(false);
  });

  it.each(["bycatch", "snag"] as const)("a wrong hold during the %s movement phase cannot stand in for calm contact", kind => {
    const start = assess(example(kind)); let current = advanceInteraction(start, true);
    for (let tick = 0; tick < 300; tick++) current = advanceInteraction(current, false);
    expect(current.interactionProgress).toBe(100); expect(current.lineQuality).toBe(0); expect(current.lineResolved).toBe(false);
    expect(finish(current).lineResolved).toBe(true);
  });

  it("telemetry accumulates hands off and still needs a confirmation window", () => {
    const start = example("telemetry");
    expect(advanceInteraction(start, false).interactionProgress).toBe(5);
    expect(advanceInteraction(start, true).interactionProgress).toBe(0);
    let interrupted = start;
    for (let tick = 0; tick < 30; tick++) interrupted = advanceInteraction(interrupted, true);
    expect(interrupted.fightPhase).toBe("run"); expect(interrupted.phaseProgress).toBe(2);
    expect(interrupted.interactionProgress).toBe(0); expect(interrupted.lineResolved).toBe(false);
    let listeningOnly = start;
    for (let tick = 0; tick < 60; tick++) listeningOnly = advanceInteraction(listeningOnly, false);
    expect(listeningOnly.interactionProgress).toBe(100); expect(listeningOnly.lineResolved).toBe(false);
    const confirming = nextPhase(start, false);
    expect(confirming.fightPhase).toBe("rest"); expect(confirming.interactionProgress).toBe(80);
    expect(advanceInteraction(confirming, true).lineResolved).toBe(false);
    const completed = finish(start);
    expect(completed.fightMessage).toContain("reading is confirmed");
    expect(completed.lineTurn).toBe(20);
  });

  it.each(["camera", "sampling"] as const)("requires an actual waiting period before the %s window", kind => {
    const start = example(kind); let held = start;
    for (let tick = 0; tick < 60; tick++) held = advanceInteraction(held, true);
    expect(held.fightPhase).toBe("run"); expect(held.phaseProgress).toBe(2);
    expect(held.lineResolved).toBe(false); expect(held.interactionProgress).toBe(0);
    const settled = nextPhase(start, false);
    expect(settled.fightPhase).toBe("rest"); expect(settled.interactionProgress).toBe(0);
    expect(advanceInteraction(settled, true).interactionProgress).toBe(kind === "camera" ? 6 : 10);
  });

  it("collects a sample in one ideal window or two with a two-tick response delay", () => {
    const start = example("sampling"); const ideal = finish(start);
    expect(ideal.lineTurn).toBe(18);
    let delayed = start; let phase = delayed.fightPhase; let lag = 0; let windows = 0;
    for (let tick = 0; tick < 100 && !delayed.lineResolved; tick++) {
      if (delayed.fightPhase !== phase) { phase = delayed.fightPhase; lag = 2; if (phase === "rest") windows++; }
      const recommended = getRecommendedEngagement(delayed);
      delayed = advanceInteraction(delayed, lag > 0 ? !recommended : recommended); lag = Math.max(0, lag - 1);
    }
    expect(delayed.lineResolved).toBe(true); expect(delayed.interactionMistakes).toBe(0); expect(windows).toBe(2);
  });

  it("assisted steps traverse the same complete phase as native controls on every route", () => {
    for (const { name, state } of allCasts) {
      const start = assess(state); const assisted = advanceAssistedInteraction(start);
      let native = start;
      for (let tick = 0; tick < 100 && native.fightPhase === start.fightPhase && !native.lineResolved; tick++) native = advanceInteraction(native, getRecommendedEngagement(native));
      expect(assisted, name).toEqual({ ...native, castUsedAssistance: true });
      expect(assisted.fightPhase === start.fightPhase && !assisted.lineResolved, name).toBe(false);
    }
  });

  it("keeps generic cues and nonfish pressure labels without escaped-fish messages", () => {
    for (const kind of ["bycatch", "snag", "camera", "telemetry", "sampling"] as const) {
      const start = assess(example(kind)); const profile = getFightProfile(start);
      const cueState = { ...start, phaseProgress: profile.runTicks - 2, lineTurn: profile.runTicks };
      expect(getInteractionCue(cueState)).toBeTruthy(); expect(getFishCue(cueState)).toBe(getInteractionCue(cueState));
      expect(getInteractionCue(cueState)).not.toMatch(/fish turns|ready to reel/);
      expect(getPressureFeedback(start).label).not.toMatch(/Slack|Strained|Controlled/);
      expect(getPressureFeedback({ ...start, lineTension: profile.safeMax + 1 }).danger).toBe(true);
      expect(advanceInteraction({ ...start, lineTension: 100 }, true).fightMessage).not.toMatch(/line broke|fish is alongside|fish escaped/);
    }
  });

  it("retains valid mid-encounter saves and recovers phases longer than the new profile", () => {
    for (const kind of ["fish", "bycatch", "snag", "camera", "telemetry", "sampling"] as const) {
      let current = assess(example(kind));
      for (let tick = 0; tick < 7; tick++) current = advanceInteraction(current, getRecommendedEngagement(current));
      const parsed = parseExpedition(serializeExpedition(current));
      expect(parsed).toMatchObject({ ok: true, state: current });
      const longPhase = { ...current, phaseProgress: 100, lineTurn: 100 };
      const resumed = advanceInteraction(longPhase, getRecommendedEngagement(longPhase));
      expect(resumed.phaseProgress).toBe(0);
      expect(parseExpedition(serializeExpedition(resumed)).ok).toBe(true);
      expect(resumed.observations).toEqual(current.observations);
    }
  });

  it("does not repeat completion points or duplicate observations", () => {
    for (const kind of ["fish", "bycatch", "snag", "camera", "telemetry", "sampling"] as const) {
      const completed = finish(example(kind));
      expect(advanceInteraction(completed, true)).toBe(completed);
      expect(advanceAssistedInteraction(completed)).toBe(completed);
      const venue = getVenue(completed)!; const option = venue.encounters[completed.encounterId!].handling.find(item => item.safe)!;
      const journal = handleEncounter(revealEncounter(completed), option.id);
      expect(journal.observations).toHaveLength(1);
      expect(handleEncounter(journal, option.id)).toBe(journal);
      expect(continueExpedition(journal).snagApproach).toBe("unassessed");
    }
  });

  it("does not grant cast or technique points for a bycatch record already in an earlier trip", () => {
    const route = allCasts.find(({ state }) => getInteractionKind(state, getVenue(state)!) === "bycatch")!;
    const journalId = `${route.state.venueId}:${route.state.encounterId}`;
    const prepared = { ...route.prepared, journalIds: [journalId], fieldcraft: 40, ecology: 30 };
    const repeated = castLine(prepared, getVenue(prepared)!.idealPower[prepared.zoneId!]);
    expect(repeated.encounterId).toBe(route.state.encounterId);
    expect(repeated.fieldcraft).toBe(40); expect(repeated.ecology).toBe(30);
    const completed = finish(repeated);
    expect(completed.fieldcraft).toBe(40); expect(completed.journalIds).toEqual([journalId]);
  });

  it("rewards first careful incident handling but retains a later observation without more hunt points", () => {
    const route = allCasts.find(({ state }) => getInteractionKind(state, getVenue(state)!) === "bycatch")!;
    const first = finish(route.state); const venue = getVenue(first)!;
    const handlingId = venue.encounters[first.encounterId!].handling.find(option => option.safe)!.id;
    const journal = handleEncounter(revealEncounter(first), handlingId);
    expect(journal.fieldcraft - first.fieldcraft).toBe(12); expect(journal.biology - first.biology).toBe(8);
    expect(journal.ecology - first.ecology).toBe(7); expect(journal.trust - first.trust).toBe(8);
    const returned = completeDebrief(beginDebrief(journal), "full-notes");
    const nextPrepared = { ...route.prepared, observations: returned.observations, journalIds: returned.journalIds,
      expeditionNumber: returned.expeditionNumber + 1, fieldcraft: returned.fieldcraft, biology: returned.biology, ecology: returned.ecology, trust: returned.trust };
    const repeated = castLine(nextPrepared, venue.idealPower[nextPrepared.zoneId!]);
    expect(repeated.fieldcraft).toBe(returned.fieldcraft); expect(repeated.ecology).toBe(returned.ecology);
    const completed = finish(repeated); const secondJournal = handleEncounter(revealEncounter(completed), handlingId);
    for (const score of ["fieldcraft", "biology", "ecology", "trust"] as const) expect(secondJournal[score], score).toBe(returned[score]);
    expect(secondJournal.observations).toHaveLength(2); expect(secondJournal.observations[0]).toEqual(returned.observations[0]);
    expect(secondJournal.observations.map(observation => observation.id)).toEqual([1, 2]);
    expect(secondJournal.journalIds).toEqual(returned.journalIds);
    expect(parseExpedition(serializeExpedition(secondJournal)).ok).toBe(true);
  });

  it("closes a current-trip incidental station while keeping another safe station available", () => {
    for (const { name, state } of allCasts.filter(({ state }) => getInteractionKind(state, getVenue(state)!) === "bycatch")) {
      const venue = getVenue(state)!; const completed = finish(state);
      const option = venue.encounters[state.encounterId!].handling.find(item => item.safe)!;
      const journal = handleEncounter(revealEncounter(completed), option.id);
      expect(getHabitatBlockReason(journal, state.zoneId!), name).toBe("This station is closed after an incidental encounter. Choose another habitat to avoid another capture.");
      const available = venue.habitats.filter(habitat => habitat.safe !== false && !getHabitatBlockReason(journal, habitat.id));
      expect(available.length, name).toBeGreaterThan(0);
      expect(getHabitatBlockReason({ ...journal, expeditionNumber: journal.expeditionNumber + 1, tripJournalIds: [] }, state.zoneId!), name).toBeNull();
    }
  });

  it("retains the legacy Alaska station closure even without detailed observations", () => {
    const alaska = allCasts.find(({ state }) => state.venueId === "alaska-kelp")!.state;
    const legacy = { ...alaska, observations: [], tripJournalIds: ["alaska-kelp:black-rockfish"] };
    expect(getHabitatBlockReason(legacy, "ledge")).toContain("closed after incidental rockfish");
  });
});

describe("long unattended encounter saves", () => {
  it.each(["camera", "bycatch", "snag"] as const)("keeps %s action history bounded during 100001 idle ticks", kind => {
    let state = example(kind);
    if (kind === "snag") state = chooseSnagApproach(state, "back-out");
    const actions = [...state.lineActions];
    const initialBytes = serializeExpedition(state).length;
    for (let tick = 0; tick < 100001; tick++) state = advanceInteraction(state, false);
    expect(state.lineResolved).toBe(false);
    expect(state.lineActions).toEqual(actions);
    expect(serializeExpedition(state).length - initialBytes).toBeLessThan(4096);
    expect(parseExpedition(serializeExpedition(state))).toMatchObject({ ok: true, migrated: false });
  });
});

describe("mandatory snag assessment", () => {
  it("stalls timer and assistance until correct back-out, with one mistake per distinct wrong assessment", () => {
    const start = example("snag");
    expect(start.snagApproach).toBe("unassessed");
    expect(advanceInteraction(start, false)).toBe(start); expect(advanceAssistedInteraction(start)).toBe(start);
    const wrong = chooseSnagApproach(start, "pull-through");
    expect(wrong).toMatchObject({ snagApproach: "pull-through", lineTurn: 1, interactionMistakes: 1, phaseProgress: 0, interactionProgress: 0, lineActions: ["reel"] });
    expect(wrong.lineTension).toBeGreaterThan(start.lineTension);
    expect(wrong.fieldcraft).toBe(start.fieldcraft);
    expect(advanceInteraction(wrong, false)).toBe(wrong); expect(advanceAssistedInteraction(wrong)).toBe(wrong);
    expect(parseExpedition(serializeExpedition(wrong))).toMatchObject({ ok: true, state: wrong });
    const repeated = chooseSnagApproach(wrong, "pull-through");
    expect(repeated).toBe(wrong);
    const correct = chooseSnagApproach(repeated, "back-out");
    expect(correct).toMatchObject({ snagApproach: "back-out", lineTurn: 2, interactionMistakes: 1, lineActions: ["reel", "give"], phaseProgress: 0, interactionProgress: 0 });
    expect(correct.fieldcraft).toBe(start.fieldcraft); expect(correct.lineQuality).toBe(0);
    expect(chooseSnagApproach(correct, "pull-through")).toBe(correct);
    expect(parseExpedition(serializeExpedition(correct)).ok).toBe(true);
    const completed = finish(correct);
    expect(completed.interactionMistakes).toBe(1); expect(completed.fieldcraft - start.fieldcraft).toBe(4);
  });

  it("restricts assessment to an unresolved snag in the cast stage", () => {
    const snag = example("snag"); const fish = example("fish");
    expect(chooseSnagApproach(fish, "back-out")).toBe(fish);
    const before = { ...snag, stage: "habitat" as const }; expect(chooseSnagApproach(before, "back-out")).toBe(before);
    const completed = finish(snag); expect(chooseSnagApproach(completed, "back-out")).toBe(completed);
  });

  it("keeps legacy line action entry points truthful and subject to the same assessment", () => {
    const start = example("snag"); expect(getRecommendedLineAction(start)).toBe("give");
    expect(manageLine(start, "hold")).toBe(start);
    const wrong = manageLine(start, "reel"); expect(wrong.snagApproach).toBe("pull-through");
    const correct = manageLine(wrong, "give"); expect(correct.snagApproach).toBe("back-out");
    let current = correct;
    for (let action = 0; action < 100 && !current.lineResolved; action++) current = manageLine(current, getRecommendedLineAction(current));
    expect(current.lineResolved).toBe(true); expect(current.interactionMistakes).toBe(1);
    expect(current.lineActions).toHaveLength(current.lineTurn);
    expect(parseExpedition(serializeExpedition(current)).ok).toBe(true);
  });
});
