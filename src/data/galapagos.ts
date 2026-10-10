import type { Encounter, GearSet, Habitat, Question } from "../types";

export const galapagosQuestions: Question[] = [
  {
    id: "current-convergence",
    prompt: "Why can equatorial Galapagos water support penguins and cold-water feeding grounds?",
    answer: "Several currents meet around the islands. In the west, cold nutrient-rich subsurface water rises toward sunlight, feeding plankton and the fish, seabirds, reptiles, and mammals above them.",
    hint: "Latitude alone does not determine the water temperature.",
    source: "UNESCO describes Galapagos as a confluence of major eastern Pacific currents; Galapagos National Park identifies Bolivar Channel as a nutrient-rich natural nursery.",
  },
  {
    id: "el-nino",
    prompt: "What changes when El Nino weakens the cold upwelling?",
    answer: "Warmer, less productive surface water reduces the food available to animals that depend on cold-water prey and algae. Breeding and survival can fall even when the islands themselves look unchanged.",
    hint: "Follow energy from nutrients to plankton to predators.",
    source: "UNESCO identifies changing currents and El Nino as major forces in Galapagos marine ecology and evolution.",
  },
  {
    id: "wildlife-distance",
    prompt: "Why keep distance even when Galapagos wildlife appears unafraid of people?",
    answer: "Tameness is not consent. Distance avoids changing feeding, resting, and escape behavior, and reduces contact, disease, and accidental injury in animals protected precisely because they are unusually approachable.",
    hint: "An animal remaining still does not mean an approach is harmless.",
    source: "Galapagos National Park visitor rules require distance from wildlife and prohibit touching, feeding, or removing natural material.",
  },
  {
    id: "reserve-zones",
    prompt: "Why check the exact marine zone before putting anything into the water?",
    answer: "Tourism, research, artisanal fishing, and no-take waters have different permissions. An open-looking channel may be protected habitat, a monitored corridor, or a place requiring specific authorization.",
    hint: "A marine reserve is managed as a map, not one universal rule.",
    source: "Galapagos National Park patrols tourism and fishing zones and requires permits for research, vessels, fishing, and authorized operations.",
  },
];

export const galapagosGear: GearSet[] = [
  {
    id: "shore-camera", method: "camera",
    name: "Lava-shore camera survey",
    rod: "No rod",
    line: "Marked pole-camera tether",
    hook: "No hook",
    lure: "Polarized camera and rangefinder",
    tools: "Species sheet + two-meter distance marker",
    strength: "Documents animals crossing the boundary between cold water and sun-warmed lava without landing or approaching them.",
    tradeoff: "A low camera angle can hide swell, animal movement, and the safe distance from the rock shelf.",
  },
  {
    id: "drift-survey", method: "camera",
    name: "Cold-current drift survey",
    rod: "No rod",
    line: "Depth-marked instrument tether",
    hook: "No hook",
    lure: "Temperature logger and plankton camera",
    tools: "Current drogue + GPS station log",
    strength: "Links wildlife observations to cold water, current direction, and visible productivity without pursuing an animal.",
    tradeoff: "An unlogged drift confuses a moving water mass with a fixed point on the map.",
  },
  {
    id: "acoustic-array", method: "telemetry",
    name: "Pelagic acoustic watch",
    rod: "No rod",
    line: "Receiver hydrophone tether",
    hook: "No hook",
    lure: "Passive acoustic receiver and drop camera",
    tools: "Time-depth recorder + reserve chart",
    strength: "Records large animals using the channel and seamount edge while the boat remains outside their path.",
    tradeoff: "A detection proves presence near a receiver, not the animal's exact route, abundance, or behavior.",
  },
];

export const galapagosHabitats: Habitat[] = [
  {
    id: "lava-shore",
    name: "Black lava shore",
    cue: "Cool surge water, exposed basalt ledges, algae-dark rocks, and animals moving between sea and shore",
    plant: "Marine algae on intertidal lava",
    hypothesis: "Marine iguanas and penguins may reveal how a cold productive sea supports life on an arid volcanic coast.",
    position: "left",
  },
  {
    id: "upwelling-channel",
    name: "Bolivar upwelling channel",
    cue: "A cool turquoise seam, feeding birds, plankton flecks, and sea lions working the current boundary",
    plant: "Phytoplankton and drifting macroalgae",
    hypothesis: "Cold rising water may concentrate food and make predators visible without any need to bait or chase them.",
    position: "center",
  },
  {
    id: "pelagic-edge",
    name: "Protected pelagic edge",
    cue: "Deep blue water, a submerged ridge, receiver bearings, and distant silhouettes below the surface",
    plant: "Open-ocean phytoplankton",
    hypothesis: "Turtles and sharks may use the reserve as part of a much larger migratory corridor.",
    position: "right",
  },
];

