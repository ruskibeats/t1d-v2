import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, Image, Animated, PanResponder } from "react-native";
import { Canvas, Fill, Oval, Circle, Group, Path, Text as SkiaText, matchFont } from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import { featuresFromBiometric } from "./src/features/normalize";
import { buildRenderScene } from "./src/renderers/sceneBuilder";
import type { RenderScene, VisualToken } from "./src/types/artifact";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const PAPER = "#FBF7EF";
const PAPER_CARD = "#FBF7EF";
const OUTER_CREAM = "#FBF7EF";
const PERSIMMON = "#E67E22";
const WARM_GREY = "#7E7A75";
const NAV_BORDER = "#ECE6DD";
const SATO_LOGO_MARK = require("./assets/sato_logo_mark.png");
const GLUCOSE_GRAPHICS_PORTRAIT = require("./assets/glucose_graphics_portrait.png");
const PORTRAIT_MOMENTUM = require("./assets/portrait_momentum.png");

const PHONE_WIDTH = Math.min(SCREEN_WIDTH - 24, 430);
const PHONE_HEIGHT = Math.min(SCREEN_HEIGHT - 24, 840);
const ART_HEIGHT = PHONE_HEIGHT * 0.72;
const BLOOM_WIDTH = Math.min(PHONE_WIDTH - 52, 390);
const BLOOM_HEIGHT = Math.min(BLOOM_WIDTH * 1.16, PHONE_HEIGHT * 0.54);
const BLOOM_TAP_SIZE = Math.min(BLOOM_WIDTH, BLOOM_HEIGHT) * 0.46;
const FEATURE_SHEET_CLOSED_Y = 430;

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
  const glucoseText = "110mg/dl";
  const glucoseFont = useMemo(() => matchFont({ fontFamily: "Georgia", fontSize: 25, fontWeight: "300" }), []);
  const glucoseBounds = glucoseFont.measureText(glucoseText);

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
      <TextureOverlay width={width} height={height} />
      <SkiaText
        x={cx - glucoseBounds.width / 2}
        y={cy + glucoseBounds.height / 2}
        text={glucoseText}
        font={glucoseFont}
        color="#FFFFFF"
        opacity={0.92}
      />
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
  const [sheetVisible, setSheetVisible] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(FEATURE_SHEET_CLOSED_Y)).current;
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

  const dismissFeatureSheet = () => {
    Animated.spring(sheetTranslateY, {
      toValue: FEATURE_SHEET_CLOSED_Y,
      useNativeDriver: true,
      damping: 24,
      stiffness: 210,
    }).start(() => setSheetVisible(false));
  };

  const handleBloomPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setSheetVisible(true);
    sheetTranslateY.setValue(FEATURE_SHEET_CLOSED_Y);
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 24,
      stiffness: 210,
    }).start();
  };

  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) sheetTranslateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 80 || gesture.vy > 0.75) {
          Haptics.selectionAsync().catch(() => undefined);
          dismissFeatureSheet();
        } else {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 24,
            stiffness: 210,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.root}>
      <View style={styles.phone}>
        <View style={styles.topBar}>
          <View style={styles.headerRow}>
            <View style={styles.logoLockup}>
              <Image source={SATO_LOGO_MARK} style={styles.logoMarkImage} resizeMode="contain" />
              <View>
                <Text style={styles.logoText}>Sato</Text>
                <Text style={styles.logoTagline}>KNOW YOUR RHYTHM</Text>
              </View>
            </View>
            <BellIcon />
          </View>
          <Text style={styles.welcomeText}>Good morning, Tom</Text>
          <Text style={styles.rhythmHeadline}>
            Your body is in{`\n`}a <Text style={styles.rhythmHeadlineAccent}>calm</Text> rhythm.
          </Text>
        </View>

        <View style={styles.stateBloomStage}>
          <View style={styles.orbPanel}>
            <View style={styles.bloomCanvasWrap}>
              <WatercolorStateOrb pigments={statePigments} width={BLOOM_WIDTH} height={BLOOM_HEIGHT} />
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={handleBloomPress}
                style={({ pressed }) => [styles.bloomCenterHitBox, pressed && styles.bloomCenterHitBoxPressed]}
              />
            </View>
          </View>
        </View>

        <View style={styles.portraitBottomSection} pointerEvents="box-none">
          {sheetVisible && (
            <Animated.View
              {...sheetPanResponder.panHandlers}
              style={[styles.featureSheet, { transform: [{ translateY: sheetTranslateY }] }]}
            >
              <View style={styles.featureSheetHandle} />
              <PortraitMomentumCard />
              <GlucoseRhythmCard />
              <InsightCard />
            </Animated.View>
          )}
          <BottomNavigation />
        </View>
      </View>
    </View>
  );
}

