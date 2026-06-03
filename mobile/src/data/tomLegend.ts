import type { CompanionRunEnvelope, MobileShowcaseCard, ParsedFood, ConfidenceTier, DataSource } from '@/types/mobileCard';

const safetyFooter = 'Educational simulation only — not medical advice. No dosing or treatment changes.';

// Tom Batchelor / Foot2Floor legend data
export const tomLegend = {
  name: 'Tom Batchelor',
  age: 27,
  diagnosis_years: 4.0,
  anchor_type: 'foot_to_floor',
  anchor_label: 'Foot2Floor',
  profile_summary: {
    summary: 'Tom is a 27-year-old living with type 1 diabetes for 4 years. His profile focuses on a Foot2Floor pattern: glucose tends to rise between waking and breakfast.',
    known_routine: 'Breakfast at 08:00: 2 brown toast slices and 4 scrambled eggs with butter and avocado.',
    target_range: '3.9–10.0 mmol/L, with ~70% time in range target.',
  },
  current_cgm: {
    mg_dl: 108,
    trend: 'stable' as const,
    timestamp: new Date().toISOString(),
  },
};

// Convert Tom's foot_to_floor pattern to forecast cards
export function generateTomForecastCards(
  mealText: string,
  mealType: 'breakfast' | 'lunch' | 'dinner' = 'breakfast'
) {
  const isFootToFloor = mealType === 'breakfast';
  
  const parsedFoods: ParsedFood[] = isFootToFloor 
    ? [{ item: 'brown toast', quantity: 2, unit: 'slices', confidenceTier: 'high' },
       { item: 'scrambled eggs', quantity: 4, unit: '', confidenceTier: 'high' },
       { item: 'butter', quantity: 1, unit: 'portion', confidenceTier: 'medium' },
       { item: 'avocado', quantity: 1, unit: 'portion', confidenceTier: 'medium' }]
    : [{ item: mealText, quantity: 1, unit: '', confidenceTier: 'medium' }];

  const cards: MobileShowcaseCard[] = [
    {
      id: 'parsed-foods-tom',
      kind: 'parsedFoods',
      title: 'Parsed foods',
      summary: isFootToFloor 
        ? 'We interpreted your breakfast routine as usual: toast, eggs, butter, and avocado.'
        : `We interpreted your ${mealType} as: ${mealText}.`,
      confidenceTier: 'high',
      source: 'synthetic_legend',
      safetyFooter,
      payload: { foods: parsedFoods },
      primaryActions: [],
      secondaryActions: [],
    },
    {
      id: 'food-evidence-tom',
      kind: 'foodEvidence',
      title: 'Food evidence',
      summary: isFootToFloor
        ? 'Your typical breakfast: ~45g carbs, ~25g fat, consistent with your logged routine.'
        : 'Food evidence based on meal pattern analysis.',
      confidenceTier: 'high',
      source: 'synthetic_legend',
      safetyFooter,
      payload: {
        totals: isFootToFloor
          ? { carbsG: 45, fatG: 25, sugarsG: 3, proteinG: 10 }
          : { carbsG: 35, fatG: 12, sugarsG: 5, proteinG: 8 },
        warnings: isFootToFloor
          ? ['This is your known routine — values are consistent.']
          : ['Portion size estimated — check actual serving.'],
      },
      primaryActions: [],
      secondaryActions: [],
    },
    {
      id: 'forecast-tom',
      kind: 'forecast',
      title: 'Expected glucose shape',
      summary: isFootToFloor
        ? 'Your CGM typically rises after getting up. Consider timing breakfast to align with the rise.'
        : 'Forecast based on your meal pattern and CGM history.',
      confidenceTier: 'medium',
      source: 'synthetic_legend',
      safetyFooter,
      payload: {
        mealText,
        baselineMgDl: isFootToFloor ? 95 : 110,
        peakMgDl: isFootToFloor ? 145 : 165,
        peakTimeMinutes: isFootToFloor ? 60 : 90,
        uncertaintyRangeMgDl: isFootToFloor ? [135, 155] : [150, 180],
        points: isFootToFloor
          ? [
              { minute: 0, mgDl: 95 },
              { minute: 30, mgDl: 120 },
              { minute: 60, mgDl: 145 },
              { minute: 90, mgDl: 140 },
              { minute: 120, mgDl: 135 },
            ]
          : [
              { minute: 0, mgDl: 110 },
              { minute: 45, mgDl: 140 },
              { minute: 90, mgDl: 165 },
              { minute: 120, mgDl: 160 },
              { minute: 180, mgDl: 150 },
            ],
      },
      primaryActions: [{ id: 'save', label: 'Save meal review', kind: 'primary' }],
      secondaryActions: [
        { id: 'edit', label: 'Edit meal', kind: 'secondary', route: '/(tabs)/log-meal' },
        { id: 'chat', label: 'Discuss with AI', kind: 'secondary', route: '/(tabs)/chat' },
      ],
    },
    {
      id: 'meal-memory-tom',
      kind: 'mealMemory',
      title: 'Meal memory',
      summary: isFootToFloor
        ? 'Similar breakfasts show consistent post-wake rise around 145 mg/dL.'
        : 'No similar meals found in your history.',
      confidenceTier: 'high',
      source: 'synthetic_legend',
      safetyFooter,
      payload: {
        similarMealsCount: isFootToFloor ? 32 : 0,
        glucoseOutcomesCount: isFootToFloor ? 28 : 0,
        typicalRiseMgDl: isFootToFloor ? 50 : 0,
        peakTimeMinutes: 60,
        provenance: isFootToFloor
          ? 'Tom Batchelor / Foot2Floor pattern · 90-day history'
          : 'No historical data for this meal type.',
      },
      primaryActions: [],
      secondaryActions: [],
    },
    {
      id: 'confidence-tom',
      kind: 'confidence',
      title: 'Confidence',
      summary: isFootToFloor
        ? 'High confidence for known routine. Forecast aligns with your foot-to-floor pattern.'
        : 'Medium confidence — limited historical context for this meal.',
      confidenceTier: isFootToFloor ? 'high' : 'medium',
      source: 'synthetic_legend',
      safetyFooter,
      payload: {
        components: [
          { label: 'Food identity', value: 0.95 },
          { label: 'Portion', value: isFootToFloor ? 0.90 : 0.65 },
          { label: 'Nutrition', value: isFootToFloor ? 0.85 : 0.70 },
          { label: 'Timing', value: 0.80 },
        ],
      },
      primaryActions: [],
      secondaryActions: [],
    },
  ];

  return {
    schemaVersion: '1.0' as const,
    runId: `tom-forecast-${Date.now()}`,
    draftId: `tom-draft-${Date.now()}`,
    phase: 'final' as const,
    routeRecommendation: 'final_cards' as const,
    dataMode: 'synthetic_demo' as const,
    sourceLabel: 'Tom Batchelor / Foot2Floor',
    parsedFoods,
    cards,
    safety: {
      label: safetyFooter,
      educationalOnly: true,
      noDosingAdvice: true,
    },
  } as CompanionRunEnvelope;
}

// Generate a full envelope for Tom's profile
export function getTomEnvelope(text: string, mealType?: string): CompanionRunEnvelope {
  return generateTomForecastCards(text, (mealType as any) || 'breakfast');
}