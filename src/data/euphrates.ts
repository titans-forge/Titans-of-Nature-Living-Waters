import type { Encounter, GearSet, Habitat, Question } from "../types";

export const euphratesQuestions: Question[] = [
  {
    id: "marsh-restoration",
    prompt: "If water returns to a drained marsh, is the ecosystem restored?",
    answer: "Reflooding is a beginning, not the finish. A functioning marsh also needs adequate seasonal flow, acceptable salinity and pollution levels, connected channels, living reed beds, and time for fish and other wildlife to recolonize.",
    hint: "Water depth is only one part of wetland recovery.",
    source: "UNESCO describes the Ahwar as interdependent marsh components whose biodiversity requires minimum flows and ecological corridors; UNEP evaluates recovery after reflooding through hydrology, water quality, and biological productivity.",
  },
  {
    id: "divided-flow",
    prompt: "Why does a decision far upstream matter in these southern marshes?",
    answer: "Dams, irrigation withdrawals, drought, and water-sharing decisions change how much water arrives and when. Their effects accumulate downstream, where the marshes compete with farms, cities, and industry for a limited river supply.",
    hint: "Follow the water before judging the wetland.",
    source: "UNESCO identifies uncertain minimum flows, dam projects, intensified irrigation, pollution, and drought as connected threats to the Ahwar.",
  },
  {
    id: "salinity",
    prompt: "Why can a marsh contain plenty of water and still lose freshwater life?",
    answer: "Reduced freshwater inflow, extreme evaporation, salt intrusion, and contaminated drainage can raise salinity or degrade water quality. The visible area may stay wet while its plants, fish, and usefulness to people change.",
    hint: "Quantity and quality are separate measurements.",
    source: "UNESCO documents the Ahwar's shifting fresh-to-saline conditions; recent UNEP work identifies water scarcity, rising river salinity, heat, and untreated wastewater as major pressures.",
  },
  {
    id: "reed-mosaic",
    prompt: "Do people using reeds necessarily damage the marsh?",
    answer: "Not necessarily. Reeds provide wildlife habitat and material for boats, houses, mats, and livestock. Carefully cutting patches can retain roots, open-water edges, and uncut refuge; wholesale clearing removes the structure both people and wildlife use.",
    hint: "A working wetland can be used without being stripped bare.",
    source: "UNESCO's Ahwar materials describe reed vegetation as habitat and the marsh landscape as the basis of long-lived local settlement and livelihoods.",
  },
];

export const euphratesGear: GearSet[] = [
  {
    id: "float", method: "angling",
    name: "Reed-edge survey float",
    rod: "6 ft light rod",
    line: "10 lb line",
    hook: "Single barbless hook",
    lure: "Small artificial grub below a float",
    tools: "Rubber net + conductivity meter",
    strength: "Samples the vegetated margin gently while pairing every cast with a salinity reading.",
    tradeoff: "It lacks the control needed for a large river fish in the distributary current.",
  },
  {
    id: "drift", method: "angling",
    name: "Distributary drift kit",
    rod: "7 ft medium rod",
    line: "25 lb braided line",
    hook: "Single barbless hook",
    lure: "Shallow-running artificial lure",
    tools: "Long pliers + wet measuring mat",
    strength: "Works a moving channel seam without dragging bait along the marsh bottom.",
    tradeoff: "A fast retrieve can enter a reed island or miss fish holding in the deeper canal mouth.",
  },
  {
    id: "bottom", method: "angling",
    name: "Canal-mouth circle rig",
    rod: "7 ft medium-heavy rod",
    line: "30 lb line",
    hook: "Single circle hook",
    lure: "Prepared bait in mesh",
    tools: "Dehooker + line cutter",
    strength: "Reaches bottom-feeding fish while a circle hook reduces deep hooksets.",
    tradeoff: "Bait and bottom line can catch a protected turtle or abandoned plastic instead of a fish.",
  },
];

export const euphratesHabitats: Habitat[] = [
  {
    id: "marsh",
    name: "Restored reed-marsh inlet",
    cue: "Shallow open pockets, dense reed stems, and a narrow connection to deeper water",
    plant: "Common reed and submerged freshwater plants",
    hypothesis: "Native marsh fish may return when vegetated spawning and feeding water remains connected to the distributary.",
    position: "left",
  },
  {
    id: "channel",
    name: "Euphrates distributary seam",
    cue: "Broad moving water between reed islands and small working boats",
    plant: "Scattered submerged growth outside the current",
    hypothesis: "A large river fish may patrol the seam where current delivers food past marsh cover.",
    position: "center",
  },
  {
    id: "canal",
    name: "Irrigation return mouth",
    cue: "A narrower, more turbid flow entering beside date palms and cultivated ground",
    plant: "Bank reeds, algae, and exposed salt-tolerant growth",
    hypothesis: "Catfish may tolerate the canal mouth, but a meter reading must test whether the apparent connection carries usable water.",
    position: "right",
  },
];

