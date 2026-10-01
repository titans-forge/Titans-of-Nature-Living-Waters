import type { Encounter, GearSet, Habitat, Question } from "../types";

export const danubeQuestions: Question[] = [
  {
    id: "iron-gates-passage",
    prompt: "Why can a healthy-looking reach below the Iron Gates still fail migratory fish?",
    answer: "Migratory fish need a connected route, not only suitable water at one location. The Iron Gates dams block access between the Lower and Middle Danube, separating sturgeons and other fishes from former spawning and nursery grounds.",
    hint: "A good habitat is of little use when an animal cannot reach it.",
    source: "ICPDR's We Pass work identifies the Iron Gates as the principal barrier separating surviving Lower Danube sturgeons from former upstream habitat.",
  },
  {
    id: "floodplain-connection",
    prompt: "What returns when a Danube side channel is reconnected to its floodplain?",
    answer: "Seasonal exchange can restore shallow spawning and nursery water, feeding grounds, sediment movement, and flood storage. The value comes from recurring connection, not simply leaving an isolated pond beside the river.",
    hint: "A floodplain works through exchange with the main channel.",
    source: "ICPDR hydromorphology guidance treats floodplain reconnection, ecological flow, riparian buffers, and habitat continuity as linked restoration measures.",
  },
  {
    id: "working-corridor",
    prompt: "Why is restoring fish passage at the Iron Gates an engineering tradeoff rather than a simple dam-removal story?",
    answer: "The structures provide hydropower and navigation through a difficult reach. Restoration therefore asks how fish can find and pass effective routes while electricity, locks, vessels, reservoir levels, and downstream movement continue to function.",
    hint: "The river is simultaneously habitat, border, power source, and transport corridor.",
    source: "ICPDR describes the Iron Gates as major hydropower and navigation infrastructure while studying fish-pass design, entrance location, turbine mortality, and migration behavior.",
  },
  {
    id: "goby-corridor",
    prompt: "How can the same regulated banks that simplify navigation help an invasive fish spread?",
    answer: "Continuous stone reinforcement, ports, vessels, and connected waterways create repeated habitat and transport opportunities. Invasive Ponto-Caspian gobies have consequently colonized many regulated Upper and Middle Danube reaches.",
    hint: "Infrastructure can connect organisms as well as economies.",
    source: "ICPDR's Joint Danube Survey reporting documents heavy colonization of regulated Upper and Middle Danube banks by invasive Black Sea gobies.",
  },
];

export const danubeGear: GearSet[] = [
  { id: "research-cradle", name: "Beluga research encounter kit", rod: "Heavy research boat rod", line: "Heavy controlled-drag line", hook: "Single barbless hook", lure: "Simulated research capture rig", tools: "Specialist crew + in-water cradle", strength: "Unlocks a fictional supervised beluga capture-and-release exercise below the Iron Gates in the migration window.", tradeoff: "This game exercise is not an available recreational fishery. The telemetry kit remains the non-capture route." },
  {
    id: "floodplain-lure",
    name: "Floodplain edge lure",
    rod: "7 ft medium rod",
    line: "20 lb braided line",
    hook: "Single barbless hook",
    lure: "Shallow-running fish-pattern artificial",
    tools: "Rubber net + wet measuring mat",
    strength: "Works open reed and willow edges while keeping the lure above submerged floodplain plants.",
    tradeoff: "It is poorly suited to the deep navigation seam and must stay clear of nursery pockets.",
  },
  {
    id: "gravel-drift",
    name: "Gravel-seam drift rig",
    rod: "8 ft medium-heavy rod",
    line: "18 lb line",
    hook: "Single barbless hook",
    lure: "Weighted invertebrate-pattern artificial",
    tools: "Long pliers + depth marker",
    strength: "Holds a controlled drift over gravel used by current-loving native fish.",
    tradeoff: "Too much weight lodges among stone reinforcement, cables, and abandoned mooring gear.",
  },
  {
    id: "telemetry",
    name: "Sturgeon telemetry watch",
    rod: "Collapsible receiver mast",
    line: "Marked instrument tether",
    hook: "No hook",
    lure: "Directional acoustic hydrophone",
    tools: "Receiver + GPS field log",
    strength: "Detects tagged fish and maps their approach to current seams and migration barriers without capture or pursuit.",
    tradeoff: "Ship noise, turbine noise, reflections, and poor receiver placement can hide or mislocate a signal.",
  },
];

