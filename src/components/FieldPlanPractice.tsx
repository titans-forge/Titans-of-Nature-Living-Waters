import { useState } from 'react';

const plans = [
  { id: 'roots', label: 'Inspect the sheltered roots for young fish and food.', feedback: 'This can describe nursery use, but it does not show whether fish can leave. Add an outlet observation when testing return access.' },
  { id: 'outlet', label: 'Observe the outlet, noting depth, flow direction and fish movement.', feedback: 'This targets the connection the question asks about. Record those conditions together; one visit still cannot establish access throughout the falling-water season.' },
  { id: 'channel', label: 'Survey the main channel for adult fish and deeper refuge.', feedback: 'This can describe refuge habitat, but adults in the channel do not show whether the nursery outlet remains usable. Check the connection itself.' },
];
export function FieldPlanPractice() {
  const [chosen, setChosen] = useState<string | null>(null);
  return <section className="field-plan-practice" aria-label="Field plan practice">
    <small>Optional practice · no points or saved grade</small>
    <h3>Which observation answers the next question?</h3>
    <p>Floodwater is falling. A nursery margin joins the main river through one shallow outlet. Your team has time for one equal-duration survey and wants to know whether fish still have a route back out.</p>
    <div>{plans.map(plan => <button key={plan.id} aria-pressed={chosen === plan.id} onClick={() => setChosen(plan.id)}>{plan.label}</button>)}</div>
    {chosen && <p className="field-plan-practice__feedback" role="status">{plans.find(plan => plan.id === chosen)!.feedback}</p>}
    <p className="field-plan-practice__limit">Each plan can gather useful evidence. Match the observation to the question; a single survey cannot trace the whole seasonal route.</p>
  </section>;
}
