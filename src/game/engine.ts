import { venueById, venues } from "../data/venues";
import type { Encounter, ExpeditionState, FieldObservation, FightProfileId, InteractionKind, LineAction, Venue } from "../types";
import { getActiveAssignment, getNextAssignment } from "./assignments";
import { getNextSeason, getSeason, } from "./seasons";
import { journeyByteLength, MAX_FIELD_OBSERVATIONS, MAX_SAVE_BYTES, NEXT_OBSERVATION_RESERVE_BYTES } from "./limits";
import { getInteractionKind, getRoutedEncounterId, needsSnagApproach } from "./interactions";
import { getAnglingCue, getAnglingWindow, getPilotSpecies } from "./angling";

const CAST_NOTCH_POWER = 14;
export const MAX_CAST_ATTEMPTS = 3;
export { getRoutedEncounterId } from "./interactions";
export { MAX_FIELD_OBSERVATIONS } from "./limits";

export function getObservationCapacityReason(state: ExpeditionState): string | null {
  if (state.observations.length >= MAX_FIELD_OBSERVATIONS || (state.observations.at(-1)?.id ?? 0) >= 1000000) {
    return "Your field journal is full. Export this journey, then start a new one before making another cast.";
  }
  if (journeyByteLength(state) + NEXT_OBSERVATION_RESERVE_BYTES > MAX_SAVE_BYTES) {
    return "Your field journal is near its save-size limit. Export this journey, then start a new one before making another cast.";
  }
  return null;
}

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
  bycatch: { id: "bycatch", label: "Incidental contact", cue: "Ease pressure during movement, then steady contact during the calm window.", runTicks: 8, restTicks: 10, progressGain: 3, tensionGain: 6, tensionRelease: 4, safeMin: 18, safeMax: 70 },
  snag: { id: "snag", label: "Snag response", cue: "Choose to back out before easing the tether; pulling through adds pressure.", runTicks: 8, restTicks: 8, progressGain: 5, tensionGain: 6, tensionRelease: 5, safeMin: 12, safeMax: 66 },
  camera: { id: "camera", label: "Camera survey", cue: "Wait for blur to clear, then hold a stable view to record it.", runTicks: 10, restTicks: 12, progressGain: 6, tensionGain: 4, tensionRelease: 3, safeMin: 12, safeMax: 72 },
  telemetry: { id: "telemetry", label: "Telemetry receiver", cue: "Listen hands off while the receiver gathers a reading; hold only to confirm the clear reading.", runTicks: 16, restTicks: 6, progressGain: 5, tensionGain: 5, tensionRelease: 3, safeMin: 12, safeMax: 72 },
  sampling: { id: "sampling", label: "Sampling station", cue: "Let the sampler settle before collecting during the settled window.", runTicks: 8, restTicks: 10, progressGain: 10, tensionGain: 4, tensionRelease: 3, safeMin: 12, safeMax: 72 },
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
  const kind = getInteractionKind(state, venue);
  if (kind !== "fish") return fightProfiles[kind];
  const window = getAnglingWindow(state, venue);
  if (window) return { ...fightProfiles.steady, label: window.label, cue: window.advice,
    runTicks: window.ticks, restTicks: window.ticks, progressGain: window.gain,
    tensionGain: window.tensionGain, tensionRelease: 4, safeMin: 24, safeMax: window.safeMax };
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
  const venue = getVenue(state); const kind = venue ? getInteractionKind(state, venue) : "fish";
  const labels: Record<InteractionKind, [string, string, string]> = { fish: ["Slack", "Strained", "Controlled"], bycatch: ["Unsteady", "Distressed", "Steady contact"], snag: ["Loose", "Loaded", "Light contact"], camera: ["Blur", "Shake", "Stable"], telemetry: ["Weak", "Interference", "Clear"], sampling: ["Unsettled", "Disturbed", "Settled"] };
  const low = state.lineTension < safeMin; const danger = state.lineTension > safeMax;
  const label = labels[kind][low ? 0 : danger ? 1 : 2];
  return { safeMin, safeMax, label, low, danger };
}

function techniquePoints(mistakes: number) { return Math.max(1, 5 - mistakes); }

