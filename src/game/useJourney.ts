import { useCallback, useEffect, useRef, useState } from "react";
import { getStoredExpeditionRaw, getExpeditionBackupRaw, loadStoredExpedition, replaceStoredExpedition, saveStoredExpedition } from "./storage";
import type { ExpeditionState } from "../types";

export function useJourney() {
  const [loaded] = useState(loadStoredExpedition);
  const [recoveryRaw, setRecoveryRaw] = useState(() => loaded.blocked && loaded.raw !== null ? loaded.raw : getExpeditionBackupRaw() ?? loaded.raw);
  const [state, setState] = useState(loaded.state);
  const [notice, setNotice] = useState(loaded.notice);
  const [blocked, setBlocked] = useState(loaded.blocked);
  const latest = useRef(state); latest.current = state;
  const savingBlocked = useRef(blocked); savingBlocked.current = blocked;
  const pending = useRef<number | null>(null);
  const flush = useCallback(() => {
    if (pending.current !== null) { window.clearTimeout(pending.current); pending.current = null; }
    if (savingBlocked.current) return;
    if (!saveStoredExpedition(latest.current)) {
      savingBlocked.current = true; setBlocked(true);
      setNotice("Automatic saving is paused. Your current journey is still here; export a copy from the field journal before leaving.");
    }
  }, []);
  // Timed updates are coalesced, while stage changes and page exit flush promptly.
  useEffect(() => { if (!savingBlocked.current && pending.current === null) pending.current = window.setTimeout(flush, 1000); }, [state, flush]);
  useEffect(flush, [state.stage, state.venueId, state.debriefChoice, flush]);
  useEffect(() => {
    const hide = () => { if (document.hidden) flush(); };
    window.addEventListener("pagehide", flush); document.addEventListener("visibilitychange", hide);
    return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", hide); flush(); };
  }, [flush]);
  const importJourney = useCallback((next: ExpeditionState, message = "") => {
    const saved = replaceStoredExpedition(next);
    setRecoveryRaw(saved ? getExpeditionBackupRaw() ?? loaded.raw : getStoredExpeditionRaw() ?? loaded.raw);
    savingBlocked.current = !saved; setBlocked(!saved); setState(next);
    setNotice(saved ? `Journey restored. ${message}` : "Journey loaded in memory. Browser storage could not be updated; export your journey before leaving. The previous stored data is preserved.");
  }, [loaded.raw]);
  return { state, setState, notice, blocked, recoveryRaw, importJourney };
}
