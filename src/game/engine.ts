import { venueById, venues } from "../data/venues";
import type { Encounter, ExpeditionState, FightProfileId, LineAction, Venue } from "../types";
import { getActiveAssignment, getNextAssignment } from "./assignments";
import { getNextSeason, getSeason, resolveSeasonEncounter } from "./seasons";

const tensionChange: Record<LineAction, number> = { reel: 17, hold: 4, give: -15 };
const CAST_NOTCH_POWER = 14;
export const MAX_CAST_ATTEMPTS = 3;

interface FightProfile {
  id: FightProfileId;
  label: string;
  cue: string;
  runTicks: number;
  restTicks: number;
  progressGain: number;
  tensionGain: number;
  tensionRelease: number;
  safeMin: number;
  safeMax: number;
}

const fightProfiles: Record<FightProfileId, FightProfile> = {
  burst: { id: "burst", label: "Burst runner", cue: "Expect a hard first run followed by a short recovery window.", runTicks: 8, restTicks: 9, progressGain: 4, tensionGain: 4, tensionRelease: 3, safeMin: 22, safeMax: 82 },
  bottom: { id: "bottom", label: "Bottom puller", cue: "The fish leans on the line; use short, deliberate reeling windows.", runTicks: 11, restTicks: 7, progressGain: 5, tensionGain: 3, tensionRelease: 2, safeMin: 28, safeMax: 86 },
  aerial: { id: "aerial", label: "Erratic fighter", cue: "Fast changes punish reeling through a run more than raw strength does.", runTicks: 6, restTicks: 8, progressGain: 4, tensionGain: 5, tensionRelease: 4, safeMin: 30, safeMax: 76 },
  steady: { id: "steady", label: "Steady swimmer", cue: "Read the rhythm and recover line without forcing the fish.", runTicks: 9, restTicks: 10, progressGain: 4, tensionGain: 2, tensionRelease: 2, safeMin: 20, safeMax: 86 },
  passive: { id: "passive", label: "Observation signal", cue: "Wait through interference, then record during a stable window.", runTicks: 6, restTicks: 11, progressGain: 5, tensionGain: 1, tensionRelease: 1, safeMin: 10, safeMax: 92 },
};

function inferFightProfile(encounter: Encounter, activeFish: boolean): FightProfileId {
  if (!activeFish) return "passive";
  if (encounter.id === "arapaima") return "burst";
  const subject = `${encounter.id} ${encounter.name}`.toLowerCase();
  if (/catfish|sturgeon|halibut|goonch|bunni|barbel|drum/.test(subject)) return "bottom";
  if (/arowana|salmon|bass|trevally|tigerfish|mackerel|snakehead|pike/.test(subject)) return "aerial";
  if (/perch|trout|snapper|seabream|croaker/.test(subject)) return "burst";
  return "steady";
}

export function getFightProfile(state: ExpeditionState): FightProfile {
  const venue = getVenue(state);
  const encounter = venue && state.encounterId ? venue.encounters[state.encounterId] : null;
  if (!venue || !encounter) return fightProfiles.steady;
  const standard = fightProfiles[inferFightProfile(encounter, isActiveFishFight(state, venue))];
  const base = encounter.id === "arapaima" ? { ...standard, label: "Floodplain giant", cue: "Watch for the broad surface roll before a powerful burst.", runTicks: 10, restTicks: 9 }
    : encounter.id === "beluga-research" ? { ...standard, label: "Deep-water giant", cue: "Long, heavy pulls give way to short recovery windows. Release through each surge.", runTicks: 14, restTicks: 9 } : standard;
  const current = getSeason(venue, state.seasonId).conditions.current.toLowerCase();
  if (/strong|fast|seam|channelward/.test(current)) return { ...base, runTicks: base.runTicks + 2, tensionGain: base.tensionGain + 1, cue: `${base.cue} The active current lengthens each run.` };
  if (/weak|gentle|slow/.test(current)) return { ...base, restTicks: base.restTicks + 2, cue: `${base.cue} Slower water creates a longer recovery window.` };
  return base;
}

