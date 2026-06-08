import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Canvas,
  Circle,
  Group,
  Oval,
  Path,
  Skia,
} from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { BloomWindow } from "./bloomTypes";
import { bloomPalette, colorForBloomValue, rgba } from "./bloomColors";
import { PaperGrain } from "./PaperGrain";
import { DawnWash } from "./DawnWash";
import { CenterMedallion } from "./CenterMedallion";
import { GalleryCaption } from "./GalleryCaption";
import { BrushStroke } from "./BrushStroke";

// ── deterministic noise ──────────────────────────────────────────────

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

function pointFrom(cx: number, cy: number, angle: number, distance: number) {
  return {
    x: cx + Math.cos(angle) * distance,
    y: cy + Math.sin(angle) * distance,
  };
}

// ── types ───────────────────────────────────────────────────────────

type BloomClockProps = {
  windows: BloomWindow[];
  size?: number;
  glucose?: number;
  currentHour?: number;
};

type LivedWindow = BloomWindow & {
  isCurrent: boolean;
  isDried: boolean;
  progress: number;
  angle: number;
  color: string;
  length: number;
  width: number;
};

function windowAngle(w: BloomWindow) {
  return -Math.PI / 2 + ((w.startHour + 1) / 24) * Math.PI * 2;
}

// ── component ───────────────────────────────────────────────────────