function BellIcon() {
  return (
    <View style={styles.bellWrap}>
      <View style={styles.bellDome} />
      <View style={styles.bellBase} />
      <View style={styles.bellClapper} />
      <View style={styles.bellDot} />
    </View>
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

function InsightSparkle({ color = PERSIMMON, size = 16 }: { color?: string; size?: number }) {
  return (
    <View style={[styles.insightSparkle, { width: size, height: size }]}>
      <View style={[styles.insightSparkleVertical, { backgroundColor: color }]} />
      <View style={[styles.insightSparkleHorizontal, { backgroundColor: color }]} />
    </View>
  );
}

function ChevronRight({ color = PERSIMMON }: { color?: string }) {
  return (
    <View style={styles.chevronBox}>
      <View style={[styles.chevronStroke, { borderColor: color }]} />
    </View>
  );
}

function PortraitMomentumCard() {
  return (
    <View style={styles.portraitMomentumCard}>
      <Image source={PORTRAIT_MOMENTUM} style={styles.portraitMomentumImage} resizeMode="cover" />
    </View>
  );
}

function GlucoseRhythmCard() {
  return (
    <View style={styles.glucoseRhythmCard}>
      <Image source={GLUCOSE_GRAPHICS_PORTRAIT} style={styles.glucoseRhythmImage} resizeMode="cover" />
    </View>
  );
}

function InsightCard() {
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightCopy}>
        <View style={styles.insightHeaderRow}>
          <InsightSparkle />
          <Text style={styles.insightLabel}>Insight for you</Text>
        </View>
        <Text style={styles.insightText}>{"Walking after lunch has often\ncoincided with smaller spikes."}</Text>
      </View>
      <Pressable accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.insightArrowButton, pressed && styles.insightArrowButtonPressed]}>
        <ChevronRight />
      </Pressable>
    </View>
  );
}

type NavItemKey = "portrait" | "foods" | "discover" | "sato" | "profile";

const NAV_ITEMS: { key: NavItemKey; label: string }[] = [
  { key: "portrait", label: "Portrait" },
  { key: "foods", label: "Foods" },
  { key: "discover", label: "Discover" },
  { key: "sato", label: "Sato" },
  { key: "profile", label: "Profile" },
];

function SatoBlossomLogo({ size = 22 }: { size?: number }) {
  const petalLong = size * 0.68;
  const petalShort = size * 0.34;
  const petalOffset = size * 0.19;

  return (
    <View style={[styles.blossomMark, { width: size, height: size }]}>
      {[0, 1, 2, 3].map((petal) => (
        <View
          key={petal}
          style={[
            styles.blossomPetal,
            {
              width: petalShort,
              height: petalLong,
              borderRadius: petalLong,
              backgroundColor: PERSIMMON,
              opacity: 0.42,
              transform: [{ rotate: `${petal * 90 + 45}deg` }, { translateY: -petalOffset }],
            },
          ]}
        />
      ))}
      <View style={styles.blossomStar}>
        <View style={styles.blossomStarArm} />
        <View style={[styles.blossomStarArm, styles.blossomStarArmDiagonal]} />
      </View>
    </View>
  );
}

function FoodsIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconBox}>
      <View style={styles.forkTines}>
        <View style={[styles.tine, { backgroundColor: color }]} />
        <View style={[styles.tine, { backgroundColor: color }]} />
        <View style={[styles.tine, { backgroundColor: color }]} />
      </View>
      <View style={[styles.forkHandle, { backgroundColor: color }]} />
      <View style={[styles.knife, { borderColor: color }]} />
    </View>
  );
}

function DiscoverIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconBox}>
      <View style={[styles.sparkleLine, styles.sparkleVertical, { backgroundColor: color }]} />
      <View style={[styles.sparkleLine, styles.sparkleHorizontal, { backgroundColor: color }]} />
      <View style={[styles.sparkleDot, styles.sparkleDotOne, { backgroundColor: color }]} />
      <View style={[styles.sparkleDot, styles.sparkleDotTwo, { backgroundColor: color }]} />
    </View>
  );
}

function SatoIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconBox}>
      <View style={[styles.bubble, { borderColor: color }]} />
      <View style={[styles.bubbleTail, { borderBottomColor: color, borderRightColor: color }]} />
    </View>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconBox}>
      <View style={[styles.userHead, { borderColor: color }]} />
      <View style={[styles.userShoulders, { borderColor: color }]} />
    </View>
  );
}

function NavIcon({ item, color }: { item: NavItemKey; color: string }) {
  if (item === "portrait") return <SatoBlossomLogo />;
  if (item === "foods") return <FoodsIcon color={color} />;
  if (item === "discover") return <DiscoverIcon color={color} />;
  if (item === "sato") return <SatoIcon color={color} />;
  return <ProfileIcon color={color} />;
}