export function getPressureFeedback(state: ExpeditionState) {
  const { safeMin, safeMax } = getFightProfile(state);
  const label = state.lineTension < safeMin ? "Slack" : state.lineTension > safeMax ? "Strained" : "Controlled";
  return { safeMin, safeMax, label };
}

function techniquePoints(mistakes: number) { return Math.max(1, 5 - mistakes); }

function techniqueImprovement(state: ExpeditionState, mistakes: number) {
  const previous = state.observations.filter((observation) => observation.expedition === state.expeditionNumber
    && observation.venueId === state.venueId && observation.encounterId === state.encounterId);
  const alreadyRecorded = state.tripJournalIds.includes(`${state.venueId}:${state.encounterId}`);
  const best = previous.length ? Math.max(...previous.map((observation) => techniquePoints(observation.controlMistakes))) : alreadyRecorded ? 5 : 0;
  return Math.max(0, techniquePoints(mistakes) - best);
}

export function castPowerForNotches(notches: number) {
  return Math.min(96, Math.max(1, Math.round(notches)) * CAST_NOTCH_POWER);
}

export function castNotchForPower(power: number) {
  return Math.max(1, Math.min(7, Math.round(power / CAST_NOTCH_POWER)));
}

export function getVenue(state: ExpeditionState): Venue | null {
  return state.venueId ? venueById[state.venueId] ?? null : null;
}

export function createInitialState(): ExpeditionState {
  return { version: 8, observations: [], learningAnswers: [], expeditionNumber: 0, venueId: null, stage: "venue", askedQuestions: [], gearId: null, zoneId: null, encounterId: null, castPower: null, castAccuracy: 0, lineTurn: 0, lineTension: 48, lineActions: [], lineQuality: 0, lineResolved: false, fishDistance: 0, fishMaxDistance: 0, fishStamina: 0, fightPhase: "run", phaseProgress: 0, fightMessage: "", interactionProgress: 0, interactionMistakes: 0, handlingId: null, fieldcraft: 0, biology: 0, ecology: 0, trust: 0, journalIds: [], activeAssignmentId: null, completedAssignmentIds: [], debriefChoice: null, seasonId: null, venueVisitCounts: {}, experienceMode: "guided", assistMode: false, castUsedAssistance: false, castAttempts: 0, tripJournalIds: [], tripSafeJournalIds: [] };
}

export function selectVenue(state: ExpeditionState, venueId: string): ExpeditionState {
  const venue = venues.find((item) => item.id === venueId);
  if (!venue) return state;
  const season = getNextSeason(state, venue);
  const preserved = { ...createInitialState(), observations: state.observations, learningAnswers: state.learningAnswers, expeditionNumber: state.expeditionNumber + 1, journalIds: state.journalIds, completedAssignmentIds: state.completedAssignmentIds, venueVisitCounts: state.venueVisitCounts, experienceMode: state.experienceMode, assistMode: state.assistMode, seasonId: season.id };
  const assignment = getNextAssignment(preserved, venue);
  return { ...preserved, venueId, stage: "arrival", activeAssignmentId: assignment?.id ?? null };
}

export function beginQuestions(state: ExpeditionState): ExpeditionState { return state.stage === "arrival" ? { ...state, stage: "questions" } : state; }

export function askQuestion(state: ExpeditionState, id: string): ExpeditionState {
  const venue = getVenue(state);
  if (!venue || state.stage !== "questions" || state.askedQuestions.includes(id) || !venue.questions.some((question) => question.id === id) || state.askedQuestions.length >= 2) return state;
  return { ...state, askedQuestions: [...state.askedQuestions, id], trust: state.trust + 5, ecology: state.ecology + 2 };
}

export function finishQuestions(state: ExpeditionState): ExpeditionState { return state.stage === "questions" && state.askedQuestions.length === 2 ? { ...state, stage: "gear" } : state; }

