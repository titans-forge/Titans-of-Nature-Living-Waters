import { researchProjects } from '../data/researchProjects';
import { getEvidenceForQuestion, getProjectEvidenceStatus } from './research';
import type { ExpeditionState } from '../types';

/** Follow an explicit journey, or the eligible record just returned; a venue alone is insufficient. */
export function getResearchReturn(state: ExpeditionState, activeProjectId?: string | null) {
  const latest = state.observations.filter(record => record.expedition === state.expeditionNumber && record.venueId === state.venueId).at(-1);
  const project = researchProjects.find(item => item.id === activeProjectId)
    ?? (latest ? researchProjects.find(item => getEvidenceForQuestion(state, item.id).some(record => record.id === latest.id)) : undefined);
  if (!project) return null;
  const status = getProjectEvidenceStatus(state, project.id);
  const missing = status.stops.find(stop => stop.candidates.length === 0);
  return { project, status, nextVenueId: missing?.venueId ?? null,
    nextFieldTask: missing ? project.evidenceRequirements.find(item => item.venueId === missing.venueId)!.fieldTask : null,
    currentRecordRelevant: Boolean(latest && getEvidenceForQuestion(state, project.id).some(record => record.id === latest.id)) };
}