export const euphratesEncounters: Record<string, Encounter> = {
  bunni: {
    id: "bunni",
    type: "fish",
    name: "Bunni",
    scientificName: "Mesopotamichthys sharpeyi",
    summary: "A deep-bodied native fish takes below the float in a connected pocket of living reeds.",
    ecology: "Bunni are endemic to the Tigris-Euphrates basin and strongly associated with lakes and vegetated marsh habitat. Once important in Iraqi catches, they have declined with habitat deterioration, introduced competitors, and fishing pressure. This encounter is survey-and-release only.",
    handling: [
      { id: "survey-release", label: "Keep it in the rubber net, record length and water quality, then release it into the connected pocket", result: "Zahra records a protected native fish without turning the survey into a harvest.", safe: true },
      { id: "keep-catch", label: "Keep the rare fish because it has traditional value", result: "Cultural importance increases the need for restraint. Zahra releases the bunni and closes the survey station.", safe: false },
    ],
    connections: ["Living reeds -> spawning cover", "Connected marsh -> recolonization", "Bunni decline -> cautious survey"],
  },
  shabout: {
    id: "shabout",
    type: "fish",
    name: "Shabout",
    scientificName: "Arabibarbus grypus",
    summary: "A broad native cyprinid turns in the distributary seam and uses the current against the rod.",
    ecology: "Shabout occur in the Tigris-Euphrates system and have long supported inland fisheries. Dams, habitat alteration, and overfishing affect large river fishes by changing movement routes and reducing connected habitat.",
    handling: [
      { id: "supported-release", label: "Use the wet mat, support the body, remove the single hook, and release it into the seam", result: "The shabout holds against the flow, then moves toward the reed island.", safe: true },
      { id: "jaw-hang", label: "Hang the heavy fish vertically from its jaw for a photograph", result: "That pose leaves a large body unsupported. Zahra returns it to the wet mat.", safe: false },
    ],
    connections: ["River current -> feeding route", "Open connection -> movement", "Dams and harvest -> cumulative pressure"],
  },
  "mesopotamian-catfish": {
    id: "mesopotamian-catfish",
    type: "fish",
    name: "Mesopotamian catfish",
    scientificName: "Silurus triostegus",
    summary: "A long catfish takes near the canal bottom and rolls where two different waters mix.",
    ecology: "Mesopotamian catfish are native predators recorded in southern Iraqi marshes and the Euphrates. Their presence in a canal connection shows that working waterways can become habitat, but tolerance by one species does not prove the water is healthy for the whole community.",
    handling: [
      { id: "mat-release", label: "Bring it to the wet mat, control the head, use the dehooker, and release it at the channel edge", result: "The circle hook rolls free and the catfish returns below the turbid seam.", safe: true },
      { id: "swing-aboard", label: "Swing the fish into the canoe by the line", result: "An uncontrolled heavy fish risks torn tissue, broken tackle, and injury aboard.", safe: false },
    ],
    connections: ["Canal mouth -> mixed water", "Bottom prey -> catfish", "Tolerant predator -> incomplete health signal"],
  },
  "euphrates-softshell": {
    id: "euphrates-softshell",
    type: "reptile", interaction: "bycatch",
    name: "Euphrates softshell turtle",
    scientificName: "Rafetus euphraticus",
    summary: "The bait moves sideways and an endangered softshell turtle surfaces beside the reed inlet.",
    ecology: "This endangered turtle occurs only in the Tigris-Euphrates basin and uses rivers, marshes, reservoirs, and artificial canals, often in calm shallow water near deeper flow. Habitat fragmentation and dam-driven alteration threaten it across its range.",
    handling: [
      { id: "waterline-release", label: "Keep it in the water, control the line, remove or cut the hook safely, and release it without lifting", result: "The turtle leaves the line at the waterline and settles beneath the reed edge.", safe: true },
      { id: "boat-lift", label: "Lift the turtle into the canoe for a closer look", result: "A protected bycatch is not a trophy. The extra handling risks the turtle and the crew.", safe: false },
    ],
    connections: ["Calm margin -> turtle habitat", "Deeper water nearby -> refuge", "Baited hook -> bycatch risk"],
  },
  "reed-line-snag": {
    id: "reed-line-snag",
    type: "snag", interaction: "snag",
    name: "Reed bundle tangled in plastic line",
    summary: "The rig stops in a cut reed bundle wrapped with abandoned monofilament at the marsh opening.",
    ecology: "Reeds are both habitat and a renewable material used in marsh life. The problem is not a cut bundle by itself, but plastic line that can entangle wildlife and a blocked opening that interrupts water exchange.",
    handling: [
      { id: "recover-plastic", label: "Move close, cut and recover the plastic, then leave rooted reeds and the channel opening intact", result: "The loose line comes aboard while the living reed edge and water connection remain in place.", safe: true },
      { id: "tear-reeds", label: "Power the rig free until the entire reed edge tears loose", result: "The shortcut damages rooted habitat and scatters smaller plastic fragments.", safe: false },
    ],
    connections: ["Reed harvest -> useful material", "Plastic line -> entanglement", "Open inlet -> water exchange"],
  },
};
