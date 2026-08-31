import React from "react";
import { Group, Circle } from "@shopify/react-native-skia";
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

type DawnWashProps = {
  cx: number;
  cy: number;
  size: number;
  breathe: number;
};

export function DawnWash({ cx, cy, size, breathe }: DawnWashProps) {
  return (
    <Group opacity={0.92}>
      {Array.from({ length: 14 }).map((_, i) => {
        const r = size * (0.04 + i * 0.038);
        const alpha = 0.065 - i * 0.0035;
        return (
          <Circle
            key={`dawn-${i}`}
            cx={cx + noise(`dawn-cx-${i}`, -size * 0.018, size * 0.018)}
            cy={cy + noise(`dawn-cy-${i}`, -size * 0.018, size * 0.018)}
            r={r + breathe * noise(`dawn-b-${i}`, -2, 2)}
            color={rgba("#F2D489", Math.max(0.008, alpha))}
          />
        );
      })}
    </Group>
  );
}