export function BloomClock({
  windows,
  size = 390,
  glucose = 110,
  currentHour = 13,
}: BloomClockProps) {
  const [motionMs, setMotionMs] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedAnchor, setSelectedAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const lastScrubbedRef = useRef<number | null>(null);

  const cx = size / 2;
  const cy = size * 0.53;
  const artRadius = size * 0.42;
  const hitInner = size * 0.13;
  const hitOuter = size * 0.52;
  const tickRadius = size * 0.46;

  // ── animation loop ─────────────────────────────────────────────

  useEffect(() => {
    let frame: number;
    const start = Date.now();
    const tick = () => {
      setMotionMs(Date.now() - start);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const breathe = Math.sin((motionMs / 18000) * Math.PI * 2);
  const drift = Math.sin((motionMs / 22000) * Math.PI * 2);
  const centerProgress = easeOutCubic((motionMs - 520) / 460);

  // ── lived windows ──────────────────────────────────────────────

  const livedWindows: LivedWindow[] = useMemo(() => {
    const baseLength = size * 0.28;
    const baseWidth = size * 0.12;

    let strongestAngle = 0;
    let strongestPull = 0;
    for (const w of windows) {
      if (w.startHour <= currentHour && (w.state === "reactive" || w.variability > 0.55)) {
        const pull = w.intensity * 0.18;
        if (pull > strongestPull) {
          strongestPull = pull;
          strongestAngle = windowAngle(w);
        }
      }
    }

    return windows
      .filter((w) => w.startHour <= currentHour)
      .map((w) => {
        const isCurrent = w.startHour <= currentHour && currentHour < w.endHour;
        const isDried = w.endHour <= currentHour;
        const rawProgress = isDried
          ? 1
          : (currentHour - w.startHour) / Math.max(1, w.endHour - w.startHour);
        const progress = Math.min(1, Math.max(0.06, rawProgress));
        let angle = windowAngle(w);
        if (strongestPull > 0) {
          const diff = angle - strongestAngle;
          const normalizedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
          const influence = Math.max(0, 1 - Math.abs(normalizedDiff) / 1.2);
          angle += strongestPull * influence * 0.5;
        }
        return {
          ...w,
          isCurrent,
          isDried,
          progress,
          angle,
          color: colorForBloomValue(w.value),
          length: baseLength * (0.78 + w.intensity * 0.38),
          width: baseWidth * (0.85 + w.intensity * 0.22),
        };
      });
  }, [windows, currentHour, size]);

  // ── center drift ───────────────────────────────────────────────

  const { paperCx, paperCy } = useMemo(() => {
    let strongestAngle = 0;
    let strongestIntensity = 0;
    for (const w of livedWindows) {
      if (w.state === "reactive" || w.variability > 0.5) {
        if (w.intensity > strongestIntensity) {
          strongestIntensity = w.intensity;
          strongestAngle = windowAngle(w);
        }
      }
    }
    const driftAmount = size * 0.018 * strongestIntensity;
    const oppositeAngle = strongestAngle + Math.PI;
    return {
      paperCx: cx + size * 0.004 + Math.cos(oppositeAngle) * driftAmount,
      paperCy: cy - size * 0.018 + Math.sin(oppositeAngle) * driftAmount,
    };
  }, [livedWindows, cx, cy, size]);

  // ── hit testing ────────────────────────────────────────────────

  const indexForPoint = useCallback(
    (x: number, y: number) => {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hitInner || dist > hitOuter) return null;
      let angle = Math.atan2(dy, dx);
      let norm = angle + Math.PI / 2;
      if (norm < 0) norm += Math.PI * 2;
      const hour = (norm / (Math.PI * 2)) * 24;
      return Math.floor(hour / 2) % 12;
    },
    [cx, cy, hitInner, hitOuter]
  );

  const anchorForIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= livedWindows.length) return null;
      return pointFrom(cx, cy, livedWindows[index].angle, artRadius * 0.75);
    },
    [livedWindows, artRadius, cx, cy]
  );

  // ── gestures ───────────────────────────────────────────────────

  const selectIndex = useCallback(
    (index: number, feedback: "tap" | "scrub" | "longPress") => {
      if (index < 0 || index >= livedWindows.length) return;
      if (feedback === "tap") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      else if (feedback === "longPress") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      else if (lastScrubbedRef.current !== index) {
        Haptics.selectionAsync().catch(() => {});
        lastScrubbedRef.current = index;
      }
      setSelectedIndex(index);
      setSelectedAnchor(anchorForIndex(index));
    },
    [anchorForIndex, livedWindows.length]
  );

  const handleTap = useCallback(
    (evt: { x: number; y: number }) => {
      const idx = indexForPoint(evt.x, evt.y);
      if (idx === null) {
        setSelectedIndex(null);
        setSelectedAnchor(null);
        return;
      }
      selectIndex(idx, "tap");
    },
    [indexForPoint, selectIndex]
  );

  const handleLongPress = useCallback(
    (evt: { x: number; y: number }) => {
      const idx = indexForPoint(evt.x, evt.y);
      if (idx === null) return;
      selectIndex(idx, "longPress");
    },
    [indexForPoint, selectIndex]
  );

  const handleScrub = useCallback(
    (evt: { x: number; y: number }) => {
      const idx = indexForPoint(evt.x, evt.y);
      if (idx === null) {
        lastScrubbedRef.current = null;
        return;
      }
      selectIndex(idx, "scrub");
    },
    [indexForPoint, selectIndex]
  );

  const handlePanEnd = useCallback(() => {
    lastScrubbedRef.current = null;
  }, []);

  const tapGesture = useMemo(() => Gesture.Tap().runOnJS(true).onEnd(handleTap), [handleTap]);
  const longPressGesture = useMemo(
    () => Gesture.LongPress().runOnJS(true).minDuration(450).onStart(handleLongPress),
    [handleLongPress]
  );
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(6)
        .onBegin(handleScrub)
        .onUpdate(handleScrub)
        .onFinalize(handlePanEnd),
    [handleScrub, handlePanEnd]
  );
  const composedGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, Gesture.Exclusive(longPressGesture, tapGesture)),
    [panGesture, longPressGesture, tapGesture]
  );

  const selectedWindow = selectedIndex !== null ? livedWindows[selectedIndex] : null;
  const selAngle = selectedWindow ? selectedWindow.angle : 0;

  // ── charcoal ticks ─────────────────────────────────────────────

  const tickHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

  return (
    <View style={{ width: size, height: size }}>
      <GestureDetector gesture={composedGesture}>
        <Canvas style={{ width: size, height: size }}>
          {/* Layer 0 — radial dawn wash */}
          <DawnWash cx={cx} cy={cy} size={size} breathe={breathe} />

          {/* Paper grain */}
          <PaperGrain size={size} />

          {/* Halo washes */}
          <Group>
            <Oval
              x={cx - size * 0.42 - breathe * 2}
              y={cy - size * 0.34 - breathe * 1.5}
              width={size * 0.84 + breathe * 4}
              height={size * 0.68 + breathe * 3}
              color={rgba(bloomPalette.paperDeep, 0.12)}
              transform={[{ rotate: -0.12 + drift * 0.015 }]}
              origin={{ x: cx, y: cy }}
            />
            <Oval
              x={cx - size * 0.38}
              y={cy - size * 0.32}
              width={size * 0.76}
              height={size * 0.64}
              color="rgba(201,221,228,0.07)"
              transform={[{ rotate: 0.38 - drift * 0.014 }]}
              origin={{ x: cx, y: cy }}
            />
            <Oval
              x={cx - size * 0.32}
              y={cy - size * 0.3}
              width={size * 0.64}
              height={size * 0.6}
              color="rgba(234,162,127,0.055)"
              transform={[{ rotate: 0.72 + breathe * 0.012 }]}
              origin={{ x: cx, y: cy }}
            />
          </Group>

          {/* Charcoal ticks */}
          <Group>
            {tickHours.map((hour) => {
              const angle = -Math.PI / 2 + (hour / 24) * Math.PI * 2;
              const outer = pointFrom(cx, cy, angle, tickRadius);
              const inner = pointFrom(cx, cy, angle, tickRadius - size * 0.028);
              const p = Skia.Path.Make();
              p.moveTo(outer.x, outer.y);
              p.lineTo(inner.x, inner.y);
              return (
                <Path
                  key={`tick-${hour}`}
                  path={p}
                  color="rgba(36,31,27,0.14)"
                  style="stroke"
                  strokeWidth={1}
                />
              );
            })}
          </Group>

          {/* Continuous bloom — lived window washes */}
          <Group blendMode="multiply">
            {livedWindows.map((w) => (
              <Group key={w.id}>
                {Array.from({ length: 10 }).map((_, layer) => {
                  const seed = `${w.id}-wash-${layer}`;
                  const lAngle = w.angle + noise(`${seed}-angle`, -0.35, 0.35);
                  const orbit = artRadius * noise(`${seed}-orbit`, 0.15, 0.94);
                  const center = pointFrom(
                    cx + noise(`${seed}-cx`, -16, 16) + drift * noise(`${seed}-dx`, -1.2, 1.2),
                    cy + noise(`${seed}-cy`, -12, 12) + breathe * noise(`${seed}-dy`, -1.2, 1.2),
                    lAngle,
                    orbit
                  );
                  const rx = size * noise(`${seed}-rx`, 0.09, 0.21) * (1 + w.intensity * 0.25);
                  const ry = size * noise(`${seed}-ry`, 0.05, 0.14) * (1 + w.intensity * 0.2);
                  const progressScale = w.isCurrent
                    ? 0.42 + w.progress * 0.46
                    : 0.65 + w.progress * 0.35;
                  const opacity = (0.048 + w.confidence * 0.042) * progressScale;
                  const lift =
                    selectedIndex === livedWindows.indexOf(w)
                      ? 1.14
                      : selectedIndex !== null
                      ? 0.92
                      : 1;

                  return (
                    <Oval
                      key={seed}
                      x={center.x - rx * lift}
                      y={center.y - ry * lift}
                      width={rx * 2 * lift}
                      height={ry * 2 * lift}
                      color={rgba(w.color, opacity)}
                      transform={[
                        {
                          rotate:
                            lAngle + Math.PI / 2 + noise(`${seed}-rot`, -0.5, 0.5),
                        },
                      ]}
                      origin={center}
                    />
                  );
                })}

                {/* Pigment pooling at wash intersection — separate layer per window */}
                <Oval
                  x={cx - size * 0.12}
                  y={cy - size * 0.08}
                  width={size * 0.24}
                  height={size * 0.16}
                  color={rgba(
                    w.color,
                    0.035 + w.intensity * 0.04 + w.confidence * 0.02
                  )}
                  transform={[
                    { rotate: w.angle + Math.PI / 2 + noise(`${w.id}-pool-angle`, -0.4, 0.4) },
                  ]}
                  origin={{
                    x: cx + noise(`${w.id}-pool-x`, -size * 0.06, size * 0.06),
                    y: cy + noise(`${w.id}-pool-y`, -size * 0.04, size * 0.04),
                  }}
                />

                {/* Granulation specks for all windows */}
                {Array.from({ length: w.state === "reactive" || w.variability > 0.5 ? 14 : 6 }).map((_, i) => {
                  const gSeed = `${w.id}-gran-${i}`;
                  const gDot = pointFrom(
                    cx + noise(`${gSeed}-cx`, -size * 0.14, size * 0.14),
                    cy + noise(`${gSeed}-cy`, -size * 0.12, size * 0.12),
                    noise(`${gSeed}-a`, 0, Math.PI * 2),
                    artRadius * noise(`${gSeed}-d`, 0.22, 0.96)
                  );
                  return (
                    <Circle
                      key={gSeed}
                      cx={gDot.x}
                      cy={gDot.y}
                      r={noise(`${gSeed}-r`, 0.4, w.state === "reactive" ? 2.6 : 1.6)}
                      color={rgba(
                        w.color,
                        0.05 + w.variability * 0.07 + (w.state === "reactive" ? 0.04 : 0)
                      )}
                    />
                  );
                })}
              </Group>
            ))}
          </Group>

          {/* Brush strokes — metabolic input marks */}
          <Group blendMode="multiply">
            <BrushStroke
              cx={cx} cy={cy} canvasSize={size}
              angle={2.6} distance={artRadius * 0.55}
              length={size * 0.34} maxWidth={size * 0.062}
              color="#A98BC5" noiseSeed="lavender"
              opacity={0.14} ghostOpacity={0.06}
              ghostOffset={{ x: -size * 0.006, y: size * 0.004 }}
              pigmentPool={{ position: 0.2, radius: size * 0.022, opacity: 0.12 }}
            />
            <BrushStroke
              cx={cx} cy={cy} canvasSize={size}
              angle={-0.85} distance={artRadius * 0.48}
              length={size * 0.26} maxWidth={size * 0.048}
              color="#D7B36A" noiseSeed="ochre"
              opacity={0.15} ghostOpacity={0.07}
              ghostOffset={{ x: size * 0.005, y: -size * 0.003 }}
              pigmentPool={{ position: 0.22, radius: size * 0.018, opacity: 0.1 }}
            />
            <BrushStroke
              cx={cx} cy={cy} canvasSize={size}
              angle={1.8} distance={artRadius * 0.52}
              length={size * 0.32} maxWidth={size * 0.055}
              color="#B9915E" noiseSeed="fat"
              opacity={0.1} ghostOpacity={0.04}
              ghostOffset={{ x: size * 0.004, y: -size * 0.003 }}
            />
            <BrushStroke
              cx={cx} cy={cy} canvasSize={size}
              angle={-1.2} distance={artRadius * 0.58}
              length={size * 0.18} maxWidth={size * 0.072}
              color="#E8795F" noiseSeed="sugar"
              opacity={0.15} ghostOpacity={0.07}
              ghostOffset={{ x: -size * 0.005, y: size * 0.004 }}
              pigmentPool={{ position: 0.2, radius: size * 0.025, opacity: 0.1 }}
            />
            <BrushStroke
              cx={cx} cy={cy} canvasSize={size}
              angle={-0.35} distance={artRadius * 0.45}
              length={size * 0.3} maxWidth={size * 0.04}
              color="#789A7A" noiseSeed="exercise"
              opacity={0.12} ghostOpacity={0.06}
              ghostOffset={{ x: size * 0.003, y: size * 0.003 }}
            />
            <BrushStroke
              cx={cx} cy={cy} canvasSize={size}
              angle={2.1} distance={artRadius * 0.55}
              length={size * 0.26} maxWidth={size * 0.048}
              color="#C9A46A" noiseSeed="protein"
              opacity={0.12} ghostOpacity={0.06}
              ghostOffset={{ x: -size * 0.003, y: -size * 0.003 }}
            />
            <BrushStroke
              cx={cx} cy={cy} canvasSize={size}
              angle={3.3} distance={artRadius * 0.48}
              length={size * 0.32} maxWidth={size * 0.07}
              color="#B9915E" noiseSeed="heavy-meal"
              opacity={0.22} ghostOpacity={0.1}
              ghostOffset={{ x: size * 0.005, y: size * 0.004 }}
              pigmentPool={{ position: 0.25, radius: size * 0.032, opacity: 0.18 }}
            />
          </Group>

          {/* Touch interaction — local pigment brightening */}
          {selectedAnchor && selectedWindow ? (
            <Oval
              x={selectedAnchor.x - size * 0.12}
              y={selectedAnchor.y - size * 0.075}
              width={size * 0.24}
              height={size * 0.15}
              color={rgba(selectedWindow.color, 0.12)}
              transform={[{ rotate: selAngle + Math.PI / 2 }]}
              origin={selectedAnchor}
            />
          ) : null}

          {/* Center medallion */}
          <CenterMedallion
            paperCx={paperCx}
            paperCy={paperCy}
            size={size}
            centerProgress={centerProgress}
          />
        </Canvas>
      </GestureDetector>

      {/* Gallery caption */}
      {selectedWindow && selectedAnchor ? (
        <GalleryCaption window={selectedWindow} anchor={selectedAnchor} />
      ) : null}

      {/* Center value inscription */}
      <View
        style={[
          styles.centerValue,
          { opacity: centerProgress, top: paperCy - size * 0.048 },
        ]}
      >
        <Text style={styles.glucose}>{glucose}</Text>
        <Text style={styles.unit}>mg/dL</Text>
        <Text style={styles.wave}>~</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerValue: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  glucose: {
    fontFamily: "Georgia",
    fontSize: 26,
    color: "#5A5249",
    fontWeight: "300",
    letterSpacing: -0.4,
  },
  unit: {
    marginTop: -1,
    fontSize: 11,
    color: "#8C8175",
  },
  wave: {
    marginTop: 1,
    fontSize: 15,
    color: "#A89F95",
  },
});