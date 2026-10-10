import { useId } from "react";
import type { ExpeditionState, Venue } from "../types";

export function supportsSchematicCastPlacement(state: ExpeditionState, venue: Venue): boolean {
  return (venue.id === "amazon" || venue.id === "florida-bay")
    && venue.gearSets.find(gear => gear.id === state.gearId)?.method === "angling"
    && venue.habitats.some(habitat => habitat.id === state.zoneId);
}

/** The same accuracy calculation used by castLine; this view does not route encounters. */
export function getSchematicCastAccuracy(power: number, ideal: number, width: number): number {
  return Math.max(0, 100 - Math.abs(ideal - power) * (60 / width));
}

export function CastPlacement({ state, venue, power, ideal, width, onPowerChange, disabled = false, confirmation }: {
  state: ExpeditionState; venue: Venue; power: number; ideal: number; width: number;
  onPowerChange: (power: number) => void; disabled?: boolean; confirmation?: React.ReactNode;
}) {
  const id = useId();
  const habitat = venue.habitats.find(item => item.id === state.zoneId);
  const gear = venue.gearSets.find(item => item.id === state.gearId);
  const cue = state.zoneId === "roots" || state.zoneId === "mangroves" ? "roots" : state.zoneId === "seagrass" ? "grass" : state.zoneId === "channel" || state.zoneId === "creek" ? "current" : "bank";
  const targetLeft = Math.max(0, Math.min(100 - width, ideal - width / 2));
  const accuracy = getSchematicCastAccuracy(power, ideal, width);
  const accurate = accuracy >= 70;
  const workable = accuracy >= 40;
  const result = accurate ? "Accurate · calmer opening pressure" : workable ? "Workable · standard opening pressure" : "Wide · higher opening pressure";
  const coordinate = (value: number) => 30 + value * 5.4;
  const helpId = `${id}-help`, feedbackId = `${id}-feedback`;
  return <section className="cast-placement" aria-label="Casting distance schematic">
    <header><h2>Casting distance • schematic</h2><span>{power} / 100</span></header>
    <figure className="cast-placement__diagram">
      <svg viewBox="0 0 600 140" role="img" aria-label={`Marked approach in ${habitat?.name ?? "the selected habitat"}. The gold band is the accurate target; the marker shows the relative casting distance.`}>
        <defs><linearGradient id={`${id}-water`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#233d32"/><stop offset="1" stopColor="#102b31"/></linearGradient></defs>
        <rect x="0" y="0" width="600" height="140" rx="8" fill={`url(#${id}-water)`}/>
        {[25, 55, 85, 115].map(y => <path key={y} d={`M16 ${y} Q150 ${y - 8} 300 ${y} T584 ${y}`} fill="none" stroke="#527a70" strokeWidth="1" opacity=".45"/>)}
        <g className={`cast-placement__cue cast-placement__cue--${cue}`}>
          {cue === "roots" ? <><path d="M578 0L550 38 576 57M552 0L532 31 540 54M538 0L509 24 500 50M530 19L490 13M549 31L568 40" fill="none" stroke="#9b9370" strokeWidth="5"/><text x="574" y="127" textAnchor="end">Root margin</text><text x="26" y="127">Clear water</text></>
            : cue === "grass" ? <><path d="M469 107Q460 84 450 82M470 107Q483 74 490 69M497 109Q487 85 480 82M498 109Q515 85 520 81M526 110Q528 77 539 71M554 110Q545 90 538 88M556 110Q569 83 579 82" fill="none" stroke="#98bba3" strokeWidth="4"/><text x="576" y="29" textAnchor="end">Seagrass patch</text><text x="26" y="127">Clear opening</text></>
              : cue === "current" ? <><path d="M236 28H286L275 21M356 28H406L395 21M470 111H520L509 104" fill="none" stroke="#a9e5d5" strokeWidth="3"/><text x="574" y="127" textAnchor="end">Current seam</text><text x="26" y="127">Clear water</text></>
                : <><path d="M550 0Q532 40 548 62L600 76V0Z" fill="#6b6950" fillOpacity=".6"/><text x="574" y="127" textAnchor="end">Soft-bank margin</text><text x="26" y="127">Open water</text></>}
        </g>
        <rect className="cast-placement__band" x={coordinate(targetLeft)} y="20" width={width * 5.4} height="100" rx="5" fill="#dca94a" fillOpacity=".25" stroke="#f1c56e" strokeWidth="3"/>
        <path d="M30 70H570" fill="none" stroke="#dce8dd" strokeWidth="2" strokeDasharray="6 7"/>
        {[0, 25, 50, 75, 100].map(value => <path key={value} d={`M${coordinate(value)} 63v14`} stroke="#dce8dd" strokeWidth="2"/>)}
        <path d={`M30 70H${coordinate(power)}`} fill="none" stroke="#a9e5d5" strokeWidth="4"/>
        <circle cx="30" cy="70" r="7" fill="#dce8dd"/>
        <g className="cast-placement__marker" transform={`translate(${coordinate(power)} 70)`}><circle r="13" fill="#0a1714" stroke="#f4f5e9" strokeWidth="3"/><circle r="5" fill="#a9e5d5"/></g>
      </svg>
      <figcaption><span>Near · 0</span><span>Marked habitat approach</span><span>Far · 100</span></figcaption>
    </figure>
    <div className="cast-placement__key"><span><i aria-hidden="true"/>Gold target band</span><span>Guide placement: {ideal} / 100</span></div>
    {state.assistMode && <div className="cast-placement__manual">
      <label htmlFor={`${id}-distance`}>Choose casting distance <strong>{power} / 100</strong></label>
      <input id={`${id}-distance`} type="range" min={8} max={96} step={1} value={power} disabled={disabled}
        aria-describedby={`${feedbackId} ${helpId}`} aria-valuetext={`${power} out of 100; ${result}`}
        onChange={event => onPowerChange(Number(event.currentTarget.value))}/>
      <button type="button" className="secondary" disabled={disabled} onClick={() => onPowerChange(ideal)}>Use guide placement</button>
    </div>}
    <p id={feedbackId} className={`cast-placement__feedback ${accurate ? "cast-placement__feedback--accurate" : ""}`} data-accuracy={accuracy}>
      <strong>{accuracy.toFixed(1)}% cast accuracy</strong><span>{result}</span>
    </p>
    {confirmation}
    <details className="cast-placement__context-disclosure"><summary>{habitat?.name ?? "Selected water"} · {gear?.name ?? "Field kit"}</summary><dl className="cast-placement__context"><div><dt>Habitat</dt><dd>{habitat?.name ?? "Selected water"}</dd></div><div><dt>Field kit</dt><dd>{gear?.name ?? "Selected kit"}</dd></div><div><dt>Lure</dt><dd>{gear?.lure ?? "Selected lure"}</dd></div></dl></details>
    <details id={helpId} className="cast-placement__help"><summary>How placement works</summary><p>Distance is relative along this schematic approach. Accuracy follows how close the marker is to the guide placement; the gold band gives at least 70% accuracy. For a still marker, choose untimed assistance below.</p></details>
  </section>;
}
