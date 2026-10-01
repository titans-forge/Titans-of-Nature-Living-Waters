import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Accessibility, ArrowRight, BookOpen, Check, ClipboardCheck, Droplets, Fish, Gauge, Leaf, MapPinned, Network, RotateCcw, Search, ShieldAlert, Thermometer, Waves, X } from "lucide-react";
const EcosystemWeb = lazy(() => import("./components/EcosystemWeb").then((module) => ({ default: module.EcosystemWeb })));
import { PostcardDownload } from "./components/PostcardDownload";
import { FishingScene } from "./components/FishingScene";
import { researchProjects } from "./data/researchProjects";
import { safeObservation } from "./components/ResearchAtlas";
import { LearningPanel } from "./components/LearningPanel";
import { ResearchAtlas } from "./components/ResearchAtlas";
import { ObservationJournal, Glossary } from "./components/ObservationJournal";
import { FieldSettings } from "./components/FieldSettings";
import { CampaignTransfer } from "./components/CampaignTransfer";
import { useJourney } from "./game/useJourney";
import { venues } from "./data/venues";
import { catchPhotoByEncounterId } from "./data/catchPhotos";
import { FISHING_TICK_MS, getCastTargetWidth, getFishCue, hasLostFish, retryFish, useGuideKit, recastWithKit, advanceAssistedInteraction, advanceInteraction, askQuestion, beginDebrief, beginQuestions, castLine, completeDebrief, continueExpedition, finishGear, finishQuestions, getCurrentEncounter, getFightProfile, getPressureFeedback, getHabitatBlockReason, getIdealCastPower, getVenue, handleEncounter, MAX_CAST_ATTEMPTS, revealEncounter, selectGear, selectHabitat, selectVenue } from "./game/engine";
import { didCompleteCurrentAssignment, getActiveAssignment, getAssignmentProgress } from "./game/assignments";
import { getNextSeason, getSeason } from "./game/seasons";
import { getComparedVenues, getVenueProgress } from "./game/progress";
import type { ExpeditionState, ExperienceMode, Venue } from "./types";

const stageOrder = ["Meet", "Ask", "Prepare", "Observe", "Cast", "Handle", "Journal"];

function usesPassiveSurvey(state: ExpeditionState, venue: Venue) {
  return venue.gearSets.find((item) => item.id === state.gearId)?.hook === "No hook";
}

function interactionQualityLabel(mistakes: number) { return mistakes <= 2 ? "Clean" : mistakes <= 6 ? "Sound" : "Developing"; }
function placementQualityLabel(accuracy: number) { return accuracy >= 70 ? "Accurate · calmer opening pressure" : accuracy >= 40 ? "Workable · standard opening pressure" : "Wide · higher opening pressure"; }

function Guide({ venue, compact = false }: { venue: Venue; compact?: boolean }) {
  return <div className={`guide ${compact ? "guide--compact" : ""}`}><img src={venue.guide.image} alt={`${venue.guide.name}, ${venue.guide.role}`} /><div><small>Your guide</small><h2>{venue.guide.name}</h2><p>{venue.guide.role}</p></div></div>;
}

