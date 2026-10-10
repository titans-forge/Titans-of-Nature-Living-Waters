import type { Dispatch, SetStateAction } from 'react';
import type { ExpeditionState, Venue } from '../types';
import { getActiveAssignment } from '../game/assignments';
import { applyFieldDecision, getFieldDecision } from '../game/fieldDecisions';

export function FieldDecision({ state, venue, setState }: {
  state: ExpeditionState;
  venue: Venue;
  setState: Dispatch<SetStateAction<ExpeditionState>>;
}) {
  const decision = getFieldDecision(state, venue);
  if (!decision) return null;
  const selected = decision.choices.find(choice => choice.selected);
  const assignment = getActiveAssignment(state);
  const offAssignment = selected && assignment && (selected.expectedEncounterId !== assignment.targetEncounterId
    || selected.gearId !== assignment.gearId || selected.habitatId !== assignment.habitatId);
  return <section className="field-decision" aria-label="Field investigation plan">
    <small>Choose what this visit investigates</small>
    <h3>{decision.question}</h3>
    <div className="field-decision__choices">{decision.choices.map(choice => <article
      className={`field-decision__choice${choice.selected ? ' is-selected' : ''}`} key={choice.id}>
      <button aria-pressed={choice.selected} disabled={Boolean(choice.blockReason)}
        onClick={() => setState(current => applyFieldDecision(current, venue, choice.id))}>
        {choice.selected ? `Current plan: ${choice.title}` : `Use plan: ${choice.title}`}<small>{choice.gear.name} · {choice.habitat.name}</small>
      </button>
      <p>{choice.question}</p>
      <p><strong>Tradeoff:</strong> {choice.tradeoff}</p>
      <details className="field-decision__evidence"><summary>What to record</summary><p>{choice.evidence}</p></details>
      {choice.blockReason && <p className="field-decision__blocked">{choice.blockReason}</p>}
    </article>)}</div>
    {selected && <p className="field-decision__selected" role="status">Current kit and station examine: {selected.question}</p>}
    {assignment && <details className="field-decision__assignment"><summary>Your field assignment: {assignment.title}</summary>
      <p>{assignment.objective}</p>
      <p>{offAssignment ? 'This setup investigates another question. ' : ''}Changing the kit and station keeps this assignment available; it does not complete it.</p>
      <p>Assignment setup: {venue.gearSets.find(gear => gear.id === assignment.gearId)?.name} · {venue.habitats.find(habitat => habitat.id === assignment.habitatId)?.name}.</p>
    </details>}
    {offAssignment && <p className="field-decision__assignment-note">This setup investigates another question. Your field assignment remains available.</p>}
    <p className="field-decision__scope">Use a plan to change your kit and station, then gather a record to test the question. You can also choose your own kit and station.</p>
    <button className="secondary field-decision__custom" onClick={() => setState(current => current.stage === 'habitat'
      ? { ...current, stage: 'gear' } : current)}>Choose a custom kit</button>
  </section>;
}

/** History already stores kit and station, not an explicit plan choice. Describe
 * that route without claiming the player chose a newly introduced decision. */
export function FieldDecisionOutcome({ state, venue }: { state: ExpeditionState; venue: Venue }) {
  const record = state.observations.filter(item => item.expedition === state.expeditionNumber && item.venueId === venue.id).at(-1);
  if (!record) return null;
  const decision = getFieldDecision({ ...state, gearId: record.gearId, zoneId: record.habitatId, seasonId: record.seasonId }, venue);
  const choice = decision?.choices.find(item => item.selected);
  if (!choice) return null;
  const encounter = venue.encounters[record.encounterId];
  if (!encounter) return null;
  const incident = Boolean(encounter.interaction) || record.encounterId !== choice.expectedEncounterId;
  return <section className="field-decision-outcome" aria-label="What this field route can show">
    <small>Connect the record to its question</small>
    <h3>This route examines: {choice.question}</h3>
    <p>Recorded: {encounter.name} at {choice.habitat.name} with {choice.gear.name}.</p>
    <p>{incident ? 'The actual record differs from the intended investigation. Describe that encounter and its handling before drawing a conclusion about the original question.' : choice.evidence}</p>
    <p><strong>Limit:</strong> {choice.tradeoff}</p>
    <p>A single simulated record describes this visit. It does not establish abundance, a complete seasonal route or real-world access.</p>
  </section>;
}