function techniqueImprovement(state: ExpeditionState, mistakes: number) {
  const venue = getVenue(state);
  if (venue && getInteractionKind(state, venue) === "bycatch" && state.journalIds.includes(`${state.venueId}:${state.encounterId}`)) return 0;
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
  return { version: 12, anglingRules: "classic", anglingBeat: 0, observations: [], learningAnswers: [], learningRevisions: [], expeditionNumber: 0, venueId: null, stage: "venue", askedQuestions: [], gearId: null, zoneId: null, encounterId: null, castPower: null, castAccuracy: 0, lineTurn: 0, lineTension: 48, lineActions: [], snagApproach: "unassessed", lineQuality: 0, lineResolved: false, fishDistance: 0, fishMaxDistance: 0, fishStamina: 0, fightPhase: "run", phaseProgress: 0, fightMessage: "", interactionProgress: 0, interactionMistakes: 0, handlingId: null, fieldcraft: 0, biology: 0, ecology: 0, trust: 0, journalIds: [], activeAssignmentId: null, completedAssignmentIds: [], debriefChoice: null, seasonId: null, venueVisitCounts: {}, experienceMode: "guided", assistMode: false, castUsedAssistance: false, castAttempts: 0, tripJournalIds: [], tripSafeJournalIds: [] };
}

export function selectVenue(state: ExpeditionState, venueId: string): ExpeditionState {
  const venue = venues.find((item) => item.id === venueId);
  if (!venue) return state;
  const season = getNextSeason(state, venue);
  const preserved = { ...createInitialState(), observations: state.observations, learningAnswers: state.learningAnswers, learningRevisions: state.learningRevisions, expeditionNumber: state.expeditionNumber + 1, journalIds: state.journalIds, completedAssignmentIds: state.completedAssignmentIds, venueVisitCounts: state.venueVisitCounts, experienceMode: state.experienceMode, assistMode: state.assistMode, seasonId: season.id };
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
  return venue && state.stage === "gear" && venue.gearSets.some((gear) => gear.id === id) ? { ...state, gearId: id, snagApproach: "unassessed" } : state;
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
  if (state.observations.some(observation => observation.expedition === state.expeditionNumber && observation.venueId === venue?.id
    && observation.habitatId === habitatId && venue.encounters[observation.encounterId]?.interaction === "bycatch")) {
    return "This station is closed after an incidental encounter. Choose another habitat to avoid another capture.";
  }
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
  if (!venue || state.stage !== "habitat" || !state.zoneId || !state.gearId || state.castAttempts >= MAX_CAST_ATTEMPTS || getObservationCapacityReason(state)) return state;
  if (getHabitatBlockReason(state, state.zoneId)) return state;
  const accuracy = Math.max(0, 100 - Math.abs(getIdealCastPower(state) - power) * (60 / getCastTargetWidth(state)));
  const encounterId = getRoutedEncounterId(state, venue, power);
  const kind = getInteractionKind({ ...state, encounterId }, venue);
  const activeFish = kind === "fish";
  const placementPressure = accuracy >= 70 ? -6 : accuracy >= 40 ? 0 : 8;
  const initialTension = Math.max(18, Math.min(90, (venue.initialTension[encounterId] ?? 48) + placementPressure));
  const fishMaxDistance = activeFish ? Math.max(6, Math.min(10, Math.round((initialTension - 40) / 10) + 6)) : 0;
  const informed = state.askedQuestions.includes(venue.informedQuestionByZone[state.zoneId]);
  const newTripEntry = !state.tripJournalIds.includes(`${venue.id}:${encounterId}`) && !(kind === "bycatch" && state.journalIds.includes(`${venue.id}:${encounterId}`));
  return { ...state, anglingRules: getPilotSpecies({ ...state, encounterId }, venue) ? "habitat-v1" : "classic", anglingBeat: 0, stage: "cast", encounterId, castPower: power, castAccuracy: accuracy, castUsedAssistance: state.assistMode, castAttempts: state.castAttempts + 1, lineTurn: 0, lineTension: initialTension, lineActions: [], snagApproach: "unassessed", lineQuality: 0, lineResolved: false, fishDistance: fishMaxDistance, fishMaxDistance, fishStamina: Math.ceil(fishMaxDistance / 2), fightPhase: "run", phaseProgress: 0, fightMessage: kind === "snag" ? "The tether has snagged. Choose a back-out approach before the response timer can start." : getInteractionMessage(kind, "run", false, initialTension >= 100), interactionProgress: 0, interactionMistakes: 0, fieldcraft: state.fieldcraft + (newTripEntry ? (informed ? 6 : 3) + (accuracy >= 70 ? 4 : accuracy >= 40 ? 2 : 0) : 0), ecology: state.ecology + (newTripEntry ? 3 : 0) };
}

