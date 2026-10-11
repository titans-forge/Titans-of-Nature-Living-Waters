import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Gauge, RotateCcw } from "lucide-react";
import { FishingScene } from "./FishingScene";
import { CastPlacement, supportsSchematicCastPlacement } from "./CastPlacement";
import { ControlCoach } from "./ControlCoach";
import { beginCoachingWatch, observeControlProgress } from "../game/controlCoaching";
import {
  advanceAssistedInteraction, advanceInteraction, castLine, FISHING_TICK_MS,
  chooseSnagApproach, getCastTargetWidth, getCurrentEncounter, getFightProfile, getInteractionCue,
  getIdealCastPower, getObservationCapacityReason, getPressureFeedback, hasLostFish,
  MAX_CAST_ATTEMPTS, revealEncounter, retryFish,
  setRodSide,
} from "../game/engine";
import { getGearMethod, getInteractionKind, hasEarlierCompletedEncounter, needsSnagApproach } from "../game/interactions";
import { getInteractionPresentation, getSetupPresentation } from "../game/interactionPresentation";
import { getAnglingCue, getAnglingWindow } from "../game/angling";
import { getSkillFishingCue } from "../game/skillFishing";
import type { ExpeditionState, Venue } from "../types";

const quality = (mistakes: number) => mistakes <= 2 ? "Clean" : mistakes <= 6 ? "Sound" : "Developing";
const placement = (accuracy: number) => accuracy >= 70 ? "Accurate · calmer opening pressure" : accuracy >= 40 ? "Workable · standard opening pressure" : "Wide · higher opening pressure";

