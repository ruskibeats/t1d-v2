import type { ArtifactFeatures, Domain, RenderScene, VisualToken, VisualTokens } from "../types/artifact";
import { featuresToTokens } from "../grammar/mapper";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function seeded(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function categoryToDomain(category: ArtifactFeatures["category"]): Domain {
  switch (category) {
    case "sleep": return "rest";
    case "run": return "move";
    case "meal": return "nourish";
    case "glucose":
    case "stress": return "energy";
    default: return "ground";
  }
}

const DOMAIN_COLORS: Record<Domain, string[]> = {
  rest: ["#9AA8B5", "#C7D0D7", "#B9C2C5"],
  move: ["#6D7553", "#8A8B5C", "#5D7E6E"],
  nourish: ["#C7A86A", "#D9A18C", "#B75A3E"],
  energy: ["#B75A3E", "#C96E45", "#8E3F2F"],
  ground: ["#102334", "#26394B"],
};

function makeToken(partial: Omit<VisualToken, "blendMode" | "noiseAmp"> & Pick<Partial<VisualToken>, "blendMode" | "noiseAmp">): VisualToken {
  return partial;
}

function addAtmosphere(scene: RenderScene, features: ArtifactFeatures, tokens: VisualTokens, w: number, h: number) {
  if (features.category !== "sleep" && features.category !== "run") return;

  const domain = categoryToDomain(features.category);
  const s = features.seed + 71;
  const color = DOMAIN_COLORS[domain][0];

  scene.atmosphere.push(makeToken({
    id: `${features.seed}-atmosphere-${features.category}`,
    domain,
    kind: "oval",
    zBand: "atmosphere",
    x: w * (features.category === "sleep" ? 0.5 : 0.43) + (seeded(s) - 0.5) * w * 0.08,
    y: h * (features.category === "sleep" ? 0.28 : 0.47) + (seeded(s + 1) - 0.5) * h * 0.06,
    width: w * (0.54 + seeded(s + 2) * 0.18),
    height: h * (0.2 + seeded(s + 3) * 0.12),
    rotation: (-18 + seeded(s + 4) * 36) * Math.PI / 180,
    opacity: clamp(0.055 + features.recovery * 0.07, 0.05, 0.14),
    blur: features.category === "sleep" ? 4 : 2,
    color,
    blendMode: "srcOver",
    noiseAmp: tokens.noise * 0.4,
  }));
}

function addBody(scene: RenderScene, features: ArtifactFeatures, tokens: VisualTokens, w: number, h: number, index: number, count: number) {
  const domain = categoryToDomain(features.category);
  if (domain === "energy" && features.category === "glucose") return;

  const t = count <= 1 ? 0.5 : index / (count - 1);
  const s = features.seed + index * 223;
  const colors = DOMAIN_COLORS[domain];

  // One dominant mass and one secondary mass. This keeps the centre from turning to sludge.
  const nodeCount = domain === "ground" ? 0 : domain === "rest" ? 1 : 2;

  for (let i = 0; i < nodeCount; i++) {
    const isPrimary = i === 0;
    const vertical = 0.33 + t * 0.45;
    const domainX = domain === "move" ? 0.42 : domain === "nourish" ? 0.53 : domain === "rest" ? 0.48 : 0.56;
    const domainY = domain === "rest" ? Math.min(vertical, 0.38) : vertical;

    const axisBias = domain === "move" ? 1.55 : domain === "nourish" ? 0.95 : domain === "rest" ? 1.25 : 0.82;
    const width = w * (isPrimary ? 0.34 : 0.24) * axisBias * (0.8 + features.intensity * 0.45);
    const height = h * (isPrimary ? 0.15 : 0.11) / Math.max(axisBias * 0.72, 0.72) * (0.82 + features.duration * 0.35);

    scene.body.push(makeToken({
      id: `${features.seed}-body-${domain}-${i}`,
      domain,
      kind: domain === "move" ? "path" : "oval",
      zBand: "body",
      x: w * domainX + (seeded(s + i) - 0.5) * w * 0.12 + (i === 1 ? -w * 0.08 : 0),
      y: h * domainY + (seeded(s + i + 9) - 0.5) * h * 0.075 + (i === 1 ? h * 0.055 : 0),
      width,
      height,
      rotation: (tokens.rotationBias + (seeded(s + i + 2) - 0.5) * (domain === "move" ? 34 : 24)) * Math.PI / 180,
      opacity: clamp(tokens.opacityBase * (isPrimary ? 0.92 : 0.68), 0.16, 0.34),
      blur: domain === "rest" ? 1.8 : 0.4,
      color: colors[(i + Math.floor(seeded(s + 5) * colors.length)) % colors.length],
      blendMode: domain === "nourish" || domain === "move" ? "multiply" : "srcOver",
      noiseAmp: clamp(tokens.noise + features.volatility * 0.2, 0.08, 0.56),
    }));
  }
}

function addAccents(scene: RenderScene, features: ArtifactFeatures, tokens: VisualTokens, w: number, h: number, index: number, count: number) {
  const domain = categoryToDomain(features.category);
  if (domain !== "energy" && features.category !== "meal") return;

  const t = count <= 1 ? 0.5 : index / (count - 1);
  const s = features.seed + 600;
  const maxNodes = features.category === "meal" ? 3 : 5;
  const nodeCount = clamp(Math.round(1 + features.intensity * maxNodes), 2, maxNodes);
  const baseX = w * (features.category === "meal" ? 0.57 : 0.62);
  const baseY = h * (0.37 + t * 0.48);

  for (let i = 0; i < nodeCount; i++) {
    const a = seeded(s + i * 7) * Math.PI * 2;
    const orbit = w * (0.055 + seeded(s + i * 7 + 1) * 0.115);
    scene.accents.push(makeToken({
      id: `${features.seed}-accent-${features.category}-${i}`,
      domain: "energy",
      kind: "dot",
      zBand: "accent",
      x: baseX + Math.cos(a) * orbit,
      y: baseY + Math.sin(a) * orbit * 1.25,
      width: 7 + seeded(s + i * 11) * (features.category === "glucose" ? 13 : 18),
      height: 7 + seeded(s + i * 13) * 12,
      rotation: 0,
      opacity: clamp(0.42 + features.intensity * 0.36, 0.42, 0.8),
      blur: 0,
      color: DOMAIN_COLORS.energy[i % DOMAIN_COLORS.energy.length],
      blendMode: "srcOver",
      noiseAmp: tokens.noise,
    }));
  }
}

function addGround(scene: RenderScene, featuresList: ArtifactFeatures[], w: number, h: number) {
  const warmMass = featuresList.filter((f) => f.category === "meal" || f.category === "glucose");
  const warmBias = warmMass.reduce((acc, f) => acc + f.intensity, 0) / Math.max(warmMass.length, 1);
  const anchorRight = warmBias > 0.55;

  const anchors = [
    { x: anchorRight ? 0.25 : 0.74, y: 0.76, r: 0.018 },
    { x: anchorRight ? 0.70 : 0.28, y: 0.29, r: 0.012 },
  ];

  anchors.forEach((a, i) => {
    scene.ground.push(makeToken({
      id: `ground-anchor-${i}`,
      domain: "ground",
      kind: "anchor",
      zBand: "ground",
      x: w * a.x,
      y: h * a.y,
      width: w * a.r,
      height: w * a.r,
      rotation: 0,
      opacity: i === 0 ? 0.88 : 0.78,
      blur: 0,
      color: DOMAIN_COLORS.ground[i % DOMAIN_COLORS.ground.length],
      blendMode: "srcOver",
      noiseAmp: 0,
    }));
  });
}

function enforceSceneConstraints(scene: RenderScene): RenderScene {
  return {
    atmosphere: scene.atmosphere.slice(0, 3),
    body: scene.body.slice(0, 4),
    accents: scene.accents.slice(0, 7),
    ground: scene.ground.slice(0, 2),
  };
}

export function buildRenderScene(featuresList: ArtifactFeatures[], canvasWidth: number, canvasHeight: number): RenderScene {
  const scene: RenderScene = { atmosphere: [], body: [], accents: [], ground: [] };
  const count = featuresList.length;

  featuresList.forEach((features, index) => {
    const tokens = featuresToTokens(features);
    addAtmosphere(scene, features, tokens, canvasWidth, canvasHeight);
    addBody(scene, features, tokens, canvasWidth, canvasHeight, index, count);
    addAccents(scene, features, tokens, canvasWidth, canvasHeight, index, count);
  });

  addGround(scene, featuresList, canvasWidth, canvasHeight);
  return enforceSceneConstraints(scene);
}