export const galapagosEncounters: Record<string, Encounter> = {
  "marine-iguana": {
    id: "marine-iguana",
    type: "reptile",
    name: "Marine iguana",
    scientificName: "Amblyrhynchus cristatus",
    summary: "A dark iguana surfaces through the cold surge, climbs onto black lava, and begins warming beside an algae-covered ledge.",
    ecology: "The world's only marine iguana feeds on algae in cold coastal water, then returns to volcanic rock to recover heat. Its life joins marine productivity directly to terrestrial survival.",
    handling: [
      { id: "distance-log", label: "Hold position, log feeding and warming behavior, and keep the required wildlife distance", result: "The iguana settles on the lava without changing course or posture because of the survey.", safe: true },
      { id: "close-photo", label: "Step onto the ledge for a close photograph while it is still cold", result: "The approach blocks its recovery route. Mateo backs away and records the observation from the boat.", safe: false },
    ],
    connections: ["Cold upwelling -> marine algae", "Algae grazing -> marine feeding", "Sun-warmed lava -> restored body temperature"],
  },
  "galapagos-penguin": {
    id: "galapagos-penguin",
    type: "observation",
    name: "Galapagos penguin",
    scientificName: "Spheniscus mendiculus",
    summary: "A small penguin crosses the current seam, dives after schooling fish, and returns toward a shaded lava crevice.",
    ecology: "Galapagos penguins survive near the equator because cool productive currents support prey, especially around the western islands. Warmer low-productivity periods can sharply reduce feeding and breeding success.",
    handling: [
      { id: "drift-watch", label: "Cut propulsion, drift outside its feeding line, and record dive direction and water temperature", result: "The penguin completes several dives without diverting around the boat.", safe: true },
      { id: "follow-dive", label: "Follow each surfacing so the camera never loses the penguin", result: "Repeated pursuit changes the animal's route. Mateo ends the approach and returns to the station line.", safe: false },
    ],
    connections: ["Cold current -> schooling prey", "Lava crevice -> nest shelter", "Warm anomaly -> reduced food"],
  },
  "galapagos-sea-lion": {
    id: "galapagos-sea-lion",
    type: "observation",
    name: "Galapagos sea lion",
    scientificName: "Zalophus wollebaeki",
    summary: "A sea lion turns beneath the plankton camera, uses the current edge to pursue fish, and surfaces well beyond the drifting boat.",
    ecology: "Galapagos sea lions feed across coastal and deeper water and depend on marine productivity that varies strongly with currents and climate. Familiarity with people does not remove the need for distance.",
    handling: [
      { id: "neutral-drift", label: "Keep the instrument still, let the sea lion choose its distance, and record the feeding pass", result: "The sea lion leaves the station on its own route after one clean observation.", safe: true },
      { id: "play-response", label: "Move the camera repeatedly so the curious sea lion will continue playing with it", result: "The survey would become an artificial interaction. Mateo retrieves the camera without encouraging contact.", safe: false },
    ],
    connections: ["Current edge -> prey concentration", "Marine productivity -> foraging success", "Observer restraint -> natural behavior"],
  },
  "green-turtle": {
    id: "green-turtle",
    type: "reptile",
    name: "Green sea turtle",
    scientificName: "Chelonia mydas",
    summary: "A green turtle rises beside the deep reserve edge, breathes once, and descends along the submerged volcanic slope.",
    ecology: "Green turtles use Galapagos coastal habitat and travel through a wider eastern Pacific network. Protected corridors matter because a migratory animal crosses many ecological and legal boundaries.",
    handling: [
      { id: "bearing-log", label: "Log the bearing, keep the vessel clear of its descent path, and submit the sighting with no pursuit", result: "The turtle continues below the ridge while the observation gains a precise time and location.", safe: true },
      { id: "surface-intercept", label: "Move ahead of the turtle so it surfaces beside the drop camera", result: "Intercepting a breathing route turns observation into disturbance. Mateo holds the vessel outside its path.", safe: false },
    ],
    connections: ["Volcanic slope -> coastal habitat", "Migration corridor -> regional movement", "Reserve network -> reduced capture risk"],
  },
  "scalloped-hammerhead": {
    id: "scalloped-hammerhead",
    type: "fish",
    name: "Scalloped hammerhead",
    scientificName: "Sphyrna lewini",
    summary: "A receiver registers a tagged hammerhead before the drop camera catches its silhouette passing beyond the volcanic ridge.",
    ecology: "Scalloped hammerheads aggregate around oceanic islands and move through the eastern tropical Pacific. Acoustic detections reveal connectivity, but one signal cannot describe an entire population or exact route.",
    handling: [
      { id: "passive-detection", label: "Record receiver, time, depth, and current without steering toward the shark", result: "The detection becomes one comparable point in a wider migration record.", safe: true },
      { id: "bait-confirm", label: "Put bait into the water to bring the shark close enough for visual confirmation", result: "Bait would change behavior and violate the no-hook survey. Mateo keeps the station passive.", safe: false },
    ],
    connections: ["Oceanic ridge -> aggregation site", "Acoustic tag -> movement evidence", "Protected corridor -> migratory connectivity"],
  },
  "lost-longline": {
    id: "lost-longline",
    type: "snag", interaction: "snag",
    name: "Lost pelagic fishing line",
    summary: "The hydrophone tether brushes a loose monofilament loop drifting near the reserve boundary.",
    ecology: "Lost fishing gear can continue entangling animals far from where it entered the sea. Recovery is valuable only when it can be done safely, legally, and without dragging gear across habitat or wildlife.",
    handling: [
      { id: "mark-recover", label: "Stop the deployment, mark the position, and recover the loose section under the authorized crew's protocol", result: "The line is bagged and logged without towing it through the channel.", safe: true },
      { id: "fast-pull", label: "Pull hard and keep drifting so the survey schedule is not delayed", result: "The unseen line may be attached or wrapped below. Mateo stops and follows the controlled recovery procedure.", safe: false },
    ],
    connections: ["Lost gear -> continuing entanglement", "Position record -> targeted recovery", "Controlled retrieval -> reduced secondary damage"],
  },
};
