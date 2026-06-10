import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  Canvas,
  Circle,
  Group,
  Oval,
  Rect,
  vec,
  BlurMask,
} from "@shopify/react-native-skia";
import { BloomClock, todayBloomWindows } from "../features/bloom";
import { ScreenName } from "../navigation/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type InsightCategory = "food" | "activity" | "sleep" | "stress" | "routine";

type Discovery = {
  id: string;
  title: string;
  signal: "Strong Pattern" | "Emerging Signal";
  seen: string;
  category: InsightCategory;
  color: string;
  secondaryColor: string;
  seed: string;
};

const discoveries: Discovery[] = [
  {
    id: "pizza-evening",
    title: "Pizza leaves a stronger\nevening trace",
    signal: "Strong Pattern",
    seen: "Seen 18 times",
    category: "food",
    color: "#D9571F",
    secondaryColor: "#2F6E7E",
    seed: "pizza-evening-trace",
  },
  {
    id: "walks-afternoon",
    title: "Walks soften your\nafternoons",
    signal: "Strong Pattern",
    seen: "Seen 14 times",
    category: "activity",
    color: "#5795C7",
    secondaryColor: "#A7B978",
    seed: "walks-afternoon-soften",
  },
  {
    id: "mornings-steady",
    title: "Your mornings are\nbecoming steadier",
    signal: "Strong Pattern",
    seen: "Seen 21 times",
    category: "routine",
    color: "#8FA15F",
    secondaryColor: "#D7B36A",
    seed: "steady-mornings",
  },
  {
    id: "bjj-echo",
    title: "Jiu-jitsu leaves an\novernight echo",
    signal: "Emerging Signal",
    seen: "Seen 6 times",
    category: "stress",
    color: "#7A61A8",
    secondaryColor: "#D6C3E8",
    seed: "bjj-overnight-echo",
  },
  {
    id: "sleep-breakfast",
    title: "Short sleep changes\nyour breakfast rhythm",
    signal: "Emerging Signal",
    seen: "Seen 9 times",
    category: "sleep",
    color: "#C69B55",
    secondaryColor: "#B9C8D8",
    seed: "short-sleep-breakfast",
  },
];

