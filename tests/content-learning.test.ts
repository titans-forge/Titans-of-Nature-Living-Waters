import { describe, expect, it } from "vitest";
import { getLearningQuestion, learningQuestions, recordLearningAnswer } from "../src/data/learning";
import { researchProjects } from "../src/data/researchProjects";
import { venues, venueById } from "../src/data/venues";
import { buildAssignment } from "../src/game/assignments";
import { resolveSeasonEncounter } from "../src/game/seasons";
import type { LearningAnswer } from "../src/types";

describe("learning content and persistent first attempts", () => {
  it("provides a prediction and a reflection for every real venue, with no orphaned question IDs", () => {
    expect(venues).toHaveLength(15);
    expect(learningQuestions).toHaveLength(33);
    expect(new Set(learningQuestions.map((question) => question.id)).size).toBe(learningQuestions.length);
    for (const venue of venues) {
      for (const phase of ["prediction", "reflection"] as const) {
        expect(getLearningQuestion(`${venue.id}:${phase}`)).toMatchObject({ venueId: venue.id, phase });
      }
    }
    for (const question of learningQuestions) {
      expect(new Set(question.options.map((option) => option.id)).size).toBe(question.options.length);
      expect(question.options.filter((option) => option.id === question.correctId)).toHaveLength(1);
      if (question.venueId) expect(venueById[question.venueId]).toBeDefined();
      else expect(researchProjects.some((project) => project.id === question.id)).toBe(true);
      if (question.phase === "prediction") expect(question.options.some((option) => option.id === "not-sure")).toBe(true);
    }
  });

  it("keeps an uncertain prediction as its first attempt without preventing later reflection", () => {
    const initial = { learningAnswers: [] as LearningAnswer[], marker: "keep unrelated state" };
    const predicted = recordLearningAnswer(initial, "amazon:prediction", "not-sure");
    expect(initial.learningAnswers).toEqual([]);
    expect(predicted.learningAnswers).toEqual([{ questionId: "amazon:prediction", answerId: "not-sure", correct: false }]);
    expect(predicted.marker).toBe(initial.marker);
    expect(recordLearningAnswer(predicted, "amazon:prediction", "forest")).toBe(predicted);
    const reflected = recordLearningAnswer(predicted, "amazon:reflection", "compare");
    expect(reflected.learningAnswers).toHaveLength(2);
    expect(reflected.learningAnswers[1].correct).toBe(true);
    expect(predicted.learningAnswers).toHaveLength(1);
  });

  it("rejects fabricated questions and answers without changing the record", () => {
    const state = { learningAnswers: [] as LearningAnswer[] };
    expect(recordLearningAnswer(state, "amazon:prediction", "invented-answer")).toBe(state);
    expect(recordLearningAnswer(state, "invented:prediction", "forest")).toBe(state);
    expect(getLearningQuestion("__proto__")).toBeUndefined();
  });

  it("derives correct rather than trusting callers and refuses to overwrite a wrong answer", () => {
    const initial = { learningAnswers: [] as LearningAnswer[] };
    const wrong = recordLearningAnswer(initial, "project:migration", "depth");
    expect(wrong.learningAnswers).toEqual([{ questionId: "project:migration", answerId: "depth", correct: false }]);
    expect(recordLearningAnswer(wrong, "project:migration", "access")).toBe(wrong);
    const correct = recordLearningAnswer(initial, "project:migration", "access");
    expect(correct.learningAnswers[0].correct).toBe(true);
  });

  it("connects each comparative project to exactly two distinct real venues and its authored question", () => {
    expect(researchProjects.map((project) => project.id)).toEqual(["project:floods", "project:migration", "project:productivity"]);
    for (const project of researchProjects) {
      expect(new Set(project.venueIds).size).toBe(2);
      for (const venueId of project.venueIds) expect(venueById[venueId]).toBeDefined();
      expect(getLearningQuestion(project.id)).toMatchObject({ phase: "comparison", prompt: project.question });
    }
  });
});

describe("ecological equipment consistency", () => {
  it("keeps camera observations on camera equipment across every Baikal seasonal route", () => {
    const venue = venueById.baikal;
    for (const season of venue.seasons) {
      for (const habitat of venue.habitats) {
        for (const gear of venue.gearSets) {
          const routed = venue.encounterRules[`${habitat.id}:${gear.id}`] ?? venue.fallbackEncounterId;
          const resolved = resolveSeasonEncounter(venue, season.id, routed, gear.id);
          expect(season.availableEncounterIds).toContain(resolved);
          expect(venue.encounters[resolved].type, `${season.id}/${habitat.id}/${gear.id}`).toBe(gear.hook === "No hook" ? "observation" : "fish");
        }
      }
    }
    expect(buildAssignment(venue, "deepwater-sculpin")?.gearId).toBe("camera");
  });

  it("preserves all existing discoveries and assignment routes after the content repairs", () => {
    const assignments = venues.flatMap((venue) => Object.keys(venue.encounters).map((id) => buildAssignment(venue, id)));
    expect(assignments).toHaveLength(80);
    expect(assignments.every(Boolean)).toBe(true);
  });
});
