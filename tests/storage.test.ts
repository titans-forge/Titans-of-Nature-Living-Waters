import { describe, expect, it } from 'vitest';
import { beginQuestions, createInitialState, selectVenue } from '../src/game/engine';
import { SAVE_VERSION, parseExpedition, serializeExpedition } from '../src/game/save';
import { LEGACY_SAVE_KEYS, MEMORY_RECOVERY_KEY, MIGRATION_BACKUP_KEY, RECOVERY_POINTER_KEY, REPLACEMENT_BACKUP_KEY, SAVE_KEY, getExpeditionBackupRaw, getStoredExpeditionRaw, isJourneyStorageKey, loadStoredExpedition, preserveExpeditionMemoryRecovery, replaceStoredExpedition, replaceStoredExpeditionChecked, saveStoredExpedition, saveStoredExpeditionIfUnchanged } from '../src/game/storage';
function store() {
  const values = new Map<string, string>(); const writes: string[] = [];
  return { values, writes, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); } };
}
function legacyRaw() {
  const value = { ...createInitialState(), version: 7 } as Record<string, unknown>;
  for (const key of ['observations', 'learningAnswers', 'expeditionNumber', 'castUsedAssistance', 'snagApproach', 'learningRevisions', 'anglingRules', 'anglingBeat', 'rodSide']) delete value[key];
  return JSON.stringify(value);
}
describe('recoverable browser storage', () => {
  it('starts clean only when no stored progress exists', () => {
    expect(loadStoredExpedition(store())).toEqual({ state: createInitialState(), notice: '', blocked: false, raw: null });
  });
  it('saves and loads a valid current journey', () => {
    const memory = store(); const state = selectVenue(createInitialState(), 'amazon');
    expect(saveStoredExpedition(state, memory)).toBe(true);
    expect(loadStoredExpedition(memory)).toMatchObject({ state, blocked: false });
  });
  it.each(['not JSON', '{"version":9}', '{"version":8,"journalIds":null}', ''])('retains rejected raw bytes and refuses autosave: %s', raw => {
    const memory = store(); memory.values.set(SAVE_KEY, raw);
    expect(loadStoredExpedition(memory)).toMatchObject({ blocked: true, raw });
    expect(saveStoredExpedition(createInitialState(), memory)).toBe(false);
    expect(memory.values.get(SAVE_KEY)).toBe(raw); expect(memory.writes).toEqual([]);
  });
  it('does not silently fall back from invalid newest data to an older save', () => {
    const memory = store(); memory.values.set(SAVE_KEY, 'broken'); memory.values.set(LEGACY_SAVE_KEYS[0], legacyRaw());
    expect(loadStoredExpedition(memory)).toMatchObject({ blocked: true, raw: 'broken' });
  });
  it('backs up legacy bytes before the first current-format write', () => {
    const memory = store(); const raw = legacyRaw(); memory.values.set(LEGACY_SAVE_KEYS[0], raw);
    const loaded = loadStoredExpedition(memory); expect(loaded.blocked).toBe(false);
    expect(memory.values.get(MIGRATION_BACKUP_KEY)).toBe(raw);
    expect(saveStoredExpedition(loaded.state, memory)).toBe(true);
    expect(memory.writes.indexOf(MIGRATION_BACKUP_KEY)).toBeLessThan(memory.writes.indexOf(SAVE_KEY));
    expect(memory.values.get(LEGACY_SAVE_KEYS[0])).toBe(raw);
  });
  it('blocks overwriting a different migration backup', () => {
    const memory = store(); memory.values.set(LEGACY_SAVE_KEYS[0], legacyRaw()); memory.values.set(MIGRATION_BACKUP_KEY, 'earlier original');
    expect(loadStoredExpedition(memory).blocked).toBe(true);
    expect(saveStoredExpedition(createInitialState(), memory)).toBe(false);
    expect(memory.values.get(MIGRATION_BACKUP_KEY)).toBe('earlier original');
  });
  it('keeps usable migrated state and original if creating the backup fails', () => {
    const memory = store(); const raw = JSON.stringify({ ...JSON.parse(legacyRaw()), ...selectVenue(createInitialState(), 'amazon'), version: 7, observations: undefined, learningAnswers: undefined, expeditionNumber: undefined, castUsedAssistance: undefined, snagApproach: undefined, learningRevisions: undefined, anglingRules: undefined, anglingBeat: undefined, rodSide: undefined }); memory.values.set(LEGACY_SAVE_KEYS[0], raw);
    const denied = { getItem: memory.getItem, setItem: () => { throw new Error('quota'); } };
    const loaded = loadStoredExpedition(denied);
    expect(loaded).toMatchObject({ blocked: true, raw }); expect(loaded.state.version).toBe(SAVE_VERSION); expect(loaded.state.stage).toBe('arrival'); expect(loaded.state.venueId).toBe('amazon');
    expect(memory.values.get(LEGACY_SAVE_KEYS[0])).toBe(raw);
    expect(saveStoredExpedition(loaded.state, denied)).toBe(false);
  });
  it('handles completely unavailable storage without throwing', () => {
    const denied = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadStoredExpedition(denied)).toMatchObject({ blocked: true });
    expect(saveStoredExpedition(createInitialState(), denied)).toBe(false);
    expect(getStoredExpeditionRaw(denied)).toBeNull(); expect(getExpeditionBackupRaw(denied)).toBeNull();
  });
  it('preserves prior save when a normal write exceeds quota', () => {
    const memory = store(); saveStoredExpedition(createInitialState(), memory); const raw = memory.values.get(SAVE_KEY);
    expect(saveStoredExpedition(selectVenue(createInitialState(), 'amazon'), { getItem: memory.getItem, setItem: () => { throw new Error('quota'); } })).toBe(false);
    expect(memory.values.get(SAVE_KEY)).toBe(raw);
  });
  it('explicit replacement preserves rejected original before installing the new state', () => {
    const memory = store(); memory.values.set(SAVE_KEY, 'recovery bytes');
    expect(replaceStoredExpedition(createInitialState(), memory)).toBe(true);
    expect(memory.values.get(REPLACEMENT_BACKUP_KEY)).toBe('recovery bytes');
    expect(parseExpedition(memory.values.get(SAVE_KEY)!).ok).toBe(true);
    expect(memory.writes).toEqual([REPLACEMENT_BACKUP_KEY, RECOVERY_POINTER_KEY, SAVE_KEY]);
  });
  it('rejects replacement if preserving the original fails', () => {
    const memory = store(); memory.values.set(SAVE_KEY, 'recovery bytes');
    expect(replaceStoredExpedition(createInitialState(), { getItem: memory.getItem, setItem: () => { throw new Error('quota'); } })).toBe(false);
    expect(memory.values.get(SAVE_KEY)).toBe('recovery bytes');
  });
  it('never writes an invalid state', () => {
    const memory = store(); expect(saveStoredExpedition({ ...createInitialState(), journalIds: null } as never, memory)).toBe(false); expect(memory.writes).toEqual([]);
  });
});

