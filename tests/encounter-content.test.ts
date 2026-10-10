import { describe, expect, it } from 'vitest';
import { venues, venueById } from '../src/data/venues';
import { buildAssignment, getAssignmentProgress, getCurrentAssignmentStatus, getEncounterPurpose, getNextAssignment } from '../src/game/assignments';
import { createInitialState } from '../src/game/engine';
import { getGearMethod, getInteractionKind } from '../src/game/interactions';
import { getDiscoveries, getVenueProgress } from '../src/game/progress';
import { resolveSeasonEncounter } from '../src/game/seasons';
import { validateContent } from '../src/game/validation';
import type { GearSet } from '../src/types';

describe('authored field methods and physical incidents', () => {
  it('defines all 47 kits explicitly, with distinct camera, telemetry and sampling methods', () => {
    const kits = venues.flatMap(venue => venue.gearSets);
    expect(kits).toHaveLength(47);
    for (const kit of kits) {
      expect(['angling', 'camera', 'telemetry', 'sampling']).toContain(kit.method);
      expect(kit.hook === 'No hook').toBe(kit.method !== 'angling');
    }
    expect(venueById.baikal.gearSets.find(gear => gear.id === 'camera')?.method).toBe('camera');
    expect(venueById.ganges.gearSets.find(gear => gear.id === 'acoustic')?.method).toBe('telemetry');
    expect(venueById['yellow-river-delta'].gearSets.find(gear => gear.id === 'survey')?.method).toBe('sampling');
  });

  it('keeps all 414 seasonal kit/habitat routes consistent with capture or observation equipment', () => {
    let routes = 0;
    for (const venue of venues) for (const season of venue.seasons) for (const habitat of venue.habitats.filter(habitat => habitat.safe !== false)) for (const gear of venue.gearSets) {
      const routed = venue.encounterRules[`${habitat.id}:${gear.id}`] ?? venue.fallbackEncounterId;
      const encounterId = resolveSeasonEncounter(venue, season.id, routed, gear.id);
      const encounter = venue.encounters[encounterId];
      const state = { ...createInitialState(), venueId: venue.id, seasonId: season.id, gearId: gear.id, zoneId: habitat.id, encounterId };
      const route = `${venue.id}:${season.id}:${habitat.id}:${gear.id}`;
      expect(season.availableEncounterIds, route).toContain(encounterId);
      expect(getGearMethod(state, venue), route).toBe(gear.method);
      if (gear.method === 'angling') expect(encounter.type, route).not.toBe('observation');
      else expect(encounter.interaction, route).not.toBe('bycatch');
      if (getInteractionKind(state, venue) === 'fish') expect(encounter.type, route).toBe('fish');
      if (gear.method === 'sampling' && !encounter.interaction) expect(encounter.type, route).toBe('observation');
      routes++;
    }
    expect(routes).toBe(414);
    expect(validateContent()).toEqual([]);
  });

  it.each([
    ['seto-inland-sea', 'survey', 'harbor-line-snag'],
    ['great-barrier-reef', 'survey', 'coral-line-snag'],
    ['galapagos', 'acoustic-array', 'lost-longline'],
    ['yellow-river-delta', 'survey', 'cordgrass-snag'],
    ['ganges', 'acoustic', 'ghost-net-snag'],
  ])('treats the %s tether obstruction as a physical snag even without a hook', (venueId, gearId, encounterId) => {
    const venue = venueById[venueId];
    const state = { ...createInitialState(), venueId, gearId, encounterId };
    expect(venue.gearSets.find(gear => gear.id === gearId)?.hook).toBe('No hook');
    expect(venue.encounters[encounterId].interaction).toBe('snag');
    expect(getInteractionKind(state, venue)).toBe('snag');
  });

  it('distinguishes three incidental turtle captures from protected wildlife observations', () => {
    for (const [venueId, id] of [['amazon', 'river-turtle'], ['tonle-sap', 'malayan-snail-turtle'], ['euphrates', 'euphrates-softshell']]) {
      expect(venueById[venueId].encounters[id].interaction).toBe('bycatch');
      expect(buildAssignment(venueById[venueId], id)?.purpose).toBe('incident-response');
    }
    for (const id of ['marine-iguana', 'green-turtle']) {
      const state = { ...createInitialState(), venueId: 'galapagos', gearId: 'shore-camera', encounterId: id };
      expect(venueById.galapagos.encounters[id].interaction).toBeUndefined();
      expect(getInteractionKind(state, venueById.galapagos)).toBe('camera');
      expect(buildAssignment(venueById.galapagos, id)?.purpose).toBe('investigation');
    }
  });

  it('rejects missing kit methods and missing physical-obstruction annotations in the runtime content check', () => {
    const kit = venueById.amazon.gearSets[0];
    const method = kit.method;
    try {
      delete (kit as Partial<GearSet>).method;
      expect(validateContent().some(error => error.includes('requires an authored field method'))).toBe(true);
    } finally { kit.method = method; }
    const snag = venueById.galapagos.encounters['lost-longline'];
    const interaction = snag.interaction;
    try {
      delete snag.interaction;
      expect(validateContent().some(error => error.includes('requires an explicit physical-obstruction'))).toBe(true);
    } finally { snag.interaction = interaction; }
    expect(validateContent()).toEqual([]);
  });
});

