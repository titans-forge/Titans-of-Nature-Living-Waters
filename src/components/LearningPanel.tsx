import { useEffect, useId, useRef, useState } from "react";
import { getLearningAnswerProblem, getLearningQuestion, recordLearningAnswer, type LearningQuestion } from "../data/learning";
import { researchProjects } from "../data/researchProjects";
import { venues } from "../data/venues";
import { getEvidenceForQuestion, getProjectEvidenceStatus, getResearchLimitations, getRevisionValidation, isRevisionSupported, recordLearningRevision, safeObservation, type RevisionValidation } from "../game/research";
import type { ExpeditionState, FieldObservation, LearningRevision } from "../types";

type UpdateJourney = React.Dispatch<React.SetStateAction<ExpeditionState>>;
type EvidenceStop = { venueId: string; candidates: FieldObservation[] };
const methodNames = { angling: "Angling", camera: "Camera survey", telemetry: "Telemetry listening", sampling: "Sampling" };

function EvidenceRecord({ observation }: { observation: FieldObservation }) {
  const venue = venues.find(item => item.id === observation.venueId);
  const season = venue?.seasons.find(item => item.id === observation.seasonId);
  const gear = venue?.gearSets.find(item => item.id === observation.gearId);
  const habitat = venue?.habitats.find(item => item.id === observation.habitatId);
  const encounter = venue?.encounters[observation.encounterId];
  const sharing = observation.reportingStatus === "full-notes" ? "Full notes shared" : observation.reportingStatus === "private-notes" ? "Private notes"
    : observation.reportingStatus === "identity-only" ? "Identity only" : observation.reportingStatus === "pending" ? "Pending community return" : "Earlier sharing context unknown";
  return <span className="learning-evidence__record">
    <strong>Record #{observation.id} · {venue?.shortTitle ?? observation.venueId} · {encounter?.name ?? observation.encounterId}</strong>
    <span>Season: {season?.name ?? observation.seasonId} · Habitat: {habitat?.name ?? observation.habitatId}</span>
    <span>Method: {gear ? methodNames[gear.method] : observation.gearId} · Kit: {gear?.name ?? observation.gearId}</span>
    <small>{sharing} · Expedition {observation.expedition}</small>
  </span>;
}

function SavedReview({ state, question, revision, resultRef }: { state: ExpeditionState; question: LearningQuestion; revision: LearningRevision; resultRef: React.RefObject<HTMLParagraphElement | null> }) {
  const supported = isRevisionSupported(state, revision);
  const limitation = getResearchLimitations(question.id).find(item => item.id === revision.limitationId);
  return <div className="learning-review__saved">
    <h3>Latest evidence review</h3>
    <p className="learning-review__result" role="status" tabIndex={-1} ref={resultRef}><strong>{supported
      ? question.phase === "comparison" ? "Supported by the selected game records." : "This explanation fits the model; a local context record is linked."
      : "This evidence review needs another look."}</strong></p>
    <p><strong>Explanation:</strong> {question.options.find(item => item.id === revision.answerId)?.text ?? revision.answerId}</p>
    <p>{question.explanation}</p>
    {limitation?.feedback && <p>{limitation.feedback}</p>}
    <details><summary>Selected limitation and linked records · {revision.evidenceIds.length}</summary>
      <p><strong>Selected limitation:</strong> {limitation?.text ?? revision.limitationId}</p>
      <ul aria-label="Records linked to the latest evidence review">{revision.evidenceIds.map(id => {
        const observation = state.observations.find(item => item.id === id);
        return <li key={id}>{observation ? <EvidenceRecord observation={observation} /> : `Record #${id} is unavailable.`}</li>;
      })}</ul>
      <small>This reviews selected game records. It does not establish a real population trend or demonstrate transfer to a new situation.</small>
    </details>
  </div>;
}

function FirstAnswerChooser({ state, question, setState }: { state: ExpeditionState; question: LearningQuestion; setState: UpdateJourney }) {
  const [problem, setProblem] = useState<string | null>(null);
  const problemRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (problem) problemRef.current?.focus(); }, [problem]);
  const choose = (answerId: string) => {
    const failure = getLearningAnswerProblem(state, question.id, answerId);
    if (failure) { setProblem(failure); return; }
    setState(current => recordLearningAnswer(current, question.id, answerId));
    setProblem(null);
  };
  return <><p>Choose your best explanation. Your first answer is saved so you can revisit it.</p>
    <div className="learning-options">{question.options.map(option => <button key={option.id} onClick={() => choose(option.id)}>{option.text}</button>)}</div>
    {problem && <p className="learning-review__feedback" role="alert" tabIndex={-1} ref={problemRef}>{problem}</p>}
  </>;
}

