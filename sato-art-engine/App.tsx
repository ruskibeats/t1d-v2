import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import Svg, {
  Circle,
  G,
  Path,
  Line,
} from "react-native-svg";

const { width } = Dimensions.get("window");

const colors = {
  paper: "#F4EFE6",
  paperLight: "#FBF7EF",
  paperDark: "#E8DED0",
  ink: "#241F1A",
  graphite: "#5D554D",
  muted: "#7A7167",
  navy: "#102334",
  navySoft: "#26394B",
  moss: "#6D7553",
  olive: "#8A8B5C",
  clay: "#B75A3E",
  clayDark: "#8E3F2F",
  gold: "#C7A86A",
  softBlue: "#9AA8B5",
  paleBlue: "#C7D0D7",
  blush: "#D9A18C",
  charcoal: "#111820",
  leather: "#3B2418",
  leatherLight: "#6B4630",
  creamStroke: "#D8CFC1",
  whiteInk: "#F8F1E7",
};

type MomentType =
  | "meal"
  | "walk"
  | "sleep"
  | "stress"
  | "insulin"
  | "note"
  | "glucose";

type BodyMoment = {
  id: string;
  type: MomentType;
  time: string;
  label: string;
  carbs?: number;
  sugars?: number;
  fat?: number;
  protein?: number;
  glucoseStart?: number;
  glucosePeak?: number;
  glucoseDelta?: number;
  activityMinutes?: number;
  sleepScore?: number;
  stress?: number;
  insulinUnits?: number;
};

type ArtLayer = {
  id: string;
  kind: "wash" | "blob" | "dot" | "line" | "dust";
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
  color: string;
  opacity: number;
  stroke?: string;
  strokeWidth?: number;
};

const demoDays: Record<string, BodyMoment[]> = {
  balanced: [
    {
      id: "sleep-good",
      type: "sleep",
      time: "Night",
      label: "Restful sleep",
      sleepScore: 88,
    },
    {
      id: "matcha",
      type: "meal",
      time: "7:45 AM",
      label: "Matcha Latte",
      carbs: 14,
      sugars: 5,
      fat: 4,
      protein: 5,
      glucoseDelta: 12,
    },
    {
      id: "salad",
      type: "meal",
      time: "1:14 PM",
      label: "Chicken Salad",
      carbs: 18,
      sugars: 3,
      fat: 14,
      protein: 32,
      glucoseDelta: 18,
    },
    {
      id: "walk",
      type: "walk",
      time: "4:35 PM",
      label: "Walk",
      activityMinutes: 28,
    },
    {
      id: "salmon",
      type: "meal",
      time: "7:18 PM",
      label: "Salmon & Veggies",
      carbs: 22,
      sugars: 6,
      fat: 18,
      protein: 35,
      glucoseDelta: 16,
    },
  ],
  spike: [
    {
      id: "sleep-ok",
      type: "sleep",
      time: "Night",
      label: "Light sleep",
      sleepScore: 68,
    },
    {
      id: "pastry",
      type: "meal",
      time: "8:20 AM",
      label: "Pastry & Coffee",
      carbs: 64,
      sugars: 38,
      fat: 18,
      protein: 6,
      glucoseDelta: 72,
    },
    {
      id: "stress-meeting",
      type: "stress",
      time: "11:30 AM",
      label: "Busy morning",
      stress: 82,
    },
    {
      id: "pizza",
      type: "meal",
      time: "7:40 PM",
      label: "Pizza",
      carbs: 78,
      sugars: 9,
      fat: 36,
      protein: 22,
      glucoseDelta: 64,
    },
  ],
  walkHelped: [
    {
      id: "sleep-soft",
      type: "sleep",
      time: "Night",
      label: "Soft sleep",
      sleepScore: 80,
    },
    {
      id: "oatmeal",
      type: "meal",
      time: "9:02 AM",
      label: "Oatmeal",
      carbs: 42,
      sugars: 12,
      fat: 8,
      protein: 10,
      glucoseDelta: 36,
    },
    {
      id: "lunch",
      type: "meal",
      time: "1:05 PM",
      label: "Rice Bowl",
      carbs: 58,
      sugars: 8,
      fat: 16,
      protein: 24,
      glucoseDelta: 45,
    },
    {
      id: "walk-long",
      type: "walk",
      time: "2:40 PM",
      label: "Long Walk",
      activityMinutes: 48,
    },
    {
      id: "tea",
      type: "note",
      time: "9:45 PM",
      label: "Chamomile Tea",
    },
  ],
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hashString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h);
}