export function isActiveFishFight(state: ExpeditionState, venue: Venue) {
  return getInteractionKind(state, venue) === "fish";
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
  return { ...state, anglingBeat: 0, lineTension: 48, interactionProgress: 0, fishDistance: state.fishMaxDistance,
    fightPhase: "run", phaseProgress: 0, fightMessage: "Another bite. Release during the run, then hold to reel when the fish tires." };
}

function getInteractionMessage(kind: InteractionKind, phase: ExpeditionState["fightPhase"], resolved: boolean, strained = false): string {
  if (kind === "fish") return strained ? "The line broke. Reeling through the run put too much pressure on it. Release when the fish surges."
    : resolved ? "The fish is alongside." : phase === "run" ? "The fish surges away. Release and let it run." : "The fish tires. Hold to reel.";
  if (kind === "bycatch") return resolved ? "Contact is stabilized for the incident response. No reeling to exhaust the animal is needed."
    : strained ? "Pressure is too high. Ease contact during movement before continuing the response."
      : phase === "run" ? "The animal moves. Release to ease pressure and stabilize contact." : "Movement eases. Hold steady contact without reeling.";
  if (kind === "snag") return resolved ? "The tether is eased back. Continue to the habitat response."
    : strained ? "The tether is loaded. Stop pulling and ease it back."
      : phase === "run" ? "Ease the tether back; release while it is loaded." : "Hold light contact while the tether settles.";
  if (kind === "telemetry") return resolved ? "The received reading is confirmed."
    : phase === "run" ? "Hands off: the receiver is listening and accumulating a reading." : "A clear reading is available. Hold briefly to confirm it.";
  if (kind === "sampling") return resolved ? "The settled sample is collected."
    : phase === "run" ? "Hands off: let the sampler settle." : "The sampler is settled. Hold to collect this sample.";
  return resolved ? "The stable camera observation is recorded."
    : phase === "run" ? "The view is blurred. Release and wait for it to clear." : "The view is stable. Hold to record the observation.";
}

export function getRecommendedEngagement(state: ExpeditionState): boolean {
  const venue = getVenue(state);
  return (venue && getAnglingWindow(state, venue)?.engage) ?? (state.fightPhase === "rest");
}

export function chooseSnagApproach(state: ExpeditionState, action: "back-out" | "pull-through"): ExpeditionState {
  const venue = getVenue(state);
  if (!venue || state.stage !== "cast" || !state.encounterId || !needsSnagApproach(state, venue) || state.snagApproach === action) return state;
  const correct = action === "back-out";
  const profile = getFightProfile(state);
  return { ...state, snagApproach: action, lineTurn: state.lineTurn + 1,
    lineActions: [...state.lineActions, correct ? "give" : "reel"],
    lineTension: correct ? Math.max(profile.safeMin + 4, Math.min(profile.safeMax - 4, state.lineTension - 12)) : Math.min(100, state.lineTension + 12),
    interactionMistakes: state.interactionMistakes + (correct ? 0 : 1),
    fightMessage: correct ? "Back-out approach chosen. Ease the tether before continuing; the timer can now run."
      : "Pulling through adds pressure and does not clear the snag. Choose to back out before the response can continue." };
}