function EvidenceReview({ state, question, stops, setState, revision, active, onSaved }: {
  state: ExpeditionState; question: LearningQuestion; stops: EvidenceStop[]; setState: UpdateJourney;
  revision?: LearningRevision; active: boolean; onSaved: (revision: LearningRevision) => void;
}) {
  const groupId = useId();
  const savedSelection = () => Object.fromEntries(stops.flatMap(stop => {
    const observation = stop.candidates.find(item => revision?.evidenceIds.includes(item.id));
    return observation ? [[stop.venueId, observation.id]] : [];
  }));
  const [selected, setSelected] = useState<Record<string, number>>(savedSelection);
  const [answerId, setAnswerId] = useState(revision?.answerId ?? "");
  const [limitationId, setLimitationId] = useState(revision?.limitationId ?? "");
  const [feedback, setFeedback] = useState<RevisionValidation | null>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (feedback) feedbackRef.current?.focus(); }, [feedback]);
  useEffect(() => {
    if (!active) return;
    setSelected(savedSelection());
    setAnswerId(revision?.answerId ?? "");
    setLimitationId(revision?.limitationId ?? "");
    setFeedback(null);
  }, [active, revision]);
  const project = researchProjects.find(item => item.id === question.id);
  const isProject = question.phase === "comparison";
  const reviewed = Boolean(revision);
  const errorId = `${groupId}-review-error`;
  const fieldFeedback = (field: RevisionValidation["field"], venueId?: string) => feedback?.field === field && (field !== "evidence" || (feedback.venueId ?? stops[0]?.venueId) === venueId)
    ? <p id={errorId} className="learning-review__feedback" ref={feedbackRef} tabIndex={-1} role="alert">{feedback.text}</p> : null;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const evidenceIds = stops.flatMap(stop => selected[stop.venueId] === undefined ? [] : [selected[stop.venueId]]);
    const problem = getRevisionValidation(state, question.id, answerId, evidenceIds, limitationId);
    if (problem) { setFeedback(problem); return; }
    setState(current => recordLearningRevision(current, question.id, answerId, evidenceIds, limitationId));
    onSaved({ questionId: question.id, answerId, correct: answerId === question.correctId, evidenceIds, limitationId });
  };
  return <form className="learning-review" onSubmit={submit} aria-label={isProject ? "Link records and review the research conclusion" : "Review an explanation with a local record"}>
    <h3>{reviewed ? "Revise the evidence review" : "Review with evidence"}</h3>
    <p>{isProject ? "Select one relevant full-notes record from each water, then choose your conclusion and its limitation. Your first saved answer remains visible." : "Select one relevant local record, then choose your explanation and its limitation. Private and pending notes can support a local review."}</p>
    <div className="learning-evidence">{stops.map(stop => {
      const venue = venues.find(item => item.id === stop.venueId);
      const hintId = `${groupId}-hint-${stop.venueId}`;
      const fieldTask = project?.evidenceRequirements.find(item => item.venueId === stop.venueId)?.fieldTask;
      const eligibleIds = new Set(stop.candidates.map(observation => observation.id));
      const otherRecords = isProject ? state.observations.filter(observation => observation.venueId === stop.venueId && observation.shared
        && observation.reportingStatus === "full-notes" && safeObservation(observation) && !eligibleIds.has(observation.id)) : [];
      const invalid = feedback?.field === "evidence" && (feedback.venueId ?? stops[0]?.venueId) === stop.venueId;
      return <fieldset key={stop.venueId} aria-describedby={`${hintId}${invalid ? ` ${errorId}` : ""}`} aria-invalid={invalid || undefined}>
        <legend>{venue?.shortTitle ?? stop.venueId} evidence · choose one record</legend>
        <p id={hintId}>{fieldTask ?? "Choose a safely handled record with its season, method, and habitat context."}</p>
        {fieldFeedback("evidence", stop.venueId)}
        {stop.candidates.length ? stop.candidates.map(observation => <label key={observation.id}>
          <input type="radio" name={`${groupId}-evidence-${stop.venueId}`} value={observation.id} checked={selected[stop.venueId] === observation.id}
            onChange={() => { setSelected(current => ({ ...current, [stop.venueId]: observation.id })); setFeedback(null); }} />
          <EvidenceRecord observation={observation} />
        </label>) : <p className="learning-evidence__missing">{isProject ? "No relevant, safely handled full-notes record is available here yet. Visit this water, complete the field task, and share full notes." : "No relevant, safely handled local record is available yet. Complete a field observation to review this explanation."}</p>}
        {otherRecords.length > 0 && <div className="learning-evidence__other"><h4>Other full-notes records · outside this field task</h4><p>These records remain in your journal, but their subject, habitat, or method does not address this project's required comparison. They are not eligible evidence selections here.</p>
          <ul>{otherRecords.slice(-3).reverse().map(observation => <li key={observation.id}><EvidenceRecord observation={observation} /></li>)}</ul>
          {otherRecords.length > 3 && <small>Showing the latest 3 of {otherRecords.length} other records.</small>}
        </div>}
      </fieldset>;
    })}</div>
    <div className="learning-review__choices">
      <fieldset aria-describedby={feedback?.field === "answer" ? errorId : undefined} aria-invalid={feedback?.field === "answer" || undefined}><legend>{isProject ? "Conclusion" : "Explanation"} · choose one</legend>{fieldFeedback("answer")}{question.options.map(option => <label key={option.id}>
        <input type="radio" name={`${groupId}-answer`} value={option.id} checked={answerId === option.id}
          onChange={() => { setAnswerId(option.id); setFeedback(null); }} /><span>{option.text}</span>
      </label>)}</fieldset>
      <fieldset aria-describedby={feedback?.field === "limitation" ? errorId : undefined} aria-invalid={feedback?.field === "limitation" || undefined}><legend>Limitation · choose one</legend>{fieldFeedback("limitation")}{getResearchLimitations(question.id).map(limitation => <label key={limitation.id}>
        <input type="radio" name={`${groupId}-limitation`} value={limitation.id} checked={limitationId === limitation.id}
          onChange={() => { setLimitationId(limitation.id); setFeedback(null); }} /><span>{limitation.text}</span>
      </label>)}</fieldset>
    </div>
    {fieldFeedback("form")}
    <div className="learning-review__actions"><button type="submit" className="primary">{reviewed ? "Save revised evidence review" : "Save evidence review"}</button></div>
  </form>;
}