function seeded(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

function mixColor(a: string, b: string, t: number) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(lerp(ca.r, cb.r, t), lerp(ca.g, cb.g, t), lerp(ca.b, cb.b, t));
}

function timeToPosition(time: string) {
  const match = time.match(/(\d+):(\d+)\s?(AM|PM)/i);
  if (!match) return 0.5;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridian = match[3].toUpperCase();

  if (meridian === "PM" && hour !== 12) hour += 12;
  if (meridian === "AM" && hour === 12) hour = 0;

  return clamp((hour + minute / 60) / 24, 0.05, 0.95);
}

function jitter(base: number, seed: number, amount: number) {
  return base + (seeded(seed) - 0.5) * amount;
}

function mealToLayers(moment: BodyMoment, size: number): ArtLayer[] {
  const seed = hashString(moment.id + moment.time);
  const carbs = moment.carbs ?? 0;
  const sugars = moment.sugars ?? 0;
  const fat = moment.fat ?? 0;
  const protein = moment.protein ?? 0;
  const glucoseDelta = moment.glucoseDelta ?? 0;

  const carbScale = clamp(carbs / 85, 0.16, 1.0);
  const sugarRatio = carbs > 0 ? clamp(sugars / carbs, 0, 1) : 0;
  const linger = clamp(fat / 42, 0, 1);
  const stability = clamp(protein / 40, 0, 1);
  const warmth = clamp(glucoseDelta / 80, 0, 1);
  const timeX = timeToPosition(moment.time);

  const x = jitter(size * timeX, seed + 1, size * 0.18);
  const y = jitter(size * 0.52, seed + 2, size * 0.38);
  const shapeVariant = seeded(seed + 9);
  const mainRx = size * (0.08 + carbScale * 0.18) * (0.7 + shapeVariant * 0.6);
  const mainRy = size * (0.06 + carbScale * 0.14) * (0.6 + seeded(seed + 12) * 0.8);

  const baseColor = mixColor(colors.gold, colors.clay, warmth);
  const fatTint = mixColor(baseColor, colors.blush, linger * 0.3);
  const proteinTint = mixColor(fatTint, colors.olive, stability * 0.25);
  const finalColor = proteinTint;

  const mainOpacity = clamp(0.1 + warmth * 0.12 + carbScale * 0.08, 0.08, 0.28);

  const layers: ArtLayer[] = [
    {
      id: `${moment.id}-main`,
      kind: "wash",
      x,
      y,
      rx: mainRx,
      ry: mainRy,
      rotation: jitter(-18, seed + 3, 72),
      color: finalColor,
      opacity: mainOpacity,
    },
  ];

  if (sugarRatio > 0.3) {
    layers.push({
      id: `${moment.id}-sugar-spot`,
      kind: "dot",
      x: jitter(x + size * 0.08, seed + 10, size * 0.06),
      y: jitter(y - size * 0.1, seed + 11, size * 0.06),
      rx: size * (0.01 + sugarRatio * 0.035 + warmth * 0.02),
      ry: size * (0.01 + sugarRatio * 0.035 + warmth * 0.02),
      rotation: 0,
      color: colors.clay,
      opacity: 0.4 + warmth * 0.25,
    });
  }

  return layers;
}