export function getInteractionCue(state: ExpeditionState) {
  const profile = getFightProfile(state);
  const venue = getVenue(state); const kind = venue ? getInteractionKind(state, venue) : "fish";
  const window = venue && getAnglingWindow(state, venue);
  if (window) return state.lineResolved || hasLostFish(state) ? null : getAnglingCue(window);
  if (venue && needsSnagApproach(state, venue)) return "Assess the snag first. Back out rather than pulling through.";
  const length = state.fightPhase === "run" ? profile.runTicks : profile.restTicks;
  if (state.lineResolved || hasLostFish(state) || length - state.phaseProgress > 3) return null;
  const cues: Record<InteractionKind, [string, string]> = {
    fish: ["The ripples ease — get ready to reel.", "The fish turns — a run is coming. Get ready to release."],
    bycatch: ["Movement eases — get ready to steady contact.", "Movement returns — get ready to ease pressure."],
    snag: ["The tether settles — get ready for light contact.", "Load returns — get ready to ease the tether."],
    camera: ["The view clears — get ready to record.", "The view will blur — get ready to wait."],
    telemetry: ["A clear reading is arriving — get ready to confirm.", "Confirmation ends — get ready to listen hands off."],
    sampling: ["The sampler settles — get ready to collect.", "The collection window ends — let the sampler settle again."],
  };
  return cues[kind][state.fightPhase === "run" ? 0 : 1];
}

export const getFishCue = getInteractionCue;

function advanceNonfishInteraction(state: ExpeditionState, engaged: boolean, kind: Exclude<InteractionKind, "fish">): ExpeditionState {
  const profile = getFightProfile(state);
  const phaseLength = state.fightPhase === "run" ? profile.runTicks : profile.restTicks;
  // Old mid-encounter saves can contain progress from a longer former profile.
  const phaseProgress = Math.min(state.phaseProgress, phaseLength - 1) + 1;
  const correctControl = engaged === getRecommendedEngagement(state);
  const grace = phaseProgress <= 2;
  const rawTension = state.lineTension + (engaged ? profile.tensionGain : -profile.tensionRelease);
  const lineTension = correctControl ? Math.max(profile.safeMin + 4, Math.min(profile.safeMax - 4, rawTension)) : Math.max(8, Math.min(100, rawTension));
  const survey = kind === "camera" || kind === "telemetry" || kind === "sampling";
  // A stable capture/collection needs a real waiting period, not a held button.
  const stalled = survey && state.fightPhase === "run" && engaged && !grace;
  const productive = correctControl && (kind === "bycatch" || kind === "snag" || kind === "telemetry" || state.fightPhase === "rest");
  const loss = !correctControl && !grace && state.fightPhase === "run" ? kind === "camera" || kind === "sampling" ? state.interactionProgress : 6 : 0;
  const interactionProgress = Math.max(0, Math.min(100, state.interactionProgress + (productive ? profile.progressGain : 0) - loss));
  const mistake = !correctControl && !grace && (state.fightPhase === "run" ? phaseProgress % 3 === 0 : phaseProgress === phaseLength);
  const interactionMistakes = state.interactionMistakes + (mistake ? 1 : 0);
  // Timed ticks are simulation updates, not new player decisions. Preserve the
  // explicit action history so an unattended encounter stays small and saveable.
  const lineActions: LineAction[] = state.lineActions;
  // For physical incidents this records steady contact in a calm window, not exhaustion.
  const qualityGain = productive && (kind !== "bycatch" && kind !== "snag" || state.fightPhase === "rest") ? 1 : 0;
  const lineQuality = state.lineQuality + qualityGain;
  const responseComplete = kind === "bycatch" || kind === "snag" ? state.fightPhase === "run" && !engaged
    : state.fightPhase === "rest" && engaged && (kind !== "telemetry" || phaseProgress > 2);
  const stabilized = kind !== "bycatch" && kind !== "snag" || lineQuality > 0;
  const lineResolved = interactionProgress >= 100 && correctControl && responseComplete && stabilized && lineTension <= profile.safeMax;
  const nextPhase = !stalled && phaseProgress >= phaseLength ? state.fightPhase === "run" ? "rest" : "run" : state.fightPhase;
  const nextPhaseProgress = stalled ? 2 : phaseProgress >= phaseLength ? 0 : phaseProgress;
  return { ...state, lineTurn: state.lineTurn + 1, lineActions, lineTension, lineQuality,
    lineResolved, fishDistance: 0, fishMaxDistance: 0, fishStamina: 0, fightPhase: nextPhase, phaseProgress: nextPhaseProgress,
    fightMessage: stalled ? kind === "telemetry" ? "Holding interrupts listening. Release so the receiver can finish gathering its reading."
      : kind === "sampling" ? "Holding disturbs the sampler. Release and let it settle before collecting."
        : "Holding keeps the view blurred. Release and wait for a stable view." : getInteractionMessage(kind, nextPhase, lineResolved, lineTension > profile.safeMax),
    interactionProgress, interactionMistakes,
    fieldcraft: state.fieldcraft + (lineResolved ? techniqueImprovement(state, interactionMistakes) : 0) };
}

