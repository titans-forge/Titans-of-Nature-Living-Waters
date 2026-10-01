import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ExpeditionState } from "../types";

const Preferences = createContext({ large: false, setLarge: (_large: boolean) => {}, sound: false, toggleSound: async () => {} });

export function FieldPreferences({ children }: { children: React.ReactNode }) {
  const [large, setLarge] = useState(() => { try { return localStorage.getItem("living-waters-large-text") === "true"; } catch { return false; } });
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => { document.documentElement.classList.toggle("large-text", large); try { localStorage.setItem("living-waters-large-text", String(large)); } catch { /* Reading support still works in memory. */ } }, [large]);
  useEffect(() => () => { void audio.current?.close(); }, []);
  const toggleSound = async () => {
    if (sound) { await audio.current?.suspend(); setSound(false); return; }
    try {
      if (!audio.current) {
        const context = new AudioContext(); audio.current = context;
        const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
        const samples = buffer.getChannelData(0); let previous = 0;
        for (let i = 0; i < samples.length; i++) { previous = (previous + (Math.random()*2-1)*.025)/1.025; samples[i] = previous; }
        const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
        const lowPass = context.createBiquadFilter(); lowPass.type = "lowpass"; lowPass.frequency.value = 700;
        const gain = context.createGain(); gain.gain.value = .13;
        source.connect(lowPass); lowPass.connect(gain); gain.connect(context.destination); source.start();
      }
      await audio.current.resume(); setSound(true);
    } catch { setSound(false); }
  };
  return <Preferences.Provider value={{ large, setLarge, sound, toggleSound }}>{children}</Preferences.Provider>;
}

export function FieldSettings({ state, setState }: { state: ExpeditionState; setState: React.Dispatch<React.SetStateAction<ExpeditionState>> }) {
  const { large, setLarge, sound, toggleSound } = useContext(Preferences);
  return <section className="field-settings"><h3>Make the field comfortable</h3><button aria-pressed={state.assistMode} onClick={() => setState((current) => ({ ...current, assistMode: !current.assistMode }))}>Untimed controls: {state.assistMode ? "on" : "off"}</button><p>Untimed mode advances one safe phase at a time. The journal records assistance separately; it never reduces access to a destination.</p><button aria-pressed={large} onClick={() => setLarge(!large)}>Larger reading text: {large ? "on" : "off"}</button><button aria-pressed={sound} onClick={() => void toggleSound()}>Quiet water ambience: {sound ? "on" : "off"}</button><small>Synthesized water texture. No instructions rely on sound. Sound starts only when you enable it.</small></section>;
}
