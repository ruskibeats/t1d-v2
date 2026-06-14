/**
 * SATO PIGMENT SYSTEM
 *
 * These colors are not labels.
 * They are metabolic pigments.
 *
 * Food, movement, rest and stress mix into watercolor stains.
 * The user should never see this reference chart directly.
 * It exists internally so the Bloom Engine can paint consistently.
 */

export type MetabolicPigmentKey =
  | "slowCarb"
  | "fastSugar"
  | "fatDelay"
  | "proteinSteady"
  | "movement"
  | "recovery"
  | "stress"
  | "sleepDebt"
  | "settling"
  | "baseline"
  | "unknown";

export const SATO_PIGMENTS: Record<
  MetabolicPigmentKey,
  {
    name: string;
    hex: string;
    meaning: string;
    opacityBias: number;
    spreadBias: number;
    granulationBias: number;
  }
> = {
  baseline: {
    name: "Rice Paper",
    hex: "#F7EEDC",
    meaning: "neutral body state / background vessel",
    opacityBias: 0.08,
    spreadBias: 0.8,
    granulationBias: 0.15,
  },
  slowCarb: {
    name: "Warm Oat",
    hex: "#D9BC78",
    meaning: "slow carbohydrate energy, gradual rise",
    opacityBias: 0.16,
    spreadBias: 0.72,
    granulationBias: 0.28,
  },
  fastSugar: {
    name: "Persimmon Wash",
    hex: "#E88B55",
    meaning: "fast glucose rise, quick metabolic response",
    opacityBias: 0.22,
    spreadBias: 0.86,
    granulationBias: 0.42,
  },
  fatDelay: {
    name: "Toasted Sesame",
    hex: "#B9915E",
    meaning: "delayed digestion, slow tail, extended response",
    opacityBias: 0.18,
    spreadBias: 0.58,
    granulationBias: 0.48,
  },
  proteinSteady: {
    name: "Soft Soy",
    hex: "#A7A982",
    meaning: "steadying meal influence",
    opacityBias: 0.14,
    spreadBias: 0.62,
    granulationBias: 0.22,
  },
  movement: {
    name: "Moss Breath",
    hex: "#789A7A",
    meaning: "movement, walk, run, insulin sensitivity support",
    opacityBias: 0.15,
    spreadBias: 0.74,
    granulationBias: 0.18,
  },
  recovery: {
    name: "Blue Mineral",
    hex: "#7FAFC4",
    meaning: "returning to baseline, recovery, settling",
    opacityBias: 0.15,
    spreadBias: 0.78,
    granulationBias: 0.2,
  },
  stress: {
    name: "Muted Violet",
    hex: "#9B8ABD",
    meaning: "stress, hormonal friction, unexplained resistance",
    opacityBias: 0.16,
    spreadBias: 0.54,
    granulationBias: 0.36,
  },
  sleepDebt: {
    name: "Indigo Fog",
    hex: "#657E9E",
    meaning: "sleep debt, overnight instability, fatigue",
    opacityBias: 0.18,
    spreadBias: 0.68,
    granulationBias: 0.34,
  },
  settling: {
    name: "Sage Water",
    hex: "#A9B99C",
    meaning: "balance returning, gentler metabolic rhythm",
    opacityBias: 0.13,
    spreadBias: 0.82,
    granulationBias: 0.16,
  },
  unknown: {
    name: "Smoke Wash",
    hex: "#AFA79B",
    meaning: "uncertain cause, incomplete context",
    opacityBias: 0.1,
    spreadBias: 0.65,
    granulationBias: 0.3,
  },
};

export function pigmentForKey(key: MetabolicPigmentKey) {
  return SATO_PIGMENTS[key];
}
