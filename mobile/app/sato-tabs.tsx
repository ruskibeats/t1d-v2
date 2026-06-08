import React, { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Ellipse, Line, Path } from "react-native-svg";
import { Bot, CalendarDays, Home, Send, SlidersHorizontal, Sparkles, Utensils, Watch } from "lucide-react-native";

const colors = {
  rice: "#F7F2EA",
  riceDeep: "#EFE7DA",
  sumi: "#211F1B",
  muted: "#8C8378",
  line: "rgba(33,31,27,0.12)",
  indigo: "#172B3A",
  indigoSoft: "#334B5F",
  moss: "#6F7E52",
  mossSoft: "#9AAA78",
  beni: "#C84A36",
  beniSoft: "#EFA28F",
  gold: "#C9A45D",
  cream: "#FFF9EF",
  night: "#101820",
};

const radius = {
  xl: 34,
  lg: 24,
  md: 18,
  sm: 12,
};

const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 14 },
  elevation: 8,
};

const todayMoments = [
  { time: "7:15", title: "Breakfast", tone: "warm" },
  { time: "10:42", title: "Walk", tone: "moss" },
  { time: "13:08", title: "Lunch", tone: "indigo" },
  { time: "16:30", title: "Focus", tone: "green" },
  { time: "19:15", title: "Dinner", tone: "red" },
  { time: "23:10", title: "Sleep", tone: "night" },
];

const botMessages = [
  {
    from: "sato",
    text: "Good evening. Your body found a steadier rhythm after your walk.",
  },
  {
    from: "user",
    text: "Why did lunch hit so hard today?",
  },
  {
    from: "sato",
    text: "Lunch rose faster than usual. Possible factors: shorter walk, higher carb density, and stress around 14:00.",
  },
  {
    from: "sato",
    text: "A softer adjustment tomorrow: walk 8 minutes after lunch, or reduce the fastest carbs first.",
  },
];

type Mood = "calm" | "warm" | "night" | "restless";
type TabName = "Portrait" | "Today" | "Meals" | "Insight" | "Week" | "Sato Bot" | "Watch";

type Message = {
  from: string;
  text: string;
};

function ScreenShell({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <SafeAreaView style={[styles.safe, dark && { backgroundColor: colors.night }]}>
      <View style={[styles.container, dark && { backgroundColor: colors.night }]}>{children}</View>
    </SafeAreaView>
  );
}

function MetricText({
  value = "108",
  label = "mg/dL",
  state = "Quiet morning",
}: {
  value?: string;
  label?: string;
  state?: string;
}) {
  return (
    <View style={styles.metricWrap}>
      <Text style={styles.metricState}>{state}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SatoPortrait({ size = 260, mood = "calm" }: { size?: number; mood?: Mood }) {
  const palette = {
    calm: {
      a: "#E8DDC8",
      b: "#AAB18B",
      c: "#173044",
      d: "#C84A36",
    },
    warm: {
      a: "#F1C6A7",
      b: "#D95D45",
      c: "#243647",
      d: "#B53A2F",
    },
    night: {
      a: "#D8D7CF",
      b: "#586E7F",
      c: "#132638",
      d: "#C84A36",
    },
    restless: {
      a: "#EEC1A7",
      b: "#C84A36",
      c: "#172B3A",
      d: "#D96A55",
    },
  }[mood];

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 300 300">
        <Ellipse cx="142" cy="124" rx="72" ry="104" fill={palette.a} opacity="0.72" />
        <Ellipse cx="178" cy="124" rx="74" ry="104" fill={palette.c} opacity="0.9" />
        <Ellipse cx="111" cy="150" rx="78" ry="102" fill={palette.b} opacity="0.42" />
        <Ellipse cx="177" cy="187" rx="58" ry="80" fill="#E8D4B8" opacity="0.38" />
        <Circle cx="218" cy="65" r="22" fill={palette.d} opacity="0.92" />
        <Circle cx="174" cy="170" r="11" fill="none" stroke={palette.d} strokeWidth="3" />
        <Path d="M130 110 L130 170 L113 170" stroke="#B75E24" strokeWidth="3" fill="none" />
        <Ellipse cx="104" cy="140" rx="18" ry="5" fill={colors.sumi} opacity="0.88" />
        <Ellipse cx="185" cy="140" rx="18" ry="5" fill="#FDF8EC" opacity="0.92" />
        <Ellipse cx="136" cy="215" rx="16" ry="6" fill="#6C2B1B" opacity="0.9" />
        <Line x1="72" y1="238" x2="225" y2="238" stroke="rgba(33,31,27,0.15)" />
      </Svg>
    </View>
  );
}

function HomeScreen({ setTab }: { setTab: (tab: TabName) => void }) {
  return (
    <ScreenShell>
      <View style={styles.header}>
        <Text style={styles.logo}>Sato</Text>
        <SlidersHorizontal size={22} color={colors.sumi} />
      </View>
      <View style={styles.center}>
        <SatoPortrait size={288} mood="calm" />
        <MetricText value="108" state="Quiet morning" />
      </View>
      <View style={styles.homeActions}>
        <Pressable style={styles.button} onPress={() => setTab("Today")}>
          <Text style={styles.buttonText}>Reveal rhythm</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => setTab("Watch")}>
          <Watch size={17} color={colors.sumi} />
          <Text style={styles.secondaryButtonText}>Watch companion</Text>
        </Pressable>
      </View>
      <Text style={styles.vertical}>調和</Text>
    </ScreenShell>
  );
}

