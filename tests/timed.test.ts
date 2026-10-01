import { describe, expect, it } from "vitest";
import { venues } from "../src/data/venues";
import { FISHING_TICK_MS, getCastTargetWidth, hasLostFish, retryFish, advanceAssistedInteraction, advanceInteraction, askQuestion, beginQuestions, castLine, createInitialState, finishGear, finishQuestions, getFightProfile, getPressureFeedback, selectGear, selectHabitat, selectVenue } from "../src/game/engine";
import { parseExpedition } from "../src/game/save";
import type { ExpeditionState } from "../src/types";

function routes() {
  return venues.flatMap((venue) => venue.seasons.flatMap((season, seasonIndex) => venue.habitats
    .filter((habitat) => habitat.safe !== false).flatMap((habitat) => venue.gearSets.map((gear) => {
      let state = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { [venue.id]: seasonIndex } }, venue.id));
      const questionId = venue.informedQuestionByZone[habitat.id];
      state = askQuestion(state, questionId);
      state = askQuestion(state, venue.questions.find((question) => question.id !== questionId)!.id);
      state = selectHabitat(finishGear(selectGear(finishQuestions(state), gear.id)), habitat.id);
      return { name: `${venue.id}/${season.id}/${habitat.id}/${gear.id}`, state, ideal: venue.idealPower[habitat.id] };
    }))));
}

function resolve(state: ExpeditionState, policy: "rhythm" | "hold" | "assisted") {
  let current = state;
  let turns = 0;
  while (!current.lineResolved && turns < 300) {
    current = policy === "assisted" ? advanceAssistedInteraction(current)
      : advanceInteraction(current, policy === "hold" || current.fightPhase === "rest");
    turns += 1;
    if (policy !== "hold") expect(getPressureFeedback(current).label).toBe("Controlled");
  }
  expect(current.lineResolved).toBe(true);
  return current;
}

describe("the interaction used by the UI", () => {
  it("covers all 414 safe habitat, gear, and season combinations", () => {
    expect(routes()).toHaveLength(414);
  });

  it.each(["ideal", "near", "wide"] as const)("rewards the taught rhythm on every route at %s placement", (placement) => {
    for (const route of routes()) {
      const power = placement === "ideal" ? route.ideal : placement === "near" ? route.ideal + 14 : 8;
      const cast = castLine(route.state, power);
      const final = resolve(cast, "rhythm");
      expect(final.interactionMistakes, route.name).toBe(0);
      expect(final.fieldcraft - cast.fieldcraft, route.name).toBe(5);
      expect(final.interactionProgress, route.name).toBe(100);
    }
  });

  it("continuous holding loses active fish; retry preserves records and grants no reward", () => {
    for (const route of routes()) {
      const cast = castLine(route.state, route.ideal);
      let rushed = cast;
      for (let tick = 0; tick < 300 && !rushed.lineResolved && !hasLostFish(rushed); tick++) rushed = advanceInteraction(rushed, true);
      if (getFightProfile(cast).id === "passive") { expect(rushed.lineResolved).toBe(true); continue; }
      expect(hasLostFish(rushed), route.name).toBe(true);
      expect(rushed.lineResolved).toBe(false);
      expect(parseExpedition(JSON.stringify(rushed)).ok, route.name).toBe(true);
      expect(advanceInteraction(rushed, false)).toBe(rushed);
      expect(rushed.fieldcraft).toBe(cast.fieldcraft);
      const retry = retryFish(rushed);
      expect(parseExpedition(JSON.stringify(retry)).ok, route.name).toBe(true);
      expect(retry.castAttempts).toBe(cast.castAttempts);
      expect(retry.fieldcraft).toBe(cast.fieldcraft);
      expect(retry.journalIds).toEqual(cast.journalIds);
      expect(retry.interactionMistakes).toBe(rushed.interactionMistakes);
      expect(resolve(retry, "rhythm").lineResolved).toBe(true);
    }
  });

  it("a well-played active fight takes about 20–40 seconds; never reeling cannot catch", () => {
    for (const route of routes()) {
      const cast = castLine(route.state, route.ideal);
      if (getFightProfile(cast).id === "passive") continue;
      const final = resolve(cast, "rhythm");
      expect(final.lineTurn * FISHING_TICK_MS / 1000).toBeGreaterThanOrEqual(20);
      expect(final.lineTurn * FISHING_TICK_MS / 1000).toBeLessThanOrEqual(40);
      let idle = cast;
      for (let tick = 0; tick < 180; tick++) idle = advanceInteraction(idle, false);
      expect(idle.lineResolved).toBe(false);
      expect(idle.interactionProgress).toBe(0);
    }
  });

  it("informed preparation widens the timing target and accurate casts lower opening pressure", () => {
    const route = routes()[0];
    expect(getCastTargetWidth(route.state)).toBeGreaterThan(getCastTargetWidth({ ...route.state, askedQuestions: [] }));
    expect(castLine(route.state, route.ideal).lineTension).toBeLessThan(castLine(route.state, route.ideal - 20).lineTension);
    expect(retryFish(route.state)).toBe(route.state);
  });

  it("makes untimed steps equivalent to the taught rhythm without erasing earlier mistakes", () => {
    for (const route of routes()) {
      const cast = castLine(route.state, route.ideal);
      const assisted = resolve(cast, "assisted");
      const taught = resolve(cast, "rhythm");
      expect(assisted.interactionMistakes, route.name).toBe(0);
      expect(assisted.fieldcraft, route.name).toBe(taught.fieldcraft);
      expect(assisted.castUsedAssistance, route.name).toBe(true);
      let rushed = cast;
      for (let tick = 0; tick < 4; tick += 1) rushed = advanceInteraction(rushed, true);
      const recovered = resolve(hasLostFish(rushed) ? retryFish(rushed) : rushed, "assisted");
      expect(recovered.interactionMistakes, route.name).toBe(rushed.interactionMistakes);
    }
  });

  it("allows two UI ticks of reaction time at phase changes on every route", () => {
    for (const route of routes()) {
      let current = castLine(route.state, route.ideal);
      let previousPhase = current.fightPhase;
      let lag = 0;
      for (let tick = 0; tick < 300 && !current.lineResolved; tick += 1) {
        if (current.fightPhase !== previousPhase) { lag = 2; previousPhase = current.fightPhase; }
        const taught = current.fightPhase === "rest";
        current = advanceInteraction(current, lag > 0 ? !taught : taught);
        lag = Math.max(0, lag - 1);
      }
      expect(current.lineResolved, route.name).toBe(true);
      expect(current.interactionMistakes, route.name).toBe(0);
    }
  });

  it("reports profile-specific pressure boundaries and does nothing after completion", () => {
    const route = routes()[0];
    const cast = castLine(route.state, route.ideal);
    const profile = getFightProfile(cast);
    expect(getPressureFeedback({ ...cast, lineTension: profile.safeMin - 1 }).label).toBe("Slack");
    expect(getPressureFeedback({ ...cast, lineTension: profile.safeMax + 1 }).label).toBe("Strained");
    expect(getPressureFeedback({ ...cast, lineTension: profile.safeMin }).label).toBe("Controlled");
    const final = resolve(cast, "rhythm");
    expect(advanceInteraction(final, true)).toBe(final);
    expect(advanceAssistedInteraction(final)).toBe(final);
    expect(advanceAssistedInteraction(createInitialState())).toEqual(createInitialState());
  });
});
