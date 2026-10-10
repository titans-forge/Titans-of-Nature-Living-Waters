import { useId, useState } from 'react';
import { getVisitComparison, type VisitRecordFacts } from '../game/visitComparison';
import type { ExpeditionState, Venue } from '../types';

function RecordFacts({ facts, label }: { facts: VisitRecordFacts; label: string }) {
  return <article className="visit-comparison__record">
    <small>{label} · expedition {facts.record.expedition} · record {facts.record.id}</small>
    <strong>{facts.subject}</strong>
    <dl><dt>Season</dt><dd>{facts.season}</dd><dt>Station</dt><dd>{facts.station}</dd>
      <dt>Kit</dt><dd>{facts.kit}</dd><dt>Recorded method</dt><dd>{facts.method}</dd></dl>
  </article>;
}

export function VisitComparison({ state, venue }: { state: ExpeditionState; venue: Venue }) {
  const selectId = useId();
  const [selection, setSelection] = useState<{ venueId: string; latestId: number; priorId: number } | null>(null);
  const suggested = getVisitComparison(state, venue);
  if (!suggested) return null;
  const currentSelection = selection?.venueId === venue.id && selection.latestId === suggested.latest.record.id ? selection.priorId : undefined;
  const comparison = currentSelection === undefined ? suggested : getVisitComparison(state, venue, currentSelection)!;
  if (!comparison.candidates.length) return <p className="visit-comparison__empty">This is your first completed record at {venue.shortTitle}. Return for another visit to compare its subject, station, kit and season.</p>;
  const { previous, latest, nextVisit } = comparison;
  return <section className="visit-comparison" aria-label="Compare field records at this water">
    <small>{comparison.acrossVisits ? 'Across visits to the same water' : 'Within this expedition'}</small>
    <h3>{comparison.acrossVisits ? 'What changed on this visit?' : 'Compare the two field attempts'}</h3>
    {(comparison.candidates.length > 1 || comparison.selectionUnavailable) && <label htmlFor={selectId}>Compare with earlier record
      <select id={selectId} value={previous?.record.id ?? ''} onChange={event => setSelection({ venueId: venue.id,
        latestId: latest.record.id, priorId: Number(event.target.value) })}>
        {!previous && <option value="" disabled>Choose an available record</option>}
        {comparison.candidates.map(candidate => <option value={candidate.record.id} key={candidate.record.id}>
          Record {candidate.record.id} · expedition {candidate.record.expedition} · {candidate.season} · {candidate.subject} · {candidate.station}
        </option>)}
      </select>
    </label>}
    {comparison.selectionUnavailable && <p role="status">The selected earlier record is unavailable. Choose another record to compare.</p>}
    {previous && <>
      <p className="visit-comparison__change" aria-live="polite">{comparison.changes}</p>
      <details className="visit-comparison__details"><summary>Record facts and comparison limits</summary>
        <div className="visit-comparison__records"><RecordFacts facts={previous} label="Earlier record" /><RecordFacts facts={latest} label="Latest completed record" /></div>
        <p><strong>What this leaves open:</strong> {comparison.limitation}</p>
        <p>These simulated records preserve identity, route and handling. They do not contain oxygen or salinity measurements, animal counts, or evidence that one condition caused another.</p>
        <p>Handling recorded: earlier — {previous.handling}; latest — {latest.handling}.</p>
      </details>
    </>}
    {nextVisit && <p className="visit-comparison__next"><strong>{nextVisit.afterReturn ? 'Next visit after community return' : 'Next visit'} · {nextVisit.season}:</strong> {nextVisit.question} <span>Investigate with {nextVisit.kit} at {nextVisit.station} and record what actually happens.</span></p>}
  </section>;
}
