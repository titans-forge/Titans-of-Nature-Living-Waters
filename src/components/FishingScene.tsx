import { useState, type CSSProperties } from 'react';
import type { ExpeditionState, Venue } from '../types';
import { getInteractionCue, hasLostFish, getCurrentEncounter, getFightProfile, getPressureFeedback } from '../game/engine';
import { getInteractionKind, hasEarlierCompletedEncounter, needsSnagApproach } from '../game/interactions';
import { getInteractionPresentation } from '../game/interactionPresentation';
import { getEncounterArtwork } from '../data/encounterArtwork';
import { liveFishSpriteByEncounterId, type LiveFishSpecies } from '../data/liveFishSprites';
import { getAnglingCue, getAnglingPose, getAnglingWindow } from '../game/angling';
import { getDecodedLiveFishView, getLiveFishMotion, getLiveFishTransform, getLiveFishView, type LiveFishMotion } from '../game/fishMotion';
import { UnderwaterFishingScene } from './UnderwaterFishingScene';
import { supportsUnderwaterFishing } from '../game/underwaterMotion';
import { underwaterHabitatByVenue } from '../data/underwaterHabitats';

function PilotFish({ species }: { species: LiveFishSpecies }) {
  return <g className={`angling-fish angling-fish--${species}`} data-species={species}>
    {species === 'peacock-bass' ? <>
      <path className="angling-fish__body" d="M-5 0Q-2 -3.1 3 -2Q6 -1.2 6 0Q4.8 2.6 -1 2.6Q-4 2 -5 0L-8 -2.5L-7.3 0L-8 2.5Z" />
      <path className="angling-fish__fin" d="M-2 -2.5L-1 -4L2 -3.5L3 -2M0 2.5L-1 4L2 2.4" />
      <path className="angling-fish__bars" d="M-2.6 -2V2M-.2 -2.6V2.4M2.4 -2.4V2" />
      <circle className="angling-fish__tail-eye" cx="-4.5" cy="0" r=".9" />
    </> : species === 'common-snook' ? <>
      <path className="angling-fish__body" d="M-5 0Q-2 -1.9 4 -1.2L6 -.3L5 .9Q0 2 -5 0L-8 -2.4L-7 0L-8 2.4Z" />
      <path className="angling-fish__fin" d="M-1 -1.5L0 -3L1 -1.7M2 -1.6L3 -2.8L4 -1.2M0 1.3L1 3L2 1.2" />
      <path className="angling-fish__stripe" d="M-5 0Q0 -.1 5 -.2" />
    </> : species === 'giant-snakehead' ? <>
      <path className="angling-fish__body" d="M-6 0Q-3 -1.5 4 -1L6 -.5L5 .7Q-1 1.7 -6 0L-8 -1.3Q-9 0 -8 1.3Z" />
      <path className="angling-fish__fin" d="M-5 -1L-4 -2L3 -1.8L4 -1M-5 1L-4 2L2 1.7L3 1" />
    </> : <>
      <path className="angling-fish__body" d="M-5 0Q-1 -2 4 -1.1L6 0Q2 2 -5 0L-8 -2L-7 0L-8 2Z" />
      <path className="angling-fish__fin" d="M-1 -1.6L1 -3.2L3 -1.5M0 1.2L1 2.7L2 1" />
      <g className="angling-fish__spots"><circle cx="-3" cy="-.6" r=".28"/><circle cx="-1.5" cy="-.9" r=".28"/><circle cx="0" cy="-.8" r=".28"/><circle cx="1.4" cy="-.5" r=".28"/><circle cx="2.7" cy="-.6" r=".28"/><circle cx="-.8" cy=".3" r=".28"/><circle cx="1.2" cy=".4" r=".28"/></g>
    </>}
    <circle className="angling-fish__eye" cx="4.6" cy="-.35" r=".32" />
  </g>;
}

