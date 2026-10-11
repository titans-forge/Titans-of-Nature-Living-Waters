import { advanceRecommendedInteraction } from './helpers/fishing';
import { describe, expect, it } from "vitest";
import { advanceAssistedInteraction, advanceInteraction, askQuestion, beginDebrief, beginQuestions, castLine, castNotchForPower, castPowerForNotches, completeDebrief, continueExpedition, createInitialState, finishGear, finishQuestions, getFightProfile, getRecommendedEngagement, chooseSnagApproach, handleEncounter, manageLine, MAX_CAST_ATTEMPTS, revealEncounter, selectGear, selectHabitat, selectVenue } from "../src/game/engine";
import { buildAssignment, getNextAssignment } from "../src/game/assignments";
import { validateContent } from "../src/game/validation";
import { getComparedVenues, getDiscoveries, getVenueProgress, parseConnections } from "../src/game/progress";
import { venueById } from "../src/data/venues";
import { catchPhotoByEncounterId } from "../src/data/catchPhotos";
import { needsSnagApproach } from "../src/game/interactions";
import { getNextSeason, resolveSeasonEncounter } from "../src/game/seasons";
import type { ExpeditionState } from "../src/types";

function prepared(venueId: string, questions: string[], gearId: string) {
  let state = beginQuestions(selectVenue(createInitialState(), venueId));
  for (const question of questions) state = askQuestion(state, question);
  state = finishQuestions(state);
  state = finishGear(selectGear(state, gearId));
  return state;
}

function landFish(state: ExpeditionState) {
  let current = state;
  const venue = venueById[current.venueId!];
  if (needsSnagApproach(current, venue)) current = chooseSnagApproach(current, "back-out");
  for (let turn = 0; turn < 1000 && !current.lineResolved; turn += 1) {
    current = advanceRecommendedInteraction(current);
  }
  expect(current.lineResolved).toBe(true);
  return current;
}