export default function InsightsScreen({
  onNavigate,
}: {
  onNavigate?: (screen: ScreenName) => void;
}) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <AppHeader />

          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle}>Insights</Text>
            <Text style={styles.pageSubtitle}>
              Your blooms reveal what's been{"\n"}shaping your rhythm.
            </Text>
          </View>

          <View style={styles.tabs}>
            {["Bloom", "Trends", "Patterns", "Day in detail"].map((tab, i) => (
              <View key={tab} style={[styles.tab, i === 0 && styles.tabActive]}>
                <Text style={[styles.tabText, i === 0 && styles.tabTextActive]}>
                  {tab}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroCardEyebrow}>Today's bloom</Text>
            <Text style={styles.heroCardSubtext}>Based on your day so far</Text>

            <View style={styles.heroPortraitBloomWrap} pointerEvents="none">
              <BloomClock
                windows={todayBloomWindows}
                size={SCREEN_WIDTH - 64}
                glucose={110}
                currentHour={19}
              />
            </View>

            <View style={styles.heroPortraitMessageWrap}>
              <Text style={styles.heroPortraitCaption}>
                Today left a stronger{"\n"}impression after lunch.
              </Text>

              <View style={styles.heroPortraitRule} />

              <Text style={styles.heroPortraitPhilosophy}>
                The portrait remembers.{"\n"}The numbers explain.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recently uncovered</Text>
            <Text style={styles.seeAll}>See all</Text>
          </View>

          <View style={styles.list}>
            {discoveries.map((item) => (
              <DiscoveryCard key={item.id} discovery={item} />
            ))}
          </View>
        </ScrollView>

        <BottomNav onNavigate={onNavigate} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function DiscoveryCard({ discovery }: { discovery: Discovery }) {
  return (
    <Pressable style={styles.discoveryCard}>
      <View style={styles.miniBloom}>
        <InsightBloom
          size={76}
          category={discovery.category}
          seed={discovery.seed}
          primary={discovery.color}
          secondary={discovery.secondaryColor}
          strength={discovery.signal === "Strong Pattern" ? 0.88 : 0.54}
        />
      </View>

      <View style={styles.discoveryCopy}>
        <Text style={styles.discoveryTitle}>{discovery.title}</Text>
        <View style={styles.metaRow}>
          <Text
            style={[
              styles.discoverySignal,
              discovery.signal === "Emerging Signal" && styles.emergingSignal,
            ]}
          >
            {discovery.signal}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.discoverySeen}>{discovery.seen}</Text>
        </View>
      </View>

      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

function InsightBloom({
  size,
  category,
  seed,
  primary,
  secondary,
  strength,
  atmospheric = false,
}: {
  size: number;
  category: InsightCategory;
  seed: string;
  primary: string;
  secondary: string;
  strength: number;
  atmospheric?: boolean;
}) {
  const petals = React.useMemo(() => {
    const count = atmospheric ? 42 : 16;
    return Array.from({ length: count }).map((_, i) => {
      const n = noise(`${seed}-${i}`);
      const angleBase = category === "routine" ? (i / count) * Math.PI * 2 : n * Math.PI * 2;
      const angle = angleBase + noise(`${seed}-angle-${i}`, -0.55, 0.55);
      const distance = size * (atmospheric ? 0.08 : 0.05) + noise(`${seed}-dist-${i}`, 0, size * 0.08);
      const rx = size * noise(`${seed}-rx-${i}`, 0.12, atmospheric ? 0.26 : 0.18);
      const ry = size * noise(`${seed}-ry-${i}`, 0.055, atmospheric ? 0.16 : 0.11);
      const opacity = atmospheric
        ? noise(`${seed}-op-${i}`, 0.05, 0.13)
        : noise(`${seed}-op-${i}`, 0.12, 0.22);

      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rx,
        ry,
        rotate: `${angle + Math.PI / 2}rad`,
        color: i % 3 === 0 ? primary : i % 3 === 1 ? secondary : "#A7B978",
        opacity,
      };
    });
  }, [category, seed, size, primary, secondary, atmospheric]);

  const cx = size * (0.5 + noise(`${seed}-cx`, -0.06, 0.06));
  const cy = size * (0.52 + noise(`${seed}-cy`, -0.05, 0.06));

  return (
    <Canvas style={{ width: size, height: size }}>
      <Circle
        cx={cx}
        cy={cy}
        r={size * (atmospheric ? 0.43 : 0.36)}
        color={rgba("#F0E8DC", atmospheric ? 0.35 : 0.2)}
      />

      <Group blendMode="multiply">
        {petals.map((p, i) => (
          <Group
            key={`${seed}-${i}`}
            origin={vec(cx + p.x, cy + p.y)}
            transform={[{ rotate: Number(p.rotate.replace("rad", "")) }]}
          >
            <Oval
              x={cx + p.x - p.rx}
              y={cy + p.y - p.ry}
              width={p.rx * 2}
              height={p.ry * 2}
              color={rgba(p.color, p.opacity)}
            >
              {atmospheric && <BlurMask blur={2.5} style="normal" />}
            </Oval>
          </Group>
        ))}
      </Group>

      <Circle cx={cx} cy={cy} r={size * 0.075 * strength} color={rgba(primary, 0.48)} />
      <Circle cx={cx + size * 0.015} cy={cy + size * 0.01} r={size * 0.05} color={rgba("#211F1B", 0.15)} />
      <Circle cx={cx - size * 0.02} cy={cy - size * 0.015} r={size * 0.035} color={rgba(primary, 0.28)} />

      {atmospheric ? (
        <>
          <Circle cx={size * 0.82} cy={size * 0.32} r={size * 0.035} color={rgba(primary, 0.55)} />
          <Circle cx={size * 0.22} cy={size * 0.68} r={size * 0.028} color={rgba(secondary, 0.55)} />
          <Circle cx={size * 0.73} cy={size * 0.72} r={size * 0.018} color={rgba("#D7B36A", 0.45)} />
        </>
      ) : null}
    </Canvas>
  );
}

function AppHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.logoWrap}>
        <View style={styles.logoMark}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.logoPetal,
                { transform: [{ rotate: `${i * 90 + 45}deg` }] },
              ]}
            />
          ))}
        </View>
        <Text style={styles.logoText}>Sato</Text>
      </View>

      <View style={styles.bell}>
        <Text style={styles.bellText}>♩</Text>
        <View style={styles.notificationDot} />
      </View>
    </View>
  );
}

