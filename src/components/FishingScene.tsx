import type { ExpeditionState, Venue } from '../types';
import { getFishCue, hasLostFish, getCurrentEncounter, getFightProfile, getPressureFeedback } from '../game/engine';
import { catchPhotoByEncounterId } from '../data/catchPhotos';

/** State-driven illustration: never advances the simulation or changes a catch. */
export function FishingScene({ state, venue, paused }: { state: ExpeditionState; venue: Venue; paused: boolean }) {
  const encounter = getCurrentEncounter(state)!;
  const survey = venue.gearSets.find(g => g.id === state.gearId)?.hook === 'No hook';
  const fish = encounter.type === 'fish' && !survey;
  const profile = getFightProfile(state);
  const giant = encounter.id === "arapaima" || encounter.id === "beluga-research";
  const lost = hasLostFish(state);
  const cue = getFishCue(state);
  const running = state.fightPhase === 'run' && !state.lineResolved;
  const progress = state.interactionProgress / 100;
  const x = fish ? 65 - progress * 23 + (running ? 5 : -3) : 55;
  const y = fish ? 56 + progress * 25 : 53;
  const pressure = getPressureFeedback(state);
  const photo = !survey && fish && state.lineResolved ? catchPhotoByEncounterId[encounter.id] : null;
  const label = lost ? "The fish got away" : state.lineResolved ? fish ? 'Alongside the boat' : 'Observation recorded' : fish ? running ? 'Let the fish run' : 'Bring it closer' : running ? 'Wait for a clear signal' : 'Record the stable signal';
  return <div className={`fishing-scene ${paused || lost ? 'fishing-scene--paused' : ''} ${cue ? 'is-warning' : ''} ${running ? 'is-running' : 'is-reeling'} ${survey || !fish ? 'is-survey' : ''} profile-${profile.id}`} style={{ backgroundImage: `url(${venue.habitatImage})` }}>
    <div className="water-light" aria-hidden="true" />
    <svg className="fishing-water" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {!survey && !lost && <path className={`fishing-line ${pressure.label === 'Strained' ? 'is-strained' : ''}`} d={`M12 106 Q${pressure.label === 'Slack' ? 15 : 31} ${pressure.label === 'Slack' ? 36 : 81} ${x} ${y}`} />}
      <g className="water-target" style={{ transform: `translate(${x}px, ${y}px)` }}>
        <ellipse className="water-ring ring-one" rx="5" ry="2" /><ellipse className="water-ring ring-two" rx="8" ry="3" />
        {fish ? <g className="fish-shadow" transform={giant ? "scale(1.8 1.2)" : undefined}><path d={encounter.id === "beluga-research" ? "M-4 0 Q0 -1.6 5.5 0 Q0 1.6 -4 0 L-6 -2.5 L-5.5 1.2Z" : "M-4 0 Q0 -2.4 4 0 Q0 2.4 -4 0 L-6 -1.8 L-6 1.8Z"} /><path d="M-1 -1L1 -2.4 2 -1" /></g> : <><circle className="survey-point" r="1"/><circle className="survey-ring" r="4"/></>}
      </g>
    </svg>
    <div className="scene-caption"><small>{venue.shortTitle} · {profile.label}</small><strong>{label}</strong><span>{fish ? `${Math.round(state.interactionProgress)}% brought in` : `${Math.round(state.interactionProgress)}% recorded`}{state.assistMode ? ' · Untimed' : ''}</span></div>
    {photo && <figure className="landed-reveal"><img src={photo} alt={`${encounter.name}, illustrated catch reconstruction`} /><figcaption>{encounter.name}<small>Reconstruction · choose how to handle it next</small></figcaption></figure>}
  </div>;
}