describe('investigation coverage does not require seeking incidental captures', () => {
  it('retains all 80 historical IDs while separating 58 investigations, 7 incident responses and 15 habitat-care exercises', () => {
    const journalIds = venues.flatMap(venue => Object.keys(venue.encounters).map(id => `${venue.id}:${id}`));
    const state = { ...createInitialState(), journalIds, completedAssignmentIds: journalIds };
    expect(getDiscoveries(state)).toHaveLength(80);
    const purposes = venues.flatMap(venue => Object.values(venue.encounters).map(getEncounterPurpose));
    expect(purposes.filter(purpose => purpose === 'investigation')).toHaveLength(58);
    expect(purposes.filter(purpose => purpose === 'incident-response')).toHaveLength(7);
    expect(purposes.filter(purpose => purpose === 'habitat-care')).toHaveLength(15);
    for (const venue of venues) {
      const progress = getVenueProgress(state, venue);
      expect(progress.found).toBe(Object.keys(venue.encounters).length);
      expect(progress.total).toBe(Object.keys(venue.encounters).length);
      expect(progress.investigationPercent).toBe(100);
      expect(getAssignmentProgress(state, venue).investigations.completed).toBe(progress.investigationTotal);
    }
  });

  it('shows complete core survey coverage without any bycatch or snag record', () => {
    const venue = venueById.amazon;
    const ids = Object.values(venue.encounters).filter(encounter => getEncounterPurpose(encounter) === 'investigation').map(encounter => `${venue.id}:${encounter.id}`);
    const state = { ...createInitialState(), journalIds: ids, completedAssignmentIds: ids };
    const progress = getVenueProgress(state, venue);
    expect(progress.label).toBe('Survey coverage complete');
    expect(progress.investigationPercent).toBe(100);
    expect(progress.found).toBeLessThan(progress.total);
    expect(progress.incidentResponses.found).toBe(0);
    expect(progress.habitatCare.found).toBe(0);
    expect(getAssignmentProgress(state, venue).investigations).toEqual({ completed: ids.length, total: ids.length });
  });

  it('labels optional response practice explicitly and repeats only ordinary investigations after completion', () => {
    for (const venue of venues) {
      const completedAssignmentIds = Object.keys(venue.encounters).map(id => `${venue.id}:${id}`);
      for (const season of venue.seasons) {
        const next = getNextAssignment({ ...createInitialState(), seasonId: season.id, completedAssignmentIds }, venue);
        expect(next?.purpose, `${venue.id}:${season.id}`).toBe('investigation');
      }
      for (const encounter of Object.values(venue.encounters)) {
        const assignment = buildAssignment(venue, encounter.id)!;
        if (assignment.purpose !== 'investigation') {
          expect(assignment.title).toContain('Optional');
          expect(assignment.title).not.toMatch(/^Investigate|^Find|^Catch/);
          expect(assignment.objective).toMatch(/simulated/);
          if (assignment.purpose === 'incident-response') expect(assignment.objective).toContain('not an animal to seek or catch deliberately');
        }
      }
    }
  });

  it('avoids telling a learner to hunt another incidental animal after the response is already safe', () => {
    const id = 'amazon:river-turtle';
    const status = getCurrentAssignmentStatus({ ...createInitialState(), venueId: 'amazon', activeAssignmentId: id, tripJournalIds: [id], tripSafeJournalIds: [id] });
    expect(status.ready).toBe(true);
    expect(status.title).toBe('Careful incident response ready');
    expect(status.detail).toContain('Do not seek another accidental capture');
  });
});