export function selectGear(state: ExpeditionState, id: string): ExpeditionState {
  const venue = getVenue(state);
  return venue && state.stage === "gear" && venue.gearSets.some((gear) => gear.id === id) ? { ...state, gearId: id } : state;
}

export function finishGear(state: ExpeditionState): ExpeditionState { return state.stage === "gear" && state.gearId ? { ...state, stage: "habitat" } : state; }

export function selectHabitat(state: ExpeditionState, id: string): ExpeditionState {
  const venue = getVenue(state);
  return venue && state.stage === "habitat" && venue.habitats.some((habitat) => habitat.id === id) ? { ...state, zoneId: id } : state;
}

export function getHabitatBlockReason(state: ExpeditionState, habitatId: string): string | null {
  const venue = getVenue(state);
  const habitat = venue?.habitats.find((item) => item.id === habitatId);
  if (!habitat) return "Choose a known observation site.";
  if (habitat.safe === false) return habitat.safetyNote ?? "Choose a safer observation site.";
  if (venue?.id === "alaska-kelp" && habitatId === "ledge" && state.tripJournalIds.includes("alaska-kelp:black-rockfish")) {
    return "This station is closed after incidental rockfish. Choose another habitat to avoid another capture.";
  }
  return null;
}

export function getIdealCastPower(state: ExpeditionState): number {
  const venue = getVenue(state);
  return venue && state.zoneId ? venue.idealPower[state.zoneId] ?? 50 : 50;
}

export function castLine(state: ExpeditionState, power = 50): ExpeditionState {
  const venue = getVenue(state);
  if (!venue || state.stage !== "habitat" || !state.zoneId || !state.gearId || state.castAttempts >= MAX_CAST_ATTEMPTS) return state;
  if (getHabitatBlockReason(state, state.zoneId)) return state;
  const key = `${state.zoneId}:${state.gearId}`;
  const accuracy = Math.max(0, 100 - Math.abs(getIdealCastPower(state) - power) * (60 / getCastTargetWidth(state)));
  const routedEncounterId = venue.overcastZoneId === state.zoneId && power > 82 && venue.overcastEncounterId ? venue.overcastEncounterId : venue.encounterRules[key] ?? venue.fallbackEncounterId;
  const encounterId = resolveSeasonEncounter(venue, state.seasonId, routedEncounterId, state.gearId);
  const encounter = venue.encounters[encounterId];
  const activeFish = encounter?.type === "fish" && venue.gearSets.find((item) => item.id === state.gearId)?.hook !== "No hook";
  const placementPressure = accuracy >= 70 ? -6 : accuracy >= 40 ? 0 : 8;
  const initialTension = Math.max(18, Math.min(90, (venue.initialTension[encounterId] ?? 48) + placementPressure));
  const fishMaxDistance = activeFish ? Math.max(6, Math.min(10, Math.round((initialTension - 40) / 10) + 6)) : 0;
  const informed = state.askedQuestions.includes(venue.informedQuestionByZone[state.zoneId]);
  const newTripEntry = !state.tripJournalIds.includes(`${venue.id}:${encounterId}`);
  return { ...state, stage: "cast", encounterId, castPower: power, castAccuracy: accuracy, castUsedAssistance: state.assistMode, castAttempts: state.castAttempts + 1, lineTurn: 0, lineTension: initialTension, lineActions: [], lineQuality: 0, lineResolved: false, fishDistance: fishMaxDistance, fishMaxDistance, fishStamina: Math.ceil(fishMaxDistance / 2), fightPhase: "run", phaseProgress: 0, fightMessage: activeFish ? "The fish turns away from the boat. Let it run before taking line." : "Wait through interference, then record when the signal settles.", interactionProgress: 0, interactionMistakes: 0, fieldcraft: state.fieldcraft + (newTripEntry ? (informed ? 6 : 3) + (accuracy >= 70 ? 4 : accuracy >= 40 ? 2 : 0) : 0), ecology: state.ecology + (newTripEntry ? 3 : 0) };
}

