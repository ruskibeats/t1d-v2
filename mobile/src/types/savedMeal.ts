import type { CompanionRunEnvelope, ConfidenceTier, ParsedFood } from './mobileCard';

export type MacroTotals = {
  carbsG?: number;
  fatG?: number;
  sugarsG?: number;
  proteinG?: number;
};

export type SavedMealReview = {
  id: string;
  createdAt: string;
  dataMode: 'synthetic_demo' | 'real_user';
  sourceLabel: string;
  normalized: {
    mealText: string;
    parsedFoods: ParsedFood[];
    totals: MacroTotals;
    baselineMgDl?: number;
    peakMgDl?: number;
    peakTimeMinutes?: number;
    confidenceTier: ConfidenceTier;
    evidenceCounts?: {
      similarMeals?: number;
      glucoseOutcomes?: number;
    };
    anchorType?: string;
  };
  envelopeSnapshot: CompanionRunEnvelope;
  lifecycle: {
    status: 'draft' | 'saved' | 'exported';
    savedAt?: string;
    exportedAt?: string;
    discussedChatThreadId?: string;
  };
};
