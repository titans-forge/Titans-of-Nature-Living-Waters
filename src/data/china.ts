import type { Encounter, GearSet, Habitat, Question } from "../types";

export const chinaQuestions: Question[] = [
  {
    id: "water-sediment",
    prompt: "Why does the delta need both water and sediment from upstream?",
    answer: "Fresh water controls salinity and sustains wetlands, while sediment builds and reshapes mudflats, channels, and the river mouth. Changing either flow alters nursery habitat and the coastline itself.",
    hint: "This river delivers land as well as water.",
    source: "The Yellow River Protection Law and long-term estuary studies treat ecological flow, wetland hydrology, sediment, and fish biodiversity as connected parts of delta management.",
  },
  {
    id: "ecological-release",
    prompt: "Why replenish the wetland more than once each year?",
    answer: "Plants, fish, invertebrates, and birds need water in different seasons. Timed releases can reconnect channels and support spring growth instead of leaving the wetland flooded briefly and dry when organisms need it most.",
    hint: "A useful flow must arrive when the living system can use it.",
    source: "The Yellow River Delta reserve increased diversion capacity and shifted from one annual replenishment to two or three demand-based releases for wetland restoration.",
  },
  {
    id: "salinity-gradient",
    prompt: "What does the change from reeds to red saltmarsh tell us?",
    answer: "It marks a freshwater-to-saltwater gradient. Fish and bottom animals sort themselves along changing salinity, depth, current, and sediment rather than recognizing one fixed line called the river mouth.",
    hint: "Read the plants and water together.",
    source: "Yellow River Delta restoration reporting describes a full land-to-sea gradient from freshwater marsh through brackish interaction zones to coastal salt marsh and tidal flat.",
  },
  {
    id: "reserve-boundary",
    prompt: "Why confirm the reserve boundary and bird-use area before launching fishing gear?",
    answer: "Core protected habitat, restoration plots, migratory-bird flats, navigation, and permitted fishing water have different purposes. A legal and quiet approach outside sensitive areas protects both the fieldwork and the animals using the delta.",
    hint: "Open water is not automatically open access.",
    source: "The Yellow River Delta National Nature Reserve protects major stopover and wintering habitat while the Yellow River Protection Law requires wetland restoration and reduced impacts from aquaculture, ports, and resource development.",
  },
];

export const chinaGear: GearSet[] = [
  {
    id: "reed-lure",
    name: "Reed-channel lure kit",
    rod: "7 ft medium rod",
    line: "18 lb braided line",
    hook: "Single barbless hook",
    lure: "Shallow mullet-pattern artificial",
    tools: "Rubber net + salinity meter",
    strength: "Works the freshwater edge without dragging bait through bird flats or marsh vegetation.",
    tradeoff: "A fixed assumption about salinity can place the lure in water the target fish has already left.",
  },
  {
    id: "channel-jig",
    name: "Brackish-channel jig kit",
    rod: "7 ft light jigging rod",
    line: "20 lb braid with abrasion leader",
    hook: "Single barbless assist hook",
    lure: "Small soft-bottom jig",
    tools: "Wet cradle + depth marker",
    strength: "Samples a moving sand-mud channel used by estuarine fish without bottom trawling.",
    tradeoff: "Too much weight buries in soft sediment or catches restoration stakes and submerged debris.",
  },
  {
    id: "survey",
    name: "Delta nursery eDNA survey",
    rod: "No rod",
    line: "Marked sterile sampler tether",
    hook: "No hook",
    lure: "Water sampler and pole camera",
    tools: "Filter cartridges + GPS salinity log",
    strength: "Detects fish use across the salinity gradient without netting juveniles or entering bird shallows.",
    tradeoff: "Contaminated equipment or moving the sampler among stations can create a false biological record.",
  },
];

export const chinaHabitats: Habitat[] = [
  {
    id: "reed-channel",
    name: "Freshwater reed channel",
    cue: "Sediment-rich river water, tall reeds, weak salinity, and a recently opened replenishment gate",
    plant: "Common reed",
    hypothesis: "Spotted sea bass may follow prey into the freshwater edge while the ecological release reconnects shallow habitat.",
    position: "left",
  },
  {
    id: "saltmarsh",
    name: "Red saltmarsh tidal creek",
    cue: "Suaeda flats, mixed salinity, small crab tracks, and a narrow channel filling from the Bohai Sea",
    plant: "Suaeda salsa saltmarsh",
    hypothesis: "Mobile fish and crabs may use the creek as the tide crosses the brackish transition.",
    position: "center",
  },
  {
    id: "mudflat",
    name: "Bohai mudflat edge",
    cue: "Shallow open water, soft sand-mud bottom, baitfish marks, and distant shorebirds on exposed flats",
    plant: "Sparse seagrass and benthic microalgae",
    hypothesis: "Croakers and drums may gather where river nutrients and marine water support a broad nursery ground.",
    position: "right",
  },
];

