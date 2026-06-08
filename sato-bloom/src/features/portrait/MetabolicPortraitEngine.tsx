import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Canvas, Circle, Group, Path, Skia } from "@shopify/react-native-skia";
import { BloomEvent, IdentityBloom, PigmentDeposit } from "./satoPortraitTypes";
import { buildPigmentDeposits } from "./buildPigmentDeposits";
import { noise, polar } from "./satoGeometry";
import { rgba, SATO } from "./satoPigments";

/**
 * Anti-clock rule:
 * Deposits may be born from time,
 * but they must not remain obedient to it.
 *
 * Every pigment mark receives:
 * - radial angle from time
 * - identity drift
 * - meal-specific sag
 * - hydration diffusion
 * - no-exercise settling
 * - random seeded brush memory
 *
 * The result should feel accumulated,
 * not arranged.
 */

type Props = {
  size?: number;
  glucose?: number;
  events: BloomEvent[];
  identity: IdentityBloom;
  waterPints?: number;
  exerciseMinutes?: number;
  currentTime?: string;
};

function makeBrushPath(cx: number, cy: number, d: PigmentDeposit, layer: number) {
  const n = noise(d.id + "-layer-" + layer, -1, 1);
  const angle = d.angle + n * d.rotationNoise;
  const length = d.length * (0.82 + layer * 0.035 + n * 0.025);
  const width = d.width * (0.84 + layer * 0.025 + Math.abs(n) * 0.05);
  const originX = cx + d.clusterOffset.x;
  const originY = cy + d.clusterOffset.y;
  const start = polar(originX, originY, angle, d.radius * d.centerPull);
  const end = polar(originX, originY, angle, d.radius + length);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = -dy;
  const py = dx;
  const innerW = width * 0.16;
  const midW = width * (0.78 + d.bleed * 0.22);
  const outerW = width * (0.44 + d.edgeChaos * 0.32);

  const p = Skia.Path.Make();
  p.moveTo(start.x - px * innerW, start.y - py * innerW);
  p.cubicTo(
    start.x + dx * length * 0.22 - px * midW,
    start.y + dy * length * 0.22 - py * midW,
    end.x - dx * length * 0.34 - px * outerW,
    end.y - dy * length * 0.34 - py * outerW,
    end.x - px * outerW * 0.2,
    end.y - py * outerW * 0.2
  );
  p.cubicTo(
    end.x + dx * length * 0.06,
    end.y + dy * length * 0.06,
    end.x + dx * length * 0.06,
    end.y + dy * length * 0.06,
    end.x + px * outerW * 0.2,
    end.y + py * outerW * 0.2
  );
  p.cubicTo(
    end.x - dx * length * 0.34 + px * outerW,
    end.y - dy * length * 0.34 + py * outerW,
    start.x + dx * length * 0.22 + px * midW,
    start.y + dy * length * 0.22 + py * midW,
    start.x + px * innerW,
    start.y + py * innerW
  );
  p.cubicTo(
    start.x + px * innerW * 0.15,
    start.y + py * innerW * 0.15,
    start.x - px * innerW * 0.15,
    start.y - py * innerW * 0.15,
    start.x - px * innerW,
    start.y - py * innerW
  );
  p.close();
  return p;
}

function makeIdentityPath(cx: number, cy: number, seed: string, index: number, size: number) {
  const angle = -Math.PI / 2 + (index / 4) * Math.PI * 2 + noise(seed + index, -0.18, 0.18);
  const d: PigmentDeposit = {
    id: `identity-${index}`,
    eventId: "identity",
    kind: "hydrationVeil",
    angle,
    radius: size * 0.05,
    length: size * (0.28 + noise(seed + index + "l", -0.025, 0.035)),
    width: size * (0.26 + noise(seed + index + "w", -0.025, 0.025)),
    color: SATO.boneLinen,
    opacity: 0.06,
    layers: 6,
    bleed: 0.82,
    granulation: 0.18,
    edgeChaos: 0.22,
    rotationNoise: 0.1,
    centerPull: 0.5,
    clusterOffset: { x: 0, y: 0 },
  };
  return makeBrushPath(cx, cy, d, 1);
}