function BottomNavigation() {
  return (
    <View style={styles.navSafeArea}>
      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => {
          const active = item.key === "portrait";
          const color = active ? PERSIMMON : WARM_GREY;

          return (
            <Pressable key={item.key} style={styles.navItem} accessibilityRole="tab" accessibilityState={{ selected: active }}>
              <View style={styles.navIconWrap}>
                <NavIcon item={item.key} color={color} />
              </View>
              <Text style={[styles.navLabel, { color }]}>{item.label}</Text>
              <View style={[styles.navIndicator, active && styles.navIndicatorActive]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER_CARD },
  phone: {
    flex: 1,
    width: "100%",
    backgroundColor: PAPER_CARD,
  },
  topBar: { paddingTop: 48, paddingHorizontal: 12, paddingBottom: 4, backgroundColor: PAPER_CARD, zIndex: 2 },
  brand: { fontFamily: "Georgia", fontSize: 32, color: "#241F1A", fontWeight: "300", letterSpacing: -0.5, marginBottom: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  logoLockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoMarkImage: {
    width: 42,
    height: 42,
  },
  logoText: {
    fontFamily: "Georgia",
    fontSize: 26,
    lineHeight: 29,
    color: "#1F1B18",
    fontWeight: "300",
    letterSpacing: -0.5,
  },
  logoTagline: {
    color: "#9A8A7D",
    fontSize: 6.5,
    fontWeight: "700",
    letterSpacing: 1.55,
    marginTop: -1,
  },
  welcomeText: {
    color: "#7A6658",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
    marginBottom: 7,
  },
  rhythmHeadline: {
    fontFamily: "Georgia",
    fontSize: 27,
    lineHeight: 36,
    color: "#1F1B18",
    fontWeight: "300",
    letterSpacing: -0.4,
  },
  rhythmHeadlineAccent: {
    color: PERSIMMON,
  },
  bellWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  bellDome: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: "#1F1B18",
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  bellBase: {
    width: 18,
    height: 6,
    borderWidth: 1.5,
    borderColor: "#1F1B18",
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -1,
  },
  bellClapper: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1F1B18",
    marginTop: 1,
  },
  bellDot: {
    position: "absolute",
    right: 3,
    top: 2,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: PERSIMMON,
  },
  segment: { flexDirection: "row", backgroundColor: "#FBF7EF", borderRadius: 999, padding: 4 },
  segBtn: { flex: 1, borderRadius: 999, paddingVertical: 8, alignItems: "center" },
  segBtnActive: { backgroundColor: "#102334" },
  segText: { color: "#7A7167", fontSize: 12, fontWeight: "600" },
  segTextActive: { color: "#F8F1E7" },
  artWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, backgroundColor: PAPER_CARD },
  artPressable: { backgroundColor: PAPER },
  stateBloomStage: { flex: 1, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 108, backgroundColor: PAPER_CARD, justifyContent: "center" },
  orbPanel: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#FBF7EF",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  bloomCanvasWrap: {
    width: BLOOM_WIDTH,
    height: BLOOM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  bloomCenterHitBox: {
    position: "absolute",
    left: (BLOOM_WIDTH - BLOOM_TAP_SIZE) / 2,
    top: (BLOOM_HEIGHT - BLOOM_TAP_SIZE) / 2,
    width: BLOOM_TAP_SIZE,
    height: BLOOM_TAP_SIZE,
    borderRadius: BLOOM_TAP_SIZE / 2,
  },
  bloomCenterHitBoxPressed: { transform: [{ scale: 0.94 }], opacity: 0.94 },
  orbCopy: { alignItems: "center", backgroundColor: "#FBF7EF" },
  orbEyebrow: { color: "#8E7B62", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 6 },
  orbTitle: { fontFamily: "Georgia", fontSize: 25, color: "#241F1A", fontWeight: "300", marginBottom: 8, textAlign: "center" },
  orbSub: { color: "#7A7167", fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 250 },
  portraitBottomSection: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 5,
  },
  featureSheet: {
    paddingTop: 10,
    paddingBottom: 8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#FBF7EF",
    shadowColor: "#6E604F",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 5,
  },
  featureSheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#DED4C8",
    marginBottom: 10,
  },
  bottom: { paddingHorizontal: 24, paddingBottom: 12, backgroundColor: PAPER_CARD },
  todayTitle: { fontFamily: "Georgia", fontSize: 24, color: "#241F1A", fontWeight: "300", marginBottom: 3 },
  todaySub: { color: "#7A7167", fontSize: 13, marginBottom: 12 },
  legendRow: { flexDirection: "row", justifyContent: "space-between" },
  legendItem: { alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, opacity: 0.7 },
  legendLabel: { color: "#7A7167", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5 },
  portraitMomentumCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#FBF7EF",
  },
  portraitMomentumImage: {
    width: "100%",
    height: 111,
  },
  glucoseRhythmCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#FBF7EF",
  },
  glucoseRhythmImage: {
    width: "100%",
    height: 116,
  },
  insightCard: {
    minHeight: 94,
    marginHorizontal: 16,
    marginBottom: 0,
    paddingVertical: 12,
    paddingLeft: 18,
    paddingRight: 64,
    backgroundColor: "#FBF7EF",
    flexDirection: "row",
    alignItems: "center",
  },
  insightCopy: {
    flex: 1,
  },
  insightHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 7,
  },
  insightSparkle: {
    alignItems: "center",
    justifyContent: "center",
  },
  insightSparkleVertical: {
    position: "absolute",
    width: 1.55,
    height: 15.5,
    borderRadius: 1,
    transform: [{ rotate: "45deg" }],
  },
  insightSparkleHorizontal: {
    position: "absolute",
    width: 15.5,
    height: 1.55,
    borderRadius: 1,
    transform: [{ rotate: "45deg" }],
  },
  insightLabel: {
    fontFamily: "Georgia",
    color: "#7A6658",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.05,
  },
  insightText: {
    fontFamily: "Georgia",
    color: "#1F1B18",
    fontSize: 16,
    fontWeight: "300",
    lineHeight: 23,
    letterSpacing: -0.18,
  },
  insightArrowButton: {
    position: "absolute",
    right: 16,
    top: "50%",
    width: 36,
    height: 36,
    marginTop: -18,
    backgroundColor: "#FBF7EF",
    alignItems: "center",
    justifyContent: "center",
  },
  insightArrowButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  chevronBox: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronStroke: {
    width: 8,
    height: 8,
    borderTopWidth: 1.8,
    borderRightWidth: 1.8,
    transform: [{ rotate: "45deg" }],
    borderRadius: 1,
  },
  navSafeArea: {
    backgroundColor: PAPER_CARD,
    borderTopWidth: 1,
    borderTopColor: NAV_BORDER,
    paddingBottom: 24,
  },
  bottomNav: {
    height: 58,
    backgroundColor: PAPER_CARD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    shadowColor: "#6E604F",
    shadowOpacity: 0.025,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  navItem: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
  },
  navIconWrap: {
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.05,
    textAlign: "center",
  },
  navIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
    opacity: 0,
  },
  navIndicatorActive: {
    backgroundColor: PERSIMMON,
    opacity: 1,
  },
  iconBox: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  blossomMark: {
    alignItems: "center",
    justifyContent: "center",
  },
  blossomPetal: {
    position: "absolute",
  },
  blossomStar: {
    width: 8,
    height: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  blossomStarArm: {
    position: "absolute",
    width: 2.5,
    height: 8,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  blossomStarArmDiagonal: {
    transform: [{ rotate: "90deg" }],
  },
  forkTines: {
    position: "absolute",
    left: 4,
    top: 3,
    width: 7,
    height: 7,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tine: {
    width: 1.15,
    height: 7,
    borderRadius: 1,
  },
  forkHandle: {
    position: "absolute",
    left: 7,
    top: 9,
    width: 1.2,
    height: 10,
    borderRadius: 1,
  },
  knife: {
    position: "absolute",
    right: 5,
    top: 4,
    width: 4.5,
    height: 15,
    borderRightWidth: 1.2,
    borderTopWidth: 1.2,
    borderTopRightRadius: 5,
    transform: [{ rotate: "4deg" }],
  },
  sparkleLine: {
    position: "absolute",
    borderRadius: 1,
  },
  sparkleVertical: {
    width: 1.2,
    height: 19,
    transform: [{ rotate: "45deg" }],
  },
  sparkleHorizontal: {
    width: 19,
    height: 1.2,
    transform: [{ rotate: "45deg" }],
  },
  sparkleDot: {
    position: "absolute",
    width: 1.6,
    height: 1.6,
    borderRadius: 1,
  },
  sparkleDotOne: { right: 2, top: 3 },
  sparkleDotTwo: { left: 3, bottom: 4 },
  bubble: {
    width: 19,
    height: 14,
    borderWidth: 1.25,
    borderRadius: 8,
  },
  bubbleTail: {
    position: "absolute",
    bottom: 3,
    left: 7,
    width: 5,
    height: 5,
    borderRightWidth: 1.25,
    borderBottomWidth: 1.25,
    transform: [{ rotate: "35deg" }],
    backgroundColor: PAPER_CARD,
  },
  userHead: {
    position: "absolute",
    top: 3,
    width: 7.5,
    height: 7.5,
    borderRadius: 4,
    borderWidth: 1.25,
  },
  userShoulders: {
    position: "absolute",
    bottom: 2,
    width: 16,
    height: 8,
    borderTopWidth: 1.25,
    borderLeftWidth: 1.25,
    borderRightWidth: 1.25,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
});
