import { createInitialState } from './engine';
import { parseExpedition, serializeExpedition } from './save';
import type { ExpeditionState } from '../types';

export const SAVE_KEY = 'living-waters-save-v12';
export const MIGRATION_BACKUP_KEY = 'living-waters-before-v12';
export const REPLACEMENT_BACKUP_KEY = 'living-waters-replaced-v12';
export const MEMORY_RECOVERY_KEY = 'living-waters-memory-recovery-v12';
export const RECOVERY_POINTER_KEY = 'living-waters-latest-recovery-v12';
export const LEGACY_SAVE_KEYS = ['living-waters-save-v11', 'living-waters-save-v10', 'living-waters-save-v9', 'living-waters-save-v8', 'living-waters-save-v7', 'living-waters-save-v6', 'living-waters-save-v5', 'living-waters-save-v4', 'living-waters-save-v3', 'living-waters-save-v2', 'living-waters-save-v1', 'living-waters-amazon-v1'];
export interface SaveStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface StoredExpedition { state: ExpeditionState; notice: string; blocked: boolean; raw: string | null }
export type ExpeditionWriteResult = { ok: true; raw: string } | { ok: false; reason: 'conflict' | 'invalid' | 'unavailable' };
const storage = (provided?: SaveStorage): SaveStorage => provided ?? globalThis.localStorage;
export const isJourneyStorageKey = (key: string | null) => key === null || key === SAVE_KEY || LEGACY_SAVE_KEYS.includes(key);
function findRaw(store: SaveStorage): { key: string; raw: string } | null {
  for (const key of [SAVE_KEY, ...LEGACY_SAVE_KEYS]) {
    const raw = store.getItem(key);
    if (raw !== null) return { key, raw };
  }
  return null;
}
function preserveMigration(store: SaveStorage, raw: string): boolean {
  const existing = store.getItem(MIGRATION_BACKUP_KEY);
  if (existing !== null && existing !== raw) return false;
  if (existing === null) store.setItem(MIGRATION_BACKUP_KEY, raw);
  return store.getItem(MIGRATION_BACKUP_KEY) === raw;
}

function preserveRecovery(store: SaveStorage, key: string, raw: string): boolean {
  if (store.getItem(key) !== raw) store.setItem(key, raw);
  if (store.getItem(key) !== raw) return false;
  if (store.getItem(RECOVERY_POINTER_KEY) !== key) store.setItem(RECOVERY_POINTER_KEY, key);
  return store.getItem(RECOVERY_POINTER_KEY) === key && store.getItem(key) === raw;
}

export function loadStoredExpedition(provided?: SaveStorage): StoredExpedition {
  let raw: string | null = null;
  try {
    const store = storage(provided); const saved = findRaw(store);
    if (!saved) return { state: createInitialState(), notice: '', blocked: false, raw: null };
    raw = saved.raw;
    const parsed = parseExpedition(raw);
    if (!parsed.ok) return { state: createInitialState(), notice: `${parsed.error} The stored original is preserved; automatic saving is paused until you recover or explicitly replace it.`, blocked: true, raw };
    if (parsed.migrated) {
      let preserved = false;
      try { preserved = preserveMigration(store, raw); } catch { /* Keep the readable journey in memory when backup storage fails. */ }
      if (!preserved) return { state: parsed.state, notice: 'The older journey was read, but its recovery backup could not be preserved. Automatic saving is paused. Export the journey or original before replacing it.', blocked: true, raw };
    }
    return { state: parsed.state, notice: parsed.warnings.join(' '), blocked: false, raw };
  } catch {
    return { state: createInitialState(), notice: 'Browser storage is unavailable. You can play in memory and export your journey; automatic saving is paused.', blocked: true, raw };
  }
}

