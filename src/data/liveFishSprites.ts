import peacockBass from '../assets/fish-sprites/peacock-bass-v1.webp';
import snook from '../assets/fish-sprites/common-snook-v1.webp';
import seatrout from '../assets/fish-sprites/spotted-seatrout-v1.webp';
import snakehead from '../assets/fish-sprites/giant-snakehead-v1.webp';
import peacockBassTurn from '../assets/fish-sprites/peacock-bass-turn-v1.webp';
import snookTurn from '../assets/fish-sprites/common-snook-turn-v1.webp';
import seatroutTurn from '../assets/fish-sprites/spotted-seatrout-turn-v1.webp';
import snakeheadTurn from '../assets/fish-sprites/giant-snakehead-turn-v1.webp';
import peacockBassOblique from '../assets/fish-sprites/peacock-bass-oblique-v1.webp';
import snookOblique from '../assets/fish-sprites/common-snook-oblique-v1.webp';
import seatroutOblique from '../assets/fish-sprites/spotted-seatrout-oblique-v1.webp';
import snakeheadOblique from '../assets/fish-sprites/giant-snakehead-oblique-v1.webp';
import type { PilotSpecies } from '../game/angling';

export interface LiveFishSprite {
  src: string;
  /** Display framing only: the image keeps its own proportions within it. */
  aspectRatio: number;
  /** A right-facing mouth anchor joins the schematic line to the sprite. */
  mouthX: number;
  mouthY: number;
  /** Genuine three-quarter artwork, anchored and scaled independently. */
  oblique: {
    src: string;
    aspectRatio: number;
    mouthX: number;
    mouthY: number;
    /** Width also matches the opaque silhouette depth to the profile. */
    widthScale: number;
  };
  /** Independently framed turn artwork joins the same schematic mouth point. */
  turn: {
    src: string;
    aspectRatio: number;
    mouthX: number;
    mouthY: number;
    /** Width relative to the side frame; preserves its displayed height. */
    widthScale: number;
  };
}

export type LiveFishSpecies = PilotSpecies | 'giant-snakehead';
export const liveFishSpriteByEncounterId: Record<LiveFishSpecies, LiveFishSprite> = {
  'peacock-bass': { src: peacockBass, aspectRatio: 2, mouthX: 98, mouthY: 50,
    oblique: { src: peacockBassOblique, aspectRatio: 768 / 480, mouthX: 94, mouthY: 69, widthScale: 0.789735 },
    turn: { src: peacockBassTurn, aspectRatio: 768 / 697, mouthX: 61, mouthY: 75, widthScale: (768 / 697) / 2 } },
  'common-snook': { src: snook, aspectRatio: 1024 / 409, mouthX: 99, mouthY: 52,
    oblique: { src: snookOblique, aspectRatio: 768 / 427, mouthX: 94, mouthY: 74, widthScale: 0.710723 },
    turn: { src: snookTurn, aspectRatio: 768 / 666, mouthX: 52, mouthY: 81, widthScale: (768 / 666) / (1024 / 409) } },
  'spotted-seatrout': { src: seatrout, aspectRatio: 1024 / 400, mouthX: 98, mouthY: 53,
    oblique: { src: seatroutOblique, aspectRatio: 768 / 427, mouthX: 95, mouthY: 75, widthScale: 0.703247 },
    turn: { src: seatroutTurn, aspectRatio: 768 / 621, mouthX: 64, mouthY: 76, widthScale: (768 / 621) / (1024 / 400) } },
  'giant-snakehead': { src: snakehead, aspectRatio: 3, mouthX: 98, mouthY: 45,
    oblique: { src: snakeheadOblique, aspectRatio: 768 / 349, mouthX: 94, mouthY: 76, widthScale: 0.586502 },
    turn: { src: snakeheadTurn, aspectRatio: 1.5, mouthX: 56, mouthY: 74, widthScale: .5 } },
};
