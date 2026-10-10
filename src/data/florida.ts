import type { Encounter, GearSet, Habitat, Question } from "../types";

export const floridaQuestions: Question[] = [
  { id: "tide-turn", prompt: "When will the tide turn?", answer: "The incoming tide will cover the root edge and push water across the grass. On the ebb, fish often use creek mouths as water drains from shallow habitat.", hint: "Tide direction changes both access and feeding position.", source: "NPS describes Florida Bay as a shallow estuary shaped by tides, currents, winds, and basin topography." },
  { id: "salinity", prompt: "What does salinity tell us today?", answer: "Rain and freshwater lower salinity in the wet season. Evaporation and limited freshwater raise it in the dry season, sometimes beyond normal seawater.", hint: "Salinity is a habitat condition, not merely a number on the meter.", source: "Everglades National Park identifies salinity as a primary driver of Florida Bay ecological conditions." },
  { id: "mangrove-roots", prompt: "Why work the mangrove edge gently?", answer: "Submerged prop roots shelter juvenile fish and invertebrates, but they also catch line. A controlled cast protects both the fish and the nursery structure.", hint: "The same roots that attract fish make poor line management costly.", source: "NPS describes submerged mangrove roots as habitat, nursery ground, and shoreline structure." },
  { id: "seagrass-signs", prompt: "What should healthy seagrass look like?", answer: "Look for clear water, intact blades, small baitfish, and an unscarred bottom. Avoid running or anchoring where the propeller would cut the meadow.", hint: "Seagrass supports the food web and is easily damaged in shallow water.", source: "NPS identifies seagrass as a foundation of the Florida Bay ecosystem." },
];

export const floridaGear: GearSet[] = [
  { id: "roots", method: "angling", name: "Mangrove-edge kit", rod: "6 ft medium rod", line: "15 lb leader", hook: "Single barbless hook", lure: "Shallow soft bait", tools: "Long pliers + salinity meter", strength: "Turns a fish away from prop roots without heavy terminal tackle.", tradeoff: "A low lure can still enter roots on a wide cast." },
  { id: "flat", method: "angling", name: "Seagrass-flat kit", rod: "7 ft light rod", line: "10 lb leader", hook: "Single barbless hook", lure: "Suspending minnow", tools: "Long pliers + depth pole", strength: "Presents above grass in clear shallow water.", tradeoff: "Light line offers less control beside oyster shell or roots." },
  { id: "creek", method: "angling", name: "Tidal-creek kit", rod: "7 ft medium rod", line: "12 lb leader", hook: "Single circle hook", lure: "Shrimp-pattern lure", tools: "Long pliers + tide card", strength: "Works moving water at creek mouths with fewer deep hooksets.", tradeoff: "The lure may collect loose grass on a draining tide." },
];

export const floridaHabitats: Habitat[] = [
  { id: "mangroves", name: "Red mangrove roots", cue: "Flooded prop roots, shade, and small baitfish", plant: "Red mangrove", hypothesis: "Predators may hold where nursery cover meets the moving tide.", position: "left" },
  { id: "seagrass", name: "Clear seagrass flat", cue: "Intact blades, sand openings, and mullet wakes", plant: "Turtle grass and shoal grass", hypothesis: "Fish can cross the flat while the tide provides enough depth and oxygenated water.", position: "center" },
  { id: "creek", name: "Tidal creek mouth", cue: "A narrow current seam beside oyster-lined bank", plant: "Mangrove fringe and submerged grass", hypothesis: "Draining water may gather prey where the creek joins the bay.", position: "right" },
];

