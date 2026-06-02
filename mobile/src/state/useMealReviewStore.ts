import { create } from 'zustand';
import type { CompanionRunEnvelope, ForecastPayload } from '@/types/mobileCard';
import type { SavedMealReview } from '@/types/savedMeal';

function getForecastPayload(envelope: CompanionRunEnvelope): ForecastPayload | undefined {
  const card = envelope.cards?.find((item) => item.kind === 'forecast');
  return card?.payload as ForecastPayload | undefined;
}

type MealReviewStore = {
  savedReviews: SavedMealReview[];
  saveDemoReview: (envelope: CompanionRunEnvelope) => SavedMealReview;
  clearDemoReviews: () => void;
};

export const useMealReviewStore = create<MealReviewStore>((set, get) => ({
  savedReviews: [],
  saveDemoReview: (envelope) => {
    const forecast = getForecastPayload(envelope);
    const review: SavedMealReview = {
      id: `local-${Date.now()}`,
      createdAt: new Date().toISOString(),
      dataMode: envelope.dataMode,
      sourceLabel: envelope.sourceLabel,
      normalized: {
        mealText: forecast?.mealText ?? 'Untitled meal',
        parsedFoods: envelope.parsedFoods ?? [],
        totals: {},
        baselineMgDl: forecast?.baselineMgDl,
        peakMgDl: forecast?.peakMgDl,
        peakTimeMinutes: forecast?.peakTimeMinutes,
        confidenceTier: envelope.cards?.find((item) => item.kind === 'confidence')?.confidenceTier ?? 'unknown',
      },
      envelopeSnapshot: envelope,
      lifecycle: {
        status: 'saved',
        savedAt: new Date().toISOString(),
      },
    };

    set({ savedReviews: [review, ...get().savedReviews] });
    return review;
  },
  clearDemoReviews: () => set({ savedReviews: [] }),
}));
