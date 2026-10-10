import type { Encounter, GearSet, Habitat, Question } from "../types";

export const australiaQuestions: Question[] = [
  {
    id: "reef-zones",
    prompt: "What must we check before choosing a fishing mark on the Reef?",
    answer: "Marine Park zones govern what can happen in each place. Fishing is permitted under different conditions in some zones and prohibited in green, scientific research, and preservation zones.",
    hint: "A productive-looking reef is not automatically open water.",
    source: "The Great Barrier Reef Marine Park Authority requires visitors to know the zone and its permitted activities before fishing or boating.",
  },
  {
    id: "coral-anchor",
    prompt: "Why use the public mooring or sand patch instead of dropping anchor beside the bommie?",
    answer: "An anchor and chain can break living coral and repeatedly scour the same reef structure. Moorings and bare sand avoid turning boat position into habitat damage.",
    hint: "Good fieldcraft begins below the boat, not at the hook.",
    source: "The Reef Authority's responsible-practice guidance says to use moorings or anchor only on sand, mud, or rubble away from coral.",
  },
  {
    id: "seagrass-turtle",
    prompt: "What does a turtle surfacing over the seagrass change about our plan?",
    answer: "Seagrass is feeding habitat for green turtles. Slow down, keep distance, avoid blocking its path, and turn the encounter into observation rather than pursuit.",
    hint: "Some of the best encounters should never reach a hook.",
    source: "The Reef Authority advises keeping clear of free-swimming turtles and notes that turtles commonly use shallow Reef and seagrass areas.",
  },
  {
    id: "pelagic-current",
    prompt: "What makes the blue channel more than empty water?",
    answer: "Current concentrates bait along the reef edge and creates a moving corridor for pelagic predators. Birds, bait, tide, and safe trolling space matter more than visible coral there.",
    hint: "Read movement and food at the edge of structure.",
    source: "Australian fisheries and Reef guidance describe pelagic line fishing as a distinct use of open-water and buffer-zone habitat.",
  },
];

export const australiaGear: GearSet[] = [
  {
    id: "bommie", method: "angling",
    name: "Coral-edge casting kit",
    rod: "7 ft medium-heavy rod",
    line: "30 lb braid with abrasion leader",
    hook: "Single barbless hook",
    lure: "Shallow diving artificial",
    tools: "Rubber net + long pliers + zone map",
    strength: "Controls a fish outside the coral edge while keeping the lure above the living structure.",
    tradeoff: "A low cast or prolonged fight can put both line and fish into branching coral.",
  },
  {
    id: "pelagic", method: "angling",
    name: "Channel trolling kit",
    rod: "7 ft heavy trolling rod",
    line: "40 lb line with wire-free leader",
    hook: "Single inline hook",
    lure: "Rigged fast-swimming artificial",
    tools: "Dehooker + wet measuring mat",
    strength: "Covers the open current edge without dragging gear across reef or seagrass.",
    tradeoff: "Fast pelagic fish demand measured drag; forcing the first run overheats tackle and fish.",
  },
  {
    id: "survey", method: "camera",
    name: "Seagrass wildlife watch",
    rod: "No rod",
    line: "Marked camera tether",
    hook: "No hook",
    lure: "Pole camera and polarized viewer",
    tools: "GPS log + turtle sighting sheet",
    strength: "Records protected wildlife and feeding habitat without bait, pursuit, or physical contact.",
    tradeoff: "Glare and boat speed can hide animals or distort the apparent position of seagrass beds.",
  },
];

export const australiaHabitats: Habitat[] = [
  {
    id: "bommie",
    name: "Coral bommie sand edge",
    cue: "Living coral rises beside a pale sand tongue below clear shallow water",
    plant: "Turf algae and reef-building coral community",
    hypothesis: "Coral trout and trevally may patrol the boundary while the boat remains over sand.",
    position: "left",
  },
  {
    id: "seagrass",
    name: "Lagoon seagrass meadow",
    cue: "Green blades, feeding scars, and a turtle breath breaking the sheltered surface",
    plant: "Tropical seagrass meadow",
    hypothesis: "The meadow supports grazing wildlife and juvenile fish, making observation more useful than casting.",
    position: "center",
  },
  {
    id: "channel",
    name: "Blue-water reef channel",
    cue: "Deep cobalt water, a current seam, bait flicker, and birds working beyond the shelf",
    plant: "Drifting algae beyond the reef edge",
    hypothesis: "Pelagic fish may use the moving edge where lagoon water meets the outer channel.",
    position: "right",
  },
];