function BottomNav({
  onNavigate,
}: {
  onNavigate?: (screen: ScreenName) => void;
}) {
  const items: { label: string; screen?: ScreenName }[] = [
    { label: "Portrait", screen: "Portrait" },
    { label: "Foods", screen: "Foods" },
    { label: "Discover", screen: "Insights" },
    { label: "Sato" },
    { label: "Profile", screen: "Profile" },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const active = item.label === "Discover";
        return (
          <Pressable
            key={item.label}
            style={styles.navItem}
            onPress={() => item.screen && onNavigate?.(item.screen)}
          >
            <View style={[styles.navIcon, active && styles.navIconActive]} />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>
              {item.label}
            </Text>
            {active ? <View style={styles.navDot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

function noise(key: string, min = 0, max = 1) {
  const n = (hashString(key) % 10000) / 10000;
  return min + (max - min) * n;
}

function rgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8F1E6",
  },
  scroll: {
    paddingHorizontal: 22,
    paddingBottom: 132,
  },
  header: {
    marginTop: 8,
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoMark: {
    width: 32,
    height: 32,
    marginRight: 13,
  },
  logoPetal: {
    position: "absolute",
    left: 10,
    top: 3,
    width: 12,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#D9571F",
    opacity: 0.72,
  },
  logoText: {
    fontFamily: "Georgia",
    fontSize: 46,
    color: "#211F1B",
    letterSpacing: -1.5,
  },
  bell: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  bellText: {
    fontSize: 30,
    color: "#211F1B",
  },
  notificationDot: {
    position: "absolute",
    right: 0,
    top: 2,
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: "#D9571F",
  },
  titleBlock: {
    marginTop: 10,
  },
  pageTitle: {
    fontFamily: "Georgia",
    fontSize: 58,
    lineHeight: 66,
    color: "#211F1B",
    letterSpacing: -2.1,
  },
  pageSubtitle: {
    marginTop: 8,
    fontSize: 21,
    lineHeight: 30,
    color: "#80786F",
    fontWeight: "700",
  },
  tabs: {
    marginTop: 28,
    height: 56,
    borderRadius: 999,
    backgroundColor: "#EFE7DC",
    flexDirection: "row",
    padding: 4,
  },
  tab: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#FFFDF8",
  },
  tabText: {
    fontSize: 16,
    color: "#6E655B",
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#D9571F",
  },
  heroCard: {
    marginTop: 20,
    minHeight: 520,
    borderRadius: 34,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "rgba(33,31,27,0.07)",
    overflow: "hidden",
    position: "relative",
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 28,
    shadowColor: "#211F1B",
    shadowOpacity: 0.045,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  heroHeader: {
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroTitle: {
    fontFamily: "Georgia",
    fontSize: 27,
    lineHeight: 33,
    color: "#211F1B",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 17,
    lineHeight: 23,
    color: "#80786F",
    fontWeight: "700",
  },
  infoCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: "#211F1B",
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    fontSize: 20,
    color: "#211F1B",
    fontFamily: "Georgia",
  },
  heroArtWrap: {
    position: "absolute",
    top: 88,
    left: "50%",
    marginLeft: -180,
    width: 360,
    height: 360,
    opacity: 0.94,
  },
  glucoseWrap: {
    position: "absolute",
    top: 312,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 8,
  },
  glucoseNumber: {
    fontFamily: "Georgia",
    fontSize: 62,
    lineHeight: 68,
    color: "#211F1B",
    letterSpacing: -1.8,
  },
  glucoseUnit: {
    marginTop: -4,
    fontSize: 21,
    color: "#D9571F",
    fontWeight: "800",
  },
  glucoseState: {
    marginTop: 6,
    fontSize: 18,
    color: "#80786F",
    fontWeight: "700",
  },
  heroMessage: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 22,
    minHeight: 78,
    borderRadius: 24,
    backgroundColor: "rgba(239,231,220,0.74)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  messageText: {
    fontSize: 18,
    lineHeight: 25,
    color: "#211F1B",
  },
  messageSubtext: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 22,
    color: "#6E655B",
    fontWeight: "600",
  },
  leafBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E8DCCB",
    alignItems: "center",
    justifyContent: "center",
  },
  leafText: {
    fontSize: 28,
    color: "#80786F",
  },
  heroCardEyebrow: {
    fontFamily: "Georgia",
    color: "#211F1B",
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.65,
    fontWeight: "300",
    marginLeft: 8,
  },

 heroCardSubtext: {
    marginTop: 6,
    marginLeft: 8,
    color: "#625B53",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },

 heroPortraitBloomWrap: {
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
  },

 heroPortraitMessageWrap: {
    marginTop: 12,
    marginHorizontal: 18,
    alignItems: "center",
    opacity: 0.88,
  },

 heroPortraitCaption: {
    fontFamily: "Georgia",
    textAlign: "center",
    color: "#211F1B",
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    fontWeight: "300",
  },

 heroPortraitRule: {
    marginTop: 16,
    width: 56,
    height: 1,
    backgroundColor: "rgba(140,129,117,0.28)",
  },

 heroPortraitPhilosophy: {
    marginTop: 16,
    textAlign: "center",
    color: "#8C8175",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

sectionHeader: {
    marginTop: 34,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: "Georgia",
    fontSize: 34,
    color: "#211F1B",
    letterSpacing: -0.8,
  },
  seeAll: {
    fontSize: 19,
    color: "#D9571F",
    fontWeight: "800",
    marginBottom: 4,
  },
  list: {
    gap: 12,
  },
  discoveryCard: {
    minHeight: 112,
    borderRadius: 28,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "rgba(33,31,27,0.055)",
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  miniBloom: {
    width: 78,
    height: 78,
    marginRight: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  discoveryCopy: {
    flex: 1,
  },
  discoveryTitle: {
    fontFamily: "Georgia",
    fontSize: 24,
    lineHeight: 30,
    color: "#211F1B",
    letterSpacing: -0.35,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  discoverySignal: {
    fontSize: 16,
    color: "#D9571F",
    fontWeight: "800",
  },
  emergingSignal: {
    color: "#6B4FA0",
  },
  metaDot: {
    marginHorizontal: 8,
    color: "#B9B0A5",
    fontSize: 16,
  },
  discoverySeen: {
    fontSize: 16,
    color: "#80786F",
    fontWeight: "700",
  },
  arrow: {
    fontSize: 38,
    color: "#A49B91",
    marginLeft: 10,
    marginTop: -4,
  },
  bottomNav: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 18,
    height: 78,
    borderRadius: 999,
    backgroundColor: "rgba(255,253,248,0.96)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#211F1B",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  navItem: {
    flex: 1,
    alignItems: "center",
  },
  navIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#80786F",
    transform: [{ rotate: "45deg" }],
    opacity: 0.8,
  },
  navIconActive: {
    borderColor: "#D9571F",
  },
  navLabel: {
    marginTop: 7,
    fontSize: 14,
    color: "#80786F",
    fontWeight: "700",
  },
  navLabelActive: {
    color: "#D9571F",
  },
  navDot: {
    marginTop: 5,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#D9571F",
  },
});
