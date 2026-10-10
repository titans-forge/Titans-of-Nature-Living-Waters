import type { Encounter, GearSet, Habitat, Question } from "../types";

export const okavangoQuestions: Question[] = [
  { id: "flood-arrival", prompt: "How far did the flood move overnight?", answer: "Fresh water has reached the shallow grass. Small fish disperse with it, while larger fish patrol the channel mouths.", hint: "Flood arrival connects channels to temporary feeding and nursery habitat.", source: "UNESCO and fisheries research identify the annual flood pulse as the Delta's principal ecological driver." },
  { id: "reed-signs", prompt: "What do the papyrus and reeds tell us?", answer: "A clean edge can shelter small fish and insects. A tightly packed stand can hide snags and make landing a strong fish difficult.", hint: "Vegetation creates both habitat and an obstruction.", source: "Okavango wetlands contain permanent channels, reed and papyrus margins, and seasonally flooded plains." },
  { id: "bank-signs", prompt: "Which shoreline signs mean we stay away?", answer: "Fresh hippopotamus tracks, a broad slide, dung, or sudden movement in reeds are reasons to leave the bank. We choose another position rather than approach.", hint: "Good fieldcraft includes deciding not to fish a promising bank.", source: "Regional safety guidance treats hippopotamuses as dangerous wildlife requiring substantial distance and local guidance." },
  { id: "fishery", prompt: "Why does the flood change the fishery?", answer: "High water expands connected habitat and disperses fish, nutrients, and food. Falling water reduces habitat and may concentrate fish in channels and pools.", hint: "The same location can fish differently as connectivity changes.", source: "Okavango fish assemblages and multi-gear fisheries change with flood magnitude, timing, and connectivity." },
];

export const okavangoGear: GearSet[] = [
  { id: "reed", method: "angling", name: "Reed-edge kit", rod: "6 ft medium rod", line: "15 lb line", hook: "Single barbless hook", lure: "Shallow-running spoon", tools: "Long pliers + polarized glasses", strength: "Controls a fast fish before it reaches dense stems.", tradeoff: "A moving lure can collect papyrus fibers near a closed edge." },
  { id: "channel", method: "angling", name: "Channel-search kit", rod: "7 ft medium rod", line: "12 lb line", hook: "Single barbless hook", lure: "Small silver spinner", tools: "Long pliers + depth line", strength: "Covers open current and channel mouths efficiently.", tradeoff: "It offers less control if a fish turns into the reeds." },
  { id: "light", method: "angling", name: "Floodplain kit", rod: "5 ft light rod", line: "8 lb line", hook: "Small barbless hook", lure: "Insect-pattern lure", tools: "Long pliers + field glass", strength: "Presents gently in shallow newly flooded grass.", tradeoff: "Light line is poorly suited to a large tigerfish near cover." },
];

export const okavangoHabitats: Habitat[] = [
  { id: "reeds", name: "Papyrus channel edge", cue: "Insects, small fish, and a clean opening beside dense stems", plant: "Papyrus and emergent reeds", hypothesis: "A predator may patrol the edge where shelter meets open water.", position: "left" },
  { id: "channel", name: "Open channel mouth", cue: "Clear moving water joining a newly flooded reach", plant: "Sparse submerged grass", hypothesis: "Fish are moving between permanent channel water and fresh floodplain habitat.", position: "center" },
  { id: "bank", name: "Freshly flooded bank", cue: "Shallow grass, a muddy slide, and fresh large tracks", plant: "Seasonally flooded grass", hypothesis: "The new water looks productive, but the shoreline must be checked before any cast.", position: "right", safe: false, safetyNote: "Fresh hippopotamus sign makes this bank unsafe. Do not approach or cast. Select another position." },
];

export const okavangoEncounters: Record<string, Encounter> = {
  "tigerfish": { id: "tigerfish", type: "fish", name: "African tigerfish", scientificName: "Hydrocynus vittatus", summary: "A silver predator strikes beside the papyrus and immediately turns toward the stems.", ecology: "African tigerfish are active predatory fishes of river systems. Channel edges can bring them close to smaller fish using vegetation and quieter water as cover.", handling: [
    { id: "control-release", label: "Keep it clear of the reeds and use long pliers at water level", result: "The barbless hook comes free beside the mokoro, and the fish returns to the channel without being lifted aboard.", safe: true },
    { id: "hand-mouth", label: "Grip the fish near its mouth and pull the hook by hand", result: "Kabelo stops you before your hand reaches the fish's teeth and passes you the long pliers.", safe: false },
  ], connections: ["Papyrus edge -> forage shelter", "Small fish -> predator movement", "Long pliers -> safer release"] },
  "three-spot-tilapia": { id: "three-spot-tilapia", type: "fish", name: "Three-spot tilapia", scientificName: "Oreochromis andersonii", summary: "A deep-bodied fish takes where moving channel water spreads across the flooded grass.", ecology: "Tilapias are important members of southern African inland fisheries. Floodplain connectivity changes access to feeding, refuge, and reproductive habitat.", handling: [
    { id: "wet-release", label: "Wet your hands, support the fish, and release it beside the boat", result: "The fish rights itself and moves back toward the flooded margin.", safe: true },
    { id: "dry-deck", label: "Set it on the dry floor while finding the field guide", result: "The fish loses protective mucus while out of water longer than necessary.", safe: false },
  ], connections: ["Flood connectivity -> habitat access", "Shallow grass -> feeding area", "Seasonal water -> changing fish assemblage"] },
  "papyrus-snag": { id: "papyrus-snag", type: "plant", interaction: "snag", name: "Papyrus root and stem snag", scientificName: "Cyperus papyrus", summary: "The lure returns wrapped in a fibrous stem and fine roots from the channel edge.", ecology: "Papyrus and other emergent plants structure wetland margins, slow water locally, shelter organisms, and provide material and habitat across the food web.", handling: [
    { id: "back-out", label: "Move closer, reverse the lure path, and free the living stem", result: "The hook backs out with only loose fibers attached. The reed margin remains intact.", safe: true },
    { id: "rip-free", label: "Pull hard enough to tear the stem free", result: "The tackle returns, but the shortcut damages the very edge that shelters fish and insects.", safe: false },
  ], connections: ["Papyrus -> channel structure", "Reed insects -> fish food", "Dense stems -> tackle obstruction"] },
  "sharptooth-catfish": { id: "sharptooth-catfish", type: "fish", name: "African sharptooth catfish", scientificName: "Clarias gariepinus", summary: "A heavy fish takes the light lure in the newly connected shallows and holds close to the bottom.", ecology: "African sharptooth catfish occupy varied freshwater habitats and are part of multi-species inland fisheries. Changing water levels alter the space and food available to them.", handling: [
    { id: "support-release", label: "Support the body, avoid the fin spines, and release promptly", result: "With its weight supported and the hook removed, the catfish pushes back into deeper water.", safe: true },
    { id: "line-lift", label: "Lift the fish into the mokoro by the line", result: "The fish twists against the hook. Kabelo has you lower it and support its body instead.", safe: false },
  ], connections: ["Rising water -> expanded habitat", "Bottom habitat -> catfish feeding", "Fin spines -> careful handling"] },
};
