import { useState } from "react";
import { ArrowRight, Check, Compass } from "lucide-react";
import { researchProjects } from "../data/researchProjects";
import { venues } from "../data/venues";
import { getProjectEvidenceStatus } from "../game/research";
import { LearningPanel } from "./LearningPanel";
import { FieldPlanPractice } from "./FieldPlanPractice";
import type { ExpeditionState } from "../types";
export { safeObservation } from "../game/research";

// Approximate expedition locations on a schematic longitude/latitude grid.
const locations: Record<string, [number, number]> = {
  amazon: [-60,-3], okavango: [23,-19], "tonle-sap": [104,13], "florida-bay": [-81,25],
  "alaska-kelp": [-135,58], baikal: [108,53], "lake-holiday": [-78,39], nile: [32,25],
  euphrates: [47,31], danube: [29,45], ganges: [89,23], "seto-inland-sea": [133,34], "yellow-river-delta": [119,38],
  galapagos: [-90,-1], "great-barrier-reef": [147,-18],
};
export function ResearchAtlas({ state, setState, onSelect, selectedProjectId, onProjectSelect }: { state: ExpeditionState; setState: React.Dispatch<React.SetStateAction<ExpeditionState>>; onSelect: (id: string) => void; selectedProjectId?: string | null; onProjectSelect?: (id: string) => void }) {
  const [localSelected, setLocalSelected] = useState(researchProjects[0].id);
  const selected = researchProjects.some(item => item.id === selectedProjectId) ? selectedProjectId! : localSelected;
  const chooseProject = (id: string) => { setLocalSelected(id); onProjectSelect?.(id); };
  const chooseStop = (id: string) => { onProjectSelect?.(project.id); onSelect(id); };
  const project = researchProjects.find((item) => item.id === selected)!;
  const evidenceStatus = getProjectEvidenceStatus(state, project.id);
  const statuses = researchProjects.map(item => getProjectEvidenceStatus(state, item.id));
  const supportedReports = statuses.filter(item => item.supported).length;
  const attemptedReports = statuses.filter(item => item.attempted).length;
  return <section className="research-atlas" aria-labelledby="atlas-title">
    <header><div><small>A journey with a question</small><h2 id="atlas-title">One planet. Connected waters.</h2></div><span>{supportedReports} / {researchProjects.length} supported reports · {attemptedReports} attempted</span></header>
    {supportedReports === researchProjects.length && <div className="journey-complete"><strong>Three evidence-linked reports. A connected field journal.</strong><p>Your selected records support these game explanations within their stated limits. Return in another season to gather more context and review them again.</p></div>}
    <div className="atlas-map" role="img" aria-label="Schematic world map with expedition locations; select destinations using the named buttons below.">
      <svg viewBox="0 0 720 260" aria-hidden="true">
        <defs><pattern id="map-grid" width="60" height="52" patternUnits="userSpaceOnUse"><path d="M60 0H0V52" fill="none" stroke="#3d5956" strokeWidth=".5" /></pattern></defs>
        <rect width="720" height="260" fill="url(#map-grid)" />
        <g fill="#294b43" stroke="#588074" strokeWidth="1"><path d="M46 52L95 23 184 31 216 65 191 91 168 102 148 132 127 109 106 105 83 78Z"/><path d="M165 130L205 132 231 156 220 187 198 229 181 236 177 198 164 172Z"/><path d="M324 64L346 43 375 48 389 72 369 87 352 83Z"/><path d="M324 91L370 84 401 114 391 151 367 190 345 172 335 138 316 116Z"/><path d="M381 43L434 26 521 32 589 54 575 93 548 91 522 131 498 108 477 135 455 112 427 87 394 85Z"/><path d="M555 170L597 151 632 174 624 205 589 213 563 200Z"/></g>
        {researchProjects.map((item) => { const a = locations[item.venueIds[0]], b = locations[item.venueIds[1]]; if (!a || !b) return null; return <path key={item.id} d={`M${(a[0]+180)*2} ${130-a[1]*1.7} Q360 10 ${(b[0]+180)*2} ${130-b[1]*1.7}`} fill="none" stroke={item.id === selected ? "#e9bb73" : "#5e8279"} strokeWidth={item.id === selected ? 2.5 : 1} strokeDasharray="5 5" />; })}
        {venues.map((venue) => { const point = locations[venue.id]; if (!point) return null; const active = project.venueIds.includes(venue.id); return <g key={venue.id}><circle cx={(point[0]+180)*2} cy={130-point[1]*1.7} r={active ? 5 : 3} fill={active ? "#e9bb73" : "#b0d2c5"} />{active && <text x={(point[0]+180)*2+9} y={130-point[1]*1.7+4} fill="#f4ecd9" fontSize="12">{venue.shortTitle}</text>}</g>; })}
      </svg><span className="map-caption">Schematic locations · exploration, not navigation</span>
    </div>
    <div className="research-tabs" role="group" aria-label="Research journeys">{researchProjects.map((item, index) => <button aria-pressed={selected === item.id} onClick={() => chooseProject(item.id)} key={item.id}><span>0{index+1}</span>{item.title}<small className="research-tab__status">{statuses[index].supported ? "Supported" : statuses[index].attempted ? "Attempted" : "Not reviewed"}</small></button>)}</div>
    <div className="research-brief"><div><small>Research question</small><h3>{project.question}</h3><p>{project.premise}</p><p className="community-outcome"><Compass size={18} />{evidenceStatus.supported ? project.communityOutcome : evidenceStatus.attempted ? "An answer is saved. Link the required records and review the conclusion with its limitation before the story's field teams can use this comparison." : "Your task: gather the named field records, choose which ones to compare, and state what they can and cannot establish."}</p></div><div className="research-stops">{project.venueIds.map((id, index) => { const venue = venues.find((item) => item.id === id)!; const available = evidenceStatus.stops.find(stop => stop.venueId === id)!.candidates.length > 0; return <button key={id} onClick={() => chooseStop(id)}><span>{available ? <Check /> : `0${index+1}`}</span><div><strong>{venue.shortTitle}</strong><small>{available ? "Relevant full-notes record available" : "Field task still needs a relevant record"}</small><small>{project.evidenceRequirements[index].fieldTask}</small></div><ArrowRight /></button>; })}</div></div>
    {!evidenceStatus.ready && <p className="research-unlock">Use the named stops to gather the required evidence. Existing answers and other field records remain saved; they do not count as a supported report until you link the relevant records and review the conclusion.</p>}
    <LearningPanel key={project.id} state={state} setState={setState} questionId={project.id} />
    {project.id === "project:floods" && evidenceStatus.supported && <FieldPlanPractice key={`field-plan:${project.id}`} />}
  </section>;
}
