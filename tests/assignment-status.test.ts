import { describe, expect, it } from 'vitest';
import { createInitialState, selectVenue } from '../src/game/engine';
import { getActiveAssignment, getCurrentAssignmentStatus } from '../src/game/assignments';

describe('truthful assignment guidance', () => {
  const state = selectVenue(createInitialState(), 'amazon');
  const target = getActiveAssignment(state)!.id;
  it('does not promise completion after an unsafe target response', () => {
    const status = getCurrentAssignmentStatus({ ...state, tripJournalIds: [target] });
    expect(status.ready).toBe(false);
    expect(status.title).toContain('handling needs review');
    expect(status.detail).toContain('does not meet');
  });
  it('retains the careful target requirement after an unrelated later encounter', () => {
    const status = getCurrentAssignmentStatus({ ...state, encounterId: 'amazon-turtle', tripJournalIds: [target, 'amazon:amazon-turtle'], tripSafeJournalIds: [target] });
    expect(status.ready).toBe(true);
    expect(status.detail).toContain('Share the full field record');
  });
  it('keeps an exhausted unmatched assignment available for later', () => {
    const status = getCurrentAssignmentStatus({ ...state, castAttempts: 3 });
    expect(status.ready).toBe(false);
    expect(status.detail).toContain('available next time');
  });
});
