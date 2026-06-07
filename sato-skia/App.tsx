import React, { useMemo, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { Canvas, Fill, Oval, Circle, Group } from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import { featuresFromBiometric } from "./src/features/normalize";
import { buildRenderScene } from "./src/renderers/sceneBuilder";
import type { RenderScene, VisualToken } from "./src/types/artifact";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const PAPER = "#F4EFE6";
const PAPER_CARD = "#F6F2EC";
const OUTER_CREAM = "#E8DED0";

const PHONE_WIDTH = Math.min(SCREEN_WIDTH - 24, 430);
const PHONE_HEIGHT = Math.min(SCREEN_HEIGHT - 24, 840);
const ART_HEIGHT = PHONE_HEIGHT * 0.72;
const BLOOM_WIDTH = Math.min(PHONE_WIDTH - 52, 390);
const BLOOM_HEIGHT = Math.min(BLOOM_WIDTH * 1.16, PHONE_HEIGHT * 0.5);

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h);
}

function seeded(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function PaperBase({ width, height }: { width: number; height: number }) {
  return (
    <Group>
      <Fill color={PAPER} />
      <Circle cx={width * 0.12} cy={height * 0.18} r={width * 0.22} color="#EFE5D5" opacity={0.13} />
      <Circle cx={width * 0.86} cy={height * 0.84} r={width * 0.28} color="#FFF8EE" opacity={0.16} />
    </Group>
  );
}

function PaintedToken({ token, size, mode = "body" }: { token: VisualToken; size: number; mode?: "atmosphere" | "body" }) {
  const seed = hashString(token.id);
  const noise = token.noiseAmp ?? 0.18;
  const isAtmosphere = mode === "atmosphere";
  const stainCount = isAtmosphere ? 12 : token.kind === "path" ? 18 : 20;
  const edgeCount = isAtmosphere ? 10 : 30;
  const speckleCount = isAtmosphere ? 8 : 38;
  const rx = token.width / 2;
  const ry = token.height / 2;

  const stains = Array.from({ length: stainCount }).map((_, i) => {
    const s = seed + i * 37;
    return {
      cx: token.x + (seeded(s) - 0.5) * rx * (0.38 + noise * 0.42),
      cy: token.y + (seeded(s + 1) - 0.5) * ry * (0.38 + noise * 0.42),
      rx: rx * (0.48 + seeded(s + 2) * (isAtmosphere ? 0.34 : 0.48)),
      ry: ry * (0.44 + seeded(s + 3) * (isAtmosphere ? 0.28 : 0.46)),
      opacity: token.opacity * (isAtmosphere ? 0.11 : 0.12 + seeded(s + 4) * 0.11),
      rotation: token.rotation + (seeded(s + 5) - 0.5) * (isAtmosphere ? 0.22 : 0.58),
    };
  });

  const edges = Array.from({ length: edgeCount }).map((_, i) => {
    const s = seed + 900 + i * 19;
    const angle = seeded(s) * Math.PI * 2;
    const orbit = 0.67 + seeded(s + 1) * (0.2 + noise * 0.14);
    return {
      cx: token.x + Math.cos(angle) * rx * orbit,
      cy: token.y + Math.sin(angle) * ry * orbit,
      r: size * (0.0016 + seeded(s + 3) * (0.0048 + noise * 0.006)),
      opacity: token.opacity * (isAtmosphere ? 0.06 : 0.16 + seeded(s + 4) * 0.32),
    };
  });

  const speckles = Array.from({ length: speckleCount }).map((_, i) => {
    const s = seed + 1800 + i * 23;
    const angle = seeded(s) * Math.PI * 2;
    const radius = Math.sqrt(seeded(s + 1));
    return {
      cx: token.x + Math.cos(angle) * rx * radius * (0.25 + noise * 1.05),
      cy: token.y + Math.sin(angle) * ry * radius * (0.25 + noise * 1.05),
      r: size * (0.0007 + seeded(s + 2) * 0.0032),
      opacity: token.opacity * (0.06 + seeded(s + 3) * 0.24) * noise,
    };
  });

  return (
    <Group blendMode={token.blendMode === "multiply" ? "multiply" : "srcOver"}>
      {stains.map((p, i) => (
        <Oval
          key={`${token.id}-paint-${i}`}
          x={p.cx - p.rx}
          y={p.cy - p.ry}
          width={p.rx * 2}
          height={p.ry * 2}
          color={token.color}
          opacity={p.opacity}
          transform={[{ rotate: p.rotation }]}
          origin={{ x: p.cx, y: p.cy }}
        />
      ))}

      {speckles.map((p, i) => (
        <Circle key={`${token.id}-speckle-${i}`} cx={p.cx} cy={p.cy} r={p.r} color={token.color} opacity={p.opacity} />
      ))}

      {edges.map((p, i) => (
        <Circle key={`${token.id}-edge-${i}`} cx={p.cx} cy={p.cy} r={p.r} color={token.color} opacity={p.opacity} />
      ))}

      <Oval
        x={token.x - rx * 0.7}
        y={token.y - ry * 0.68}
        width={rx * 1.4}
        height={ry * 1.36}
        color={token.color}
        opacity={token.opacity * (isAtmosphere ? 0.06 : 0.1)}
        transform={[{ rotate: token.rotation }]}
        origin={{ x: token.x, y: token.y }}
      />
    </Group>
  );
}

function AtmosphereLayer({ tokens, size }: { tokens: VisualToken[]; size: number }) {
  return (
    <Group opacity={0.96}>
      {tokens.map((token) => <PaintedToken key={token.id} token={token} size={size} mode="atmosphere" />)}
    </Group>
  );
}

function SemanticBodyLayer({ tokens, size }: { tokens: VisualToken[]; size: number }) {
  return (
    <Group>
      {tokens.map((token) => <PaintedToken key={token.id} token={token} size={size} mode="body" />)}
    </Group>
  );
}

function AccentLayer({ tokens }: { tokens: VisualToken[] }) {
  return (
    <Group>
      {tokens.map((token) => (
        <Circle
          key={token.id}
          cx={token.x}
          cy={token.y}
          r={Math.max(token.width, token.height) / 2}
          color={token.color}
          opacity={token.opacity}
        />
      ))}
    </Group>
  );
}

function GroundAnchorLayer({ tokens }: { tokens: VisualToken[] }) {
  return (
    <Group>
      {tokens.map((token) => (
        <Circle
          key={token.id}
          cx={token.x}
          cy={token.y}
          r={token.width}
          color={token.color}
          opacity={token.opacity}
        />
      ))}
    </Group>
  );
}

function TextureOverlay({ width, height }: { width: number; height: number }) {
  const grain = useMemo(
    () => Array.from({ length: 150 }).map((_, i) => {
      const s = 12000 + i * 31;
      return {
        x: seeded(s) * width,
        y: seeded(s + 1) * height,
        r: 0.3 + seeded(s + 2) * 1.45,
        opacity: 0.018 + seeded(s + 3) * 0.036,
        color: seeded(s + 4) > 0.5 ? "#BFAE94" : "#7D8B87",
      };
    }),
    [width, height]
  );

  return (
    <Group>
      {grain.map((p, i) => <Circle key={`paper-${i}`} cx={p.x} cy={p.y} r={p.r} color={p.color} opacity={p.opacity} />)}
    </Group>
  );
}

function BiosensorArtCard({ scene, width, height, reveal }: { scene: RenderScene; width: number; height: number; reveal?: boolean }) {
  const size = Math.min(width, height);
  return (
    <Canvas style={{ width, height, backgroundColor: PAPER }}>
      <PaperBase width={width} height={height} />
      <AtmosphereLayer tokens={scene.atmosphere} size={size} />
      <SemanticBodyLayer tokens={scene.body} size={size} />
      <AccentLayer tokens={scene.accents} />
      <GroundAnchorLayer tokens={scene.ground} />
      <TextureOverlay width={width} height={height} />

      {reveal && (
        <Group>
          <Fill color={PAPER} opacity={0.86} />
          <Circle cx={width / 2} cy={height / 2} r={width * 0.12} color="#F8F2E7" opacity={0.95} />
          <TextureOverlay width={width} height={height} />
        </Group>
      )}
    </Canvas>
  );
}

type ProfileKey = "balanced" | "spike" | "calm";

type DemoEvent = {
  category: "meal" | "run" | "sleep" | "glucose" | "stress" | "note";
  carbs?: number;
  protein?: number;
  fat?: number;
  glucoseDelta?: number;
  glucoseImpact?: number;
  activityMinutes?: number;
  sleepScore?: number;
  stress?: number;
  feeling?: number;
  seed?: number;
};

type CloudMetrics = {
  timeInRange: number;
  variability: number;
  activity: number;
  consistency: number;
  feeling: number;
};

type StatePigment = {
  key: "timeInRange" | "variability" | "activity" | "consistency" | "feeling";
  label: string;
  value: number;
  color: string;
  secondary: string;
  angle: number;
};

const PROFILE_ACCENTS: Record<ProfileKey, string> = {
  balanced: "#5F8F63",
  spike: "#4F8FCB",
  calm: "#F06A2F",
};

const PROFILE_PALETTES: Record<ProfileKey, Array<Pick<StatePigment, "color" | "secondary">>> = {
  balanced: [
    { color: "#5F8F63", secondary: "#B8D7A5" },
    { color: "#86A85E", secondary: "#D9E9B7" },
    { color: "#4F7F6A", secondary: "#A7CDB8" },
    { color: "#6FA876", secondary: "#C7E3BC" },
    { color: "#9DBB73", secondary: "#E0ECC4" },
  ],
  spike: [
    { color: "#4F8FCB", secondary: "#A9D2F3" },
    { color: "#6EA8D9", secondary: "#C7E4FA" },
    { color: "#386FAE", secondary: "#8FC4EA" },
    { color: "#5B9FCF", secondary: "#BFE4F5" },
    { color: "#7BA7D8", secondary: "#D2E4FA" },
  ],
  calm: [
    { color: "#F06A2F", secondary: "#FFB17A" },
    { color: "#F2A65A", secondary: "#FFE0A6" },
    { color: "#D94B3D", secondary: "#FF7E61" },
    { color: "#F58B4C", secondary: "#FFD0A8" },
    { color: "#FF9A76", secondary: "#FFD7C8" },
  ],
};

function buildStatePigments(metrics: CloudMetrics, profileKey: ProfileKey): StatePigment[] {
  const palette = PROFILE_PALETTES[profileKey];

  return [
    { key: "timeInRange", label: "Time in range", value: metrics.timeInRange, ...palette[0], angle: -2.2 },
    { key: "variability", label: "Variability", value: metrics.variability, ...palette[1], angle: -0.95 },
    { key: "activity", label: "Activity", value: metrics.activity, ...palette[2], angle: 0.2 },
    { key: "consistency", label: "Consistency", value: metrics.consistency, ...palette[3], angle: 1.35 },
    { key: "feeling", label: "Feeling", value: metrics.feeling, ...palette[4], angle: 2.55 },
  ];
}

function WatercolorStateOrb({ pigments, width, height }: { pigments: StatePigment[]; width: number; height: number }) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.5;
  const bloomSeed = pigments.reduce((sum, pigment, i) => sum + Math.round(pigment.value * 1000) * (i + 3), 3200);

  const petals = useMemo(
    () => pigments.flatMap((pigment, pigmentIndex) => {
      const rings = [0.92, 0.7, 0.48];
      return rings.flatMap((ring, ringIndex) => {
        const count = ringIndex === 0 ? 12 : ringIndex === 1 ? 10 : 8;
        return Array.from({ length: count }).map((_, i) => {
          const s = bloomSeed + pigmentIndex * 701 + ringIndex * 149 + i * 31;
          const angle = pigment.angle + (Math.PI * 2 * i) / count + (seeded(s) - 0.5) * 0.42;
          const orbit = radius * ring * (0.36 + pigment.value * 0.28 + seeded(s + 1) * 0.08);
          const petalLong = radius * (0.36 + pigment.value * 0.2 - ringIndex * 0.035);
          const petalShort = radius * (0.18 + pigment.value * 0.1 - ringIndex * 0.02);
          return {
            id: `${pigment.key}-${ringIndex}-${i}`,
            x: cx + Math.cos(angle) * orbit,
            y: cy + Math.sin(angle) * orbit * 0.82,
            rx: petalLong * (0.82 + seeded(s + 2) * 0.28),
            ry: petalShort * (0.82 + seeded(s + 3) * 0.26),
            color: ringIndex === 2 || i % 3 === 0 ? pigment.color : pigment.secondary,
            opacity: (0.026 + pigment.value * 0.04) * (1 - ringIndex * 0.12),
            rotation: angle + Math.PI / 2 + (seeded(s + 4) - 0.5) * 0.48,
          };
        });
      });
    }),
    [bloomSeed, cx, cy, pigments, radius]
  );

  const centerWash = useMemo(
    () => pigments.map((pigment, i) => {
      const s = bloomSeed + i * 89;
      return {
        id: `center-${pigment.key}`,
        x: cx + (seeded(s) - 0.5) * radius * 0.18,
        y: cy + (seeded(s + 1) - 0.5) * radius * 0.14,
        rx: radius * (0.34 + pigment.value * 0.16),
        ry: radius * (0.28 + pigment.value * 0.14),
        color: pigment.color,
        opacity: 0.045 + pigment.value * 0.055,
        rotation: pigment.angle + (seeded(s + 2) - 0.5) * 0.7,
      };
    }),
    [bloomSeed, cx, cy, pigments, radius]
  );

  const timeInRange = pigments.find((pigment) => pigment.key === "timeInRange")?.value ?? 0.7;
  const activity = pigments.find((pigment) => pigment.key === "activity")?.value ?? 0.5;
  const consistency = pigments.find((pigment) => pigment.key === "consistency")?.value ?? 0.6;
  const feeling = pigments.find((pigment) => pigment.key === "feeling")?.value ?? 0.7;
  const glow = 0.1 + timeInRange * 0.08 + consistency * 0.06 + feeling * 0.08 + activity * 0.04;

  return (
    <Canvas style={{ width, height, backgroundColor: PAPER }}>
      <PaperBase width={width} height={height} />
      <Circle cx={cx} cy={cy} r={radius * 1.08} color="#FFE2B8" opacity={Math.max(0.08, glow * 0.62)} />
      <Group blendMode="multiply">
        {petals.map((petal) => (
          <Oval
            key={petal.id}
            x={petal.x - petal.rx}
            y={petal.y - petal.ry}
            width={petal.rx * 2}
            height={petal.ry * 2}
            color={petal.color}
            opacity={petal.opacity}
            transform={[{ rotate: petal.rotation }]}
            origin={{ x: petal.x, y: petal.y }}
          />
        ))}
      </Group>
      <Group blendMode="multiply">
        {centerWash.map((wash) => (
          <Oval
            key={wash.id}
            x={wash.x - wash.rx}
            y={wash.y - wash.ry}
            width={wash.rx * 2}
            height={wash.ry * 2}
            color={wash.color}
            opacity={wash.opacity}
            transform={[{ rotate: wash.rotation }]}
            origin={{ x: wash.x, y: wash.y }}
          />
        ))}
      </Group>
      <Circle cx={cx} cy={cy} r={radius * 0.065} color="#FFF6E8" opacity={0.9} />
      <Circle cx={cx} cy={cy} r={radius * 0.022} color="#FFB45F" opacity={0.95} />
      <TextureOverlay width={width} height={height} />
    </Canvas>
  );
}