function walkToLayers(moment: BodyMoment, size: number): ArtLayer[] {
  const seed = hashString(moment.id + moment.time);
  const activity = clamp((moment.activityMinutes ?? 0) / 60, 0.1, 1);
  const x = size * timeToPosition(moment.time);
  const y = jitter(size * 0.64, seed + 1, size * 0.18);

  return [
    {
      id: `${moment.id}-main`,
      kind: "wash",
      x,
      y,
      rx: size * (0.1 + activity * 0.16),
      ry: size * (0.03 + activity * 0.04),
      rotation: jitter(-6, seed + 2, 22),
      color: colors.moss,
      opacity: clamp(0.08 + activity * 0.12, 0.06, 0.2),
    },
  ];
}

function sleepToLayers(moment: BodyMoment, size: number): ArtLayer[] {
  const score = clamp((moment.sleepScore ?? 70) / 100, 0.2, 1);
  const seed = hashString(moment.id + moment.time);

  return [
    {
      id: `${moment.id}-main`,
      kind: "wash",
      x: jitter(size * 0.5, seed + 1, size * 0.08),
      y: jitter(size * 0.48, seed + 2, size * 0.08),
      rx: size * (0.2 + score * 0.1),
      ry: size * (0.18 + score * 0.11),
      rotation: jitter(-18, seed + 3, 30),
      color: mixColor(colors.softBlue, colors.paleBlue, 0.5),
      opacity: clamp(0.06 + score * 0.1, 0.04, 0.18),
    },
  ];
}

function stressToLayers(moment: BodyMoment, size: number): ArtLayer[] {
  const seed = hashString(moment.id + moment.time);
  const stress = clamp((moment.stress ?? 50) / 100, 0.1, 1);
  const x = jitter(size * timeToPosition(moment.time), seed + 1, size * 0.1);
  const y = jitter(size * 0.42, seed + 2, size * 0.14);

  return [
    {
      id: `${moment.id}-stress-dark`,
      kind: "blob",
      x,
      y,
      rx: size * (0.06 + stress * 0.12),
      ry: size * (0.15 + stress * 0.13),
      rotation: jitter(8, seed + 3, 40),
      color: colors.navy,
      opacity: 0.18 + stress * 0.24,
    },
  ];
}

function noteToLayers(moment: BodyMoment, size: number): ArtLayer[] {
  const seed = hashString(moment.id + moment.time);
  const x = jitter(size * timeToPosition(moment.time), seed + 1, size * 0.12);
  const y = jitter(size * 0.72, seed + 2, size * 0.1);

  return [
    {
      id: `${moment.id}-note-dot`,
      kind: "dot",
      x,
      y,
      rx: size * 0.028,
      ry: size * 0.028,
      rotation: 0,
      color: colors.graphite,
      opacity: 0.38,
    },
  ];
}

function compileLayers(moments: BodyMoment[], size: number): ArtLayer[] {
  return moments.flatMap((moment) => {
    switch (moment.type) {
      case "meal":
        return mealToLayers(moment, size);
      case "walk":
        return walkToLayers(moment, size);
      case "sleep":
        return sleepToLayers(moment, size);
      case "stress":
        return stressToLayers(moment, size);
      case "note":
        return noteToLayers(moment, size);
      default:
        return noteToLayers(moment, size);
    }
  });
}

function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  degrees: number,
) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = x - cx;
  const dy = y - cy;

  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

function organicPath(
  layer: ArtLayer,
  seed: number,
  scale: number,
  wobble: number,
  points = 20,
) {
  const pts = Array.from({ length: points }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / points;
    const s = seed + i * 31;
    const uneven = scale * (1 - wobble / 2 + seeded(s) * wobble);
    const rawX = layer.x + Math.cos(angle) * layer.rx * uneven;
    const rawY = layer.y + Math.sin(angle) * layer.ry * uneven;
    return rotatePoint(rawX, rawY, layer.x, layer.y, layer.rotation);
  });

  const first = pts[0];
  let d = `M ${first.x} ${first.y}`;

  for (let i = 0; i < pts.length; i++) {
    const current = pts[i];
    const next = pts[(i + 1) % pts.length];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    d += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }

  return `${d} Z`;
}

