import { getLearningQuestion } from "./learning";

export interface ResearchProject {
  id: string;
  title: string;
  question: string;
  venueIds: [string, string];
  premise: string;
  communityOutcome: string;
}

export const researchProjects: ResearchProject[] = [
  {
    id: "project:floods", title: "When a forest becomes water",
    question: getLearningQuestion("project:floods")!.prompt,
    venueIds: ["amazon", "tonle-sap"],
    premise: "Two communities depend on fish moving into flooded margins and returning as water falls. Bring a careful, shared field record from each place, then compare what keeps a nursery connected.",
    communityOutcome: "In the story, the two field teams add seasonal access and return routes to their nursery survey plan. Future visits will record when connections open and close, alongside the animals observed.",
  },
  {
    id: "project:migration", title: "A life cycle needs a route",
    question: getLearningQuestion("project:migration")!.prompt,
    venueIds: ["baikal", "danube"],
    premise: "A cold lake's tributaries and a working European river pose different challenges to migrating fish. Compare a careful, shared record from each without assuming one solution belongs everywhere.",
    communityOutcome: "In the story, Anya and the Danube team agree to track habitat access across seasons. Their next survey asks whether fish can continue a journey, not only whether water at one station looks suitable.",
  },
  {
    id: "project:productivity", title: "Follow the food beneath the surface",
    question: getLearningQuestion("project:productivity")!.prompt,
    venueIds: ["alaska-kelp", "galapagos"],
    premise: "A kelp coast and volcanic islands share a dependence on light, nutrients, and moving water. Use careful, shared observations from both to explain why latitude is only the beginning of the story.",
    communityOutcome: "In the story, Noah and Mateo pair future wildlife observations with season, water conditions, and signs of producers or prey. A sighting now carries the context needed to compare changing food webs.",
  },
];
