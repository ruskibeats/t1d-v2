export type NutrientVector = {
  carbs?: number;
  sugar?: number;
  fat?: number;
  protein?: number;
  fiber?: number;
  hydration?: number;
  exercise?: number;
  stress?: number;
  sleepDebt?: number;
  confidence?: number;
};

export type BloomEvent = {
  id: string;
  time: string;
  label: string;
  nutrients: NutrientVector;
  storyWeight?: number; // 0–1, visual narrative importance
};

export type IdentityBloom = {
  seed: string;
  createdAt: string;
  asymmetry: number;
  pigmentBias: number;
  paperTexture: number;
  version: 1;
};

export type PigmentDeposit = {
  id: string;
  eventId: string;
  kind:
    | "carbWash"
    | "sugarAccent"
    | "proteinCore"
    | "fatShadow"
    | "fiberVeil"
    | "hydrationVeil";
  angle: number;
  radius: number;
  length: number;
  width: number;
  color: string;
  opacity: number;
  layers: number;
  bleed: number;
  granulation: number;
  edgeChaos: number;
  rotationNoise: number;
  centerPull: number;
  clusterOffset: {
    x: number;
    y: number;
  };
};
