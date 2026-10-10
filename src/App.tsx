import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Accessibility, ArrowRight, BookOpen, Check, ClipboardCheck, Droplets, Fish, Leaf, MapPinned, Network, RotateCcw, Search, ShieldAlert, Thermometer, Waves, X } from "lucide-react";
const EcosystemWeb = lazy(() => import("./components/EcosystemWeb").then((module) => ({ default: module.EcosystemWeb })));
import { PostcardDownload } from "./components/PostcardDownload";
import { CastGame } from "./components/CastGame";
import { LearningPanel } from "./components/LearningPanel";
import { ResearchAtlas } from "./components/ResearchAtlas";
import { GuideNotebook } from "./components/GuideNotebook";
import { FieldDecision, FieldDecisionOutcome } from "./components/FieldDecision";
import { VisitComparison } from "./components/VisitComparison";
import { getResearchReturn } from "./game/researchNavigation";
import { ObservationJournal, Glossary } from "./components/ObservationJournal";
import { FieldSettings } from "./components/FieldSettings";
import { InteractionAudio } from "./components/InteractionAudio";
import { CampaignTransfer } from "./components/CampaignTransfer";
import { useJourney } from "./game/useJourney";
import { venues } from "./data/venues";
import { getEncounterArtwork } from "./data/encounterArtwork";
import { useGuideKit, recastWithKit, askQuestion, beginDebrief, beginQuestions, completeDebrief, continueExpedition, finishGear, finishQuestions, getCurrentEncounter, getHandlingOptions, getHabitatBlockReason, getVenue, handleEncounter, MAX_CAST_ATTEMPTS, selectGear, selectHabitat, selectVenue } from "./game/engine";
import { didCompleteCurrentAssignment, getActiveAssignment, getAssignmentProgress, getCurrentAssignmentStatus } from "./game/assignments";
import { getGearMethod, getInteractionKind, hasEarlierCompletedEncounter } from "./game/interactions";
import { getInteractionPresentation, getSetupPresentation } from "./game/interactionPresentation";
import { getNextSeason, getSeason } from "./game/seasons";
import { getComparedVenues, getVenueProgress } from "./game/progress";
import type { ExpeditionState, ExperienceMode, Venue } from "./types";

const stageOrder = ["Meet", "Ask", "Prepare", "Observe", "Cast", "Handle", "Journal"];

function usesPassiveSurvey(state: ExpeditionState, venue: Venue) {
  return ["camera", "telemetry", "sampling"].includes(getInteractionKind(state, venue));
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
  const kind = venue ? getInteractionKind(state, venue) : "fish";
  const labels = stageOrder.map(label => label === "Cast" ? venue && hasEarlierCompletedEncounter(state, venue) ? "Encounter" : kind === "bycatch" ? "Respond" : kind === "snag" ? "Recover" : kind === "fish" ? "Cast" : "Survey" : label === "Handle" && ["camera", "telemetry", "sampling"].includes(kind) ? "Review" : label);
  return <header className="topbar"><div className="brand"><strong>Living Waters</strong><span>{venue ? `${venue.shortTitle} expedition` : "Global field expeditions"}</span></div>{state.stage !== "venue" && <div className="stage-track" aria-label={`Expedition stage ${active + 1} of 7`}>{labels.map((label, index) => <span className={index <= active ? "active" : ""} key={label}><i>{index < active ? <Check size={12} /> : index + 1}</i><em>{label}</em></span>)}</div>}<div className="utility"><button onClick={onJournal} aria-label="Open field journal"><BookOpen /><span>Field journal</span></button><button className={state.assistMode ? "active" : ""} aria-pressed={state.assistMode} onClick={onAssist} aria-label={`${state.assistMode ? "Disable" : "Enable"} untimed controls`} title="Untimed controls"><Accessibility /></button><button onClick={onReset} aria-label="Choose another destination"><MapPinned /></button></div></header>;
}