function isActiveFishFight(state: ExpeditionState, venue: Venue) {
  const encounter = state.encounterId ? venue.encounters[state.encounterId] : null;
  const gear = venue.gearSets.find((item) => item.id === state.gearId);
  return encounter?.type === "fish" && gear?.hook !== "No hook";
}

export const FISHING_TICK_MS = 250;

export function getCastTargetWidth(state: ExpeditionState) {
  const venue = getVenue(state);
  if (!venue || !state.zoneId) return 18;
  const informed = state.askedQuestions.includes(venue.informedQuestionByZone[state.zoneId]);
  const assignment = getActiveAssignment(state);
  return 18 + (informed ? 6 : 0) + (assignment?.gearId === state.gearId ? 6 : 0);
}

export function hasLostFish(state: ExpeditionState) {
  const venue = getVenue(state);
  return Boolean(venue && state.stage === "cast" && !state.lineResolved && state.lineTension >= 100 && isActiveFishFight(state, venue));
}

export function retryFish(state: ExpeditionState): ExpeditionState {
  if (!hasLostFish(state)) return state;
  // Retry the same encounter without issuing cast rewards or consuming another assignment attempt.
  return { ...state, lineTension: 48, interactionProgress: 0, fishDistance: state.fishMaxDistance,
    fightPhase: "run", phaseProgress: 0, fightMessage: "Another bite. Release during the run, then hold to reel when the fish tires." };
}

export function getFishCue(state: ExpeditionState) {
  const profile = getFightProfile(state);
  const length = state.fightPhase === "run" ? profile.runTicks : profile.restTicks;
  if (state.lineResolved || hasLostFish(state) || length - state.phaseProgress > 3) return null;
  return state.fightPhase === "rest" ? "The fish turns — a run is coming. Get ready to release." : "The ripples ease — get ready to reel.";
}

export function advanceInteraction(state: ExpeditionState, engaged: boolean): ExpeditionState {
  const venue = getVenue(state);
  if (!venue || state.stage !== "cast" || !state.encounterId || state.lineResolved || hasLostFish(state)) return state;

  const activeFish = isActiveFishFight(state, venue);
  const profile = getFightProfile(state);
  const phaseLength = state.fightPhase === "run" ? profile.runTicks : profile.restTicks;
  const phaseProgress = state.phaseProgress + 1;
  const productive = state.fightPhase === "rest" && engaged;
  const correctControl = engaged === (state.fightPhase === "rest");
  const rawTension = state.lineTension + (engaged ? profile.tensionGain : -profile.tensionRelease);
  // The taught control includes the crew's drag adjustment. Following it cannot
  // create slack or strain that the one-button interface cannot independently fix.
  const nextTension = correctControl
    ? Math.max(profile.safeMin + 4, Math.min(profile.safeMax - 4, rawTension))
    : Math.max(8, Math.min(100, rawTension));
  const progressGain = productive ? (activeFish ? 2 : profile.progressGain) : 0;
  const progressLoss = phaseProgress % 3 === 0 ? (state.fightPhase === "run" && engaged ? 4 : activeFish && state.fightPhase === "rest" && !engaged ? 1 : 0) : 0;
  const interactionProgress = Math.max(0, Math.min(100, state.interactionProgress + progressGain - progressLoss));
  const mistake = (state.fightPhase === "run" && engaged && phaseProgress % 3 === 0)
    || (state.fightPhase === "rest" && !engaged && phaseProgress === phaseLength);
  const interactionMistakes = state.interactionMistakes + (mistake ? 1 : 0);
  const lineResolved = interactionProgress >= 100 && !(activeFish && nextTension >= 100);
  const nextPhase = phaseProgress >= phaseLength ? (state.fightPhase === "run" ? "rest" : "run") : state.fightPhase;
  const nextPhaseProgress = phaseProgress >= phaseLength ? 0 : phaseProgress;
  const fishDistance = activeFish ? Math.max(0, Math.ceil((100 - interactionProgress) / 10)) : 0;
  const fightMessage = activeFish && nextTension >= 100 ? "The line broke. Reeling through the run put too much pressure on it. Release when the fish surges." : lineResolved
    ? activeFish ? "The fish is alongside." : "The observation is recorded."
    : nextPhase === "run"
      ? activeFish ? "The fish surges away. Release and let it run." : "Interference rises. Release and wait."
      : activeFish ? "The fish tires. Hold to reel." : "The signal is stable. Hold to record.";

  return {
    ...state,
    lineTurn: state.lineTurn + 1,
    lineTension: nextTension,
    lineQuality: state.lineQuality + (productive && phaseProgress % 3 === 0 ? 1 : 0),
    lineResolved,
    fishDistance,
    fishStamina: activeFish ? Math.max(0, Math.ceil((100 - interactionProgress) / 20)) : 0,
    fightPhase: nextPhase,
    phaseProgress: nextPhaseProgress,
    fightMessage,
    interactionProgress,
    interactionMistakes,
    fieldcraft: state.fieldcraft + (lineResolved ? techniqueImprovement(state, interactionMistakes) : 0),
  };
}

