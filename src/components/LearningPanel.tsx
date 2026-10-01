import { getLearningQuestion, recordLearningAnswer } from "../data/learning";
import type { ExpeditionState } from "../types";

export function LearningPanel({ state, questionId, setState, reveal = true }: {
  state: ExpeditionState; questionId: string; setState: React.Dispatch<React.SetStateAction<ExpeditionState>>; reveal?: boolean;
}) {
  const question = getLearningQuestion(questionId);
  if (!question) return null;
  const retrospective = question.phase === "prediction" && state.observations.some((item) => questionId === `${item.venueId}:prediction`);
  const answer = state.learningAnswers.find((item) => item.questionId === questionId);
  return <section className="learning-panel" aria-label={question.phase === "prediction" ? "Make a prediction" : "Connect the evidence"}>
    <small>{question.phase === "prediction" ? retrospective && !answer ? "Looking back · explain the observation" : answer ? "Your initial prediction" : "Before you observe · make a prediction" : question.phase === "reflection" ? "After you observe · explain the connection" : "Research conclusion · compare two waters"}</small>
    <h2>{question.prompt}</h2>
    {!answer ? <><p>Choose your best explanation. Your first answer is saved so you can see what changed.</p><div className="learning-options">{question.options.map((option) => <button key={option.id} onClick={() => setState((current) => recordLearningAnswer(current, questionId, option.id))}>{option.text}</button>)}</div></> : <div className="learning-feedback" role="status">
      <p><strong>Your first answer:</strong> {question.options.find((option) => option.id === answer.answerId)?.text}</p>
      {reveal ? <><strong>{answer.correct ? "Your explanation fits the model." : "Here is a connection to revisit."}</strong><p>{question.explanation}</p><small>A game observation can illustrate a mechanism. It cannot establish a real population trend.</small></> : <p>Prediction recorded. Gather an observation, then compare it with the explanation in your field journal.</p>}
    </div>}
  </section>;
}
