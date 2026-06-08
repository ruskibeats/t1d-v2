import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import Svg, {
  Circle,
  Ellipse,
  Path,
  Line,
} from "react-native-svg";
import { Ionicons, Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const C = {
  paper: "#F7F1E8",
  card: "#FBF7EF",
  ink: "#111820",
  muted: "#6C6A63",
  line: "#E3D9CC",
  indigo: "#102B3C",
  blue: "#A9B7BE",
  moss: "#7A8455",
  sand: "#D9C9AD",
  clay: "#C95532",
  peach: "#E6B092",
  shadow: "#000",
};

type ScreenName = "home" | "log" | "result" | "timeline" | "impact" | "month";
type SetScreen = (screen: ScreenName) => void;
type PortraitVariant = "calm" | "warm" | "meal" | "night" | "stress";
type MealType = "matcha" | "oatmeal" | "salad" | "yogurt" | "salmon";

function PortraitMark({ size = 230, variant = "calm", mini = false }: { size?: number; variant?: PortraitVariant; mini?: boolean }) {
  const red = variant === "warm" || variant === "meal";
  const dark = variant === "night";
  const stress = variant === "stress";
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Ellipse cx="98" cy="92" rx="58" ry="82" fill={C.sand} opacity="0.42" />
      <Ellipse cx="142" cy="94" rx="55" ry="76" fill={C.blue} opacity="0.36" />
      <Ellipse cx="104" cy="145" rx="72" ry="55" fill={C.moss} opacity="0.36" />
      <Ellipse cx="150" cy="132" rx="54" ry="78" fill={C.indigo} opacity="0.82" />
      <Ellipse
        cx={red ? "168" : "82"}
        cy={red ? "82" : "72"}
        rx="44"
        ry="56"
        fill={red ? C.clay : C.blue}
        opacity={red ? "0.55" : "0.28"}
      />
      <Ellipse
        cx="110"
        cy="118"
        rx="78"
        ry="92"
        fill={dark ? "#071018" : "#EFE7DA"}
        opacity={dark ? "0.18" : "0.24"}
      />
      {!mini && (
        <>
          <Line x1="116" y1="86" x2="116" y2="148" stroke={C.ink} strokeWidth="1.2" opacity="0.65" />
          <Line x1="116" y1="148" x2="128" y2="148" stroke={C.ink} strokeWidth="1.2" opacity="0.65" />
          <Ellipse cx="88" cy="108" rx="16" ry="4" fill={C.ink} opacity="0.85" />
          <Ellipse cx="158" cy="108" rx="16" ry="4" fill={C.paper} opacity="0.95" />
          <Line x1="102" y1="174" x2="130" y2="174" stroke={C.ink} strokeWidth="1.4" opacity="0.55" />
        </>
      )}
      <Circle cx="194" cy="54" r={mini ? "9" : "14"} fill={stress ? C.indigo : C.clay} opacity="0.95" />
      <Circle cx="54" cy="181" r={mini ? "5" : "9"} fill={C.indigo} opacity="0.95" />
      <Circle cx="178" cy="162" r={mini ? "8" : "18"} fill="none" stroke={C.clay} strokeWidth="2" opacity="0.75" />
      {stress && <Circle cx="128" cy="58" r="34" fill={C.clay} opacity="0.35" />}
    </Svg>
  );
}