const demoProfiles: { key: ProfileKey; label: string; metrics: CloudMetrics; data: DemoEvent[] }[] = [
  {
    key: "balanced",
    label: "Balanced",
    metrics: { timeInRange: 0.84, variability: 0.28, activity: 0.62, consistency: 0.78, feeling: 0.82 },
    data: [
      { category: "sleep" as const, sleepScore: 88, seed: 1001 },
      { category: "meal" as const, carbs: 14, protein: 5, fat: 4, glucoseDelta: 12, seed: 2001 },
      { category: "meal" as const, carbs: 18, protein: 32, fat: 14, glucoseDelta: 18, seed: 2002 },
      { category: "run" as const, activityMinutes: 28, seed: 3001 },
      { category: "meal" as const, carbs: 22, protein: 35, fat: 18, glucoseDelta: 16, seed: 2003 },
      { category: "note" as const, feeling: 82, seed: 4001 },
    ],
  },
  {
    key: "spike",
    label: "Spike",
    metrics: { timeInRange: 0.34, variability: 0.88, activity: 0.28, consistency: 0.31, feeling: 0.46 },
    data: [
      { category: "sleep" as const, sleepScore: 62, seed: 1002 },
      { category: "meal" as const, carbs: 64, protein: 6, fat: 18, glucoseDelta: 72, seed: 2004 },
      { category: "stress" as const, stress: 85, seed: 5001 },
      { category: "meal" as const, carbs: 78, protein: 22, fat: 36, glucoseDelta: 64, seed: 2005 },
      { category: "glucose" as const, glucoseImpact: 68, seed: 6001 },
      { category: "note" as const, feeling: 46, seed: 4004 },
    ],
  },
  {
    key: "calm",
    label: "Calm",
    metrics: { timeInRange: 0.9, variability: 0.18, activity: 0.72, consistency: 0.86, feeling: 0.9 },
    data: [
      { category: "sleep" as const, sleepScore: 92, seed: 1003 },
      { category: "meal" as const, carbs: 20, protein: 25, fat: 10, glucoseDelta: 14, seed: 2006 },
      { category: "run" as const, activityMinutes: 45, seed: 3002 },
      { category: "meal" as const, carbs: 16, protein: 30, fat: 12, glucoseDelta: 10, seed: 2007 },
      { category: "note" as const, feeling: 88, seed: 4002 },
      { category: "note" as const, feeling: 92, seed: 4003 },
    ],
  },
];

