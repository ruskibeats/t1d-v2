import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Stop } from "react-native-svg";

const colors = {
  ink: "#0D141B",
  ink2: "#121B24",
  paper: "#F5F0E8",
  paper2: "#E8DED2",
  bone: "#D8C9B6",
  ivory: "#F8F2E8",
  indigo: "#172A3A",
  blue: "#29475B",
  sage: "#68745D",
  moss: "#84906C",
  clay: "#B65A48",
  beni: "#C94D3F",
  gold: "#C9AA6B",
  muted: "#A99D91",
  white: "#FFFFFF",
};

const rhythmEvents = [
  { time: "6:30", label: "Wake up", glucose: 105, type: "wake" },
  { time: "8:00", label: "Breakfast", glucose: 140, type: "meal" },
  { time: "10:30", label: "Walk", glucose: 110, type: "walk" },
  { time: "13:00", label: "Lunch", glucose: 124, type: "meal" },
  { time: "16:45", label: "Focus", glucose: 116, type: "focus" },
  { time: "19:30", label: "Dinner", glucose: 135, type: "meal" },
  { time: "23:15", label: "Sleep", glucose: 104, type: "sleep" },
];

const botMessages = [
  {
    from: "sato",
    text: "I noticed your evenings become steadier when you walk after dinner.",
  },
  {
    from: "user",
    text: "How much does it help?",
  },
  {
    from: "sato",
    text: "On four of the last seven days, a short walk lowered your overnight variability by about 18%.",
  },
];

type ScreenName =
  | "Home"
  | "Reveal"
  | "Rhythm"
  | "Meals"
  | "Insights"
  | "Watch"
  | "LongTerm"
  | "Moments"
  | "Gardener"
  | "YearReview"
  | "Bot";

type Navigate = (screen: ScreenName) => void;
type Mood = "steady" | "high" | "low";

type Message = {
  from: string;
  text: string;
};

function SatoPortrait({ size = 280, mood = "steady", reveal = false }: { size?: number; mood?: Mood; reveal?: boolean }) {
  const warm = mood === "high";
  const cool = mood === "low";
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300">
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse
        cx="145"
        cy="135"
        rx="70"
        ry="108"
        fill={colors.bone}
        opacity="0.82"
        transform="rotate(-12 145 135)"
      />
      <Ellipse
        cx="185"
        cy="135"
        rx="62"
        ry="112"
        fill={cool ? colors.blue : colors.indigo}
        opacity="0.78"
        transform="rotate(18 185 135)"
      />
      <Ellipse
        cx="125"
        cy="164"
        rx="86"
        ry="56"
        fill={colors.moss}
        opacity="0.42"
        transform="rotate(-28 125 164)"
      />
      <Ellipse
        cx="190"
        cy="80"
        rx="50"
        ry="66"
        fill={warm ? colors.beni : colors.clay}
        opacity="0.56"
        transform="rotate(-22 190 80)"
      />
      <Ellipse
        cx="170"
        cy="205"
        rx="55"
        ry="78"
        fill={colors.blue}
        opacity="0.34"
        transform="rotate(32 170 205)"
      />
      <Circle cx="225" cy="62" r="18" fill={colors.beni} opacity="0.9" />
      <G opacity={reveal ? 0.18 : 0.95}>
        <Path
          d="M132 108 C124 116 121 136 126 153 C131 171 124 188 112 194"
          stroke="#161616"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <Line
          x1="92"
          y1="128"
          x2="124"
          y2="128"
          stroke="#111"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Line
          x1="172"
          y1="128"
          x2="205"
          y2="128"
          stroke="#F7F2EA"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Path
          d="M124 203 C139 211 156 211 171 202"
          stroke="#101010"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </G>
      {reveal && (
        <>
          <Circle cx="150" cy="150" r="82" fill="url(#glow)" />
          {[20, 34, 48, 62, 76].map((r) => (
            <Circle
              key={r}
              cx="150"
              cy="150"
              r={r}
              stroke="#ffffff"
              strokeWidth="1.2"
              opacity={0.22}
              fill="none"
            />
          ))}
        </>
      )}
    </Svg>
  );
}