function AssignmentBrief({ state, venue, compact = false }: { state: ExpeditionState; venue: Venue; compact?: boolean }) {
  const assignment = getActiveAssignment(state);
  if (!assignment) return null;
  const habitat = venue.habitats.find((item) => item.id === assignment.habitatId)!;
  const gear = venue.gearSets.find((item) => item.id === assignment.gearId)!;
  const question = venue.questions.find((item) => item.id === assignment.questionId)!;
  return <div className={`assignment-brief ${compact ? "assignment-brief--compact" : ""}`}><ClipboardCheck /><div><small>{state.experienceMode === "guided" ? "Guided assignment" : "Field assignment"}</small><h3>{assignment.title}</h3><p>{assignment.objective}</p>{state.experienceMode === "guided" ? <ul><li>Ask: “{question.prompt}”</li><li>Kit: {gear.name}</li><li>Water: {habitat.name}</li></ul> : <p className="field-mode-note">Use the guide's answers, kit tradeoffs, and visible habitat signs to find the route yourself.</p>}</div></div>;
}

function Header({ state, venue, onAssist, onJournal, onReset }: { state: ExpeditionState; venue: Venue | null; onAssist: () => void; onJournal: () => void; onReset: () => void }) {
  const active = state.stage === "debrief" ? 6 : ["arrival", "questions", "gear", "habitat", "cast", "handling", "journal"].indexOf(state.stage);
  const labels = venue && usesPassiveSurvey(state, venue) ? stageOrder.map((label) => label === "Cast" ? "Survey" : label) : stageOrder;
  return <header className="topbar"><div className="brand"><strong>Living Waters</strong><span>{venue ? `${venue.shortTitle} expedition` : "Global field expeditions"}</span></div>{state.stage !== "venue" && <div className="stage-track" aria-label={`Expedition stage ${active + 1} of 7`}>{labels.map((label, index) => <span className={index <= active ? "active" : ""} key={label}><i>{index < active ? <Check size={12} /> : index + 1}</i><em>{label}</em></span>)}</div>}<div className="utility"><button onClick={onJournal} aria-label="Open field journal"><BookOpen /><span>Field journal</span></button><button className={state.assistMode ? "active" : ""} aria-pressed={state.assistMode} onClick={onAssist} aria-label={`${state.assistMode ? "Disable" : "Enable"} untimed controls`} title="Untimed controls"><Accessibility /></button><button onClick={onReset} aria-label="Choose another destination"><MapPinned /></button></div></header>;
}

function VenueSelect({ state, setState, onSelect }: { state: ExpeditionState; setState: React.Dispatch<React.SetStateAction<ExpeditionState>>; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = venues.filter((venue) => `${venue.title} ${venue.locality}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="venue-select"><header><small>Global field journal</small><h1>Choose the next living water.</h1><p>Each destination has different people, seasons, plants, hazards, and fish. The same tackle and assumptions will not work everywhere.</p><label className="venue-search"><Search /><span className="sr-only">Search destinations</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search 15 destinations" /></label></header>{!query.trim() && <><div className="first-expedition"><div><small>{state.observations.length ? "Return to the water" : "Start here"}</small><h2>Your first catch in the flooded forest.</h2><p>Meet Iara, choose your water, and bring a peacock bass alongside.</p></div><button className="primary" onClick={() => onSelect("amazon")}>Explore the Amazon <ArrowRight /></button></div><details className="research-disclosure"><summary>Explore the connected research journeys</summary><ResearchAtlas state={state} setState={setState} onSelect={onSelect} /></details></>}<h2 className="explore-heading" aria-live="polite">{query.trim() ? `${filtered.length} ${filtered.length === 1 ? "destination" : "destinations"} found` : "Explore all 15 waters"}</h2>{query && <button className="secondary" onClick={() => setQuery("")}>Clear search</button>}{filtered.length === 0 && <p role="status">No waters match “{query}”. Try a place such as Amazon, Japan, or Baikal.</p>}<div className="venue-grid">{filtered.map((venue) => { const progress = getVenueProgress(state, venue); const assignments = getAssignmentProgress(state, venue); const nextSeason = getNextSeason(state, venue); return <button key={venue.id} onClick={() => onSelect(venue.id)}><img className="venue-art" src={venue.habitatImage} alt="" loading="lazy" decoding="async" /><span>Next: {nextSeason.name}</span><div><small>{venue.locality}</small><h2>{venue.title}</h2><p>{nextSeason.fieldNote}</p><div className="venue-progress"><i><b style={{ width: `${progress.percent}%` }} /></i><em>{progress.label} · {progress.found}/{progress.total} discoveries · {assignments.completed}/{assignments.total} assignments</em></div><strong>{progress.found ? "Continue survey" : "Begin expedition"} <ArrowRight /></strong></div></button>; })}</div><p className="venue-disclaimer">Guide characters are narrative composites. Ecological explanations include authority links in the field journal; current local rules always govern real activity.</p></section>;
}

function Arrival({ state, venue, onBegin, onMode }: { state: ExpeditionState; venue: Venue; onBegin: () => void; onMode: (mode: ExperienceMode) => void }) {
  const season = getSeason(venue, state.seasonId);
  return <section className="arrival"><div className="arrival__copy"><small>{venue.locality} · {season.name}</small><h1>{venue.arrivalTitle}</h1><p>{season.fieldNote}</p><div className="season-strip"><span><Waves />{season.conditions.water}</span><span><Thermometer />{season.conditions.temperature}</span><span><Droplets />{season.conditions.current}</span></div><div className="experience-mode" aria-label="Expedition guidance"><button className={state.experienceMode === "guided" ? "active" : ""} onClick={() => onMode("guided")}><strong>Guided</strong><span>Route hints shown</span></button><button className={state.experienceMode === "field" ? "active" : ""} onClick={() => onMode("field")}><strong>Field</strong><span>Infer from evidence</span></button></div><button className="primary arrival-start" onClick={onBegin}>Meet your guide <ArrowRight /></button><p className="trip-promise">Ask, cast, discover. Your journal saves as you go.</p><details className="arrival-brief"><summary>Your field assignment</summary><AssignmentBrief state={state} venue={venue} /></details></div><Guide venue={venue} /></section>;
}

function Questions({ state, venue, setState }: { state: ExpeditionState; venue: Venue; setState: React.Dispatch<React.SetStateAction<ExpeditionState>> }) {
  const [open, setOpen] = useState<string | null>(state.askedQuestions.at(-1) ?? null);
  const assignment = state.experienceMode === "guided" ? getActiveAssignment(state) : null;
  return <section className="workspace workspace--questions"><aside><Guide venue={venue} compact /><blockquote>“{venue.guide.quote}”</blockquote>{venue.communityVoice && <div className="community-voice"><small>Another local view</small><strong>{venue.communityVoice.name}</strong><span>{venue.communityVoice.role}</span><p>“{venue.communityVoice.quote}”</p></div>}<p className="counter">{state.askedQuestions.length}/2 questions recorded</p><AssignmentBrief state={state} venue={venue} compact /></aside><div className="question-area"><small>Before departure</small><h1>What do you ask?</h1><p>Local knowledge changes where you fish and how you handle what answers the line.</p><div className="question-list">{venue.questions.map((question) => { const asked = state.askedQuestions.includes(question.id); const lead = assignment?.questionId === question.id; return <article className={`${asked ? "asked" : ""} ${lead ? "field-lead" : ""}`} key={question.id}><button disabled={!asked && state.askedQuestions.length >= 2} onClick={() => { setState((current) => askQuestion(current, question.id)); setOpen(question.id); }}><span>{asked ? <Check /> : "?"}</span><strong>{question.prompt}{lead && <small>Field lead</small>}</strong></button>{open === question.id && asked && <div><p>{question.answer}</p><em>{question.hint}</em><small className="question-source">Research note: {question.source}</small></div>}</article>; })}</div>{assignment && state.askedQuestions.length === 2 && <div className="guide-kit"><strong>{venue.guide.name} recommends: {venue.gearSets.find(g => g.id === assignment.gearId)?.name}</strong><p>{venue.gearSets.find(g => g.id === assignment.gearId)?.strength}</p><button className="primary" onClick={() => setState(useGuideKit)}>Use the guide’s kit <ArrowRight /></button></div>}<button className={assignment && state.askedQuestions.length === 2 ? "secondary" : "primary"} disabled={state.askedQuestions.length !== 2} onClick={() => setState(finishQuestions)}>Prepare the field kit <ArrowRight /></button></div></section>;
}

function Gear({ state, venue, setState }: { state: ExpeditionState; venue: Venue; setState: React.Dispatch<React.SetStateAction<ExpeditionState>> }) {
  const assignment = state.experienceMode === "guided" ? getActiveAssignment(state) : null;
  return <section className="workspace workspace--gear"><div className="section-heading"><small>Field kit</small><h1>Choose one practical loadout.</h1><p>There is no universal best gear. Each kit changes what the line can reach and what else it may catch.</p></div><div className="gear-grid">{venue.gearSets.map((gear) => <button className={`${state.gearId === gear.id ? "selected" : ""} ${assignment?.gearId === gear.id ? "assignment-match" : ""}`} onClick={() => setState((current) => selectGear(current, gear.id))} key={gear.id}><div><Fish /><span>{state.gearId === gear.id && <Check />}</span></div><h2>{gear.name}</h2>{assignment?.gearId === gear.id && <small className="field-lead-label">Assignment kit</small>}<dl><dt>Rod</dt><dd>{gear.rod}</dd><dt>Line</dt><dd>{gear.line}</dd><dt>Hook</dt><dd>{gear.hook}</dd><dt>Lure</dt><dd>{gear.lure}</dd><dt>Tools</dt><dd>{gear.tools}</dd></dl><p>{gear.strength}</p><em>{gear.tradeoff}</em></button>)}</div><button className="primary" disabled={!state.gearId} onClick={() => setState(finishGear)}>Push away from the landing <ArrowRight /></button></section>;
}

function Habitat({ state, venue, setState }: { state: ExpeditionState; venue: Venue; setState: React.Dispatch<React.SetStateAction<ExpeditionState>> }) {
  const gear = venue.gearSets.find((item) => item.id === state.gearId)!;
  const passiveSurvey = usesPassiveSurvey(state, venue);
  const zone = venue.habitats.find((item) => item.id === state.zoneId);
  const habitatBlock = zone ? getHabitatBlockReason(state, zone.id) : null;
  const assignment = state.experienceMode === "guided" ? getActiveAssignment(state) : null;
  const season = getSeason(venue, state.seasonId);
  return <section className="habitat-stage"><h1 className="sr-only">Read the habitat and make a prediction.</h1><aside className="field-kit"><small>Field kit</small><h2>{gear.name}</h2><dl><dt>Rod</dt><dd>{gear.rod}</dd><dt>Line</dt><dd>{gear.line}</dd><dt>Hook</dt><dd>{gear.hook}</dd><dt>Lure</dt><dd>{gear.lure}</dd><dt>Tools</dt><dd>{gear.tools}</dd></dl></aside><div className="cast-surface" style={{ backgroundImage: `url(${venue.habitatImage})` }}>{venue.habitats.map((item, index) => <button aria-label={`Select ${item.name}${assignment?.habitatId === item.id ? ", assignment water" : ""}`} className={`cast-zone cast-zone--${item.position} ${state.zoneId === item.id ? "selected" : ""} ${item.safe === false ? "cast-zone--caution" : ""} ${assignment?.habitatId === item.id ? "assignment-zone" : ""}`} onClick={() => setState((current) => selectHabitat(current, item.id))} key={item.id}><span>{index + 1}</span><strong>{item.name}</strong></button>)}<div className="scene-time"><span>{season.conditions.time}</span><span>{season.name}</span></div></div><aside className="habitat-guide"><Guide venue={venue} compact /><div className="conditions"><h3>{season.name}</h3><p><Waves /> {season.conditions.water}</p><p><Thermometer /> {season.conditions.temperature}</p><p><Droplets /> {season.conditions.current}</p></div><div className={`hypothesis ${zone?.safe === false ? "hypothesis--danger" : ""}`}><h3>Field clues</h3>{zone ? <>{zone.safe === false && <ShieldAlert />}<strong>{zone.cue}</strong><p>{zone.safe === false ? zone.safetyNote : zone.hypothesis}</p></> : <p>Select a habitat to read its clues, then make your own prediction.</p>}</div>{habitatBlock && <p className="station-closed" role="status">{habitatBlock}</p>}<LearningPanel state={state} setState={setState} questionId={`${venue.id}:prediction`} reveal={state.observations.some((item) => item.venueId === venue.id)} /><button className="primary" disabled={!zone || zone.safe === false || Boolean(habitatBlock) || !state.learningAnswers.some((item) => item.questionId === `${venue.id}:prediction`)} onClick={() => setState((current) => ({ ...current, stage: "cast" }))}>{habitatBlock ? "Choose another station" : zone?.safe === false ? "Choose a safer position" : passiveSurvey ? "Set the receiver" : "Set up the cast"} <ArrowRight /></button></aside></section>;
}

function CastGame({ state, venue, setState, paused }: { state: ExpeditionState; venue: Venue; setState: React.Dispatch<React.SetStateAction<ExpeditionState>>; paused: boolean }) {
  const [power, setPower] = useState(18);
  const placementDirection = useRef(1);
  const [engaged, setEngaged] = useState(false);
  const engagedRef = useRef(false);
  useEffect(() => { engagedRef.current = engaged; }, [engaged]);
  const passiveSurvey = usesPassiveSurvey(state, venue);
  const idealPower = getIdealCastPower(state);
  const targetWidth = getCastTargetWidth(state);
  const lost = hasLostFish(state);
  const cue = state.encounterId ? getFishCue(state) : null;
  const profile = state.encounterId ? getFightProfile(state) : null;
  useEffect(() => {
    if (paused || state.encounterId || state.assistMode) return;
    const timer = window.setInterval(() => setPower((current) => {
      if (current >= 96) placementDirection.current = -1;
      if (current <= 8) placementDirection.current = 1;
      return Math.max(8, Math.min(96, current + placementDirection.current * 2));
    }), 42);
    return () => window.clearInterval(timer);
  }, [paused, state.assistMode, state.encounterId]);

  useEffect(() => { if (state.assistMode && !state.encounterId) setPower(idealPower); }, [idealPower, state.assistMode, state.encounterId]);

  useEffect(() => {
    if (paused || !state.encounterId || state.lineResolved || lost || state.assistMode) return;
    const timer = window.setInterval(() => setState((current) => advanceInteraction(current, engagedRef.current)), FISHING_TICK_MS);
    return () => window.clearInterval(timer);
  }, [paused, lost, setState, state.assistMode, state.encounterId, state.lineResolved]);
  useEffect(() => { setEngaged(false); }, [paused, state.assistMode]);

  useEffect(() => { if (state.lineResolved || lost) setEngaged(false); }, [state.lineResolved, lost]);

  if (!state.encounterId) return <section className="cast-game cast-game--power" style={{ backgroundImage: `url(${venue.habitatImage})` }}><div className="cast-console cast-console--simple"><small>{passiveSurvey ? "Survey placement" : "Cast placement"} · attempt {state.castAttempts + 1} of {MAX_CAST_ATTEMPTS}</small><h1>{passiveSurvey ? "Set the receiver." : "Read the water."}</h1><p>{state.assistMode ? "Untimed controls place the marker inside the habitat band. Confirm when ready." : "Press once when the moving marker crosses the gold habitat band. A near placement still works."}</p><div className={`placement-meter ${state.assistMode ? "placement-meter--steady" : ""}`} aria-label={`${state.assistMode ? "Steady" : "Moving"} placement marker and target band`}><span className="placement-target" style={{ left: `${Math.max(0, Math.min(100 - targetWidth, idealPower - targetWidth / 2))}%`, width: `${targetWidth}%` }} /><i style={{ left: `${power}%` }} /></div><div className="power-labels"><span>Near</span><span>Far</span></div><button className="placement-lock" disabled={paused} onClick={() => setState((current) => castLine({ ...current, stage: "habitat" }, power))}><Gauge /><span>{passiveSurvey ? "SET SURVEY" : state.assistMode ? "CONFIRM CAST" : "CAST NOW"}</span></button><small className="cast-help">Good advice and the guide’s kit widen your target. A precise cast lowers opening tension.</small><div className="fishing-mode" aria-label="Fishing controls"><button aria-pressed={!state.assistMode} onClick={() => setState(c => ({ ...c, assistMode: false }))}>Skill fishing · time your cast, hold to reel</button><button aria-pressed={state.assistMode} onClick={() => setState(c => ({ ...c, assistMode: true }))}>Untimed assistance · advance at your pace</button></div></div></section>;

  const pressure = getPressureFeedback(state);
  const encounter = getCurrentEncounter(state)!;
  const zone = venue.habitats.find((item) => item.id === state.zoneId)!;
  const activeFish = encounter.type === "fish" && !passiveSurvey;
  const waiting = state.fightPhase === "run";
  const phaseLabel = lost ? "Fish escaped" : state.lineResolved ? "Complete" : activeFish ? waiting ? "Fish running" : "Reeling window" : waiting ? "Interference" : "Signal stable";
  const instruction = lost ? "THE LINE BROKE" : activeFish ? waiting ? "LET IT RUN" : state.assistMode ? "REEL ONE WINDOW" : "HOLD TO REEL" : waiting ? "RELEASE AND WAIT" : state.assistMode ? "RECORD WINDOW" : passiveSurvey ? "HOLD TO RECORD" : "HOLD TO CONTROL";
  const progressLabel = activeFish ? "Catch progress" : "Observation progress";
  const begin = (event: React.PointerEvent<HTMLButtonElement>) => { if (paused || lost || state.lineResolved) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setEngaged(true); };
  const end = (event: React.PointerEvent<HTMLButtonElement>) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setEngaged(false); };
  const keyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => { if (!paused && !lost && (event.key === " " || event.key === "Enter")) { event.preventDefault(); setEngaged(true); } };
  const keyUp = (event: React.KeyboardEvent<HTMLButtonElement>) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); setEngaged(false); } };
  return <section className="cast-game"><FishingScene state={state} venue={venue} paused={paused} /><aside className="fight-console interaction-console"><div className={`interaction-phase interaction-phase--${state.fightPhase}`} aria-live="polite"><span>{phaseLabel}</span><strong>{state.lineResolved ? interactionQualityLabel(state.interactionMistakes) : instruction}</strong></div><div className="fish-warning" role="status">{lost ? "Release sooner during a run. Your expedition and discoveries are safe." : cue || (state.assistMode ? "Untimed assistance is on. Each tap advances the taught response." : "Hold during calm water. Release when the fish runs. Too much tension breaks the line.")}</div><p className="cast-result">Cast: {placementQualityLabel(state.castAccuracy)}</p><div className="fight-profile"><small>{profile?.label}</small><span>{profile?.cue}</span></div><h1>{state.lineResolved ? encounter.name : instruction}</h1><p>{state.lineResolved ? encounter.summary : state.fightMessage}</p><div className="interaction-progress"><div><span>{progressLabel}</span><strong>{state.interactionProgress}%</strong></div><i role="progressbar" aria-label={progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.interactionProgress}><b style={{ width: `${state.interactionProgress}%` }} /></i></div><div className={`tension-readout ${pressure.label === "Strained" ? "tension-readout--danger" : ""}`}><span>Pressure · safe {pressure.safeMin}–{pressure.safeMax}</span><i role="meter" aria-label="Line tension" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.lineTension}><em style={{ left: `${pressure.safeMin}%`, width: `${pressure.safeMax - pressure.safeMin}%` }} /><b style={{ width: `${state.lineTension}%` }} /></i><strong>{pressure.label}</strong></div>{lost ? <button className="primary" onClick={() => { setEngaged(false); setState(retryFish); }}>Try again with this kit <RotateCcw /></button> : !state.lineResolved ? state.assistMode ? <button className="interaction-control interaction-control--assist" disabled={paused} onClick={() => setState(advanceAssistedInteraction)}><RotateCcw /><span>{waiting ? "LET THIS RUN PASS" : activeFish ? "REEL ONE WINDOW" : "RECORD THIS WINDOW"}</span><small>Untimed assistance: advances the taught response for this phase</small></button> : <button disabled={paused} aria-pressed={engaged} className={`interaction-control ${engaged ? "active" : ""}`} onContextMenu={e => e.preventDefault()} onPointerDown={begin} onPointerUp={end} onPointerCancel={end} onKeyDown={keyDown} onKeyUp={keyUp} onBlur={() => setEngaged(false)}><RotateCcw /><span>{activeFish ? "HOLD TO REEL" : passiveSurvey ? "HOLD TO RECORD" : "HOLD TO CONTROL"}</span><small>Release during {activeFish ? "a run" : "interference"}</small></button> : <><div className="why"><h3>{activeFish ? "Catch complete" : "Observation complete"}</h3><p><strong>Placement:</strong> {placementQualityLabel(state.castAccuracy)}</p><p><strong>Habitat:</strong> {zone.cue}</p><p><strong>Control:</strong> {interactionQualityLabel(state.interactionMistakes)}</p></div><button className="primary" onClick={() => setState(revealEncounter)}>{passiveSurvey ? "Review the observation" : "Handle the encounter"} <ArrowRight /></button></>}</aside></section>;
}

function Handling({ state, venue, setState }: { state: ExpeditionState; venue: Venue; setState: React.Dispatch<React.SetStateAction<ExpeditionState>> }) {
  const encounter = getCurrentEncounter(state)!;
  const catchPhoto = usesPassiveSurvey(state, venue) ? null : catchPhotoByEncounterId[encounter.id];
  return <section className="workspace handling"><div className="section-heading"><small>At the boat</small><h1>How do you respond?</h1><p>{encounter.summary}</p></div>{catchPhoto && <figure className="catch-photo"><img src={catchPhoto} alt={`${encounter.name} supported after capture in the ${venue.shortTitle} expedition`} /><figcaption><span>Field encounter</span><strong>{encounter.name}</strong><em>Generated reconstruction · handling decisions still matter</em></figcaption></figure>}<div className="handling-grid">{encounter.handling.map((option, index) => <button onClick={() => setState((current) => handleEncounter(current, option.id))} key={option.id}><span>{String.fromCharCode(65 + index)}</span><strong>{option.label}</strong><ArrowRight /></button>)}</div><aside><Guide venue={venue} compact /><p>“{venue.guide.handlingQuote}”</p></aside></section>;
}

function JournalResult({ state, venue, setState, onContinue, onDebrief, onJournal }: { state: ExpeditionState; setState: React.Dispatch<React.SetStateAction<ExpeditionState>>; venue: Venue; onContinue: () => void; onDebrief: () => void; onJournal: () => void }) {
  const encounter = getCurrentEncounter(state)!; const handling = encounter.handling.find((item) => item.id === state.handlingId)!;
  const compared = getComparedVenues(state);
  const assignment = getActiveAssignment(state); const matched = Boolean(assignment && state.tripJournalIds.includes(assignment.id));
  const passiveSurvey = usesPassiveSurvey(state, venue);
  const activeFish = encounter.type === "fish" && !passiveSurvey;
  const remaining = MAX_CAST_ATTEMPTS - state.castAttempts;
  return <section className="journal-result"><div className="journal-result__main"><small>{venue.shortTitle} field entry added · cast {state.castAttempts} of {MAX_CAST_ATTEMPTS}</small><h1>{encounter.name}</h1>{encounter.scientificName && <em>{encounter.scientificName}</em>}<blockquote>{handling.result}</blockquote><p>{encounter.ecology}</p><div className={`assignment-result ${matched ? "assignment-result--matched" : ""}`}><ClipboardCheck /><div><small>Field assignment</small><strong>{matched ? "Target observation reached" : "Unexpected observation recorded"}</strong><p>{matched ? "Return with the habitat and handling record to complete the assignment." : remaining > 0 ? "Useful evidence recorded. Change habitat or kit and keep looking." : "Useful evidence recorded. The original assignment remains available next time."}</p></div></div><div className="technique-summary" aria-label="Trip technique"><div><span>{passiveSurvey ? "Survey placement" : "Cast placement"}</span><strong>{placementQualityLabel(state.castAccuracy)}</strong></div><div><span>{passiveSurvey ? "Signal control" : activeFish ? "Fight control" : "Line control"}</span><strong>{interactionQualityLabel(state.interactionMistakes)}</strong></div></div><LearningPanel state={state} setState={setState} questionId={`${venue.id}:prediction`} /><LearningPanel state={state} setState={setState} questionId={`${venue.id}:reflection`} /><div className="connections">{encounter.connections.map((item) => <span key={item}>{item}</span>)}</div>{compared.length > 1 && <div className="comparison-note"><small>Across living waters</small><p><strong>{venue.comparison.driver}</strong> shapes {venue.comparison.habitat.toLowerCase()}. {venue.comparison.lesson}</p></div>}</div><aside><h2>Expedition record</h2><div className="record-facts"><strong>{state.journalIds.length} unique {state.journalIds.length === 1 ? "discovery" : "discoveries"}</strong><span>{state.observations.length} detailed {state.observations.length === 1 ? "observation" : "observations"}</span><span>{state.learningAnswers.filter((answer) => answer.correct).length} / {state.learningAnswers.length} first explanations matched</span></div><details className="activity-points"><summary>Trip activity points</summary><p>Fieldcraft {state.fieldcraft} · Biology {state.biology} · Ecology {state.ecology} · Community {state.trust}. These track participation, not mastery.</p></details>{remaining > 0 && <><button className="primary" onClick={() => setState(recastWithKit)}>Cast again with this kit <ArrowRight /></button><button className="secondary" onClick={onContinue}>Change the field kit</button></>}<button className={remaining > 0 ? "secondary" : "primary"} onClick={onDebrief}>Return to community <ArrowRight /></button><button className="secondary" onClick={onJournal}>Explore ecosystem web <Network /></button></aside></section>;
}

function Debrief({ state, venue, setState, onRepeat, onDestinations, onJournal }: { state: ExpeditionState; venue: Venue; setState: React.Dispatch<React.SetStateAction<ExpeditionState>>; onRepeat: () => void; onDestinations: () => void; onJournal: () => void }) {
  const assignment = getActiveAssignment(state); const encounter = getCurrentEncounter(state)!;
  const completed = didCompleteCurrentAssignment(state);
  const project = researchProjects.find(p => p.venueIds.includes(venue.id));
  const nextWater = project?.venueIds.find(id => !state.observations.some(o => o.venueId === id && o.shared && safeObservation(o)));
  const season = getSeason(venue, state.seasonId);
  const habitat = venue.habitats.find(h => h.id === state.zoneId);
  const handling = encounter.handling.find(h => h.id === state.handlingId);
  const postcardArt = usesPassiveSurvey(state, venue) ? venue.habitatImage : catchPhotoByEncounterId[encounter.id] ?? venue.habitatImage;
  if (state.debriefChoice) return <section className="debrief"><div><small>Community return</small><h1>{completed ? "Assignment complete." : "The field record grows."}</h1><p>{completed ? `${assignment ? venue.encounters[assignment.targetEncounterId].name : encounter.name} now anchors a shared record of habitat, handling, and local knowledge.` : "Your observation is preserved, but the full field assignment remains available on a later expedition."}</p><figure className="expedition-postcard"><img src={postcardArt} alt={`${venue.shortTitle} field expedition illustration`} /><figcaption><small>{venue.shortTitle} · {season.name}</small><strong>{encounter.name}</strong><span>{habitat?.name} · {handling?.safe ? "Careful handling" : "Handling needs care"}</span><p>{encounter.connections[0]}</p></figcaption></figure><p className="next-discovery">{nextWater ? `Next research stop: ${venues.find(v => v.id === nextWater)?.shortTitle}. Bring back a careful, shared observation to connect the evidence.` : project ? "Your paired field records are ready. Open the research journeys in the atlas to compare them." : "Try a different season or habitat to discover what changes."}</p><div className="debrief-outcome"><ClipboardCheck /><div><strong>{completed ? "Shared survey added" : "Observation logged"}</strong><span>{assignment?.title}</span></div></div><div className="debrief-actions"><PostcardDownload image={postcardArt} title={encounter.name} place={`${venue.shortTitle} · ${season.name}`} detail={`${habitat?.name ?? "Field observation"} · ${handling?.safe ? "Careful handling" : "Handling needs care"}`} /><button className="primary" onClick={onRepeat}>Take another assignment <RotateCcw /></button><button className="secondary" onClick={onJournal}>Explore ecosystem web <Network /></button><button className="secondary" onClick={onDestinations}>Choose destination <MapPinned /></button></div></div><Guide venue={venue} /></section>;
  const choices = [
    { id: "full-notes" as const, title: "Share the full field record", text: "Add habitat, handling, and local guidance so the observation can help the next person." },
    { id: "identity-only" as const, title: "Report the identity only", text: "Record what appeared without the practical context that made the observation useful." },
    { id: "private-notes" as const, title: "Keep the notes private", text: "Preserve the personal journal but add nothing to the shared community record." },
  ];
  return <section className="debrief"><div><small>Back at the landing</small><h1>What do you return?</h1><p>Your catch matters less than the usable observation you bring back. Choose what enters the community record.</p><p className="local-sharing-note">This is the community inside the game. Your notes stay on this device unless you export them.</p><div className="debrief-choices">{choices.map((choice) => <button key={choice.id} onClick={() => setState((current) => completeDebrief(current, choice.id))}><span><ClipboardCheck /></span><div><strong>{choice.title}</strong><p>{choice.text}</p></div><ArrowRight /></button>)}</div></div><aside><Guide venue={venue} /><blockquote>“{venue.guide.handlingQuote}”</blockquote></aside></section>;
}

function JournalDrawer({ state, setState, onClose, onImport, recoveryRaw, initialSection }: { initialSection: string; state: ExpeditionState; setState: React.Dispatch<React.SetStateAction<ExpeditionState>>; onClose: () => void; onImport: (next: ExpeditionState, notice?: string) => void; recoveryRaw: string | null }) {
  const [tab, setTab] = useState(initialSection);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select, summary, [tabindex]:not([tabindex="-1"])')).filter((element) => element.getClientRects().length > 0 && !element.closest('[hidden], [inert]'));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [onClose]);
  return <><button className="scrim" tabIndex={-1} onClick={onClose} aria-label="Close journal" /><aside ref={dialogRef} className="journal-drawer journal-drawer--web" role="dialog" aria-modal="true" aria-labelledby="journal-title"><header><div><BookOpen /><small>Field journal</small><h2 id="journal-title">Living connections</h2></div><button ref={closeRef} onClick={onClose} aria-label="Close journal"><X /></button></header><nav className="journal-tabs" aria-label="Journal sections">{[["records","Field records"],["connections","Living connections"],["glossary","Field language"],["settings","Save & settings"]].map(([id,label]) => <button aria-pressed={tab === id} onClick={() => setTab(id)} key={id}>{label}</button>)}</nav>{tab === "records" && <ObservationJournal state={state} setState={setState} />}{tab === "connections" && <Suspense fallback={<p role="status">Opening living connections…</p>}><EcosystemWeb state={state} /></Suspense>}{tab === "glossary" && <Glossary />}<div hidden={tab !== "settings"}><FieldSettings state={state} setState={setState} /><CampaignTransfer state={state} onImport={onImport} recoveryRaw={recoveryRaw} /></div></aside></>;
}

export default function App() {
  const { state, setState, notice, blocked, recoveryRaw, importJourney } = useJourney();
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalSection, setJournalSection] = useState("records");
  const openJournal = (section = "records") => { setJournalSection(section); setJournalOpen(true); };
  const [browsing, setBrowsing] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const [manualPause, setManualPause] = useState(() => state.stage === "cast");
  const [hidden, setHidden] = useState(document.hidden);
  const venue = getVenue(state);
  const mainRef = useRef<HTMLDivElement>(null);
  const closeJournal = useCallback(() => setJournalOpen(false), []);
  const paused = journalOpen || browsing || manualPause || hidden;
  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const heading = mainRef.current?.querySelector<HTMLElement>("h1");
    if (heading && !journalOpen) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }, [state.stage, state.venueId, browsing]);
  useEffect(() => {
    const visibility = () => { setHidden(document.hidden); if (document.hidden) setManualPause(true); };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  const start = (id: string) => { setState((current) => selectVenue(current, id)); setBrowsing(false); setPendingDestination(null); setManualPause(false); };
  const select = (id: string) => {
    if (state.stage !== "venue" && !state.debriefChoice) { setPendingDestination(id); return; }
    start(id);
  };
  const showAtlas = state.stage === "venue" || browsing || !venue;
  let content;
  if (showAtlas) content = <VenueSelect state={state} setState={setState} onSelect={select} />;
  else if (state.stage === "arrival") content = <Arrival state={state} venue={venue} onBegin={() => setState(beginQuestions)} onMode={(experienceMode) => setState((current) => ({ ...current, experienceMode }))} />;
  else if (state.stage === "questions") content = <Questions state={state} venue={venue} setState={setState} />;
  else if (state.stage === "gear") content = <Gear state={state} venue={venue} setState={setState} />;
  else if (state.stage === "habitat") content = <Habitat state={state} venue={venue} setState={setState} />;
  else if (state.stage === "cast") content = <CastGame state={state} venue={venue} setState={setState} paused={paused} />;
  else if (state.stage === "handling") content = <Handling state={state} venue={venue} setState={setState} />;
  else if (state.stage === "journal") content = <JournalResult state={state} venue={venue} setState={setState} onJournal={() => openJournal("connections")} onContinue={() => setState(continueExpedition)} onDebrief={() => setState(beginDebrief)} />;
  else content = <Debrief state={state} venue={venue} setState={setState} onJournal={() => openJournal("connections")} onRepeat={() => start(venue.id)} onDestinations={() => setBrowsing(true)} />;
  return <><div ref={mainRef} inert={journalOpen || undefined} aria-hidden={journalOpen || undefined} className={`app app--${showAtlas ? "venue" : state.stage}`} style={venue && state.stage === "arrival" && !showAtlas ? { backgroundImage: `url(${venue.habitatImage})` } : undefined}>
    <a className="skip-link" href="#expedition-content">Skip to expedition</a>
    <Header state={showAtlas ? { ...state, stage: "venue" } : state} venue={showAtlas ? null : venue} onAssist={() => setState((current) => ({ ...current, assistMode: !current.assistMode }))} onJournal={() => openJournal()} onReset={() => setBrowsing(true)} />
    {notice && <div className={`save-notice ${blocked ? "save-notice--blocked" : ""}`} role="status">{notice}<button onClick={() => openJournal("settings")}>Save & recovery</button></div>}
    {browsing && venue && <div className="resume-strip"><span>{venue.shortTitle} · {state.debriefChoice ? "Completed expedition" : "Expedition paused; your place is saved"}</span><button onClick={() => { setBrowsing(false); setPendingDestination(null); }}>Resume {venue.shortTitle}</button></div>}
    {pendingDestination && <section className="destination-confirm" aria-label="Confirm new expedition"><h2>Start a new expedition?</h2><p>Your existing discoveries and field records stay in your journal. This ends the unfinished trip in {venue?.shortTitle}; an unshared assignment will not be completed.</p><button onClick={() => start(pendingDestination)}>End current trip and travel</button><button onClick={() => setPendingDestination(null)}>Keep current expedition</button></section>}
    {!showAtlas && <div className="expedition-tools"><span>{state.assistMode ? "Untimed assistance · automatic responses" : "Skill fishing · hold and release"} · {state.experienceMode === "field" ? "Field investigation" : "Guided expedition"}</span><button aria-pressed={manualPause} onClick={() => setManualPause(!manualPause)}>{manualPause ? "Resume expedition" : "Pause expedition"}</button></div>}
    <main id="expedition-content" tabIndex={-1}>
      {manualPause && !showAtlas && <div className="pause-panel" role="status"><h2>Take a breath. The water can wait.</h2><p>Timers are paused. Resume when you are ready.</p><button onClick={() => setManualPause(false)}>Continue expedition</button></div>}
      <div inert={manualPause && !showAtlas || undefined} className={manualPause && !showAtlas ? "paused-content" : undefined}>{content}</div>
    </main>
  </div>{journalOpen && <JournalDrawer initialSection={journalSection} state={state} setState={setState} onClose={closeJournal} recoveryRaw={recoveryRaw} onImport={(next, message) => { importJourney(next, message); setBrowsing(false); setPendingDestination(null); setManualPause(true); closeJournal(); }} />}</>;
}