export function LearningPanel({ state, questionId, setState, reveal = true }: {
  state: ExpeditionState; questionId: string; setState: UpdateJourney; reveal?: boolean;
}) {
  const question = getLearningQuestion(questionId);
  if (!question) return null;
  return <LearningPanelContent key={questionId} state={state} question={question} setState={setState} reveal={reveal} />;
}

function LearningPanelContent({ state, question, setState, reveal }: {
  state: ExpeditionState; question: LearningQuestion; setState: UpdateJourney; reveal: boolean;
}) {
  const questionId = question.id;
  const isProject = question.phase === "comparison";
  const answer = state.learningAnswers.find(item => item.questionId === questionId);
  const revision = state.learningRevisions.find(item => item.questionId === questionId);
  const [reviewOpen, setReviewOpen] = useState(isProject && !revision);
  const [pendingReview, setPendingReview] = useState<LearningRevision | null>(null);
  const [focusResult, setFocusResult] = useState(false);
  const resultRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (pendingReview && revision && revision.answerId === pendingReview.answerId && revision.limitationId === pendingReview.limitationId
      && revision.evidenceIds.length === pendingReview.evidenceIds.length && revision.evidenceIds.every((id, index) => id === pendingReview.evidenceIds[index])) {
      setReviewOpen(false);
      setPendingReview(null);
      setFocusResult(true);
    }
  }, [pendingReview, revision]);
  useEffect(() => {
    if (!focusResult) return;
    resultRef.current?.focus({ preventScroll: true });
    resultRef.current?.closest(".learning-review__saved")?.scrollIntoView({ block: "start" });
    setFocusResult(false);
  }, [focusResult]);
  const evidence = getEvidenceForQuestion(state, questionId);
  const stops = isProject ? getProjectEvidenceStatus(state, questionId).stops : [{ venueId: question.venueId!, candidates: evidence }];
  const alreadyObserved = state.observations.some(item => item.venueId === question.venueId);
  return <section className="learning-panel" aria-label={isProject ? "Research evidence review" : "First answer and evidence review"}>
    <small>{isProject ? "Research conclusion · compare two waters" : answer ? "First answer and evidence review" : question.phase === "prediction" && !alreadyObserved ? "Before you observe · make a prediction" : "Field question · explain the connection"}</small>
    <h2>{question.prompt}</h2>
    {!answer && !isProject && <FirstAnswerChooser key={questionId} state={state} question={question} setState={setState} />}
    {answer && <div className="learning-feedback">
      <h3>First answer</h3><p>{question.options.find(option => option.id === answer.answerId)?.text ?? answer.answerId}</p>
      {reveal ? <><strong>{answer.correct ? "This explanation fits the model." : "Here is a connection to revisit."}</strong><p>{question.explanation}</p></> : <p>First answer recorded. Gather an observation, then compare it with the explanation in your field journal.</p>}
    </div>}
    {revision && <SavedReview state={state} question={question} revision={revision} resultRef={resultRef} />}
    {isProject ? reviewOpen ? <EvidenceReview state={state} question={question} stops={stops} setState={setState} revision={revision} active onSaved={setPendingReview} />
      : <button onClick={() => setReviewOpen(true)}>Edit review</button>
      : answer && evidence.length > 0 ? <details className="learning-review__disclosure" open={reviewOpen} onToggle={event => setReviewOpen(event.currentTarget.open)}><summary>{revision ? "Edit review" : "Review this explanation with evidence"}</summary>
        <EvidenceReview state={state} question={question} stops={stops} setState={setState} revision={revision} active={reviewOpen} onSaved={setPendingReview} />
      </details> : answer && <p className="learning-evidence__missing">Add a safely handled local observation with season, method, and habitat context to review this answer. Your first answer remains saved.</p>}
  </section>;
}