export function advanceAssistedInteraction(state: ExpeditionState): ExpeditionState {
  if (state.stage !== "cast" || !state.encounterId || state.lineResolved) return state;
  const phase = state.fightPhase;
  let current = { ...state, castUsedAssistance: true };
  for (let tick = 0; tick < 16 && !current.lineResolved && current.fightPhase === phase; tick += 1) {
    current = advanceInteraction(current, phase === "rest");
  }
  return current;
}

function expectedRunAction(state: ExpeditionState, venue: Venue): LineAction {
  const pattern = state.encounterId ? venue.linePatterns[state.encounterId] : null;
  const initialStamina = Math.ceil(state.fishMaxDistance / 2);
  const completedRuns = Math.max(0, initialStamina - state.fishStamina);
  const authored = pattern?.[completedRuns % Math.max(1, pattern.length)];
  return authored === "give" ? "give" : "hold";
}

export function getRecommendedLineAction(state: ExpeditionState): LineAction {
  const venue = getVenue(state);
  if (!venue || !state.encounterId) return "hold";
  if (!isActiveFishFight(state, venue)) return venue.linePatterns[state.encounterId]?.[state.lineTurn] ?? "hold";
  if (state.fightPhase === "run") return expectedRunAction(state, venue);
  return state.lineTension >= 78 ? "hold" : "reel";
}

