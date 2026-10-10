import type { GearMethod, InteractionKind } from "../types";

const presentations = {
  fish: {
    start: "fishing", progress: "Catch progress", metric: "Line pressure", control: "HOLD TO REEL",
    phases: ["Fish running", "Reeling window"], instructions: ["Let it run", "Hold to reel"],
    assist: ["LET THIS RUN PASS", "REEL ONE WINDOW"], release: "a run",
    intro: "Hold while the fish tires. Release when it runs. Start when the controls feel comfortable.",
    complete: "Alongside the boat", next: "Handle the encounter", technique: "Fight control", recorded: "brought alongside",
  },
  bycatch: {
    start: "careful response", progress: "Stabilization", metric: "Animal pressure", control: "HOLD TO STEADY",
    phases: ["Animal struggling", "Calm interval"], instructions: ["Ease pressure", "Steady without lifting"],
    assist: ["EASE THROUGH THE STRUGGLE", "STEADY ONE INTERVAL"], release: "a struggle",
    intro: "This is an incidental encounter. Ease pressure while the animal struggles, then steady it at the waterline. The goal is a careful response, not a longer fight.",
    complete: "Ready for a careful response", next: "Choose the careful response", technique: "Incident response", recorded: "stabilized",
  },
  snag: {
    start: "recovery", progress: "Recovery progress", metric: "Tether pressure", control: "HOLD TO GUIDE BACK",
    phases: ["Resistance rising", "Line easing"], instructions: ["Ease the pressure", "Guide back gently"],
    assist: ["EASE THIS RESISTANCE", "GUIDE BACK ONE INTERVAL"], release: "resistance",
    intro: "Work back along the entry path. Release when resistance rises; guide the tackle or tether back only while it eases. Habitat care comes before recovering equipment.",
    complete: "Ready to assess the habitat", next: "Review the habitat response", technique: "Snag recovery", recorded: "guided back",
  },
  camera: {
    start: "camera survey", progress: "Image record", metric: "Image disturbance", control: "HOLD TO RECORD",
    phases: ["View shifting", "Clear view"], instructions: ["Wait for a clear view", "Record the clear view"],
    assist: ["WAIT FOR THE VIEW TO CLEAR", "RECORD THIS CLEAR VIEW"], release: "a shifting view",
    intro: "Let the camera settle before recording. Hold for a clear view, then release when the water or subject moves. The animal stays undisturbed.",
    complete: "Camera record ready", next: "Review the observation", technique: "Camera observation", recorded: "recorded",
  },
  telemetry: {
    start: "listening survey", progress: "Tag evidence", metric: "Receiver disturbance", control: "HOLD TO CONFIRM",
    phases: ["Listening for pings", "Tag signal window"], instructions: ["Listen hands off", "Confirm the tag signal"],
    assist: ["LISTEN FOR THIS WINDOW", "CONFIRM THIS TAG SIGNAL"], release: "listening",
    intro: "Leave the receiver still while it listens: evidence builds hands off. Hold only during a tag signal window to confirm it. A detection tells you about a tagged animal, not every animal nearby.",
    complete: "Tag detection recorded", next: "Review the detection", technique: "Telemetry confirmation", recorded: "verified",
  },
  sampling: {
    start: "water sample", progress: "Sample preparation", metric: "Sample disturbance", control: "HOLD TO COLLECT",
    phases: ["Sampler settling", "Collection window"], instructions: ["Let the sampler settle", "Collect a clean sample"],
    assist: ["LET THE SAMPLER SETTLE", "COLLECT THIS SAMPLE"], release: "settling",
    intro: "Keep the sampler still while it settles, then hold to collect in the clean window. This records an environmental sample; it does not hook or photograph a fish.",
    complete: "Environmental sample ready", next: "Review the sample", technique: "Sample collection", recorded: "prepared",
  },
} satisfies Record<InteractionKind, {
  start: string; progress: string; metric: string; control: string;
  phases: string[]; instructions: string[]; assist: string[]; release: string;
  intro: string; complete: string; next: string; technique: string; recorded: string;
}>;

export function getInteractionPresentation(kind: InteractionKind) { return presentations[kind]; }

export function getSetupPresentation(method: GearMethod) {
  switch (method) {
    case "camera": return { title: "Position the camera.", action: "POSITION CAMERA", setup: "Position the camera", placement: "Camera placement" };
    case "telemetry": return { title: "Set the receiver.", action: "SET RECEIVER", setup: "Set the receiver", placement: "Receiver placement" };
    case "sampling": return { title: "Place the sampler.", action: "PLACE SAMPLER", setup: "Place the sampler", placement: "Sampler placement" };
    default: return { title: "Read the water.", action: "CAST NOW", setup: "Set up the cast", placement: "Cast placement" };
  }
}
