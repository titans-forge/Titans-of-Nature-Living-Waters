import { getCurrentEncounter, getPressureFeedback, getVenue } from './engine';
import { getInteractionKind, getRoutedEncounterId } from './interactions';
import type { ExpeditionState, InteractionKind, Stage } from '../types';

export type InteractionSound = 'cast' | 'deploy' | 'pressure' | 'line-break'
  | 'fish-alongside' | 'observation-ready' | 'incident-stable' | 'line-free'
  | 'release' | 'care-recorded';
export interface InteractionSoundEvent {
  type: InteractionSound;
  kind: InteractionKind;
  variant: number;
}

// This is an authored sound disposition, not an inference from option.safe or
// the word "release" in an ID. Safe regulation-dependent retention and release
// at depth remain neutral. Unlisted/new choices default to a record click.
const surfaceReleaseHandling: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  amazon: { arapaima: 'water-release', 'peacock-bass': 'steady-release', 'silver-arowana': 'net-release', 'river-turtle': 'pliers-release' },
  okavango: { tigerfish: 'control-release', 'three-spot-tilapia': 'wet-release', 'sharptooth-catfish': 'support-release' },
  'tonle-sap': { 'giant-snakehead': 'clear-release', 'trey-riel': 'quick-release', 'ricefield-snakehead': 'supported-release', 'malayan-snail-turtle': 'waterline-release' },
  'florida-bay': { 'common-snook': 'turn-release', 'red-drum': 'wet-support', 'spotted-seatrout': 'water-release', 'mangrove-snapper': 'pliers-release' },
  'alaska-kelp': { 'coho-salmon': 'water-release', 'pacific-halibut': 'alongside-release', 'kelp-greenling': 'wet-release' },
  baikal: { 'baikal-sturgeon': 'cradle-release', 'baikal-omul': 'wet-release', 'baikal-grayling': 'supported-release' },
  'lake-holiday': { 'largemouth-bass': 'horizontal-release', bluegill: 'wet-hand-release', 'black-crappie': 'quick-release', 'channel-catfish': 'dehook-release' },
  nile: { 'nile-tilapia': 'wet-release', 'nile-perch': 'supported-release', 'african-catfish': 'dehook-release', 'nile-puffer': 'waterline-release' },
  euphrates: { bunni: 'survey-release', shabout: 'supported-release', 'mesopotamian-catfish': 'mat-release', 'euphrates-softshell': 'waterline-release' },
  ganges: { rohu: 'wet-release', hilsa: 'waterline-release', goonch: 'supported-release' },
  danube: { 'beluga-research': 'research-release', 'northern-pike': 'net-release', 'common-barbel': 'current-release' },
  'great-barrier-reef': { 'coral-trout': 'sand-release', 'giant-trevally': 'water-cradle', 'spanish-mackerel': 'alongside-release' },
  'seto-inland-sea': { 'red-seabream': 'cradle-release', 'japanese-sea-bass': 'meadow-release', 'black-rockfish': 'wall-release', 'common-octopus': 'water-release' },
  'yellow-river-delta': { 'spotted-sea-bass': 'mixing-release', 'small-yellow-croaker': 'wet-release', 'yellow-drum': 'channel-release', 'chinese-mitten-crab': 'tray-release' },
};

export function getSafeHandlingSound(input: {
  venueId: string | null; encounterId: string | null; handlingId: string | null;
  kind: InteractionKind | null; safe: boolean;
}): 'release' | 'care-recorded' | null {
  if (!input.safe) return null;
  return (input.kind === 'fish' || input.kind === 'bycatch')
    && input.venueId !== null && input.encounterId !== null && input.handlingId !== null
    && surfaceReleaseHandling[input.venueId]?.[input.encounterId] === input.handlingId
    ? 'release' : 'care-recorded';
}

interface SoundSnapshot {
  scope: string;
  encounterId: string | null;
  kind: InteractionKind | null;
  stage: Stage;
  attempt: number;
  turn: number;
  assisted: boolean;
  resolved: boolean;
  lost: boolean;
  danger: boolean;
  power: number | null;
  routedEncounter: string | null;
  recordCount: number;
  lastRecordId: number;
  handlingId: string | null;
  safeHandling: boolean;
  handlingSound: 'release' | 'care-recorded' | null;
  currentRecord: boolean;
}

