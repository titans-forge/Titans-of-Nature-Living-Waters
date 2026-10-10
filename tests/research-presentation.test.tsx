import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LearningPanel } from "../src/components/LearningPanel";
import { ResearchAtlas } from "../src/components/ResearchAtlas";
import { getLearningQuestion, recordLearningAnswer } from "../src/data/learning";
import { researchProjects, type ResearchEvidenceRequirement } from "../src/data/researchProjects";
import { venues } from "../src/data/venues";
import { createInitialState } from "../src/game/engine";
import { correctLimitationId, getProjectEvidenceStatus, getResearchLimitations, recordLearningRevision } from "../src/game/research";
import type { ExpeditionState, FieldObservation } from "../src/types";

const noUpdate: React.Dispatch<React.SetStateAction<ExpeditionState>> = () => { throw new Error("Rendering must not choose or save anything"); };
const escapeText = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
const panel = (state: ExpeditionState, questionId: string, reveal = true) => renderToStaticMarkup(<LearningPanel state={state} questionId={questionId} setState={noUpdate} reveal={reveal} />);
const atlas = (state: ExpeditionState) => renderToStaticMarkup(<ResearchAtlas state={state} setState={noUpdate} onSelect={() => { throw new Error("Rendering must not navigate"); }} />);

function evidence(requirement: ResearchEvidenceRequirement, id: number): FieldObservation {
  const route = requirement.routes[0]; const venue = venues.find(item => item.id === requirement.venueId)!;
  const gear = venue.gearSets.find(item => item.method === route.method)!;
  const handling = venue.encounters[route.encounterId].handling.find(item => item.safe)!;
  return { id, expedition: id, venueId: venue.id, seasonId: venue.seasons.find(item => item.availableEncounterIds.includes(route.encounterId))!.id,
    habitatId: route.habitatId, gearId: gear.id, encounterId: route.encounterId, handlingId: handling.id,
    castAccuracy: 90, controlMistakes: 0, assisted: false, shared: true, reportingStatus: "full-notes" };
}
function withRecords(observations: FieldObservation[]): ExpeditionState {
  return { ...createInitialState(), observations, expeditionNumber: Math.max(0, ...observations.map(item => item.expedition)),
    journalIds: [...new Set(observations.map(item => `${item.venueId}:${item.encounterId}`))] };
}