export function MetabolicPortraitEngine({
  size = 390,
  glucose = 110,
  events,
  identity,
  waterPints = 4,
  exerciseMinutes = 0,
  currentTime,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const deposits = useMemo(
    () =>
      buildPigmentDeposits({
        events,
        waterPints,
        exerciseMinutes,
        currentTime,
        identitySeed: identity.seed,
      }),
    [events, waterPints, exerciseMinutes, currentTime]
  );

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        {/* Paper atmosphere / halo */}
        <Circle cx={cx} cy={cy} r={size * 0.47} color={rgba(SATO.boneLinen, 0.12)} />
        <Circle cx={cx - 14} cy={cy + 8} r={size * 0.4} color={rgba(SATO.mineralBlueGrey, 0.055)} />
        <Circle cx={cx + 18} cy={cy - 16} r={size * 0.34} color={rgba(SATO.rawApricot, 0.045)} />

        {/* Identity vessel: quiet, felt not seen */}
        <Group blendMode="multiply" opacity={0.05}>
          {[0, 1, 2, 3].map((i) => (
            <Path
              key={`identity-${i}`}
              path={makeIdentityPath(cx, cy, identity.seed, i, size)}
              color={rgba(SATO.boneLinen, 0.075)}
            />
          ))}
        </Group>



        {/* Daily metabolic pigment */}
        <Group blendMode="multiply">
          {deposits.map((d) =>
            Array.from({ length: d.layers }).map((_, layer) => {
              const path = makeBrushPath(cx, cy, d, layer);
              const alpha =
                (d.opacity / d.layers) *
                (1.1 + noise(d.id + "alpha" + layer, -0.22, 0.22));
              return (
                <Path
                  key={`${d.id}-${layer}`}
                  path={path}
                  color={rgba(d.color, Math.max(0.018, alpha))}
                />
              );
            })
          )}

          {/* Granulation / pigment specks */}
          {deposits.flatMap((d) => {
            const count = Math.round(6 + d.granulation * 22);
            return Array.from({ length: count }).map((_, i) => {
              const a = d.angle + noise(d.id + "speckA" + i, -0.3, 0.3);
              const r = d.radius + noise(d.id + "speckR" + i, 20, d.length * 0.92);
              const pos = polar(cx + d.clusterOffset.x, cy + d.clusterOffset.y, a, r);
              const radius = noise(d.id + "speckSize" + i, 0.65, 2.3);
              const speckAlpha = Math.min(0.085, 0.018 + d.granulation * 0.06);
              return (
                <Circle
                  key={`${d.id}-speck-${i}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  color={rgba(d.color, speckAlpha)}
                />
              );
            });
          })}
        </Group>

        {/* Centre medallion: pigment washes through it */}
        <Circle cx={cx} cy={cy} r={size * 0.128} color={rgba(SATO.paper, 0.58)} />
        <Circle
          cx={cx}
          cy={cy}
          r={size * 0.13}
          color={rgba(SATO.ink, 0.026)}
          style="stroke"
          strokeWidth={1}
        />
      </Canvas>

      <View style={styles.centerCoin}>
        <Text style={styles.glucose}>{glucose}</Text>
        <Text style={styles.unit}>mg/dL</Text>
        <Text style={styles.wave}>~</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerCoin: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "41.5%",
    alignItems: "center",
    pointerEvents: "none",
  },
  glucose: {
    fontSize: 31,
    lineHeight: 34,
    color: "rgba(33,31,27,0.62)",
    fontWeight: "500",
    letterSpacing: -0.5,
  },
  unit: {
    marginTop: 0,
    fontSize: 13,
    color: "rgba(33,31,27,0.48)",
    fontWeight: "500",
  },
  wave: {
    marginTop: 0,
    fontSize: 18,
    color: "rgba(33,31,27,0.32)",
  },
});
