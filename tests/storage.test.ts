import { describe, expect, it } from 'vitest';
import { createInitialState, selectVenue } from '../src/game/engine';
import { parseExpedition } from '../src/game/save';
import { LEGACY_SAVE_KEYS, MIGRATION_BACKUP_KEY, REPLACEMENT_BACKUP_KEY, SAVE_KEY, getExpeditionBackupRaw, getStoredExpeditionRaw, loadStoredExpedition, replaceStoredExpedition, saveStoredExpedition } from '../src/game/storage';
function store() {
  const values = new Map<string, string>(); const writes: string[] = [];
  return { values, writes, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); } };
}
function legacyRaw() {
  const value = { ...createInitialState(), version: 7 } as Record<string, unknown>;
  for (const key of ['observations', 'learningAnswers', 'expeditionNumber', 'castUsedAssistance']) delete value[key];
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
    const memory = store(); const raw = JSON.stringify({ ...JSON.parse(legacyRaw()), ...selectVenue(createInitialState(), 'amazon'), version: 7, observations: undefined, learningAnswers: undefined, expeditionNumber: undefined, castUsedAssistance: undefined }); memory.values.set(LEGACY_SAVE_KEYS[0], raw);
    const denied = { getItem: memory.getItem, setItem: () => { throw new Error('quota'); } };
    const loaded = loadStoredExpedition(denied);
    expect(loaded).toMatchObject({ blocked: true, raw }); expect(loaded.state.version).toBe(8); expect(loaded.state.stage).toBe('arrival'); expect(loaded.state.venueId).toBe('amazon');
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
    expect(memory.writes).toEqual([REPLACEMENT_BACKUP_KEY, SAVE_KEY]);
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