function LiveFish({ species, pose }: { species: LiveFishSpecies; pose: LiveFishMotion }) {
  const sprite = liveFishSpriteByEncounterId[species];
  const turn = sprite.turn;
  const oblique = sprite.oblique;
  const view = getLiveFishView(pose);
  const [decodedSources, setDecodedSources] = useState<string[]>([]);
  const sideDecoded = decodedSources.includes(sprite.src);
  const turnDecoded = decodedSources.includes(turn.src);
  const obliqueDecoded = decodedSources.includes(oblique.src);
  const decode = (picture: HTMLImageElement, src: string) => {
    const ready = () => setDecodedSources(sources => sources.includes(src) ? sources : [...sources, src]);
    void picture.decode().then(ready).catch(() => { if (picture.complete && picture.naturalWidth > 0) ready(); });
  };
  const failed = (src: string) => setDecodedSources(sources => sources.filter(source => source !== src));
  const displayed = getDecodedLiveFishView(pose, { side: sideDecoded, oblique: obliqueDecoded, turn: turnDecoded });
  return <div className={`angling-live-fish ${pose.surface ? 'angling-live-fish--surface' : ''}`} data-species={species} data-mouth-x={pose.x} data-mouth-y={pose.y} data-artwork-view={view.artworkView} data-displayed-view={`${displayed.artworkView}${displayed.fallback ? '-fallback' : ''}`} aria-hidden="true" style={{ left: `${pose.x}%`, top: `${pose.y}%`, aspectRatio: sprite.aspectRatio, transform: `translate(-${sprite.mouthX}%, -${sprite.mouthY}%)` }}>
    <div className="angling-live-fish__orientation" data-facing={pose.facing} style={{ transformOrigin: `${sprite.mouthX}% ${sprite.mouthY}%`, transform: getLiveFishTransform(pose) }}>
      <div className={`angling-live-fish__view angling-live-fish__view--side ${sideDecoded ? 'is-decoded' : ''}`} data-view="side" data-view-opacity={view.sideOpacity} style={{ opacity: displayed.sideOpacity, transformOrigin: `${sprite.mouthX}% ${sprite.mouthY}%`, transform: `scaleX(${view.sideScaleX})` }}>
        <svg className="angling-live-fish__fallback" viewBox="-8 -5 14 10" preserveAspectRatio="none"><PilotFish species={species}/></svg>
        <div className="angling-live-fish__body" style={{ transformOrigin: '60% 50%', transform: `rotate(${pose.bodyBend}deg)` }}>
          <img className="angling-live-fish__piece angling-live-fish__middle" src={sprite.src} alt="" decoding="async" draggable={false} style={{ clipPath: 'inset(0 39% 0 28%)' }}/>
          <div className="angling-live-fish__tail" style={{ transformOrigin: '30% 50%', transform: `rotate(${pose.tailBend}deg)` }}>
            <img className="angling-live-fish__piece" src={sprite.src} alt="" decoding="async" draggable={false} style={{ clipPath: 'inset(0 69% 0 0)' }}/>
          </div>
        </div>
        <img className="angling-live-fish__piece angling-live-fish__head" src={sprite.src} alt="" decoding="async" draggable={false} style={{ clipPath: 'inset(0 0 0 59%)' }} onError={() => failed(sprite.src)} onLoad={event => decode(event.currentTarget, sprite.src)}/>
      </div>
      <div className={`angling-live-fish__view angling-live-fish__view--oblique ${obliqueDecoded ? 'is-decoded' : ''}`} data-view="oblique" data-view-opacity={view.obliqueOpacity} style={{ left: `${sprite.mouthX}%`, top: `${sprite.mouthY}%`, width: `${oblique.widthScale * 100}%`, height: 'auto', aspectRatio: oblique.aspectRatio, opacity: displayed.obliqueOpacity, transformOrigin: `${oblique.mouthX}% ${oblique.mouthY}%`, transform: `translate(-${oblique.mouthX}%, -${oblique.mouthY}%) scaleX(${view.obliqueScaleX})`, right: 'auto', bottom: 'auto' }}>
        <img className="angling-live-fish__piece angling-live-fish__oblique" src={oblique.src} alt="" decoding="async" draggable={false} onError={() => failed(oblique.src)} onLoad={event => decode(event.currentTarget, oblique.src)}/>
      </div>
      <div className={`angling-live-fish__view angling-live-fish__view--turn ${turnDecoded ? 'is-decoded' : ''}`} data-view="turn" data-view-opacity={view.turnOpacity} style={{ left: `${sprite.mouthX}%`, top: `${sprite.mouthY}%`, width: `${turn.widthScale * 100}%`, height: 'auto', aspectRatio: turn.aspectRatio, opacity: displayed.turnOpacity, transform: `translate(-${turn.mouthX}%, -${turn.mouthY}%)`, right: 'auto', bottom: 'auto' }}>
        <img className="angling-live-fish__piece angling-live-fish__turn" src={turn.src} alt="" decoding="async" draggable={false} onError={() => failed(turn.src)} onLoad={event => decode(event.currentTarget, turn.src)}/>
      </div>
    </div>
  </div>;
}

