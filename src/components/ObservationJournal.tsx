import { useState } from "react";
import { venues } from "../data/venues";
import { glossaryTerms } from "../data/glossary";
import { safeObservation } from "./ResearchAtlas";
import { LearningPanel } from "./LearningPanel";
import type { ExpeditionState } from "../types";

const reportingLabel = {
  "full-notes": "Full notes shared",
  "identity-only": "Identity only reported · context kept private",
  "private-notes": "Notes kept private",
  "pending": "Awaiting community return",
  "legacy-unknown": "Earlier record · reporting choice unknown",
};

export function ObservationJournal({ state, setState }: { state: ExpeditionState; setState: React.Dispatch<React.SetStateAction<ExpeditionState>> }) {
  const [filter, setFilter] = useState(state.venueId ?? "all");
  const entries = state.observations.filter((item) => filter === "all" || item.venueId === filter).slice().reverse();
  return <section className="observation-journal"><div className="journal-summary"><strong>{state.observations.length} recorded observations</strong><span>{state.observations.filter(safeObservation).length} carefully handled</span><span>{state.observations.filter((item) => item.shared).length} full records shared</span></div>
    <label>Filter field records <select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All waters</option>{venues.map((venue) => <option value={venue.id} key={venue.id}>{venue.shortTitle}</option>)}</select></label>
    {entries.length === 0 && <p className="empty-record">No detailed observations here yet. Earlier collections are preserved in Living connections; season and technique records begin with this edition.</p>}
    {entries.map((item) => { const venue = venues.find((v) => v.id === item.venueId)!; return <article key={item.id}><header><small>Expedition {item.expedition} · {venue.shortTitle}</small><h3>{venue.encounters[item.encounterId].name}</h3></header><dl><dt>Conditions</dt><dd>{venue.seasons.find((season) => season.id === item.seasonId)?.name}</dd><dt>Habitat</dt><dd>{venue.habitats.find((habitat) => habitat.id === item.habitatId)?.name}</dd><dt>Method</dt><dd>{venue.gearSets.find((gear) => gear.id === item.gearId)?.name}</dd><dt>Handling</dt><dd>{safeObservation(item) ? "Careful response" : "Needs review"} · {venue.encounters[item.encounterId].handling.find((option) => option.id === item.handlingId)?.label}</dd><dt>Technique</dt><dd>{item.assisted ? "Untimed assistance used" : "Timed controls"} · {item.castAccuracy}% placement · {item.controlMistakes} control mistakes</dd><dt>Community</dt><dd>{item.reportingStatus === "pending" && item.expedition !== state.expeditionNumber ? "Trip ended without a report" : reportingLabel[item.reportingStatus]}</dd></dl></article>; })}
    {filter !== "all" && state.observations.some((item) => item.venueId === filter) && <><LearningPanel state={state} setState={setState} questionId={`${filter}:prediction`} /><LearningPanel state={state} setState={setState} questionId={`${filter}:reflection`} /></>}
  </section>;
}
export function Glossary() {
  const [query, setQuery] = useState("");
  return <section className="glossary"><h3>Field language, plainly explained</h3><label>Find a term<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try flood pulse or bycatch" /></label><dl>{glossaryTerms.filter((item) => `${item.term} ${item.definition}`.toLowerCase().includes(query.toLowerCase())).map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.definition}{item.example && <p>{item.example}</p>}</dd></div>)}</dl></section>;
}
