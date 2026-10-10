import { getLearningQuestion, learningQuestions } from '../data/learning';
import { researchProjects, type ResearchEvidenceRequirement } from '../data/researchProjects';
import { venueById } from '../data/venues';
import type { ExpeditionState, FieldObservation, LearningRevision } from '../types';
import { journeyByteLength, MAX_SAVE_BYTES } from './limits';

export const correctLimitationId = 'sample-limits';
export const researchLimitations = [
  { id: correctLimitationId, text: 'These records describe selected stations, seasons, and methods. They provide context for the explanation, not proof of a population trend, a whole route, or every event in the question.', feedback: 'The linked records support a bounded comparison. Repeated surveys and other evidence would be needed for broader claims.' },
  { id: 'population-proof', text: 'These few records prove the population is increasing or decreasing across the whole region.', feedback: 'A few selected encounters do not establish abundance or a population trend.' },
  { id: 'whole-route-proof', text: 'These records prove every seasonal route is open and every predicted event occurred.', feedback: 'Station records do not trace an entire journey or confirm every event in a hypothetical question.' },
];

// The IDs carry the same bounded / population / event-overclaim meanings as
// earlier saves. Only their display text and order vary with the field question.
// A local observation provides context; it need not have measured the scenario
// described in a prediction or reflection question.
const limitationContexts: Record<string, [string, string, string, string]> = {
  'amazon:prediction': [
    'A local record provides habitat context; it does not show how fish use newly flooded roots throughout the rising flood.',
    'Finding a fish near the roots is enough to conclude that fish numbers have increased since the water rose.',
    'A record beside flooded roots confirms that fish gained access there when the flood first arrived.',
    'Compare repeated records before and after flooding, including water level and habitat access.',
  ],
  'amazon:reflection': [
    'A local record cannot separate bank cover from differences in water level, equipment, or effort between the two teams.',
    'Fewer fish in one bank record can be reported as a decline in the local population.',
    'The bank contrast can be attributed to forest clearing once both records name their habitat.',
    'Repeat both banks with comparable water level, equipment, and effort before attributing a difference to cover.',
  ],
  'okavango:prediction': [
    'A filling-channel record gives local context; tracing the flood timing also needs upstream rainfall and flow records.',
    'A fish recorded in a filling channel indicates that the delta population is growing this dry season.',
    'The filling channel is sufficient to confirm when the upstream rainfall reached this station.',
    'Compare upstream rainfall and flow timing with repeated local water-level records.',
  ],
  'okavango:reflection': [
    'A safe-station record leaves the excluded bank unsampled; the access limit should stay visible in the report.',
    'Fish seen at the safer station can stand in for the fish numbers at the excluded bank.',
    'A survey completed elsewhere confirms that the promising bank was not being used by wildlife.',
    'Keep the reason for exclusion and avoid treating an unsampled bank as an empty bank.',
  ],
  'tonle-sap:prediction': [
    'A local record cannot show whether fish can leave the nursery margin during the later falling-water period.',
    'A fish recorded at the flooded margin indicates that nursery fish numbers will stay stable as it drains.',
    'A fish recorded beside the margin confirms that the outlet remains usable during drainage.',
    'Follow outlet access and water level through the falling-water period, rather than assuming a visit covers the return route.',
  ],
  'tonle-sap:reflection': [
    'A local record does not measure both visits; comparable flow-direction and water-level notes are still needed.',
    'A fish record can be used to estimate whether the lake population grew between the two flow directions.',
    'Matching temperatures are sufficient to treat the two visits as the same stage of habitat connection.',
    'Record direction, water level, station, and timing on both visits to test opening versus draining habitat.',
  ],
  'florida-bay:prediction': [
    'A local fish record gives habitat context; it cannot replace salinity and tide readings for the dry-spell comparison.',
    'A successful record at the old station means local fish numbers have remained stable through the dry spell.',
    'A fish still using the old station confirms that reduced freshwater has not changed its conditions.',
    'Compare salinity, tide, and seagrass condition alongside repeated fish observations.',
  ],
  'florida-bay:reflection': [
    'Careful fish handling does not measure the boat route or establish whether seagrass was disturbed along it.',
    'A released fish can be counted as evidence that the seagrass nursery population is recovering.',
    'Taking the marked route is enough to confirm that the entire visit caused no habitat disturbance.',
    'Record route and habitat disturbance separately from the animal-handling result.',
  ],
  'alaska-kelp:prediction': [
    'A consumer observation provides food-web context; producer growth still needs light, nutrient, and repeated survey records.',
    'One coastal fish observation is enough to report a spring increase in local fish numbers.',
    'A spring fish observation confirms that increased daylight produced more food at this station.',
    'Pair consumer observations with seasonal records of producers and the conditions supporting them.',
  ],
  'alaska-kelp:reflection': [
    'A careful return records the response used; it does not establish later survival or the risk of another deep cast.',
    'The returned rockfish can be treated as evidence that the local population has recovered from the capture.',
    'Use of the descending device confirms that repeating the same casts will avoid another harmful encounter.',
    'Keep the handling record, distinguish it from a survival observation, and record changes intended to prevent bycatch.',
  ],
  'baikal:prediction': [
    'A tributary-station record frames the migration question; it does not follow fish through their seasonal route.',
    'A fish at the tributary approach is enough to estimate the size of the migrating population.',
    'A fish at the approach confirms that the rest of its tributary route is accessible this season.',
    'Compare movement and access at multiple points through the relevant migration period.',
  ],
  'baikal:reflection': [
    'A local record supplies context; repeated clear camera passes are needed to compare use of the sponge-covered shelf.',
    'A fish seen beside a sponge can stand in for the abundance of fish on nearby shelves.',
    'A single clear pass confirms that the fish uses the shelf at other depths and times.',
    'Repeat the camera pass with depth, substrate, visibility, and effort recorded, without changing the habitat.',
  ],
  'lake-holiday:prediction': [
    'A fish record cannot locate the temperature-and-oxygen overlap without a profile at the relevant time and depths.',
    'A fish in cool water is enough to estimate how many fish the deep layer supports.',
    'The depth of one fish record identifies the usable temperature-and-oxygen band for the season.',
    'Pair fish observations with temperature and oxygen profiles repeated through the season.',
  ],
  'lake-holiday:reflection': [
    'A local record cannot identify what entered the lake; testing runoff needs inflow observations and suitable measurements.',
    'A fish record near the muddy inflow can be used to report a population decline after the rain.',
    'The contrast between muddy and clear water confirms which material came from the watershed.',
    'Compare inflow and shoreline conditions, then use an appropriate measurement to identify a material.',
  ],
  'nile:prediction': [
    'A station record can frame a habitat question; it does not measure the dam’s combined water-supply and ecological effects.',
    'A fish recorded in regulated water shows that the dam increased local fish numbers.',
    'A usable margin at this station is enough to confirm that seasonal nursery access was retained elsewhere.',
    'Compare water delivery, sediment, and nursery access across places and seasons before judging the tradeoff.',
  ],
  'nile:reflection': [
    'A local observation does not test the daily oxygen cycle; matched readings before sunrise and in daylight are needed.',
    'A fish present near plants is enough to report stable fish numbers despite the lower morning oxygen.',
    'Two oxygen readings can be attributed to plant activity without checking timing, temperature, or the instruments.',
    'Repeat oxygen readings with time, temperature, station, and instrument checks recorded.',
  ],
  'euphrates:prediction': [
    'A rewetted-station record does not establish whether usable freshwater and channel access persist over time.',
    'A fish present after rewetting is enough to report recovery of the marsh population.',
    'Standing water at the station confirms that the channel stays connected when organisms need it.',
    'Follow connection, salinity, and water quality through the periods relevant to habitat use.',
  ],
  'euphrates:reflection': [
    'A local record cannot establish the effects of reed cutting; a monitored comparison of cut and refuge patches is needed.',
    'Wildlife recorded beside one retained patch indicates that marsh populations are increasing under the cutting plan.',
    'Leaving roots and one refuge patch confirms that the cutting plan maintained habitat through the season.',
    'Compare cutting effort, roots, refuge cover, and wildlife use over time with local agreement.',
  ],
  'ganges:prediction': [
    'A local record does not establish nursery access through the season; cleaner water and connected habitat need separate evidence.',
    'A cleaner sample and one fish record indicate that the river’s fish population is recovering.',
    'Suitable water at the sampling station confirms that fish can reach the cut-off nursery channel.',
    'Follow flow and nursery connections alongside water-quality measurements at relevant times.',
  ],
  'ganges:reflection': [
    'A sighting can guide a safer deployment; it cannot count dolphins or establish that the reach is clear after the animal dives.',
    'A dolphin sighting can be used to estimate how many dolphins occupy this reach.',
    'Waiting until the dolphin is out of view confirms that the planned gear can be deployed without overlap.',
    'Record the sighting and deployment change while preserving the limits of visibility and survey coverage.',
  ],
  'danube:prediction': [
    'A station record does not establish passage; the fish’s route to spawning habitat and back remains to be investigated.',
    'A fish below the barrier is enough to conclude that the migrating population is stable.',
    'Healthy-looking water below the barrier confirms that upstream spawning habitat is reachable.',
    'Monitor route access and movement across the barrier during relevant life stages and seasons.',
  ],
  'danube:reflection': [
    'A nearby fish record does not test passage performance; arrival, passage, and onward movement need monitoring.',
    'A fish near the entrance is enough to report growth of the migrating population after construction.',
    'A fish at the entrance confirms that it found and completed the passage.',
    'Follow whether the intended fish find, pass, and continue beyond the structure in relevant seasons.',
  ],
  'great-barrier-reef:prediction': [
    'A game record provides habitat context; it does not establish current authorization for a real activity in a marine zone.',
    'A fish record from an open zone can stand in for fish numbers in the neighboring restricted zone.',
    'A successful game survey confirms that the same activity is permitted at the corresponding real reef.',
    'Check the exact real location, zone, activity, and current authorization before fieldwork.',
  ],
  'great-barrier-reef:reflection': [
    'A careful-release record does not measure coral contact; animal handling and equipment disturbance need separate records.',
    'A released fish indicates that fish numbers have recovered from damage to the bommie.',
    'A fish swimming away confirms that the visit left its supporting coral habitat intact.',
    'Compare equipment contact and habitat condition as well as the animal-handling outcome.',
  ],
  'seto-inland-sea:prediction': [
    'A local record gives food-web context; finding a nutrient balance needs seasonal nutrient, bloom, and oxygen observations.',
    'A fish in nutrient-rich water is enough to report that local fish numbers benefit from further nutrient input.',
    'A productive-looking station confirms that its present nutrient supply avoids bloom and oxygen problems.',
    'Compare production with bloom and oxygen records across seasons before choosing a nutrient target.',
  ],
  'seto-inland-sea:reflection': [
    'A local record cannot attribute juvenile fish changes to planting without comparable observations of effort, season, and conditions.',
    'More juveniles in one visit are enough to report growth of the local fish population after planting.',
    'Juveniles beside planted eelgrass confirm that the planting caused the difference from the earlier visit.',
    'Repeat comparable nursery observations and record other changes before attributing an effect to restoration.',
  ],
  'yellow-river-delta:prediction': [
    'A delta-station record does not separate water and sediment effects; their delivery and habitat changes need comparison over time.',
    'A fish at the delta station is enough to report that the proposed release increased nursery fish numbers.',
    'New mud at one station confirms that changed sediment delivery has replaced the habitat value of freshwater flow.',
    'Track water, salinity, sediment delivery, and habitat change together rather than using one as a substitute for another.',
  ],
  'yellow-river-delta:reflection': [
    'A local record and plant pattern do not measure the gradient; salinity readings along the transect are needed.',
    'The extent of red saltmarsh can stand in for fish numbers along the transect.',
    'The plant boundary identifies a lasting salinity boundary without repeat water readings.',
    'Test the plant clue with salinity readings across the transect and changing river and tide conditions.',
  ],
  'galapagos:prediction': [
    'A consumer observation does not measure the warm period’s food-web effect; nutrient, producer, and prey records are still needed.',
    'One wildlife observation is enough to conclude that marine populations remained stable during the warm period.',
    'A consumer still feeding confirms that its food supply was unaffected by weakened nutrient delivery.',
    'Compare water conditions, producers, prey, and wildlife responses over the warm period.',
  ],
  'galapagos:reflection': [
    'A local record cannot turn a missed acoustic signal into absence; receiver coverage, tagged animals, and repeat effort matter.',
    'No tagged detection in the pass can be used to estimate a decline in the reserve’s shark population.',
    'A pass with no detection confirms that tagged sharks did not use the surveyed route during the visit.',
    'Repeat comparable listening passes and check coverage and tag detection before interpreting missing signals.',
  ],
  'project:floods': [
    'The two station records frame seasonal access; they do not measure nursery performance or connections through a whole flood cycle.',
    'The fish recorded in each water are enough to compare which floodplain supports the larger population.',
    'The two station records confirm that fish can enter and leave the original floodplain habitats through the flood cycle.',
    'Follow connection timing, water level, and habitat use through entry and drainage before judging an isolated-water substitute.',
  ],
  'project:migration': [
    'The two station records frame an access question; they do not trace complete migrations or test passage performance.',
    'The two fish records are enough to compare the size of the migrating populations.',
    'A fish recorded at each station confirms that the routes to the next life-stage habitats were usable.',
    'Track arrival, passage, and onward movement at relevant points and times in each water.',
  ],
  'project:productivity': [
    'The two consumer records frame a food-web question; they do not measure total production or its change through time.',
    'The two animal records are enough to compare the population growth of the marine communities.',
    'The two consumer records confirm that light and nutrient supply caused the food availability observed at both stations.',
    'Pair comparable consumer observations with producer, prey, light, nutrient, and water-movement records.',
  ],
};

