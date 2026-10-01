import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ExternalLink, Fish, Leaf, Network } from "lucide-react";
import { venues } from "../data/venues";
import { getVenueSources } from "../data/sourceLedger";
import { getDiscoveries, parseConnections } from "../game/progress";
import type { ExpeditionState } from "../types";

export function EcosystemWeb({ state }: { state: ExpeditionState }) {
  const [venueId, setVenueId] = useState<string | "all">(state.venueId ?? "all");
  const discoveries = useMemo(() => getDiscoveries(state, venueId), [state, venueId]);
  const [selectedId, setSelectedId] = useState(state.venueId && state.encounterId ? `${state.venueId}:${state.encounterId}` : discoveries[0]?.journalId ?? null);

  useEffect(() => {
    if (!discoveries.some((item) => item.journalId === selectedId)) setSelectedId(discoveries[0]?.journalId ?? null);
  }, [discoveries, selectedId]);

  const selected = discoveries.find((item) => item.journalId === selectedId) ?? discoveries[0];
  const links = selected ? parseConnections(selected) : [];
  const sources = selected ? getVenueSources(selected.venue.id) : [];

  const selectFilter = (id: string | "all", element: HTMLButtonElement) => { setVenueId(id); element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); };

  return <section className="ecosystem-web">
    <div className="web-filters" aria-label="Filter ecosystem discoveries"><button className={venueId === "all" ? "active" : ""} onClick={(event) => selectFilter("all", event.currentTarget)}>All waters</button>{venues.map((venue) => <button className={venueId === venue.id ? "active" : ""} onClick={(event) => selectFilter(venue.id, event.currentTarget)} key={venue.id}>{venue.shortTitle}</button>)}</div>
    {!selected ? <div className="empty-web"><Network /><h3>No relationships mapped yet.</h3><p>Complete an expedition to reveal its fish, plants, water, and fieldcraft connections.</p></div> : <div className="web-workspace">
      <nav aria-label="Discovered subjects">{discoveries.map((item) => <button className={item.journalId === selected.journalId ? "active" : ""} onClick={() => setSelectedId(item.journalId)} key={item.journalId}><span>{item.encounter.type === "plant" ? <Leaf /> : <Fish />}</span><div><small>{item.venue.shortTitle}</small><strong>{item.encounter.name}</strong></div></button>)}</nav>
      <div className="relationship-map" aria-label={`${selected.encounter.name} ecosystem relationships`}>
        <header><small>{selected.venue.title}</small><span>{selected.encounter.type === "plant" ? <Leaf /> : <Fish />}</span><h3>{selected.encounter.name}</h3>{selected.encounter.scientificName && <em>{selected.encounter.scientificName}</em>}</header>
        <div className="relationship-branches">{links.map((link) => <div key={link.id}><span>{link.from}</span><ArrowRight aria-hidden="true" /><strong>{link.to}</strong></div>)}</div>
        <p>{selected.encounter.ecology}</p>
        <section className="source-panel"><h4>Sources and field limits</h4>{sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><div><strong>{source.title}</strong><span>{source.authority} · checked {source.accessedAt}</span><p>{source.supports}</p></div><ExternalLink aria-hidden="true" /></a>)}{selected.venue.sourceNotes.map((note) => <p className="source-note" key={note}>{note}</p>)}<small>These references support the educational model. They do not replace current permits, protected-area rules, or local fishing regulations.</small></section>
      </div>
    </div>}
  </section>;
}