describe("multi-venue expedition engine", () => {
  it("passes content integrity for every venue", () => expect(validateContent()).toEqual([]));
  it("maps every generated catch photograph to an authored fish encounter", () => {
    const encounters = Object.values(venueById).flatMap((venue) => Object.values(venue.encounters));
    for (const id of Object.keys(catchPhotoByEncounterId)) {
      expect(encounters.find((encounter) => encounter.id === id)?.type).toBe("fish");
    }
    expect(catchPhotoByEncounterId["peacock-bass"]).toBeTruthy();
    for (const id of ["bunni", "coho-salmon", "coral-trout", "largemouth-bass", "nile-tilapia", "red-seabream", "rohu"]) {
      expect(catchPhotoByEncounterId[id]).toBeTruthy();
    }
    expect(Object.keys(catchPhotoByEncounterId)).toHaveLength(24);
  });
  it("starts at destination selection and preserves journal entries while traveling", () => {
    const initial = createInitialState();
    expect(initial).toMatchObject({ version: 13, experienceMode: "guided", assistMode: false, castAttempts: 0 });
    expect(initial.stage).toBe("venue");
    const amazon = selectVenue({ ...initial, journalIds: ["amazon:peacock-bass"] }, "okavango");
    expect(amazon.stage).toBe("arrival");
    expect(amazon.venueId).toBe("okavango");
    expect(amazon.journalIds).toEqual(["amazon:peacock-bass"]);
    expect(amazon.activeAssignmentId).toBe("okavango:tigerfish");
  });
  it("derives a reachable field assignment and advances after completion", () => {
    const venue = venueById.amazon;
    const first = getNextAssignment(createInitialState(), venue)!;
    expect(first).toMatchObject({ targetEncounterId: "peacock-bass", habitatId: "roots", gearId: "surface", questionId: "water-rise" });
    const next = getNextAssignment({ ...createInitialState(), completedAssignmentIds: [first.id] }, venue)!;
    expect(next.targetEncounterId).not.toBe(first.targetEncounterId);
    expect(buildAssignment(venue, venue.fallbackEncounterId)).not.toBeNull();
  });
  it("cycles ecological windows deterministically by completed visit", () => {
    const venue = venueById.amazon;
    expect(getNextSeason(createInitialState(), venue).id).toBe("rising-water");
    const later = { ...createInitialState(), venueVisitCounts: { amazon: 2 } };
    expect(getNextSeason(later, venue).id).toBe("falling-water");
    expect(resolveSeasonEncounter(venue, "falling-water", "river-turtle")).toBe("root-snag");
  });
  it("only assigns encounters reachable in the active ecological window", () => {
    const venue = venueById["tonle-sap"];
    const state = { ...createInitialState(), seasonId: "drainage-migration" };
    expect(getNextAssignment(state, venue)?.targetEncounterId).toBe("trey-riel");
  });
  it("requires two locally valid questions before departure", () => {
    let state = beginQuestions(selectVenue(createInitialState(), "okavango"));
    state = askQuestion(state, "water-rise");
    expect(state.askedQuestions).toEqual([]);
    state = askQuestion(state, "flood-arrival");
    expect(finishQuestions(state).stage).toBe("questions");
    state = askQuestion(state, "bank-signs");
    expect(finishQuestions(state).stage).toBe("gear");
  });
  it("turns informed Amazon root preparation into peacock bass", () => {
    const cast = castLine(selectHabitat(prepared("amazon", ["water-rise", "gear"], "surface"), "roots"), 45);
    expect(cast.encounterId).toBe("peacock-bass");
    expect(cast.castAccuracy).toBeGreaterThan(90);
  });
  it("turns deliberate cast clicks into deterministic power notches", () => {
    expect(castPowerForNotches(1)).toBe(14);
    expect(castPowerForNotches(3)).toBe(42);
    expect(castPowerForNotches(5)).toBe(70);
    expect(castPowerForNotches(7)).toBe(96);
    expect(castNotchForPower(70)).toBe(5);
  });
  it("completes an assignment only after safe handling and a full community report", () => {
    let state = castLine(selectHabitat(prepared("amazon", ["water-rise", "gear"], "surface"), "roots"), 45);
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "steady-release");
    expect(state.stage).toBe("journal");
    state = completeDebrief(beginDebrief(state), "full-notes");
    expect(state.completedAssignmentIds).toContain("amazon:peacock-bass");
    expect(state.trust).toBeGreaterThan(10);
    expect(state.venueVisitCounts.amazon).toBe(1);
    expect(selectVenue(state, "amazon").seasonId).toBe("high-water");
  });
  it("keeps an assignment open when the returned report omits field context", () => {
    let state = castLine(selectHabitat(prepared("amazon", ["water-rise", "gear"], "surface"), "roots"), 45);
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "steady-release");
    state = completeDebrief(beginDebrief(state), "identity-only");
    expect(state.completedAssignmentIds).not.toContain("amazon:peacock-bass");
  });
  it("turns Okavango reed preparation into tigerfish", () => {
    let state = castLine(selectHabitat(prepared("okavango", ["flood-arrival", "reed-signs"], "reed"), "reeds"), 42);
    expect(state.encounterId).toBe("tigerfish");
    state = landFish(state);
    expect(state.lineQuality).toBeGreaterThan(3);
    state = handleEncounter(revealEncounter(state), "control-release");
    expect(state.journalIds).toContain("okavango:tigerfish");
  });
  it("refuses to cast from the unsafe Okavango bank", () => {
    const bank = selectHabitat(prepared("okavango", ["bank-signs", "fishery"], "light"), "bank");
    expect(castLine(bank, 55)).toEqual(bank);
  });
  it("creates Amazon turtle bycatch from baited light tackle near plants", () => {
    let state = castLine(selectHabitat(prepared("amazon", ["plant-signs", "turtles"], "light"), "plants"), 56);
    expect(state.encounterId).toBe("river-turtle");
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "pliers-release");
    expect(state.stage).toBe("journal");
  });
  it("does not reveal any encounter before line management resolves", () => {
    let state = castLine(selectHabitat(prepared("okavango", ["flood-arrival", "fishery"], "channel"), "channel"), 68);
    expect(revealEncounter(state).stage).toBe("cast");
    state = landFish(state);
    expect(revealEncounter(state).stage).toBe("handling");
  });
  it("punishes reeling into a run without ending the expedition", () => {
    const state = castLine(selectHabitat(prepared("okavango", ["flood-arrival", "fishery"], "channel"), "channel"), 68);
    const rushed = manageLine(state, "reel");
    expect(rushed.fishDistance).toBeGreaterThan(state.fishDistance);
    expect(rushed.lineTension).toBeGreaterThan(state.lineTension);
    expect(rushed.lineResolved).toBe(false);
  });
  it("lands a fish through pressure pulses and latched rod control", () => {
    let state = castLine(selectHabitat(prepared("okavango", ["flood-arrival", "fishery"], "channel"), "channel"), 68);
    for (let tick = 0; tick < 280 && !state.lineResolved; tick += 1) state = advanceRecommendedInteraction(state);
    expect(state.lineResolved).toBe(true);
    expect(state.interactionProgress).toBe(100);
    expect(state.interactionMistakes).toBe(0);
  });
  it("records premature reeling as recoverable technique loss", () => {
    const state = castLine(selectHabitat(prepared("okavango", ["flood-arrival", "fishery"], "channel"), "channel"), 68);
    let rushed = state;
    for (let tick = 0; tick < 4; tick += 1) rushed = advanceInteraction(rushed, true);
    expect(rushed.interactionMistakes).toBe(1);
    expect(rushed.interactionProgress).toBe(0);
    expect(rushed.lineResolved).toBe(false);
  });
  it("uses the same hold and release rhythm for passive surveys", () => {
    let state = castLine(selectHabitat(prepared("great-barrier-reef", ["reef-zones", "seagrass-turtle"], "survey"), "seagrass"), 54);
    for (let tick = 0; tick < 280 && !state.lineResolved; tick += 1) state = advanceRecommendedInteraction(state);
    expect(state.lineResolved).toBe(true);
    expect(state.fishMaxDistance).toBe(0);
    expect(state.interactionMistakes).toBe(0);
  });
  it("gives fish families distinct fight profiles", () => {
    const tigerfish = castLine(selectHabitat(prepared("okavango", ["flood-arrival", "reed-signs"], "reed"), "reeds"), 42);
    const halibut = { ...tigerfish, venueId: "alaska-kelp", encounterId: "pacific-halibut", gearId: "bottom" };
    const survey = castLine(selectHabitat(prepared("great-barrier-reef", ["reef-zones", "seagrass-turtle"], "survey"), "seagrass"), 54);
    expect(getFightProfile(tigerfish).id).toBe("aerial");
    expect(getFightProfile(halibut).id).toBe("bottom");
    expect(getFightProfile(survey).id).toBe("camera");
  });
  it("supports untimed phase decisions", () => {
    let state = castLine(selectHabitat(prepared("okavango", ["flood-arrival", "fishery"], "channel"), "channel"), 68);
    for (let decision = 0; decision < 30 && !state.lineResolved; decision += 1) state = advanceAssistedInteraction(state);
    expect(state.lineResolved).toBe(true);
    expect(state.interactionProgress).toBe(100);
    expect(state.interactionMistakes).toBe(0);
    const profile = getFightProfile(state);
    expect(state.lineTension).toBeGreaterThanOrEqual(profile.safeMin);
    expect(state.lineTension).toBeLessThanOrEqual(profile.safeMax);
  });
  it("makes accurate placement reduce opening pressure without changing the assignment target", () => {
    const preparedState = selectHabitat(prepared("amazon", ["water-rise", "gear"], "surface"), "roots");
    const accurate = castLine(preparedState, 42);
    const wide = castLine(preparedState, 8);
    expect(accurate.encounterId).toBe("peacock-bass");
    expect(wide.encounterId).toBe("peacock-bass");
    expect(accurate.lineTension).toBeLessThan(wide.lineTension);
    expect(accurate.castAccuracy).toBeGreaterThan(wide.castAccuracy);
  });
  it("allows three casts with kit changes inside one field session", () => {
    let state = castLine(selectHabitat(prepared("amazon", ["water-rise", "gear"], "surface"), "roots"), 45);
    state = handleEncounter(revealEncounter(landFish(state)), "steady-release");
    expect(state.castAttempts).toBe(1);
    expect(state.tripSafeJournalIds).toContain("amazon:peacock-bass");
    state = continueExpedition(state);
    expect(state.stage).toBe("gear");
    for (let attempt = 1; attempt < MAX_CAST_ATTEMPTS; attempt += 1) {
      state = finishGear(selectGear(state, "surface"));
      state = castLine(selectHabitat(state, "roots"), 45);
      state = handleEncounter(revealEncounter(landFish(state)), "steady-release");
      if (attempt < MAX_CAST_ATTEMPTS - 1) state = continueExpedition(state);
    }
    expect(state.castAttempts).toBe(MAX_CAST_ATTEMPTS);
    expect(continueExpedition(state)).toEqual(state);
  });
  it("turns bait near Tonle Sap lotus into turtle bycatch", () => {
    let state = castLine(selectHabitat(prepared("tonle-sap", ["turtle-release", "forest-role"], "bait"), "lotus"), 54);
    expect(state.encounterId).toBe("malayan-snail-turtle");
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "waterline-release");
    expect(state.journalIds).toContain("tonle-sap:malayan-snail-turtle");
  });
  it("uses the reverse-flow channel for a migratory Tonle Sap fish", () => {
    const state = castLine(selectHabitat(prepared("tonle-sap", ["reverse-flow", "migration-route"], "migration"), "channel"), 70);
    expect(state.encounterId).toBe("trey-riel");
    expect(state.castAccuracy).toBe(100);
  });
  it("derives venue mastery from unique journal discoveries", () => {
    const state = { ...createInitialState(), journalIds: ["amazon:peacock-bass", "amazon:peacock-bass", "amazon:river-turtle"] };
    const progress = getVenueProgress(state, venueById.amazon);
    expect(progress.found).toBe(2);
    expect(progress.total).toBe(6);
    expect(progress.percent).toBe(33);
  });
  it("builds ecosystem links from authored relationships", () => {
    const state = { ...createInitialState(), journalIds: ["tonle-sap:trey-riel"] };
    const discovery = getDiscoveries(state)[0];
    expect(parseConnections(discovery)[0]).toMatchObject({ from: "Reverse flow", to: "lakeward movement" });
  });
  it("unlocks comparison only after more than one venue is observed", () => {
    const one = { ...createInitialState(), journalIds: ["amazon:peacock-bass"] };
    const two = { ...one, journalIds: [...one.journalIds, "okavango:tigerfish"] };
    expect(getComparedVenues(one)).toHaveLength(1);
    expect(getComparedVenues(two).map((venue) => venue.id)).toEqual(["amazon", "okavango"]);
  });
  it("ships fifteen complete and distinct destinations", () => {
    expect(Object.keys(venueById)).toEqual(["amazon", "okavango", "tonle-sap", "florida-bay", "alaska-kelp", "baikal", "lake-holiday", "nile", "euphrates", "ganges", "danube", "great-barrier-reef", "seto-inland-sea", "yellow-river-delta", "galapagos"]);
    expect(Object.values(venueById).every((venue) => Object.keys(venue.encounters).length >= 4)).toBe(true);
  });
  it("turns Florida mangrove preparation into a snook encounter", () => {
    const state = castLine(selectHabitat(prepared("florida-bay", ["mangrove-roots", "salinity"], "roots"), "mangroves"), 42);
    expect(state.encounterId).toBe("common-snook");
    expect(state.castAccuracy).toBe(100);
  });
  it("makes deepwater release the safe Alaska rockfish response", () => {
    let state = castLine(selectHabitat(prepared("alaska-kelp", ["depth-release", "tide-exposure"], "jig"), "ledge"), 78);
    expect(state.encounterId).toBe("black-rockfish");
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "descend-release");
    expect(state.stage).toBe("journal");
    expect(state.trust).toBeGreaterThan(0);
  });
  it("routes Baikal sturgeon through the permitted Selenga survey", () => {
    let state = castLine(selectHabitat(prepared("baikal", ["sturgeon-migration", "slow-maturity"], "survey"), "delta"), 66);
    expect(state.encounterId).toBe("baikal-sturgeon");
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "cradle-release");
    expect(state.journalIds).toContain("baikal:baikal-sturgeon");
  });
  it("turns Lake Holiday shoreline preparation into a bass encounter", () => {
    const state = castLine(selectHabitat(prepared("lake-holiday", ["shoreline-cover", "community-rules"], "cover"), "cove"), 42);
    expect(state.encounterId).toBe("largemouth-bass");
    expect(state.castAccuracy).toBe(100);
  });
  it("turns informed Nile reed-margin preparation into a tilapia encounter", () => {
    let state = castLine(selectHabitat(prepared("nile", ["papyrus-memory", "dawn-oxygen"], "light"), "reeds"), 42);
    expect(state.encounterId).toBe("nile-tilapia");
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "wet-release");
    expect(state.journalIds).toContain("nile:nile-tilapia");
  });
  it("makes the protected bunni a survey-and-release Euphrates encounter", () => {
    let state = castLine(selectHabitat(prepared("euphrates", ["marsh-restoration", "reed-mosaic"], "float"), "marsh"), 42);
    expect(state.encounterId).toBe("bunni");
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "survey-release");
    expect(state.journalIds).toContain("euphrates:bunni");
    expect(state.trust).toBeGreaterThan(0);
  });
  it("turns a Ganges acoustic watch into a no-hook dolphin observation", () => {
    let state = castLine(selectHabitat(prepared("ganges", ["dolphin-sound", "ecological-flow"], "acoustic"), "channel"), 74);
    expect(state.encounterId).toBe("ganges-dolphin");
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "quiet-watch");
    expect(state.journalIds).toContain("ganges:ganges-dolphin");
    expect(state.trust).toBeGreaterThan(0);
  });
  it("tracks a protected Danube sturgeon without a hook or pursuit", () => {
    let state = castLine(selectHabitat(prepared("danube", ["iron-gates-passage", "working-corridor"], "telemetry"), "navigation"), 58);
    expect(state.encounterId).toBe("beluga-sturgeon");
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "barrier-log");
    expect(state.journalIds).toContain("danube:beluga-sturgeon");
    expect(state.trust).toBeGreaterThan(0);
  });
  it("keeps a coral trout clear of the Great Barrier Reef bommie", () => {
    let state = castLine(selectHabitat(prepared("great-barrier-reef", ["reef-zones", "coral-anchor"], "bommie"), "bommie"), 42);
    expect(state.encounterId).toBe("coral-trout");
    expect(state.castAccuracy).toBe(100);
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "sand-release");
    expect(state.journalIds).toContain("great-barrier-reef:coral-trout");
    expect(state.trust).toBeGreaterThan(0);
  });
  it("observes a green turtle over seagrass without a hook", () => {
    let state = castLine(selectHabitat(prepared("great-barrier-reef", ["reef-zones", "seagrass-turtle"], "survey"), "seagrass"), 54);
    expect(state.encounterId).toBe("green-turtle");
    expect(state.fishMaxDistance).toBe(0);
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "drift-log");
    expect(state.journalIds).toContain("great-barrier-reef:green-turtle");
  });
  it("fishes the Seto eelgrass edge without dragging through the meadow", () => {
    let state = castLine(selectHabitat(prepared("seto-inland-sea", ["satoumi", "eelgrass-nursery"], "eelgrass"), "eelgrass"), 42);
    expect(state.encounterId).toBe("japanese-sea-bass");
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "meadow-release");
    expect(state.journalIds).toContain("seto-inland-sea:japanese-sea-bass");
  });
  it("handles a Seto octopus as an invertebrate rather than a fish fight", () => {
    let state = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { "seto-inland-sea": 1 } }, "seto-inland-sea"));
    state = askQuestion(askQuestion(state, "working-sea"), "nutrient-balance");
    state = finishGear(selectGear(finishQuestions(state), "tai-rubber"));
    state = castLine(selectHabitat(state, "harbor"), 54);
    expect(state.encounterId).toBe("common-octopus");
    expect(state.fishMaxDistance).toBe(0);
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "water-release");
    expect(state.journalIds).toContain("seto-inland-sea:common-octopus");
  });
  it("follows the Yellow River freshwater plume with a spotted sea bass", () => {
    let state = castLine(selectHabitat(prepared("yellow-river-delta", ["ecological-release", "reserve-boundary"], "reed-lure"), "reed-channel"), 42);
    expect(state.encounterId).toBe("spotted-sea-bass");
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "mixing-release");
    expect(state.journalIds).toContain("yellow-river-delta:spotted-sea-bass");
  });
  it("samples the Yellow River estuary nursery without a hook", () => {
    let state = castLine(selectHabitat(prepared("yellow-river-delta", ["water-sediment", "ecological-release"], "survey"), "reed-channel"), 42);
    expect(state.encounterId).toBe("nursery-edna");
    expect(state.fishMaxDistance).toBe(0);
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "clean-filter");
    expect(state.journalIds).toContain("yellow-river-delta:nursery-edna");
  });
  it("treats the Yellow River mitten crab as an autumn invertebrate migration", () => {
    let state = beginQuestions(selectVenue({ ...createInitialState(), venueVisitCounts: { "yellow-river-delta": 2 } }, "yellow-river-delta"));
    state = askQuestion(askQuestion(state, "salinity-gradient"), "reserve-boundary");
    state = finishGear(selectGear(finishQuestions(state), "channel-jig"));
    state = castLine(selectHabitat(state, "saltmarsh"), 57);
    expect(state.encounterId).toBe("chinese-mitten-crab");
    expect(state.fishMaxDistance).toBe(0);
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "tray-release");
    expect(state.journalIds).toContain("yellow-river-delta:chinese-mitten-crab");
  });
  it("observes a Galapagos penguin without turning the survey into pursuit", () => {
    let state = castLine(selectHabitat(prepared("galapagos", ["current-convergence", "wildlife-distance"], "drift-survey"), "lava-shore"), 35);
    expect(state.encounterId).toBe("galapagos-penguin");
    expect(state.fishMaxDistance).toBe(0);
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "drift-watch");
    expect(state.journalIds).toContain("galapagos:galapagos-penguin");
  });
  it("records a Galapagos hammerhead as a passive acoustic detection", () => {
    let state = castLine(selectHabitat(prepared("galapagos", ["reserve-zones", "current-convergence"], "acoustic-array"), "pelagic-edge"), 74);
    expect(state.encounterId).toBe("scalloped-hammerhead");
    expect(state.fishMaxDistance).toBe(0);
    state = landFish(state);
    state = handleEncounter(revealEncounter(state), "passive-detection");
    expect(state.journalIds).toContain("galapagos:scalloped-hammerhead");
  });
  it("changes the Galapagos field window on repeat visits", () => {
    const state = selectVenue({ ...createInitialState(), venueVisitCounts: { galapagos: 2 } }, "galapagos");
    expect(state.seasonId).toBe("el-nino-watch");
    expect(state.activeAssignmentId?.startsWith("galapagos:")).toBe(true);
  });
});