function manageFishFight(state: ExpeditionState, action: LineAction, venue: Venue): ExpeditionState {
  const expected = getRecommendedLineAction(state);
  let lineTension = state.lineTension;
  let fishDistance = state.fishDistance;
  let fishStamina = state.fishStamina;
  let fightPhase = state.fightPhase;
  let phaseProgress = state.phaseProgress;
  let fightMessage = state.fightMessage;
  let correct = false;

  if (state.fightPhase === "run") {
    if (action === "reel") {
      lineTension += 20;
      fishDistance = Math.min(state.fishMaxDistance + 2, fishDistance + 1);
      fightMessage = "The fish is still running. Reeling adds tension and gives back distance.";
    } else {
      correct = action === expected;
      lineTension += action === "give" ? -13 : correct ? 2 : 9;
      fishStamina = Math.max(0, fishStamina - (correct ? 1 : 0));
      fightPhase = "rest";
      phaseProgress = 0;
      fightMessage = correct ? "The run shortens. The fish pauses and gives you a reeling window." : "The line holds, but the fish spends little energy. Reel carefully before it runs again.";
    }
  } else if (action === "reel") {
    correct = true;
    lineTension += 8;
    fishDistance = Math.max(0, fishDistance - 1);
    phaseProgress += 1;
    fightMessage = fishDistance === 0 ? "The fish is alongside." : "One measured turn of line comes back onto the reel.";
    if (fishDistance > 0 && fishStamina > 0 && phaseProgress >= 2) {
      fightPhase = "run";
      phaseProgress = 0;
      fightMessage = "The fish feels the pressure and starts another run.";
    }
  } else {
    lineTension += action === "give" ? -14 : -8;
    fishDistance = action === "give" ? Math.min(state.fishMaxDistance + 2, fishDistance + 1) : fishDistance;
    fightMessage = action === "give" ? "The fish gains a little distance while the line settles." : "You lower the rod and let the tension settle before reeling.";
    correct = action === expected;
  }

  if (lineTension >= 96) {
    lineTension = 72;
    fishDistance = Math.min(state.fishMaxDistance + 2, fishDistance + 1);
    fightPhase = "run";
    phaseProgress = 0;
    fightMessage = "The drag slips under excessive tension. The fish takes line, but the connection holds.";
    correct = false;
  } else if (lineTension <= 14) {
    lineTension = 34;
    fishDistance = Math.min(state.fishMaxDistance + 2, fishDistance + 1);
    fightPhase = "run";
    phaseProgress = 0;
    fightMessage = "Slack reaches the line. The fish turns away before contact is restored.";
    correct = false;
  }

  const lineResolved = fishDistance === 0;
  return {
    ...state,
    lineTurn: state.lineTurn + 1,
    lineTension: Math.max(8, Math.min(100, lineTension)),
    lineActions: [...state.lineActions, action],
    lineQuality: state.lineQuality + (correct ? 1 : 0),
    lineResolved,
    fishDistance,
    fishStamina,
    fightPhase,
    phaseProgress,
    fightMessage,
    fieldcraft: state.fieldcraft + (correct ? 1 : 0),
  };
}

export function manageLine(state: ExpeditionState, action: LineAction): ExpeditionState {
  const venue = getVenue(state);
  if (!venue || state.stage !== "cast" || !state.encounterId || state.lineResolved) return state;
  if (isActiveFishFight(state, venue)) return manageFishFight(state, action, venue);
  const expected = venue.linePatterns[state.encounterId]?.[state.lineTurn];
  if (!expected) return state;
  const correct = action === expected;
  const lineTension = Math.max(8, Math.min(100, state.lineTension + tensionChange[action] + (correct ? -3 : action === "reel" ? 7 : 0)));
  const lineTurn = state.lineTurn + 1;
  return { ...state, lineTurn, lineTension, lineActions: [...state.lineActions, action], lineQuality: state.lineQuality + (correct ? 1 : 0), lineResolved: lineTurn >= venue.linePatterns[state.encounterId].length, fieldcraft: state.fieldcraft + (correct ? 3 : 0) };
}

export function revealEncounter(state: ExpeditionState): ExpeditionState { return state.stage === "cast" && state.lineResolved ? { ...state, stage: "handling" } : state; }

export function handleEncounter(state: ExpeditionState, handlingId: string): ExpeditionState {
  const venue = getVenue(state);
  if (!venue || state.stage !== "handling" || !state.encounterId || !state.zoneId || !state.gearId) return state;
  const option = venue.encounters[state.encounterId]?.handling.find((item) => item.id === handlingId);
  if (!option) return state;
  const journalId = `${venue.id}:${state.encounterId}`;
  const firstEntry = !state.tripJournalIds.includes(journalId);
  const correctedHandling = !firstEntry && option.safe && !state.tripSafeJournalIds.includes(journalId);
  const observation = {
    id: (state.observations.at(-1)?.id ?? 0) + 1,
    expedition: state.expeditionNumber,
    venueId: venue.id,
    seasonId: getSeason(venue, state.seasonId).id,
    habitatId: state.zoneId,
    gearId: state.gearId,
    encounterId: state.encounterId,
    handlingId,
    castAccuracy: state.castAccuracy,
    controlMistakes: state.interactionMistakes,
    assisted: state.castUsedAssistance,
    shared: false,
  };
  return { ...state, stage: "journal", handlingId,
    observations: [...state.observations, observation],
    fieldcraft: state.fieldcraft + (firstEntry ? option.safe ? 12 : 2 : correctedHandling ? 10 : 0),
    biology: state.biology + (firstEntry ? option.safe ? 8 : 4 : correctedHandling ? 4 : 0),
    ecology: state.ecology + (firstEntry ? 7 : 0),
    trust: state.trust + (!option.safe ? -2 : firstEntry || correctedHandling ? 8 : 0),
    journalIds: state.journalIds.includes(journalId) ? state.journalIds : [...state.journalIds, journalId],
    tripJournalIds: firstEntry ? [...state.tripJournalIds, journalId] : state.tripJournalIds,
    tripSafeJournalIds: option.safe && !state.tripSafeJournalIds.includes(journalId) ? [...state.tripSafeJournalIds, journalId] : state.tripSafeJournalIds };
}

