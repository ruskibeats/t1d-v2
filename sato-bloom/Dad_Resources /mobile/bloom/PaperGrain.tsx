import React from "react";
import { Group, Circle } from "@shopify/react-native-skia";

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

type PaperGrainProps = {
  size: number;
};

export function PaperGrain({ size }: PaperGrainProps) {
  return (
    <Group opacity={0.04}>
      {Array.from({ length: 260 }).map((_, i) => {
        const seed = `grain-${i}`;
        return (
          <Circle
            key={seed}
            cx={noise(`${seed}-x`, 0, size)}
            cy={noise(`${seed}-y`, 0, size)}
            r={noise(`${seed}-r`, 0.3, 1.4)}
            color={
              noise(`${seed}-w`, 0, 1) > 0.5
                ? "rgba(180,162,135,0.15)"
                : "rgba(248,238,220,0.13)"
            }
          />
        );
      })}
    </Group>
  );
}