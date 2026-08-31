import React, { useMemo } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import { Canvas, Path, Circle, Skia } from "@shopify/react-native-skia";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

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

export function PaperBackground({ children }: { children?: React.ReactNode }) {
  // Generate static positions for fibers and specks
  const { specks, fibers } = useMemo(() => {
    const generatedSpecks = [];
    // 180 tiny specks of dirt/paper pulp
    for (let i = 0; i < 180; i++) {
      const seed = `speck-${i}`;
      const cx = noise(`${seed}-x`, 0, SCREEN_W);
      const cy = noise(`${seed}-y`, 0, SCREEN_H);
      const r = noise(`${seed}-r`, 0.4, 1.3);
      const isWhite = noise(`${seed}-w`, 0, 1) > 0.6;
      const color = isWhite ? "rgba(255,255,255,0.25)" : "rgba(126,117,106,0.18)";
      generatedSpecks.push({ key: seed, cx, cy, r, color });
    }

    const generatedFibers = [];
    // 50 directional wavy flowing fibers (horizontal grain)
    for (let i = 0; i < 55; i++) {
      const seed = `fiber-${i}`;
      const xStart = noise(`${seed}-x`, -50, SCREEN_W);
      const yStart = noise(`${seed}-y`, 0, SCREEN_H);
      const fiberLen = noise(`${seed}-len`, 40, 90);
      const amplitude = noise(`${seed}-amp`, 2, 6);
      const isWhite = noise(`${seed}-w`, 0, 1) > 0.55;
      const color = isWhite ? "rgba(255,255,255,0.35)" : "rgba(126,117,106,0.24)";
      const strokeWidth = noise(`${seed}-sw`, 0.5, 1.2);

      // Create a wavy horizontal line path
      const pathObj = Skia.Path.Make();
      pathObj.moveTo(xStart, yStart);
      
      const segments = 4;
      const segW = fiberLen / segments;
      for (let s = 1; s <= segments; s++) {
        const x = xStart + s * segW;
        // flow slightly up and down to create fiber waves
        const y = yStart + (s % 2 === 0 ? amplitude : -amplitude) + noise(`${seed}-seg-${s}`, -1, 1);
        const cp1x = xStart + (s - 0.5) * segW;
        const cp1y = yStart + (s % 2 === 0 ? -amplitude : amplitude);
        pathObj.quadTo(cp1x, cp1y, x, y);
      }
      
      generatedFibers.push({
        key: seed,
        path: pathObj,
        color,
        strokeWidth,
      });
    }

    return { specks: generatedSpecks, fibers: generatedFibers };
  }, []);

  return (
    <View style={styles.container}>
      {/* Billion-Dollar Gradient shift catching light */}
      <LinearGradient
        colors={["#F3ECE0", "#EDE6DA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {children}

      {/* Skia Paper Noise Layer */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Grain Specks */}
          {specks.map((s) => (
            <Circle
              key={s.key}
              cx={s.cx}
              cy={s.cy}
              r={s.r}
              color={s.color}
              opacity={0.015}
            />
          ))}

          {/* Directional fibers */}
          {fibers.map((f) => (
            <Path
              key={f.key}
              path={f.path}
              color={f.color}
              style="stroke"
              strokeWidth={f.strokeWidth}
              strokeCap="round"
              opacity={0.02}
            />
          ))}
        </Canvas>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
