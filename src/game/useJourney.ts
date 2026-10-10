import { useCallback, useEffect, useRef, useState } from "react";
import { SAVE_KEY, getStoredExpeditionRaw, getExpeditionBackupRaw, isJourneyStorageKey, loadStoredExpedition, preserveExpeditionMemoryRecovery, replaceStoredExpeditionChecked, saveStoredExpeditionIfUnchanged } from "./storage";
import type { ExpeditionState } from "../types";

// Cooperating tabs serialize every active-save write. Older browsers still use raw checks.
async function withJourneyLock<T>(action: () => T): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return locks ? locks.request(SAVE_KEY, action) : action();
}

export function useJourney() {
  const [loaded] = useState(loadStoredExpedition);
  const [recoveryRaw, setRecoveryRaw] = useState(() => loaded.blocked && loaded.raw !== null ? loaded.raw : getExpeditionBackupRaw() ?? loaded.raw);
  const [state, setState] = useState(loaded.state);
  const [notice, setNotice] = useState(loaded.notice);
  const [blocked, setBlocked] = useState(loaded.blocked);
  const [conflict, setConflict] = useState(false);
  const latest = useRef(state); latest.current = state;
  const savingBlocked = useRef(loaded.blocked);
  const expectedRaw = useRef(loaded.raw);
  const pending = useRef<number | null>(null);
  const clearPending = useCallback(() => {
    if (pending.current !== null) { window.clearTimeout(pending.current); pending.current = null; }
  }, []);
  const markConflict = useCallback(() => {
    clearPending(); savingBlocked.current = true; setBlocked(true); setConflict(true);
    setRecoveryRaw(current => getStoredExpeditionRaw() ?? current);
    setNotice("Another tab changed the saved journey. Automatic saving is paused; your current journey is still here. Export it before loading the latest saved journey.");
  }, [clearPending]);
  const flush = useCallback(async () => {
    clearPending();
    if (savingBlocked.current) return;
    try {
      await withJourneyLock(() => {
        if (savingBlocked.current) return;
        const result = saveStoredExpeditionIfUnchanged(latest.current, expectedRaw.current);
        if (result.ok) { expectedRaw.current = result.raw; return; }
        if (result.reason === "conflict") { markConflict(); return; }
        savingBlocked.current = true; setBlocked(true);
        setNotice("Automatic saving is paused. Your current journey is still here; export a copy from the field journal before leaving.");
      });
    } catch {
      savingBlocked.current = true; setBlocked(true);
      setNotice("Automatic saving is paused. Your current journey is still here; export a copy from the field journal before leaving.");
    }
  }, [clearPending, markConflict]);
  // Timed updates are coalesced. Exit requests keep the lock and are best effort on teardown.
  useEffect(() => { if (!savingBlocked.current && pending.current === null) pending.current = window.setTimeout(() => { void flush(); }, 1000); }, [state, flush]);
  // A deliberate untimed window is a player decision, not a timed animation
  // tick. Request its guarded write immediately while keeping timed updates
  // coalesced; a quick pause/reload should not return to the previous window.
  useEffect(() => { void flush(); }, [state.stage, state.venueId, state.debriefChoice, state.snagApproach, state.lineResolved, state.assistMode, state.anglingRules, state.assistMode ? state.lineTurn : null, state.learningAnswers, state.learningRevisions, flush]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!isJourneyStorageKey(event.key)) return;
      try { if (event.storageArea && event.storageArea !== localStorage) return; } catch { return; }
      if (getStoredExpeditionRaw() !== expectedRaw.current) markConflict();
    };
    window.addEventListener("storage", onStorage);
    // Also catch a write that happened between initial loading and listener registration.
    if (getStoredExpeditionRaw() !== expectedRaw.current) markConflict();
    return () => window.removeEventListener("storage", onStorage);
  }, [markConflict]);
  useEffect(() => {
    const exit = () => { void flush(); };
    const hide = () => { if (document.hidden) exit(); };
    window.addEventListener("pagehide", exit); document.addEventListener("visibilitychange", hide);
    return () => { window.removeEventListener("pagehide", exit); document.removeEventListener("visibilitychange", hide); exit(); };
  }, [flush]);
  const importJourney = useCallback(async (next: ExpeditionState, message = "") => {
    clearPending(); savingBlocked.current = true; setBlocked(true); latest.current = next; setState(next);
    setNotice("Restoring the journey; automatic saving is paused until its recovery copy is preserved.");
    try {
      const result = await withJourneyLock(() => replaceStoredExpeditionChecked(next));
      setRecoveryRaw(result.ok ? getExpeditionBackupRaw() ?? loaded.raw : getStoredExpeditionRaw() ?? loaded.raw);
      if (result.ok) {
        if (getStoredExpeditionRaw() !== result.raw) { markConflict(); return false; }
        expectedRaw.current = result.raw; savingBlocked.current = false; setBlocked(false); setConflict(false);
        // A setting may have changed while replacement waited for the lock.
        void flush();
        setNotice(`Journey restored. ${message}`); return true;
      }
      if (result.reason === "conflict") { markConflict(); return false; }
    } catch { /* Preserve the imported in-memory journey and the stored original. */ }
    setNotice("Journey loaded in memory. Browser storage could not be updated; export your journey before leaving. The previous stored data is preserved.");
    return false;
  }, [clearPending, flush, loaded.raw, markConflict]);
  const reloadLatestJourney = useCallback(() => {
    clearPending();
    const next = loadStoredExpedition();
    if (next.blocked) { setNotice(next.notice); savingBlocked.current = true; setBlocked(true); return false; }
    if (next.raw === null) {
      savingBlocked.current = true; setBlocked(true); setConflict(true);
      setNotice("No saved journey is available to load. Your current journey is still here; export it before leaving or explicitly restore a saved file.");
      return false;
    }
    if (getStoredExpeditionRaw() !== next.raw) { markConflict(); return false; }
    const preserved = preserveExpeditionMemoryRecovery(latest.current);
    if (!preserved.ok) {
      savingBlocked.current = true; setBlocked(true);
      setNotice("The current journey could not be preserved in browser storage. Your current journey is still here; export it before loading the latest saved journey.");
      return false;
    }
    setRecoveryRaw(preserved.raw);
    if (getStoredExpeditionRaw() !== next.raw) { markConflict(); return false; }
    expectedRaw.current = next.raw; latest.current = next.state; savingBlocked.current = false;
    setState(next.state); setBlocked(false); setConflict(false);
    setNotice(`Latest saved journey loaded. Your previous in-memory journey is preserved in browser storage and available as a recovery export. ${next.notice}`);
    return true;
  }, [clearPending, markConflict]);
  return { state, setState, notice, blocked, conflict, recoveryRaw, importJourney, reloadLatestJourney };
}
