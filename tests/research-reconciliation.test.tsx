import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResearchAtlas } from "../src/components/ResearchAtlas";
import { getLearningQuestion, recordLearningAnswer } from "../src/data/learning";
import { researchProjects } from "../src/data/researchProjects";
import { venueById } from "../src/data/venues";
import { createInitialState } from "../src/game/engine";
import { correctLimitationId, getProjectEvidenceStatus, recordLearningRevision } from "../src/game/research";
import type { ExpeditionState, FieldObservation } from "../src/types";

function readyState(projectId: string): ExpeditionState {
  const project = researchProjects.find(item => item.id === projectId)!;
  const observations: FieldObservation[] = project.evidenceRequirements.map((requirement, index) => {
    const route = requirement.routes[0];
    const venue = venueById[requirement.venueId];
    return { id: index + 1, expedition: index + 1, venueId: venue.id,
      seasonId: venue.seasons.find(item => item.availableEncounterIds.includes(route.encounterId))!.id,
      habitatId: route.habitatId, gearId: venue.gearSets.find(item => item.method === route.method)!.id,
      encounterId: route.encounterId, handlingId: venue.encounters[route.encounterId].handling.find(item => item.safe)!.id,
      castAccuracy: 90, controlMistakes: 0, assisted: false, shared: true, reportingStatus: "full-notes" };
  });
  return { ...createInitialState(), observations, expeditionNumber: 2,
    journalIds: observations.map(item => `${item.venueId}:${item.encounterId}`) };
}

function inspectAtlas(state: ExpeditionState, projectId: string): { html: string; keys: string[] } {
  let keys: string[] = [];
  function Probe() {
    // Invoke during a normal React render so ResearchAtlas's hooks have the
    // server-renderer dispatcher. Inspect raw sibling keys before React expands
    // child components; static HTML alone cannot detect a reconciliation risk.
    const atlas = ResearchAtlas({ state, selectedProjectId: projectId, onSelect: () => {},
      setState: () => { throw new Error("Inspection must not save anything"); } });
    const siblings = (atlas.props.children as ReactNode[]).flat(Infinity);
    keys = siblings.flatMap(node => isValidElement(node) && node.key !== null ? [String(node.key)] : []);
    return atlas;
  }
  return { html: renderToStaticMarkup(<Probe />), keys };
}

describe("research report reconciliation", () => {
  it.each(researchProjects.map(item => item.id))("keeps keyed report siblings distinct before and after repeated supported %s saves", projectId => {
    const question = getLearningQuestion(projectId)!;
    const original = recordLearningAnswer(readyState(projectId), question.id, question.options.find(item => item.id !== question.correctId)!.id);
    const supported = recordLearningRevision(original, projectId, question.correctId, [1, 2], correctLimitationId);
    const resaved = recordLearningRevision(supported, projectId, question.correctId, [1, 2], correctLimitationId);
    // An unchanged valid review still replaces the journey state. The DOM
    // collision came from sibling identity, not a state-update no-op.
    expect(resaved).not.toBe(supported);
    expect(resaved.learningRevisions).toEqual(supported.learningRevisions);
    expect(resaved.learningAnswers).toBe(original.learningAnswers);
    expect(getProjectEvidenceStatus(resaved, projectId).supported).toBe(true);
    for (const state of [original, supported, resaved]) {
      const { html, keys } = inspectAtlas(state, projectId);
      expect(keys).toEqual([...new Set(keys)]);
      expect(html.match(/aria-label="Research evidence review"/g)).toHaveLength(1);
      if (state !== original) {
        expect(html).toContain("<button>Edit review</button>");
        expect(html).not.toContain('aria-label="Link records and review the research conclusion"');
      }
    }
  });
});
