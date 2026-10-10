import type { Venue } from '../types';
export function GuideNotebook({ venue }: { venue: Venue }) {
  return <details className="guide-notebook"><summary>More from {venue.guide.name}</summary>
    <p>Revisit the guide’s answers, including questions you did not choose before departure.</p>
    {venue.questions.map(question => <details key={question.id}><summary>{question.prompt}</summary><p>{question.answer}</p><p>{question.hint}</p><small>Research note: {question.source}</small></details>)}
  </details>;
}
