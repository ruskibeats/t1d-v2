import { demoEnvelope } from '@/data/demoEnvelope';

describe('demoEnvelope', () => {
  it('contains a finite v1 final card envelope', () => {
    expect(demoEnvelope.schemaVersion).toBe('1.0');
    expect(demoEnvelope.phase).toBe('final');
    expect(demoEnvelope.routeRecommendation).toBe('final_cards');
    expect(demoEnvelope.cards?.map((card) => card.kind)).toEqual([
      'forecast',
      'parsedFoods',
      'foodEvidence',
      'mealMemory',
      'confidence',
    ]);
  });
});
