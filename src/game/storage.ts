import { createInitialState } from './engine';
import { parseExpedition, serializeExpedition } from './save';
import type { ExpeditionState } from '../types';

export const SAVE_KEY = 'living-waters-save-v8';
export const MIGRATION_BACKUP_KEY = 'living-waters-before-v8';
export const REPLACEMENT_BACKUP_KEY = 'living-waters-replaced-v8';
export const LEGACY_SAVE_KEYS = ['living-waters-save-v7', 'living-waters-save-v6', 'living-waters-save-v5', 'living-waters-save-v4', 'living-waters-save-v3', 'living-waters-save-v2', 'living-waters-save-v1', 'living-waters-amazon-v1'];
export interface SaveStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface StoredExpedition { state: ExpeditionState; notice: string; blocked: boolean; raw: string | null }
const storage = (provided?: SaveStorage): SaveStorage => provided ?? globalThis.localStorage;
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

export function saveStoredExpedition(state: ExpeditionState, provided?: SaveStorage): boolean {
  try {
    const raw = serializeExpedition(state); const store = storage(provided); const saved = findRaw(store);
    if (saved) {
      const current = parseExpedition(saved.raw);
      if (!current.ok || (current.migrated && !preserveMigration(store, saved.raw))) return false;
    }
    store.setItem(SAVE_KEY, raw);
    return true;
  } catch { return false; }
}

/** Call only after the player confirms replacement; keep the previous raw record first. */
export function replaceStoredExpedition(state: ExpeditionState, provided?: SaveStorage): boolean {
  try {
    const raw = serializeExpedition(state); const store = storage(provided); const saved = findRaw(store);
    if (saved && saved.raw !== raw) {
      store.setItem(REPLACEMENT_BACKUP_KEY, saved.raw);
      if (store.getItem(REPLACEMENT_BACKUP_KEY) !== saved.raw) return false;
    }
    store.setItem(SAVE_KEY, raw);
    return true;
  } catch { return false; }
}

export function getStoredExpeditionRaw(provided?: SaveStorage): string | null {
  try { return findRaw(storage(provided))?.raw ?? null; } catch { return null; }
}
export function getExpeditionBackupRaw(provided?: SaveStorage): string | null {
  try { const store = storage(provided); return store.getItem(REPLACEMENT_BACKUP_KEY) ?? store.getItem(MIGRATION_BACKUP_KEY); } catch { return null; }
}