export interface InteractionAudioTrace {
  previous: SoundSnapshot | null;
  enabled: boolean;
  paused: boolean;
  resetKey: number;
  at: number;
  lastPressureAt: number;
}

export const PRESSURE_SOUND_COOLDOWN_MS = 6000;
// A backgrounded/blocked event loop must not replay an old timed milestone.
export const TIMED_SOUND_GAP_MS = 1500;

export function createInteractionAudioTrace(): InteractionAudioTrace {
  return { previous: null, enabled: false, paused: true, resetKey: 0, at: 0, lastPressureAt: -Infinity };
}

function snapshot(state: ExpeditionState): SoundSnapshot {
  const venue = getVenue(state);
  const encounter = getCurrentEncounter(state);
  const kind = venue && encounter ? getInteractionKind(state, venue) : null;
  const record = state.observations.at(-1);
  const safeHandling = Boolean(encounter?.handling.find(option => option.id === state.handlingId)?.safe);
  return {
    scope: JSON.stringify([state.venueId, state.seasonId, state.expeditionNumber, state.gearId, state.zoneId]),
    encounterId: state.encounterId, kind, stage: state.stage, attempt: state.castAttempts,
    turn: state.lineTurn, assisted: state.assistMode, resolved: state.lineResolved,
    lost: kind === 'fish' && !state.lineResolved && state.lineTension >= 100,
    danger: Boolean(kind && getPressureFeedback(state).danger), power: state.castPower,
    routedEncounter: venue && state.castPower !== null ? getRoutedEncounterId(state, venue, state.castPower) : null,
    recordCount: state.observations.length, lastRecordId: record?.id ?? 0,
    handlingId: state.handlingId,
    safeHandling,
    handlingSound: getSafeHandlingSound({ venueId: state.venueId, encounterId: state.encounterId,
      handlingId: state.handlingId, kind, safe: safeHandling }),
    currentRecord: Boolean(record && record.venueId === state.venueId
      && record.expedition === state.expeditionNumber && record.seasonId === state.seasonId
      && record.habitatId === state.zoneId && record.gearId === state.gearId
      && record.encounterId === state.encounterId && record.handlingId === state.handlingId),
  };
}

function variation(current: SoundSnapshot) {
  let value = current.attempt + current.turn;
  for (const char of `${current.scope}:${current.encounterId}`) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value % 3;
}

/** Local transition observer only. resetKey must change before importing or
 * loading another save, including one with an identical attempt identity.
 * Disabled, paused and resumed snapshots establish a silent baseline, so
 * enabling sound or opening a finished save never creates a catch/release. */
