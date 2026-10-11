import { describe, expect, it } from 'vitest';
import frozen from './fixtures/skill-v12-frozen-encounters.json';
import { advanceInteraction, getRecommendedEngagement, setRodSide } from '../src/game/engine';
import { getSkillFishingCue } from '../src/game/skillFishing';
import { parseExpedition, serializeExpedition, validateExpedition } from '../src/game/save';
import { LEGACY_SAVE_KEYS, SAVE_KEY, MIGRATION_BACKUP_KEY, loadStoredExpedition, saveStoredExpeditionIfUnchanged } from '../src/game/storage';
import { nativeRoutes, advanceRecommendedInteraction } from './helpers/fishing';

const upgrade = (state: object) => ({ ...state, version: 13, rodSide: 'center' });
describe('schema13 skill-control persistence and exact previous-rule continuity', () => {
  it.each(frozen)('migrates frozen $venue $state.anglingRules bytes with both next inputs unchanged', async fixture => {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(fixture.raw));
    expect(Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')).toBe(fixture.sha256);
    const parsed = parseExpedition(fixture.raw); expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.state).toEqual(upgrade(fixture.state)); expect(parsed.migrated).toBe(true);
    expect(advanceInteraction(parsed.state, true)).toEqual(upgrade(fixture.nextHeld));
    expect(advanceInteraction(parsed.state, false)).toEqual(upgrade(fixture.nextReleased));
    expect(advanceInteraction(parsed.state, getRecommendedEngagement(parsed.state))).toEqual(upgrade(fixture.next));
    expect(getSkillFishingCue(parsed.state, nativeRoutes().find(route => route.venue.id === fixture.venue)!.venue)).toBeNull();
    expect(parseExpedition(serializeExpedition(parsed.state))).toMatchObject({ ok: true, migrated: false, state: parsed.state });
  });

  it('backs up the exact v12 original before the first v13 write and preserves both versioned keys', () => {
    const raw = frozen[1].raw; const values = new Map([['living-waters-save-v12', raw]]); const writes: string[] = [];
    const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); } };
    expect(SAVE_KEY).toBe('living-waters-save-v13'); expect(LEGACY_SAVE_KEYS[0]).toBe('living-waters-save-v12');
    const loaded = loadStoredExpedition(store); expect(loaded.blocked).toBe(false);
    expect(values.get(MIGRATION_BACKUP_KEY)).toBe(raw);
    expect(saveStoredExpeditionIfUnchanged(loaded.state, loaded.raw, store)).toMatchObject({ ok: true });
    expect(writes.indexOf(MIGRATION_BACKUP_KEY)).toBeLessThan(writes.indexOf(SAVE_KEY));
    expect(values.get('living-waters-save-v12')).toBe(raw); expect(parseExpedition(values.get(SAVE_KEY)!)).toMatchObject({ ok: true, migrated: false });
  });

  it('restores the exact v2 cue, pressure, rod latch, saved clock and next tick on every fish route', () => {
    for (const route of nativeRoutes().filter(route => route.state.anglingRules === 'habitat-v2')) {
      let state = route.state; for (let tick = 0; tick < 19; tick++) state = advanceRecommendedInteraction(state);
      state = setRodSide(state, 'right'); const original = structuredClone(state);
      const parsed = parseExpedition(serializeExpedition(state)); expect(parsed.ok, route.name).toBe(true);
      if (!parsed.ok) continue;
      expect(parsed.state, route.name).toEqual(original);
      expect(getSkillFishingCue(parsed.state, route.venue), route.name).toEqual(getSkillFishingCue(state, route.venue));
      expect(advanceRecommendedInteraction(parsed.state), route.name).toEqual(advanceRecommendedInteraction(state));
      expect(state, route.name).toEqual(original);
    }
  });

  it('rejects missing, forged and inappropriate rod latches, skill clocks and method markers', () => {
    const fish = nativeRoutes().find(route => route.state.anglingRules === 'habitat-v2')!;
    for (const patch of [{ rodSide: 'up' }, { rodSide: null }, { rodSide: undefined }, { anglingBeat: .5 }, { anglingBeat: 1 }, { fightPhase: 'rest' }, { phaseProgress: 1 }]) {
      expect(validateExpedition({ ...fish.state, ...patch })).toBe(false);
    }
    for (const route of nativeRoutes().filter(route => route.state.anglingRules !== 'habitat-v2')) {
      expect(validateExpedition({ ...route.state, anglingRules: 'habitat-v2' }), route.name).toBe(false);
      expect(validateExpedition({ ...route.state, rodSide: 'left' }), route.name).toBe(false);
      expect(setRodSide(route.state, 'left'), route.name).toBe(route.state);
    }
    const oldEnvelope = JSON.parse(frozen[1].raw);
    expect(parseExpedition(JSON.stringify({ ...oldEnvelope, state: { ...oldEnvelope.state, rodSide: 'left' } })).ok).toBe(false);
    expect(parseExpedition(JSON.stringify({ ...oldEnvelope, state: { ...oldEnvelope.state, anglingRules: 'habitat-v2' } })).ok).toBe(false);
  });
});