/** Autosave callers must retain their own last-read/last-written raw snapshot. */
export function saveStoredExpeditionIfUnchanged(state: ExpeditionState, expectedRaw: string | null, provided?: SaveStorage): ExpeditionWriteResult {
  let raw: string;
  try { raw = serializeExpedition(state); } catch { return { ok: false, reason: 'invalid' }; }
  try {
    const store = storage(provided); const saved = findRaw(store);
    if ((saved?.raw ?? null) !== expectedRaw) return { ok: false, reason: 'conflict' };
    if (saved) {
      const current = parseExpedition(saved.raw);
      if (!current.ok || (current.migrated && !preserveMigration(store, saved.raw))) return { ok: false, reason: 'invalid' };
    }
    // Backup operations or another writer may have advanced storage since the first read.
    if ((findRaw(store)?.raw ?? null) !== expectedRaw) return { ok: false, reason: 'conflict' };
    if (raw === expectedRaw) return { ok: true, raw };
    store.setItem(SAVE_KEY, raw);
    if (findRaw(store)?.raw !== raw) return { ok: false, reason: 'conflict' };
    return { ok: true, raw };
  } catch { return { ok: false, reason: 'unavailable' }; }
}

/** Compatibility helper for direct callers. Production autosave uses the guarded API above. */
export function saveStoredExpedition(state: ExpeditionState, provided?: SaveStorage): boolean {
  try {
    const store = storage(provided);
    return saveStoredExpeditionIfUnchanged(state, findRaw(store)?.raw ?? null, store).ok;
  } catch { return false; }
}

/** Call only after the player confirms replacement; keep the previous raw record first. */
export function replaceStoredExpeditionChecked(state: ExpeditionState, provided?: SaveStorage): ExpeditionWriteResult {
  let raw: string;
  try { raw = serializeExpedition(state); } catch { return { ok: false, reason: 'invalid' }; }
  try {
    const store = storage(provided); const saved = findRaw(store);
    if (saved && saved.raw !== raw) {
      if (!preserveRecovery(store, REPLACEMENT_BACKUP_KEY, saved.raw)) return { ok: false, reason: 'unavailable' };
    }
    if ((findRaw(store)?.raw ?? null) !== (saved?.raw ?? null)) return { ok: false, reason: 'conflict' };
    store.setItem(SAVE_KEY, raw);
    if (findRaw(store)?.raw !== raw) return { ok: false, reason: 'conflict' };
    return { ok: true, raw };
  } catch { return { ok: false, reason: 'unavailable' }; }
}

export function replaceStoredExpedition(state: ExpeditionState, provided?: SaveStorage): boolean {
  return replaceStoredExpeditionChecked(state, provided).ok;
}

export function getStoredExpeditionRaw(provided?: SaveStorage): string | null {
  try { return findRaw(storage(provided))?.raw ?? null; } catch { return null; }
}

/** Preserve the journey being displaced by an explicit load before changing memory. */
export function preserveExpeditionMemoryRecovery(state: ExpeditionState, provided?: SaveStorage): ExpeditionWriteResult {
  let raw: string;
  try { raw = serializeExpedition(state); } catch { return { ok: false, reason: 'invalid' }; }
  try {
    const store = storage(provided);
    if (!preserveRecovery(store, MEMORY_RECOVERY_KEY, raw)) return { ok: false, reason: 'unavailable' };
    return { ok: true, raw };
  } catch { return { ok: false, reason: 'unavailable' }; }
}

export function getExpeditionBackupRaw(provided?: SaveStorage): string | null {
  try {
    const store = storage(provided); const latestKey = store.getItem(RECOVERY_POINTER_KEY);
    const latest = latestKey === MEMORY_RECOVERY_KEY || latestKey === REPLACEMENT_BACKUP_KEY ? store.getItem(latestKey) : null;
    // Honor each older version's own pointer before its fallback copies.
    const previousCopies = [11, 10, 9].flatMap(version => {
      const memory = `living-waters-memory-recovery-v${version}`;
      const replaced = `living-waters-replaced-v${version}`;
      const pointer = store.getItem(`living-waters-latest-recovery-v${version}`);
      const pointed = pointer === memory || pointer === replaced ? store.getItem(pointer) : null;
      return [pointed, store.getItem(memory), store.getItem(replaced), store.getItem(`living-waters-before-v${version}`)];
    });
    return [latest, store.getItem(MEMORY_RECOVERY_KEY), store.getItem(REPLACEMENT_BACKUP_KEY), store.getItem(MIGRATION_BACKUP_KEY), ...previousCopies, store.getItem('living-waters-replaced-v8'), store.getItem('living-waters-before-v8')].find(raw => raw !== null) ?? null;
  } catch { return null; }
}
