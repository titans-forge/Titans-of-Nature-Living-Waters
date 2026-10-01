import type { Encounter, GearSet, Habitat, Question } from "../types";

export const japanQuestions: Question[] = [
  {
    id: "satoumi",
    prompt: "What does satoumi add to the idea of protecting nature?",
    answer: "Satoumi treats the coast as a lived and worked landscape. Communities maintain biodiversity and fisheries through repeated care of seagrass, tidal flats, water quality, access, and harvest rather than separating people from the sea.",
    hint: "This is stewardship of a human-shaped coast, not untouched wilderness.",
    source: "Japan's Ministry of the Environment defines satoumi through coastal biodiversity, local livelihoods, seagrass and tidal-flat restoration, and connections among forests, villages, rivers, and the sea.",
  },
  {
    id: "eelgrass-nursery",
    prompt: "Why restore eelgrass in shallow water beside a fishing village?",
    answer: "Eelgrass creates nursery and feeding habitat, slows water near the bottom, stores carbon, and supports organisms used by coastal fisheries. The meadow is infrastructure made by a living plant.",
    hint: "Small fish need structure before they become part of a fishery.",
    source: "Japan's Ministry of the Environment promotes conserving, restoring, and creating seagrass meadows and tidal flats for biodiversity and abundant fishery resources.",
  },
  {
    id: "nutrient-balance",
    prompt: "Why can both too many and too few nutrients cause trouble in an enclosed sea?",
    answer: "Excess nutrients can fuel red tides and oxygen loss, while severe nutrient scarcity can reduce plankton and coastal productivity. Management has to consider water quality and the food web together.",
    hint: "Cleaner water is not a single number when fisheries depend on production.",
    source: "Japanese environmental policy for the Seto Inland Sea combines pollutant-load control and red-tide prevention with measures intended to restore a productive, biologically rich sea.",
  },
  {
    id: "working-sea",
    prompt: "Why do we ask the cooperative before fishing beside the breakwater?",
    answer: "Ports, aquaculture grounds, fishing rights, navigation, local rules, and prefectural regulations overlap. Open water on a map may still be working space or locally restricted access.",
    hint: "The sea has institutions as well as habitats.",
    source: "The Fisheries Agency coordinates Seto Inland Sea fisheries across prefectures and describes overlapping operations, fishing rights, permits, resource management, and environmental monitoring.",
  },
];

export const japanGear: GearSet[] = [
  {
    id: "eelgrass",
    name: "Eelgrass-edge lure kit",
    rod: "7 ft light-medium rod",
    line: "12 lb braided line",
    hook: "Single barbless hook",
    lure: "Shallow minnow-pattern artificial",
    tools: "Rubber net + dissolved-oxygen meter",
    strength: "Works above sand lanes and meadow edges without dragging through rooted eelgrass.",
    tradeoff: "A low retrieve uproots shoots and gathers reproductive blades during the growing season.",
  },
  {
    id: "tai-rubber",
    name: "Tidal-seam seabream kit",
    rod: "6 ft 6 in light jigging rod",
    line: "20 lb braid with fluorocarbon leader",
    hook: "Single small assist hook",
    lure: "Slow sinking tai-rubber lure",
    tools: "Wet cradle + depth marker",
    strength: "Keeps a controlled vertical presentation in a narrow moving seam beside rock and sand.",
    tradeoff: "Excess weight lodges in rock, while drifting into a working lane conflicts with boat traffic.",
  },
  {
    id: "survey",
    name: "Satoumi habitat survey",
    rod: "No rod",
    line: "Marked camera tether",
    hook: "No hook",
    lure: "Pole camera and eelgrass quadrat",
    tools: "Field notebook + oxygen meter",
    strength: "Records plant cover, nursery fish, debris, and bottom condition without capture.",
    tradeoff: "A camera reveals only a small patch, and prop wash can disturb the habitat being measured.",
  },
];

export const japanHabitats: Habitat[] = [
  {
    id: "eelgrass",
    name: "Restored eelgrass shallows",
    cue: "Green shoots, pale sand lanes, juvenile fish, and a hand-marked restoration boundary",
    plant: "Eelgrass",
    hypothesis: "Sea bass may patrol the meadow edge while nursery organisms remain within the blades.",
    position: "left",
  },
  {
    id: "strait",
    name: "Rocky island tidal seam",
    cue: "A dark current line folding past rock into a quieter sand pocket",
    plant: "Sargassum attached along the sheltered rock edge",
    hypothesis: "Red seabream may hold below the seam where moving water delivers bottom prey.",
    position: "center",
  },
  {
    id: "harbor",
    name: "Working harbor breakwater",
    cue: "Stone wall, mooring lines, shell growth, vessel wake, and a cooperative landing beyond",
    plant: "Seasonal sea lettuce and attached algae",
    hypothesis: "Rockfish and octopus may use the structure, but access and working traffic govern the approach.",
    position: "right",
  },
];