export const floridaEncounters: Record<string, Encounter> = {
  "common-snook": { id: "common-snook", type: "fish", name: "Common snook", scientificName: "Centropomus undecimalis", summary: "A long silver fish strikes beside the flooded prop roots and turns immediately toward cover.", ecology: "Snook use estuaries and structured shorelines. Mangrove edges connect prey, shade, current, and refuge, while changing temperature and salinity influence where fish can remain.", handling: [
    { id: "turn-release", label: "Turn it from the roots, wet your hands, and release beside the skiff", result: "The fish clears the roots and the barbless hook comes free while it remains supported in the water.", safe: true },
    { id: "gill-lift", label: "Lift it aboard by the gill cover", result: "Elena stops the lift. A photograph is not worth damaging gills or holding the fish out of water.", safe: false },
  ], connections: ["Mangrove roots -> nursery structure", "Tidal current -> prey movement", "Salinity gradient -> fish distribution"] },
  "red-drum": { id: "red-drum", type: "fish", name: "Red drum", scientificName: "Sciaenops ocellatus", summary: "A copper-backed fish takes along the creek seam as the tide pulls food from the shallows.", ecology: "Red drum use estuarine flats, lagoons, and creeks. Their position can follow tide, depth, prey movement, and salinity across a connected coastal mosaic.", handling: [
    { id: "wet-support", label: "Support it horizontally, remove the hook, and release in moving water", result: "The fish rights itself in the creek flow and moves back toward the flat.", safe: true },
    { id: "dry-measure", label: "Leave it on the dry deck while searching for a ruler", result: "The delay and dry surface damage protective mucus for no useful field observation.", safe: false },
  ], connections: ["Ebb tide -> creek concentration", "Seagrass prey -> feeding", "Estuary connection -> life-cycle habitat"] },
  "spotted-seatrout": { id: "spotted-seatrout", type: "fish", name: "Spotted seatrout", scientificName: "Cynoscion nebulosus", summary: "A spotted fish takes above intact grass where clear water crosses a pale sand opening.", ecology: "Spotted seatrout are estuarine predators associated with seagrass and other shallow habitats. Healthy grass supports prey and stabilizes the productive bottom community.", handling: [
    { id: "water-release", label: "Keep it over water, use the pliers, and release promptly", result: "The hook comes free above the grass and the fish swims away without touching the deck.", safe: true },
    { id: "jaw-hang", label: "Hang it vertically by the jaw for a long photograph", result: "Elena shortens the handling and supports the body before returning the fish to the flat.", safe: false },
  ], connections: ["Seagrass -> prey refuge", "Clear water -> visual feeding", "Propeller scars -> habitat loss"] },
  "mangrove-snapper": { id: "mangrove-snapper", type: "fish", name: "Mangrove snapper", scientificName: "Lutjanus griseus", summary: "A compact snapper darts from shade where the creek meets the mangrove fringe.", ecology: "Young mangrove snapper use estuaries, mangroves, and seagrass before larger individuals occupy other coastal habitats. The catch links sheltered nurseries to the wider sea.", handling: [
    { id: "pliers-release", label: "Control the fish, avoid the teeth, and use long pliers", result: "The hook is removed without putting fingers near the fish's mouth, and it returns to shaded water.", safe: true },
    { id: "finger-mouth", label: "Grip it inside the mouth while removing the hook", result: "The snapper's teeth make the shortcut unsafe. Elena passes the pliers instead.", safe: false },
  ], connections: ["Mangrove shade -> juvenile refuge", "Creek mouth -> moving prey", "Estuary nursery -> coastal population"] },
  "seagrass-snag": { id: "seagrass-snag", type: "plant", interaction: "snag", name: "Seagrass wrack on the line", scientificName: "Mixed seagrass blades", summary: "The lure returns wrapped in loose blades while intact grass waves below the skiff.", ecology: "Living seagrass meadows stabilize shallow bottom and support food webs. Detached wrack also transports nutrients and small organisms, but it should not be confused with permission to damage rooted grass.", handling: [
    { id: "inspect-clear", label: "Inspect the loose wrack, clear the hook, and keep the skiff off rooted grass", result: "Small organisms move among the blades. The plant observation is recorded without anchoring in the meadow.", safe: true },
    { id: "drag-bottom", label: "Drag the lure through the bottom to clear a casting lane", result: "The shortcut tears rooted grass and turns fishing pressure into habitat damage.", safe: false },
  ], connections: ["Seagrass -> food-web foundation", "Wrack -> nutrient transport", "Shallow propeller use -> meadow scars"] },
};