export const danubeHabitats: Habitat[] = [
  {
    id: "floodplain",
    name: "Reconnected floodplain channel",
    cue: "Willow, reeds, shallow exchange water, and a narrow opening to the main river",
    plant: "White willow and common reed",
    hypothesis: "Pike and young fishes may use the warm protected margin while an open connection carries water and prey.",
    position: "left",
  },
  {
    id: "gravel",
    name: "Gorge gravel current seam",
    cue: "Fast clear flow folding across gravel and cobble below the forested limestone gorge",
    plant: "Sparse submerged growth between mobile stones",
    hypothesis: "Barbel, sterlet, and other current-oriented fish may follow the seam where bottom food and oxygen remain available.",
    position: "center",
  },
  {
    id: "navigation",
    name: "Iron Gates navigation margin",
    cue: "Deep regulated water, reinforced bank, a lock approach, vessel wake, and changing acoustic noise",
    plant: "Patchy algae on stone reinforcement",
    hypothesis: "Tagged sturgeon may approach the barrier while invasive gobies and lost working gear occupy the engineered edge.",
    position: "right",
  },
];

export const danubeEncounters: Record<string, Encounter> = {
  "beluga-research": { id: "beluga-research", type: "fish", name: "Beluga sturgeon — research encounter", scientificName: "Huso huso", summary: "A huge sturgeon holds deep below the Iron Gates. In this fictional supervised research exercise, sustained pulls test your control before the fish reaches the in-water cradle.", ecology: "Beluga migrate between the Black Sea and rivers including the Danube. Their spawning routes have been fragmented by dams, and the species is critically endangered. The rod fight is a game abstraction for a supervised research scenario, not a claim that recreational capture is permitted or that this is a standard scientific capture method.", handling: [
    { id: "research-release", label: "Let the specialist crew record the fish in the water and release it", result: "The crew supports the fish in the cradle, records the observation, and clears its route back into deep water.", safe: true },
    { id: "trophy-lift", label: "Lift the sturgeon by its tail for a trophy photograph", result: "Jelena halts the lift. The crew keeps the heavy body supported at water level and ends the exercise.", safe: false }
  ], connections: ["Black Sea -> river migration", "Dams -> fragmented spawning routes", "Research and release -> conservation evidence"] },
  "northern-pike": {
    id: "northern-pike",
    type: "fish",
    name: "Northern pike",
    scientificName: "Esox lucius",
    summary: "A long green predator turns from the willow shadow and takes above submerged floodplain plants.",
    ecology: "Northern pike use vegetated margins and floodplain waters for cover, feeding, and spawning. Reconnecting shallow habitat can help them and their prey, provided exchange persists and restoration does not become an isolated warm pond.",
    handling: [
      { id: "net-release", label: "Keep the pike in the rubber net, use long pliers, support it over the wet mat, and release it at the channel opening", result: "The fish holds in the exchange flow before returning beneath the willow edge.", safe: true },
      { id: "gill-lift", label: "Lift the fish vertically by the gill cover for a long photograph", result: "A heavy pike should not hang unsupported. Jelena lowers it onto the wet mat and ends the display.", safe: false },
    ],
    connections: ["Floodplain connection -> shallow cover", "Vegetation -> spawning habitat", "Open exchange -> prey movement"],
  },
  "common-barbel": {
    id: "common-barbel",
    type: "fish",
    name: "Common barbel",
    scientificName: "Barbus barbus",
    summary: "A bronze fish takes close to the bottom where the gorge current folds across gravel.",
    ecology: "Common barbel are current-oriented river fish that feed along gravel and cobble. Their movements connect feeding, refuge, and spawning reaches, making channel continuity and clean coarse substrate more important than a single good-looking pool.",
    handling: [
      { id: "current-release", label: "Net the fish, keep its barbels and body wet, record the gravel depth, and release it facing the current", result: "The barbel steadies above the stones and drives back into the seam.", safe: true },
      { id: "dry-measure", label: "Lay it on the dry metal deck to straighten it for measurement", result: "The hot abrasive surface damages skin and mucus. Jelena wets the mat before continuing.", safe: false },
    ],
    connections: ["Gravel seam -> bottom feeding", "Current oxygen -> active habitat", "River continuity -> seasonal movement"],
  },
  sterlet: {
    id: "sterlet",
    type: "observation",
    name: "Sterlet",
    scientificName: "Acipenser ruthenus",
    summary: "A faint coded pulse repeats from the gravel seam as a tagged sterlet moves upstream below the boat.",
    ecology: "Sterlet are freshwater sturgeons that remain within rivers rather than migrating to the sea. They still require connected flowing habitat and suitable spawning substrate, and their slow life history makes repeated disturbance and harvest consequential.",
    handling: [
      { id: "passive-track", label: "Hold the receiver bearing, log signal strength and position, and let the tagged fish continue without pursuit", result: "The pulse crosses the seam and fades upstream, adding one clean movement record.", safe: true },
      { id: "motor-chase", label: "Start the motor and follow directly over the signal until the fish can be seen", result: "Propeller noise obscures the receiver and pursuit changes the observation. Jelena cancels the chase.", safe: false },
    ],
    connections: ["Acoustic tag -> movement record", "Gravel reach -> spawning habitat", "Continuity -> usable river network"],
  },
  "beluga-sturgeon": {
    id: "beluga-sturgeon",
    type: "observation",
    name: "Beluga sturgeon",
    scientificName: "Huso huso",
    summary: "A deep telemetry pulse approaches from the Lower Danube, then turns below the barrier and holds in the navigation margin.",
    ecology: "Beluga sturgeon historically migrated from the Black Sea far upstream to spawn. The Iron Gates now restrict that route; telemetry helps researchers learn where fish approach, aggregate, turn, or risk turbine passage while engineers assess possible migration aids.",
    handling: [
      { id: "barrier-log", label: "Cut the motor, record bearing, depth, vessel traffic, and time, then allow the signal to move without interference", result: "The observation preserves the fish's behavior at the barrier and can be compared with later tracks.", safe: true },
      { id: "signal-intercept", label: "Deploy a net across the strongest bearing to intercept the animal", result: "A protected migratory sturgeon is not a trophy encounter. Jelena retrieves the equipment before it enters the corridor.", safe: false },
    ],
    connections: ["Black Sea -> spawning migration", "Iron Gates -> blocked passage", "Telemetry -> fish-pass design"],
  },
  "round-goby": {
    id: "round-goby",
    type: "fish",
    name: "Round goby",
    scientificName: "Neogobius melanostomus",
    summary: "A small mottled goby takes beside the angular stones of the reinforced navigation bank.",
    ecology: "Round gobies are native to the Ponto-Caspian region but invasive farther upstream and across much of Europe and North America. Stone banks, shipping connections, and adaptable feeding behavior help them colonize engineered corridors.",
    handling: [
      { id: "record-regulation", label: "Photograph identifying features, record the exact bank type, and follow the current local non-native-species rule", result: "The record links the fish to the engineered habitat without inventing a universal release rule.", safe: true },
      { id: "move-upstream", label: "Carry it alive to a quiet upstream tributary where there may be fewer gobies", result: "Moving a non-native fish can extend its range. Jelena prevents the transfer.", safe: false },
    ],
    connections: ["Reinforced stone -> repeated habitat", "Shipping corridor -> range expansion", "Field record -> invasion monitoring"],
  },
  "mooring-snag": {
    id: "mooring-snag",
    type: "snag",
    name: "Abandoned mooring rope",
    summary: "The drift rig stops against a frayed rope wedged between bank stone and the edge of a navigation marker.",
    ecology: "Working rivers accumulate cables, rope, and other submerged hazards. Recovery can remove entanglement risk, but entering a marked navigation margin or pulling unknown load from a moving vessel route can create a greater danger.",
    handling: [
      { id: "mark-report", label: "Slack the line, mark the location, recover only the free end from outside the navigation lane, and report the fixed section", result: "The loose loop comes aboard while the heavy fixed section remains marked for equipped removal.", safe: true },
      { id: "power-pull", label: "Tie the rope to the survey boat and power into the channel until it breaks free", result: "The unknown load and passing traffic make the pull unsafe. Jelena cuts power and returns outside the lane.", safe: false },
    ],
    connections: ["Working river -> submerged gear", "Navigation lane -> collision risk", "Marked recovery -> safer removal"],
  },
};