export function getResearchLimitations(questionId: string): typeof researchLimitations {
  const context = limitationContexts[questionId];
  if (!Object.hasOwn(limitationContexts, questionId) || !context) return researchLimitations;
  const options = [
    { id: correctLimitationId, text: context[0], feedback: context[3] },
    { id: 'population-proof', text: context[1], feedback: `The selected records do not establish abundance or a population trend. ${context[3]}` },
    { id: 'whole-route-proof', text: context[2], feedback: `A station record does not confirm an unobserved event, cause, or complete route. ${context[3]}` },
  ];
  const offset = [...questionId].reduce((sum, character) => sum + character.charCodeAt(0), 0) % options.length;
  return [...options.slice(offset), ...options.slice(0, offset)];
}

export function safeObservation(observation: FieldObservation): boolean {
  const venue = Object.hasOwn(venueById, observation.venueId) ? venueById[observation.venueId] : undefined;
  const encounter = venue && Object.hasOwn(venue.encounters, observation.encounterId) ? venue.encounters[observation.encounterId] : undefined;
  return Boolean(encounter?.handling.find(option => option.id === observation.handlingId)?.safe);
}

function projectCandidate(observation: FieldObservation, requirement: ResearchEvidenceRequirement): boolean {
  if (observation.venueId !== requirement.venueId || !observation.shared || observation.reportingStatus !== 'full-notes' || !safeObservation(observation)) return false;
  const venue = venueById[observation.venueId];
  const encounter = venue.encounters[observation.encounterId];
  if (encounter.interaction || encounter.type === 'snag' || encounter.type === 'plant') return false;
  const method = venue.gearSets.find(gear => gear.id === observation.gearId)?.method;
  return requirement.routes.some(route => route.encounterId === observation.encounterId && route.habitatId === observation.habitatId && route.method === method);
}

