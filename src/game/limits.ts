export const SAVE_FORMAT = 'titans-forge-living-waters';
export const SAVE_VERSION = 12;
export const MAX_FIELD_OBSERVATIONS = 10000;
export const MAX_SAVE_BYTES = 4 * 1024 * 1024;
// A native cast resets its interaction fields and can add one observation plus
// the small trip/collection updates. Keep headroom before starting that encounter.
export const NEXT_OBSERVATION_RESERVE_BYTES = 4096;

export function encodeJourneyEnvelope(state: unknown): string {
  return JSON.stringify({ format: SAVE_FORMAT, version: SAVE_VERSION, state });
}

export function journeyByteLength(state: unknown): number {
  return new TextEncoder().encode(encodeJourneyEnvelope(state)).byteLength;
}
