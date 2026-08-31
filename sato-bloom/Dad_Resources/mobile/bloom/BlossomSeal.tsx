import React from "react";
import { Group, Path, Circle, Skia } from "@shopify/react-native-skia";
import { rgba, bloomPalette } from "./bloomColors";

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

type BlossomSealProps = {
  paperCx: number;
  paperCy: number;
  size: number;
  centerProgress: number;
};

function makePetalPath(
  cx: number,
  cy: number,
  angle: number,
  petalLen: number,
  maxWidth: number,
  seed: string
) {
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const perp = { x: -Math.sin(angle), y: Math.cos(angle) };
  const path = Skia.Path.Make();

  const s = noise(`${seed}-swell`, 0.5, 1) * 0.4;
  const startW = maxWidth * 0.08 * s;
  path.moveTo(cx - perp.x * startW, cy - perp.y * startW);

  const m1 = noise(`${seed}-m1`, -1, 1) * petalLen * 0.1;
  const m2 = noise(`${seed}-m2`, -1, 1) * petalLen * 0.12;
  const tw = noise(`${seed}-tw`, -1, 1) * petalLen * 0.04;
  path.cubicTo(
    cx + dir.x * petalLen * 0.18 - perp.x * maxWidth * 0.52 + perp.x * m1,
    cy + dir.y * petalLen * 0.18 - perp.y * maxWidth * 0.52 + perp.y * m1,
    cx + dir.x * petalLen * 0.4 - perp.x * maxWidth * 0.88 + perp.x * m2,
    cy + dir.y * petalLen * 0.4 - perp.y * maxWidth * 0.88 + perp.y * m2,
    cx + dir.x * petalLen * 0.55 - perp.x * maxWidth * 0.38 - perp.x * petalLen * 0.025,
    cy + dir.y * petalLen * 0.55 - perp.y * maxWidth * 0.38 - perp.y * petalLen * 0.025
  );

  path.cubicTo(
    cx + dir.x * petalLen * 0.65 - perp.x * petalLen * 0.08 + perp.x * tw,
    cy + dir.y * petalLen * 0.65 - perp.y * petalLen * 0.08 + perp.y * tw,
    cx + dir.x * petalLen * 0.72 - perp.x * petalLen * 0.035 + perp.x * tw * 0.5,
    cy + dir.y * petalLen * 0.72 - perp.y * petalLen * 0.035 + perp.y * tw * 0.5,
    cx + dir.x * petalLen * 0.78 + perp.x * noise(`${seed}-tx`, -1, 1) * petalLen * 0.015,
    cy + dir.y * petalLen * 0.78 + perp.y * noise(`${seed}-ty`, -1, 1) * petalLen * 0.015
  );

  const m3 = noise(`${seed}-m3`, -1, 1) * petalLen * 0.1;
  const m4 = noise(`${seed}-m4`, -1, 1) * petalLen * 0.08;
  path.cubicTo(
    cx + dir.x * petalLen * 0.7 + perp.x * petalLen * 0.065,
    cy + dir.y * petalLen * 0.7 + perp.y * petalLen * 0.065,
    cx + dir.x * petalLen * 0.38 + perp.x * maxWidth * 0.82 + perp.x * m3,
    cy + dir.y * petalLen * 0.38 + perp.y * maxWidth * 0.82 + perp.y * m3,
    cx + dir.x * petalLen * 0.16 + perp.x * maxWidth * 0.48 + perp.x * m4,
    cy + dir.y * petalLen * 0.16 + perp.y * maxWidth * 0.48 + perp.y * m4
  );

  path.cubicTo(
    cx + dir.x * petalLen * 0.06 + perp.x * startW * 0.6,
    cy + dir.y * petalLen * 0.06 + perp.y * startW * 0.6,
    cx + dir.x * petalLen * 0.02 + perp.x * startW * 0.3,
    cy + dir.y * petalLen * 0.02 + perp.y * startW * 0.3,
    cx - perp.x * startW,
    cy - perp.y * startW
  );
  path.close();
  return path;
}

export function BlossomSeal({
  paperCx,
  paperCy,
  size,
  centerProgress,
}: BlossomSealProps) {
  const petalLen = size * 0.105;
  const petalWid = size * 0.054;
  const baseAngles = [
    -Math.PI / 4,
    Math.PI / 4,
    (3 * Math.PI) / 4,
    (-3 * Math.PI) / 4,
  ];

  const warmColor = "#E8D0A8";
  const coolColor = "#8EA9A8";

  return (
    <Group opacity={centerProgress}>
      <Circle
        cx={paperCx + size * 0.004}
        cy={paperCy + size * 0.006}
        r={size * 0.115}
        color="rgba(140,125,105,0.06)"
      />

      {baseAngles.map((baseAngle, petalIdx) =>
        [0,1,2,3].map((_, layer) => {
          const seed = `blossom-${petalIdx}-${layer}`;
          const angle = baseAngle + noise(`${seed}-rot`, -0.04, 0.04);
          const pl = petalLen * (0.88 + layer * 0.03 + noise(`${seed}-pl`, -0.03, 0.03));
          const pw = petalWid * (0.85 + layer * 0.025 + noise(`${seed}-pw`, -0.02, 0.03));
          const petal = makePetalPath(paperCx, paperCy, angle, pl, pw, seed);
          const t = layer / 3;
          const alpha = 0.12 + t * 0.04;
          return (
            <Path
              key={`${petalIdx}-${layer}`}
              path={petal}
              color={rgba(
                petalIdx % 2 === 0 ? warmColor : coolColor,
                alpha
              )}
            />
          );
        })
      )}

      <Circle cx={paperCx} cy={paperCy} r={size * 0.04} color={rgba(warmColor, 0.35)} />

      {([0,1,2,3,4,5,6,7,8,9,10,11,12,13]).map((_, i) => {
        const seed = `seal-tx-${i}`;
        const pt = pointFrom(
          paperCx,
          paperCy,
          noise(`${seed}-a`, 0, Math.PI * 2),
          size * noise(`${seed}-d`, 0.01, 0.09)
        );
        return (
          <Circle
            key={seed}
            cx={pt.x}
            cy={pt.y}
            r={noise(`${seed}-r`, 0.2, 0.6)}
            color="rgba(170,150,125,0.1)"
          />
        );
      })}
    </Group>
  );
}