export function CastGame({ state, venue, setState, paused, layoutNotice }: {
  state: ExpeditionState; venue: Venue;
  setState: React.Dispatch<React.SetStateAction<ExpeditionState>>; paused: boolean; layoutNotice: string;
}) {
  const [power, setPower] = useState(() => state.assistMode && !state.encounterId ? getIdealCastPower(state) : 18);
  const direction = useRef(1);
  const placementPaused = useRef(paused); placementPaused.current = paused;
  const [engaged, setEngaged] = useState(false);
  const engagedRef = useRef(false);
  const activePointer = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [coachingOpen, setCoachingOpen] = useState(false);
  const [coachingUsed, setCoachingUsed] = useState(false);
  const coachingWatch = useRef(beginCoachingWatch(state));
  const shell = useRef<HTMLElement>(null);
  const control = useRef<HTMLButtonElement>(null);
  const method = getGearMethod(state, venue);
  const setup = getSetupPresentation(method);
  const kind = getInteractionKind(state, venue);
  const skillCue = getSkillFishingCue(state, venue);
  const presentation = getInteractionPresentation(kind);
  const earlierCompleted = hasEarlierCompletedEncounter(state, venue);
  const approachNeeded = Boolean(state.encounterId && needsSnagApproach(state, venue));
  const ideal = getIdealCastPower(state);
  const width = getCastTargetWidth(state);
  const placementPilot = supportsSchematicCastPlacement(state, venue);
  const lost = hasLostFish(state);
  const battleBlocked = useRef(true);
  battleBlocked.current = paused || coachingOpen || approachNeeded || !ready || !state.encounterId || state.lineResolved || lost || state.assistMode;
  const capacityReason = useMemo(() => getObservationCapacityReason(state), [state.observations, state.learningAnswers, state.learningRevisions, state.expeditionNumber, state.venueId, state.gearId, state.zoneId, state.castAttempts]);
  useEffect(() => { engagedRef.current = engaged; }, [engaged]);
  useEffect(() => {
    if (paused || state.encounterId || state.assistMode) return;
    const timer = window.setInterval(() => setPower(current => {
      if (placementPaused.current) return current;
      if (current >= 96) direction.current = -1;
      if (current <= 8) direction.current = 1;
      return Math.max(8, Math.min(96, current + direction.current * 2));
    }), 42);
    return () => window.clearInterval(timer);
  }, [paused, state.encounterId, state.assistMode]);
  useEffect(() => { if (state.assistMode && !state.encounterId) setPower(ideal); }, [ideal, state.assistMode, state.encounterId]);
  // A new encounter waits for explicit readiness; reading never costs progress.
  useEffect(() => { setReady(false); engagedRef.current = false; activePointer.current = null; setEngaged(false); }, [state.encounterId, state.castAttempts, state.assistMode]);
  useEffect(() => {
    setCoachingOpen(false); setCoachingUsed(false); coachingWatch.current = beginCoachingWatch(state);
  }, [state.expeditionNumber, state.encounterId, state.castAttempts]);
  useEffect(() => {
    if (state.assistMode) setCoachingOpen(false);
    if (paused || !ready || coachingOpen || coachingUsed || approachNeeded || !state.encounterId || state.lineResolved || lost || state.assistMode) {
      coachingWatch.current = beginCoachingWatch(state); return;
    }
    const observation = observeControlProgress(coachingWatch.current, state);
    coachingWatch.current = observation.watch;
    if (observation.offer) {
      engagedRef.current = false; activePointer.current = null; setEngaged(false);
      setCoachingUsed(true); setCoachingOpen(true);
    }
  }, [state.lineTurn, state.interactionProgress, state.interactionMistakes, state.assistMode, paused, ready, coachingOpen, coachingUsed, approachNeeded, lost, state.lineResolved]);
  useEffect(() => {
    if (paused || coachingOpen || approachNeeded || !ready || !state.encounterId || state.lineResolved || lost || state.assistMode) return;
    const timer = window.setInterval(() => setState(current => battleBlocked.current || current.encounterId !== state.encounterId || current.castAttempts !== state.castAttempts ? current : advanceInteraction(current, engagedRef.current)), FISHING_TICK_MS);
    return () => window.clearInterval(timer);
  }, [paused, coachingOpen, approachNeeded, ready, lost, setState, state.assistMode, state.encounterId, state.castAttempts, state.lineResolved]);
  useEffect(() => { if (paused || state.lineResolved || lost) { activePointer.current = null; engagedRef.current = false; setEngaged(false); } }, [paused, state.lineResolved, lost]);
  useLayoutEffect(() => { if (ready && !paused && !coachingOpen && !state.assistMode) control.current?.focus({ preventScroll: true }); }, [ready, paused, coachingOpen, state.assistMode]);
  // Rod side is a latched choice, not a second held control. The same input
  // works while the Reel button is focused and cannot operate a paused fight.
  useEffect(() => {
    if (!skillCue?.needsRodSide || !ready || paused || coachingOpen || lost || state.lineResolved || state.assistMode) return;
    const steer = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target;
      if (!(target instanceof HTMLElement) || !shell.current?.contains(target) || target.matches("input, textarea, select, [contenteditable=true]")) return;
      event.preventDefault();
      setState(current => setRodSide(current, event.key === "ArrowLeft" ? "left" : "right"));
    };
    window.addEventListener("keydown", steer);
    return () => window.removeEventListener("keydown", steer);
  }, [skillCue?.needsRodSide, ready, paused, coachingOpen, lost, state.lineResolved, state.assistMode, setState]);
  // Fit below the actual header/tools, including wrapped recovery notices. Only
  // the reading area scrolls; the live action stays outside it on every screen.
  useLayoutEffect(() => {
    if (!state.encounterId || !shell.current) return;
    const measure = () => {
      const element = shell.current;
      if (!element) return;
      const track = document.querySelector<HTMLElement>(".stage-track");
      const bottomTrack = track && getComputedStyle(track).position === "fixed" ? track.getBoundingClientRect().height : 0;
      // A floor greater than the remaining viewport clipped the action in
      // landscape. CSS allows ordinary scrolling if even the compact shell
      // cannot fit its readable minimum; never hide a live control.
      const available = Math.max(0, window.innerHeight - element.getBoundingClientRect().top - bottomTrack);
      element.style.setProperty("--interaction-height", `${available}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    document.querySelectorAll(".topbar, .expedition-tools, .save-notice").forEach(element => observer.observe(element));
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [state.encounterId, state.lineResolved, paused, layoutNotice]);

  if (!state.encounterId) return <section className="cast-game cast-game--power" style={{ backgroundImage: `url(${venue.habitatImage})` }}>
    <div className={`cast-console cast-console--simple ${placementPilot ? "cast-console--placement-pilot" : ""}`}>
      <small>{setup.placement} · attempt {state.castAttempts + 1} of {MAX_CAST_ATTEMPTS}</small>
      <h1>{setup.title}</h1>
      <p>{placementPilot ? state.assistMode ? "Choose a distance with the slider, or use the guide placement. Confirm when ready." : "Confirm when the moving distance marker crosses the gold habitat band. A near placement still works." : state.assistMode ? "Untimed controls place the marker inside the habitat band. Confirm when ready." : "Press once when the moving marker crosses the gold habitat band. A near placement still works."}</p>
      {placementPilot ? <CastPlacement state={state} venue={venue} power={power} ideal={ideal} width={width} onPowerChange={setPower} disabled={paused || Boolean(capacityReason)}
        confirmation={<><button className="placement-lock" disabled={paused || Boolean(capacityReason)} onClick={() => setState(current => castLine({ ...current, stage: "habitat" }, power))}><Gauge /><span>CONFIRM CAST</span></button>{capacityReason && <p role="status">{capacityReason}</p>}</>} /> : <><div className={`placement-meter ${state.assistMode ? "placement-meter--steady" : ""}`} aria-label={`${state.assistMode ? "Steady" : "Moving"} placement marker and target band`}>
        <span className="placement-target" style={{ left: `${Math.max(0, Math.min(100 - width, ideal - width / 2))}%`, width: `${width}%` }} /><i style={{ left: `${power}%` }} />
      </div>
      <div className="power-labels"><span>Near</span><span>Far</span></div></>}
      {!placementPilot && <>{capacityReason && <p role="status">{capacityReason}</p>}
      <button className="placement-lock" disabled={paused || Boolean(capacityReason)} onClick={() => setState(current => castLine({ ...current, stage: "habitat" }, power))}>
        <Gauge /><span>{placementPilot || method === "angling" && state.assistMode ? "CONFIRM CAST" : setup.action}</span>
      </button></>}
      <small className="cast-help">Good advice and the guide’s kit widen your target. Precise placement gives you a calmer opening.</small>
      <div className="fishing-mode" aria-label="Fishing controls">
        <button aria-pressed={!state.assistMode} onClick={() => setState(current => ({ ...current, assistMode: false }))}>Timed controls · read the cue, hold and release</button>
        <button aria-pressed={state.assistMode} onClick={() => setState(current => ({ ...current, assistMode: true }))}>Untimed assistance · advance at your pace</button>
      </div>
    </div>
  </section>;

  const encounter = getCurrentEncounter(state)!;
  const legacyAnglingWindow = getAnglingWindow(state, venue);
  const anglingWindow = skillCue ?? legacyAnglingWindow;
  const waiting = anglingWindow ? !anglingWindow.engage : state.fightPhase === "run";
  const profile = getFightProfile(state);
  const pressure = getPressureFeedback(state);
  const cue = skillCue ? `Next behavior: ${skillCue.next.label}. Keep watching pressure beside the reel.`
    : legacyAnglingWindow ? getAnglingCue(legacyAnglingWindow) : getInteractionCue(state);
  const phaseIndex = waiting ? 0 : 1;
  const instruction = lost ? "The line broke" : state.lineResolved ? encounter.name : approachNeeded ? "Read the snag" : !ready && !state.assistMode ? "Ready when you are" : skillCue?.actionLabel ?? anglingWindow?.instruction ?? presentation.instructions[phaseIndex];
  const progressLabel = earlierCompleted ? "Earlier interaction" : presentation.progress;
  const displayedProgress = state.lineResolved ? 100 : Math.min(99, Math.round(state.interactionProgress));
  const ticks = anglingWindow?.remaining ?? (waiting ? profile.runTicks : profile.restTicks) - state.phaseProgress;
  const controlLabel = skillCue ? "REEL LINE" : waiting ? "RELEASE THE CONTROL" : anglingWindow ? anglingWindow.id === "cover" ? "HOLD TO GUIDE" : "HOLD TO RECOVER" : presentation.control;
  const release = () => { activePointer.current = null; engagedRef.current = false; setEngaged(false); };
  const engage = () => { if (!paused && ready && !lost && !state.lineResolved) { engagedRef.current = true; setEngaged(true); } };
  const live = (ready || state.assistMode) && !coachingOpen && !lost && !state.lineResolved && !approachNeeded;
  const inputFeedback = skillCue ? engaged ? waiting ? "Let go now · give line while the fish surges or turns" : "Reeling · release before pressure rises too far" : "Released · pressure easing" : waiting ? engaged ? "Let go now" : "Released · no press needed" : engaged ? "Holding · keep holding" : "Press and keep holding";
  const pressureReadout = <div className={`tension-readout ${state.lineTension > pressure.safeMax ? "tension-readout--danger" : ""}`}><span>{presentation.metric} · controlled {pressure.safeMin}–{pressure.safeMax}</span><i role="meter" aria-label={presentation.metric} aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.lineTension}><em style={{ left: `${pressure.safeMin}%`, width: `${pressure.safeMax - pressure.safeMin}%` }} /><b style={{ width: `${state.lineTension}%` }} /></i><strong>{Math.round(state.lineTension)} · {pressure.label}</strong></div>;
  return <section ref={shell} className={`cast-game cast-game--interaction ${skillCue ? "cast-game--skill-fight" : ""} ${state.lineResolved ? "cast-game--complete" : ""}`}>
    <FishingScene state={state} venue={venue} paused={paused || coachingOpen} ready={ready || state.assistMode} engaged={engaged && ready && !paused && !coachingOpen && !state.assistMode} />
    <aside className="fight-console interaction-console">
      {coachingOpen ? <ControlCoach paused={paused} pressureFishing={Boolean(skillCue)} onContinue={() => { release(); coachingWatch.current = beginCoachingWatch(state); setCoachingOpen(false); }}
        onAssist={() => { release(); setCoachingOpen(false); setState(current => ({ ...current, assistMode: true })); }} /> : <>
      <div className="interaction-reading">
        <h1 aria-live="polite">{live ? "Now: " : ""}{instruction}</h1>
        <div className={`interaction-phase interaction-phase--${waiting ? "run" : "rest"}`}><span>{state.lineResolved ? "Complete" : lost ? "Retry available" : approachNeeded ? "Recovery assessment" : !ready && !state.assistMode ? "Timer paused" : anglingWindow?.label ?? presentation.phases[phaseIndex]}</span><strong>{state.lineResolved ? quality(state.interactionMistakes) : approachNeeded ? "Untimed choice" : `${(Math.max(0, ticks) * FISHING_TICK_MS / 1000).toFixed(1)}s`}</strong></div>
        {anglingWindow && !state.lineResolved && <p className="interaction-habitat-context">{venue.habitats.find(item => item.id === state.zoneId)?.name} · behavior schematic</p>}
        <p className="interaction-advice">{lost ? skillCue ? "The line overloaded. Retry, reel in short holds within the pressure band, and guide away from cover. Your discoveries and mistakes are preserved." : anglingWindow ? "Excessive pressure broke the line. Release through bursts and rolls; hold only when the current cue asks. Your discoveries and mistakes are preserved." : "Excessive pressure broke the line. Release during a run; hold when the fish tires. Your discoveries and mistakes are preserved." : state.lineResolved ? earlierCompleted ? `Earlier field encounter: ${encounter.summary} Your original subject, kit and response are preserved.` : encounter.summary : approachNeeded ? state.snagApproach === "pull-through" ? state.fightMessage : "The tackle or tether is caught. Choose a recovery approach before applying pressure. The timer waits while you assess it." : !ready && !state.assistMode ? skillCue ? "Pulse the reel while the fish settles. Release through surges or before pressure reaches the upper edge. At cover, select the rod side away from the obstruction, then keep managing pressure. Holding continuously can break the line." : anglingWindow ? "Read each behavior. Hold to guide or recover; release through bursts and rolls. The crew models rod-angle/drag adjustments." : presentation.intro : anglingWindow?.advice ?? state.fightMessage}</p>
        {live && cue && <p className="interaction-next">{cue}{!skillCue && <> Keep following “Now” until it changes.</>}</p>}
        {!ready && !state.assistMode && !lost && !state.lineResolved && !approachNeeded && <p className="control-lesson">{skillCue ? <><strong>REEL:</strong> mouse/touch hold or Space. <strong>EASE:</strong> release. <strong>ROD SIDE:</strong> tap Left/Right or use arrow keys when cover appears. Watch pressure beside the controls.</> : <><strong>HOLD:</strong> keep the button pressed. <strong>RELEASE:</strong> let go, or leave it untouched. The “Now” cue tells you which.</>}</p>}
        {!skillCue && anglingWindow && (ready || state.assistMode) && !lost && !state.lineResolved && state.anglingBeat > 0 && state.fightMessage && state.fightMessage !== anglingWindow.advice && state.fightMessage !== cue && <p className="angling-response-feedback">{state.fightMessage}</p>}
        <div className="interaction-progress"><div><span>{progressLabel}</span><strong>{displayedProgress}%</strong></div><i role="progressbar" aria-label={progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={displayedProgress}><b style={{ width: `${state.interactionProgress}%` }} /></i></div>
        {!earlierCompleted && !skillCue && pressureReadout}
        <details className="interaction-details"><summary>Field technique & placement</summary><p>{earlierCompleted ? "Prior interaction preserved. Use the original subject and response in the field record; the current route uses different controls." : anglingWindow ? `${anglingWindow.label}: ${anglingWindow.advice}` : `${profile.label}: ${profile.cue}`}</p><p>Placement: {placement(state.castAccuracy)}</p><p>{venue.habitats.find(item => item.id === state.zoneId)?.cue}</p></details>
      </div>
      <div className="interaction-actions">
        {skillCue && !state.lineResolved && !lost && <div className="skill-fight-instruments" data-required-rod-side={skillCue.requiredRodSide ?? "center"}>
          <div className="skill-live-cue"><strong>{!ready && !state.assistMode ? "Read the pressure before starting" : skillCue.actionLabel}</strong><span>{skillCue.label}</span></div>
          {pressureReadout}
          {skillCue.needsRodSide && <div className="rod-side-controls" role="group" aria-label="Rod side away from cover">
            <span>Cover {skillCue.coverSide} · guide {skillCue.requiredRodSide}</span>
            {(["left", "right"] as const).map(side => <button key={side} type="button" disabled={paused || coachingOpen || state.assistMode || !ready} aria-pressed={state.rodSide === side} onClick={() => { release(); setState(current => setRodSide(current, side)); control.current?.focus({ preventScroll: true }); }}>{side === "left" ? "← Left" : "Right →"}</button>)}
          </div>}
        </div>}
        {lost ? <div className="interaction-retries">
          <button className="primary" disabled={paused} onClick={() => { release(); setReady(false); setState(current => ({ ...retryFish(current), assistMode: false })); }}>Retry timed <RotateCcw /></button>
          <button className="secondary" disabled={paused} onClick={() => { release(); setReady(false); setState(current => ({ ...retryFish(current), assistMode: true })); }}>Retry with untimed crew</button>
          <small className="control-hint">Same subject and kit. Crew assistance applies one response per tap and is recorded.</small>
        </div> : state.lineResolved ? <button className="primary" onClick={() => setState(revealEncounter)}>{earlierCompleted ? "Review the field encounter" : presentation.next} <ArrowRight /></button> : approachNeeded ? <div className="snag-choices" aria-label="Snag recovery approach"><button className="primary" disabled={paused} onClick={() => { release(); setReady(false); setState(current => chooseSnagApproach(current, "back-out")); }}>Ease back along the entry path <ArrowRight /></button><button className="secondary" disabled={paused || state.snagApproach === "pull-through"} onClick={() => setState(current => chooseSnagApproach(current, "pull-through"))}>Pull straight through the obstruction</button></div> : state.assistMode ? <button className="interaction-control interaction-control--assist" disabled={paused} onClick={() => setState(advanceAssistedInteraction)}><RotateCcw /><span>{anglingWindow ? `CREW RESPONSE · ${anglingWindow.instruction}` : presentation.assist[phaseIndex]}</span><small>One tap applies this response for one {anglingWindow ? "window" : "phase"}.</small></button> : !ready ? <button className="primary interaction-start" disabled={paused} onClick={() => setReady(true)}>Start {presentation.start} <ArrowRight /></button> : <button ref={control} disabled={paused} aria-pressed={engaged} className={`interaction-control ${engaged ? "active" : ""} ${waiting && engaged ? "interaction-control--mismatch" : ""}`}
          onContextMenu={event => event.preventDefault()}
          onPointerDown={event => {
            if (!event.isPrimary || event.button !== 0 || activePointer.current !== null) return;
            event.preventDefault(); activePointer.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId); engage();
          }}
          onPointerUp={event => {
            if (activePointer.current !== event.pointerId) return;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            release();
          }} onPointerCancel={event => { if (activePointer.current === event.pointerId) release(); }} onLostPointerCapture={release}
          onKeyDown={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); if (!event.repeat) engage(); } }}
          onKeyUp={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); release(); } }} onBlur={release}>
          <RotateCcw /><span>{controlLabel}</span><small className="control-input-state" role="status">{inputFeedback}</small>
        </button>}
        {!state.lineResolved && !lost && !approachNeeded && <small className="control-hint">{state.assistMode ? "Untimed crew · tap or press Enter. Assistance is recorded." : skillCue ? "Mouse/touch or Space to reel · release to ease · ←/→ choose rod side at cover." : "Hold mouse/touch, or hold Space/Enter on the button."}</small>}
      </div>
      </>}
    </aside>
  </section>;
}
