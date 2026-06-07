import type { ArtifactFeatures, EventCategory } from "../types/artifact";

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export function normalizeFeatures(
  raw: Partial<ArtifactFeatures> & { category: EventCategory; seed: number }
): ArtifactFeatures {
  return {
    category: raw.category,
    intensity: clamp(raw.intensity ?? 0.5, 0, 1),
    duration: clamp(raw.duration ?? 0.5, 0, 1),
    balance: clamp(raw.balance ?? 0, -1, 1),
    volatility: clamp(raw.volatility ?? 0.3, 0, 1),
    recovery: clamp(raw.recovery ?? 0.5, 0, 1),
    seed: raw.seed,
  };
}

export function featuresFromBiometric(data: {
  category: EventCategory;
  carbs?: number;
  glucoseImpact?: number;
  activityMinutes?: number;
  sleepScore?: number;
  stress?: number;
  protein?: number;
  fat?: number;
  seed?: number;
}): ArtifactFeatures {
  const seed = data.seed ?? Math.floor(Math.random() * 999999);

  switch (data.category) {
    case "meal": {
      const carbs = data.carbs ?? 20;
      const protein = data.protein ?? 10;
      const fat = data.fat ?? 8;
      const total = carbs + protein + fat;
      return normalizeFeatures({
        category: "meal",
        intensity: clamp(total / 80, 0.1, 1),
        duration: clamp(fat / 30, 0.1, 1),
        balance: clamp((protein - carbs * 0.5) / 40, -1, 1),
        volatility: clamp(carbs / 60, 0.1, 1),
        recovery: clamp(protein / 30, 0.1, 1),
        seed,
      });
    }
    case "run":
      return normalizeFeatures({
        category: "run",
        intensity: clamp((data.activityMinutes ?? 20) / 60, 0.1, 1),
        duration: clamp((data.activityMinutes ?? 20) / 90, 0.1, 1),
        balance: 0.3,
        volatility: 0.2,
        recovery: 0.7,
        seed,
      });
    case "sleep":
      return normalizeFeatures({
        category: "sleep",
        intensity: clamp((data.sleepScore ?? 70) / 100, 0.1, 1),
        duration: 0.6,
        balance: clamp(((data.sleepScore ?? 70) - 50) / 50, -1, 1),
        volatility: clamp(1 - (data.sleepScore ?? 70) / 100, 0, 1),
        recovery: clamp((data.sleepScore ?? 70) / 100, 0.1, 1),
        seed,
      });
    case "glucose":
      return normalizeFeatures({
        category: "glucose",
        intensity: clamp((data.glucoseImpact ?? 30) / 80, 0.1, 1),
        duration: 0.4,
        balance: clamp(-(data.glucoseImpact ?? 30) / 80, -1, 0.2),
        volatility: clamp((data.glucoseImpact ?? 30) / 80, 0.1, 1),
        recovery: 0.5,
        seed,
      });
    case "stress":
      return normalizeFeatures({
        category: "stress",
        intensity: clamp((data.stress ?? 50) / 100, 0.1, 1),
        duration: 0.5,
        balance: -clamp((data.stress ?? 50) / 100, 0, 1),
        volatility: clamp((data.stress ?? 50) / 100, 0.2, 1),
        recovery: 0.2,
        seed,
      });
    default:
      return normalizeFeatures({
        category: data.category,
        intensity: 0.3,
        duration: 0.3,
        balance: 0,
        volatility: 0.2,
        recovery: 0.5,
        seed,
      });
  }
}
