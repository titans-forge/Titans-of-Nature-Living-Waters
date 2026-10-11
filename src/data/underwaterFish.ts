import { liveFishSpriteByEncounterId } from './liveFishSprites';
import { underwaterFishArtByEncounterId } from './underwaterFishArt';

export type UnderwaterBehavior = 'burst' | 'pelagic' | 'undulatory' | 'bottom' | 'flatfish' | 'steady';
export type UnderwaterBodyShape = 'bass' | 'streamlined' | 'elongate' | 'catfish' | 'sturgeon' | 'flatfish' | 'deep-bodied' | 'goby';
export interface UnderwaterFishFrame {
  src: string;
  aspectRatio: number;
  mouthX: number;
  mouthY: number;
  widthScale: number;
  sourceRect?: { x: number; y: number; width: number; height: number };
}
export interface UnderwaterFishDefinition {
  id: string;
  behavior: UnderwaterBehavior;
  shape: UnderwaterBodyShape;
  color: string;
  back: string;
  belly: string;
  marking: 'plain' | 'spots' | 'bars' | 'stripe' | 'scutes';
  tail: 'forked' | 'rounded' | 'truncate';
  barbels: boolean;
  /** Framing and waveform describe presentation, not measured physiology. */
  aspectRatio: number;
  waveLength: number;
  bendScale: number;
  tailRate: number;
  side?: UnderwaterFishFrame;
  oblique?: UnderwaterFishFrame;
  turn?: UnderwaterFishFrame;
}

// Newly generated side cutouts use a common transparent 2.5:1 frame, with the
// mouth at 98% / 50%. Existing art keeps its measured independent anchors.
// A glob imports only assets which actually exist; a missing species never
// silently receives another fish's texture or a waterline photograph.
const generatedSides = import.meta.glob<string>('../assets/fish-sprites/*-underwater-v2.webp', { eager: true, query: '?url', import: 'default' });

const family = {
  burst: { aspectRatio: 2.4, waveLength: 2.1, bendScale: .95, tailRate: .46 },
  pelagic: { aspectRatio: 3.0, waveLength: 2.5, bendScale: .72, tailRate: .53 },
  undulatory: { aspectRatio: 3.5, waveLength: 3.6, bendScale: 1.35, tailRate: .31 },
  bottom: { aspectRatio: 2.9, waveLength: 2.8, bendScale: .65, tailRate: .27 },
  flatfish: { aspectRatio: 1.7, waveLength: 4.2, bendScale: .24, tailRate: .25 },
  steady: { aspectRatio: 2.4, waveLength: 2.1, bendScale: .60, tailRate: .35 },
} satisfies Record<UnderwaterBehavior, Pick<UnderwaterFishDefinition, 'aspectRatio' | 'waveLength' | 'bendScale' | 'tailRate'>>;

function fish(id: string, behavior: UnderwaterBehavior, shape: UnderwaterBodyShape, color: string, marking: UnderwaterFishDefinition['marking'] = 'plain',
  details: Partial<UnderwaterFishDefinition> = {}): UnderwaterFishDefinition {
  const generated = generatedSides[`../assets/fish-sprites/${id}-underwater-v2.webp`];
  const definition: UnderwaterFishDefinition = { id, behavior, shape, color, back: '#293e36', belly: '#c4c4a0', marking,
    tail: shape === 'catfish' || shape === 'elongate' || shape === 'goby' ? 'rounded' : 'forked',
    barbels: shape === 'catfish' || shape === 'sturgeon', ...family[behavior], ...details,
    ...(generated ? { side: { src: generated, aspectRatio: 2.5, mouthX: 98, mouthY: 50, widthScale: 1 } } : {}) };
  const existing = liveFishSpriteByEncounterId[id as keyof typeof liveFishSpriteByEncounterId];
  if (existing) {
    definition.side = { src: existing.src, aspectRatio: existing.aspectRatio, mouthX: existing.mouthX, mouthY: existing.mouthY, widthScale: 1 };
    definition.oblique = { ...existing.oblique };
    definition.turn = { ...existing.turn };
    definition.aspectRatio = existing.aspectRatio;
  } else if (underwaterFishArtByEncounterId[id]) {
    const artwork = underwaterFishArtByEncounterId[id];
    definition.side = artwork.side; definition.oblique = artwork.oblique; definition.turn = artwork.turn;
    definition.aspectRatio = artwork.side.aspectRatio;
  }
  return definition;
}

/** Species names are never inferred from a reused texture. Every active fish
 * route has its own morphology and behavior, with explicit art availability. */