/** State-driven illustration: never advances the simulation or changes a record. */
export function FishingScene({ state, venue, paused: scenePaused, engaged = false, ready = true }: { state: ExpeditionState; venue: Venue; paused: boolean; engaged?: boolean; ready?: boolean }) {
  if (supportsUnderwaterFishing(state, venue)) {
    const habitat = underwaterHabitatByVenue[venue.id];
    const position = venue.habitats.find(item => item.id === state.zoneId)?.position;
    return <UnderwaterFishingScene state={state} venue={venue} paused={scenePaused} engaged={engaged} ready={ready} habitatSrc={habitat?.src} habitatTint={habitat?.tint} habitatFocus={position === 'left' ? .2 : position === 'right' ? .8 : .5}/>;
  }
  const paused = scenePaused || !ready;
  const encounter = getCurrentEncounter(state)!;
  const kind = getInteractionKind(state, venue);
  const presentation = getInteractionPresentation(kind);
  const earlierCompleted = hasEarlierCompletedEncounter(state, venue);
  const fish = !earlierCompleted && kind === 'fish';
  const physical = !earlierCompleted && (fish || kind === 'bycatch' || kind === 'snag');
  const profile = getFightProfile(state);
  const giant = encounter.id === 'arapaima' || encounter.id === 'beluga-research';
  const lost = hasLostFish(state);
  const anglingWindow = !earlierCompleted ? getAnglingWindow(state, venue) : null;
  const pose = anglingWindow ? getAnglingPose(state, anglingWindow) : null;
  const cue = state.lineResolved || lost ? null : anglingWindow ? getAnglingCue(anglingWindow) : getInteractionCue(state);
  const assessing = needsSnagApproach(state, venue);
  const running = (anglingWindow ? !anglingWindow.engage : state.fightPhase === 'run') && !state.lineResolved;
  const progress = state.interactionProgress / 100;
  const x = fish ? 65 - progress * 23 + (running ? 5 : -3) : kind === 'snag' ? 60 - progress * 13 : 55;
  const y = fish ? encounter.id === 'giant-snakehead' ? 64 + progress * 19 : 56 + progress * 25 : 53;
  const pressure = getPressureFeedback(state);
  const artwork = state.lineResolved ? getEncounterArtwork(state, venue) : null;
  const liveSpecies = fish && (anglingWindow || encounter.id === 'giant-snakehead') && Object.hasOwn(liveFishSpriteByEncounterId, encounter.id) ? encounter.id as LiveFishSpecies : null;
  const previousWindow = anglingWindow ? getAnglingWindow({ ...state, anglingBeat: Math.max(0, state.anglingBeat - anglingWindow.elapsed - 1) }, venue) : null;
  const livePose = liveSpecies ? getLiveFishMotion(state, liveSpecies, anglingWindow, previousWindow) : null;
  const targetX = livePose?.x ?? pose?.x ?? x;
  const targetY = livePose?.y ?? pose?.y ?? y;
  const label = lost ? 'The line broke' : state.lineResolved ? earlierCompleted ? 'Earlier field encounter' : presentation.complete : assessing ? 'Assess the snag before pulling' : anglingWindow?.instruction ?? presentation.instructions[running ? 0 : 1];
  const habitat = venue.habitats.find(item => item.id === state.zoneId);
  const rodX = pose ? 33 - pose.load * 4 : 33;
  const rodY = pose ? 49 + pose.load * 8 : 49;
  const anglingRod = `M12 100Q${35 + (pose?.load ?? 0) * 3} 64 ${rodX} ${rodY}`;
  const anglingLine = `M${rodX} ${rodY}Q${(rodX + targetX) / 2} ${rodY + 12 * (1 - (pose?.load ?? 0))} ${targetX} ${targetY}`;
  const classicLine = `M12 106 Q${state.lineTension < pressure.safeMin ? 15 : 31} ${state.lineTension < pressure.safeMin ? 36 : 81} ${targetX} ${targetY}`;
  return <div className={`fishing-scene ${anglingWindow ? 'fishing-scene--angling-pilot' : ''} ${paused || lost || assessing ? 'fishing-scene--paused' : ''} ${cue ? 'is-warning' : ''} ${running ? 'is-running' : 'is-reeling'} ${!physical ? 'is-survey' : ''} kind-${kind} profile-${profile.id}`} style={{ backgroundImage: `url(${venue.habitatImage})` }}>
    <div className="water-light" aria-hidden="true" />
    <svg className="fishing-water" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {anglingWindow && pose ? <>
        <g className="angling-habitat-cue" data-habitat={state.zoneId}><path d={state.zoneId === 'roots' || state.zoneId === 'mangroves' ? 'M89 43Q83 66 88 89' : state.zoneId === 'seagrass' ? 'M65 88Q80 82 98 89' : 'M79 43Q88 62 80 79L79 74M80 79L85 76'}/></g>
        <path className={`angling-rod ${engaged && !paused ? 'angling-rod--responding' : ''}`} d={anglingRod} style={{ d: `path("${anglingRod}")` } as CSSProperties} data-load={pose.load}/>
        {!lost && <path className={`angling-line ${state.lineTension > pressure.safeMax ? 'is-strained' : ''}`} d={anglingLine} style={{ d: `path("${anglingLine}")` } as CSSProperties}/>}
        <g className="angling-target" transform={`translate(${targetX} ${targetY})`} data-behavior={anglingWindow.id} data-beat={state.anglingBeat}>
          {(livePose?.surface ?? pose.surface) && <g className="angling-surface"><ellipse rx="9" ry="3"/><path d="M-6 -3L-7 -5M0 -4V-6M6 -3L7 -5"/></g>}
          {!lost && <circle className="angling-mouth-joint" r=".2"/>}
        </g>
      </> : <>
      {physical && !lost && <path className={`fishing-line ${state.lineTension > pressure.safeMax ? 'is-strained' : ''}`} d={classicLine} style={livePose ? { d: `path("${classicLine}")` } as CSSProperties : undefined} />}
      {!earlierCompleted && <g className="water-target" style={{ transform: `translate(${targetX}px, ${targetY}px)` }}>
        <ellipse className="water-ring ring-one" rx="5" ry="2" /><ellipse className="water-ring ring-two" rx="8" ry="3" />
        {liveSpecies ? null : fish || kind === 'bycatch' && encounter.type === 'fish' ? <g className="fish-shadow" transform={giant ? 'scale(1.8 1.2)' : undefined}><path d={encounter.id === 'beluga-research' ? 'M-4 0 Q0 -1.6 5.5 0 Q0 1.6 -4 0 L-6 -2.5 L-5.5 1.2Z' : 'M-4 0 Q0 -2.4 4 0 Q0 2.4 -4 0 L-6 -1.8 L-6 1.8Z'} /><path d="M-1 -1L1 -2.4 2 -1" /></g>
          : kind === 'bycatch' ? <g className="incident-shadow"><ellipse rx="3" ry="2.4"/><path d="M3 0L5 0M-2 -2L-4 -3M2 -2L4 -3M-2 2L-4 3M2 2L4 3"/></g>
          : kind === 'snag' ? <g className="snag-shadow"><path d="M-5 3L4 -3M-2 1L-4 -2M1 -1L4 1"/><path className="snag-loop" d="M-3 0C-4 -4 4 -4 3 0C2 4 -4 4 -3 0"/></g>
          : kind === 'camera' ? <g className="camera-marker"><path d="M-5 -3H-3M-5 -3V-1M5 -3H3M5 -3V-1M-5 3H-3M-5 3V1M5 3H3M5 3V1"/><circle r="1"/></g>
          : kind === 'telemetry' ? <g className="receiver-marker"><circle className="survey-point" r="1"/><circle className="survey-ring" r="4"/><circle className="receiver-ping" r="7"/></g>
          : <g className="sampler-marker"><path d="M-1 -4H1V-2L2 -1V4H-2V-1L-1 -2Z"/><path d="M-2 1H2"/></g>}
      </g>}
      </>}
    </svg>
    {liveSpecies && livePose && !lost && <LiveFish species={liveSpecies} pose={livePose}/>}
    <div className="scene-caption"><small>{venue.shortTitle} · {earlierCompleted ? "Earlier field record" : anglingWindow?.label ?? profile.label}</small><strong>{label}</strong><span>{Math.round(state.interactionProgress)}% {earlierCompleted ? "previous interaction" : presentation.recorded}{state.assistMode ? ' · Untimed' : ''}</span>{anglingWindow && (cue || paused && !state.lineResolved) && <span className="angling-scene-cue">{paused && !state.lineResolved ? 'Paused · ' : ''}{cue}</span>}</div>
    {anglingWindow && <div className="angling-habitat-label">{habitat?.name} · behavior schematic</div>}
    {artwork && <figure className={`landed-reveal encounter-artwork encounter-artwork--${artwork.purpose}`}><img src={artwork.src} alt={artwork.alt} decoding="async" style={{ objectPosition: artwork.objectPosition }} /><figcaption>{encounter.name}<small>{artwork.caption} · choose your response next</small></figcaption></figure>}
  </div>;
}