describe('conflicting journey writers', () => {
  it('lets the first empty-store writer save and stops a second writer with the same empty snapshot', () => {
    const memory = store();
    const first = selectVenue(createInitialState(), 'amazon');
    const second = selectVenue(createInitialState(), 'okavango');
    const winner = saveStoredExpeditionIfUnchanged(first, null, memory);
    expect(winner.ok).toBe(true);
    expect(saveStoredExpeditionIfUnchanged(second, null, memory)).toEqual({ ok: false, reason: 'conflict' });
    expect(loadStoredExpedition(memory).state).toEqual(first);
    expect(memory.writes).toEqual([SAVE_KEY]);
  });
  it('preserves the winner when two existing journeys loaded the same raw snapshot', () => {
    const memory = store(); saveStoredExpedition(createInitialState(), memory);
    const tabA = loadStoredExpedition(memory), tabB = loadStoredExpedition(memory);
    const stateA = selectVenue(tabA.state, 'amazon'), stateB = selectVenue(tabB.state, 'okavango');
    expect(saveStoredExpeditionIfUnchanged(stateA, tabA.raw, memory).ok).toBe(true);
    const writes = memory.writes.length;
    expect(saveStoredExpeditionIfUnchanged(stateB, tabB.raw, memory)).toEqual({ ok: false, reason: 'conflict' });
    expect(memory.writes).toHaveLength(writes);
    expect(parseExpedition(getStoredExpeditionRaw(memory)!)).toMatchObject({ ok: true, state: stateA });
    expect(stateB.venueId).toBe('okavango');
  });
  it('supports repeat writes from one tab only when it advances its own expected snapshot', () => {
    const memory = store(); const initial = selectVenue(createInitialState(), 'amazon');
    const first = saveStoredExpeditionIfUnchanged(initial, null, memory);
    expect(first.ok).toBe(true); if (!first.ok) return;
    const next = beginQuestions(initial);
    const second = saveStoredExpeditionIfUnchanged(next, first.raw, memory);
    expect(second).toEqual({ ok: true, raw: serializeExpedition(next) });
    expect(saveStoredExpeditionIfUnchanged(initial, first.raw, memory)).toEqual({ ok: false, reason: 'conflict' });
    expect(loadStoredExpedition(memory).state).toEqual(next);
  });
  it('does not generate a redundant active-save write for an unchanged journey', () => {
    const memory = store(); const initial = createInitialState();
    const saved = saveStoredExpeditionIfUnchanged(initial, null, memory);
    expect(saved.ok).toBe(true); if (!saved.ok) return;
    expect(saveStoredExpeditionIfUnchanged(initial, saved.raw, memory)).toEqual(saved);
    expect(memory.writes).toEqual([SAVE_KEY]);
  });
  it('detects an observed change during legacy-backup creation before writing the current key', () => {
    const memory = store(); const original = legacyRaw(); memory.values.set(LEGACY_SAVE_KEYS[1], original);
    const winner = serializeExpedition(selectVenue(createInitialState(), 'okavango'));
    const race = { getItem: memory.getItem, setItem: (key: string, raw: string) => {
      memory.setItem(key, raw);
      if (key === MIGRATION_BACKUP_KEY) memory.values.set(SAVE_KEY, winner);
    } };
    const migrated = parseExpedition(original); expect(migrated.ok).toBe(true); if (!migrated.ok) return;
    expect(saveStoredExpeditionIfUnchanged(migrated.state, original, race)).toEqual({ ok: false, reason: 'conflict' });
    expect(getStoredExpeditionRaw(memory)).toBe(winner);
    expect(memory.writes).toEqual([MIGRATION_BACKUP_KEY]);
    expect(memory.values.get(LEGACY_SAVE_KEYS[1])).toBe(original);
  });
  it('never reports success when another writer advances the stored bytes before verification', () => {
    const memory = store(); const winner = serializeExpedition(selectVenue(createInitialState(), 'okavango'));
    const race = { getItem: memory.getItem, setItem: (key: string, raw: string) => { memory.setItem(key, raw); if (key === SAVE_KEY) memory.values.set(key, winner); } };
    expect(saveStoredExpeditionIfUnchanged(selectVenue(createInitialState(), 'amazon'), null, race)).toEqual({ ok: false, reason: 'conflict' });
    expect(getStoredExpeditionRaw(memory)).toBe(winner);
  });
  it('requires explicit replacement and backs up the winning journey before replacing it', () => {
    const memory = store(); const winner = selectVenue(createInitialState(), 'amazon');
    const stale = loadStoredExpedition(memory); saveStoredExpedition(winner, memory);
    const replacement = selectVenue(stale.state, 'okavango'); const winnerRaw = getStoredExpeditionRaw(memory);
    expect(saveStoredExpeditionIfUnchanged(replacement, stale.raw, memory).ok).toBe(false);
    const result = replaceStoredExpeditionChecked(replacement, memory);
    expect(result).toEqual({ ok: true, raw: serializeExpedition(replacement) });
    expect(getExpeditionBackupRaw(memory)).toBe(winnerRaw);
    expect(loadStoredExpedition(memory).state).toEqual(replacement);
  });
  it('stops an explicit replacement if storage advances while the previous winner is being backed up', () => {
    const memory = store(); saveStoredExpedition(createInitialState(), memory);
    const original = getStoredExpeditionRaw(memory);
    const winner = serializeExpedition(selectVenue(createInitialState(), 'amazon'));
    const race = { getItem: memory.getItem, setItem: (key: string, raw: string) => {
      memory.setItem(key, raw); if (key === REPLACEMENT_BACKUP_KEY) memory.values.set(SAVE_KEY, winner);
    } };
    expect(replaceStoredExpeditionChecked(selectVenue(createInitialState(), 'okavango'), race)).toEqual({ ok: false, reason: 'conflict' });
    expect(getStoredExpeditionRaw(memory)).toBe(winner);
    expect(getExpeditionBackupRaw(memory)).toBe(original);
    expect(memory.writes).toEqual([SAVE_KEY, REPLACEMENT_BACKUP_KEY, RECOVERY_POINTER_KEY]);
  });
  it('does not replace malformed bytes even when the expected snapshot matches them', () => {
    const memory = store(); memory.values.set(SAVE_KEY, 'broken');
    expect(saveStoredExpeditionIfUnchanged(createInitialState(), 'broken', memory)).toEqual({ ok: false, reason: 'invalid' });
    expect(memory.values.get(SAVE_KEY)).toBe('broken'); expect(memory.writes).toEqual([]);
  });
  it('recognizes current, legacy, and clear storage events without treating preferences or backups as journey edits', () => {
    expect(isJourneyStorageKey(SAVE_KEY)).toBe(true);
    expect(isJourneyStorageKey(null)).toBe(true);
    for (const key of LEGACY_SAVE_KEYS) expect(isJourneyStorageKey(key)).toBe(true);
    for (const key of ['living-waters-large-text', MEMORY_RECOVERY_KEY, RECOVERY_POINTER_KEY, MIGRATION_BACKUP_KEY, REPLACEMENT_BACKUP_KEY]) expect(isJourneyStorageKey(key)).toBe(false);
  });
  it('keeps v8 recovery backups available after the v9 storage upgrade', () => {
    const memory = store(); memory.values.set('living-waters-before-v8', 'old migration original');
    expect(getExpeditionBackupRaw(memory)).toBe('old migration original');
    memory.values.set('living-waters-replaced-v8', 'old replacement original');
    expect(getExpeditionBackupRaw(memory)).toBe('old replacement original');
  });
  it('migrates a v8 exported envelope before its first guarded v9 save and keeps its exact original', () => {
    const memory = store();
    const envelope = JSON.parse(serializeExpedition(createInitialState()));
    envelope.version = 8; envelope.state.version = 8; delete envelope.state.snagApproach; delete envelope.state.learningRevisions; delete envelope.state.anglingRules; delete envelope.state.anglingBeat; delete envelope.state.rodSide;
    const original = JSON.stringify(envelope); memory.values.set(LEGACY_SAVE_KEYS[0], original);
    const loaded = loadStoredExpedition(memory);
    expect(loaded).toMatchObject({ blocked: false, raw: original, state: { version: SAVE_VERSION } });
    expect(memory.values.get(MIGRATION_BACKUP_KEY)).toBe(original);
    expect(saveStoredExpeditionIfUnchanged(loaded.state, loaded.raw, memory).ok).toBe(true);
    expect(memory.values.get(LEGACY_SAVE_KEYS[0])).toBe(original);
    expect(getExpeditionBackupRaw(memory)).toBe(original);
    expect(parseExpedition(getStoredExpeditionRaw(memory)!)).toMatchObject({ ok: true, migrated: false });
  });
});

