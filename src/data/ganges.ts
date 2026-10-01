import type { Encounter, GearSet, Habitat, Question } from "../types";

export const gangesQuestions: Question[] = [
  {
    id: "monsoon-connection",
    prompt: "Why do fish move out of the main Ganges when monsoon water rises?",
    answer: "Rising water reconnects side channels, oxbows, fields, and shallow wetlands. These warm, productive margins provide food, spawning space, and nursery cover before falling water draws many fish back toward the river.",
    hint: "The floodplain becomes part of the river for a season.",
    source: "FAO floodplain-fishery guidance and ICAR-CIFRI surveys describe seasonal floods and shallow Ganges habitats as important migration, spawning, and nursery areas.",
  },
  {
    id: "dolphin-sound",
    prompt: "How does a Ganges river dolphin find fish in turbid water?",
    answer: "It uses echolocation, producing clicks and reading returning echoes. Monofilament nets can be difficult for dolphins to detect, so entanglement is a leading preventable danger even where prey remains abundant.",
    hint: "Poor underwater visibility does not mean the river is silent.",
    source: "India's Wildlife Institute and National Mission for Clean Ganga describe dolphin echolocation, frequent surfacing, and accidental entanglement in fishing gear.",
  },
  {
    id: "ecological-flow",
    prompt: "Why is water quality not enough to judge the health of this river?",
    answer: "A clean sample cannot replace adequate flow. Different river levels maintain temperature, oxygen, channel form, migration routes, floodplain nurseries, and dry-season refuge. A healthy river needs usable water moving at useful times.",
    hint: "Measure the river's pulse as well as its chemistry.",
    source: "Central Water Commission basin-planning material links low, high-pulse, and flood flows with water chemistry, migration, spawning, nursery habitat, and channel form.",
  },
  {
    id: "working-river",
    prompt: "Can a river be sacred, economically important, and ecologically stressed at the same time?",
    answer: "Yes. Cultural meaning, fisheries, transport, farming, cities, and wildlife all depend on the Ganges, but they place different demands on it. Respect begins the conversation; flow, oxygen, contaminants, habitat, and catch records test present conditions.",
    hint: "Human importance and biological condition are related, but they are not the same measurement.",
    source: "India's National Mission for Clean Ganga treats water quality, ecological flow, biodiversity, livelihoods, and community participation as connected basin responsibilities.",
  },
];

export const gangesGear: GearSet[] = [
  {
    id: "float",
    name: "Floodplain nursery float",
    rod: "6 ft light rod",
    line: "10 lb line",
    hook: "Single barbless hook",
    lure: "Small plant-based artificial below a float",
    tools: "Rubber net + dissolved-oxygen meter",
    strength: "Samples a shallow connected margin while keeping the hook above plants and juvenile-fish cover.",
    tradeoff: "It cannot control a large catfish or work the main current safely.",
  },
  {
    id: "drift",
    name: "Main-channel drift kit",
    rod: "7 ft medium-heavy rod",
    line: "30 lb braided line",
    hook: "Single barbless hook",
    lure: "Shallow-running artificial lure",
    tools: "Long pliers + wet measuring mat",
    strength: "Works a defined current seam with enough control for a strong river fish.",
    tradeoff: "A careless drift can cross working boats, a dolphin surfacing route, or abandoned netting.",
  },
  {
    id: "acoustic",
    name: "Dolphin acoustic watch",
    rod: "Hand line and marked retrieval cord",
    line: "High-visibility survey cord",
    hook: "No hook",
    lure: "Weighted passive hydrophone",
    tools: "Recorder + rangefinder + sighting sheet",
    strength: "Listens for echolocation and records surfacing animals without bait, hooks, or pursuit.",
    tradeoff: "Boat noise and strong current can mask clicks or move the instrument into discarded line.",
  },
];

export const gangesHabitats: Habitat[] = [
  {
    id: "backwater",
    name: "Monsoon-connected backwater",
    cue: "Shallow grass, flooded plants, quiet water, and a narrow opening to the main river",
    plant: "Floodplain grasses and floating freshwater plants",
    hypothesis: "Rohu and juvenile fish may use the productive margin while the connection remains open.",
    position: "left",
  },
  {
    id: "channel",
    name: "Main Ganges current seam",
    cue: "Broad moving water beside a pale sandbar and the route used by working boats",
    plant: "Sparse vegetation over shifting sand and silt",
    hypothesis: "Migratory fish, large catfish, and river dolphins may follow the deeper counter-current and prey corridor.",
    position: "center",
  },
  {
    id: "ghat",
    name: "Working ghat and tributary mouth",
    cue: "Stone steps, moored boats, fields, and a smaller flow entering the river beside the settlement",
    plant: "Bank grasses and seasonal algae near the quieter edge",
    hypothesis: "Fish may use the tributary mouth, but noise, oxygen, traffic, and loose gear must be read before sampling.",
    position: "right",
  },
];

