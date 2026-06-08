import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from "react-native-svg";
import {
  BookOpen,
  Camera,
  ChevronDown,
  CircleUserRound,
  Feather,
  Leaf,
  LibraryBig,
  Menu,
  PenLine,
  Plus,
  Send,
  Sparkles,
} from "lucide-react-native";

export const colors = {
  paper: "#F4EFE6",
  paperLight: "#FBF7EF",
  paperDark: "#E8DED0",
  ink: "#241F1A",
  graphite: "#5D554D",
  muted: "#7A7167",
  navy: "#102334",
  navySoft: "#26394B",
  moss: "#6D7553",
  olive: "#8A8B5C",
  clay: "#B75A3E",
  clayDark: "#8E3F2F",
  gold: "#C7A86A",
  softBlue: "#9AA8B5",
  paleBlue: "#C7D0D7",
  blush: "#D9A18C",
  charcoal: "#111820",
  leather: "#3B2418",
  leatherLight: "#6B4630",
  creamStroke: "#D8CFC1",
  whiteInk: "#F8F1E7",
};

const type = {
  hero: 56,
  title: 30,
  h1: 26,
  h2: 22,
  h3: 18,
  body: 15,
  caption: 12,
  micro: 10,
  number: 56,
};

type MomentType = "meal" | "walk" | "sleep" | "stress" | "insulin" | "note" | "glucose";
type Impact = "low" | "medium" | "high";
type BodyMoment = {
  id: string;
  type: MomentType;
  label: string;
  time: string;
  value?: number;
  impact?: Impact;
  carbs?: number;
  glucoseImpact?: number;
  peakTime?: string;
  note?: string;
  duration?: number;
};

type PrimaryTab = "Journal" | "Day" | "Insights" | "Learn" | "You";
type OverlayScreen =
  | "add"
  | "meal"
  | "added"
  | "moment"
  | "ask"
  | "note"
  | "week"
  | "year"
  | "journals"
  | "settings"
  | null;

const mockMoments: BodyMoment[] = [
  {
    id: "matcha-745",
    type: "meal",
    label: "Matcha Latte",
    time: "7:45 AM",
    carbs: 14,
    glucoseImpact: 12,
    impact: "low",
  },
  {
    id: "oatmeal-902",
    type: "meal",
    label: "Oatmeal",
    time: "9:02 AM",
    carbs: 34,
    glucoseImpact: 28,
    impact: "medium",
  },
  {
    id: "salad-114",
    type: "meal",
    label: "Chicken Salad",
    time: "1:14 PM",
    carbs: 18,
    glucoseImpact: 18,
    peakTime: "2:10 PM",
    note: "Felt full and satisfied.",
    impact: "low",
  },
  {
    id: "walk-435",
    type: "walk",
    label: "Walk",
    time: "4:35 PM",
    duration: 22,
    glucoseImpact: -25,
    impact: "medium",
  },
  {
    id: "salmon-718",
    type: "meal",
    label: "Salmon & Veggies",
    time: "7:18 PM",
    carbs: 22,
    glucoseImpact: 16,
    impact: "low",
  },
  {
    id: "tea-945",
    type: "note",
    label: "Chamomile Tea",
    time: "9:45 PM",
  },
];

function hashString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h);
}