describe("evidence review presentation", () => {
  it("retains the local first-answer question before an observation without choosing an answer", () => {
    const html = panel(createInitialState(), "amazon:prediction", false);
    expect(html).toContain("Before you observe · make a prediction");
    expect(html).toContain("Your first answer is saved so you can revisit it.");
    expect(html).toContain("I am not sure yet; I want to look for evidence.");
    expect(html).not.toContain("<form"); expect(html).not.toContain("checked=");
  });

  it("does not imply that an existing first answer was made before the observation", () => {
    const state = recordLearningAnswer(createInitialState(), "amazon:prediction", "deep");
    const html = panel(state, "amazon:prediction");
    expect(html).toContain("<h3>First answer</h3>");
    expect(html).toContain("Here is a connection to revisit.");
    expect(html).not.toContain("Your initial prediction"); expect(html).not.toContain("Before you observe");
    expect(html).toContain("Add a safely handled local observation");
    expect(html).not.toContain("<form");
  });

  it("requires a first answer before opening a local review, even when evidence already exists", () => {
    const state = withRecords([evidence(researchProjects[0].evidenceRequirements[0], 1)]);
    const html = panel(state, "amazon:prediction");
    expect(html).toContain('class="learning-options"'); expect(html).not.toContain("<form");
    expect(html).not.toContain("Before you observe");
  });

  it.each(["private-notes", "pending"] as const)("names the full context of a %s local record while leaving all review choices blank", reportingStatus => {
    const observation = { ...evidence(researchProjects[0].evidenceRequirements[0], 1), shared: false, reportingStatus };
    const state = recordLearningAnswer(withRecords([observation]), "amazon:prediction", "deep");
    const html = panel(state, "amazon:prediction"); const venue = venues.find(item => item.id === observation.venueId)!;
    expect(html).toContain("Record #1"); expect(html).toContain(escapeText(venue.encounters[observation.encounterId].name));
    expect(html).toContain("Season:"); expect(html).toContain(escapeText(venue.seasons.find(item => item.id === observation.seasonId)!.name));
    expect(html).toContain("Habitat:"); expect(html).toContain(escapeText(venue.habitats.find(item => item.id === observation.habitatId)!.name));
    expect(html).toContain("Method: Angling"); expect(html).toContain("Kit:");
    expect(html).toContain("Private and pending notes can support a local review.");
    expect(html).toContain("Explanation · choose one"); expect(html).toContain("Limitation · choose one");
    expect(html).toContain('<details class="learning-review__disclosure"><summary>Review this explanation with evidence</summary>');
    expect(html).toMatch(/<fieldset aria-describedby="[^"]+"><legend>Amazon evidence/);
    expect(html).toMatch(/<input type="radio" name="[^"]+-evidence-amazon" value="1"/);
    expect(html).toMatch(/<input type="radio" name="[^"]+-answer"/);
    expect(html).toMatch(/<input type="radio" name="[^"]+-limitation"/);
    expect(html).toContain("Save evidence review"); expect(html).not.toContain("checked=");
    expect(html).not.toContain("disabled=");
  });

  it("keeps a wrong first answer visible alongside the latest supported evidence review", () => {
    const records = [evidence(researchProjects[0].evidenceRequirements[0], 1)];
    let state = recordLearningAnswer(withRecords(records), "amazon:prediction", "deep");
    state = recordLearningRevision(state, "amazon:prediction", "forest", [1], correctLimitationId);
    const html = panel(state, "amazon:prediction"); const question = getLearningQuestion("amazon:prediction")!;
    expect(html).toContain("<h3>First answer</h3>"); expect(html).toContain(escapeText(question.options.find(item => item.id === "deep")!.text));
    expect(html).toContain("<h3>Latest evidence review</h3>"); expect(html).toContain(escapeText(question.options.find(item => item.id === "forest")!.text));
    expect(html).toContain("This explanation fits the model; a local context record is linked.");
    expect(html).not.toContain("Supported by the selected game records."); expect(html).toContain("Save revised evidence review");
    expect(html).toContain("does not establish a real population trend or demonstrate transfer");
    expect(html.match(/checked=""/g)).toHaveLength(3);
    expect(html).toContain('<details class="learning-review__disclosure"><summary>Edit review</summary>');
    expect(html).toMatch(/<input[^>]+name="[^"]+-evidence-amazon" checked="" value="1"/);
    expect(html).toMatch(/<input[^>]+name="[^"]+-answer" checked="" value="forest"/);
    expect(html).toMatch(/<input[^>]+name="[^"]+-limitation" checked="" value="sample-limits"/);
    expect(state.learningAnswers[0].answerId).toBe("deep");
  });

  it("keeps a saved local selection tied to record IDs when newer candidates appear or their order changes", () => {
    const first = evidence(researchProjects[0].evidenceRequirements[0], 11);
    const later = { ...first, id: 17, expedition: 12 };
    let state = recordLearningAnswer(withRecords([later, first]), "amazon:prediction", "not-sure");
    state = recordLearningRevision(state, "amazon:prediction", "forest", [11], "whole-route-proof");
    const before = structuredClone(state);
    const html = panel(state, "amazon:prediction");
    expect(html).toMatch(/<input[^>]+name="[^"]+-evidence-amazon" checked="" value="11"/);
    expect(html).not.toMatch(/<input[^>]+name="[^"]+-evidence-amazon" checked="" value="17"/);
    expect(html).toMatch(/<input[^>]+name="[^"]+-limitation" checked="" value="whole-route-proof"/);
    expect(html).toContain("This evidence review needs another look.");
    expect(state).toEqual(before);
  });

  it("puts the saved result and explanation ahead of collapsed record details and exposes a result focus target", () => {
    const project = researchProjects[0];
    const state = recordLearningRevision(withRecords(project.evidenceRequirements.map((requirement, index) => evidence(requirement, index + 1))),
      project.id, getLearningQuestion(project.id)!.correctId, [1, 2], correctLimitationId);
    const html = panel(state, project.id);
    const result = html.indexOf('role="status" tabindex="-1"');
    expect(result).toBeGreaterThan(html.indexOf("Latest evidence review"));
    expect(result).toBeLessThan(html.indexOf("<strong>Explanation:</strong>"));
    expect(html.indexOf(escapeText(getLearningQuestion(project.id)!.explanation))).toBeLessThan(html.indexOf("Selected limitation and linked records"));
    expect(html).toContain("<button>Edit review</button>");
    expect(html).not.toContain("<form");
    const limitation = getResearchLimitations(project.id).find(option => option.id === correctLimitationId)!;
    expect(html).toContain(escapeText(limitation.text));
    expect(html).toContain(escapeText(limitation.feedback));
  });

  it("shows missing project stops and explicit review controls instead of a disabled evidence trap", () => {
    const html = atlas(createInitialState());
    expect(html).toContain("0 / 3 supported reports · 0 attempted");
    expect(html).toContain("Amazon evidence · choose one record"); expect(html).toContain("Tonle Sap evidence · choose one record");
    expect(html).toContain("No relevant, safely handled full-notes record is available here yet");
    expect(html).toContain(escapeText(researchProjects[0].evidenceRequirements[0].fieldTask));
    expect(html).toContain(escapeText(researchProjects[0].evidenceRequirements[1].fieldTask));
    expect(html).toContain("Conclusion · choose one"); expect(html).toContain("Limitation · choose one");
    expect(html).toContain("Save evidence review"); expect(html).not.toContain("disabled="); expect(html).not.toContain("checked=");
    expect(html).not.toContain('class="learning-review__disclosure"');
    expect(html).not.toContain(escapeText(researchProjects[0].communityOutcome));
  });

  it("preserves old project answers as attempted without issuing the community outcome", () => {
    let state = createInitialState();
    for (const project of researchProjects) state = recordLearningAnswer(state, project.id, getLearningQuestion(project.id)!.correctId);
    const html = atlas(state);
    expect(html).toContain("0 / 3 supported reports · 3 attempted");
    expect(html).toContain("An answer is saved. Link the required records");
    expect(html).toContain("<h3>First answer</h3>");
    expect(html).not.toContain('class="journey-complete"'); expect(html).not.toContain(escapeText(researchProjects[0].communityOutcome));
  });

  it("counts supported and attempted separately and does not celebrate an overclaim", () => {
    const project = researchProjects[0]; const records = project.evidenceRequirements.map((requirement, index) => evidence(requirement, index + 1));
    const state = recordLearningRevision(withRecords(records), project.id, getLearningQuestion(project.id)!.correctId, [1, 2], "population-proof");
    expect(getProjectEvidenceStatus(state, project.id)).toMatchObject({ attempted: true, ready: true, supported: false });
    const html = atlas(state);
    expect(html).toContain("0 / 3 supported reports · 1 attempted"); expect(html).toContain("This evidence review needs another look.");
    expect(html).toContain("do not establish abundance or a population trend");
    expect(html).not.toContain(escapeText(project.communityOutcome)); expect(html).not.toContain('class="journey-complete"');
  });

  it("issues community outcomes and the completion banner only for supported explicit comparisons", () => {
    const records = researchProjects.flatMap((project, projectIndex) => project.evidenceRequirements.map((requirement, index) => evidence(requirement, projectIndex * 2 + index + 1)));
    let state = withRecords(records);
    researchProjects.forEach((project, index) => { state = recordLearningRevision(state, project.id, getLearningQuestion(project.id)!.correctId, [index * 2 + 1, index * 2 + 2], correctLimitationId); });
    const html = atlas(state);
    expect(html).toContain("3 / 3 supported reports · 3 attempted");
    expect(html).toContain('class="journey-complete"'); expect(html).toContain("Three evidence-linked reports");
    expect(html).toContain(escapeText(researchProjects[0].communityOutcome));
    expect(html).not.toContain("checked=");
  });

  it("distinguishes safe full-notes records that do not address the selected project", () => {
    const venue = venues.find(item => item.id === "amazon")!; const encounter = Object.values(venue.encounters).find(item => item.interaction === "bycatch")!;
    const observation: FieldObservation = { id: 1, expedition: 1, venueId: venue.id, seasonId: venue.seasons[0].id,
      habitatId: "roots", gearId: venue.gearSets[0].id, encounterId: encounter.id, handlingId: encounter.handling.find(item => item.safe)!.id,
      castAccuracy: 90, controlMistakes: 0, assisted: false, shared: true, reportingStatus: "full-notes" };
    const html = panel(withRecords([observation]), "project:floods");
    expect(html).toContain("Other full-notes records · outside this field task");
    expect(html).toContain(escapeText(encounter.name)); expect(html).toContain("Season:"); expect(html).toContain("Habitat:"); expect(html).toContain("Method:");
    expect(html).toContain("not eligible evidence selections here");
    expect(html).not.toMatch(/<input[^>]+name="[^"]*-evidence-amazon"/);
    expect(getProjectEvidenceStatus(withRecords([observation]), "project:floods").ready).toBe(false);
  });
});
