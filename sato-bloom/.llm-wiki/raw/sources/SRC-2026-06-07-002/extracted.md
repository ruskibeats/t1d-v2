export type EventCategory = "meal" | "run" | "sleep" | "glucose" | "stress" | "note";

export type Domain = "rest" | "move" | "nourish" | "energy" | "ground";

export type ZBand = "atmosphere" | "body" | "accent" | "ground";

export type PrimitiveKind = "oval" | "path" | "dot" | "anchor";

export type ArtifactFeatures = {
  category: EventCategory;
  intensity: number;    // 0..1  magnitude of the event
  duration: number;     // 0..1  how long
  balance: number;      // -1..1 negative to positive
  volatility: number;   // 0..1  how much it fluctuates
  recovery: number;     // 0..1  how well it resolves
  seed: number;
};

export type VisualTokens = {
  palette: string[];
  ellipseCount: number;
  spreadX: number;
  spreadY: number;
  blur: number;
  noise: number;
  accentCount: number;
  rotationBias: number;
  opacityBase: number;
  elongation: number;
  edgeSoftness: number;
};

export type VisualToken = {
  id: string;
  domain: Domain;
  kind: PrimitiveKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  blur: number;
  color: string;
  blendMode?: "srcOver" | "multiply";
  noiseAmp?: number;
  zBand: ZBand;
};

export type RenderScene = {
  atmosphere: VisualToken[];
  body: VisualToken[];
  accents: VisualToken[];
  ground: VisualToken[];
};

export type SceneLayer = VisualToken;