function advancePilotAngling(state: ExpeditionState, engaged: boolean, venue: Venue): ExpeditionState {
  const window = getAnglingWindow(state, venue)!;
  const correct = engaged === window.engage;
  // Two ticks of reaction time at EVERY authored window, including successive
  // windows with the same phase/action. Only the saved beat controls timing.
  const grace = window.elapsed < 2;
  const rawTension = state.lineTension + (engaged ? window.tensionGain : -4);
  const tension = correct || grace ? Math.max(28, Math.min(window.safeMax - 4, rawTension)) : Math.max(8, Math.min(100, rawTension));
  const productive = window.engage && engaged;
  const penaltyTick = !correct && !grace && window.elapsed % 3 === 2;
  const loss = penaltyTick ? window.id === 'cover' ? 2 : window.engage ? 1 : 4 : 0;
  const progress = Math.max(0, Math.min(100, state.interactionProgress + (productive ? window.gain : 0) - loss));
  const mistakes = state.interactionMistakes + (penaltyTick ? 1 : 0);
  const resolved = progress >= 100 && tension < 100;
  const next = { ...state, anglingBeat: state.anglingBeat + 1, lineTurn: state.lineTurn + 1,
    lineTension: tension, interactionProgress: progress, interactionMistakes: mistakes,
    lineQuality: state.lineQuality + (productive && window.elapsed % 3 === 2 ? 1 : 0),
    lineResolved: resolved, fishDistance: Math.max(0, Math.ceil((100 - progress) / 10)),
    fishStamina: Math.max(0, Math.ceil((100 - progress) / 20)),
    fieldcraft: state.fieldcraft + (resolved ? techniqueImprovement(state, mistakes) : 0) };
  const nextWindow = getAnglingWindow(next, venue)!;
  return { ...next, lineTension: correct || grace ? Math.max(28, Math.min(nextWindow.safeMax - 4, tension)) : tension,
    fightPhase: nextWindow.engage ? 'rest' : 'run', phaseProgress: nextWindow.elapsed,
    fightMessage: tension >= 100 ? 'The line broke under excessive pressure. Retry, then read each behavior window.'
      : resolved ? 'The fish is alongside.' : penaltyTick ? window.miss : nextWindow.advice };
}