function watercolorTidePath(
  layer: ArtLayer,
  seed: number,
  scale: number,
  wobble: number,
  points: number,
  irregularity: number,
) {
  const pts = Array.from({ length: points }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / points;
    const s = seed + i * 37;
    const r = scale * (1 - wobble / 2 + seeded(s) * wobble);
    const radiusJitter = 1 + (seeded(s + 7) - 0.5) * irregularity;
    const rawX = layer.x + Math.cos(angle) * layer.rx * r * radiusJitter;
    const rawY = layer.y + Math.sin(angle) * layer.ry * r * (1 + (seeded(s + 11) - 0.5) * irregularity * 0.7);
    return rotatePoint(rawX, rawY, layer.x, layer.y, layer.rotation + (seeded(s + 13) - 0.5) * 8);
  });

  const first = pts[0];
  let d = `M ${first.x} ${first.y}`;

  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    const cpx = (curr.x + next.x) / 2 + (seeded(seed + i * 51) - 0.5) * layer.rx * 0.04;
    const cpy = (curr.y + next.y) / 2 + (seeded(seed + i * 53) - 0.5) * layer.ry * 0.04;
    d += ` Q ${cpx} ${cpy} ${(curr.x + cpx) / 2} ${(curr.y + cpy) / 2}`;
  }

  return `${d} Z`;
}

function stainField(
  layer: ArtLayer,
  seed: number,
  cellCount: number,
 Falloff: number,
) {
  const cells: Array<{ cx: number; cy: number; r: number; opacity: number }> = [];

  for (let i = 0; i < cellCount; i++) {
    const s = seed + i * 59;
    const angle = seeded(s) * Math.PI * 2;
    const dist = Math.pow(seeded(s + 1), Falloff);
    const rawX = layer.x + Math.cos(angle) * layer.rx * dist;
    const rawY = layer.y + Math.sin(angle) * layer.ry * dist * 0.92;
    const p = rotatePoint(rawX, rawY, layer.x, layer.y, layer.rotation);
    const concentration = 1 - dist * 0.6 + (seeded(s + 3) - 0.5) * 0.35;

    cells.push({
      cx: p.x,
      cy: p.y,
      r: layer.rx * (0.02 + seeded(s + 5) * 0.09) * clamp(concentration, 0.15, 1.2),
      opacity: clamp(concentration * 0.85, 0.04, 0.95),
    });
  }

  return cells;
}

function tideRing(
  layer: ArtLayer,
  seed: number,
  beadCount: number,
  radiusScale: number,
  irregularity: number,
) {
  const beads: Array<{ cx: number; cy: number; r: number; opacity: number }> = [];

  for (let i = 0; i < beadCount; i++) {
    const s = seed + i * 43;
    const angle = seeded(s) * Math.PI * 2;
    const rScale = radiusScale * (1 + (seeded(s + 1) - 0.5) * irregularity);
    const pullIn = seeded(s + 2) * 0.28;
    const rawX = layer.x + Math.cos(angle) * layer.rx * (rScale - pullIn);
    const rawY = layer.y + Math.sin(angle) * layer.ry * (rScale - pullIn * 0.7);
    const p = rotatePoint(rawX, rawY, layer.x, layer.y, layer.rotation);

    beads.push({
      cx: p.x + (seeded(s + 3) - 0.5) * layer.rx * 0.012,
      cy: p.y + (seeded(s + 4) - 0.5) * layer.ry * 0.012,
      r: layer.rx * (0.004 + seeded(s + 6) * 0.022) * (0.5 + (seeded(s + 7) * 0.5)),
      opacity: 0.1 + seeded(s + 8) * 0.75,
    });
  }

  return beads;
}