export const gangesEncounters: Record<string, Encounter> = {
  rohu: {
    id: "rohu",
    type: "fish",
    name: "Rohu",
    scientificName: "Labeo rohita",
    summary: "A silver-gray carp takes beneath the float where shallow floodwater meets the river opening.",
    ecology: "Rohu are native major carps of South Asian rivers and floodplains. Seasonal access to productive shallow water supports feeding and recruitment, while barriers and disconnected wetlands can interrupt the movements on which wild river populations depend.",
    handling: [
      { id: "wet-release", label: "Keep it in the rubber net, record length and oxygen, then release it toward the open connection", result: "The rohu regains balance and moves from the grass edge toward connected water.", safe: true },
      { id: "bank-display", label: "Carry it onto the dry bank before deciding whether to release it", result: "A field record does not require prolonged air exposure. Anjali returns the fish to the net.", safe: false },
    ],
    connections: ["Monsoon pulse -> floodplain access", "Shallow plants -> nursery cover", "Open channel -> return route"],
  },
  hilsa: {
    id: "hilsa",
    type: "fish",
    name: "Hilsa",
    scientificName: "Tenualosa ilisha",
    summary: "A bright migratory shad turns in the main current and shakes against the light channel rig.",
    ecology: "Hilsa move between marine and fresh water and once travelled far into the Ganges system. Barrages, altered flow, fishing pressure, and lost connectivity can reduce upstream migration and recruitment even when suitable water remains downstream.",
    handling: [
      { id: "waterline-release", label: "Keep the delicate fish in the water, remove the single hook promptly, and release it facing the current", result: "The hilsa steadies in the flow and resumes its riverward movement.", safe: true },
      { id: "scale-scrape", label: "Hold the fish firmly against the dry deck while counting every scale", result: "Hilsa are easily damaged by rough handling. The survey stops before more scales and protective mucus are lost.", safe: false },
    ],
    connections: ["Seasonal flow -> migration cue", "Open river -> upstream passage", "Barrier pressure -> reduced range"],
  },
  goonch: {
    id: "goonch",
    type: "fish",
    name: "Goonch catfish",
    scientificName: "Bagarius bagarius",
    summary: "A broad-headed catfish takes in the current seam and holds low over shifting sand and gravel.",
    ecology: "Goonch are native South Asian river catfish associated with flowing water. A large predator links channel structure and current to smaller fishes, but its presence alone cannot reveal whether the wider floodplain community remains intact.",
    handling: [
      { id: "supported-release", label: "Use the wet mat, support the body, remove the hook with long pliers, and release it into moving water", result: "The catfish settles on the current, then disappears below the turbid surface.", safe: true },
      { id: "jaw-drag", label: "Drag the fish across the boat by its jaw", result: "The heavy body is left unsupported and abraded. Anjali stops the lift and wets the mat.", safe: false },
    ],
    connections: ["Current seam -> predator habitat", "Sand and gravel -> channel structure", "Small fish -> goonch energy"],
  },
  "ganges-dolphin": {
    id: "ganges-dolphin",
    type: "observation",
    name: "Ganges river dolphin",
    scientificName: "Platanista gangetica",
    summary: "Clicks arrive through the hydrophone before a river dolphin surfaces in the counter-current beyond the boat.",
    ecology: "Ganges river dolphins are endangered freshwater cetaceans that navigate and hunt by echolocation. They must surface to breathe and face threats from entanglement, fragmented flow, pollution, vessel noise, and declining prey.",
    handling: [
      { id: "quiet-watch", label: "Retrieve the hydrophone slowly, hold position, record distance and surfacing direction, and let the dolphin pass", result: "The boat stays quiet while the dolphin crosses the seam and surfaces again downstream.", safe: true },
      { id: "pursue-cast", label: "Start the motor and cast toward the next predicted surfacing point", result: "Pursuit adds noise and puts line in the animal's path. Anjali cancels the maneuver.", safe: false },
    ],
    connections: ["Echolocation -> turbid-water hunting", "Counter-current -> prey corridor", "Fishing line -> entanglement risk"],
  },
  "ghost-net-snag": {
    id: "ghost-net-snag",
    type: "snag",
    name: "Abandoned monofilament net",
    summary: "The survey line catches a nearly invisible length of monofilament drifting below the working bank.",
    ecology: "Lost synthetic netting can continue catching fish, turtles, birds, and dolphins after it stops helping a fisher. Recovery is safest when the boat controls both ends and avoids spreading smaller fragments through the current.",
    handling: [
      { id: "mark-recover", label: "Mark both ends, bring the loose net aboard in sections, and record the location for community removal", result: "The free net leaves the current without becoming several smaller hazards.", safe: true },
      { id: "cut-adrift", label: "Cut the survey line and let the entire net drift downstream", result: "The immediate snag disappears, but the entanglement hazard remains in the river.", safe: false },
    ],
    connections: ["Lost net -> continued capture", "Turbid water -> low visibility", "Community recovery -> safer corridor"],
  },
};