export function continueExpedition(state: ExpeditionState): ExpeditionState {
  if (state.stage !== "journal" || state.castAttempts >= MAX_CAST_ATTEMPTS) return state;
  return { ...state, stage: "gear", encounterId: null, castPower: null, castAccuracy: 0, castUsedAssistance: false, lineTurn: 0, lineTension: 48, lineActions: [], lineQuality: 0, lineResolved: false, fishDistance: 0, fishMaxDistance: 0, fishStamina: 0, fightPhase: "run", phaseProgress: 0, fightMessage: "", interactionProgress: 0, interactionMistakes: 0, handlingId: null };
}

export function beginDebrief(state: ExpeditionState): ExpeditionState {
  return state.stage === "journal" ? { ...state, stage: "debrief" } : state;
}

export function completeDebrief(state: ExpeditionState, choice: ExpeditionState["debriefChoice"]): ExpeditionState {
  const venue = getVenue(state);
  if (!venue || state.stage !== "debrief" || state.debriefChoice || !choice || !state.encounterId || !state.handlingId) return state;
  const assignmentCompleted = Boolean(state.activeAssignmentId && state.tripSafeJournalIds.includes(state.activeAssignmentId) && choice === "full-notes");
  return {
    ...state,
    debriefChoice: choice,
    observations: choice === "full-notes" ? state.observations.map((observation) => observation.expedition === state.expeditionNumber
      ? { ...observation, shared: true } : observation) : state.observations,
    fieldcraft: state.fieldcraft + (choice === "full-notes" ? 2 : 0),
    biology: state.biology + (choice === "identity-only" ? 4 : choice === "full-notes" ? 2 : 0),
    ecology: state.ecology + (choice === "full-notes" ? 5 : 0),
    trust: state.trust + (choice === "full-notes" ? 6 : choice === "identity-only" ? 2 : 0),
    completedAssignmentIds: assignmentCompleted && state.activeAssignmentId && !state.completedAssignmentIds.includes(state.activeAssignmentId)
      ? [...state.completedAssignmentIds, state.activeAssignmentId]
      : state.completedAssignmentIds,
    venueVisitCounts: { ...state.venueVisitCounts, [venue.id]: (state.venueVisitCounts[venue.id] ?? 0) + 1 },
  };
}

export function getCurrentEncounter(state: ExpeditionState) { const venue = getVenue(state); return venue && state.encounterId ? venue.encounters[state.encounterId] ?? null : null; }
export function resetExpedition(): ExpeditionState { return createInitialState(); }

// A deliberate guided choice: keep both real guide answers and do not invent a prediction.
export function useGuideKit(state: ExpeditionState): ExpeditionState {
  if (state.stage !== "questions" || state.experienceMode !== "guided" || state.askedQuestions.length !== 2) return state;
  const assignment = getActiveAssignment(state);
  if (!assignment) return state;
  return finishGear(selectGear(finishQuestions(state), assignment.gearId));
}

export function recastWithKit(state: ExpeditionState): ExpeditionState {
  if (state.stage !== "journal" || state.castAttempts >= MAX_CAST_ATTEMPTS || !state.gearId) return state;
  return finishGear(continueExpedition(state));
}
