import { describe, expect, it } from 'vitest';
import { askQuestion, beginQuestions, createInitialState, selectVenue, useGuideKit, recastWithKit, MAX_CAST_ATTEMPTS } from '../src/game/engine';
import { getActiveAssignment } from '../src/game/assignments';
import { venues } from '../src/data/venues';
import { parseExpedition } from '../src/game/save';

describe('guided preparation and repeat casts', () => {
  it('uses each destination’s authored kit without fabricating answers or predictions', () => {
    for (const venue of venues) {
      let s = beginQuestions(selectVenue(createInitialState(), venue.id));
      expect(useGuideKit(s)).toBe(s);
      s = askQuestion(s, venue.questions[0].id);
      expect(useGuideKit(s)).toBe(s);
      s = askQuestion(s, venue.questions[1].id);
      const next = useGuideKit(s);
      expect(next.stage).toBe('habitat');
      expect(next.gearId).toBe(getActiveAssignment(s)!.gearId);
      expect(next.askedQuestions).toEqual(s.askedQuestions);
      expect(next.learningAnswers).toEqual([]);
      expect(next.zoneId).toBeNull();
      expect(parseExpedition(JSON.stringify(next)).ok).toBe(true);
      expect(next.trust).toBe(s.trust);
    }
  });
  it('does not shortcut Field mode or a later stage', () => {
    let s = beginQuestions(selectVenue(createInitialState(), 'amazon'));
    s = askQuestion(askQuestion(s, 'water-rise'), 'plants');
    const field = { ...s, experienceMode: 'field' as const };
    expect(useGuideKit(field)).toBe(field);
    const later = { ...s, stage: 'journal' as const };
    expect(useGuideKit(later)).toBe(later);
  });
  it('reuses a kit without keeping the resolved encounter or exceeding trip limits', () => {
    const s = { ...selectVenue(createInitialState(), 'amazon'), stage: 'journal' as const, gearId:'surface', zoneId:'roots', encounterId:'peacock-bass', lineResolved:true, interactionProgress:100, castAttempts:1 };
    const next = recastWithKit(s);
    expect(next).toMatchObject({ stage:'habitat', gearId:'surface', castAttempts:1, encounterId:null, interactionProgress:0, lineResolved:false });
    const exhausted = { ...s, castAttempts: MAX_CAST_ATTEMPTS };
    expect(recastWithKit(exhausted)).toBe(exhausted);
    const early = { ...s, stage:'cast' as const };
    expect(recastWithKit(early)).toBe(early);
  });
});