describe('durable displaced-journey recovery', () => {
  it('preserves the displaced journey for a fresh reader without overwriting the stored winner', () => {
    const memory = store(); const winner = selectVenue(createInitialState(), 'amazon');
    const displaced = selectVenue(createInitialState(), 'okavango');
    saveStoredExpedition(winner, memory); const winnerRaw = getStoredExpeditionRaw(memory);
    const result = preserveExpeditionMemoryRecovery(displaced, memory);
    expect(result).toEqual({ ok: true, raw: serializeExpedition(displaced) });
    expect(getStoredExpeditionRaw(memory)).toBe(winnerRaw);
    // A new storage reader after refresh finds the displaced journey in the backup key.
    const reloadedReader = { getItem: memory.getItem, setItem: memory.setItem };
    expect(parseExpedition(getExpeditionBackupRaw(reloadedReader)!)).toMatchObject({ ok: true, state: displaced });
    expect(memory.writes).toEqual([SAVE_KEY, MEMORY_RECOVERY_KEY, RECOVERY_POINTER_KEY]);
  });
  it('prioritizes the durable displaced copy while retaining replacement and migration originals', () => {
    const memory = store(); memory.values.set(REPLACEMENT_BACKUP_KEY, 'replacement original');
    memory.values.set(MIGRATION_BACKUP_KEY, 'migration original');
    const displaced = createInitialState();
    expect(preserveExpeditionMemoryRecovery(displaced, memory).ok).toBe(true);
    expect(getExpeditionBackupRaw(memory)).toBe(serializeExpedition(displaced));
    expect(memory.values.get(REPLACEMENT_BACKUP_KEY)).toBe('replacement original');
    expect(memory.values.get(MIGRATION_BACKUP_KEY)).toBe('migration original');
  });
  it('reports quota or read-only storage failure without changing the winner or existing recovery', () => {
    const memory = store(); saveStoredExpedition(createInitialState(), memory);
    memory.values.set(MEMORY_RECOVERY_KEY, 'earlier recovery');
    const winnerRaw = getStoredExpeditionRaw(memory);
    const denied = { getItem: memory.getItem, setItem: () => { throw new Error('quota or read-only'); } };
    expect(preserveExpeditionMemoryRecovery(selectVenue(createInitialState(), 'amazon'), denied)).toEqual({ ok: false, reason: 'unavailable' });
    expect(getStoredExpeditionRaw(memory)).toBe(winnerRaw);
    expect(memory.values.get(MEMORY_RECOVERY_KEY)).toBe('earlier recovery');
    expect(memory.writes).toEqual([SAVE_KEY]);
  });
  it('refuses invalid in-memory data without touching any stored bytes', () => {
    const memory = store(); memory.values.set(SAVE_KEY, 'stored original');
    memory.values.set(MEMORY_RECOVERY_KEY, 'earlier recovery');
    expect(preserveExpeditionMemoryRecovery({ ...createInitialState(), journalIds: null } as never, memory)).toEqual({ ok: false, reason: 'invalid' });
    expect(memory.values.get(SAVE_KEY)).toBe('stored original');
    expect(memory.values.get(MEMORY_RECOVERY_KEY)).toBe('earlier recovery');
    expect(memory.writes).toEqual([]);
  });
  it('reports failure if the backup write cannot be read back exactly', () => {
    const memory = store(); memory.values.set(SAVE_KEY, 'stored original');
    const failedWrite = { getItem: memory.getItem, setItem: (key: string, raw: string) => { memory.setItem(key, raw); memory.values.set(key, 'different bytes'); } };
    expect(preserveExpeditionMemoryRecovery(createInitialState(), failedWrite)).toEqual({ ok: false, reason: 'unavailable' });
    expect(memory.values.get(SAVE_KEY)).toBe('stored original');
    expect(memory.writes).toEqual([MEMORY_RECOVERY_KEY]);
  });
  it('reuses an already verified identical recovery copy without requiring write access', () => {
    const memory = store(); const current = createInitialState(); const raw = serializeExpedition(current);
    memory.values.set(MEMORY_RECOVERY_KEY, raw);
    memory.values.set(RECOVERY_POINTER_KEY, MEMORY_RECOVERY_KEY);
    const readOnly = { getItem: memory.getItem, setItem: () => { throw new Error('read-only'); } };
    expect(preserveExpeditionMemoryRecovery(current, readOnly)).toEqual({ ok: true, raw });
    expect(memory.writes).toEqual([]);
  });
  it('exports the latest replacement after an earlier displaced-memory recovery and switches back for a later load', () => {
    const memory = store(); const earlier = createInitialState();
    expect(preserveExpeditionMemoryRecovery(earlier, memory).ok).toBe(true);
    const winner = selectVenue(createInitialState(), 'amazon'); saveStoredExpedition(winner, memory);
    expect(replaceStoredExpeditionChecked(selectVenue(createInitialState(), 'okavango'), memory).ok).toBe(true);
    expect(getExpeditionBackupRaw(memory)).toBe(serializeExpedition(winner));
    expect(memory.values.get(MEMORY_RECOVERY_KEY)).toBe(serializeExpedition(earlier));
    const later = beginQuestions(winner);
    expect(preserveExpeditionMemoryRecovery(later, memory).ok).toBe(true);
    expect(getExpeditionBackupRaw(memory)).toBe(serializeExpedition(later));
    expect(memory.values.get(REPLACEMENT_BACKUP_KEY)).toBe(serializeExpedition(winner));
  });
  it('does not permit replacement or memory adoption when recording the recovery pointer fails', () => {
    const memory = store(); const winner = createInitialState(); saveStoredExpedition(winner, memory);
    const pointerDenied = { getItem: memory.getItem, setItem: (key: string, raw: string) => {
      if (key === RECOVERY_POINTER_KEY) throw new Error('pointer quota');
      memory.setItem(key, raw);
    } };
    expect(preserveExpeditionMemoryRecovery(selectVenue(winner, 'amazon'), pointerDenied)).toEqual({ ok: false, reason: 'unavailable' });
    expect(replaceStoredExpeditionChecked(selectVenue(winner, 'okavango'), pointerDenied)).toEqual({ ok: false, reason: 'unavailable' });
    expect(getStoredExpeditionRaw(memory)).toBe(serializeExpedition(winner));
    expect(memory.writes.filter(key => key === SAVE_KEY)).toEqual([SAVE_KEY]);
  });
  it('falls back to retained recovery bytes when the latest pointer is absent or invalid', () => {
    const memory = store(); memory.values.set(REPLACEMENT_BACKUP_KEY, 'replacement original');
    expect(getExpeditionBackupRaw(memory)).toBe('replacement original');
    memory.values.set(RECOVERY_POINTER_KEY, SAVE_KEY);
    expect(getExpeditionBackupRaw(memory)).toBe('replacement original');
    memory.values.set(RECOVERY_POINTER_KEY, MEMORY_RECOVERY_KEY);
    expect(getExpeditionBackupRaw(memory)).toBe('replacement original');
  });
});