/** Local records are contextual evidence, including private notes; projects need
 * full shared records relevant to their explicitly authored field question. */
export function getEvidenceForQuestion(state: ExpeditionState, questionId: string): FieldObservation[] {
  const question = getLearningQuestion(questionId);
  if (!question) return [];
  const project = researchProjects.find(project => project.id === questionId);
  if (project) return state.observations.filter(observation => project.evidenceRequirements.some(requirement => projectCandidate(observation, requirement)));
  if (!question.venueId) return [];
  return state.observations.filter(observation => observation.venueId === question.venueId && safeObservation(observation));
}

function withRevision(state: ExpeditionState, questionId: string, answerId: string, evidenceIds: number[], limitationId: string): ExpeditionState {
  const correct = answerId === getLearningQuestion(questionId)!.correctId;
  const first = { questionId, answerId, correct };
  const revision: LearningRevision = { ...first, evidenceIds: [...evidenceIds], limitationId };
  const previous = state.learningRevisions ?? [];
  const existing = previous.some(review => review.questionId === questionId);
  return { ...state,
    learningAnswers: state.learningAnswers.some(answer => answer.questionId === questionId) ? state.learningAnswers : [...state.learningAnswers, first],
    learningRevisions: existing ? previous.map(review => review.questionId === questionId ? revision : review) : [...previous, revision],
  };
}