function seeded(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function layerColor(typeName: MomentType) {
  switch (typeName) {
    case "meal":
      return colors.gold;
    case "walk":
      return colors.moss;
    case "sleep":
      return colors.softBlue;
    case "stress":
      return colors.navy;
    case "insulin":
      return colors.paperLight;
    case "glucose":
      return colors.clay;
    default:
      return colors.graphite;
  }
}

function BodyMark({
  moments,
  size = 260,
  quiet = false,
  selected = false,
}: {
  moments: BodyMoment[];
  size?: number;
  quiet?: boolean;
  selected?: boolean;
}) {
  const center = size / 2;
  const baseMoments = moments.length
    ? moments
    : ([
        { id: "base-sleep", type: "sleep", label: "Rest", time: "night" },
        { id: "base-day", type: "walk", label: "Day", time: "morning" },
        { id: "base-meal", type: "meal", label: "Meal", time: "noon" },
      ] as BodyMoment[]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityLabel="Abstract body rhythm mark">
      <Rect x="0" y="0" width={size} height={size} fill="transparent" />
      <G>
        {baseMoments.map((m, index) => {
          const seed = hashString(m.id + m.type);
          const rx = size * (0.18 + seeded(seed) * 0.16);
          const ry = size * (0.16 + seeded(seed + 2) * 0.18);
          const cx = center + (seeded(seed + 4) - 0.5) * size * 0.34;
          const cy = center + (seeded(seed + 8) - 0.5) * size * 0.34;
          const rotate = (seeded(seed + 12) - 0.5) * 70;
          const opacity = quiet ? 0.2 : 0.22 + seeded(seed + 16) * 0.18;
          const impactBoost = m.impact === "high" ? 1.16 : m.impact === "medium" ? 1.06 : 1;
          return (
            <Ellipse
              key={m.id + index}
              cx={cx}
              cy={cy}
              rx={rx * impactBoost}
              ry={ry}
              fill={layerColor(m.type)}
              opacity={opacity}
              transform={`rotate(${rotate} ${cx} ${cy})`}
            />
          );
        })}
        <Circle cx={size * 0.78} cy={size * 0.28} r={size * 0.045} fill={colors.clay} opacity={0.9} />
        <Circle cx={size * 0.22} cy={size * 0.76} r={size * 0.032} fill={colors.navy} opacity={0.95} />
        <Path
          d={`M ${size * 0.18} ${size * 0.72} C ${size * 0.38} ${size * 0.54}, ${size * 0.58} ${size * 0.83}, ${size * 0.82} ${size * 0.44}`}
          stroke={colors.clay}
          strokeWidth={1.2}
          fill="none"
          opacity={0.55}
        />
        {selected ? (
          <Circle cx={center} cy={center} r={size * 0.45} stroke={colors.ink} strokeWidth={1} fill="none" opacity={0.62} />
        ) : null}
      </G>
    </Svg>
  );
}

function FoodImpactCurve({ compact = false }: { compact?: boolean }) {
  const h = compact ? 80 : 112;
  return (
    <Svg width="100%" height={h} viewBox="0 0 320 112">
      <Line x1="0" y1="78" x2="320" y2="78" stroke={colors.creamStroke} strokeWidth="1" opacity="0.8" />
      <Path
        d="M0 78 C36 76 54 64 78 66 C112 69 118 30 158 36 C198 42 196 83 238 70 C272 60 292 66 320 58 L320 112 L0 112 Z"
        fill={colors.clay}
        opacity="0.12"
      />
      <Path
        d="M0 78 C36 76 54 64 78 66 C112 69 118 30 158 36 C198 42 196 83 238 70 C272 60 292 66 320 58"
        stroke={colors.clay}
        strokeWidth="2"
        fill="none"
      />
      <Circle cx="158" cy="36" r="4" fill={colors.clayDark} />
    </Svg>
  );
}

function Page({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <SafeAreaView style={[styles.safe, dark && styles.safeDark]}>{children}</SafeAreaView>;
}

function Header({ onMenu }: { onMenu: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>Sato</Text>
      <Pressable accessibilityLabel="Open settings" onPress={onMenu} style={styles.iconButton}>
        <Menu size={20} color={colors.ink} strokeWidth={1.6} />
      </Pressable>
    </View>
  );
}

function SatoButton({ children, onPress, variant = "primary" }: { children: React.ReactNode; onPress: () => void; variant?: "primary" | "ghost" | "circle" }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.satoButton, variant === "ghost" && styles.ghostButton, variant === "circle" && styles.circleButton]}
    >
      <Text style={[styles.satoButtonText, variant !== "primary" && styles.ghostButtonText]}>{children}</Text>
    </Pressable>
  );
}

