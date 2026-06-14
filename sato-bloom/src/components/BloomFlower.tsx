import React from 'react';
import { View } from 'react-native';
import { Canvas, Oval, Circle, Group } from '@shopify/react-native-skia';
import { BrushStroke } from '@/features/bloom/BrushStroke';

interface BloomProps {
  petal1: string;
  petal2: string;
  petal3: string;
  size?: number;
  flare1Color?: string;
  flare2Color?: string;
}

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

export function BloomFlower({ petal1, petal2, petal3, size = 120, flare1Color, flare2Color }: BloomProps) {
  const cx = size / 2;
  const cy = size / 2;
  const artRadius = size * 0.16;

  const baseAngles = [
    0,
    (72 * Math.PI) / 180,
    (144 * Math.PI) / 180,
    (216 * Math.PI) / 180,
    (288 * Math.PI) / 180,
  ];

  const colors = [petal1, petal2, petal3];

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ flex: 1 }}>
        {/* Radial wash background */}
        <Circle
          cx={cx}
          cy={cy}
          r={size * 0.45}
          color="rgba(244,239,229,0.12)"
        />

        {/* Multiply blending Group for watercolor petals & flares */}
        <Group blendMode="multiply">
          {/* Main Watercolor Bloom Petals */}
          {baseAngles.map((baseAngle, petalIdx) => {
            return Array.from({ length: 6 }).map((_, layer) => {
              const seed = `flower-petal-${petalIdx}-l${layer}`;
              const lAngle = baseAngle + noise(`${seed}-angle`, -0.35, 0.35);
              const orbit = artRadius * noise(`${seed}-orbit`, 0.2, 0.9);
              
              const center = pointFrom(
                cx + noise(`${seed}-cx`, -size * 0.05, size * 0.05),
                cy + noise(`${seed}-cy`, -size * 0.05, size * 0.05),
                lAngle,
                orbit
              );
              
              const rx = size * noise(`${seed}-rx`, 0.12, 0.28);
              const ry = size * noise(`${seed}-ry`, 0.08, 0.18);
              
              const colorIndex = (petalIdx + layer) % colors.length;
              const color = colors[colorIndex];
              const opacity = 0.07 + noise(`${seed}-opacity`, 0, 0.05);

              return (
                <Oval
                  key={seed}
                  x={center.x - rx}
                  y={center.y - ry}
                  width={rx * 2}
                  height={ry * 2}
                  color={color}
                  opacity={opacity}
                  transform={[
                    {
                      rotate: lAngle + Math.PI / 2 + noise(`${seed}-rot`, -0.5, 0.5),
                    },
                  ]}
                  origin={center}
                />
              );
            });
          })}

          {/* Decorative Brush Stroke Flares branching out (similar to clock's metabolic marks) */}
          <BrushStroke
            cx={cx} cy={cy} canvasSize={size}
            angle={2.6} distance={artRadius * 0.8}
            length={size * 0.38} maxWidth={size * 0.05}
            color={flare1Color || petal1} noiseSeed="flare-1"
            opacity={0.10} ghostOpacity={0.04}
            ghostOffset={{ x: -size * 0.005, y: size * 0.003 }}
          />
          <BrushStroke
            cx={cx} cy={cy} canvasSize={size}
            angle={-0.85} distance={artRadius * 0.72}
            length={size * 0.34} maxWidth={size * 0.04}
            color={flare2Color || petal2} noiseSeed="flare-2"
            opacity={0.12} ghostOpacity={0.05}
            ghostOffset={{ x: size * 0.004, y: -size * 0.002 }}
          />

          {/* Central pigment pooling */}
          {colors.map((color, idx) => {
            const seed = `flower-center-pool-${idx}`;
            const rx = size * 0.15;
            const ry = size * 0.10;
            return (
              <Oval
                key={seed}
                x={cx - rx}
                y={cy - ry}
                width={rx * 2}
                height={ry * 2}
                color={color}
                opacity={0.04}
                transform={[
                  { rotate: (idx * Math.PI / 3) + noise(`${seed}-rot`, -0.4, 0.4) },
                ]}
                origin={{ x: cx, y: cy }}
              />
            );
          })}
        </Group>
      </Canvas>
    </View>
  );
}
