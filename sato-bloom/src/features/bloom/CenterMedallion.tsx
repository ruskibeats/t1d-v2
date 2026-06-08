import React from "react";
import { Group, Oval, Circle } from "@shopify/react-native-skia";
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

type CenterMedallionProps = {
  paperCx: number;
  paperCy: number;
  size: number;
  centerProgress: number;
};

export function CenterMedallion({ paperCx, paperCy, size, centerProgress }: CenterMedallionProps) {
  return (
    <Group opacity={centerProgress}>
      {Array.from({ length: 7 }).map((_, i) => {
        const r = size * noise(`med-r-${i}`, 0.09, 0.118);
        return (
          <Oval
            key={`med-${i}`}
            x={paperCx - r * noise(`med-rx-${i}`, 0.82, 1.1)}
            y={paperCy - r * noise(`med-ry-${i}`, 0.78, 1.06)}
            width={r * 2 * noise(`med-w-${i}`, 0.82, 1.1)}
            height={r * 2 * noise(`med-h-${i}`, 0.76, 1.06)}
            color={rgba(i % 2 === 0 ? bloomPalette.paper : "#FFF9EF", i < 3 ? 0.2 + i * 0.04 : 0.32 + i * 0.045)}
            transform={[{ rotate: noise(`med-wobble-${i}`, -0.18, 0.18) }]}
            origin={{ x: paperCx, y: paperCy }}
          />
        );
      })}
      {Array.from({ length: 20 }).map((_, i) => {
        const dot = pointFrom(
          paperCx,
          paperCy,
          noise(`speck-a-${i}`, 0, Math.PI * 2),
          size * noise(`speck-r-${i}`, 0.008, 0.095)
        );
        return (
          <Circle
            key={`speck-${i}`}
            cx={dot.x}
            cy={dot.y}
            r={noise(`speck-size-${i}`, 0.25, 0.7)}
            color="rgba(160,145,125,0.1)"
          />
        );
      })}
    </Group>
  );
}