export function advanceInteractionAudio(trace: InteractionAudioTrace, input: {
  state: ExpeditionState; enabled: boolean; paused: boolean; resetKey: number; now: number;
}): { trace: InteractionAudioTrace; events: InteractionSoundEvent[] } {
  const current = snapshot(input.state);
  const next: InteractionAudioTrace = {
    previous: current, enabled: input.enabled, paused: input.paused, resetKey: input.resetKey,
    at: input.now, lastPressureAt: trace.lastPressureAt,
  };
  const silent = () => ({ trace: next, events: [] as InteractionSoundEvent[] });
  const previous = trace.previous;
  if (!previous || !input.enabled || !trace.enabled || input.paused || trace.paused
    || input.resetKey !== trace.resetKey || input.now < trace.at) {
    if (input.resetKey !== trace.resetKey) next.lastPressureAt = -Infinity;
    return silent();
  }
  if (current.scope !== previous.scope) { next.lastPressureAt = -Infinity; return silent(); }
  const emit = (type: InteractionSound) => ({ trace: next, events: [{ type, kind: current.kind!, variant: variation(current) }] });

  // Actual placement UI: cast/empty -> cast/encounter. Also accept the engine's
  // direct habitat -> cast transition. No sound for species selection/browsing.
  if ((previous.stage === 'habitat' || previous.stage === 'cast') && previous.encounterId === null
    && current.stage === 'cast' && current.kind && current.encounterId === current.routedEncounter
    && current.attempt === previous.attempt + 1 && current.turn === 0 && !current.resolved
    && current.power !== null && current.recordCount === previous.recordCount) {
    next.lastPressureAt = -Infinity;
    return emit(current.kind === 'fish' ? 'cast' : 'deploy');
  }

  const sameAttempt = current.encounterId !== null && current.encounterId === previous.encounterId
    && current.kind !== null && current.kind === previous.kind && current.attempt === previous.attempt;
  if (!sameAttempt) return silent();

  // A genuine handling decision appends exactly one matching record. Safe
  // observation review is a record click, never the splash of a captured animal.
  if (previous.stage === 'handling' && current.stage === 'journal' && current.safeHandling
    && current.handlingId !== null && current.recordCount === previous.recordCount + 1
    && current.lastRecordId === previous.lastRecordId + 1 && current.currentRecord) {
    return emit(current.handlingSound ?? 'care-recorded');
  }

  const delta = current.turn - previous.turn;
  const localAdvance = previous.stage === 'cast' && current.stage === 'cast'
    && !previous.resolved && !previous.lost && current.recordCount === previous.recordCount
    && delta > 0 && delta <= (current.assisted && previous.assisted ? 32 : 2)
    && (current.assisted && previous.assisted || input.now - trace.at <= TIMED_SOUND_GAP_MS);
  if (!localAdvance) return silent();
  if (current.lost) return emit('line-break');
  if (current.resolved) {
    return emit(current.kind === 'fish' ? 'fish-alongside'
      : current.kind === 'bycatch' ? 'incident-stable'
      : current.kind === 'snag' ? 'line-free' : 'observation-ready');
  }
  if (current.danger && !previous.danger && input.now - trace.lastPressureAt >= PRESSURE_SOUND_COOLDOWN_MS) {
    next.lastPressureAt = input.now;
    return emit('pressure');
  }
  return silent();
}

export interface SoundSegment {
  source: 'noise' | OscillatorType;
  delay: number;
  duration: number;
  attack: number;
  gain: number;
  frequency: number;
  endFrequency: number;
  filter?: 'lowpass' | 'bandpass';
}

export const INTERACTION_SOUND_MASTER_GAIN = .32;

/** Short procedural textures rather than music/fanfare. Relative gains are
 * capped and each one-shot has a scheduled end; nothing loops or loads media. */
export function getInteractionSoundPlan(event: InteractionSoundEvent): SoundSegment[] {
  const pitch = [1, .94, 1.06][event.variant % 3] ?? 1;
  const noise = (duration: number, frequency: number, gain: number, delay = 0): SoundSegment => ({
    source: 'noise', delay, duration, attack: .025, gain, frequency: frequency * pitch,
    endFrequency: frequency * .55 * pitch, filter: 'lowpass',
  });
  const tone = (frequency: number, duration: number, gain: number, delay = 0, endFrequency = frequency): SoundSegment => ({
    source: 'triangle', delay, duration, attack: .008, gain,
    frequency: frequency * pitch, endFrequency: endFrequency * pitch,
  });
  switch (event.type) {
    case 'cast': return [
      { ...noise(.32, 2100, .10), filter: 'bandpass' },
      noise(.48, 950, .18, .16), tone(150, .07, .08, .22, 110),
    ];
    case 'deploy': return event.kind === 'camera' || event.kind === 'telemetry'
      ? [tone(420, .075, .10), tone(260, .08, .055, .06)]
      : [noise(.30, 650, .13), tone(120, .07, .05, .1)];
    case 'pressure': return [tone(240, .14, .12, 0, 190), tone(220, .14, .10, .20, 170)];
    case 'line-break': return [noise(.11, 2400, .12), tone(170, .26, .09, .05, 80)];
    case 'fish-alongside': return [noise(.65, 1050, .18), noise(.38, 520, .10, .18)];
    case 'observation-ready': return [tone(540, .13, .08), tone(680, .16, .06, .12)];
    case 'incident-stable': return [noise(.32, 400, .09), tone(180, .18, .055, .10)];
    case 'line-free': return [tone(130, .10, .08), noise(.19, 600, .055, .08)];
    case 'release': return [noise(.58, 700, .14), noise(.32, 1100, .08, .17)];
    case 'care-recorded': return [tone(390, .08, .07), tone(470, .10, .05, .09)];
  }
}

