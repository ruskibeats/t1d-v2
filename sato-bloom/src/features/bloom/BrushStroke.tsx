import React from "react";
import { Circle, Group, Path, Skia } from "@shopify/react-native-skia";
import { rgba } from "./bloomColors";

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

function noise(key: string, min = -1, max = 1) {
  const h = hashString(key);
  const n = (h % 10000) / 10000;
  return min + (max - min) * n;
}

function pointFrom(cx: number, cy: number, angle: number, distance: number) {
  return {
    x: cx + Math.cos(angle) * distance,
    y: cy + Math.sin(angle) * distance,
  };
}

function buildBrushPath(
  origin: { x: number; y: number },
  angle: number,
  length: number,
  maxWidth: number,
  canvasSize: number,
  seed: string
) {
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const perp = { x: -Math.sin(angle), y: Math.cos(angle) };
  const path = Skia.Path.Make();
  const j = (base: number, amp: number, s: string) => perp.x * canvasSize * (base + noise(`${seed}-${s}`, -1, 1) * amp);
  const jy = (base: number, amp: number, s: string) => perp.y * canvasSize * (base + noise(`${seed}-${s}`, -1, 1) * amp);

  const t0 = origin.x - dir.x * length * 0.4 - perp.x * canvasSize * 0.005;
  const t1 = origin.y - dir.y * length * 0.4 - perp.y * canvasSize * 0.005;
  path.moveTo(t0, t1);

  // Upper edge
  path.cubicTo(
    origin.x - dir.x * length * 0.18 - perp.x * maxWidth * 0.5 + j(0.008, 0.014, 'u1'),
    origin.y - dir.y * length * 0.18 - perp.y * maxWidth * 0.5 + jy(0.008, 0.014, 'u2'),
    origin.x + dir.x * length * 0.32 - perp.x * maxWidth * 0.88 + j(0.006, 0.015, 'u3'),
    origin.y + dir.y * length * 0.32 - perp.y * maxWidth * 0.88 + jy(0.006, 0.015, 'u4'),
    origin.x + dir.x * length * 0.52 - perp.x * maxWidth * 0.26 + j(0.004, 0.012, 'u5'),
    origin.y + dir.y * length * 0.52 - perp.y * maxWidth * 0.26 + jy(0.004, 0.012, 'u6')
  );

  // End tip taper
  path.cubicTo(
    origin.x + dir.x * length * 0.58 - j(0.008, 0.01, 't1'),
    origin.y + dir.y * length * 0.58 - jy(0.008, 0.01, 't2'),
    origin.x + dir.x * length * 0.62 - perp.x * canvasSize * 0.004,
    origin.y + dir.y * length * 0.62 - perp.y * canvasSize * 0.004,
    origin.x + dir.x * length * 0.66 + perp.x * canvasSize * 0.001,
    origin.y + dir.y * length * 0.66 + perp.y * canvasSize * 0.001
  );

  // Lower edge
  path.cubicTo(
    origin.x + dir.x * length * 0.56 + j(0.008, 0.012, 'l1'),
    origin.y + dir.y * length * 0.56 + jy(0.008, 0.012, 'l2'),
    origin.x + dir.x * length * 0.26 + perp.x * maxWidth * 0.82 + j(0.006, 0.014, 'l3'),
    origin.y + dir.y * length * 0.26 + perp.y * maxWidth * 0.82 + jy(0.006, 0.014, 'l4'),
    origin.x - dir.x * length * 0.14 + perp.x * maxWidth * 0.42,
    origin.y - dir.y * length * 0.14 + perp.y * maxWidth * 0.42
  );

  // Close
  path.cubicTo(
    origin.x - dir.x * length * 0.26 + j(0.008, 0.012, 'c1'),
    origin.y - dir.y * length * 0.26 + jy(0.008, 0.012, 'c2'),
    origin.x - dir.x * length * 0.34 + perp.x * canvasSize * 0.003,
    origin.y - dir.y * length * 0.34 + perp.y * canvasSize * 0.003,
    t0, t1
  );
  path.close();
  return path;
}

export type BrushStrokeProps = {
  cx: number;
  cy: number;
  angle: number;
  distance: number;
  length: number;
  maxWidth: number;
  color: string;
  noiseSeed: string;
  canvasSize: number;
  opacity?: number;
  ghostOpacity?: number;
  ghostOffset?: { x: number; y: number };
  pigmentPool?: { position: number; radius: number; opacity: number };
};

export function BrushStroke({
  cx,
  cy,
  angle,
  distance,
  length,
  maxWidth,
  color,
  noiseSeed,
  canvasSize,
  opacity = 0.1,
  ghostOpacity = 0.04,
  ghostOffset = { x: 0, y: 0 },
  pigmentPool,
}: BrushStrokeProps) {
  const origin = pointFrom(cx, cy, angle, distance);
  const path = buildBrushPath(origin, angle, length, maxWidth, canvasSize, noiseSeed);

  return (
    <Group>
      <Path path={path} color={rgba(color, opacity)} />
      <Path
        path={path}
        color={rgba(color, ghostOpacity)}
        transform={[{ translateX: ghostOffset.x }, { translateY: ghostOffset.y }]}
      />
      {pigmentPool && (
        <Circle
          cx={origin.x + Math.cos(angle) * length * pigmentPool.position}
          cy={origin.y + Math.sin(angle) * length * pigmentPool.position}
          r={pigmentPool.radius}
          color={rgba(color, pigmentPool.opacity)}
        />
      )}
    </Group>
  );
}