/** Incorrect conclusions and overclaims can be recorded and revised; this gate
 * rejects only an invalid question, selection, eligibility, or save capacity. */
export type RevisionValidation = { text: string; field: 'answer' | 'limitation' | 'evidence' | 'form'; venueId?: string };
export function getRevisionValidation(state: ExpeditionState, questionId: string, answerId: string, evidenceIds: number[], limitationId: string, options: { checkCapacity?: boolean } = {}): RevisionValidation | null {
  const question = getLearningQuestion(questionId);
  if (!question || !question.options.some(option => option.id === answerId)) return { text: question?.phase === 'comparison' ? 'Choose a conclusion from this question.' : 'Choose an explanation from this question.', field: 'answer' };
  if (!researchLimitations.some(option => option.id === limitationId)) return { text: 'Choose what these records can and cannot establish.', field: 'limitation' };
  const project = researchProjects.find(project => project.id === questionId);
  const required = project ? project.venueIds.length : 1;
  if (!Array.isArray(evidenceIds) || evidenceIds.length !== required || new Set(evidenceIds).size !== required || !evidenceIds.every(id => Number.isInteger(id) && id >= 1 && id <= 1000000)) {
    const venueId = project?.venueIds.find(id => !(Array.isArray(evidenceIds) ? evidenceIds : []).some(evidenceId => state.observations.find(observation => observation.id === evidenceId)?.venueId === id)) ?? question.venueId;
    return { text: project ? 'Link exactly two different field records, one from each required water.' : 'Link exactly one careful field record from this water.', field: 'evidence', venueId };
  }
  const candidates = getEvidenceForQuestion(state, questionId);
  const selected = evidenceIds.map(id => candidates.find(observation => observation.id === id));
  if (selected.some(observation => !observation)) return { text: project ? 'Use relevant, carefully handled records shared with full notes from both required waters.' : 'Use a carefully handled contextual record from this water.', field: 'evidence', venueId: project?.venueIds.find(id => !selected.some(observation => observation?.venueId === id)) ?? question.venueId };
  if (project && !project.venueIds.every(venueId => selected.filter(observation => observation!.venueId === venueId).length === 1)) return { text: 'Link one eligible record from each required water.', field: 'evidence', venueId: project.venueIds.find(id => selected.filter(observation => observation!.venueId === id).length !== 1) };
  if (!state.learningAnswers.some(answer => answer.questionId === questionId) && state.learningAnswers.length >= learningQuestions.length) return { text: 'The initial-answer record is full; preserve this journey before adding another answer.', field: 'form' };
  const reviews = state.learningRevisions ?? [];
  if (!reviews.some(review => review.questionId === questionId) && reviews.length >= learningQuestions.length) return { text: 'The explanation-review record is full; preserve this journey before adding another review.', field: 'form' };
  if (options.checkCapacity !== false && journeyByteLength(withRevision(state, questionId, answerId, evidenceIds, limitationId)) > MAX_SAVE_BYTES) return { text: 'This explanation would exceed the save-size limit. Export the current journey before starting a new one.', field: 'form' };
  return null;
}