function LeatherTabBar({ active, setActive }: { active: PrimaryTab; setActive: (tab: PrimaryTab) => void }) {
  const tabs: Array<{ key: PrimaryTab; icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }> }> = [
    { key: "Journal", icon: BookOpen },
    { key: "Day", icon: Feather },
    { key: "Insights", icon: Sparkles },
    { key: "Learn", icon: LibraryBig },
    { key: "You", icon: CircleUserRound },
  ];

  return (
    <View style={styles.leatherTabBar}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = active === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => setActive(tab.key)} style={styles.leatherTab}>
            <Icon size={20} color={selected ? colors.whiteInk : colors.creamStroke} strokeWidth={1.5} />
            <Text style={[styles.leatherTabText, selected && styles.leatherTabTextActive]}>{tab.key}</Text>
            {selected ? <View style={styles.leatherUnderline} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function TodayScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  return (
    <Page>
      <Header onMenu={() => open("settings")} />
      <View style={styles.todayCenter}>
        <BodyMark moments={mockMoments} size={318} />
        <Text style={styles.todayPhrase}>The day unfolds.</Text>
        <Text style={styles.softGlucose}>108 mg/dL · steady</Text>
      </View>
      <View style={styles.todayActions}>
        <Pressable accessibilityLabel="Add moment" onPress={() => open("add")} style={styles.floatingPlus}>
          <Plus size={22} color={colors.whiteInk} strokeWidth={1.7} />
        </Pressable>
        <Pressable accessibilityLabel="Open day timeline" onPress={() => open(null)} style={styles.downCircle}>
          <ChevronDown size={18} color={colors.ink} />
        </Pressable>
      </View>
    </Page>
  );
}

function AddMomentScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  return (
    <Page>
      <Header onMenu={() => open("settings")} />
      <View style={styles.addCenter}>
        <Text style={styles.prompt}>What are you{"\n"}about to enjoy?</Text>
        <View style={styles.cameraOval}>
          <Pressable
            accessibilityLabel="Take photo"
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              open("meal");
            }}
            style={styles.cameraCircle}
          >
            <Camera size={34} color={colors.ink} strokeWidth={1.25} />
          </Pressable>
        </View>
      </View>
      <View style={styles.addActions}>
        <SatoButton onPress={() => open("meal")}>Take photo</SatoButton>
        <SatoButton variant="ghost" onPress={() => open("meal")}>
          Choose photo
        </SatoButton>
        <SatoButton variant="ghost" onPress={() => open("ask")}>
          Write note
        </SatoButton>
      </View>
    </Page>
  );
}

function MealDetailScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPage}>
        <Image
          source={{ uri: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200" }}
          style={styles.foodImage}
        />
        <Text style={styles.screenTitle}>Chicken Salad</Text>
        <Text style={styles.caption}>1:14 PM · Today</Text>
        <View style={styles.mealInsightPanel}>
          <Text style={styles.micro}>Sato writes</Text>
          <Text style={styles.italicNote}>Looks balanced. Light and steady.</Text>
        </View>
        <View style={styles.twoColumns}>
          <View style={styles.statPanel}>
            <Text style={styles.caption}>Estimated carbs</Text>
            <Text style={styles.statNumber}>~18g</Text>
          </View>
          <View style={styles.statPanel}>
            <Text style={styles.caption}>Predicted impact</Text>
            <Text style={styles.statNumber}>+18</Text>
            <Text style={styles.caption}>mg/dL</Text>
          </View>
        </View>
        <View style={styles.pagePanel}>
          <Text style={styles.panelTitle}>Peak around 2:10 PM</Text>
          <FoodImpactCurve />
        </View>
        <SatoButton onPress={() => open("added")}>Add to my day</SatoButton>
      </ScrollView>
    </Page>
  );
}

function AddedToDayScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  return (
    <Page>
      <View style={styles.addedWrap}>
        <BodyMark moments={[mockMoments[2], { id: "add-bloom", type: "glucose", label: "Bloom", time: "now" }]} size={284} />
        <Text style={styles.screenTitle}>Lunch recorded.</Text>
        <Text style={styles.subtitle}>It’s now part of your day.</Text>
        <View style={styles.checkMark}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      </View>
      <SatoButton onPress={() => open(null)}>Return to day</SatoButton>
    </Page>
  );
}

function DayTimelineScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  return (
    <Page>
      <Header onMenu={() => open("settings")} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPage}>
        <Text style={styles.screenTitle}>Your day, as it happens.</Text>
        <Text style={styles.subtitle}>Tap any mark to revisit the moment.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalTimeline}>
          {mockMoments.map((moment, index) => (
            <Pressable key={moment.id} style={styles.momentTile} onPress={() => open("moment")}>
              <BodyMark moments={[moment]} size={96} quiet selected={index === 2} />
              <Text style={styles.timelineTime}>{moment.time}</Text>
              <Text style={styles.timelineLabel}>{moment.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.pagePanel}>
          <Text style={styles.panelTitle}>Sato’s note</Text>
          <Text style={styles.italicNote}>The afternoon stayed warm. A short walk helped reset things.</Text>
          <Pressable onPress={() => open("note")} style={styles.linkRow}>
            <Text style={styles.linkText}>Read the marginalia</Text>
            <PenLine size={15} color={colors.clayDark} />
          </Pressable>
        </View>
        <SatoButton onPress={() => open("add")}>Add moment</SatoButton>
      </ScrollView>
    </Page>
  );
}

function MomentDetailScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPage}>
        <Image source={{ uri: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200" }} style={styles.detailImage} />
        <Text style={styles.handTitle}>Chicken Salad</Text>
        <Text style={styles.caption}>1:14 PM · Today</Text>
        <View style={styles.pagePanel}>
          <Text style={styles.panelTitle}>Glucose impact</Text>
          <Text style={styles.statNumber}>+18 mg/dL</Text>
          <FoodImpactCurve compact />
        </View>
        <View style={styles.noteField}>
          <Text style={styles.caption}>Notes</Text>
          <Text style={styles.italicNote}>Felt full and satisfied.</Text>
        </View>
        <View style={styles.mealInsightPanel}>
          <Text style={styles.micro}>Observation</Text>
          <Text style={styles.italicNote}>Protein and fiber softened the curve.</Text>
        </View>
        <SatoButton onPress={() => open(null)}>Back to day</SatoButton>
      </ScrollView>
    </Page>
  );
}

function AskSatoScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  const [question, setQuestion] = useState("Why did lunch linger today?");
  return (
    <Page>
      <Header onMenu={() => open("settings")} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.askPage}>
        <Text style={styles.screenTitle}>Ask Sato</Text>
        <View style={styles.linedPaper}>
          <TextInput
            multiline
            value={question}
            onChangeText={setQuestion}
            placeholder="Write here…"
            placeholderTextColor={colors.muted}
            style={styles.journalInput}
          />
          <Pressable
            accessibilityLabel="Send question"
            onPress={() => Haptics.selectionAsync()}
            style={styles.sendCircle}
          >
            <Send size={18} color={colors.whiteInk} />
          </Pressable>
        </View>
        <View style={styles.marginaliaAnswer}>
          <View style={styles.redUnderline} />
          <Text style={styles.italicNoteLarge}>
            It stayed with you longer than usual.{"\n"}You ate a little later, and had a shorter walk.{"\n"}The combination likely kept your rhythm elevated.
          </Text>
        </View>
      </ScrollView>
    </Page>
  );
}

function SatoNoteScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  return (
    <Page>
      <Header onMenu={() => open("settings")} />
      <View style={styles.noteCanvas}>
        <BodyMark moments={mockMoments} size={300} quiet />
        <Svg width="100%" height={260} viewBox="0 0 340 260" style={StyleSheet.absoluteFill}>
          <Path d="M72 86 C116 78 132 104 152 124" stroke={colors.graphite} strokeWidth="1" fill="none" />
          <Path d="M246 100 C218 118 210 136 198 156" stroke={colors.graphite} strokeWidth="1" fill="none" />
          <Circle cx="154" cy="126" r="3" fill={colors.clay} />
          <Circle cx="198" cy="156" r="3" fill={colors.moss} />
        </Svg>
        <Text style={[styles.annotation, styles.annotationLeft]}>Late meal + less movement</Text>
        <Text style={[styles.annotation, styles.annotationRight]}>Walk helped here</Text>
        <Text style={styles.annotationBottom}>Lingering elevation</Text>
      </View>
    </Page>
  );
}

function WeekViewScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <Page>
      <Header onMenu={() => open("settings")} />
      <ScrollView contentContainerStyle={styles.scrollPage}>
        <Text style={styles.screenTitle}>Week view</Text>
        <View style={styles.weekGrid}>
          {days.map((day, index) => (
            <View key={`${day}-${index}`} style={styles.weekDay}>
              <Text style={styles.weekLetter}>{day}</Text>
              <BodyMark moments={[mockMoments[index % mockMoments.length]]} size={72} quiet selected={index === 4} />
            </View>
          ))}
        </View>
        <View style={styles.pagePanel}>
          <Text style={styles.italicNote}>Evening walks helped restore balance.</Text>
          <Text style={styles.subtitle}>Late dinners made nights more restless.</Text>
        </View>
        <SatoButton onPress={() => open("year")}>See year in pages</SatoButton>
      </ScrollView>
    </Page>
  );
}

function YearInPagesScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  const days = useMemo(() => Array.from({ length: 84 }), []);
  return (
    <Page>
      <Header onMenu={() => open("settings")} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPage}>
        <Text style={styles.screenTitle}>A year in pages.</Text>
        <Text style={styles.subtitle}>See your body’s story over time.</Text>
        <View style={styles.filterRow}>
          {[
            "Calm days",
            "Restless nights",
            "Walk helped",
          ].map((label) => (
            <View key={label} style={styles.filterPill}>
              <Text style={styles.filterText}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.yearGrid}>
          {days.map((_, index) => (
            <BodyMark key={index} moments={[mockMoments[index % mockMoments.length]]} size={34} quiet />
          ))}
        </View>
      </ScrollView>
    </Page>
  );
}

function JournalsScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  return (
    <Page>
      <Header onMenu={() => open("settings")} />
      <ScrollView contentContainerStyle={styles.scrollPage}>
        <Text style={styles.screenTitle}>Journals</Text>
        <Text style={styles.subtitle}>Every book is a chapter of your life.</Text>
        <View style={styles.bookshelf}>
          {["2025", "2024", "2023", "2022"].map((year, index) => (
            <View key={year} style={[styles.journalBook, { backgroundColor: [colors.leather, colors.leatherLight, colors.navy, colors.clayDark][index] }]}>
              <Text style={styles.bookEmboss}>Sato</Text>
              <View>
                <Text style={styles.bookYear}>{year}</Text>
                <Text style={styles.bookCaption}>body journal</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </Page>
  );
}

function InsightsHome({ open }: { open: (screen: OverlayScreen) => void }) {
  return (
    <Page>
      <Header onMenu={() => open("settings")} />
      <ScrollView contentContainerStyle={styles.scrollPage}>
        <Text style={styles.screenTitle}>Insights</Text>
        <Text style={styles.statement}>Lunch lingered longer than expected.</Text>
        <Text style={styles.insightCopy}>Your glucose stayed elevated into the afternoon. A short walk helped reset things.</Text>
        <View style={styles.pagePanel}>
          <BodyMark moments={[mockMoments[2], { id: "stress-1400", type: "stress", label: "Stress", time: "2:00 PM", impact: "medium" }]} size={210} quiet />
          <Text style={styles.italicNote}>Late meals often leave this shape.</Text>
        </View>
        <SatoButton onPress={() => open("note")}>Open Sato’s note</SatoButton>
      </ScrollView>
    </Page>
  );
}

function LearnScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  return (
    <Page>
      <Header onMenu={() => open("settings")} />
      <ScrollView contentContainerStyle={styles.scrollPage}>
        <Text style={styles.screenTitle}>Learn</Text>
        <View style={styles.lessonPanel}>
          <Leaf size={24} color={colors.moss} strokeWidth={1.5} />
          <Text style={styles.panelTitle}>Food logging, reimagined.</Text>
          <Text style={styles.lessonCopy}>Every meal becomes part of your day. Not a row in a database.</Text>
        </View>
        <View style={styles.lessonPanel}>
          <Sparkles size={24} color={colors.clay} strokeWidth={1.5} />
          <Text style={styles.panelTitle}>Ask Sato.</Text>
          <Text style={styles.lessonCopy}>Not a chatbot. A conversation in your journal.</Text>
        </View>
        <View style={styles.lessonPanel}>
          <LibraryBig size={24} color={colors.navy} strokeWidth={1.5} />
          <Text style={styles.panelTitle}>A year in pages.</Text>
          <Text style={styles.lessonCopy}>See your body’s story over time.</Text>
        </View>
      </ScrollView>
    </Page>
  );
}

function YouScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  return (
    <Page>
      <Header onMenu={() => open("settings")} />
      <ScrollView contentContainerStyle={styles.scrollPage}>
        <Text style={styles.screenTitle}>You</Text>
        <View style={styles.pagePanel}>
          <Text style={styles.panelTitle}>Your data belongs to you.</Text>
          <Text style={styles.italicNote}>Encrypted. Always.</Text>
        </View>
        <View style={styles.attentionPanel} accessibilityLabel="Urgent glucose example">
          <Text style={styles.panelTitle}>Something needs attention.</Text>
          <Text style={styles.attentionNumber}>67 mg/dL</Text>
          <Text style={styles.subtitle}>I’m here.</Text>
        </View>
        <SatoButton onPress={() => open("journals")}>Open archive</SatoButton>
        <SatoButton variant="ghost" onPress={() => open("settings")}>Settings</SatoButton>
      </ScrollView>
    </Page>
  );
}

