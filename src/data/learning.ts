import type { LearningAnswer } from "../types";

export interface LearningQuestion {
  id: string;
  venueId?: string;
  phase: "prediction" | "reflection" | "comparison";
  prompt: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanation: string;
}

// These short practice questions invite prediction and transfer. They are not a
// validated examination, and a recorded answer is not proof of field competence.
const authoredQuestions: LearningQuestion[] = [
  {
    id: "amazon:prediction", venueId: "amazon", phase: "prediction",
    prompt: "Yesterday the roots stood above water. Today the flood reaches their shaded branches. What new opportunity should the team investigate?",
    options: [{ id: "deep", text: "Fish moving only toward the deepest open channel." }, { id: "forest", text: "Fish gaining access to shelter and food among the flooded roots." }, { id: "empty", text: "Forest water remaining empty until the next dry season." }],
    correctId: "forest",
    explanation: "A rising flood connects the river to temporary forest habitat. The useful prediction concerns access to food and shelter; it does not guarantee that a particular fish will appear on one cast.",
  },
  {
    id: "amazon:reflection", venueId: "amazon", phase: "reflection",
    prompt: "A second team records fewer small fish beside a cleared bank than beside flooded forest. What would make its comparison more useful?",
    options: [{ id: "compare", text: "Repeat with similar water level, effort, and equipment at both banks." }, { id: "proof", text: "Treat the first difference as proof that clearing caused every missing fish." }, { id: "target", text: "Count only the largest predator caught at each bank." }],
    correctId: "compare",
    explanation: "Forest cover can support fish habitat, but water level, sampling effort, and other conditions can also change a record. Matching those conditions helps test a habitat explanation without turning one observation into certainty.",
  },
  {
    id: "okavango:prediction", venueId: "okavango", phase: "prediction",
    prompt: "The local grass is dry and there has been no recent rain, yet channels are filling. Which explanation fits this delta?",
    options: [{ id: "tide", text: "An ocean tide is pushing salt water into the grassland." }, { id: "impossible", text: "The rising-water record must be wrong without local rain." }, { id: "upstream", text: "Floodwater from distant upstream rainfall is arriving later." }],
    correctId: "upstream",
    explanation: "Water takes time to travel through a river basin. The Okavango flood reaches Botswana during the dry season, so local weather alone cannot explain the water's timing.",
  },
  {
    id: "okavango:reflection", venueId: "okavango", phase: "reflection",
    prompt: "A newly flooded bank offers nursery cover, but the guide finds fresh hippopotamus tracks and a slide. How should that change the survey?",
    options: [{ id: "approach", text: "Approach quietly because good fish habitat makes this the best station." }, { id: "relocate", text: "Use a safer station and record why the promising bank was excluded." }, { id: "discard", text: "Delete the bank from the habitat record because it cannot be fished." }],
    correctId: "relocate",
    explanation: "A productive habitat can be unsafe for a visitor. Recording the access limit preserves useful evidence while respecting the animals already using the bank.",
  },
  {
    id: "tonle-sap:prediction", venueId: "tonle-sap", phase: "prediction",
    prompt: "Imagine a later visit as floodwater falls. A narrow outlet is the only connection between a nursery margin and deeper refuge, and a trap blocks its width. What is the main concern?",
    options: [{ id: "exit", text: "Fish may lose their route back to refuge as the margin drains." }, { id: "food", text: "The trap will stop sunlight from reaching the entire lake." }, { id: "depth", text: "Fish no longer need connected water after feeding in the floodplain." }],
    correctId: "exit",
    explanation: "Floodplain access must work in both directions. A locally productive trap can interrupt the migration on which later catches and surviving fish depend.",
  },
  {
    id: "tonle-sap:reflection", venueId: "tonle-sap", phase: "reflection",
    prompt: "Two visits have similar water temperatures. The team sees drifting leaves move toward the lake on one visit and away on the other. What should its report emphasize?",
    options: [{ id: "same", text: "The habitat must be equivalent because the temperature matches." }, { id: "species", text: "Leaf direction identifies which fish species must be present." }, { id: "direction", text: "The different flow directions may signal opening versus draining habitat." }],
    correctId: "direction",
    explanation: "Temperature is only one clue. Tonle Sap's changing connection with the Mekong can expand or drain floodplain habitat; recording flow direction helps explain that difference.",
  },
  {
    id: "florida-bay:prediction", venueId: "florida-bay", phase: "prediction",
    prompt: "Less freshwater reaches a shallow bay during a dry spell. Before assuming last visit's fish pattern still applies, what should the team check?",
    options: [{ id: "depth-only", text: "Maximum depth only; freshwater input cannot affect a marine bay." }, { id: "salinity", text: "Salinity and tide alongside the condition of seagrass habitat." }, { id: "clearance", text: "Whether every seagrass patch can be cleared for easier boat access." }],
    correctId: "salinity",
    explanation: "Freshwater input, tides, and evaporation shape the salinity of shallow estuaries. Fish use suitable conditions within connected habitats; an old location is not a permanent guarantee.",
  },
  {
    id: "florida-bay:reflection", venueId: "florida-bay", phase: "reflection",
    prompt: "A shortcut would take the boat across a very shallow seagrass flat. The longer marked route reaches the same survey water. Which choice protects the lesson's habitat?",
    options: [{ id: "route", text: "Take the deeper route and note the extra travel time." }, { id: "speed", text: "Cross faster so the propeller spends less time over the grass." }, { id: "repair", text: "Cross now and count released fish as compensation for any scar." }],
    correctId: "route",
    explanation: "Seagrass is living nursery and feeding habitat. Avoiding a propeller scar protects the structure that supports fish; careful release does not cancel damage caused on the way there.",
  },
  {
    id: "alaska-kelp:prediction", venueId: "alaska-kelp", phase: "prediction",
    prompt: "Spring brings longer daylight to cold, nutrient-rich coastal water. Which change is the most useful starting point for a food-web prediction?",
    options: [{ id: "salmon", text: "Every salmon run must arrive as soon as the daylight increases." }, { id: "independent", text: "Predators gain food independently of algae and small prey." }, { id: "producers", text: "Algae and plankton can grow, supporting habitat and food for other life." }],
    correctId: "producers",
    explanation: "Light and nutrients support the producers near the base of the food web. Kelp also creates shelter. The timing and response of particular fish still depend on their life cycles and local conditions.",
  },
  {
    id: "alaska-kelp:reflection", venueId: "alaska-kelp", phase: "reflection",
    prompt: "An unwanted rockfish has been returned to depth with the guide's descending device. The crew is deciding where to work next. What best follows the conservation lesson?",
    options: [{ id: "repeat", text: "Repeat the same deep casts because the device removes the risk." }, { id: "avoid", text: "Move away from the bycatch area or change the method to avoid another capture." }, { id: "surface", text: "Stay there but release the next overbuoyant fish at the surface." }],
    correctId: "avoid",
    explanation: "A descending device can improve a release; it cannot guarantee survival. Alaska's guidance puts prevention first and discourages intentionally catching and releasing deepwater rockfish.",
  },
  {
    id: "baikal:prediction", venueId: "baikal", phase: "prediction",
    prompt: "The lake's deepest point is far offshore, while sturgeon are beginning a seasonal movement into tributaries. Where should a permitted migration survey focus its reasoning?",
    options: [{ id: "route", text: "On accessible river approaches and the timing of movement." }, { id: "maximum", text: "On maximum lake depth, regardless of the fish's life cycle." }, { id: "size", text: "On the largest-looking water because all large fish share a habitat." }],
    correctId: "route",
    explanation: "Baikal sturgeon use tributary routes such as the Selenga. The right habitat follows the animal's life cycle; the lake's exceptional depth is not an address for every species.",
  },
  {
    id: "baikal:reflection", venueId: "baikal", phase: "reflection",
    prompt: "A camera records a sculpin beside a sponge-covered shelf. The team wants a second observation without changing the habitat. Which plan fits that aim?",
    options: [{ id: "collect", text: "Drag across the sponge to bring both organisms to the surface." }, { id: "assume", text: "Record the fish as present at every depth because it appeared once." }, { id: "repeat-camera", text: "Repeat a clear camera pass and record depth and substrate." }],
    correctId: "repeat-camera",
    explanation: "A repeated observation with habitat context can improve the record without removing animals or breaking living structure. Seeing one fish does not establish its whole range or abundance.",
  },
  {
    id: "lake-holiday:prediction", venueId: "lake-holiday", phase: "prediction",
    prompt: "A summer profile shows warm surface water and cooler deep water with little oxygen. Which habitat prediction best uses both readings?",
    options: [{ id: "coldest", text: "Fish must choose the coldest bottom water, whatever its oxygen." }, { id: "overlap", text: "Fish may use a narrower band where temperature and oxygen are both tolerable." }, { id: "surface", text: "All fish must remain at the surface whenever the lake separates into layers." }],
    correctId: "overlap",
    explanation: "Cool water is not automatically usable habitat. Fish need suitable temperature and enough dissolved oxygen; the useful depth band can change through the season.",
  },
  {
    id: "lake-holiday:reflection", venueId: "lake-holiday", phase: "reflection",
    prompt: "After heavy rain, the creek entrance is muddy while a sheltered cove remains clearer. What can the team reasonably conclude?",
    options: [{ id: "runoff", text: "Runoff is a useful explanation to investigate with inflow and shoreline records." }, { id: "toxic", text: "Cloudy water alone proves a particular toxic chemical entered the lake." }, { id: "separate", text: "Neighborhood land use cannot affect conditions inside the lake." }],
    correctId: "runoff",
    explanation: "The watershed delivers soil, nutrients, and other materials through inflows. Clarity is evidence of a change, but identifying a contaminant requires an appropriate measurement.",
  },
  {
    id: "nile:prediction", venueId: "nile", phase: "prediction",
    prompt: "A dam makes water delivery more predictable but reduces seasonal flooding of nearby margins. Which report recognizes the tradeoff?",
    options: [{ id: "benefit", text: "Predictable water delivery means every biological effect is beneficial." }, { id: "damage", text: "Any ecological change means the dam provides no useful service." }, { id: "tradeoff", text: "Water supply benefits can coexist with changes to sediment and nursery access." }],
    correctId: "tradeoff",
    explanation: "The regulated Nile supports human needs while differing from the former flood-pulse river. A useful report names both services and ecological changes instead of assigning one universal verdict.",
  },
  {
    id: "nile:reflection", venueId: "nile", phase: "reflection",
    prompt: "At a planted margin, oxygen is lower just before sunrise than in the afternoon. Which explanation should the team test?",
    options: [{ id: "plants-only", text: "Plants make oxygen equally at night and in daylight." }, { id: "daily-cycle", text: "Respiration continues overnight, while photosynthesis adds oxygen in light." }, { id: "meter", text: "Different readings prove that one of the meters must be broken." }],
    correctId: "daily-cycle",
    explanation: "Plants, animals, and microbes use oxygen through respiration. Photosynthesis depends on light, so time of day matters when comparing oxygen records, especially in warm, slow water.",
  },
  {
    id: "euphrates:prediction", venueId: "euphrates", phase: "prediction",
    prompt: "A marsh has been rewetted, but its channel connection closes again and the remaining water becomes saltier. What should a recovery plan investigate next?",
    options: [{ id: "timing", text: "Whether usable freshwater and connections persist at the times organisms need them." }, { id: "photo", text: "Whether one photograph of standing water can certify lasting recovery." }, { id: "stocking", text: "Whether adding fish can replace the need to check water conditions." }],
    correctId: "timing",
    explanation: "Rewetting is a beginning. Flow, salinity, water quality, and continued access determine whether marsh habitat remains usable after that first change.",
  },
  {
    id: "euphrates:reflection", venueId: "euphrates", phase: "reflection",
    prompt: "Families need reeds for repairs, and the same reed beds shelter wildlife. Which proposal deserves a monitored trial?",
    options: [{ id: "clear", text: "Clear the whole bank to make each harvest quicker." }, { id: "exclude", text: "Treat every use of reeds as equally damaging, regardless of method." }, { id: "mosaic", text: "Agree on limited cutting patches while retaining roots and uncut refuge." }],
    correctId: "mosaic",
    explanation: "A working marsh supports people and wildlife. Patch-based use can preserve habitat structure, but its effects still need observation and local agreement; a label such as sustainable is not a measurement.",
  },
  {
    id: "ganges:prediction", venueId: "ganges", phase: "prediction",
    prompt: "A river sample is cleaner than last year, but a side channel remains cut off during the season when fish use shallow nurseries. What is still missing?",
    options: [{ id: "chemistry", text: "Nothing: one cleaner sample proves that the whole river is healthy." }, { id: "connection", text: "Enough well-timed flow to make suitable nursery habitat reachable." }, { id: "clarity", text: "Perfectly clear water at every point, regardless of natural sediment." }],
    correctId: "connection",
    explanation: "Water quality and habitat connection answer different questions. Fish need usable routes and water at appropriate times as well as acceptable conditions in a sample.",
  },
  {
    id: "ganges:reflection", venueId: "ganges", phase: "reflection",
    prompt: "A dolphin surfaces near a planned gear deployment in turbid water. What should the field team do with that observation?",
    options: [{ id: "pause", text: "Pause the deployment, keep distance, and record the wildlife use of that reach." }, { id: "follow", text: "Follow closely so the team can turn one sighting into a population count." }, { id: "ignore", text: "Ignore it because echolocation makes all fishing gear harmless." }],
    correctId: "pause",
    explanation: "Echolocation helps a dolphin find its way and prey; it does not remove entanglement risk. A sighting can guide a safer method while remaining a limited observation, not a census.",
  },
  {
    id: "danube:prediction", venueId: "danube", phase: "prediction",
    prompt: "Suitable spawning habitat exists upstream of a barrier, and the water below looks healthy. Which question matters most for a migratory fish?",
    options: [{ id: "appearance", text: "Whether the water below the barrier looks clear in a photograph." }, { id: "release", text: "Whether releasing fish below the barrier makes passage unnecessary." }, { id: "passage", text: "Whether the fish can find and use a route to the habitat and back." }],
    correctId: "passage",
    explanation: "Migration depends on continuity between habitats. Water quality at one station cannot replace access to the rest of a life cycle.",
  },
  {
    id: "danube:reflection", venueId: "danube", phase: "reflection",
    prompt: "Engineers have built a fish passage beside working navigation and power infrastructure. What would best test whether it helps the intended fish?",
    options: [{ id: "construction", text: "Count the passage as successful as soon as construction ends." }, { id: "track", text: "Monitor whether fish find, pass, and continue along the route in relevant seasons." }, { id: "photo", text: "Use a photograph of one fish near the entrance as proof for every species." }],
    correctId: "track",
    explanation: "A structure must work for animals, not only exist. Monitoring arrival, passage, and onward movement tests its function while acknowledging the river's other uses.",
  },
  {
    id: "great-barrier-reef:prediction", venueId: "great-barrier-reef", phase: "prediction",
    prompt: "A clear channel looks suitable for the planned survey, but it crosses a marine-zone boundary. Which information comes before deploying the kit?",
    options: [{ id: "permission", text: "The exact zone and whether this activity is authorized there." }, { id: "visibility", text: "Water clarity alone, because visible habitat implies open access." }, { id: "previous", text: "Permission from a different reef visited on the previous trip." }],
    correctId: "permission",
    explanation: "Marine zones distinguish activities and locations. The game illustrates that decision; it does not supply current permissions for real reef work.",
  },
  {
    id: "great-barrier-reef:reflection", venueId: "great-barrier-reef", phase: "reflection",
    prompt: "Two crews release their fish carefully, but one drags equipment across a coral bommie. What belongs in their comparison?",
    options: [{ id: "release-only", text: "Identical success, because only the fish release affects habitat." }, { id: "replace", text: "The assumption that the next catch will replace damaged coral." }, { id: "whole-trip", text: "Both animal handling and damage to the living structure supporting the fish." }],
    correctId: "whole-trip",
    explanation: "Responsible fieldwork covers the whole visit. Habitat damage can persist after a fish swims away, so release and equipment placement need separate attention.",
  },
  {
    id: "seto-inland-sea:prediction", venueId: "seto-inland-sea", phase: "prediction",
    prompt: "A coast needs productive food webs but also suffers when excess nutrients fuel dense blooms. Which management question fits both concerns?",
    options: [{ id: "zero", text: "How can all nutrients be eliminated from every part of the sea?" }, { id: "balance", text: "Which nutrient levels, circulation, and habitat conditions support local life without harmful excess?" }, { id: "more", text: "How can nutrient supply be increased without checking oxygen or blooms?" }],
    correctId: "balance",
    explanation: "Nutrients support production, but excess can contribute to harmful blooms and oxygen loss. The useful balance depends on the place and season and must be investigated with local records.",
  },
  {
    id: "seto-inland-sea:reflection", venueId: "seto-inland-sea", phase: "reflection",
    prompt: "A cooperative restores eelgrass and later records more juvenile fish. What should its next report do?",
    options: [{ id: "monitor", text: "Track repeated nursery observations alongside season, effort, and water conditions." }, { id: "proof", text: "Claim that every increase in the fishery was caused by this one planting." }, { id: "harvest", text: "Judge the restoration only by the largest adult caught that day." }],
    correctId: "monitor",
    explanation: "Eelgrass can support nursery habitat, but a useful restoration record separates that plausible benefit from other changes. Repeated comparable observations are stronger than a single catch story.",
  },
  {
    id: "yellow-river-delta:prediction", venueId: "yellow-river-delta", phase: "prediction",
    prompt: "A proposed release brings freshwater to the delta but changes how much sediment reaches it. Why should the team record both?",
    options: [{ id: "water-only", text: "Sediment is only waste and has no part in maintaining a delta." }, { id: "sediment-only", text: "New mud makes freshwater flow and salinity irrelevant." }, { id: "both", text: "Water affects salinity and access, while sediment helps build and reshape habitat." }],
    correctId: "both",
    explanation: "A delta receives both water and material from its basin. Changing either delivery can alter channels, marshes, and nursery areas; more of one does not automatically replace the other.",
  },
  {
    id: "yellow-river-delta:reflection", venueId: "yellow-river-delta", phase: "reflection",
    prompt: "Along a transect, freshwater reeds give way to red saltmarsh and tidal flats. How should the team use that pattern?",
    options: [{ id: "fixed", text: "Mark one permanent boundary beyond which conditions never change." }, { id: "gradient", text: "Use it as a clue to a salinity gradient, then compare water readings along the route." }, { id: "identity", text: "Use plant color alone to identify every fish below the surface." }],
    correctId: "gradient",
    explanation: "Plants can reveal environmental patterns without measuring every condition themselves. Salinity and habitat boundaries shift with river flow and tides, so readings should test the clue.",
  },
  {
    id: "galapagos:prediction", venueId: "galapagos", phase: "prediction",
    prompt: "An unusually warm period weakens the supply of cold, nutrient-rich water. What change should the team watch for in the marine food web?",
    options: [{ id: "food", text: "Reduced production and food availability, with possible effects on feeding and breeding." }, { id: "unchanged", text: "No change, because the volcanic islands still look the same." }, { id: "increase", text: "A guaranteed increase in every marine animal because warmer water always helps." }],
    correctId: "food",
    explanation: "A change in nutrient supply can affect producers, prey, and predators even when the shoreline looks unchanged. Species respond differently, and one observation cannot measure the whole effect.",
  },
  {
    id: "galapagos:reflection", venueId: "galapagos", phase: "reflection",
    prompt: "One acoustic pass detects no tagged hammerhead. What is the strongest conclusion the team can make from that result alone?",
    options: [{ id: "extinct", text: "Hammerheads have disappeared from the reserve." }, { id: "bait", text: "The crew should bait sharks closer to make the record look complete." }, { id: "limited", text: "No tagged animal was detected in that pass; repeat comparable observations and check coverage." }],
    correctId: "limited",
    explanation: "A receiver detects particular signals within its coverage, not every shark in the sea. A missing detection is useful evidence when the effort and limits are recorded; it is not proof of absence.",
  },
  {
    id: "project:floods", phase: "comparison",
    prompt: "Amazon forest and Tonle Sap margins both become fish habitat during floods. A planner proposes keeping an equal area of isolated water instead. Which evidence should challenge that substitute?",
    options: [{ id: "area", text: "Equal area guarantees equal nursery value even without river access." }, { id: "exchange", text: "The original habitats depend on seasonal access to food, refuge, and routes back out." }, { id: "species", text: "Both places must contain identical species for any comparison to be useful." }],
    correctId: "exchange",
    explanation: "The places differ, but the transferable mechanism is connection through time. An isolated pond may have value; equal surface area alone does not replace seasonal exchange with a floodplain.",
  },
  {
    id: "project:migration", phase: "comparison",
    prompt: "Baikal observations follow a tributary migration; Danube observations examine a route interrupted by dams. What shared question should guide the next survey?",
    options: [{ id: "access", text: "Can fish reach the habitats needed for different life stages at the right times?" }, { id: "depth", text: "Which destination has the deepest water, regardless of its connections?" }, { id: "same", text: "Can both rivers be given an identical calendar and engineering solution?" }],
    correctId: "access",
    explanation: "Migration connects parts of a life cycle. Species, seasons, and infrastructure differ, so the shared question is access, not an assumption that the same intervention fits both places.",
  },
  {
    id: "project:productivity", phase: "comparison",
    prompt: "Alaska's kelp coast and equatorial Galápagos can both support rich marine food webs. Which explanation best connects these distant places?",
    options: [{ id: "latitude", text: "Latitude alone fixes food availability, regardless of currents or seasons." }, { id: "warmth", text: "The warmest surface water always supports the most marine life." }, { id: "resources", text: "Light, nutrients, and water movement support producers and pass energy into food webs." }],
    correctId: "resources",
    explanation: "Different currents and seasons can supply the conditions for production. Comparing habitat, temperature, and producer or prey records is more useful than treating tropical versus cold water as a ranking of richness.",
  },
];

export const learningQuestions: LearningQuestion[] = authoredQuestions.map((question) => question.phase === "prediction"
  ? { ...question, options: [...question.options, { id: "not-sure", text: "I am not sure yet; I want to look for evidence." }] }
  : question);

export function getLearningQuestion(id: string): LearningQuestion | undefined {
  return learningQuestions.find((question) => question.id === id);
}

export function recordLearningAnswer<T extends { learningAnswers: LearningAnswer[] }>(state: T, questionId: string, answerId: string): T {
  const question = getLearningQuestion(questionId);
  if (!question || !question.options.some((option) => option.id === answerId) || state.learningAnswers.some((answer) => answer.questionId === questionId)) return state;
  return { ...state, learningAnswers: [...state.learningAnswers, { questionId, answerId, correct: answerId === question.correctId }] };
}