export function advanceInteraction(state: ExpeditionState, engaged: boolean): ExpeditionState {
  const venue = getVenue(state);
  if (!venue || state.stage !== "cast" || !state.encounterId || state.lineResolved || hasLostFish(state)) return state;
  if (needsSnagApproach(state, venue)) return state;
  const kind = getInteractionKind(state, venue);
  if (kind !== "fish") return advanceNonfishInteraction(state, engaged, kind);
  if (getAnglingWindow(state, venue)) return advancePilotAngling(state, engaged, venue);

  const activeFish = isActiveFishFight(state, venue);
  const profile = getFightProfile(state);
  const phaseLength = state.fightPhase === "run" ? profile.runTicks : profile.restTicks;
  const phaseProgress = Math.min(state.phaseProgress, phaseLength - 1) + 1;
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
  const venue = getVenue(state);
  if (!venue || needsSnagApproach(state, venue)) return state;
  const window = getAnglingWindow(state, venue);
  if (window) {
    let current = { ...state, castUsedAssistance: true };
    for (let tick = 0; tick < window.remaining && !current.lineResolved && !hasLostFish(current); tick++) {
      current = advanceInteraction(current, getRecommendedEngagement(current));
    }
    return current;
  }
  const phase = state.fightPhase;
  let current = { ...state, castUsedAssistance: true };
  const profile = getFightProfile(state);
  const phaseLength = phase === "run" ? profile.runTicks : profile.restTicks;
  for (let tick = 0; tick < phaseLength && !current.lineResolved && current.fightPhase === phase; tick += 1) {
    current = advanceInteraction(current, getRecommendedEngagement(current));
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
  const window = getAnglingWindow(state, venue);
  if (window) return window.engage ? window.id === 'cover' ? 'hold' : 'reel' : 'give';
  if (!isActiveFishFight(state, venue)) return needsSnagApproach(state, venue) ? "give" : getRecommendedEngagement(state) ? "hold" : "give";
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
  if (getAnglingWindow(state, venue)) {
    const next = advanceInteraction(state, action !== 'give');
    return next === state ? state : { ...next, lineActions: [...state.lineActions, action] };
  }
  if (isActiveFishFight(state, venue)) return manageFishFight(state, action, venue);
  if (needsSnagApproach(state, venue)) return action === "hold" ? state : chooseSnagApproach(state, action === "give" ? "back-out" : "pull-through");
  const next = advanceInteraction(state, action !== "give");
  return next === state ? state : { ...next, lineActions: [...state.lineActions, action] };
}

export function revealEncounter(state: ExpeditionState): ExpeditionState { return state.stage === "cast" && state.lineResolved ? { ...state, stage: "handling" } : state; }

export function getHandlingOptions(state: ExpeditionState): Encounter["handling"] {
  const options = getCurrentEncounter(state)?.handling ?? [];
  if (options.length < 2) return [...options];
  // The order stays fixed for this attempt and survives saving. IDs, not positions,
  // select the response, so a learner cannot rely on the first option being safe.
  const key = `${state.venueId}:${state.encounterId}`;
  let hash = 0;
  for (const char of key) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  const offset = (hash + state.expeditionNumber + state.castAttempts) % options.length;
  return [...options.slice(offset), ...options.slice(0, offset)];
}

export function handleEncounter(state: ExpeditionState, handlingId: string): ExpeditionState {
  const venue = getVenue(state);
  if (!venue || state.stage !== "handling" || !state.encounterId || !state.zoneId || !state.gearId) return state;
  const option = venue.encounters[state.encounterId]?.handling.find((item) => item.id === handlingId);
  if (!option) return state;
  const journalId = `${venue.id}:${state.encounterId}`;
  const firstEntry = !state.tripJournalIds.includes(journalId);
  const repeatedIncident = getInteractionKind(state, venue) === "bycatch" && state.journalIds.includes(journalId);
  const rewardedEntry = firstEntry && !repeatedIncident;
  const correctedHandling = !firstEntry && !repeatedIncident && option.safe && !state.tripSafeJournalIds.includes(journalId);
  const observation: FieldObservation = {
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
    reportingStatus: "pending",
  };
  return { ...state, stage: "journal", handlingId,
    observations: [...state.observations, observation],
    fieldcraft: state.fieldcraft + (rewardedEntry ? option.safe ? 12 : 2 : correctedHandling ? 10 : 0),
    biology: state.biology + (rewardedEntry ? option.safe ? 8 : 4 : correctedHandling ? 4 : 0),
    ecology: state.ecology + (rewardedEntry ? 7 : 0),
    trust: state.trust + (repeatedIncident ? 0 : !option.safe ? -2 : rewardedEntry || correctedHandling ? 8 : 0),
    journalIds: state.journalIds.includes(journalId) ? state.journalIds : [...state.journalIds, journalId],
    tripJournalIds: firstEntry ? [...state.tripJournalIds, journalId] : state.tripJournalIds,
    tripSafeJournalIds: option.safe && !state.tripSafeJournalIds.includes(journalId) ? [...state.tripSafeJournalIds, journalId] : state.tripSafeJournalIds };
}

export function continueExpedition(state: ExpeditionState): ExpeditionState {
  if (state.stage !== "journal" || state.castAttempts >= MAX_CAST_ATTEMPTS) return state;
  return { ...state, anglingRules: "classic", anglingBeat: 0, stage: "gear", encounterId: null, castPower: null, castAccuracy: 0, castUsedAssistance: false, lineTurn: 0, lineTension: 48, lineActions: [], snagApproach: "unassessed", lineQuality: 0, lineResolved: false, fishDistance: 0, fishMaxDistance: 0, fishStamina: 0, fightPhase: "run", phaseProgress: 0, fightMessage: "", interactionProgress: 0, interactionMistakes: 0, handlingId: null };
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
    observations: state.observations.map((observation) => observation.expedition === state.expeditionNumber
      ? { ...observation, shared: choice === "full-notes", reportingStatus: choice } : observation),
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