export function getRevisionProblem(state: ExpeditionState, questionId: string, answerId: string, evidenceIds: number[], limitationId: string, options: { checkCapacity?: boolean } = {}): string | null {
  return getRevisionValidation(state, questionId, answerId, evidenceIds, limitationId, options)?.text ?? null;
}

export function recordLearningRevision(state: ExpeditionState, questionId: string, answerId: string, evidenceIds: number[], limitationId: string): ExpeditionState {
  return getRevisionProblem(state, questionId, answerId, evidenceIds, limitationId) ? state : withRevision(state, questionId, answerId, evidenceIds, limitationId);
}

export function isRevisionSupported(state: ExpeditionState, revision: LearningRevision): boolean {
  const question = getLearningQuestion(revision.questionId);
  return Boolean(question && revision.answerId === question.correctId && revision.limitationId === correctLimitationId
    && getRevisionProblem(state, revision.questionId, revision.answerId, revision.evidenceIds, revision.limitationId, { checkCapacity: false }) === null);
}

export function getProjectEvidenceStatus(state: ExpeditionState, projectId: string): { ready: boolean; attempted: boolean; supported: boolean; stops: { venueId: string; candidates: FieldObservation[] }[] } {
  const project = researchProjects.find(project => project.id === projectId);
  if (!project) return { ready: false, attempted: false, supported: false, stops: [] };
  const evidence = getEvidenceForQuestion(state, projectId);
  const stops = project.venueIds.map(venueId => ({ venueId, candidates: evidence.filter(observation => observation.venueId === venueId) }));
  const revision = state.learningRevisions?.find(review => review.questionId === projectId);
  return { ready: stops.every(stop => stop.candidates.length > 0),
    attempted: state.learningAnswers.some(answer => answer.questionId === projectId) || Boolean(revision),
    supported: Boolean(revision && isRevisionSupported(state, revision)), stops };
}