function brushStrokePath(
  layer: ArtLayer,
  seed: number,
  elongation: number,
  irregularity: number,
  points: number,
) {
  const rx = layer.rx;
  const ry = layer.ry * elongation;

  const pts = Array.from({ length: points }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / points;
    const s = seed + i * 37;
    const wobble = 1 + (seeded(s) - 0.5) * irregularity;
    const pinchAngle = seeded(s + 3) * Math.PI * 2;
    const pinch = 1 + Math.cos(angle - pinchAngle) * 0.18 * irregularity;
    const r = wobble * pinch;
    const x = layer.x + Math.cos(angle) * rx * r;
    const y = layer.y + Math.sin(angle) * ry * r;
    return rotatePoint(x, y, layer.x, layer.y, layer.rotation);
  });

  const first = pts[0];
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;

  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    const midX = ((curr.x + next.x) / 2).toFixed(1);
    const midY = ((curr.y + next.y) / 2).toFixed(1);
    d += ` Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${midX} ${midY}`;
  }

  return `${d} Z`;
}

function paperTexture(
  layer: ArtLayer,
  seed: number,
  count: number,
  minR: number,
  maxR: number,
  minOpacity: number,
  maxOpacity: number,
) {
  return Array.from({ length: count }).map((_, i) => {
    const s = seed + i * 43;
    const angle = seeded(s) * Math.PI * 2;
    const dist = Math.pow(seeded(s + 1), 0.7);
    const rawX = layer.x + Math.cos(angle) * layer.rx * dist;
    const rawY = layer.y + Math.sin(angle) * layer.ry * dist;
    const p = rotatePoint(rawX, rawY, layer.x, layer.y, layer.rotation);
    return {
      cx: p.x,
      cy: p.y,
      r: minR + seeded(s + 2) * (maxR - minR),
      opacity: minOpacity + seeded(s + 3) * (maxOpacity - minOpacity),
    };
  });
}

function tideRimDots(
  layer: ArtLayer,
  seed: number,
  count: number,
  radiusScale: number,
) {
  return Array.from({ length: count }).map((_, i) => {
    const s = seed + i * 53;
    const angle = seeded(s) * Math.PI * 2;
    const r = radiusScale * (0.88 + seeded(s + 1) * 0.2);
    const pullIn = seeded(s + 2) * 0.18;
    const rawX = layer.x + Math.cos(angle) * layer.rx * (r - pullIn);
    const rawY = layer.y + Math.sin(angle) * layer.ry * (r - pullIn * 0.5);
    const p = rotatePoint(rawX, rawY, layer.x, layer.y, layer.rotation);
    return {
      cx: p.x,
      cy: p.y,
      r: 0.4 + seeded(s + 4) * 1.6,
      opacity: 0.15 + seeded(s + 5) * 0.5,
    };
  });
}

function PaintedBlob({
  layer,
  size,
}: {
  layer: ArtLayer;
  size: number;
}) {
  const seed = hashString(layer.id);

  const elongation = 0.7 + seeded(seed + 5) * 0.6;
  const irregularity = 0.2 + seeded(seed + 7) * 0.25;
  const strokePath = brushStrokePath(layer, seed + 10, elongation, irregularity, 18);

  const paperDots = paperTexture(
    layer, seed + 200, 35,
    size * 0.003, size * 0.018,
    0.2, 0.6,
  );

  const rimDots = tideRimDots(layer, seed + 350, 24, 0.95);

  const washOpacity = clamp(layer.opacity * 0.5, 0.05, 0.16);

  return (
    <G>
      <Path d={strokePath} fill={layer.color} opacity={washOpacity} />

      {paperDots.map((p, i) => (
        <Circle
          key={`${layer.id}-paper-${i}`}
          cx={p.cx}
          cy={p.cy}
          r={p.r}
          fill={colors.paperLight}
          opacity={p.opacity}
        />
      ))}

      {rimDots.map((b, i) => (
        <Circle
          key={`${layer.id}-rim-${i}`}
          cx={b.cx}
          cy={b.cy}
          r={b.r}
          fill={layer.color}
          opacity={b.opacity}
        />
      ))}
    </G>
  );
}

