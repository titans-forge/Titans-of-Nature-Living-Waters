import { getLearningQuestion } from "./learning";
import type { GearMethod } from "../types";

export interface ResearchEvidenceRequirement {
  venueId: string;
  fieldTask: string;
  routes: { encounterId: string; habitatId: string; method: GearMethod }[];
}

export interface ResearchProject {
  id: string;
  title: string;
  question: string;
  venueIds: [string, string];
  premise: string;
  communityOutcome: string;
  evidenceRequirements: [ResearchEvidenceRequirement, ResearchEvidenceRequirement];
}

export const researchProjects: ResearchProject[] = [
  {
    id: "project:floods", title: "When a forest becomes water",
    question: getLearningQuestion("project:floods")!.prompt,
    venueIds: ["amazon", "tonle-sap"],
    premise: "Compare a fish record from the Amazon forest or channel with one from Tonle Sap's flooded margins or connecting channel. Share full context from both waters. These selected observations support a question about seasonal access; they do not prove the whole floodplain's condition.",
    evidenceRequirements: [
      { venueId: "amazon", fieldTask: "Carefully record peacock bass or arapaima at the flooded forest edge, or silver arowana in the open channel. Return full notes with the habitat and season.", routes: [
        { encounterId: "peacock-bass", habitatId: "roots", method: "angling" },
        { encounterId: "arapaima", habitatId: "roots", method: "angling" },
        { encounterId: "silver-arowana", habitatId: "channel", method: "angling" },
      ] },
      { venueId: "tonle-sap", fieldTask: "Carefully record giant snakehead at the forest edge, trey riel in the connecting channel, or striped snakehead at a flooded margin or channel. Return full habitat and season notes.", routes: [
        { encounterId: "giant-snakehead", habitatId: "forest", method: "angling" },
        { encounterId: "trey-riel", habitatId: "channel", method: "angling" },
        { encounterId: "ricefield-snakehead", habitatId: "lotus", method: "angling" },
        { encounterId: "ricefield-snakehead", habitatId: "channel", method: "angling" },
      ] },
    ],
    communityOutcome: "In the story, the two field teams add seasonal access and return routes to their nursery survey plan. Future visits will record when connections open and close, alongside the animals observed.",
  },
  {
    id: "project:migration", title: "A life cycle needs a route",
    question: getLearningQuestion("project:migration")!.prompt,
    venueIds: ["baikal", "danube"],
    premise: "Compare sturgeon or omul at Baikal's Selenga approach with a tagged sturgeon or supervised research encounter in the Danube. Share the season, method, and habitat from both. Two station records frame a migration question; they cannot establish an entire route or an engineering solution.",
    evidenceRequirements: [
      { venueId: "baikal", fieldTask: "Use the permitted survey or light drift route at the Selenga delta to carefully record Baikal sturgeon or omul when seasonally available. Share the full field record; shelf sponges are not migration evidence.", routes: [
        { encounterId: "baikal-sturgeon", habitatId: "delta", method: "angling" },
        { encounterId: "baikal-omul", habitatId: "delta", method: "angling" },
      ] },
      { venueId: "danube", fieldTask: "Use telemetry to document tagged sterlet in the floodplain or gravel seam, or tagged beluga near the navigation margin. The fictional supervised beluga research encounter also qualifies in its migration window. Share full notes; mooring rope is not migration evidence.", routes: [
        { encounterId: "sterlet", habitatId: "floodplain", method: "telemetry" },
        { encounterId: "sterlet", habitatId: "gravel", method: "telemetry" },
        { encounterId: "beluga-sturgeon", habitatId: "navigation", method: "telemetry" },
        { encounterId: "beluga-research", habitatId: "navigation", method: "angling" },
      ] },
    ],
    communityOutcome: "In the story, Anya and the Danube team agree to track habitat access across seasons. Their next survey asks whether fish can continue a journey, not only whether water at one station looks suitable.",
  },
  {
    id: "project:productivity", title: "Follow the food beneath the surface",
    question: getLearningQuestion("project:productivity")!.prompt,
    venueIds: ["alaska-kelp", "galapagos"],
    premise: "Compare a carefully recorded Alaska kelp-coast fish with an undisturbed Galapagos iguana, penguin, or sea lion. Share their habitat and season. These observations connect consumers to the food-web question; they do not measure total productivity or a population trend.",
    evidenceRequirements: [
      { venueId: "alaska-kelp", fieldTask: "Carefully record kelp greenling at the kelp cove, coho salmon in the tidal channel, or halibut in the channel or beside the ledge. Share full context. Incidental rockfish and kelp snags do not qualify.", routes: [
        { encounterId: "kelp-greenling", habitatId: "kelp", method: "angling" },
        { encounterId: "coho-salmon", habitatId: "channel", method: "angling" },
        { encounterId: "pacific-halibut", habitatId: "channel", method: "angling" },
        { encounterId: "pacific-halibut", habitatId: "ledge", method: "angling" },
      ] },
      { venueId: "galapagos", fieldTask: "Use a camera survey to observe a marine iguana at the lava shore, a penguin at the shore or upwelling channel, or a sea lion at the channel without disturbance. Share the images with their full field context.", routes: [
        { encounterId: "marine-iguana", habitatId: "lava-shore", method: "camera" },
        { encounterId: "galapagos-penguin", habitatId: "lava-shore", method: "camera" },
        { encounterId: "galapagos-penguin", habitatId: "upwelling-channel", method: "camera" },
        { encounterId: "galapagos-sea-lion", habitatId: "upwelling-channel", method: "camera" },
      ] },
    ],
    communityOutcome: "In the story, Noah and Mateo pair future wildlife observations with season, water conditions, and signs of producers or prey. A sighting now carries the context needed to compare changing food webs.",
  },
];