export const australiaEncounters: Record<string, Encounter> = {
  "coral-trout": {
    id: "coral-trout",
    type: "fish",
    name: "Common coral trout",
    scientificName: "Plectropomus leopardus",
    summary: "A red-spotted reef predator takes beside the bommie and drives immediately toward branching coral.",
    ecology: "Coral trout are reef-associated predators whose abundance and size respond to fishing pressure and protected zones. Their larvae can move beyond no-take reefs, linking local protection with the wider fishery.",
    handling: [
      { id: "sand-release", label: "Guide it over sand, keep it in the rubber net, remove the single hook, and release headfirst", result: "The trout ventilates beside the boat and returns to the coral edge without touching the deck.", safe: true },
      { id: "coral-drag", label: "Tighten the drag fully and pull it across the top of the bommie", result: "The line cuts through living structure and the fish remains pinned against coral. Jack backs off and changes the boat angle.", safe: false },
    ],
    connections: ["Coral edge -> ambush habitat", "No-take reef -> larger breeding fish", "Larval movement -> connected fishery"],
  },
  "giant-trevally": {
    id: "giant-trevally",
    type: "fish",
    name: "Giant trevally",
    scientificName: "Caranx ignobilis",
    summary: "A heavy silver trevally crosses the sand tongue, takes the lure, and accelerates toward the channel.",
    ecology: "Giant trevally are mobile predators that connect reef faces, lagoon channels, and coastal habitats. The encounter shows that the spaces between obvious structures can be active feeding corridors.",
    handling: [
      { id: "water-cradle", label: "Use the channel run to tire it, support it in the water, and release after steady swimming returns", result: "The trevally holds upright, kicks free, and disappears along the blue edge.", safe: true },
      { id: "jaw-hang", label: "Hang the fish vertically by its jaw for a long photograph", result: "A large fish should not carry its full weight from the jaw. Jack returns it to horizontal support immediately.", safe: false },
    ],
    connections: ["Sand tongue -> crossing route", "Reef channel -> feeding corridor", "Measured fight -> stronger release"],
  },
  "spanish-mackerel": {
    id: "spanish-mackerel",
    type: "fish",
    name: "Spanish mackerel",
    scientificName: "Scomberomorus commerson",
    summary: "A barred pelagic fish strikes at speed along the current seam and takes line into deep blue water.",
    ecology: "Spanish mackerel are fast coastal predators managed through size, possession, boat, and seasonal rules. Their mobility makes current, bait, and current regulations central to any responsible encounter.",
    handling: [
      { id: "alongside-release", label: "Keep the boat clear of traffic, dehook alongside, and release the fish into moving water", result: "The mackerel regains orientation in the current and accelerates away without coming aboard.", safe: true },
      { id: "automatic-keep", label: "Bring it aboard before checking its identity, size, season, or current limit", result: "A strike is not permission to retain a fish. Jack keeps it in the water while the current rules are checked.", safe: false },
    ],
    connections: ["Current seam -> concentrated bait", "Pelagic movement -> coastal connectivity", "Current rules -> managed harvest"],
  },
  "green-turtle": {
    id: "green-turtle",
    type: "observation",
    name: "Green turtle",
    scientificName: "Chelonia mydas",
    summary: "A green turtle surfaces above the meadow, breathes, and turns back toward a grazed strip of seagrass.",
    ecology: "Adult green turtles are primarily herbivorous and use tropical seagrass and algal habitat. Their repeated grazing, long migrations, and vulnerability to vessel strike connect a quiet lagoon sighting to a much larger life history.",
    handling: [
      { id: "drift-log", label: "Cut speed, keep the animal's route open, log the sighting, and let the boat drift clear", result: "The turtle surfaces once more and resumes feeding without changing course around the boat.", safe: true },
      { id: "camera-chase", label: "Motor closer and block the meadow edge for a better photograph", result: "The turtle changes direction under pressure. Jack stops the pursuit and opens the route.", safe: false },
    ],
    connections: ["Seagrass meadow -> feeding habitat", "Surface breath -> vessel exposure", "Slow transit -> reduced disturbance"],
  },
  "coral-line-snag": {
    id: "coral-line-snag",
    type: "snag", interaction: "snag",
    name: "Discarded line on coral",
    summary: "The survey tether catches a loose monofilament loop above the sand. Its fixed section runs into living coral, so pulling harder would damage the reef.",
    ecology: "Lost fishing line can abrade coral and entangle wildlife. Recovery is useful only when it can be done without anchoring on, standing on, or tearing the reef; some removals require trained personnel and appropriate equipment.",
    handling: [
      { id: "mark-report", label: "Recover the loose end from over sand, mark the fixed section, and report it for equipped removal", result: "The immediate loop comes aboard while the coral-bound section remains accurately marked rather than ripped free.", safe: true },
      { id: "reef-pull", label: "Tie the line to the boat and pull until the entire snag breaks loose", result: "The line tightens through living coral. Jack cuts power before recovery causes more damage than the debris.", safe: false },
    ],
    connections: ["Lost line -> entanglement risk", "Living coral -> fragile structure", "Marked report -> safer removal"],
  },
};
