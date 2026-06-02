import type { CompanionRunEnvelope, MobileShowcaseCard } from '@/types/mobileCard';

const safetyFooter = 'Educational simulation only — not medical advice. No dosing or treatment changes.';

export const demoCards: MobileShowcaseCard[] = [
  {
    id: 'forecast-demo',
    kind: 'forecast',
    title: 'Expected glucose shape',
    summary: 'Forecast peak ~178 mg/dL at ~85 minutes, with medium confidence.',
    confidenceTier: 'medium',
    source: 'synthetic_legend',
    safetyFooter,
    payload: {
      mealText: '2 slices pepperoni pizza',
      baselineMgDl: 112,
      peakMgDl: 178,
      peakTimeMinutes: 85,
      uncertaintyRangeMgDl: [160, 195],
      points: [
        { minute: 0, mgDl: 112 },
        { minute: 30, mgDl: 138 },
        { minute: 60, mgDl: 166 },
        { minute: 85, mgDl: 178 },
        { minute: 120, mgDl: 170 },
        { minute: 180, mgDl: 148 },
      ],
    },
    primaryActions: [{ id: 'save', label: 'Save meal review', kind: 'primary' }],
    secondaryActions: [
      { id: 'edit', label: 'Edit meal', kind: 'secondary', route: '/meal-entry' },
      { id: 'chat', label: 'Discuss with AI', kind: 'secondary', route: '/(tabs)/chat' },
    ],
  },
  {
    id: 'parsed-foods-demo',
    kind: 'parsedFoods',
    title: 'Parsed foods',
    summary: 'We interpreted the meal as 2 slices of pepperoni pizza.',
    confidenceTier: 'medium',
    source: 'synthetic_legend',
    safetyFooter,
    payload: {
      foods: [{ item: 'pepperoni pizza', quantity: 2, unit: 'slices', confidenceTier: 'medium' }],
    },
    primaryActions: [],
    secondaryActions: [],
  },
  {
    id: 'food-evidence-demo',
    kind: 'foodEvidence',
    title: 'Food evidence',
    summary: 'Estimated nutrition uses synthetic demo food evidence and portion assumptions.',
    confidenceTier: 'medium',
    source: 'synthetic_legend',
    safetyFooter,
    payload: {
      totals: { carbsG: 80, fatG: 35, sugarsG: 6, proteinG: 15 },
      warnings: ['Portion size estimated — review if this looks wrong.'],
    },
    primaryActions: [],
    secondaryActions: [],
  },
  {
    id: 'meal-memory-demo',
    kind: 'mealMemory',
    title: 'Meal memory',
    summary: 'Similar demo meals have shown delayed rises after higher-fat pizza meals.',
    confidenceTier: 'medium',
    source: 'synthetic_legend',
    safetyFooter,
    payload: {
      similarMealsCount: 7,
      glucoseOutcomesCount: 5,
      typicalRiseMgDl: 56,
      peakTimeMinutes: 120,
      provenance: 'synthetic legends demo data',
    },
    primaryActions: [],
    secondaryActions: [],
  },
  {
    id: 'confidence-demo',
    kind: 'confidence',
    title: 'Confidence',
    summary: 'Medium confidence. Portion and nutrition variance are the main uncertainty drivers.',
    confidenceTier: 'medium',
    source: 'synthetic_legend',
    safetyFooter,
    payload: {
      components: [
        { label: 'Food identity', value: 0.82 },
        { label: 'Portion', value: 0.58 },
        { label: 'Nutrition', value: 0.64 },
        { label: 'Timing', value: 0.72 },
      ],
    },
    primaryActions: [],
    secondaryActions: [],
  },
];

export const demoEnvelope: CompanionRunEnvelope = {
  schemaVersion: '1.0',
  runId: 'demo-run-pizza',
  draftId: 'demo-draft-pizza',
  phase: 'final',
  routeRecommendation: 'final_cards',
  dataMode: 'synthetic_demo',
  sourceLabel: 'Synthetic legend demo',
  parsedFoods: [{ item: 'pepperoni pizza', quantity: 2, unit: 'slices', confidenceTier: 'medium' }],
  cards: demoCards,
  safety: {
    label: safetyFooter,
    educationalOnly: true,
    noDosingAdvice: true,
  },
};
