import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getTomEnvelope, tomLegend } from '@/data/tomLegend';
import { demoEnvelope } from '@/data/demoEnvelope';
import type { CompanionRunEnvelope } from '@/types/mobileCard';

export type LegendProfile = 'well_controlled' | 'high_fat_delayed' | 'post_meal_spike' | 'brittle' | 'dawn_phenomenon' | 'overnight_hypo' | 'exercise_sensitive' | 'exercise_regimen' | 'insulin_sensitive' | 'insulin_resistant' | 'high_variability' | 'newly_diagnosed' | 'foot_to_floor_tom' | 'demo';

export type LegendProfileInfo = {
  key: LegendProfile;
  name: string;
  anchorLabel: string;
  description: string;
  isRealData?: boolean;
};

// Available legend profiles
export const legendProfiles: LegendProfileInfo[] = [
  { key: 'demo', name: 'Demo', anchorLabel: 'Synthetic', description: 'Generic demo data for testing' },
  { key: 'foot_to_floor_tom', name: 'Tom Batchelor', anchorLabel: 'Foot2Floor', description: '27, 4 years T1D - rises after waking', isRealData: true },
  { key: 'well_controlled', name: 'Alex Chen', anchorLabel: 'Well-controlled', description: 'Typical stable profile' },
  { key: 'high_fat_delayed', name: 'Jordan Patel', anchorLabel: 'High-fat delayed', description: 'Delayed rises after fatty meals' },
  { key: 'post_meal_spike', name: 'Samira Okafor', anchorLabel: 'Post-meal spike', description: 'Rapid spikes after eating' },
  { key: 'brittle', name: 'Taylor Brooks', anchorLabel: 'Brittle', description: 'Unpredictable highs and lows' },
  { key: 'dawn_phenomenon', name: 'Morgan Rivera', anchorLabel: 'Dawn phenomenon', description: 'Morning rise without eating' },
  { key: 'overnight_hypo', name: 'Casey Kim', anchorLabel: 'Overnight hypo', description: 'Nighttime lows' },
  { key: 'exercise_sensitive', name: 'Riley Thompson', anchorLabel: 'Exercise sensitive', description: 'Exercise causes drops' },
];

type LegendProfileState = {
  selectedProfile: LegendProfile;
  selectProfile: (profile: LegendProfile) => void;
  getProfileEnvelope: (text?: string, mealType?: string) => CompanionRunEnvelope | null;
  getProfileInfo: () => LegendProfileInfo | null;
};

export const useLegendProfile = create<LegendProfileState>()(
  persist(
    (set, get) => ({
      selectedProfile: 'foot_to_floor_tom', // Default to Tom's profile
      
      selectProfile: (profile) => set({ selectedProfile: profile }),
      
      getProfileEnvelope: (text = 'breakfast', mealType) => {
        const profile = get().selectedProfile;
        switch (profile) {
          case 'foot_to_floor_tom':
            return getTomEnvelope(text || 'breakfast routine', mealType);
          case 'demo':
          default:
            return demoEnvelope;
        }
      },
      
      getProfileInfo: () => {
        const profile = get().selectedProfile;
        return legendProfiles.find((p) => p.key === profile) ?? null;
      },
    }),
    {
      name: 't1d-legend-profile',
    }
  )
);

// Get Tom's profile data directly
export function getTomProfile() {
  return tomLegend;
}