import type { ArtifactFeatures, VisualTokens } from "../types/artifact";

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h);
}

function seeded(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const PALETTES: Record<string, string[]> = {
  meal: ["#C7A86A", "#B75A3E", "#D9A18C", "#8A8B5C"],
  run: ["#6D7553", "#9AA8B5", "#5D7E6E", "#B8C4A0"],
  sleep: ["#9AA8B5", "#C7D0D7", "#26394B", "#6E8FA0"],
  glucose: ["#B75A3E", "#C7A86A", "#D9A18C", "#8E3F2F"],
  stress: ["#102334", "#26394B", "#5D554D", "#3B2418"],
  note: ["#7A7167", "#A99D91", "#D8CFC1", "#5D554D"],
};

export function featuresToTokens(features: ArtifactFeatures): VisualTokens {
  const { category, intensity, duration, balance, volatility, recovery, seed } = features;

  const palette = PALETTES[category] || PALETTES.note;

  const seedOffset = hashString(String(seed));

  const tokens: VisualTokens = {
    palette,
    ellipseCount: 0,
    spreadX: 0,
    spreadY: 0,
    blur: 0,
    noise: 0,
    accentCount: 0,
    rotationBias: 0,
    opacityBase: 0,
    elongation: 1,
    edgeSoftness: 0.5,
  };

  switch (category) {
    case "meal":
      tokens.ellipseCount = 4 + Math.floor(intensity * 4);
      tokens.spreadX = 0.6 + duration * 0.4;
      tokens.spreadY = 0.4 + intensity * 0.5;
      tokens.blur = 0.8 + balance * 0.3;
      tokens.noise = 0.2 + volatility * 0.3;
      tokens.accentCount = 1 + Math.floor(intensity * 3);
      tokens.rotationBias = seeded(seedOffset) * 40 - 20;
      tokens.opacityBase = 0.18 + intensity * 0.18;
      tokens.elongation = 0.8 + duration * 0.5;
      tokens.edgeSoftness = 0.6 + recovery * 0.3;
      break;

    case "run":
      tokens.ellipseCount = 5 + Math.floor(intensity * 4);
      tokens.spreadX = 0.5 + intensity * 0.3;
      tokens.spreadY = 0.7 + duration * 0.4;
      tokens.blur = 1.0 + (1 - volatility) * 0.5;
      tokens.noise = 0.15;
      tokens.accentCount = 2 + Math.floor(recovery * 2);
      tokens.rotationBias = -15 + seeded(seedOffset + 1) * 30;
      tokens.opacityBase = 0.14 + intensity * 0.16;
      tokens.elongation = 1.3 + duration * 0.6;
      tokens.edgeSoftness = 0.7;
      break;

    case "sleep":
      tokens.ellipseCount = 3 + Math.floor(intensity * 3);
      tokens.spreadX = 0.7 + intensity * 0.3;
      tokens.spreadY = 0.5;
      tokens.blur = 1.2 + intensity * 0.6;
      tokens.noise = 0.1 + volatility * 0.2;
      tokens.accentCount = 1 + Math.floor(balance > 0 ? balance * 3 : 0);
      tokens.rotationBias = -25 + seeded(seedOffset + 2) * 50;
      tokens.opacityBase = 0.1 + intensity * 0.14;
      tokens.elongation = 0.7 + seeded(seedOffset + 3) * 0.4;
      tokens.edgeSoftness = 0.8 + recovery * 0.2;
      break;

    case "glucose":
      tokens.ellipseCount = 3 + Math.floor(intensity * 3);
      tokens.spreadX = 0.4 + volatility * 0.4;
      tokens.spreadY = 0.5 + intensity * 0.4;
      tokens.blur = 0.6 + volatility * 0.5;
      tokens.noise = 0.3 + intensity * 0.3;
      tokens.accentCount = 1 + Math.floor(intensity * 2);
      tokens.rotationBias = seeded(seedOffset + 4) * 60 - 30;
      tokens.opacityBase = 0.2 + intensity * 0.16;
      tokens.elongation = 0.9 + seeded(seedOffset + 5) * 0.5;
      tokens.edgeSoftness = 0.5 + recovery * 0.3;
      break;

    case "stress":
      tokens.ellipseCount = 2 + Math.floor(intensity * 2);
      tokens.spreadX = 0.3 + volatility * 0.3;
      tokens.spreadY = 0.6 + intensity * 0.3;
      tokens.blur = 0.5;
      tokens.noise = 0.4 + volatility * 0.3;
      tokens.accentCount = Math.floor(intensity * 2);
      tokens.rotationBias = seeded(seedOffset + 6) * 90 - 45;
      tokens.opacityBase = 0.16 + intensity * 0.14;
      tokens.elongation = 1.1 + seeded(seedOffset + 7) * 0.5;
      tokens.edgeSoftness = 0.4;
      break;

    default:
      tokens.ellipseCount = 3;
      tokens.spreadX = 0.5;
      tokens.spreadY = 0.5;
      tokens.blur = 0.8;
      tokens.noise = 0.2;
      tokens.accentCount = 1;
      tokens.rotationBias = 0;
      tokens.opacityBase = 0.12;
      tokens.elongation = 1;
      tokens.edgeSoftness = 0.6;
      break;
  }

  return tokens;
}