export const chinaEncounters: Record<string, Encounter> = {
  "spotted-sea-bass": {
    id: "spotted-sea-bass",
    type: "fish",
    name: "Spotted sea bass",
    scientificName: "Lateolabrax maculatus",
    summary: "A spotted sea bass strikes where sediment-colored channel water folds into the brackish creek.",
    ecology: "Spotted sea bass tolerate changing salinity and use estuaries and coastal water. Their position can track freshwater discharge, temperature, prey, and the moving boundary between river and sea.",
    handling: [
      { id: "mixing-release", label: "Net it outside the reeds, record salinity, and release it into the same mixing seam", result: "The fish holds in the turbid current and turns back toward the brackish edge.", safe: true },
      { id: "freshwater-transfer", label: "Carry it farther upriver because sea bass can tolerate fresh water", result: "Tolerance is not permission to relocate an animal. Wei returns it at the capture point.", safe: false },
    ],
    connections: ["Freshwater discharge -> salinity shift", "Mixing seam -> prey concentration", "Estuary movement -> flexible habitat use"],
  },
  "small-yellow-croaker": {
    id: "small-yellow-croaker",
    type: "fish",
    name: "Small yellow croaker",
    scientificName: "Larimichthys polyactis",
    summary: "A small golden croaker takes above soft bottom at the outer mudflat edge and trembles against the light line.",
    ecology: "The Yellow River estuary and adjacent Bohai Sea provide spawning and nursery habitat for small yellow croaker and other commercial fishes. Long-term surveys show that fishing pressure and environmental change can alter size, abundance, and community structure.",
    handling: [
      { id: "wet-release", label: "Use the wet cradle, avoid squeezing the body, record the nursery station, and release promptly", result: "The croaker rights itself over the mud and disappears into the turbid edge.", safe: true },
      { id: "small-keep", label: "Keep it automatically because a small fish does not count as much", result: "Juveniles are the next age class, not negligible catch. Wei checks current rules and returns the fish.", safe: false },
    ],
    connections: ["Estuary plume -> spawning ground", "Soft bottom -> nursery habitat", "Juvenile survival -> future population"],
  },
  "yellow-drum": {
    id: "yellow-drum",
    type: "fish",
    name: "Yellow drum",
    scientificName: "Nibea albiflora",
    summary: "A yellow drum takes in the brackish channel and stays low over the sand-mud transition.",
    ecology: "Yellow drum are among the commercial fishes associated with the Yellow River estuary. Bottom habitat, salinity, seasonal movement, and food availability link the river's discharge to the adjacent Bohai fish community.",
    handling: [
      { id: "channel-release", label: "Guide it into the wet cradle, log depth and salinity, and release it beside the channel", result: "The drum descends into the brackish flow and settles above the bottom.", safe: true },
      { id: "mud-drag", label: "Pull it across the exposed mud so the boat can remain in deeper water", result: "The abrasive drag adds injury and enters a bird-feeding flat. Wei brings the fish alongside instead.", safe: false },
    ],
    connections: ["Brackish channel -> estuarine habitat", "Sand-mud bottom -> feeding ground", "River plume -> coastal productivity"],
  },
  "chinese-mitten-crab": {
    id: "chinese-mitten-crab",
    type: "invertebrate",
    name: "Chinese mitten crab",
    scientificName: "Eriocheir sinensis",
    summary: "A mitten crab grips the slow jig as the saltmarsh creek begins filling from the estuary.",
    ecology: "Chinese mitten crabs grow in fresh and brackish waters but migrate toward saltier estuarine water to reproduce. In their native range, river connectivity and harvest interact with a life cycle that crosses the salinity gradient.",
    handling: [
      { id: "tray-release", label: "Lower it into a wet tray, free the hook with tongs, and release it at the capture creek", result: "The crab settles on the mud and moves beneath the red saltmarsh edge.", safe: true },
      { id: "upstream-move", label: "Carry it to the freshwater gate because adults are also seen upriver", result: "The animal is already following a salinity-linked route. Wei prevents the relocation.", safe: false },
    ],
    connections: ["Freshwater growth -> river habitat", "Estuary migration -> reproduction", "Open channel -> completed life cycle"],
  },
  "nursery-edna": {
    id: "nursery-edna",
    type: "observation",
    name: "Estuary nursery eDNA sample",
    summary: "A filtered water sample records several fish signals where the freshwater plume crosses shallow Bohai nursery habitat.",
    ecology: "Environmental DNA can detect species from genetic material left in water. Paired with conventional surveys, depth, temperature, and salinity, it helps map fish communities without assuming every detected signal represents the same abundance or exact location.",
    handling: [
      { id: "clean-filter", label: "Use a sterile cartridge, log salinity and position, seal the filter, and decontaminate before moving stations", result: "The sample becomes a reproducible observation tied to one place and one water mass.", safe: true },
      { id: "shared-bucket", label: "Use the same unwashed bucket at every station to save filter time", result: "DNA carried among stations would create false detections. Wei discards the contaminated sequence.", safe: false },
    ],
    connections: ["Water sample -> species signal", "Salinity station -> habitat context", "Clean protocol -> credible comparison"],
  },
  "cordgrass-snag": {
    id: "cordgrass-snag",
    type: "plant",
    name: "Invasive cordgrass rhizome snag",
    scientificName: "Spartina alterniflora",
    summary: "The sampler catches a dense rhizome at the edge of a cordgrass-removal plot beside recovering native saltmarsh.",
    ecology: "Introduced smooth cordgrass can trap sediment, obstruct tidal creeks, and replace native saltmarsh and benthic habitat. Large restoration programs remove it and restore tidal exchange, Suaeda marsh, and seagrass under controlled plans.",
    handling: [
      { id: "plot-report", label: "Free the sampler, photograph the plot marker, and report the rooted patch to the restoration crew", result: "The observation updates the treatment map without scattering fragments into a new creek.", safe: true },
      { id: "pull-scatter", label: "Pull and throw the rhizome into open water to help remove the invasive plant", result: "Unplanned fragments can spread and disturb the treatment plot. Wei contains the loose piece and records the location.", safe: false },
    ],
    connections: ["Invasive cordgrass -> blocked tidal creek", "Native Suaeda -> saltmarsh recovery", "Controlled removal -> reduced spread"],
  },
};
