import { venues } from "../data/venues";
import { buildAssignment } from "./assignments";
import { getVenueSources } from "../data/sourceLedger";

export function validateContent(): string[] {
  const errors: string[] = [];
  const venueIds = new Set<string>();
  for (const venue of venues) {
    if (venueIds.has(venue.id)) errors.push(`Duplicate venue id: ${venue.id}`);
    venueIds.add(venue.id);
    if (venue.questions.length < 4) errors.push(`${venue.id} requires at least four local questions.`);
    if (venue.seasons.length < 3) errors.push(`${venue.id} requires at least three ecological windows.`);
    if (venue.gearSets.length < 3 || venue.habitats.length !== 3) errors.push(`${venue.id} requires at least three gear sets and exactly three habitats.`);
    const references = getVenueSources(venue.id);
    if (!references.length) errors.push(`${venue.id} requires at least one authority reference.`);
    for (const reference of references) {
      if (!reference.url.startsWith("https://") || !reference.authority || !reference.supports || !/^\d{4}-\d{2}-\d{2}$/.test(reference.accessedAt)) errors.push(`${venue.id}:${reference.id} has incomplete source metadata.`);
    }
    for (const question of venue.questions) {
      if (!question.source || question.source.length < 40) errors.push(`${venue.id}:${question.id} needs a meaningful source note.`);
      if (/pending .*review|needs[- ]review|unverified/i.test(question.source)) errors.push(`${venue.id}:${question.id} contains unresolved source language.`);
    }
    for (const [kind, items] of [["question", venue.questions], ["gear", venue.gearSets], ["habitat", venue.habitats]] as const) {
      const localIds = new Set<string>();
      for (const item of items) {
        if (localIds.has(item.id)) errors.push(`${venue.id} has duplicate ${kind} id: ${item.id}`);
        localIds.add(item.id);
      }
    }
    for (const encounter of Object.values(venue.encounters)) {
      if (!encounter.summary || !encounter.ecology || encounter.connections.length < 3) errors.push(`${venue.id}:${encounter.id} is missing ecological content.`);
      if (encounter.handling.length < 2 || !encounter.handling.some((option) => option.safe) || !encounter.handling.some((option) => !option.safe)) errors.push(`${venue.id}:${encounter.id} needs safe and unsafe handling options.`);
      if (!venue.linePatterns[encounter.id] || venue.linePatterns[encounter.id].length !== 3) errors.push(`${venue.id}:${encounter.id} needs a three-step line pattern.`);
      if (!venue.linePrompts[encounter.id] || venue.linePrompts[encounter.id].length !== 3) errors.push(`${venue.id}:${encounter.id} needs three line prompts.`);
      if (!buildAssignment(venue, encounter.id)) errors.push(`${venue.id}:${encounter.id} cannot be reached by a field assignment.`);
    }
    for (const encounterId of Object.values(venue.encounterRules)) if (!venue.encounters[encounterId]) errors.push(`${venue.id} rule references unknown encounter ${encounterId}.`);
    if (!venue.encounters[venue.fallbackEncounterId]) errors.push(`${venue.id} has an unknown fallback encounter.`);
    for (const season of venue.seasons) {
      if (!season.availableEncounterIds.length) errors.push(`${venue.id}:${season.id} has no available encounters.`);
      for (const encounterId of season.availableEncounterIds) if (!venue.encounters[encounterId]) errors.push(`${venue.id}:${season.id} references unknown encounter ${encounterId}.`);
      if (!season.availableEncounterIds.includes(season.fallbackEncounterId)) errors.push(`${venue.id}:${season.id} fallback is unavailable in its own window.`);
    }
    const seasonalEncounterIds = new Set(venue.seasons.flatMap((season) => season.availableEncounterIds));
    for (const encounterId of Object.keys(venue.encounters)) if (!seasonalEncounterIds.has(encounterId)) errors.push(`${venue.id}:${encounterId} is unavailable in every ecological window.`);
  }
  return errors;
}
