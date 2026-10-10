import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  advanceInteractionAudio, createInteractionAudioTrace, createInteractionSoundPlayer,
  type InteractionSoundEvent, type InteractionSoundPlayer,
} from '../game/interactionAudio';
import type { ExpeditionState } from '../types';

const InteractionAudioContext = createContext({
  enabled: false, pending: false, unavailable: false,
  toggle: async () => {}, play: (_event: InteractionSoundEvent) => {}, stop: () => {},
});

/** Separate session-only preference from the existing continuous ambience.
 * It is deliberately off on load and never stored in a journey or localStorage. */
export function InteractionAudioProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const player = useRef<InteractionSoundPlayer | null>(null);
  const toggling = useRef(false);
  const enabledRef = useRef(false);
  useEffect(() => () => { enabledRef.current = false; void player.current?.dispose(); player.current = null; }, []);
  const toggle = useCallback(async () => {
    if (toggling.current) return;
    toggling.current = true; setPending(true);
    if (!player.current) player.current = createInteractionSoundPlayer();
    try {
      if (enabledRef.current) {
        enabledRef.current = false; setEnabled(false); await player.current.deactivate();
      } else {
        const active = await player.current.activate();
        enabledRef.current = active; setEnabled(active); setUnavailable(!active);
      }
    } finally { toggling.current = false; setPending(false); }
  }, []);
  const play = useCallback((event: InteractionSoundEvent) => player.current?.play(event), []);
  const stop = useCallback(() => player.current?.stop(), []);
  return <InteractionAudioContext.Provider value={{ enabled, pending, unavailable, toggle, play, stop }}>{children}</InteractionAudioContext.Provider>;
}

export function useInteractionAudio() { return useContext(InteractionAudioContext); }

/** Keep mounted across expedition stages. Increment resetKey before either
 * importJourney or reloadLatestJourney; restored states must be silent. */
export function InteractionAudio({ state, paused, resetKey }: {
  state: ExpeditionState; paused: boolean; resetKey: number;
}) {
  const { enabled, play, stop } = useInteractionAudio();
  const trace = useRef(createInteractionAudioTrace());
  useEffect(() => {
    if (!enabled || paused || resetKey !== trace.current.resetKey) stop();
    const next = advanceInteractionAudio(trace.current, { state, enabled, paused, resetKey, now: performance.now() });
    trace.current = next.trace;
    for (const event of next.events) play(event);
  }, [state, enabled, paused, resetKey, play, stop]);
  useEffect(() => () => stop(), [stop]);
  return null;
}
