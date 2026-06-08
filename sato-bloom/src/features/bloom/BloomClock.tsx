import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Canvas, Circle, Group, Oval, Path, Skia } from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { BloomWindow } from "./bloomTypes";
import { bloomPalette, colorForBloomValue, interpolateHex } from "./bloomColors";

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

function windowAngle(window: BloomWindow) {
  return -Math.PI / 2 + ((window.startHour + 1) / 24) * Math.PI * 2;
}

export function BloomClock({
  windows,
  size = 390,
  glucose = 110,
  currentHour = 13,
}: BloomClockProps) {
  const [motionMs, setMotionMs] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedAnchor, setSelectedAnchor] = useState<{ x: number; y: number } | null>(null);
  const lastScrubbedRef = useRef<number | null>(null);

  // Base center
  const cx = size / 2;
  const cy = size * 0.44;
  const artRadius = size * 0.38;
  const hitInner = size * 0.12;
  const hitOuter = size * 0.48;
  const tickRadius = size * 0.46;

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

  // ── lived windows (only past + current) ──────────────────────────

  const livedWindows: LivedWindow[] = useMemo(() => {
    const baseLength = size * 0.28;
    const baseWidth = size * 0.12;

    // Find strongest reactive window to compute geometric pull
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
        const rawP = isDried
          ? 1
          : (currentHour - w.startHour) / Math.max(1, w.endHour - w.startHour);
        const progress = Math.min(1, Math.max(0.06, rawP));
        let angle = windowAngle(w);
        const color = colorForBloomValue(w.value);
        const length = baseLength * (0.78 + w.intensity * 0.38);
        const width = baseWidth * (0.85 + w.intensity * 0.22);

        // Geometric distortion: pull adjacent angles toward strongest event
        if (strongestPull > 0) {
          const diff = angle - strongestAngle;
          const normalizedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
          const influence = Math.max(0, 1 - Math.abs(normalizedDiff) / 1.2);
          angle += strongestPull * influence * 0.5;
        }

        return { ...w, isCurrent, isDried, progress, angle, color, length, width };
      });
  }, [windows, currentHour, size]);

  // ── center drift: nudge paper center opposite strongest event ────

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
    // Nudge center opposite to strongest event
    const driftAmount = size * 0.018 * strongestIntensity;
    const oppositeAngle = strongestAngle + Math.PI;
    return {
      paperCx: cx + size * 0.004 + Math.cos(oppositeAngle) * driftAmount,
      paperCy: cy - size * 0.018 + Math.sin(oppositeAngle) * driftAmount,
    };
  }, [livedWindows, cx, cy, size]);

  // ── hit testing (invisible radial clock) ─────────────────────────

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

  const selectIndex = useCallback(
    (index: number, feedback: "tap" | "scrub" | "longPress") => {
      if (index < 0 || index >= livedWindows.length) return;
      if (feedback === "tap") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } else if (feedback === "longPress") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } else if (lastScrubbedRef.current !== index) {
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


  const tapGesture = useMemo(
    () => Gesture.Tap().runOnJS(true).onEnd(handleTap),
    [handleTap]
  );
  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .runOnJS(true)
        .minDuration(450)
        .onStart(handleLongPress),
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

  // ── motion ──────────────────────────────────────────────────────

  const breathe = Math.sin((motionMs / 18000) * Math.PI * 2);
  const drift = Math.sin((motionMs / 22000) * Math.PI * 2);
  const centerProgress = easeOutCubic((motionMs - 520) / 460);
  const selectedWindow = selectedIndex !== null ? livedWindows[selectedIndex] : null;
  const selAngle = selectedWindow ? selectedWindow.angle : 0;

  // ── charcoal ticks ──────────────────────────────────────────────

  const tickHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

  return (
    <View style={{ width: size, height: size }}>
      <GestureDetector gesture={composedGesture}>
        <Canvas style={{ width: size, height: size }}>
          {/* Paper grain — felt, not seen */}
          <Group opacity={0.04}>
            {Array.from({ length: 260 }).map((_, i) => {
              const seed = `grain-${i}`;
              return (
                <Circle
                  key={seed}
                  cx={noise(`${seed}-x`, 0, size)}
                  cy={noise(`${seed}-y`, 0, size)}
                  r={noise(`${seed}-r`, 0.3, 1.4)}
                  color={noise(`${seed}-w`, 0, 1) > 0.5 ? "rgba(180,162,135,0.15)" : "rgba(248,238,220,0.13)"}
                />
              );
            })}
          </Group>

          {/* Halo — soft atmospheric washes */}
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

          {/* Tiny charcoal ticks — invisible clock skeleton */}
          <Group>
            {tickHours.map((hour) => {
              const angle = -Math.PI / 2 + (hour / 24) * Math.PI * 2;
              const outer = pointFrom(cx, cy, angle, tickRadius);
              const inner = pointFrom(cx, cy, angle, tickRadius - size * 0.028);
              const tickPath = Skia.Path.Make();
              tickPath.moveTo(outer.x, outer.y);
              tickPath.lineTo(inner.x, inner.y);
              return (
                <Path
                  key={`tick-${hour}`}
                  path={tickPath}
                  color="rgba(36,31,27,0.14)"
                  style="stroke"
                  strokeWidth={1}
                />
              );
            })}
          </Group>

          {/* Heavy lavender brush stroke — expressive, wide, irregular edges */}
          <Group blendMode="multiply">
            {(() => {
              const strokeAngle = 2.6;
              const dir = { x: Math.cos(strokeAngle), y: Math.sin(strokeAngle) };
              const perp = { x: -Math.sin(strokeAngle), y: Math.cos(strokeAngle) };
              const origin = pointFrom(
                cx + drift * 3 + size * 0.015,
                cy + breathe * 2 - size * 0.008,
                strokeAngle,
                artRadius * 0.55
              );
              const length = size * 0.34;
              const maxWidth = size * 0.062;
              const bpath = Skia.Path.Make();

              // Start tip (narrow)
              const t0 = origin.x - dir.x * length * 0.42 - perp.x * size * 0.006;
              const t1 = origin.y - dir.y * length * 0.42 - perp.y * size * 0.006;
              bpath.moveTo(t0, t1);

              // Upper edge — widens then tapers, with amplified organic jitter
              const jA = perp.x * size * (0.012 + noise('u1', -1, 1) * 0.014);
              const jB = perp.y * size * (0.012 + noise('u2', -1, 1) * 0.014);
              const jC = perp.x * size * (0.008 + noise('u3', -1, 1) * 0.016);
              const jD = perp.y * size * (0.008 + noise('u4', -1, 1) * 0.016);
              const jE = perp.x * size * (0.006 + noise('u5', -1, 1) * 0.012);
              const jF = perp.y * size * (0.006 + noise('u6', -1, 1) * 0.012);
              bpath.cubicTo(
                origin.x - dir.x * length * 0.2 - perp.x * maxWidth * 0.55 + jA,
                origin.y - dir.y * length * 0.2 - perp.y * maxWidth * 0.55 + jB,
                origin.x + dir.x * length * 0.35 - perp.x * maxWidth * 0.92 + jC,
                origin.y + dir.y * length * 0.35 - perp.y * maxWidth * 0.92 + jD,
                origin.x + dir.x * length * 0.55 - perp.x * maxWidth * 0.28 + jE,
                origin.y + dir.y * length * 0.55 - perp.y * maxWidth * 0.28 + jF
              );

              // End tip (narrow taper) with jitter
              const jG = perp.x * size * (0.01 + noise('u7', -1, 1) * 0.012);
              const jH = perp.y * size * (0.01 + noise('u8', -1, 1) * 0.012);
              const jI = perp.x * size * (0.004 + noise('u9', -1, 1) * 0.01);
              const jJ = perp.y * size * (0.004 + noise('ua', -1, 1) * 0.01);
              bpath.cubicTo(
                origin.x + dir.x * length * 0.62 - jG,
                origin.y + dir.y * length * 0.62 - jH,
                origin.x + dir.x * length * 0.65 - jI,
                origin.y + dir.y * length * 0.65 - jJ,
                origin.x + dir.x * length * 0.68 + perp.x * size * 0.002,
                origin.y + dir.y * length * 0.68 + perp.y * size * 0.002
              );

              // Lower edge — returning, with different wobble
              const jK = perp.x * size * (0.008 + noise('ub', -1, 1) * 0.014);
              const jL = perp.y * size * (0.008 + noise('uc', -1, 1) * 0.014);
              const jM = perp.x * size * (0.01 + noise('ud', -1, 1) * 0.015);
              const jN = perp.y * size * (0.01 + noise('ue', -1, 1) * 0.015);
              const jO = perp.x * size * (0.005 + noise('uf', -1, 1) * 0.012);
              const jP = perp.y * size * (0.005 + noise('ug', -1, 1) * 0.012);
              bpath.cubicTo(
                origin.x + dir.x * length * 0.58 + jK,
                origin.y + dir.y * length * 0.58 + jL,
                origin.x + dir.x * length * 0.3 + perp.x * maxWidth * 0.88 + jM,
                origin.y + dir.y * length * 0.3 + perp.y * maxWidth * 0.88 + jN,
                origin.x - dir.x * length * 0.18 + perp.x * maxWidth * 0.48 + jO,
                origin.y - dir.y * length * 0.18 + perp.y * maxWidth * 0.48 + jP
              );

              // Close back to start with jitter
              const jQ = perp.x * size * (0.008 + noise('uh', -1, 1) * 0.012);
              const jR = perp.y * size * (0.008 + noise('ui', -1, 1) * 0.012);
              bpath.cubicTo(
                origin.x - dir.x * length * 0.32 + jQ,
                origin.y - dir.y * length * 0.32 + jR,
                origin.x - dir.x * length * 0.38 + perp.x * size * 0.004,
                origin.y - dir.y * length * 0.38 + perp.y * size * 0.004,
                t0,
                t1
              );
              bpath.close();

              return (
                <Group>
                  {/* Main brush body */}
                  <Path path={bpath} color={rgba("#A98BC5", 0.14)} />
                  {/* Slightly offset watercolor spread */}
                  <Path
                    path={bpath}
                    color={rgba("#A98BC5", 0.06)}
                    transform={[{ translateX: -size * 0.006 }, { translateY: size * 0.004 }]}
                  />
                  {/* Pigment pool at the widest point */}
                  <Circle
                    cx={origin.x + dir.x * length * 0.2}
                    cy={origin.y + dir.y * length * 0.2}
                    r={size * 0.022}
                    color={rgba("#A98BC5", 0.12)}
                  />
                  {/* A few tiny specks from the brush lifting */}
                  <Circle
                    cx={origin.x + dir.x * length * 0.72 + perp.x * size * 0.018}
                    cy={origin.y + dir.y * length * 0.72 + perp.y * size * 0.018}
                    r={size * 0.006}
                    color={rgba("#A98BC5", 0.1)}
                  />
                  <Circle
                    cx={origin.x + dir.x * length * 0.76 - perp.x * size * 0.012}
                    cy={origin.y + dir.y * length * 0.76 - perp.y * size * 0.012}
                    r={size * 0.004}
                    color={rgba("#A98BC5", 0.08)}
                  />
                </Group>
              );
            })()}
          </Group>

          {/* ── Second brush stroke: warm ochre, upper area ── */}
          <Group blendMode="multiply">
            {(() => {
              const strokeAngle = -0.85;
              const dir = { x: Math.cos(strokeAngle), y: Math.sin(strokeAngle) };
              const perp = { x: -Math.sin(strokeAngle), y: Math.cos(strokeAngle) };
              const origin = pointFrom(
                cx - drift * 2 - size * 0.012,
                cy - breathe * 2.5 + size * 0.015,
                strokeAngle,
                artRadius * 0.48
              );
              const length = size * 0.3;
              const maxWidth = size * 0.048;
              const bpath = Skia.Path.Make();
              const color = "#D7B36A";

              const t0 = origin.x - dir.x * length * 0.38 - perp.x * size * 0.005;
              const t1 = origin.y - dir.y * length * 0.38 - perp.y * size * 0.005;
              bpath.moveTo(t0, t1);

              const jA = perp.x * size * (0.01 + noise('o1', -1, 1) * 0.012);
              const jB = perp.y * size * (0.01 + noise('o2', -1, 1) * 0.012);
              const jC = perp.x * size * (0.008 + noise('o3', -1, 1) * 0.014);
              const jD = perp.y * size * (0.008 + noise('o4', -1, 1) * 0.014);
              const jE = perp.x * size * (0.005 + noise('o5', -1, 1) * 0.01);
              const jF = perp.y * size * (0.005 + noise('o6', -1, 1) * 0.01);

              bpath.cubicTo(
                origin.x - dir.x * length * 0.18 - perp.x * maxWidth * 0.5 + jA,
                origin.y - dir.y * length * 0.18 - perp.y * maxWidth * 0.5 + jB,
                origin.x + dir.x * length * 0.32 - perp.x * maxWidth * 0.88 + jC,
                origin.y + dir.y * length * 0.32 - perp.y * maxWidth * 0.88 + jD,
                origin.x + dir.x * length * 0.52 - perp.x * maxWidth * 0.24 + jE,
                origin.y + dir.y * length * 0.52 - perp.y * maxWidth * 0.24 + jF
              );

              const jG = perp.x * size * (0.008 + noise('o7', -1, 1) * 0.01);
              const jH = perp.y * size * (0.008 + noise('o8', -1, 1) * 0.01);
              bpath.cubicTo(
                origin.x + dir.x * length * 0.58 - jG,
                origin.y + dir.y * length * 0.58 - jH,
                origin.x + dir.x * length * 0.62 - perp.x * size * 0.004,
                origin.y + dir.y * length * 0.62 - perp.y * size * 0.004,
                origin.x + dir.x * length * 0.65 + perp.x * size * 0.002,
                origin.y + dir.y * length * 0.65 + perp.y * size * 0.002
              );

              const jK = perp.x * size * (0.008 + noise('o9', -1, 1) * 0.012);
              const jL = perp.y * size * (0.008 + noise('oa', -1, 1) * 0.012);
              const jM = perp.x * size * (0.01 + noise('ob', -1, 1) * 0.014);
              const jN = perp.y * size * (0.01 + noise('oc', -1, 1) * 0.014);
              bpath.cubicTo(
                origin.x + dir.x * length * 0.55 + jK,
                origin.y + dir.y * length * 0.55 + jL,
                origin.x + dir.x * length * 0.28 + perp.x * maxWidth * 0.82 + jM,
                origin.y + dir.y * length * 0.28 + perp.y * maxWidth * 0.82 + jN,
                origin.x - dir.x * length * 0.15 + perp.x * maxWidth * 0.42,
                origin.y - dir.y * length * 0.15 + perp.y * maxWidth * 0.42
              );

              bpath.cubicTo(
                origin.x - dir.x * length * 0.28 + perp.x * size * 0.01,
                origin.y - dir.y * length * 0.28 + perp.y * size * 0.01,
                origin.x - dir.x * length * 0.34 + perp.x * size * 0.003,
                origin.y - dir.y * length * 0.34 + perp.y * size * 0.003,
                t0,
                t1
              );
              bpath.close();

              return (
                <Group>
                  <Path path={bpath} color={rgba(color, 0.12)} />
                  <Path path={bpath} color={rgba(color, 0.05)} transform={[{ translateX: size * 0.005 }, { translateY: -size * 0.003 }]} />
                  <Circle cx={origin.x + dir.x * length * 0.22} cy={origin.y + dir.y * length * 0.22} r={size * 0.018} color={rgba(color, 0.1)} />
                </Group>
              );
            })()}
          </Group>

          {/* Continuous watercolor bloom — single composition, no petals */}
          <Group blendMode="multiply">
            {livedWindows.map((w) => (
              <Group key={w.id}>
                {Array.from({ length: 6 }).map((_, layer) => {
                  const seed = `${w.id}-wash-${layer}`;
                  const lAngle = w.angle + noise(`${seed}-angle`, -0.28, 0.28);
                  const orbit = artRadius * noise(`${seed}-orbit`, 0.22, 0.86);
                  const center = pointFrom(
                    cx + noise(`${seed}-cx`, -12, 12) + drift * noise(`${seed}-dx`, -0.8, 0.8),
                    cy + noise(`${seed}-cy`, -8, 8) + breathe * noise(`${seed}-dy`, -0.8, 0.8),
                    lAngle,
                    orbit
                  );
                  const rx = size * noise(`${seed}-rx`, 0.09, 0.17) * (1 + w.intensity * 0.18);
                  const ry = size * noise(`${seed}-ry`, 0.05, 0.11) * (1 + w.intensity * 0.14);
                  const progressScale = w.isCurrent
                    ? 0.35 + w.progress * 0.42
                    : 0.55 + w.progress * 0.45;
                  const opacity = (0.024 + w.confidence * 0.024) * progressScale;
                  const lift = selectedIndex === livedWindows.indexOf(w) ? 1.14 : selectedIndex !== null ? 0.92 : 1;

                  return (
                    <Oval
                      key={seed}
                      x={center.x - rx * lift}
                      y={center.y - ry * lift}
                      width={rx * 2 * lift}
                      height={ry * 2 * lift}
                      color={rgba(w.color, opacity)}
                      transform={[{ rotate: lAngle + Math.PI / 2 + noise(`${seed}-rot`, -0.45, 0.45) }]}
                      origin={center}
                    />
                  );
                })}

                {/* Tiny granulation specks for reactive windows */}
                {(w.state === "reactive" || w.variability > 0.5) &&
                  Array.from({ length: 6 }).map((_, i) => {
                    const gSeed = `${w.id}-gran-${i}`;
                    const gDot = pointFrom(
                      cx + noise(`${gSeed}-cx`, -size * 0.12, size * 0.12),
                      cy + noise(`${gSeed}-cy`, -size * 0.1, size * 0.1),
                      noise(`${gSeed}-a`, 0, Math.PI * 2),
                      artRadius * noise(`${gSeed}-d`, 0.28, 0.94)
                    );
                    return (
                      <Circle
                        key={gSeed}
                        cx={gDot.x}
                        cy={gDot.y}
                        r={noise(`${gSeed}-r`, 0.5, 1.5)}
                        color={rgba(w.color, 0.05 + w.variability * 0.05)}
                      />
                    );
                  })}
              </Group>
            ))}
          </Group>

          {/* Touch interaction — local pigment brightening, no leaders/ghosts */}
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

          {/* Center paper medallion — handmade paper feel */}
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
        </Canvas>
      </GestureDetector>

      {/* Gallery caption — appears on touch, human-first copy */}
      {selectedWindow && selectedAnchor ? (
        <View style={[styles.galleryCaption, { left: selectedAnchor.x - 48, top: selectedAnchor.y - 38 }]}> 
          <Text style={styles.captionTime}>
            {selectedWindow.startHour === 12 ? "1 PM" : selectedWindow.label}
          </Text>
          <Text style={styles.captionBody}>Your body asked for a little more time.</Text>
        </View>
      ) : null}

      {/* Center value — inscribed on handmade paper */}
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
    width: 130,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,251,244,0.78)",
    borderWidth: 1,
    borderColor: "rgba(224,214,200,0.6)",
  },
  captionTime: {
    color: "#5795C7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  captionBody: {
    marginTop: 3,
    fontFamily: "Georgia",
    color: "#241F1B",
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "300",
  },
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