function TodayScreen() {
  return (
    <ScreenShell>
      <Text style={styles.title}>Today</Text>
      <Text style={styles.subtitle}>Your day, told as moments.</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={styles.timeline}>
          {todayMoments.map((item, index) => (
            <View key={item.title} style={styles.row}>
              <View style={styles.left}>
                <Text style={styles.time}>{item.time}</Text>
                <View style={styles.dot} />
              </View>
              <View style={styles.card}>
                <SatoPortrait
                  size={82}
                  mood={item.tone === "red" ? "warm" : item.tone === "night" ? "night" : "calm"}
                />
                <View>
                  <Text style={styles.moment}>{item.title}</Text>
                  <Text style={styles.note}>
                    {index === 0
                      ? "A soft rise."
                      : index === 1
                        ? "Balance returned."
                        : index === 2
                          ? "A stronger curve."
                          : "Quiet pattern."}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function MealImpactScreen() {
  return (
    <ScreenShell>
      <Text style={styles.title}>Lunch</Text>
      <Text style={styles.subtitle}>Today, 13:08</Text>
      <View style={styles.art}>
        <SatoPortrait size={250} mood="night" />
      </View>
      <View style={styles.metricBox}>
        <Text style={styles.peak}>Peak 160 mg/dL</Text>
        <Text style={styles.metricTime}>at 14:42</Text>
        <Svg width="100%" height={120} viewBox="0 0 320 120">
          <Line x1="0" y1="88" x2="320" y2="88" stroke="rgba(33,31,27,0.14)" />
          <Path
            d="M0 88 C40 86 50 40 92 58 C134 76 134 104 176 70 C220 34 250 66 320 42"
            stroke={colors.beni}
            strokeWidth="3"
            fill="none"
          />
          <Circle cx="250" cy="66" r="5" fill={colors.beni} />
        </Svg>
        <Text style={styles.copy}>
          Lunch rose faster than usual. Possible factors include higher carb density, stress, and a shorter walk window.
        </Text>
      </View>
    </ScreenShell>
  );
}

function InsightScreen() {
  return (
    <ScreenShell>
      <Text style={styles.small}>Insight</Text>
      <View style={styles.insightHero}>
        <Text style={styles.statement}>
          Late dinners have been keeping your nights <Text style={{ color: colors.beni }}>restless.</Text>
        </Text>
        <Text style={styles.insightBody}>
          Consider eating a little earlier on busy days. Your body tends to settle faster when dinner lands before 7:00 PM.
        </Text>
        <View style={styles.landscape}>
          <Svg width="100%" height={160} viewBox="0 0 340 160">
            <Path
              d="M0 100 C50 70 90 120 140 82 C190 44 230 96 340 56"
              stroke={colors.indigoSoft}
              strokeWidth="2"
              fill="none"
              opacity="0.5"
            />
            <Path
              d="M0 122 C60 92 110 144 160 98 C220 44 260 122 340 88"
              stroke={colors.muted}
              strokeWidth="2"
              fill="none"
              opacity="0.35"
            />
            <Circle cx="274" cy="40" r="14" fill={colors.beni} />
          </Svg>
        </View>
      </View>
    </ScreenShell>
  );
}

function WeekScreen() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <ScreenShell>
      <Text style={styles.title}>This week</Text>
      <View style={styles.days}>
        {days.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.day}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.portrait}>
        <SatoPortrait size={300} mood="calm" />
      </View>
      <Text style={styles.percent}>84%</Text>
      <Text style={styles.weekLabel}>Time in range</Text>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>Your week held mostly steady. Tuesday and Friday carried the strongest meal impact.</Text>
      </View>
    </ScreenShell>
  );
}

function BotScreen() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>(botMessages);

  const send = () => {
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      { from: "user", text },
      { from: "sato", text: "I’ll keep watching that pattern quietly. Your rhythm is becoming clearer." },
    ]);
    setText("");
  };

  return (
    <ScreenShell dark>
      <Text style={styles.botLogo}>Sato</Text>
      <Text style={styles.botTitle}>The companion that notices quietly.</Text>
      <ScrollView style={styles.chat} showsVerticalScrollIndicator={false}>
        {messages.map((msg, index) => (
          <View key={index} style={[styles.bubble, msg.from === "user" ? styles.userBubble : styles.satoBubble]}>
            <Text style={[styles.bubbleText, msg.from === "user" && { color: colors.rice }]}>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.inputWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ask about your rhythm..."
          placeholderTextColor="rgba(247,242,234,0.42)"
          style={styles.input}
        />
        <Pressable style={styles.send} onPress={send}>
          <Send size={18} color={colors.rice} />
        </Pressable>
      </View>
    </ScreenShell>
  );
}

function WatchScreen() {
  return (
    <ScreenShell dark>
      <View style={styles.watchScreen}>
        <Text style={styles.watchTop}>Sato  10:09</Text>
        <SatoPortrait size={160} mood="night" />
        <Text style={styles.watchValue}>108</Text>
        <Text style={styles.watchState}>Steady</Text>
      </View>
    </ScreenShell>
  );
}

const tabs: Array<{ name: TabName; label: string; icon: React.ComponentType<{ size: number; color: string }> }> = [
  { name: "Portrait", label: "Portrait", icon: Home },
  { name: "Today", label: "Today", icon: CalendarDays },
  { name: "Meals", label: "Meals", icon: Utensils },
  { name: "Insight", label: "Insight", icon: Sparkles },
  { name: "Week", label: "Week", icon: CalendarDays },
  { name: "Sato Bot", label: "Bot", icon: Bot },
];

export default function SatoTabsPage() {
  const [tab, setTab] = useState<TabName>("Portrait");
  const dark = tab === "Sato Bot" || tab === "Watch";

  let content = <HomeScreen setTab={setTab} />;
  if (tab === "Today") content = <TodayScreen />;
  if (tab === "Meals") content = <MealImpactScreen />;
  if (tab === "Insight") content = <InsightScreen />;
  if (tab === "Week") content = <WeekScreen />;
  if (tab === "Sato Bot") content = <BotScreen />;
  if (tab === "Watch") content = <WatchScreen />;

  return (
    <View style={styles.page}>
      <View style={styles.contentHost}>{content}</View>
      {tab !== "Watch" ? (
        <View style={[styles.tabBar, dark && styles.tabBarDark]}>
          {tabs.map((item) => {
            const active = tab === item.name;
            const Icon = item.icon;
            const color = active ? (dark ? colors.rice : colors.sumi) : dark ? "rgba(247,242,234,0.42)" : colors.muted;
            return (
              <Pressable key={item.name} style={styles.tabItem} onPress={() => setTab(item.name)}>
                <Icon size={21} color={color} />
                <Text style={[styles.tabLabel, { color }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.rice,
  },
  contentHost: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.rice,
  },
  container: {
    flex: 1,
    backgroundColor: colors.rice,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  metricWrap: {
    alignItems: "center",
  },
  metricState: {
    color: colors.sumi,
    fontSize: 15,
    marginBottom: 10,
    opacity: 0.72,
  },
  metricValue: {
    color: colors.sumi,
    fontSize: 72,
    fontWeight: "200",
    letterSpacing: -2,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 14,
    marginTop: -6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontSize: 29,
    color: colors.sumi,
    fontWeight: "300",
    letterSpacing: -0.5,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
  },
  homeActions: {
    alignItems: "center",
    gap: 10,
    marginBottom: 108,
  },
  button: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 13,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  buttonText: {
    color: colors.sumi,
    fontSize: 14,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.sumi,
    fontSize: 13,
  },
  vertical: {
    position: "absolute",
    right: 28,
    top: 140,
    writingDirection: "ltr",
    fontSize: 22,
    color: colors.sumi,
    opacity: 0.34,
  },
  title: {
    fontSize: 34,
    color: colors.sumi,
    fontWeight: "300",
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 6,
    marginBottom: 28,
  },
  timeline: {
    gap: 18,
  },
  row: {
    flexDirection: "row",
    gap: 14,
  },
  left: {
    width: 58,
    alignItems: "center",
  },
  time: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.sumi,
  },
  card: {
    flex: 1,
    minHeight: 112,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.42)",
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 14,
  },
  moment: {
    fontSize: 18,
    color: colors.sumi,
  },
  note: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 5,
  },
  art: {
    alignItems: "center",
    marginTop: 38,
  },
  metricBox: {
    marginTop: 20,
    borderRadius: 34,
    padding: 24,
    backgroundColor: "rgba(255,255,255,0.42)",
    borderColor: colors.line,
    borderWidth: 1,
  },
  peak: {
    textAlign: "center",
    fontSize: 20,
    color: colors.sumi,
  },
  metricTime: {
    textAlign: "center",
    color: colors.muted,
    marginTop: 4,
    marginBottom: 8,
  },
  copy: {
    fontSize: 15,
    color: colors.sumi,
    lineHeight: 23,
    opacity: 0.75,
  },
  small: {
    fontSize: 15,
    color: colors.muted,
  },
  insightHero: {
    flex: 1,
    justifyContent: "center",
  },
  statement: {
    fontSize: 35,
    lineHeight: 45,
    color: colors.sumi,
    fontWeight: "300",
  },
  insightBody: {
    marginTop: 28,
    color: colors.sumi,
    opacity: 0.68,
    fontSize: 16,
    lineHeight: 25,
  },
  landscape: {
    marginTop: 44,
  },
  days: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 34,
  },
  day: {
    color: colors.muted,
    fontSize: 13,
  },
  portrait: {
    alignItems: "center",
    marginTop: 58,
  },
  percent: {
    textAlign: "center",
    fontSize: 68,
    color: colors.sumi,
    fontWeight: "200",
    marginTop: 32,
  },
  weekLabel: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 15,
  },
  summary: {
    marginTop: 44,
    borderRadius: 28,
    padding: 22,
    backgroundColor: "rgba(255,255,255,0.42)",
    borderWidth: 1,
    borderColor: colors.line,
  },
  summaryText: {
    color: colors.sumi,
    opacity: 0.72,
    fontSize: 15,
    lineHeight: 23,
  },
  botLogo: {
    fontSize: 28,
    color: colors.rice,
    fontWeight: "300",
  },
  botTitle: {
    marginTop: 12,
    color: "rgba(247,242,234,0.62)",
    fontSize: 16,
    lineHeight: 23,
    width: "80%",
  },
  chat: {
    flex: 1,
    marginTop: 30,
  },
  bubble: {
    maxWidth: "86%",
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 14,
  },
  satoBubble: {
    backgroundColor: "rgba(247,242,234,0.08)",
    borderWidth: 1,
    borderColor: "rgba(247,242,234,0.12)",
    alignSelf: "flex-start",
  },
  userBubble: {
    backgroundColor: colors.beni,
    alignSelf: "flex-end",
  },
  bubbleText: {
    color: "rgba(247,242,234,0.82)",
    fontSize: 15,
    lineHeight: 22,
  },
  inputWrap: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 18,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    paddingHorizontal: 20,
    backgroundColor: "rgba(247,242,234,0.08)",
    color: colors.rice,
    borderWidth: 1,
    borderColor: "rgba(247,242,234,0.12)",
  },
  send: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.beni,
    alignItems: "center",
    justifyContent: "center",
  },
  watchScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  watchTop: {
    color: colors.rice,
    opacity: 0.8,
    marginBottom: 30,
  },
  watchValue: {
    color: colors.rice,
    fontSize: 54,
    fontWeight: "200",
  },
  watchState: {
    color: colors.beniSoft,
    fontSize: 15,
  },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 86,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 4,
    backgroundColor: colors.rice,
    borderTopColor: "rgba(35,32,28,0.08)",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  tabBarDark: {
    backgroundColor: colors.night,
    borderTopColor: "rgba(247,242,234,0.10)",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
  },
  sendText: {
    color: colors.rice,
  },
});
