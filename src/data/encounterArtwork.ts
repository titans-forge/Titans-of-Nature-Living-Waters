import seatrout from '../assets/encounters/spotted-seatrout-waterline-v1.webp';
import turtle from '../assets/encounters/river-turtle-waterline-v1.webp';
import sponge from '../assets/encounters/baikal-sponge-in-situ-v1.webp';
import rope from '../assets/encounters/mooring-rope-response-v1.webp';
import iguana from '../assets/encounters/marine-iguana-observation-v1.webp';
import { catchPhotoByEncounterId } from './catchPhotos';
import { getInteractionKind, hasEarlierCompletedEncounter } from '../game/interactions';
import type { ExpeditionState, InteractionKind, Venue } from '../types';

export interface EncounterArtwork {
  src: string;
  purpose: 'waterline' | 'incident' | 'observation' | 'habitat-care';
  label: string;
  alt: string;
  caption: string;
  objectPosition?: string;
}
interface ContextualArtwork extends EncounterArtwork { allowedKinds: readonly InteractionKind[] }

/** Scenario illustrations do not document a selected handling outcome. */
export const contextualArtworkByEncounterId: Partial<Record<string, ContextualArtwork>> = {
  'spotted-seatrout': { src: seatrout, purpose: 'waterline', allowedKinds: ['fish'],
    label: 'Waterline encounter', alt: 'Generated reconstruction of a spotted seatrout at the Florida Bay waterline',
    caption: 'Generated reconstruction · waterline handling scenario' },
  'river-turtle': { src: turtle, purpose: 'incident', allowedKinds: ['bycatch'],
    label: 'Incidental encounter', alt: 'Generated reconstruction of an incidental Amazon river turtle encounter at water level',
    caption: 'Generated reconstruction · incidental response scenario' },
  'baikal-sponge': { src: sponge, purpose: 'observation', allowedKinds: ['camera'],
    label: 'In-situ observation', alt: 'Generated reconstruction of branching Baikal freshwater sponge colonies below clear water',
    caption: 'Generated reconstruction · in-situ camera observation' },
  'mooring-snag': { src: rope, purpose: 'habitat-care', allowedKinds: ['snag'],
    label: 'Equipment incident', alt: 'Generated reconstruction of frayed mooring rope caught beside a Danube bank',
    caption: 'Generated reconstruction · equipment incident scenario' },
  'marine-iguana': { src: iguana, purpose: 'observation', allowedKinds: ['camera'],
    label: 'In-situ observation', alt: 'Generated reconstruction of a marine iguana beside a Galapagos lava shoreline',
    caption: 'Generated reconstruction · wildlife observation from a distance' },
};

/** Art follows the actual interaction, never a fish ID alone. Older completed
 * routes that no longer match retain the existing habitat-art fallback. */
export function getEncounterArtwork(state: ExpeditionState, venue: Venue): EncounterArtwork | null {
  const encounter = state.encounterId ? venue.encounters[state.encounterId] : null;
  if (venue.id !== state.venueId || !encounter || !venue.gearSets.some(gear => gear.id === state.gearId) || hasEarlierCompletedEncounter(state, venue)) return null;
  const kind = getInteractionKind(state, venue);
  const contextual = contextualArtworkByEncounterId[encounter.id];
  if (contextual) return contextual.allowedKinds.includes(kind) ? contextual : null;
  const src = kind === 'fish' ? catchPhotoByEncounterId[encounter.id] : undefined;
  return src ? { src, purpose: 'waterline', label: 'Waterline encounter',
    alt: `Generated reconstruction of ${encounter.name} at the waterline`,
    caption: 'Generated reconstruction · waterline handling scenario' } : null;
}