function SettingsScreen({ open }: { open: (screen: OverlayScreen) => void }) {
  return (
    <Page>
      <ScrollView contentContainerStyle={styles.scrollPage}>
        <Text style={styles.screenTitle}>Settings</Text>
        <View style={styles.pagePanel}>
          <Text style={styles.panelTitle}>Display</Text>
          <Text style={styles.subtitle}>Glucose number: soft reveal</Text>
          <Text style={styles.subtitle}>High contrast fallback: available</Text>
          <Text style={styles.subtitle}>Dynamic text: supported by system fonts</Text>
        </View>
        <View style={styles.pagePanel}>
          <Text style={styles.panelTitle}>Privacy</Text>
          <Text style={styles.italicNote}>Your data belongs to you. Encrypted. Always.</Text>
        </View>
        <SatoButton onPress={() => open(null)}>Back to journal</SatoButton>
      </ScrollView>
    </Page>
  );
}

export default function SatoJournalRoute() {
  const [tab, setTab] = useState<PrimaryTab>("Journal");
  const [screen, setScreen] = useState<OverlayScreen>(null);

  const open = (next: OverlayScreen) => setScreen(next);
  const routeTab = (next: PrimaryTab) => {
    setScreen(null);
    setTab(next);
  };

  let content: React.ReactNode = <TodayScreen open={open} />;
  if (tab === "Day") content = <DayTimelineScreen open={open} />;
  if (tab === "Insights") content = <InsightsHome open={open} />;
  if (tab === "Learn") content = <LearnScreen open={open} />;
  if (tab === "You") content = <YouScreen open={open} />;

  if (screen === "add") content = <AddMomentScreen open={open} />;
  if (screen === "meal") content = <MealDetailScreen open={open} />;
  if (screen === "added") content = <AddedToDayScreen open={open} />;
  if (screen === "moment") content = <MomentDetailScreen open={open} />;
  if (screen === "ask") content = <AskSatoScreen open={open} />;
  if (screen === "note") content = <SatoNoteScreen open={open} />;
  if (screen === "week") content = <WeekViewScreen open={open} />;
  if (screen === "year") content = <YearInPagesScreen open={open} />;
  if (screen === "journals") content = <JournalsScreen open={open} />;
  if (screen === "settings") content = <SettingsScreen open={open} />;

  return (
    <View style={styles.routeRoot}>
      <View style={styles.contentRoot}>{content}</View>
      <View style={styles.quickRail}>
        <Pressable onPress={() => open("add")} style={styles.quickPill}>
          <Plus size={15} color={colors.whiteInk} />
          <Text style={styles.quickText}>Moment</Text>
        </Pressable>
        <Pressable onPress={() => open("ask")} style={styles.quickPillMuted}>
          <PenLine size={15} color={colors.leather} />
          <Text style={styles.quickTextMuted}>Ask Sato</Text>
        </Pressable>
        <Pressable onPress={() => open("week")} style={styles.quickPillMuted}>
          <Text style={styles.quickTextMuted}>Week</Text>
        </Pressable>
      </View>
      <LeatherTabBar active={tab} setActive={routeTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  routeRoot: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  contentRoot: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  safeDark: {
    backgroundColor: colors.charcoal,
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontFamily: "Georgia",
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  todayCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 120,
  },
  todayPhrase: {
    fontFamily: "Georgia",
    fontSize: type.h2,
    color: colors.ink,
    marginTop: 8,
  },
  softGlucose: {
    fontSize: type.caption,
    color: colors.muted,
    marginTop: 8,
  },
  todayActions: {
    position: "absolute",
    bottom: 126,
    left: 22,
    right: 22,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingPlus: {
    position: "absolute",
    left: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  downCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.creamStroke,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,247,239,0.72)",
  },
  quickRail: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 96,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    pointerEvents: "box-none",
  },
  quickPill: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: colors.leather,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  quickPillMuted: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: "rgba(251,247,239,0.86)",
    borderWidth: 1,
    borderColor: colors.creamStroke,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  quickText: {
    color: colors.whiteInk,
    fontSize: 12,
    fontWeight: "600",
  },
  quickTextMuted: {
    color: colors.leather,
    fontSize: 12,
    fontWeight: "600",
  },
  leatherTabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 86,
    backgroundColor: colors.leather,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flexDirection: "row",
    paddingTop: 12,
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
  },
  leatherTab: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  leatherTabText: {
    color: colors.creamStroke,
    fontSize: 11,
  },
  leatherTabTextActive: {
    color: colors.whiteInk,
  },
  leatherUnderline: {
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.clay,
    marginTop: 3,
  },
  addCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 140,
  },
  prompt: {
    fontFamily: "Georgia",
    fontSize: type.title,
    lineHeight: 40,
    color: colors.ink,
    textAlign: "center",
    marginBottom: 42,
  },
  cameraOval: {
    width: 242,
    height: 286,
    borderRadius: 140,
    backgroundColor: "rgba(216,207,193,0.30)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(216,207,193,0.46)",
  },
  cameraCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(251,247,239,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  addActions: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 108,
    gap: 10,
  },
  satoButton: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  ghostButton: {
    backgroundColor: "rgba(251,247,239,0.55)",
    borderWidth: 1,
    borderColor: colors.creamStroke,
  },
  circleButton: {
    width: 52,
    height: 52,
    minHeight: 52,
    paddingHorizontal: 0,
  },
  satoButtonText: {
    color: colors.whiteInk,
    fontSize: 15,
    fontWeight: "600",
  },
  ghostButtonText: {
    color: colors.ink,
  },
  scrollPage: {
    paddingBottom: 180,
  },
  foodImage: {
    width: "100%",
    height: 238,
    borderRadius: 32,
    marginTop: 8,
    marginBottom: 22,
  },
  detailImage: {
    width: "100%",
    height: 200,
    borderRadius: 30,
    marginTop: 10,
    marginBottom: 18,
  },
  screenTitle: {
    fontFamily: "Georgia",
    fontSize: type.title,
    color: colors.ink,
    lineHeight: 38,
  },
  handTitle: {
    fontFamily: "Georgia",
    fontStyle: "italic",
    fontSize: type.title,
    color: colors.ink,
    lineHeight: 38,
  },
  subtitle: {
    color: colors.muted,
    fontSize: type.body,
    lineHeight: 23,
    marginTop: 6,
  },
  caption: {
    color: colors.muted,
    fontSize: type.caption,
    lineHeight: 18,
  },
  micro: {
    color: colors.muted,
    fontSize: type.micro,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  mealInsightPanel: {
    backgroundColor: colors.paperLight,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.creamStroke,
    padding: 20,
    marginTop: 18,
  },
  italicNote: {
    fontFamily: "Georgia",
    fontStyle: "italic",
    color: colors.ink,
    fontSize: type.h3,
    lineHeight: 27,
  },
  italicNoteLarge: {
    fontFamily: "Georgia",
    fontStyle: "italic",
    color: colors.ink,
    fontSize: type.h2,
    lineHeight: 34,
  },
  twoColumns: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  statPanel: {
    flex: 1,
    backgroundColor: "rgba(251,247,239,0.58)",
    borderWidth: 1,
    borderColor: colors.creamStroke,
    borderRadius: 24,
    padding: 18,
  },
  statNumber: {
    fontFamily: "Georgia",
    fontSize: 28,
    color: colors.ink,
    marginTop: 6,
  },
  pagePanel: {
    backgroundColor: colors.paperLight,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.creamStroke,
    padding: 22,
    marginTop: 18,
    alignItems: "flex-start",
  },
  panelTitle: {
    color: colors.ink,
    fontSize: type.h3,
    fontWeight: "600",
    marginBottom: 8,
  },
  addedWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 128,
  },
  checkMark: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(251,247,239,0.84)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.creamStroke,
  },
  checkText: {
    color: colors.moss,
    fontSize: 24,
  },
  horizontalTimeline: {
    paddingVertical: 30,
    gap: 20,
  },
  momentTile: {
    width: 106,
    alignItems: "center",
  },
  timelineTime: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 8,
  },
  timelineLabel: {
    color: colors.ink,
    fontSize: 13,
    textAlign: "center",
    marginTop: 3,
  },
  linkRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  linkText: {
    color: colors.clayDark,
    fontSize: 14,
    fontWeight: "600",
  },
  noteField: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(232,222,208,0.38)",
    marginTop: 16,
  },
  askPage: {
    paddingBottom: 180,
  },
  linedPaper: {
    marginTop: 28,
    minHeight: 190,
    borderRadius: 28,
    backgroundColor: colors.paperLight,
    borderWidth: 1,
    borderColor: colors.creamStroke,
    padding: 22,
    overflow: "hidden",
  },
  journalInput: {
    minHeight: 118,
    fontFamily: "Georgia",
    fontStyle: "italic",
    fontSize: 22,
    lineHeight: 34,
    color: colors.ink,
    textAlignVertical: "top",
  },
  sendCircle: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.clay,
    alignItems: "center",
    justifyContent: "center",
  },
  marginaliaAnswer: {
    marginTop: 36,
    paddingLeft: 18,
  },
  redUnderline: {
    width: 82,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.clay,
    marginBottom: 18,
  },
  noteCanvas: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 120,
  },
  annotation: {
    position: "absolute",
    fontFamily: "Georgia",
    fontStyle: "italic",
    color: colors.graphite,
    fontSize: 16,
    lineHeight: 22,
    maxWidth: 140,
  },
  annotationLeft: {
    left: 12,
    top: "34%",
  },
  annotationRight: {
    right: 12,
    top: "42%",
  },
  annotationBottom: {
    position: "absolute",
    bottom: 160,
    fontFamily: "Georgia",
    fontStyle: "italic",
    color: colors.clayDark,
    fontSize: 19,
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
  },
  weekDay: {
    alignItems: "center",
    gap: 8,
  },
  weekLetter: {
    color: colors.muted,
    fontSize: 13,
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 24,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 20,
  },
  filterPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.creamStroke,
    backgroundColor: "rgba(251,247,239,0.56)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {
    color: colors.graphite,
    fontSize: 12,
  },
  bookshelf: {
    flexDirection: "row",
    gap: 14,
    marginTop: 34,
    alignItems: "flex-end",
  },
  journalBook: {
    width: 72,
    height: 168,
    borderRadius: 8,
    padding: 10,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  bookEmboss: {
    fontFamily: "Georgia",
    color: colors.whiteInk,
    fontSize: 16,
  },
  bookYear: {
    color: colors.whiteInk,
    fontSize: 13,
    fontWeight: "600",
  },
  bookCaption: {
    color: colors.creamStroke,
    fontSize: 9,
    marginTop: 4,
  },
  statement: {
    fontFamily: "Georgia",
    color: colors.ink,
    fontSize: 34,
    lineHeight: 44,
    marginTop: 24,
  },
  insightCopy: {
    color: colors.graphite,
    fontSize: 16,
    lineHeight: 25,
    marginTop: 22,
  },
  lessonPanel: {
    backgroundColor: colors.paperLight,
    borderWidth: 1,
    borderColor: colors.creamStroke,
    borderRadius: 30,
    padding: 22,
    marginTop: 16,
  },
  lessonCopy: {
    color: colors.graphite,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 6,
  },
  attentionPanel: {
    backgroundColor: colors.paperLight,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: colors.clay,
    padding: 22,
    marginTop: 18,
  },
  attentionNumber: {
    fontFamily: "Georgia",
    color: colors.clayDark,
    fontSize: type.number,
    marginTop: 8,
  },
});