export interface InteractionSoundPlayer {
  /** Call only from the player's explicit sound-enable button gesture. */
  activate: () => Promise<boolean>;
  deactivate: () => Promise<void>;
  play: (event: InteractionSoundEvent) => void;
  stop: () => void;
  dispose: () => Promise<void>;
}

export function createInteractionSoundPlayer(): InteractionSoundPlayer {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let enabled = false;
  let seed = 683;
  const voices = new Set<() => void>();
  const stop = () => { for (const cleanup of [...voices]) cleanup(); };
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };

  const play = (event: InteractionSoundEvent) => {
    // Never resume a browser-suspended context from an effect or timed tick.
    if (!enabled || !context || !master || context.state !== 'running') return;
    const activeContext = context;
    const output = master;
    const start = activeContext.currentTime + .012;
    for (const segment of getInteractionSoundPlan(event)) {
      if (voices.size >= 12) break;
      const gain = activeContext.createGain();
      const from = start + segment.delay;
      gain.gain.setValueAtTime(0, from);
      gain.gain.linearRampToValueAtTime(segment.gain, from + segment.attack);
      gain.gain.exponentialRampToValueAtTime(.0001, from + segment.duration);
      gain.connect(output);
      let source: AudioBufferSourceNode | OscillatorNode;
      let filter: BiquadFilterNode | null = null;
      if (segment.source === 'noise') {
        const buffer = activeContext.createBuffer(1, Math.ceil(activeContext.sampleRate * segment.duration), activeContext.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let index = 0; index < samples.length; index++) samples[index] = random();
        const noiseSource = activeContext.createBufferSource(); noiseSource.buffer = buffer; noiseSource.loop = false;
        filter = activeContext.createBiquadFilter(); filter.type = segment.filter ?? 'lowpass'; filter.Q.value = .65;
        filter.frequency.setValueAtTime(segment.frequency, from);
        filter.frequency.exponentialRampToValueAtTime(segment.endFrequency, from + segment.duration);
        noiseSource.connect(filter); filter.connect(gain); source = noiseSource;
      } else {
        const oscillator = activeContext.createOscillator(); oscillator.type = segment.source;
        oscillator.frequency.setValueAtTime(segment.frequency, from);
        oscillator.frequency.exponentialRampToValueAtTime(segment.endFrequency, from + segment.duration);
        oscillator.connect(gain); source = oscillator;
      }
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return; cleaned = true;
        source.onended = null;
        try { source.stop(); } catch { /* A scheduled source may have already ended. */ }
        source.disconnect(); filter?.disconnect(); gain.disconnect(); voices.delete(cleanup);
      };
      source.onended = cleanup;
      voices.add(cleanup);
      source.start(from); source.stop(from + segment.duration + .015);
    }
  };

  return {
    activate: async () => {
      try {
        if (!context || context.state === 'closed') {
          if (typeof window === 'undefined') return false;
          const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!Constructor) return false;
          context = new Constructor({ latencyHint: 'interactive' });
          master = context.createGain(); master.gain.value = INTERACTION_SOUND_MASTER_GAIN; master.connect(context.destination);
        }
        // Invocation happens synchronously inside the button's activation path.
        await context.resume(); enabled = context.state === 'running'; return enabled;
      } catch { enabled = false; stop(); return false; }
    },
    deactivate: async () => { enabled = false; stop(); try { await context?.suspend(); } catch { /* Muted even if the browser refuses suspension. */ } },
    play, stop,
    dispose: async () => { enabled = false; stop(); master?.disconnect(); try { await context?.close(); } catch { /* Teardown is best effort. */ } context = null; master = null; },
  };
}
