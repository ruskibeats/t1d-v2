import { create } from 'zustand';

export type AppDataMode = 'synthetic_demo' | 'real_user';

type AppState = {
  dataMode: AppDataMode;
  selectedLegend: string;
  safetyAcknowledged: boolean;
  setDataMode: (mode: AppDataMode) => void;
  acknowledgeSafety: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  dataMode: 'synthetic_demo',
  selectedLegend: 'well_controlled',
  safetyAcknowledged: false,
  setDataMode: (dataMode) => set({ dataMode }),
  acknowledgeSafety: () => set({ safetyAcknowledged: true }),
}));