export const underwaterFishByEncounterId: Record<string, UnderwaterFishDefinition> = Object.fromEntries([
  fish('peacock-bass', 'burst', 'bass', '#9b9b40', 'bars', { tail: 'rounded' }),
  fish('common-snook', 'pelagic', 'streamlined', '#a4b6b0', 'stripe'),
  fish('spotted-seatrout', 'burst', 'streamlined', '#adbfc1', 'spots'),
  fish('giant-snakehead', 'undulatory', 'elongate', '#596064', 'bars', { back: '#26362e' }),
  fish('arapaima', 'undulatory', 'elongate', '#647363', 'scutes', { tail: 'rounded', aspectRatio: 3.8, bendScale: .85 }),
  fish('silver-arowana', 'pelagic', 'elongate', '#bec7b4', 'scutes', { tail: 'rounded', aspectRatio: 3.9 }),
  fish('tigerfish', 'pelagic', 'streamlined', '#b4c1b4', 'stripe', { back: '#566e65' }),
  fish('three-spot-tilapia', 'steady', 'deep-bodied', '#9b9f74', 'spots', { aspectRatio: 1.9, tail: 'truncate' }),
  fish('sharptooth-catfish', 'undulatory', 'catfish', '#626866', 'plain', { aspectRatio: 3.3 }),
  fish('trey-riel', 'steady', 'streamlined', '#bec4b5', 'plain', { aspectRatio: 2.9 }),
  fish('ricefield-snakehead', 'undulatory', 'elongate', '#797755', 'bars'),
  fish('red-drum', 'bottom', 'bass', '#b79672', 'spots', { tail: 'truncate' }),
  fish('mangrove-snapper', 'burst', 'bass', '#8a8971', 'plain', { back: '#4a574e' }),
  fish('coho-salmon', 'pelagic', 'streamlined', '#b8c8c7', 'spots', { back: '#365d62' }),
  fish('pacific-halibut', 'flatfish', 'flatfish', '#7d7761', 'spots', { tail: 'truncate', belly: '#bdb49d' }),
  fish('kelp-greenling', 'bottom', 'elongate', '#8e886b', 'spots', { aspectRatio: 2.9 }),
  fish('baikal-sturgeon', 'bottom', 'sturgeon', '#6f7d80', 'scutes', { aspectRatio: 3.7 }),
  fish('baikal-omul', 'pelagic', 'streamlined', '#bdc9c8', 'plain', { back: '#526f73' }),
  fish('baikal-grayling', 'steady', 'streamlined', '#99b1a3', 'spots', { back: '#5a657b' }),
  fish('largemouth-bass', 'burst', 'bass', '#8d9b69', 'stripe', { tail: 'rounded', back: '#394e38' }),
  fish('bluegill', 'steady', 'deep-bodied', '#718e70', 'bars', { aspectRatio: 1.8, tail: 'truncate', belly: '#c8aa6b' }),
  fish('black-crappie', 'burst', 'deep-bodied', '#a3ae9a', 'spots', { aspectRatio: 1.8, tail: 'truncate' }),
  fish('channel-catfish', 'bottom', 'catfish', '#929e94', 'spots', { tail: 'forked', aspectRatio: 3.0 }),
  fish('nile-tilapia', 'steady', 'deep-bodied', '#9f9f81', 'bars', { aspectRatio: 1.9, tail: 'truncate' }),
  fish('nile-perch', 'burst', 'bass', '#a1afa1', 'plain', { aspectRatio: 2.8, back: '#5b6c5c' }),
  fish('african-catfish', 'undulatory', 'catfish', '#646c62', 'plain', { aspectRatio: 3.4 }),
  fish('bunni', 'bottom', 'streamlined', '#c1b599', 'plain', { barbels: true }),
  fish('shabout', 'bottom', 'streamlined', '#b2a888', 'plain', { barbels: true, aspectRatio: 2.9 }),
  fish('mesopotamian-catfish', 'undulatory', 'catfish', '#7d8064', 'plain', { aspectRatio: 3.6 }),
  fish('rohu', 'steady', 'streamlined', '#9eada0', 'scutes', { aspectRatio: 2.6 }),
  fish('hilsa', 'pelagic', 'deep-bodied', '#c3cebd', 'plain', { aspectRatio: 2.3, back: '#6d969a' }),
  fish('goonch', 'bottom', 'catfish', '#83846a', 'spots', { aspectRatio: 3.3 }),
  fish('beluga-research', 'bottom', 'sturgeon', '#87959a', 'scutes', { aspectRatio: 3.8, bendScale: .50 }),
  fish('northern-pike', 'burst', 'elongate', '#7c8f5e', 'spots', { aspectRatio: 4.1, tail: 'forked' }),
  fish('common-barbel', 'bottom', 'streamlined', '#ae9976', 'plain', { barbels: true, aspectRatio: 3.0 }),
  fish('round-goby', 'bottom', 'goby', '#817d63', 'spots', { aspectRatio: 2.4, tail: 'rounded' }),
  fish('coral-trout', 'burst', 'bass', '#b76e56', 'spots', { tail: 'truncate', back: '#7e493d' }),
  fish('giant-trevally', 'pelagic', 'deep-bodied', '#b8c4c0', 'plain', { aspectRatio: 2.5, back: '#536c72' }),
  fish('spanish-mackerel', 'pelagic', 'streamlined', '#b0c6be', 'bars', { aspectRatio: 4.0, back: '#315f65' }),
  fish('red-seabream', 'steady', 'deep-bodied', '#c99386', 'spots', { aspectRatio: 2.0, back: '#966965' }),
  fish('japanese-sea-bass', 'burst', 'bass', '#9aafa6', 'plain', { aspectRatio: 2.9 }),
  fish('black-rockfish', 'bottom', 'bass', '#6a7169', 'plain', { aspectRatio: 2.2, tail: 'truncate' }),
  fish('spotted-sea-bass', 'burst', 'bass', '#a9b6a3', 'spots', { aspectRatio: 2.9 }),
  fish('small-yellow-croaker', 'steady', 'streamlined', '#c5b778', 'plain', { belly: '#ded1a2' }),
  fish('yellow-drum', 'bottom', 'bass', '#aea479', 'plain', { tail: 'truncate', belly: '#d7c396' }),
].map(definition => [definition.id, definition]));

export const missingUnderwaterFishArt = Object.values(underwaterFishByEncounterId).filter(fish => !fish.side).map(fish => fish.id);