export const japanEncounters: Record<string, Encounter> = {
  "red-seabream": {
    id: "red-seabream",
    type: "fish",
    name: "Red seabream",
    scientificName: "Pagrus major",
    summary: "A pink seabream takes below the island seam and turns across the sand pocket beneath the boat.",
    ecology: "Red seabream use varied coastal bottom habitat and support important Japanese fisheries. Management can combine catch controls, habitat work, monitoring, and hatchery releases, but released juveniles do not replace functioning habitat or harvest discipline.",
    handling: [
      { id: "cradle-release", label: "Lift it in the wet cradle, record depth and condition, and release it facing the current", result: "The seabream holds upright in the seam and descends toward the sand-rock boundary.", safe: true },
      { id: "release-assumption", label: "Assume a hatchery-reared fish can always be kept because more juveniles are released", result: "Stock enhancement does not erase current rules or ecological limits. Aiko returns the fish while the local requirements are checked.", safe: false },
    ],
    connections: ["Tidal seam -> food delivery", "Sand-rock edge -> feeding habitat", "Resource management -> fishery continuity"],
  },
  "japanese-sea-bass": {
    id: "japanese-sea-bass",
    type: "fish",
    name: "Japanese sea bass",
    scientificName: "Lateolabrax japonicus",
    summary: "A silver sea bass strikes over a sand lane and turns along the outside edge of the eelgrass.",
    ecology: "Japanese sea bass move among estuaries, bays, and coastal water as they grow. An eelgrass-edge encounter connects sheltered juvenile habitat, prey production, tidal movement, and the wider inland sea.",
    handling: [
      { id: "meadow-release", label: "Keep the fish above sand, use the rubber net, and release it outside the restoration boundary", result: "The bass regains balance and follows the meadow edge without the boat crossing the shoots.", safe: true },
      { id: "grass-drag", label: "Pull the fish and net through the meadow because the water is shallow", result: "The shortcut flattens and uproots restored shoots. Aiko moves the boat back over sand.", safe: false },
    ],
    connections: ["Eelgrass edge -> prey corridor", "Estuary connection -> life-stage movement", "Restored meadow -> nursery structure"],
  },
  "black-rockfish": {
    id: "black-rockfish",
    type: "fish",
    name: "Japanese black rockfish",
    scientificName: "Sebastes cheni",
    summary: "A dark mottled rockfish takes beside the breakwater and stays close to the shell-covered stone.",
    ecology: "Japanese black rockfish occupy rocky coastal structure and can live around reefs, seaweed beds, and breakwaters. Their local movements make working shorelines genuine habitat, not merely hardened edges.",
    handling: [
      { id: "wall-release", label: "Guide it clear of mooring line, keep it wet, and release beside submerged rock", result: "The rockfish descends along the wall and disappears beneath the attached algae.", safe: true },
      { id: "dock-swing", label: "Swing it onto the concrete landing to avoid using the net", result: "The abrasive landing and drop add avoidable injury. Aiko nets the fish beside the boat instead.", safe: false },
    ],
    connections: ["Breakwater stone -> rocky habitat", "Attached algae -> food-web structure", "Mooring line -> working-water hazard"],
  },
  "common-octopus": {
    id: "common-octopus",
    type: "invertebrate",
    name: "East Asian common octopus",
    scientificName: "Octopus sinensis",
    summary: "A common octopus grips the slow lure and then fastens two arms around a submerged breakwater block.",
    ecology: "Common octopuses use rocky dens and feed on crabs, shellfish, and other bottom animals. Their short lives and fast growth connect seasonal temperature, shelter, prey, fishing pressure, and highly local knowledge.",
    handling: [
      { id: "water-release", label: "Slack the line, let the arms release the stone, dehook in the water, and lower the animal beside cover", result: "The octopus changes color against the wall and slips beneath a block without coming onto the deck.", safe: true },
      { id: "arm-pull", label: "Pull steadily on one exposed arm until the octopus comes free", result: "An arm is not a handle. Aiko slacks the line and waits for the animal to release its grip.", safe: false },
    ],
    connections: ["Rock cavity -> den shelter", "Shellfish and crabs -> prey", "Seasonal temperature -> local activity"],
  },
  "eelgrass-nursery": {
    id: "eelgrass-nursery",
    type: "observation",
    name: "Eelgrass nursery survey",
    scientificName: "Zostera marina habitat",
    summary: "The camera passes above dense shoots carrying juvenile fish, grazing snails, and drifting fragments of algae.",
    ecology: "An eelgrass meadow is both a flowering-plant community and three-dimensional nursery habitat. Its condition depends on light, bottom stability, water quality, physical disturbance, and continuing community stewardship.",
    handling: [
      { id: "quadrat-log", label: "Hold the boat over sand, record shoot cover and juvenile use, and retrieve the camera vertically", result: "The quadrat produces a comparable record without the hull or tether crossing the meadow.", safe: true },
      { id: "prop-sample", label: "Motor slowly through the bed so the propeller exposes roots for the camera", result: "Prop wash turns a habitat survey into habitat damage. Aiko shifts to the sand lane.", safe: false },
    ],
    connections: ["Eelgrass shoots -> nursery cover", "Clear water -> plant light", "Community restoration -> repeated stewardship"],
  },
  "harbor-line-snag": {
    id: "harbor-line-snag",
    type: "snag",
    name: "Discarded line at the breakwater",
    summary: "The camera tether catches monofilament looped between a mooring eye and shell-covered stone below the working landing.",
    ecology: "Ports concentrate fishing line, rope, vessel traffic, and marine growth in the same small space. Removing a loose loop can reduce entanglement, but entering an active berth or pulling an unknown fixed load creates new danger.",
    handling: [
      { id: "cooperative-report", label: "Recover the loose loop from outside the berth, mark the fixed section, and report it to the cooperative", result: "The free line comes aboard and the deeper obstruction is scheduled for safe removal when the berth closes.", safe: true },
      { id: "berth-pull", label: "Tie the line to the boat and pull across the occupied berth", result: "The line tightens toward a working mooring. Aiko stops before the recovery interferes with the landing.", safe: false },
    ],
    connections: ["Working harbor -> concentrated gear", "Loose line -> entanglement risk", "Cooperative report -> coordinated removal"],
  },
};
