export type Stage = "venue" | "arrival" | "questions" | "gear" | "habitat" | "cast" | "handling" | "journal" | "debrief";
export type LineAction = "reel" | "hold" | "give";
export type FightPhase = "run" | "rest";
export type ExperienceMode = "guided" | "field";
export type FightProfileId = "burst" | "bottom" | "aerial" | "steady" | "passive" | "bycatch" | "snag" | "camera" | "telemetry" | "sampling";
export type GearMethod = "angling" | "camera" | "telemetry" | "sampling";
export type RodSide = "left" | "right" | "center";
export type AnglingRules = "classic" | "habitat-v1" | "habitat-v2";
export type InteractionKind = "fish" | "bycatch" | "snag" | "camera" | "telemetry" | "sampling";

export interface SourceReference {
  id: string;
  title: string;
  authority: string;
  url: string;
  supports: string;
  accessedAt: string;
  status: "source-checked" | "local-rules-required";
}

export interface Question {
  id: string;
  prompt: string;
  answer: string;
  hint: string;
  source: string;
}

export interface GearSet {
  id: string;
  method: GearMethod;
  name: string;
  rod: string;
  line: string;
  hook: string;
  lure: string;
  tools: string;
  strength: string;
  tradeoff: string;
}

export interface Habitat {
  id: string;
  name: string;
  cue: string;
  plant: string;
  hypothesis: string;
  position: "left" | "center" | "right";
  safe?: boolean;
  safetyNote?: string;
}

export interface Encounter {
  id: string;
  /** Physical incidents override the field kit's normal survey method. */
  interaction?: "bycatch" | "snag";
  type: "fish" | "invertebrate" | "reptile" | "plant" | "snag" | "observation";
  name: string;
  scientificName?: string;
  summary: string;
  ecology: string;
  handling: { id: string; label: string; result: string; safe: boolean }[];
  connections: string[];
}

export interface VenueSeason {
  id: string;
  name: string;
  fieldNote: string;
  conditions: { time: string; water: string; temperature: string; current: string };
  availableEncounterIds: string[];
  fallbackEncounterId: string;
  fallbackByGear?: Record<string, string>;
}

export interface Venue {
  id: string;
  title: string;
  shortTitle: string;
  locality: string;
  season: string;
  arrivalTitle: string;
  arrivalCopy: string;
  guide: { name: string; role: string; quote: string; handlingQuote: string; image: string };
  communityVoice?: { name: string; role: string; quote: string };
  habitatImage: string;
  questions: Question[];
  gearSets: GearSet[];
  habitats: Habitat[];
  encounters: Record<string, Encounter>;
  encounterRules: Record<string, string>;
  fallbackEncounterId: string;
  overcastEncounterId?: string;
  overcastZoneId?: string;
  idealPower: Record<string, number>;
  informedQuestionByZone: Record<string, string>;
  linePatterns: Record<string, LineAction[]>;
  linePrompts: Record<string, string[]>;
  initialTension: Record<string, number>;
  conditions: { time: string; water: string; temperature: string; current: string };
  seasons: VenueSeason[];
  sourceNotes: string[];
  comparison: { driver: string; habitat: string; lesson: string };
}

export interface JournalDiscovery {
  journalId: string;
  venue: Venue;
  encounter: Encounter;
}

export interface EcosystemLink {
  id: string;
  from: string;
  to: string;
}

export interface FieldAssignment {
  id: string;
  purpose: "investigation" | "incident-response" | "habitat-care";
  venueId: string;
  targetEncounterId: string;
  habitatId: string;
  gearId: string;
  questionId: string;
  title: string;
  objective: string;
}

export type DebriefChoice = "full-notes" | "identity-only" | "private-notes";
export type ObservationReportingStatus = DebriefChoice | "pending" | "legacy-unknown";

export interface FieldObservation {
  id: number;
  expedition: number;
  venueId: string;
  seasonId: string;
  habitatId: string;
  gearId: string;
  encounterId: string;
  handlingId: string;
  castAccuracy: number;
  controlMistakes: number;
  assisted: boolean;
  shared: boolean;
  reportingStatus: ObservationReportingStatus;
}

export interface LearningAnswer { questionId: string; answerId: string; correct: boolean }

// The initial answer is retained in learningAnswers. This bounded latest review
// stores the player's current explanation and the records they explicitly link.
export interface LearningRevision extends LearningAnswer {
  evidenceIds: number[];
  limitationId: string;
}

export interface ExpeditionState {
  observations: FieldObservation[];
  learningAnswers: LearningAnswer[];
  learningRevisions: LearningRevision[];
  expeditionNumber: number;
  version: 13;
  venueId: string | null;
  stage: Stage;
  askedQuestions: string[];
  gearId: string | null;
  zoneId: string | null;
  encounterId: string | null;
  castPower: number | null;
  castAccuracy: number;
  lineTurn: number;
  lineTension: number;
  lineActions: LineAction[];
  anglingRules: AnglingRules;
  anglingBeat: number;
  rodSide: RodSide;
  snagApproach: "unassessed" | "back-out" | "pull-through";
  lineQuality: number;
  lineResolved: boolean;
  fishDistance: number;
  fishMaxDistance: number;
  fishStamina: number;
  fightPhase: FightPhase;
  phaseProgress: number;
  fightMessage: string;
  interactionProgress: number;
  interactionMistakes: number;
  handlingId: string | null;
  fieldcraft: number;
  biology: number;
  ecology: number;
  trust: number;
  journalIds: string[];
  activeAssignmentId: string | null;
  completedAssignmentIds: string[];
  debriefChoice: DebriefChoice | null;
  seasonId: string | null;
  venueVisitCounts: Record<string, number>;
  experienceMode: ExperienceMode;
  assistMode: boolean;
  castUsedAssistance: boolean;
  castAttempts: number;
  tripJournalIds: string[];
  tripSafeJournalIds: string[];
}