function Screen({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <LinearGradient
      colors={light ? [colors.paper, colors.ivory] : [colors.ink, colors.ink2]}
      style={styles.fill}
    >
      <SafeAreaView style={styles.fill}>
        <View style={styles.inner}>{children}</View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Header({ title = "Sato", back, onBack, light = false }: { title?: string; back?: boolean; onBack?: () => void; light?: boolean }) {
  return (
    <View style={styles.headerRow}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={[styles.headerIcon, light && styles.dark]}>{back ? "‹" : title}</Text>
      </Pressable>
      <Text style={[styles.headerMark, light && styles.dark]}>調和</Text>
    </View>
  );
}

function HomeScreen({ navigate }: { navigate: Navigate }) {
  const reveal = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigate("Reveal");
  };
  return (
    <Screen>
      <Header />
      <View style={styles.center}>
        <Pressable onPress={reveal}>
          <SatoPortrait size={310} />
        </Pressable>
        <Text style={styles.homeNumber}>108</Text>
        <Text style={styles.homeUnit}>mg/dL</Text>
        <Text style={styles.homeCaption}>quiet morning</Text>
      </View>
      <View style={styles.navGrid}>
        {[
          ["Rhythm", "Rhythm"],
          ["Meals", "Meals"],
          ["Insights", "Insights"],
          ["Bot", "Bot"],
          ["Watch", "Watch"],
          ["Long term", "LongTerm"],
          ["Moments", "Moments"],
          ["Gardener", "Gardener"],
          ["Year", "YearReview"],
        ].map(([label, route]) => (
          <Pressable key={route} onPress={() => navigate(route as ScreenName)} style={styles.navPill}>
            <Text style={styles.navText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function RevealScreen({ goBack }: { goBack: () => void }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);
  return (
    <Screen>
      <Pressable style={styles.close} onPress={goBack}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ scale }], opacity }}>
          <SatoPortrait size={330} reveal />
        </Animated.View>
        <View style={styles.overlay}>
          <Text style={styles.revealNumber}>108</Text>
          <Text style={styles.revealUnit}>mg/dL</Text>
        </View>
      </View>
    </Screen>
  );
}

function RhythmScreen({ goBack }: { goBack: () => void }) {
  return (
    <Screen>
      <Header back onBack={goBack} />
      <Text style={styles.pageTitle}>Today</Text>
      <Text style={styles.subtitle}>A day told by moments.</Text>
      <ScrollView contentContainerStyle={styles.timeline}>
        <Svg height={620} width={80} style={StyleSheet.absoluteFill}>
          <Line x1="38" y1="20" x2="38" y2="580" stroke={colors.bone} opacity="0.25" />
          {rhythmEvents.map((_, i) => (
            <Circle
              key={i}
              cx="38"
              cy={50 + i * 80}
              r={i % 2 === 0 ? 9 : 14}
              fill={[colors.bone, colors.clay, colors.moss, colors.blue][i % 4]}
              opacity="0.9"
            />
          ))}
        </Svg>
        {rhythmEvents.map((item) => (
          <View key={item.time} style={styles.event}>
            <Text style={styles.time}>{item.time}</Text>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.glucose}>{item.glucose} mg/dL</Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

function MealsScreen({ goBack }: { goBack: () => void }) {
  return (
    <Screen>
      <Header back onBack={goBack} />
      <Text style={styles.pageTitle}>Meals</Text>
      <Text style={styles.subtitle}>Every choice leaves a trace.</Text>
      <View style={styles.art}>
        <Svg width="100%" height="360" viewBox="0 0 300 360">
          <Line x1="150" y1="20" x2="150" y2="330" stroke={colors.bone} opacity="0.22" />
          <Circle cx="150" cy="80" r="42" fill={colors.gold} opacity="0.45" />
          <Circle cx="150" cy="180" r="76" fill={colors.moss} opacity="0.45" />
          <Circle cx="150" cy="270" r="55" fill={colors.clay} opacity="0.55" />
          <Circle cx="150" cy="80" r="3" fill={colors.ivory} />
          <Circle cx="150" cy="180" r="3" fill={colors.ivory} />
          <Circle cx="150" cy="270" r="3" fill={colors.ivory} />
        </Svg>
      </View>
      <View style={styles.mealRow}>
        <Text style={styles.meal}>Breakfast</Text>
        <Text style={styles.value}>8:00</Text>
      </View>
      <View style={styles.mealRow}>
        <Text style={styles.meal}>Lunch</Text>
        <Text style={styles.value}>13:00</Text>
      </View>
      <View style={styles.mealRow}>
        <Text style={styles.meal}>Dinner</Text>
        <Text style={styles.value}>19:30</Text>
      </View>
    </Screen>
  );
}

function InsightsScreen({ goBack }: { goBack: () => void }) {
  return (
    <Screen light>
      <Header back light onBack={goBack} />
      <View style={styles.center}>
        <SatoPortrait size={240} mood="high" />
        <Text style={styles.kicker}>This week</Text>
        <Text style={styles.percent}>83%</Text>
        <Text style={styles.insightsBody}>of your time in range.</Text>
        <Text style={styles.insight}>Evening walks helped restore your balance.</Text>
      </View>
    </Screen>
  );
}

function WatchScreen({ goBack }: { goBack: () => void }) {
  return (
    <Screen>
      <Header back onBack={goBack} />
      <View style={styles.center}>
        <View style={styles.watch}>
          <View style={styles.watchTop}>
            <Text style={styles.watchText}>Sato</Text>
            <Text style={styles.watchText}>10:09</Text>
          </View>
          <SatoPortrait size={170} />
          <Text style={styles.watchNumber}>108</Text>
          <Text style={styles.watchUnit}>steady</Text>
        </View>
      </View>
    </Screen>
  );
}

function LongTermScreen({ goBack }: { goBack: () => void }) {
  return (
    <Screen>
      <Header back onBack={goBack} />
      <Text style={styles.pageTitle}>2024</Text>
      <Text style={styles.subtitle}>Zoom out. See the seasons.</Text>
      <View style={styles.seasonGrid}>
        {(["steady", "low", "steady", "high"] as Mood[]).map((mood, i) => (
          <View key={i} style={styles.season}>
            <SatoPortrait size={135} mood={mood} />
            <Text style={styles.month}>{["Spring", "Summer", "Autumn", "Winter"][i]}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function MomentsScreen({ goBack }: { goBack: () => void }) {
  return (
    <Screen light>
      <Header back light onBack={goBack} />
      <View style={styles.center}>
        <SatoPortrait size={220} />
        <Text style={styles.date}>Apr 12</Text>
        <Text style={styles.place}>Tokyo</Text>
        <Text style={styles.momentCopy}>You walked 23,104 steps. Your body stayed remarkably calm.</Text>
      </View>
    </Screen>
  );
}

function GardenerScreen({ goBack }: { goBack: () => void }) {
  return (
    <Screen>
      <Header back onBack={goBack} />
      <View style={styles.gardenerCenter}>
        <Text style={styles.gardenerTitle}>The gardener noticed</Text>
        <Text style={styles.gardenerCopy}>Stress has been rising on busy afternoons.</Text>
        <Text style={styles.gardenerCopy}>Small pauses bring the water back to stillness.</Text>
        <View style={styles.dot} />
      </View>
    </Screen>
  );
}

function YearReviewScreen({ goBack }: { goBack: () => void }) {
  return (
    <Screen>
      <Header back onBack={goBack} />
      <View style={styles.center}>
        <Text style={styles.year}>2024</Text>
        <SatoPortrait size={270} />
        <Text style={styles.yearCopy}>You found balance more often.</Text>
        <Text style={styles.yearCopySmall}>And that is everything.</Text>
      </View>
    </Screen>
  );
}

function BotScreen({ goBack }: { goBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>(botMessages);
  const [input, setInput] = useState("");
  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { from: "user", text: input },
      {
        from: "sato",
        text: "I’ll keep watching that pattern quietly. Your evening rhythm is becoming clearer.",
      },
    ]);
    setInput("");
  };
  return (
    <Screen>
      <Header back onBack={goBack} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.botFlex}>
        <Text style={styles.botTitle}>Little Weaver</Text>
        <Text style={styles.botSubtitle}>Patterns, not noise.</Text>
        <FlatList
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.botList}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.from === "user" ? styles.userBubble : styles.satoBubble]}>
              <Text style={styles.bubbleText}>{item.text}</Text>
            </View>
          )}
        />
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Sato quietly..."
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Pressable onPress={send} style={styles.send}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

export default function SatoLuxePage() {
  const [screen, setScreen] = useState<ScreenName>("Home");
  const goHome = () => setScreen("Home");

  if (screen === "Reveal") return <RevealScreen goBack={goHome} />;
  if (screen === "Rhythm") return <RhythmScreen goBack={goHome} />;
  if (screen === "Meals") return <MealsScreen goBack={goHome} />;
  if (screen === "Insights") return <InsightsScreen goBack={goHome} />;
  if (screen === "Watch") return <WatchScreen goBack={goHome} />;
  if (screen === "LongTerm") return <LongTermScreen goBack={goHome} />;
  if (screen === "Moments") return <MomentsScreen goBack={goHome} />;
  if (screen === "Gardener") return <GardenerScreen goBack={goHome} />;
  if (screen === "YearReview") return <YearReviewScreen goBack={goHome} />;
  if (screen === "Bot") return <BotScreen goBack={goHome} />;

  return <HomeScreen navigate={setScreen} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  headerRow: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIcon: {
    color: colors.ivory,
    fontSize: 23,
    fontWeight: "300",
  },
  headerMark: {
    color: colors.muted,
    fontSize: 16,
    letterSpacing: 4,
  },
  dark: {
    color: colors.ink,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  homeNumber: {
    color: colors.ivory,
    fontSize: 68,
    fontWeight: "200",
    marginTop: 8,
  },
  homeUnit: {
    color: colors.paper2,
    fontSize: 15,
    marginTop: -6,
  },
  homeCaption: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 12,
  },
  navGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    paddingBottom: 30,
  },
  navPill: {
    borderWidth: 1,
    borderColor: "rgba(216,201,182,0.24)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  navText: {
    color: colors.bone,
    fontSize: 13,
  },
  close: {
    alignSelf: "flex-end",
    padding: 12,
  },
  closeText: {
    color: colors.ivory,
    fontSize: 28,
    fontWeight: "200",
  },
  overlay: {
    position: "absolute",
    alignItems: "center",
  },
  revealNumber: {
    fontSize: 58,
    color: colors.ivory,
    fontWeight: "200",
  },
  revealUnit: {
    color: colors.paper2,
    marginTop: -4,
  },
  pageTitle: {
    color: colors.ivory,
    fontSize: 44,
    marginTop: 20,
    fontWeight: "300",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 4,
    marginBottom: 30,
  },
  timeline: {
    paddingLeft: 78,
    paddingBottom: 80,
  },
  event: {
    height: 80,
    justifyContent: "center",
  },
  time: {
    color: colors.muted,
    fontSize: 13,
  },
  label: {
    color: colors.ivory,
    fontSize: 20,
    marginTop: 3,
  },
  glucose: {
    color: colors.bone,
    fontSize: 13,
    marginTop: 3,
  },
  art: {
    marginTop: 36,
    alignItems: "center",
  },
  mealRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meal: {
    color: colors.ivory,
    fontSize: 18,
  },
  value: {
    color: colors.muted,
    fontSize: 16,
  },
  kicker: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 30,
  },
  percent: {
    color: colors.ink,
    fontSize: 82,
    fontWeight: "200",
    marginTop: 8,
  },
  insightsBody: {
    color: colors.ink,
    fontSize: 18,
  },
  insight: {
    color: colors.ink,
    fontSize: 23,
    lineHeight: 34,
    textAlign: "center",
    marginTop: 50,
    paddingHorizontal: 20,
  },
  watch: {
    width: 230,
    height: 290,
    borderRadius: 48,
    backgroundColor: "#05080B",
    borderWidth: 2,
    borderColor: "#2A2E33",
    alignItems: "center",
    padding: 18,
  },
  watchTop: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  watchText: { color: colors.ivory, fontSize: 13 },
  watchNumber: {
    color: colors.ivory,
    fontSize: 42,
    fontWeight: "200",
    marginTop: -12,
  },
  watchUnit: {
    color: colors.bone,
    fontSize: 13,
  },
  seasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 48,
    justifyContent: "space-between",
  },
  season: {
    width: "48%",
    height: 190,
    alignItems: "center",
    justifyContent: "center",
  },
  month: {
    color: colors.bone,
    marginTop: -12,
  },
  date: { color: colors.muted, marginTop: 30 },
  place: { color: colors.ink, fontSize: 30, marginTop: 6 },
  momentCopy: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center",
    marginTop: 28,
    paddingHorizontal: 24,
  },
  gardenerCenter: { flex: 1, justifyContent: "center" },
  gardenerTitle: {
    color: colors.bone,
    fontSize: 27,
    lineHeight: 38,
    fontWeight: "300",
  },
  gardenerCopy: {
    color: colors.ivory,
    fontSize: 19,
    lineHeight: 31,
    marginTop: 28,
    maxWidth: 300,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.clay,
    marginTop: 40,
  },
  year: { color: colors.muted, fontSize: 16, marginBottom: 20 },
  yearCopy: {
    color: colors.ivory,
    fontSize: 25,
    textAlign: "center",
    marginTop: 20,
  },
  yearCopySmall: {
    color: colors.bone,
    fontSize: 16,
    marginTop: 12,
  },
  botFlex: { flex: 1 },
  botTitle: {
    color: colors.ivory,
    fontSize: 38,
    fontWeight: "300",
    marginTop: 20,
  },
  botSubtitle: {
    color: colors.muted,
    marginTop: 4,
  },
  botList: {
    paddingVertical: 30,
  },
  bubble: {
    maxWidth: "82%",
    padding: 16,
    borderRadius: 22,
    marginBottom: 14,
  },
  satoBubble: {
    backgroundColor: "rgba(255,255,255,0.08)",
    alignSelf: "flex-start",
  },
  userBubble: {
    backgroundColor: colors.clay,
    alignSelf: "flex-end",
  },
  bubbleText: {
    color: colors.ivory,
    fontSize: 16,
    lineHeight: 23,
  },
  inputRow: {
    flexDirection: "row",
    paddingBottom: 18,
    gap: 10,
  },
  input: {
    flex: 1,
    height: 52,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 18,
    color: colors.ivory,
  },
  send: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 28,
    backgroundColor: colors.bone,
    justifyContent: "center",
  },
  sendText: {
    color: colors.ink,
    fontWeight: "600",
  },
});