function BodyArt({
  moments,
  size = 300,
  reveal = false,
}: {
  moments: BodyMoment[];
  size?: number;
  reveal?: boolean;
}) {
  const layers = useMemo(() => compileLayers(moments, size), [moments, size]);

  const paperGrain = useMemo(() => {
    const grainSeed = 42;
    return Array.from({ length: 120 }).map((_, i) => {
      const s = grainSeed + i * 17;
      return {
        cx: seeded(s) * size,
        cy: seeded(s + 1) * size,
        r: 0.3 + seeded(s + 2) * 1.5,
        opacity: 0.03 + seeded(s + 3) * 0.08,
      };
    });
  }, [size]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paperGrain.map((g, i) => (
        <Circle
          key={`paper-${i}`}
          cx={g.cx}
          cy={g.cy}
          r={g.r}
          fill={colors.paperDark}
          opacity={g.opacity}
        />
      ))}
      <G opacity={reveal ? 0.48 : 1}>
        {layers.map((layer) => {
          if (layer.kind === "line") {
            return (
              <Line
                key={layer.id}
                x1={layer.x}
                y1={layer.y}
                x2={layer.rx}
                y2={layer.ry}
                stroke={layer.stroke ?? layer.color}
                strokeWidth={layer.strokeWidth ?? 1}
                opacity={layer.opacity}
              />
            );
          }

          if (layer.kind === "dot") {
            return (
              <Circle
                key={layer.id}
                cx={layer.x}
                cy={layer.y}
                r={layer.rx}
                fill={layer.color}
                opacity={layer.opacity}
              />
            );
          }

          return <PaintedBlob key={layer.id} layer={layer} size={size} />;
        })}

        <Path
          d={`M ${size * 0.19} ${size * 0.76} C ${size * 0.36} ${size * 0.58}, ${
            size * 0.58
          } ${size * 0.84}, ${size * 0.82} ${size * 0.45}`}
          stroke={colors.clay}
          strokeWidth={1.1}
          fill="none"
          opacity={0.36}
        />

        <Circle
          cx={size * 0.24}
          cy={size * 0.78}
          r={size * 0.018}
          fill={colors.navy}
          opacity={0.86}
        />

        <Circle
          cx={size * 0.79}
          cy={size * 0.28}
          r={size * 0.034}
          fill={colors.clay}
          opacity={0.82}
        />
      </G>

      {reveal && (
        <G>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size * 0.2}
            fill={colors.paperLight}
            opacity={0.86}
          />
          <TextSvg
            x={size / 2}
            y={size / 2 - 4}
            text="108"
            fontSize={size * 0.16}
            color={colors.ink}
          />
          <TextSvg
            x={size / 2}
            y={size / 2 + size * 0.085}
            text="quietly steady"
            fontSize={size * 0.035}
            color={colors.muted}
          />
        </G>
      )}
    </Svg>
  );
}

function TextSvg({
  x,
  y,
  text,
  fontSize,
  color,
}: {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}) {
  const SvgText = require("react-native-svg").Text;
  return (
    <SvgText
      x={x}
      y={y}
      fontSize={fontSize}
      fill={color}
      textAnchor="middle"
      fontFamily="Georgia"
    >
      {text}
    </SvgText>
  );
}

function MiniMark({ moments }: { moments: BodyMoment[] }) {
  return (
    <View style={styles.miniMark}>
      <BodyArt moments={moments} size={46} />
    </View>
  );
}