function VenueSelect({ state, setState, onSelect, researchOpen, onResearchToggle, activeProjectId, onProjectSelect }: { state: ExpeditionState; setState: React.Dispatch<React.SetStateAction<ExpeditionState>>; onSelect: (id: string) => void; researchOpen: boolean; onResearchToggle: (open: boolean) => void; activeProjectId: string | null; onProjectSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = venues.filter((venue) => `${venue.title} ${venue.locality}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="venue-select"><header><small>Global field journal</small><h1>Choose the next living water.</h1><p>Each destination has different people, seasons, plants, hazards, and fish. The same tackle and assumptions will not work everywhere.</p><label className="venue-search"><Search /><span className="sr-only">Search destinations</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search 15 destinations" /></label></header>{!query.trim() && <><div className="first-expedition"><div><small>{state.observations.length ? "Continue your field journal" : "Start here"}</small><h2>{state.observations.length ? "Turn your observations into a connected story." : "Your first catch in the flooded forest."}</h2><p>{state.observations.length ? "Follow a research field task, compare records from two waters, and consider what the evidence leaves unanswered." : "Meet Iara, choose your water, and bring a peacock bass alongside."}</p></div><button className="primary" onClick={() => state.observations.length ? onResearchToggle(true) : onSelect("amazon")}>{state.observations.length ? "Open research journeys" : "Explore the Amazon"} <ArrowRight /></button></div><details className="research-disclosure" open={researchOpen} onToggle={event => onResearchToggle(event.currentTarget.open)}><summary>Explore the connected research journeys</summary><ResearchAtlas state={state} setState={setState} onSelect={onSelect} selectedProjectId={activeProjectId} onProjectSelect={onProjectSelect} /></details></>}<h2 className="explore-heading" aria-live="polite">{query.trim() ? `${filtered.length} ${filtered.length === 1 ? "destination" : "destinations"} found` : "Explore all 15 waters"}</h2>{query && <button className="secondary" onClick={() => setQuery("")}>Clear search</button>}{filtered.length === 0 && <p role="status">No waters match “{query}”. Try a place such as Amazon, Japan, or Baikal.</p>}<div className="venue-grid">{filtered.map((venue) => { const progress = getVenueProgress(state, venue); const assignments = getAssignmentProgress(state, venue); const nextSeason = getNextSeason(state, venue); return <button key={venue.id} onClick={() => onSelect(venue.id)}><img className="venue-art" src={venue.habitatImage} alt="" loading="lazy" decoding="async" /><span>Next: {nextSeason.name}</span><div><small>{venue.locality}</small><h2>{venue.title}</h2><p>{nextSeason.fieldNote}</p><div className="venue-progress"><i><b style={{ width: `${progress.investigationPercent}%` }} /></i><em>{progress.label} · {progress.investigationFound}/{progress.investigationTotal} investigations · {assignments.investigations.completed}/{assignments.investigations.total} shared assignments</em><small>{progress.incidentResponses.found} incident responses · {progress.habitatCare.found} habitat-care records</small></div><strong>{progress.found ? "Continue survey" : "Begin expedition"} <ArrowRight /></strong></div></button>; })}</div><p className="venue-disclaimer">Guide characters are narrative composites. Ecological explanations include authority links in the field journal; current local rules always govern real activity.</p></section>;
}

function Arrival({ state, venue, onBegin, onMode }: { state: ExpeditionState; venue: Venue; onBegin: () => void; onMode: (mode: ExperienceMode) => void }) {
  const season = getSeason(venue, state.seasonId);
  return <section className="arrival"><div className="arrival__copy"><small>{venue.locality} · {season.name}</small><h1>{venue.arrivalTitle}</h1><p>{season.fieldNote}</p><div className="season-strip"><span><Waves />{season.conditions.water}</span><span><Thermometer />{season.conditions.temperature}</span><span><Droplets />{season.conditions.current}</span></div><div className="experience-mode" aria-label="Expedition guidance"><button aria-pressed={state.experienceMode === "guided"} className={state.experienceMode === "guided" ? "active" : ""} onClick={() => onMode("guided")}><strong>Guided</strong><span>Route hints shown</span></button><button aria-pressed={state.experienceMode === "field"} className={state.experienceMode === "field" ? "active" : ""} onClick={() => onMode("field")}><strong>Field</strong><span>Infer from evidence</span></button></div><button className="primary arrival-start" onClick={onBegin}>Meet your guide <ArrowRight /></button><p className="trip-promise">Ask, cast, discover. Build a record of what you find.</p><details className="arrival-brief"><summary>Your field assignment</summary><AssignmentBrief state={state} venue={venue} /></details></div><Guide venue={venue} /></section>;
}

function Questions({ state, venue, setState }: { state: ExpeditionState; venue: Venue; setState: React.Dispatch<React.SetStateAction<ExpeditionState>> }) {
  const [open, setOpen] = useState<string | null>(state.askedQuestions.at(-1) ?? null);
  const assignment = state.experienceMode === "guided" ? getActiveAssignment(state) : null;
  return <section className="workspace workspace--questions"><aside><Guide venue={venue} compact /><blockquote>“{venue.guide.quote}”</blockquote>{venue.communityVoice && <div className="community-voice"><small>Another local view</small><strong>{venue.communityVoice.name}</strong><span>{venue.communityVoice.role}</span><p>“{venue.communityVoice.quote}”</p></div>}<p className="counter">{state.askedQuestions.length}/2 questions recorded</p><AssignmentBrief state={state} venue={venue} compact /></aside><div className="question-area"><small>Before departure</small><h1>What do you ask?</h1><p>Local knowledge changes where you fish and how you handle what answers the line.</p><div className="question-list">{venue.questions.map((question) => { const asked = state.askedQuestions.includes(question.id); const lead = assignment?.questionId === question.id; return <article className={`${asked ? "asked" : ""} ${lead ? "field-lead" : ""}`} key={question.id}><button disabled={!asked && state.askedQuestions.length >= 2} onClick={() => { setState((current) => askQuestion(current, question.id)); setOpen(question.id); }}><span>{asked ? <Check /> : "?"}</span><strong>{question.prompt}{lead && <small>Field lead</small>}</strong></button>{open === question.id && asked && <div><p>{question.answer}</p><em>{question.hint}</em><small className="question-source">Research note: {question.source}</small></div>}</article>; })}</div>{assignment && state.askedQuestions.length === 2 && <div className="guide-kit"><strong>{venue.guide.name} recommends: {venue.gearSets.find(g => g.id === assignment.gearId)?.name}</strong><p>{venue.gearSets.find(g => g.id === assignment.gearId)?.strength}</p><button className="primary" onClick={() => setState(useGuideKit)}>Use the guide’s kit <ArrowRight /></button></div>}<button className={assignment && state.askedQuestions.length === 2 ? "secondary" : "primary"} disabled={state.askedQuestions.length !== 2} onClick={() => setState(finishQuestions)}>Prepare the field kit <ArrowRight /></button></div></section>;
}

function Gear({ state, venue, setState }: { state: ExpeditionState; venue: Venue; setState: React.Dispatch<React.SetStateAction<ExpeditionState>> }) {
  const assignment = state.experienceMode === "guided" ? getActiveAssignment(state) : null;
  return <section className="workspace workspace--gear"><div className="section-heading"><small>Field kit</small><h1>Choose one practical loadout.</h1><p>There is no universal best gear. Each kit changes how you gather evidence and which incidental problems you must be ready to manage.</p></div><div className="gear-grid">{venue.gearSets.map((gear) => <button aria-pressed={state.gearId === gear.id} className={`${state.gearId === gear.id ? "selected" : ""} ${assignment?.gearId === gear.id ? "assignment-match" : ""}`} onClick={() => setState((current) => selectGear(current, gear.id))} key={gear.id}><div><Fish /><span>{state.gearId === gear.id && <Check />}</span></div><h2>{gear.name}</h2>{assignment?.gearId === gear.id && <small className="field-lead-label">Assignment kit</small>}<dl><dt>Rod</dt><dd>{gear.rod}</dd><dt>Line</dt><dd>{gear.line}</dd><dt>Hook</dt><dd>{gear.hook}</dd><dt>Lure</dt><dd>{gear.lure}</dd><dt>Tools</dt><dd>{gear.tools}</dd></dl><p>{gear.strength}</p><em>{gear.tradeoff}</em></button>)}</div><button className="primary" disabled={!state.gearId} onClick={() => setState(finishGear)}>Push away from the landing <ArrowRight /></button></section>;
}

function Habitat({ state, venue, setState }: { state: ExpeditionState; venue: Venue; setState: React.Dispatch<React.SetStateAction<ExpeditionState>> }) {
  const gear = venue.gearSets.find((item) => item.id === state.gearId)!;
  const setup = getSetupPresentation(getGearMethod(state, venue));
  const zone = venue.habitats.find((item) => item.id === state.zoneId);
  const habitatBlock = zone ? getHabitatBlockReason(state, zone.id) : null;
  const assignment = state.experienceMode === "guided" ? getActiveAssignment(state) : null;
  const season = getSeason(venue, state.seasonId);
  return <section className="habitat-stage"><h1 className="sr-only">Read the habitat and make a prediction.</h1><aside className="field-kit"><small>Field kit</small><h2>{gear.name}</h2><dl><dt>Rod</dt><dd>{gear.rod}</dd><dt>Line</dt><dd>{gear.line}</dd><dt>Hook</dt><dd>{gear.hook}</dd><dt>Lure</dt><dd>{gear.lure}</dd><dt>Tools</dt><dd>{gear.tools}</dd></dl></aside><div className="cast-surface" style={{ backgroundImage: `url(${venue.habitatImage})` }}>{venue.habitats.map((item, index) => <button aria-pressed={state.zoneId === item.id} aria-label={`Select ${item.name}${assignment?.habitatId === item.id ? ", assignment water" : ""}`} className={`cast-zone cast-zone--${item.position} ${state.zoneId === item.id ? "selected" : ""} ${item.safe === false ? "cast-zone--caution" : ""} ${assignment?.habitatId === item.id ? "assignment-zone" : ""}`} onClick={() => setState((current) => selectHabitat(current, item.id))} key={item.id}><span>{index + 1}</span><strong>{item.name}</strong></button>)}<div className="scene-time"><span>{season.conditions.time}</span><span>{season.name}</span></div></div><aside className="habitat-guide"><Guide venue={venue} compact /><div className="conditions"><h3>{season.name}</h3><p><Waves /> {season.conditions.water}</p><p><Thermometer /> {season.conditions.temperature}</p><p><Droplets /> {season.conditions.current}</p></div><FieldDecision state={state} venue={venue} setState={setState} /><div className={`hypothesis ${zone?.safe === false ? "hypothesis--danger" : ""}`}><h3>Field clues</h3>{zone ? <>{zone.safe === false && <ShieldAlert />}<strong>{zone.cue}</strong><p>{zone.safe === false ? zone.safetyNote : zone.hypothesis}</p></> : <p>Select a habitat to read its clues, then make your own prediction.</p>}</div>{habitatBlock && <p className="station-closed" role="status">{habitatBlock}</p>}<LearningPanel state={state} setState={setState} questionId={`${venue.id}:prediction`} reveal={state.observations.some((item) => item.venueId === venue.id)} /><button className="primary" disabled={!zone || zone.safe === false || Boolean(habitatBlock) || !state.learningAnswers.some((item) => item.questionId === `${venue.id}:prediction`)} onClick={() => setState((current) => ({ ...current, stage: "cast" }))}>{habitatBlock ? "Choose another station" : zone?.safe === false ? "Choose a safer position" : setup.setup} <ArrowRight /></button></aside></section>;
}


export function Handling({ state, venue, setState }: { state: ExpeditionState; venue: Venue; setState: React.Dispatch<React.SetStateAction<ExpeditionState>> }) {
  const encounter = getCurrentEncounter(state)!;
  const artwork = getEncounterArtwork(state, venue);
  return <section className="workspace handling"><div className="section-heading"><small>{hasEarlierCompletedEncounter(state, venue) ? "Earlier field encounter" : artwork?.label ?? (usesPassiveSurvey(state, venue) ? "Field observation" : "At the waterline")}</small><h1>How do you respond?</h1><p>{encounter.summary}</p></div>{artwork && <figure className={`catch-photo encounter-artwork encounter-artwork--${artwork.purpose}`}><img src={artwork.src} alt={artwork.alt} decoding="async" style={{ objectPosition: artwork.objectPosition }} /><figcaption><span>{artwork.label}</span><strong>{encounter.name}</strong><em>{artwork.caption}</em></figcaption></figure>}<div className="handling-grid">{getHandlingOptions(state).map((option, index) => <button onClick={() => setState((current) => handleEncounter(current, option.id))} key={option.id}><span>{String.fromCharCode(65 + index)}</span><strong>{option.label}</strong><ArrowRight /></button>)}</div><aside><Guide venue={venue} compact /><p>“{venue.guide.handlingQuote}”</p></aside></section>;
}

function JournalResult({ state, venue, setState, onContinue, onDebrief, onJournal }: { state: ExpeditionState; setState: React.Dispatch<React.SetStateAction<ExpeditionState>>; venue: Venue; onContinue: () => void; onDebrief: () => void; onJournal: () => void }) {
  const encounter = getCurrentEncounter(state)!; const handling = encounter.handling.find((item) => item.id === state.handlingId)!;
  const compared = getComparedVenues(state);
  const assignmentStatus = getCurrentAssignmentStatus(state); const matched = assignmentStatus.ready;
  const passiveSurvey = usesPassiveSurvey(state, venue);
  const presentation = getInteractionPresentation(getInteractionKind(state, venue));
  const remaining = MAX_CAST_ATTEMPTS - state.castAttempts;
  return <section className="journal-result"><div className="journal-result__main"><small>{venue.shortTitle} field entry added · cast {state.castAttempts} of {MAX_CAST_ATTEMPTS}</small><h1>{encounter.name}</h1>{encounter.scientificName && <em>{encounter.scientificName}</em>}<blockquote>{handling.result}</blockquote><p>{encounter.ecology}</p><div className={`assignment-result ${matched ? "assignment-result--matched" : ""}`}><ClipboardCheck /><div><small>Field assignment</small><strong>{assignmentStatus.title}</strong><p>{assignmentStatus.detail}</p></div></div><div className="technique-summary" aria-label="Trip technique"><div><span>{getSetupPresentation(getGearMethod(state, venue)).placement}</span><strong>{placementQualityLabel(state.castAccuracy)}</strong></div><div><span>{hasEarlierCompletedEncounter(state, venue) ? "Earlier interaction" : presentation.technique}</span><strong>{interactionQualityLabel(state.interactionMistakes)}</strong></div></div><FieldDecisionOutcome state={state} venue={venue} /><VisitComparison state={state} venue={venue} /><LearningPanel state={state} setState={setState} questionId={`${venue.id}:prediction`} /><LearningPanel state={state} setState={setState} questionId={`${venue.id}:reflection`} /><GuideNotebook venue={venue} /><div className="connections">{encounter.connections.map((item) => <span key={item}>{item}</span>)}</div>{compared.length > 1 && <div className="comparison-note"><small>Across living waters</small><p><strong>{venue.comparison.driver}</strong> shapes {venue.comparison.habitat.toLowerCase()}. {venue.comparison.lesson}</p></div>}</div><aside><h2>Expedition record</h2><div className="record-facts"><strong>{state.journalIds.length} unique {state.journalIds.length === 1 ? "discovery" : "discoveries"}</strong><span>{state.observations.length} detailed {state.observations.length === 1 ? "observation" : "observations"}</span><span>{state.learningAnswers.filter((answer) => answer.correct).length} / {state.learningAnswers.length} first explanations matched</span></div><details className="activity-points"><summary>Trip activity points</summary><p>Fieldcraft {state.fieldcraft} · Biology {state.biology} · Ecology {state.ecology} · Community {state.trust}. These track participation, not mastery.</p></details>{remaining > 0 && <><button className="primary" onClick={() => setState(recastWithKit)}>{getInteractionKind(state, venue) === "bycatch" ? "Choose another station" : passiveSurvey ? "Survey again with this kit" : "Make another field attempt"} <ArrowRight /></button><button className="secondary" onClick={onContinue}>Change the field kit</button></>}<button className={remaining > 0 ? "secondary" : "primary"} onClick={onDebrief}>Return to community <ArrowRight /></button><button className="secondary" onClick={onJournal}>Explore ecosystem web <Network /></button></aside></section>;
}

export function Debrief({ state, venue, setState, onRepeat, onDestinations, onJournal, activeProjectId, onResearch, onResearchStop }: { state: ExpeditionState; venue: Venue; setState: React.Dispatch<React.SetStateAction<ExpeditionState>>; onRepeat: () => void; onDestinations: () => void; onJournal: () => void; activeProjectId?: string | null; onResearch?: (id?: string) => void; onResearchStop?: (id: string) => void }) {
  const assignment = getActiveAssignment(state); const encounter = getCurrentEncounter(state)!;
  const completed = didCompleteCurrentAssignment(state);
  const research = getResearchReturn(state, activeProjectId);
  const project = research?.project;
  const researchStatus = research?.status;
  const nextWater = research?.nextVenueId;
  const season = getSeason(venue, state.seasonId);
  const habitat = venue.habitats.find(h => h.id === state.zoneId);
  const handling = encounter.handling.find(h => h.id === state.handlingId);
  const artwork = getEncounterArtwork(state, venue);
  const postcardArt = artwork?.src ?? venue.habitatImage;
  const responseSummary = usesPassiveSurvey(state, venue) || getInteractionKind(state, venue) !== "fish" ? handling?.safe ? "Careful response" : "Response needs review" : handling?.safe ? "Careful handling" : "Handling needs care";
  if (state.debriefChoice) return <section className="debrief"><div><small>Community return</small><h1>{completed ? "Assignment complete." : "The field record grows."}</h1><p>{completed ? `${assignment ? venue.encounters[assignment.targetEncounterId].name : encounter.name} now anchors a shared record of habitat, handling, and local knowledge.` : "Your observation is preserved, but the full field assignment remains available on a later expedition."}</p><figure className="expedition-postcard"><img src={postcardArt} alt={artwork?.alt ?? `${venue.shortTitle} generated habitat illustration`} decoding="async" style={{ objectPosition: artwork?.objectPosition }} /><figcaption><small>{venue.shortTitle} · {season.name}</small><strong>{encounter.name}</strong><span>{habitat?.name} · {responseSummary}</span><em className="encounter-artwork-caption">{artwork?.caption ?? "Generated reconstruction · habitat panorama"}</em><p>{encounter.connections[0]}</p></figcaption></figure><p className="next-discovery">{nextWater ? `Next field task for “${project!.title}”: ${venues.find(v => v.id === nextWater)?.shortTitle}. ${research!.nextFieldTask}` : project ? researchStatus?.supported ? "Your research explanation links both waters and states its limits. Revisit the records in another season." : "Relevant records from both waters are available. Open the research journey to select evidence, compare methods and explain its limits." : "Your record adds local habitat context. Explore the research journeys for their named field tasks, or return in another season."}</p>{project && !research!.currentRecordRelevant && <p className="research-context-note">This observation stays in your journal. It does not meet the named field task for “{project.title}”.</p>}{onResearch && <div className="research-return-actions"><button className="primary" onClick={() => onResearch(project?.id)}>{project ? "Open this research report" : "Explore research journeys"} <ArrowRight /></button>{nextWater && onResearchStop && <button className="secondary" onClick={() => onResearchStop(nextWater)}>Continue field task in {venues.find(v => v.id === nextWater)?.shortTitle} <ArrowRight /></button>}</div>}<div className="debrief-outcome"><ClipboardCheck /><div><strong>{completed ? assignment?.purpose === "incident-response" ? "Incident response shared" : assignment?.purpose === "habitat-care" ? "Habitat-care response shared" : "Shared investigation added" : "Observation logged"}</strong><span>{assignment?.title}</span></div></div><div className="debrief-actions"><PostcardDownload image={postcardArt} title={encounter.name} place={`${venue.shortTitle} · ${season.name} · ${habitat?.name ?? "Field observation"}`} detail={`${artwork?.caption ?? "Generated reconstruction · habitat panorama"} · ${responseSummary}`} /><button className="primary" onClick={onRepeat}>Take another assignment <RotateCcw /></button><button className="secondary" onClick={onJournal}>Explore ecosystem web <Network /></button><button className="secondary" onClick={onDestinations}>Choose destination <MapPinned /></button></div></div><Guide venue={venue} /></section>;
  const choices = [
    { id: "full-notes" as const, title: "Share the full field record", text: "Add habitat, handling, and local guidance so the observation can help the next person." },
    { id: "identity-only" as const, title: "Report the identity only", text: "Record what appeared without the practical context that made the observation useful." },
    { id: "private-notes" as const, title: "Keep the notes private", text: "Preserve the personal journal but add nothing to the shared community record." },
  ];
  return <section className="debrief"><div><small>Back at the landing</small><h1>What do you return?</h1><p>The usable observation and your careful response matter most. Choose what enters the community record.</p><p className="local-sharing-note">This is the community inside the game. Your notes stay on this device unless you export them.</p><div className="debrief-choices">{choices.map((choice) => <button key={choice.id} onClick={() => setState((current) => completeDebrief(current, choice.id))}><span><ClipboardCheck /></span><div><strong>{choice.title}</strong><p>{choice.text}</p></div><ArrowRight /></button>)}</div></div><aside><Guide venue={venue} /><blockquote>“{venue.guide.handlingQuote}”</blockquote></aside></section>;
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
  const { state, setState, notice, blocked, conflict, reloadLatestJourney, recoveryRaw, importJourney } = useJourney();
  const [audioEpoch, setAudioEpoch] = useState(0);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalSection, setJournalSection] = useState("records");
  const openJournal = (section = "records") => { setJournalSection(section); setJournalOpen(true); };
  const [browsing, setBrowsing] = useState(false);
  const [activeResearchProjectId, setActiveResearchProjectId] = useState<string | null>(null);
  const [researchOpen, setResearchOpen] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const [manualPause, setManualPause] = useState(() => state.stage === "cast");
  const [hidden, setHidden] = useState(document.hidden);
  const venue = getVenue(state);
  const mainRef = useRef<HTMLDivElement>(null);
  const closeJournal = useCallback(() => setJournalOpen(false), []);
  const paused = journalOpen || browsing || manualPause || hidden || conflict;
  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const heading = mainRef.current?.querySelector<HTMLElement>(browsing && researchOpen ? "#atlas-title" : "h1");
    if (heading && !journalOpen) { heading.tabIndex = -1; heading.focus({ preventScroll: !(browsing && researchOpen) }); }
  }, [state.stage, state.venueId, state.encounterId, browsing, researchOpen]);
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
  if (showAtlas) content = <VenueSelect state={state} setState={setState} onSelect={select} researchOpen={researchOpen} onResearchToggle={setResearchOpen} activeProjectId={activeResearchProjectId} onProjectSelect={setActiveResearchProjectId} />;
  else if (state.stage === "arrival") content = <Arrival state={state} venue={venue} onBegin={() => setState(beginQuestions)} onMode={(experienceMode) => setState((current) => ({ ...current, experienceMode }))} />;
  else if (state.stage === "questions") content = <Questions state={state} venue={venue} setState={setState} />;
  else if (state.stage === "gear") content = <Gear state={state} venue={venue} setState={setState} />;
  else if (state.stage === "habitat") content = <Habitat state={state} venue={venue} setState={setState} />;
  else if (state.stage === "cast") content = <CastGame key={audioEpoch} state={state} venue={venue} setState={setState} paused={paused} layoutNotice={notice} />;
  else if (state.stage === "handling") content = <Handling state={state} venue={venue} setState={setState} />;
  else if (state.stage === "journal") content = <JournalResult state={state} venue={venue} setState={setState} onJournal={() => openJournal("connections")} onContinue={() => setState(continueExpedition)} onDebrief={() => setState(beginDebrief)} />;
  else content = <Debrief state={state} venue={venue} setState={setState} onJournal={() => openJournal("connections")} onRepeat={() => start(venue.id)} onDestinations={() => setBrowsing(true)} activeProjectId={activeResearchProjectId} onResearch={id => { if (id) setActiveResearchProjectId(id); setResearchOpen(true); setBrowsing(true); }} onResearchStop={id => { const research = getResearchReturn(state, activeResearchProjectId); if (research) setActiveResearchProjectId(research.project.id); start(id); }} />;
  return <><InteractionAudio state={state} paused={paused || showAtlas} resetKey={audioEpoch} /><div ref={mainRef} inert={journalOpen || undefined} aria-hidden={journalOpen || undefined} className={`app app--${showAtlas ? "venue" : state.stage} ${!showAtlas && state.stage === "cast" && state.encounterId && !state.lineResolved ? "app--live-interaction" : ""}`} style={venue && state.stage === "arrival" && !showAtlas ? { backgroundImage: `url(${venue.habitatImage})` } : undefined}>
    <a className="skip-link" href="#expedition-content">Skip to expedition</a>
    <Header state={showAtlas ? { ...state, stage: "venue" } : state} venue={showAtlas ? null : venue} onAssist={() => setState((current) => ({ ...current, assistMode: !current.assistMode }))} onJournal={() => openJournal()} onReset={() => setBrowsing(true)} />
    {notice && <div className={`save-notice ${blocked ? "save-notice--blocked" : ""}`} role="status"><span className="save-notice-copy" tabIndex={0}>{notice}</span><div className="save-notice-actions">{conflict && <button onClick={() => { setAudioEpoch(current => current + 1); reloadLatestJourney(); setManualPause(true); }}>Load the saved journey</button>}<button onClick={() => openJournal("settings")}>{conflict ? "Export this journey & recovery" : "Save & recovery"}</button></div></div>}
    {browsing && venue && <div className="resume-strip"><span>{venue.shortTitle} · {state.debriefChoice ? "Completed expedition" : "Expedition paused; your place is saved"}</span><button onClick={() => { setBrowsing(false); setPendingDestination(null); }}>Resume {venue.shortTitle}</button></div>}
    {pendingDestination && <section className="destination-confirm" aria-label="Confirm new expedition"><h2>Start a new expedition?</h2><p>Your existing discoveries and field records stay in your journal. This ends the unfinished trip in {venue?.shortTitle}; an unshared assignment will not be completed.</p><button onClick={() => start(pendingDestination)}>End current trip and travel</button><button onClick={() => setPendingDestination(null)}>Keep current expedition</button></section>}
    {!showAtlas && <div className="expedition-tools"><span>{state.assistMode ? "Untimed controls · advance at your pace" : "Timed controls · follow the field cue"} · {state.experienceMode === "field" ? "Field investigation" : "Guided expedition"}</span><button aria-pressed={manualPause} onClick={() => setManualPause(!manualPause)}>{manualPause ? "Resume expedition" : "Pause expedition"}</button></div>}
    <main id="expedition-content" tabIndex={-1}>
      {manualPause && !showAtlas && <div className="pause-panel" role="status"><h2>Take a breath. The water can wait.</h2><p>Timers are paused. Resume when you are ready.</p><button onClick={() => setManualPause(false)}>Continue expedition</button></div>}
      <div inert={manualPause && !showAtlas || undefined} className={manualPause && !showAtlas ? "paused-content" : undefined}>{content}</div>
    </main>
  </div>{journalOpen && <JournalDrawer initialSection={journalSection} state={state} setState={setState} onClose={closeJournal} recoveryRaw={recoveryRaw} onImport={(next, message) => { setAudioEpoch(current => current + 1); importJourney(next, message); setBrowsing(false); setPendingDestination(null); setActiveResearchProjectId(null); setResearchOpen(false); setManualPause(true); closeJournal(); }} />}</>;
}