function AbstractMealMark({ type = "salad", size = 92, selected = false }: { type?: MealType; size?: number; selected?: boolean }) {
  const palettes: Record<MealType, string[]> = {
    matcha: [C.moss, C.sand, C.blue, C.indigo],
    oatmeal: ["#E4C382", "#F0DFC1", C.sand, C.clay],
    salad: [C.moss, C.indigo, C.blue, C.sand],
    yogurt: ["#C7C1D6", C.blue, C.indigo, "#EDE7DC"],
    salmon: [C.clay, C.peach, C.sand, C.indigo],
  };
  const p = palettes[type] || palettes.salad;
  return (
    <View style={[styles.mealMarkWrap, selected && styles.selectedMark]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="38" cy="42" r="28" fill={p[0]} opacity="0.45" />
        <Circle cx="60" cy="38" r="31" fill={p[1]} opacity="0.4" />
        <Circle cx="55" cy="62" r="24" fill={p[2]} opacity="0.55" />
        <Circle cx="72" cy="25" r="10" fill={p[3]} opacity="0.95" />
        <Circle cx="25" cy="75" r="5" fill={C.indigo} opacity="0.95" />
      </Svg>
    </View>
  );
}

function GlucoseCurve({ color = C.clay }: { color?: string }) {
  return (
    <Svg height="90" width="100%" viewBox="0 0 320 90">
      <Path
        d="M0 72 C40 68 52 54 80 55 C116 56 118 22 160 28 C196 33 190 62 228 55 C260 50 276 65 320 58 L320 90 L0 90 Z"
        fill={color}
        opacity="0.14"
      />
      <Path
        d="M0 72 C40 68 52 54 80 55 C116 56 118 22 160 28 C196 33 190 62 228 55 C260 50 276 65 320 58"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <Line x1="178" y1="18" x2="178" y2="82" stroke={C.ink} strokeWidth="1" opacity="0.45" />
      <Circle cx="178" cy="28" r="4" fill={C.ink} />
    </Svg>
  );
}

function Header({ title = "Sato", back = false, right = true }: { title?: string; back?: boolean; right?: boolean }) {
  return (
    <View style={styles.header}>
      {back ? <Ionicons name="chevron-back" size={24} color={C.ink} /> : <Text style={styles.logo}>{title}</Text>}
      {right && <Feather name="sliders" size={21} color={C.ink} />}
    </View>
  );
}

function Home({ setScreen }: { setScreen: SetScreen }) {
  return (
    <SafeAreaView style={styles.screen}>
      <Header />
      <View style={styles.center}>
        <PortraitMark size={265} variant="calm" />
        <Text style={styles.sectionTitle}>Today</Text>
        <Text style={styles.caption}>How are you feeling?</Text>
      </View>
      <Pressable style={styles.floatingCamera} onPress={() => setScreen("log")}>
        <Ionicons name="camera-outline" size={23} color={C.paper} />
      </Pressable>
      <Pressable style={styles.downButton} onPress={() => setScreen("timeline")}>
        <Ionicons name="chevron-down" size={18} color={C.ink} />
      </Pressable>
    </SafeAreaView>
  );
}

function LogMeal({ setScreen }: { setScreen: SetScreen }) {
  return (
    <SafeAreaView style={styles.screen}>
      <Header back right={false} />
      <View style={styles.center}>
        <Text style={styles.bigQuestion}>What are you{"\n"}about to enjoy?</Text>
        <View style={styles.ghostCircle}>
          <Pressable style={styles.cameraButton} onPress={() => setScreen("result")}>
            <Ionicons name="camera-outline" size={34} color={C.paper} />
          </Pressable>
        </View>
      </View>
      <BottomNav active="Portrait" />
    </SafeAreaView>
  );
}

function MealResult({ setScreen }: { setScreen: SetScreen }) {
  return (
    <SafeAreaView style={styles.screen}>
      <Header back right={false} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&auto=format&fit=crop",
          }}
          style={styles.foodImage}
        />
        <View style={styles.content}>
          <Text style={styles.h1}>Chicken Salad</Text>
          <Text style={styles.caption}>1:14 PM · Today</Text>
          <View style={styles.softCard}>
            <Text style={styles.micro}>Estimated impact</Text>
            <Text style={styles.impact}>+18 <Text style={styles.unit}>mg/dL</Text></Text>
            <Text style={styles.caption}>Peak predicted at 2:10 PM</Text>
            <GlucoseCurve />
          </View>
          <View style={styles.insightMini}>
            <View>
              <Text style={styles.cardTitle}>Looks balanced</Text>
              <Text style={styles.caption}>Good mix of protein, fiber{"\n"}and healthy fats.</Text>
            </View>
            <View style={styles.leaf}>
              <Ionicons name="leaf-outline" size={24} color={C.moss} />
            </View>
          </View>
          <Pressable style={styles.primary} onPress={() => setScreen("timeline")}>
            <Text style={styles.primaryText}>Add to my day</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Timeline({ setScreen }: { setScreen: SetScreen }) {
  const items: Array<[string, string, MealType]> = [
    ["7:45 AM", "Matcha Latte", "matcha"],
    ["9:02 AM", "Oatmeal", "oatmeal"],
    ["1:14 PM", "Chicken Salad", "salad"],
    ["4:35 PM", "Greek Yogurt", "yogurt"],
    ["7:18 PM", "Salmon & Veggies", "salmon"],
  ];
  return (
    <SafeAreaView style={styles.screen}>
      <Header />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.h1}>Your day, as it happens.</Text>
          <Text style={styles.caption}>Each moment becomes part of your portrait.</Text>
          <View style={styles.horizontalTimeline}>
            {items.map(([time, name, type], i) => (
              <Pressable key={name} style={styles.timelineItem} onPress={() => setScreen("impact")}>
                <AbstractMealMark type={type} selected={i === 2} />
                <Text style={styles.time}>{time}</Text>
                <Text style={styles.mealName}>{name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.sun}>☼</Text>
            <Text style={styles.h1}>Lunch <Text style={{ color: C.clay }}>lingered longer</Text>{"\n"}than expected.</Text>
            <Text style={styles.caption}>Your glucose stayed elevated into the afternoon.</Text>
            <PortraitMark size={170} variant="stress" mini />
          </View>
          <Pressable style={styles.primary} onPress={() => setScreen("month")}>
            <Text style={styles.primaryText}>View your portraits</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MealImpact({ setScreen }: { setScreen: SetScreen }) {
  return (
    <SafeAreaView style={styles.screen}>
      <Header title="Meal impact" back right={false} />
      <View style={styles.content}>
        <View style={styles.centerSmall}>
          <AbstractMealMark type="salad" size={220} />
        </View>
        <View style={styles.softCard}>
          <Text style={styles.cardTitle}>Glucose response</Text>
          <Text style={styles.impact}>+18 <Text style={styles.unit}>mg/dL</Text></Text>
          <Text style={styles.caption}>Peak at 2:10 PM</Text>
          <GlucoseCurve />
        </View>
        <Pressable style={styles.secondary} onPress={() => setScreen("timeline")}>
          <Text style={styles.secondaryText}>What influenced this?</Text>
          <Ionicons name="chevron-forward" size={18} color={C.ink} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function MonthPortraits({ setScreen }: { setScreen: SetScreen }) {
  const variants: PortraitVariant[] = ["calm", "warm", "night", "meal", "stress"];
  return (
    <SafeAreaView style={styles.screen}>
      <Header title="Your portraits" back right={false} />
      <View style={styles.content}>
        <Text style={styles.caption}>This month</Text>
        <View style={styles.calendar}>
          {Array.from({ length: 30 }).map((_, i) => (
            <View key={i} style={styles.dayCell}>
              <PortraitMark size={48} mini variant={variants[i % variants.length]} />
              <Text style={styles.dayNum}>{i + 1}</Text>
            </View>
          ))}
        </View>
        <Pressable style={styles.primary} onPress={() => setScreen("home")}>
          <Text style={styles.primaryText}>View insights</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function BottomNav({ active }: { active: string }) {
  const tabs = ["Portrait", "Timeline", "Insights", "You"];
  return (
    <View style={styles.bottomNav}>
      {tabs.map((t) => (
        <View key={t} style={styles.navItem}>
          <View style={[styles.navDot, active === t && { backgroundColor: C.indigo }]} />
          <Text style={styles.navText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export default function SatoPortraitPage() {
  const [screen, setScreen] = useState<ScreenName>("home");
  if (screen === "log") return <LogMeal setScreen={setScreen} />;
  if (screen === "result") return <MealResult setScreen={setScreen} />;
  if (screen === "timeline") return <Timeline setScreen={setScreen} />;
  if (screen === "impact") return <MealImpact setScreen={setScreen} />;
  if (screen === "month") return <MonthPortraits setScreen={setScreen} />;
  return <Home setScreen={setScreen} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.paper,
  },
  header: {
    height: 58,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontSize: 25,
    fontFamily: "Georgia",
    color: C.ink,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  centerSmall: {
    alignItems: "center",
    marginVertical: 22,
  },
  content: {
    padding: 22,
  },
  sectionTitle: {
    fontFamily: "Georgia",
    fontSize: 22,
    color: C.ink,
    marginTop: 18,
  },
  caption: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  h1: {
    fontFamily: "Georgia",
    fontSize: 27,
    lineHeight: 34,
    color: C.ink,
  },
  bigQuestion: {
    fontFamily: "Georgia",
    fontSize: 27,
    textAlign: "center",
    color: C.ink,
    lineHeight: 36,
    marginBottom: 40,
  },
  ghostCircle: {
    width: 245,
    height: 245,
    borderRadius: 140,
    backgroundColor: "rgba(217,201,173,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraButton: {
    width: 86,
    height: 86,
    borderRadius: 44,
    backgroundColor: C.indigo,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingCamera: {
    position: "absolute",
    bottom: 38,
    left: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.indigo,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  downButton: {
    position: "absolute",
    bottom: 42,
    alignSelf: "center",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEE7DC",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNav: {
    height: 76,
    borderTopWidth: 1,
    borderTopColor: C.line,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    alignItems: "center",
    gap: 6,
  },
  navDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CFC6BA",
  },
  navText: {
    fontSize: 11,
    color: C.muted,
  },
  foodImage: {
    width: "100%",
    height: 260,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  softCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.line,
    padding: 18,
    marginTop: 18,
    shadowColor: C.shadow,
    shadowOpacity: 0.045,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  micro: {
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontSize: 10,
    color: C.muted,
    marginBottom: 8,
  },
  impact: {
    fontFamily: "Georgia",
    fontSize: 38,
    color: C.ink,
    marginTop: 6,
  },
  unit: {
    fontFamily: "System",
    fontSize: 16,
    color: C.muted,
  },
  cardTitle: {
    fontSize: 16,
    color: C.ink,
    fontWeight: "600",
  },
  insightMini: {
    marginTop: 14,
    backgroundColor: "#EFE7DA",
    borderRadius: 22,
    padding: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leaf: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#D7D6BF",
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    marginTop: 22,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.indigo,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: C.paper,
    fontWeight: "600",
    fontSize: 15,
  },
  secondary: {
    marginTop: 18,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EFE7DC",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  secondaryText: {
    color: C.ink,
    fontWeight: "500",
  },
  horizontalTimeline: {
    marginTop: 28,
    paddingVertical: 28,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  timelineItem: {
    alignItems: "center",
    width: (width - 52) / 5,
  },
  mealMarkWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  selectedMark: {
    borderWidth: 1,
    borderColor: C.ink,
    borderRadius: 60,
  },
  time: {
    fontSize: 11,
    color: C.muted,
    marginTop: 8,
  },
  mealName: {
    fontSize: 11,
    color: C.ink,
    textAlign: "center",
    marginTop: 3,
  },
  insightCard: {
    backgroundColor: C.card,
    borderRadius: 28,
    padding: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: C.line,
  },
  sun: {
    color: C.clay,
    fontSize: 26,
    marginBottom: 14,
  },
  calendar: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dayCell: {
    width: (width - 86) / 5,
    alignItems: "center",
    marginBottom: 12,
  },
  dayNum: {
    fontSize: 10,
    color: C.muted,
  },
});