export default function App() {
  const [dayKey, setDayKey] = useState<keyof typeof demoDays>("balanced");
  const [reveal, setReveal] = useState(false);

  const moments = demoDays[dayKey];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.logo}>Sato</Text>
            <Text style={styles.tagline}>Art engine test</Text>
          </View>
          <Text style={styles.smallNote}>
            Inputs compile into the same page every time.
          </Text>
        </View>

        <View style={styles.segment}>
          {Object.keys(demoDays).map((key) => (
            <Pressable
              key={key}
              onPress={() => setDayKey(key as keyof typeof demoDays)}
              style={[styles.segmentButton, dayKey === key && styles.segmentActive]}
            >
              <Text
                style={[
                  styles.segmentText,
                  dayKey === key && styles.segmentTextActive,
                ]}
              >
                {key}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.page}>
          <Text style={styles.pageTitle}>Today</Text>
          <Text style={styles.pageSub}>The day unfolds.</Text>

          <Pressable
            onPressIn={() => setReveal(true)}
            onPressOut={() => setReveal(false)}
            style={styles.artPress}
          >
            <BodyArt moments={moments} size={Math.min(width - 70, 340)} reveal={reveal} />
          </Pressable>

          <Text style={styles.hint}>Press and hold the mark to reveal the number.</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Your day, as it happens.</Text>
          <Text style={styles.panelSub}>Each moment leaves a mark.</Text>

          {moments.map((moment) => (
            <View key={moment.id} style={styles.momentRow}>
              <MiniMark moments={[moment]} />
              <View style={styles.momentText}>
                <Text style={styles.momentLabel}>{moment.label}</Text>
                <Text style={styles.momentMeta}>
                  {moment.time} · {describeMoment(moment)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>What the art means</Text>

          <Legend color={colors.gold} label="Carbs" note="larger warm bloom" />
          <Legend color={colors.clay} label="Sugar / glucose rise" note="clay dot and warmth" />
          <Legend color={colors.blush} label="Fat" note="lingering trailing wash" />
          <Legend color={colors.olive} label="Protein" note="stabilising olive layer" />
          <Legend color={colors.moss} label="Walk" note="opens the composition" />
          <Legend color={colors.softBlue} label="Sleep" note="soft blue background wash" />
          <Legend color={colors.navy} label="Stress" note="dark compressed shape" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function describeMoment(moment: BodyMoment) {
  if (moment.type === "meal") {
    return `${moment.carbs ?? 0}g carbs, +${moment.glucoseDelta ?? 0} mg/dL`;
  }
  if (moment.type === "walk") {
    return `${moment.activityMinutes ?? 0} min movement`;
  }
  if (moment.type === "sleep") {
    return `${moment.sleepScore ?? 0} sleep score`;
  }
  if (moment.type === "stress") {
    return `${moment.stress ?? 0} stress`;
  }
  return "quiet note";
}

function Legend({
  color,
  label,
  note,
}: {
  color: string;
  label: string;
  note: string;
}) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.legendLabel}>{label}</Text>
        <Text style={styles.legendNote}>{note}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: {
    padding: 22,
    paddingBottom: 60,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "flex-end",
    marginBottom: 22,
  },
  logo: {
    fontFamily: "Georgia",
    fontSize: 54,
    color: colors.ink,
  },
  tagline: {
    fontFamily: "Georgia",
    fontSize: 22,
    color: colors.ink,
    marginTop: 2,
  },
  smallNote: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "right",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.paperLight,
    borderRadius: 999,
    padding: 5,
    marginBottom: 20,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: colors.navy,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 13,
    textTransform: "capitalize",
  },
  segmentTextActive: {
    color: colors.whiteInk,
  },
  page: {
    backgroundColor: colors.paperLight,
    borderRadius: 34,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    marginBottom: 22,
  },
  pageTitle: {
    fontFamily: "Georgia",
    fontSize: 28,
    color: colors.ink,
  },
  pageSub: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 10,
  },
  artPress: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 8,
  },
  panel: {
    backgroundColor: colors.paperLight,
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(36,31,26,0.06)",
  },
  panelTitle: {
    fontFamily: "Georgia",
    fontSize: 24,
    color: colors.ink,
  },
  panelSub: {
    color: colors.muted,
    marginTop: 6,
    marginBottom: 18,
  },
  momentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(36,31,26,0.06)",
  },
  miniMark: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  momentText: {
    flex: 1,
  },
  momentLabel: {
    fontFamily: "Georgia",
    fontSize: 17,
    color: colors.ink,
  },
  momentMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 10,
  },
  legendDot: {
    width: 22,
    height: 22,
    borderRadius: 99,
    opacity: 0.78,
  },
  legendLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
  },
  legendNote: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
