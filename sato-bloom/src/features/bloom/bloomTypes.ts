import type { MetabolicPigmentKey } from "./pigmentSystem";

export type BloomState = "balanced" | "reactive" | "calm";

export type IdentityBloom = {
  seed: string;
  petalNoise: number[];
  asymmetry: number;
  haloBias: number;
  pigmentBias: number;
  createdAt: string;
  version: 1;
};

export type BloomMemoryMark = {
  id: string;
  startHour: number;
  angle: number;
  distance: number;
  intensity: number;
  color: string;
  pigmentKey: MetabolicPigmentKey;
  size: number;
  softness?: number;
};

export type BloomWindow = {
  id: string;
  startHour: number;
  endHour: number;
  label: string;
  value: number;
  confidence: number;
  variability: number;
  intensity: number;
  state: BloomState;
  pigmentKey: MetabolicPigmentKey;
  glucoseAvg?: number;
  glucosePeak?: number;
  rateOfChange?: string;
  dataCompleteness?: number;
  eventContext?: string;
  classificationReason?: string;
  note?: string;
};