/**
 * Sato Metabolic Portrait Engine
 *
 * Do not render charts.
 * Do not render clock faces.
 * Do not render circular nebula washes.
 * Paint brush strokes.
 *
 * The flower is an accident created by memory
 * accumulating around a center.
 *
 * Future strokes do not exist.
 * The current stroke is still wet.
 * The medallion was placed after the watercolor,
 * so pigment should kiss its edge.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Canvas, Circle, Group, Oval } from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { BloomMemoryMark, BloomWindow, IdentityBloom } from "./bloomTypes";
import { bloomPalette, interpolateHex } from "./bloomColors";
import { SATO_PIGMENTS } from "./pigmentSystem";

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

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function easeOutCubic(t: number) {
  const p = clamp(t);
  return 1 - Math.pow(1 - p, 3);
}

function easeInQuart(t: number) {
  const p = clamp(t);
  return p * p * p * p;
}

function rgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function pointFrom(cx: number, cy: number, angle: number, distance: number) {
  return {
    x: cx + Math.cos(angle) * distance,
    y: cy + Math.sin(angle) * distance,
  };
}

type MetabolicPortraitEngineProps = {
  windows?: BloomWindow[];
  identity?: IdentityBloom;
  dailyWash?: BloomWindow[];
  memoryMarks?: BloomMemoryMark[];
  size?: number;
  glucose?: number;
  currentHour?: number;
  showLabels?: boolean;
  selectedWindowId?: string | null;
  onSelectWindow?: (window: BloomWindow, anchor: { x: number; y: number }) => void;
};

type LivedWindow = BloomWindow & {
  isCurrent: boolean;
  isDried: boolean;
  progress: number;
  rawProgress: number;
};

function pigmentForWindow(window: BloomWindow) {
  return SATO_PIGMENTS[window.pigmentKey ?? "unknown"];
}

function strokeColor(window: BloomWindow) {
  return pigmentForWindow(window).hex;
}

function windowAngle(window: BloomWindow) {
  return -Math.PI / 2 + ((window.startHour + 1) / 24) * Math.PI * 2;
}

export function MetabolicPortraitEngine({
  windows = [],
  identity,
  dailyWash,
  memoryMarks = [],
  size = 390,
  glucose = 110,
  currentHour = 13,
  showLabels = true,
  selectedWindowId = null,
  onSelectWindow,
}: MetabolicPortraitEngineProps) {
  const [motionMs, setMotionMs] = useState(0);
  const lastScrubbedIndexRef = useRef<number | null>(null);

  const cx = size / 2;
  const cy = size * 0.43;
  const artRadius = size * 0.43;
  const strokeOuter = size * 0.405;
  const strokeInner = size * 0.11;
  const hitInnerRadius = size * 0.1;
  const hitOuterRadius = size * 0.58;
  const paperCx = cx + size * 0.004;
  const paperCy = cy - size * 0.014;

  useEffect(() => {
    let frame = 0;
    const startedAt = Date.now();
    const tick = () => {
      setMotionMs(Date.now() - startedAt);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const washWindows = dailyWash ?? windows;
  const stableIdentity: IdentityBloom = identity ?? {
    seed: "sato-placeholder-identity-vessel-001",
    petalNoise: [0.13, -0.09, 0.21, -0.16, 0.07, -0.04, 0.18, -0.11],
    asymmetry: 0.34,
    haloBias: 0.42,
    pigmentBias: 0.28,
    createdAt: "2026-06-08T00:00:00.000Z",
    version: 1,
  };

  const livedWindows: LivedWindow[] = useMemo(
    () =>
      washWindows
        .filter((w) => w.startHour <= currentHour)
        .map((w) => {
          const isCurrent = w.startHour <= currentHour && currentHour < w.endHour;
          const isDried = w.endHour <= currentHour;
          const rawProgress = isDried
            ? 1
            : (currentHour - w.startHour) / Math.max(1, w.endHour - w.startHour);
          const progress = isDried ? 1 : easeInQuart(rawProgress);
          return { ...w, isCurrent, isDried, rawProgress, progress };
        }),
    [washWindows, currentHour]
  );

  useEffect(() => {
    if (!__DEV__) return;
    const futureWouldRender = washWindows.some((w) => w.startHour > currentHour && livedWindows.some((l) => l.id === w.id));
    if (futureWouldRender) {
      console.warn("[Sato Engine] Future stroke rendered. Future time must be untouched paper.");
    }
  }, [currentHour, livedWindows, washWindows]);

  const currentWindow = livedWindows.find((w) => w.isCurrent) ?? null;
  const selectedWindow = selectedWindowId ? livedWindows.find((w) => w.id === selectedWindowId) ?? null : null;
  const driedCount = livedWindows.filter((w) => w.isDried).length;
  const dayAccumulation = clamp(driedCount / 12, 0, 1);
  const identityOpacity = 0.14 - dayAccumulation * 0.07;

  const breathe = Math.sin((motionMs / 18000) * Math.PI * 2);
  const wetPulse = Math.sin((motionMs / 9000) * Math.PI * 2);
  const centerProgress = easeOutCubic((motionMs - 520) / 460);

  const selectedIndexForPoint = useCallback(
    (x: number, y: number) => {
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < hitInnerRadius || distance > hitOuterRadius) return null;
      let angle = Math.atan2(dy, dx);
      let normalized = angle + Math.PI / 2;
      if (normalized < 0) normalized += Math.PI * 2;
      const hour = (normalized / (Math.PI * 2)) * 24;
      return Math.floor(hour / 2) % 12;
    },
    [cx, cy, hitInnerRadius, hitOuterRadius]
  );

  const anchorForWindow = useCallback(
    (window: BloomWindow) => {
      return pointFrom(cx, cy, windowAngle(window), artRadius * 0.72);
    },
    [artRadius, cx, cy]
  );

  const selectWindow = useCallback(
    (index: number, feedback: "tap" | "scrub" | "longPress") => {
      const window = washWindows[index];
      if (!window || window.startHour > currentHour || !onSelectWindow) return;
      if (feedback === "tap") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      } else if (feedback === "longPress") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      } else if (lastScrubbedIndexRef.current !== index) {
        Haptics.selectionAsync().catch(() => undefined);
        lastScrubbedIndexRef.current = index;
      }
      onSelectWindow(window, anchorForWindow(window));
    },
    [anchorForWindow, currentHour, onSelectWindow, washWindows]
  );

  const selectFromPoint = useCallback(
    (x: number, y: number, feedback: "tap" | "scrub" | "longPress") => {
      const index = selectedIndexForPoint(x, y);
      if (index === null) return;
      selectWindow(index, feedback);
    },
    [selectWindow, selectedIndexForPoint]
  );

  const tapGesture = useMemo(
    () => Gesture.Tap().runOnJS(true).onEnd((event) => selectFromPoint(event.x, event.y, "tap")),
    [selectFromPoint]
  );
  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .runOnJS(true)
        .minDuration(450)
        .onStart((event) => selectFromPoint(event.x, event.y, "longPress")),
    [selectFromPoint]
  );
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(6)
        .onBegin((event) => selectFromPoint(event.x, event.y, "scrub"))
        .onUpdate((event) => selectFromPoint(event.x, event.y, "scrub"))
        .onFinalize(() => {
          lastScrubbedIndexRef.current = null;
        }),
    [selectFromPoint]
  );
  const composedGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, Gesture.Exclusive(longPressGesture, tapGesture)),
    [longPressGesture, panGesture, tapGesture]
  );

  const visibleMemoryMarks = useMemo(
    () => memoryMarks.filter((mark) => mark.startHour <= currentHour),
    [currentHour, memoryMarks]
  );

  const selectedAnchor = selectedWindow ? anchorForWindow(selectedWindow) : null;
  const selectedAngle = selectedWindow ? windowAngle(selectedWindow) : 0;
  const currentKissColor = currentWindow ? strokeColor(currentWindow) : bloomPalette.mossGreen;

  const renderBrushStroke = (window: LivedWindow, mode: "dry" | "wet" | "bleed") => {
    const angle = windowAngle(window);
    const pigment = pigmentForWindow(window);
    const color = pigment.hex;
    const reactive = window.state === "reactive" || window.value >= 0.7;
    const seedBase = `${window.id}-${mode}`;
    const progressScale = mode === "wet" ? Math.max(0.28, window.progress) : 1;
    const layers = reactive ? 7 : 6;
    const opacityBase =
      mode === "wet"
        ? pigment.opacityBias * 0.62 + window.confidence * 0.032
        : mode === "bleed"
        ? pigment.opacityBias * 0.28
        : pigment.opacityBias * 0.72 + window.confidence * 0.052;
    const wetLift = mode === "wet" ? 1 + wetPulse * 0.025 : 1;
    const strokeLength = (strokeOuter - strokeInner) * progressScale * pigment.spreadBias;

    return (
      <Group key={`${window.id}-${mode}`} opacity={mode === "wet" ? 0.7 + window.progress * 0.25 : mode === "bleed" ? 0.45 : 1}>
        {Array.from({ length: layers }).map((_, layer) => {
          const seed = `${seedBase}-${layer}`;
          const t = layer / Math.max(1, layers - 1);
          const pull = strokeOuter - strokeLength * (0.1 + t * 0.92);
          const lateral = noise(`${seed}-lateral`, -size * 0.018, size * 0.018) * (1 - t * 0.3);
          const center = pointFrom(
            cx + Math.cos(angle + Math.PI / 2) * lateral,
            cy + Math.sin(angle + Math.PI / 2) * lateral,
            angle + noise(`${seed}-angle`, -0.045, 0.045),
            pull + noise(`${seed}-pull`, -size * 0.012, size * 0.012)
          );
          const bodyWide = reactive ? 1.14 : 1;
          const spread = 0.84 + pigment.spreadBias * 0.34;
          const width = size * noise(`${seed}-w`, 0.09, 0.16) * (1 - t * 0.34) * bodyWide * wetLift * spread;
          const height = size * noise(`${seed}-h`, 0.05, 0.095) * (0.78 + t * 0.35) * wetLift * (0.9 + pigment.spreadBias * 0.18);
          const opacity = opacityBase * (0.55 + t * 0.45) * (mode === "wet" ? 0.85 : 1);

          return (
            <Group key={seed}>
              <Oval
                x={center.x - width}
                y={center.y - height}
                width={width * 2}
                height={height * 2}
                color={rgba(color, opacity)}
                transform={[{ rotate: angle + Math.PI / 2 + noise(`${seed}-rot`, -0.22, 0.22) }]}
                origin={center}
              />
              {layer > 1 ? (
                <Oval
                  x={center.x - width * 1.02}
                  y={center.y - height * 1.02}
                  width={width * 2.04}
                  height={height * 2.04}
                  color={rgba(interpolateHex(color, bloomPalette.ink, 0.16), opacity * 0.2)}
                  transform={[{ rotate: angle + Math.PI / 2 + noise(`${seed}-edge-rot`, -0.18, 0.18) }]}
                  origin={center}
                  style="stroke"
                  strokeWidth={noise(`${seed}-edge`, 0.6, 1.35)}
                />
              ) : null}
              {pigment.granulationBias > 0.18 && layer >= 3
                ? Array.from({ length: Math.round((mode === "wet" ? 5 : 4) + pigment.granulationBias * 6) }).map((_, dotIndex) => {
                    const dotSeed = `${seed}-dot-${dotIndex}`;
                    const dot = pointFrom(
                      center.x,
                      center.y,
                      noise(`${dotSeed}-a`, 0, Math.PI * 2),
                      noise(`${dotSeed}-d`, 0, width * 0.72)
                    );
                    return (
                      <Circle
                        key={dotSeed}
                        cx={dot.x}
                        cy={dot.y}
                        r={noise(`${dotSeed}-r`, 0.4, 1.3)}
                        color={rgba(color, 0.036 + pigment.granulationBias * 0.065 + noise(`${dotSeed}-op`, 0, 0.035))}
                      />
                    );
                  })
                : null}
            </Group>
          );
        })}
      </Group>
    );
  };

  return (
    <View style={{ width: size, height: size }}>
      <GestureDetector gesture={composedGesture}>
        <Canvas style={{ width: size, height: size }}>
          {/* Warm handmade paper grain */}
          <Group opacity={0.07}>
            {Array.from({ length: 260 }).map((_, index) => {
              const seed = `paper-${index}`;
              return (
                <Circle
                  key={seed}
                  cx={noise(`${seed}-x`, 0, size)}
                  cy={noise(`${seed}-y`, 0, size)}
                  r={noise(`${seed}-r`, 0.2, 1.6)}
                  color={noise(`${seed}-warm`, 0, 1) > 0.55 ? "rgba(180,160,132,0.17)" : "rgba(248,238,219,0.18)"}
                />
              );
            })}
          </Group>

          {/* Identity Bloom: four quiet asymmetric vessel strokes. */}
          <Group blendMode="multiply" opacity={identityOpacity}>
            {[0, 1, 2, 3].map((index) => {
              const seed = `${stableIdentity.seed}-identity-${index}`;
              const baseAngles = [-Math.PI / 2, 0.08, Math.PI / 2 + 0.18, Math.PI + 0.04];
              const angle = baseAngles[index] + (stableIdentity.petalNoise[index] ?? 0) * stableIdentity.asymmetry;
              const pigment = interpolateHex(bloomPalette.vesselWarm, bloomPalette.mossGreen, stableIdentity.pigmentBias * 0.25);
              return (
                <Group key={seed}>
                  {Array.from({ length: 5 }).map((_, layer) => {
                    const t = layer / 4;
                    const pull = strokeOuter - (strokeOuter - strokeInner) * (0.18 + t * 0.78);
                    const lateral = noise(`${seed}-${layer}-lat`, -size * 0.02, size * 0.02);
                    const center = pointFrom(
                      cx + Math.cos(angle + Math.PI / 2) * lateral,
                      cy + Math.sin(angle + Math.PI / 2) * lateral,
                      angle,
                      pull
                    );
                    const w = size * noise(`${seed}-${layer}-w`, 0.105, 0.18) * (1 - t * 0.26);
                    const h = size * noise(`${seed}-${layer}-h`, 0.055, 0.1);
                    return (
                      <Oval
                        key={`${seed}-${layer}`}
                        x={center.x - w}
                        y={center.y - h}
                        width={w * 2}
                        height={h * 2}
                        color={rgba(pigment, 0.11 + layer * 0.018)}
                        transform={[{ rotate: angle + Math.PI / 2 + noise(`${seed}-${layer}-rot`, -0.18, 0.18) }]}
                        origin={center}
                      />
                    );
                  })}
                </Group>
              );
            })}
          </Group>

          {/* Lived time strokes only. Future is untouched paper. */}
          <Group blendMode="multiply">
            {livedWindows.filter((w) => w.isDried).map((window) => renderBrushStroke(window, "dry"))}
          </Group>

          {/* Momentum bleed: previous strokes lightly invade the present. */}
          <Group blendMode="multiply">
            {currentWindow
              ? livedWindows
                  .filter((w) => w.isDried && w.endHour >= currentWindow.startHour - 2)
                  .map((window) => renderBrushStroke({ ...window, progress: 0.34 }, "bleed"))
              : null}
          </Group>

          {/* Current stroke: wet, breathing, still being painted. */}
          <Group blendMode="multiply">{currentWindow ? renderBrushStroke(currentWindow, "wet") : null}</Group>

          {/* Event marks: pigment blooms, not alerts. */}
          <Group blendMode="multiply">
            {visibleMemoryMarks.map((mark) => {
              const seed = `${stableIdentity.seed}-${mark.id}`;
              const anchor = pointFrom(
                cx + noise(`${seed}-ox`, -5, 5),
                cy + noise(`${seed}-oy`, -5, 5),
                mark.angle + noise(`${seed}-angle`, -0.08, 0.08),
                artRadius * mark.distance
              );
              const rx = size * mark.size * noise(`${seed}-rx`, 1.1, 1.55);
              const ry = size * mark.size * noise(`${seed}-ry`, 0.72, 1.02);
              return (
                <Group key={mark.id}>
                  <Oval
                    x={anchor.x - rx}
                    y={anchor.y - ry}
                    width={rx * 2}
                    height={ry * 2}
                    color={rgba(mark.color, 0.11 + mark.intensity * 0.17)}
                    transform={[{ rotate: mark.angle + noise(`${seed}-rot`, -0.45, 0.45) }]}
                    origin={anchor}
                  />
                  {Array.from({ length: 10 }).map((_, i) => {
                    const dotSeed = `${seed}-bloom-${i}`;
                    const dot = pointFrom(
                      anchor.x,
                      anchor.y,
                      noise(`${dotSeed}-a`, 0, Math.PI * 2),
                      noise(`${dotSeed}-d`, 0, rx * 1.25)
                    );
                    return (
                      <Circle
                        key={dotSeed}
                        cx={dot.x}
                        cy={dot.y}
                        r={noise(`${dotSeed}-r`, 0.35, 1.25)}
                        color={rgba(mark.color, 0.055 + mark.intensity * 0.07)}
                      />
                    );
                  })}
                </Group>
              );
            })}
          </Group>

          {/* Touch deepens pigment locally. No slice, no radial guide. */}
          {selectedWindow && selectedAnchor ? (
            <Oval
              x={selectedAnchor.x - size * 0.15}
              y={selectedAnchor.y - size * 0.095}
              width={size * 0.3}
              height={size * 0.19}
              color={rgba(strokeColor(selectedWindow), 0.16)}
              transform={[{ rotate: selectedAngle + Math.PI / 2 }]}
              origin={selectedAnchor}
            />
          ) : null}

          {/* Washi seal placed after paint. Translucent edge lets pigment kiss it. */}
          <Group opacity={centerProgress}>
            <Oval
              x={paperCx - size * 0.065 + 1.5}
              y={paperCy - size * 0.058 + 2}
              width={size * 0.13}
              height={size * 0.116}
              color="rgba(150,132,108,0.07)"
            />
            {Array.from({ length: 8 }).map((_, index) => {
              const seed = `seal-${index}`;
              const r = size * noise(`${seed}-r`, 0.09, 0.124);
              return (
                <Oval
                  key={seed}
                  x={paperCx - r * noise(`${seed}-rx`, 0.82, 1.1) + noise(`${seed}-x`, -1.6, 1.6)}
                  y={paperCy - r * noise(`${seed}-ry`, 0.78, 1.06) + noise(`${seed}-y`, -1.4, 1.4)}
                  width={r * 2 * noise(`${seed}-w`, 0.82, 1.1)}
                  height={r * 2 * noise(`${seed}-h`, 0.76, 1.06)}
                  color={rgba(index % 2 === 0 ? bloomPalette.paperDeep : bloomPalette.paper, index < 3 ? 0.2 + index * 0.04 : 0.33 + index * 0.045)}
                  transform={[{ rotate: noise(`${seed}-rot`, -0.14, 0.14) }]}
                  origin={{ x: paperCx, y: paperCy }}
                />
              );
            })}
            {Array.from({ length: 14 }).map((_, index) => {
              const seed = `deckle-${index}`;
              const angle = (index / 14) * Math.PI * 2 + noise(`${seed}-off`, -0.13, 0.13);
              const dot = pointFrom(paperCx, paperCy, angle, size * noise(`${seed}-d`, 0.103, 0.124));
              return (
                <Circle
                  key={seed}
                  cx={dot.x}
                  cy={dot.y}
                  r={noise(`${seed}-r`, 0.55, 1.75)}
                  color={rgba(bloomPalette.paper, 0.2 + noise(`${seed}-op`, 0, 0.1))}
                />
              );
            })}
            {/* Pigment kissing / invading the seal edge. */}
            <Group opacity={0.18}>
              {Array.from({ length: 7 }).map((_, index) => {
                const seed = `kiss-${index}`;
                const angle = noise(`${seed}-a`, 0, Math.PI * 2);
                const center = pointFrom(paperCx, paperCy, angle, size * noise(`${seed}-d`, 0.074, 0.118));
                const rx = size * noise(`${seed}-rx`, 0.018, 0.045);
                const ry = size * noise(`${seed}-ry`, 0.012, 0.032);
                return (
                  <Oval
                    key={seed}
                    x={center.x - rx}
                    y={center.y - ry}
                    width={rx * 2}
                    height={ry * 2}
                    color={rgba(currentKissColor, 0.06 + noise(`${seed}-op`, 0, 0.05))}
                    transform={[{ rotate: angle + noise(`${seed}-rot`, -0.4, 0.4) }]}
                    origin={center}
                  />
                );
              })}
            </Group>
            {Array.from({ length: 16 }).map((_, index) => {
              const seed = `seal-fiber-${index}`;
              const dot = pointFrom(
                paperCx,
                paperCy,
                noise(`${seed}-a`, 0, Math.PI * 2),
                size * noise(`${seed}-d`, 0.01, 0.095)
              );
              return (
                <Circle
                  key={seed}
                  cx={dot.x}
                  cy={dot.y}
                  r={noise(`${seed}-r`, 0.25, 0.75)}
                  color="rgba(170,150,126,0.12)"
                />
              );
            })}
          </Group>
        </Canvas>
      </GestureDetector>

      {showLabels && selectedWindow && selectedAnchor ? (
        <View style={[styles.galleryCaption, { left: selectedAnchor.x - 52, top: selectedAnchor.y - 40 }]}> 
          <Text style={styles.captionTime}>{selectedWindow.startHour === 12 ? "1 PM" : selectedWindow.label}</Text>
          <Text style={styles.captionBody}>Your body asked for a little more time.</Text>
          {selectedWindow.glucosePeak ? (
            <Text style={styles.captionMeta}>Peak: {selectedWindow.glucosePeak} mg/dL · Returned to baseline: 2h 35m</Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.centerValue, { opacity: centerProgress, top: paperCy - size * 0.048 }]}> 
        <Text style={styles.glucose}>{glucose}</Text>
        <Text style={styles.unit}>mg/dL</Text>
        <Text style={styles.wave}>~</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  galleryCaption: {
    position: "absolute",
    width: 138,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,251,244,0.82)",
    borderWidth: 1,
    borderColor: "rgba(224,214,200,0.6)",
  },
  captionTime: {
    color: bloomPalette.captionBlue,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  captionBody: {
    marginTop: 3,
    fontFamily: "Georgia",
    color: bloomPalette.ink,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "300",
  },
  captionMeta: {
    marginTop: 4,
    fontSize: 9,
    color: bloomPalette.muted,
    letterSpacing: 0.2,
  },
  centerValue: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  glucose: {
    fontFamily: "Georgia",
    fontSize: 22,
    color: bloomPalette.inkWarm,
    fontWeight: "300",
    letterSpacing: -0.3,
  },
  unit: {
    marginTop: 0,
    fontSize: 10,
    color: bloomPalette.muted,
    letterSpacing: 0.6,
  },
  wave: {
    marginTop: 0,
    fontSize: 13,
    color: bloomPalette.mutedLight,
  },
});