export default function App() {
  const [activeProfile, setActiveProfile] = useState(0);
  const [reveal, setReveal] = useState(false);
  const profile = demoProfiles[activeProfile];

  const scene = useMemo(() => {
    const features = profile.data.map((event) => featuresFromBiometric(event));
    return buildRenderScene(features, PHONE_WIDTH - 40, ART_HEIGHT - 96);
  }, [profile]);

  const statePigments = useMemo(() => buildStatePigments(profile.metrics, profile.key), [profile]);

  const handleProfilePress = (index: number) => {
    if (index !== activeProfile) {
      Haptics.selectionAsync().catch(() => undefined);
      setActiveProfile(index);
      setReveal(false);
    }
  };

  const handleBloomPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.phone}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>Sato</Text>
          <View style={styles.segment}>
            {demoProfiles.map((p, i) => (
              <Pressable key={p.key} onPress={() => handleProfilePress(i)} style={[styles.segBtn, i === activeProfile && { backgroundColor: PROFILE_ACCENTS[p.key] }]}>
                <Text style={[styles.segText, i === activeProfile && styles.segTextActive]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.stateBloomStage}>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPressIn={handleBloomPress}
            style={({ pressed }) => [styles.orbPanel, pressed && styles.orbPanelPressed]}
          >
            <WatercolorStateOrb pigments={statePigments} width={BLOOM_WIDTH} height={BLOOM_HEIGHT} />
            <View style={styles.orbCopy}>
              <Text style={styles.orbEyebrow}>{profile.label} state bloom</Text>
              <Text style={styles.orbTitle}>A drop here, a drop there.</Text>
              <Text style={styles.orbSub}>Time in range, variability, activity, consistency, and feeling bleed into one living watercolor cloud.</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.todayTitle}>Today</Text>
          <Text style={styles.todaySub}>How are you feeling?</Text>
          <View style={styles.legendRow}>
            {statePigments.map((pigment) => (
              <Legend key={pigment.key} color={pigment.color} label={pigment.label} />
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: OUTER_CREAM, alignItems: "center", justifyContent: "center" },
  phone: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    backgroundColor: PAPER_CARD,
    borderRadius: 40,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  topBar: { paddingTop: 24, paddingHorizontal: 24, paddingBottom: 12, backgroundColor: PAPER_CARD, zIndex: 2, elevation: 2 },
  brand: { fontFamily: "Georgia", fontSize: 32, color: "#241F1A", fontWeight: "300", letterSpacing: -0.5, marginBottom: 12 },
  segment: { flexDirection: "row", backgroundColor: "#FBF7EF", borderRadius: 999, padding: 4 },
  segBtn: { flex: 1, borderRadius: 999, paddingVertical: 8, alignItems: "center" },
  segBtnActive: { backgroundColor: "#102334" },
  segText: { color: "#7A7167", fontSize: 12, fontWeight: "600" },
  segTextActive: { color: "#F8F1E7" },
  artWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, backgroundColor: PAPER_CARD },
  artPressable: { backgroundColor: PAPER },
  stateBloomStage: { flex: 1, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, backgroundColor: PAPER_CARD, justifyContent: "center" },
  orbPanel: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 14,
    paddingBottom: 18,
    borderRadius: 38,
    backgroundColor: "#FBF7EF",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#6E604F",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  orbPanelPressed: { transform: [{ scale: 0.985 }], opacity: 0.94 },
  orbCopy: { alignItems: "center" },
  orbEyebrow: { color: "#8E7B62", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 6 },
  orbTitle: { fontFamily: "Georgia", fontSize: 25, color: "#241F1A", fontWeight: "300", marginBottom: 8, textAlign: "center" },
  orbSub: { color: "#7A7167", fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 250 },
  bottom: { paddingHorizontal: 24, paddingBottom: 18, backgroundColor: PAPER_CARD },
  todayTitle: { fontFamily: "Georgia", fontSize: 24, color: "#241F1A", fontWeight: "300", marginBottom: 3 },
  todaySub: { color: "#7A7167", fontSize: 13, marginBottom: 12 },
  legendRow: { flexDirection: "row", justifyContent: "space-between" },
  legendItem: { alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, opacity: 0.7 },
  legendLabel: { color: "#7A7167", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5 },
});
