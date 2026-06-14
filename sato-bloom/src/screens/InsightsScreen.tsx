import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { bloomPalette } from "../features/bloom/bloomColors";
type ScreenName = "Portrait" | "Foods" | "Profile" | "Sato" | "Insights" | string;

type Page = "home" | "discoveries" | "revelation";
type FilterKey = "All" | "Foods" | "Rhythms" | "Life" | "Watch";
type RevelationId =
  | "evening-trace"
  | "evening-pizza"
  | "steady-mornings"
  | "lunch-walks"
  | "bjj-echo"
  | "weekends-body"
  | "short-sleep-breakfast"
  | "oats-mornings"
  | "late-snacks"
  | "fat-dinners"
  | "spicy-evenings"
  | "weekend-treats";

type ChatContext = {
  prompt: string;
  context: "Discover" | "Revelation";
  revelationId?: RevelationId;
};

type InsightsScreenProps = {
  onNavigate?: (screen: ScreenName) => void;
  onOpenRevelation?: (revelationId: RevelationId) => void;
  onOpenDiscoveries?: () => void;
  onOpenSatoChat?: (chatContext: ChatContext) => void;
};

type NavItemProps = {
  icon: "portrait" | "foods" | "discover" | "sato" | "profile";
  label: string;
  active?: boolean;
  onPress?: () => void;
};

type Discovery = {
  id: RevelationId;
  title: string;
  confidence: "Strong Pattern" | "Emerging Signal";
  occurrence: string;
  color: string;
  filter: Exclude<FilterKey, "All">;
};

const homeDiscoveries: Discovery[] = [
  {
    id: "evening-pizza",
    title: "Pizza behaves differently after 8pm",
    confidence: "Strong Pattern",
    occurrence: "Seen 18 times",
    color: "#D97748",
    filter: "Foods",
  },
  {
    id: "lunch-walks",
    title: "Lunch walks seem to soften your afternoons",
    confidence: "Strong Pattern",
    occurrence: "Seen 14 times",
    color: "#5795C7",
    filter: "Life",
  },
  {
    id: "steady-mornings",
    title: "Your mornings have become steadier this month",
    confidence: "Strong Pattern",
    occurrence: "Seen 21 times",
    color: "#A7B978",
    filter: "Rhythms",
  },
  {
    id: "bjj-echo",
    title: "BJJ may leave an overnight echo",
    confidence: "Emerging Signal",
    occurrence: "Seen 6 times",
    color: "#9E7BB5",
    filter: "Life",
  },
  {
    id: "short-sleep-breakfast",
    title: "Short sleep changes your breakfast rhythm",
    confidence: "Emerging Signal",
    occurrence: "Seen 9 times",
    color: "#C89A5B",
    filter: "Foods",
  },
];

const allDiscoveries: Discovery[] = [
  {
    id: "evening-pizza",
    title: "Your evening pizza behaves differently",
    confidence: "Strong Pattern",
    occurrence: "Seen 18 times",
    color: "#D97748",
    filter: "Foods",
  },
  {
    id: "steady-mornings",
    title: "Your mornings have become steadier this month",
    confidence: "Strong Pattern",
    occurrence: "Seen 21 times",
    color: "#A7B978",
    filter: "Rhythms",
  },
  {
    id: "lunch-walks",
    title: "Lunch walks seem to soften your afternoons",
    confidence: "Strong Pattern",
    occurrence: "Seen 14 times",
    color: "#5795C7",
    filter: "Life",
  },
  {
    id: "bjj-echo",
    title: "BJJ may leave an overnight echo",
    confidence: "Emerging Signal",
    occurrence: "Seen 6 times",
    color: "#9E7BB5",
    filter: "Life",
  },
  {
    id: "weekends-body",
    title: "Weekends look different in your body",
    confidence: "Emerging Signal",
    occurrence: "Seen 8 times",
    color: "#5F6FA8",
    filter: "Watch",
  },
  {
    id: "short-sleep-breakfast",
    title: "Short sleep changes your breakfast rhythm",
    confidence: "Emerging Signal",
    occurrence: "Seen 9 times",
    color: "#C89A5B",
    filter: "Foods",
  },
];

const foodsDiscoveries: Discovery[] = [
  allDiscoveries[0],
  {
    id: "oats-mornings",
    title: "Oats create steadier mornings",
    confidence: "Strong Pattern",
    occurrence: "Seen 16 times",
    color: "#C89A5B",
    filter: "Foods",
  },
  {
    id: "late-snacks",
    title: "Late snacks leave a longer trace",
    confidence: "Strong Pattern",
    occurrence: "Seen 12 times",
    color: "#D97748",
    filter: "Foods",
  },
  {
    id: "fat-dinners",
    title: "Higher fat dinners may slow recovery",
    confidence: "Emerging Signal",
    occurrence: "Seen 7 times",
    color: "#B97858",
    filter: "Foods",
  },
  {
    id: "spicy-evenings",
    title: "Spicy meals show up in the evening",
    confidence: "Emerging Signal",
    occurrence: "Seen 5 times",
    color: "#CF6F4B",
    filter: "Foods",
  },
  {
    id: "weekend-treats",
    title: "Weekend treats show up in Monday mornings",
    confidence: "Emerging Signal",
    occurrence: "Seen 6 times",
    color: "#A8734D",
    filter: "Foods",
  },
];

const filters: FilterKey[] = ["All", "Foods", "Rhythms", "Life", "Watch"];
const askPrompts = ["What surprised you most?", "Show similar memories", "What changed recently?"];
const revelationPrompts = ["Why might timing matter?", "Show me similar meals", "Were weekends different?"];

export default function InsightsScreen({
  onNavigate,
  onOpenRevelation,
  onOpenDiscoveries,
  onOpenSatoChat,
}: InsightsScreenProps) {
  const [page, setPage] = React.useState<Page>("home");
  const [selectedFilter, setSelectedFilter] = React.useState<FilterKey>("All");
  const [pressedDiscoveryId, setPressedDiscoveryId] = React.useState<RevelationId | null>(null);

  const handleNavPress = (screen: ScreenName) => {
    onNavigate?.(screen);
  };

  const handleOpenDiscoveries = () => {
    onOpenDiscoveries?.();
    setSelectedFilter("All");
    setPage("discoveries");
  };

  const handleOpenRevelation = (revelationId: RevelationId) => {
    setPressedDiscoveryId(revelationId);
    window.setTimeout(() => {
      setPressedDiscoveryId(null);
      setPage("revelation");
      onOpenRevelation?.(revelationId);
    }, 120);
  };

  const handleAskSato = (prompt: string, context: ChatContext["context"] = "Discover") => {
    onOpenSatoChat?.({ prompt, context, revelationId: context === "Revelation" ? "evening-pizza" : undefined });
  };

  if (page === "discoveries") {
    return (
      <ScreenShell onNavigate={handleNavPress} showBottomNav>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.feedScrollContent}>
          <TopBar
            title="Discoveries"
            onBack={() => setPage("home")}
            right={<SettingsIcon color="#80786F" />}
          />

          <View style={styles.feedIntro}>
            <Text style={styles.feedBody}>
              Explore what Sato has learned across different parts of your life.
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {filters.map((filter) => (
              <Pressable
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextActive]}>
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.feedList}>
            {getFilteredDiscoveries(selectedFilter).map((discovery) => (
              <DiscoveryCard
                key={discovery.id}
                discovery={discovery}
                pressed={pressedDiscoveryId === discovery.id}
                onPress={() => handleOpenRevelation(discovery.id)}
              />
            ))}
          </View>
        </ScrollView>
      </ScreenShell>
    );
  }

  if (page === "revelation") {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.safe}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.revelationScrollContent}>
            <TopBar
              title=""
              onBack={() => setPage("discoveries")}
              right={
                <View style={styles.revelationActions}>
                  <BookmarkIcon color="#80786F" />
                  <ShareIcon color="#80786F" />
                </View>
              }
            />

            <View style={styles.revelationHero}>
              <AbstractBloom size={172} color="#D97748" secondaryColor="#5795C7" />
              <View style={styles.revelationPills}>
                <View style={styles.confidencePill}>
                  <Text style={styles.confidencePillText}>Strong Pattern</Text>
                </View>
                <Text style={styles.seenCount}>Seen 18 times</Text>
              </View>
              <Text style={styles.revelationTitle}>Your evening pizza behaves differently</Text>
              <Text style={styles.revelationSupport}>
                Pizza eaten after 8pm typically shows a higher glucose peak and takes longer to return to baseline.
              </Text>
            </View>

            <View style={styles.metricGrid}>
              <MetricCard title="Peak response" value="+32 mg/dL" caption="higher on average" />
              <MetricCard title="Time to return to baseline" value="+1h 15m" caption="longer on average" />
            </View>

            <Section title="Why Sato Believes This">
              <View style={styles.beliefRow}>
                <View style={styles.checkList}>
                  {[
                    "Based on 18 pizza experiences",
                    "Seen repeatedly across different days",
                    "Consistent pattern with few exceptions",
                    "Statistically significant",
                  ].map((item) => (
                    <View key={item} style={styles.checkRow}>
                      <Text style={styles.checkMark}>✓</Text>
                      <Text style={styles.checkText}>{item}</Text>
                    </View>
                  ))}
                </View>
                <SoftChart />
              </View>
            </Section>

            <Section title="The Surrounding Story">
              <View style={styles.storyGrid}>
                <StoryCard title="What was different" items={["Later meal timing", "Less movement after", "Higher starting glucose"]} />
                <StoryCard title="What stayed similar" items={["Similar carbs", "Similar insulin", "Similar total calories"]} />
              </View>
              <Text style={styles.reflectionNote}>Even small timing shifts created noticeable differences.</Text>
            </Section>

            <Section title="Similar Memories">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memoryRow}>
                <MemoryCard date="Mar 8" title="Pizza after BJJ" line1="High peak" line2="Slow recovery" />
                <MemoryCard date="Apr 12" title="Movie night" line1="Higher peak" line2="Longer recovery" />
                <MemoryCard date="Jun 15" title="Celebration" line1="High peak" line2="Slow recovery" />
                <View style={styles.moreMemoriesCard}>
                  <Text style={styles.moreMemoriesText}>+15 more memories</Text>
                </View>
              </ScrollView>
            </Section>

            <Section title="Your Best Outcomes" subtitle="Your smoothest pizza experiences shared these traits:">
              <View style={styles.traitWrap}>
                {["Earlier timing", "Light movement", "Better sleep", "Similar insulin"].map((trait) => (
                  <View key={trait} style={styles.traitChip}>
                    <Text style={styles.traitText}>{trait}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.bestMemoryRow}>
                <View>
                  <Text style={styles.bestMemoryEyebrow}>Best memory: May 12</Text>
                  <Text style={styles.bestMemoryTitle}>Pizza with friends</Text>
                  <Text style={styles.bestMemoryMeta}>Earlier dinner · Quick recovery</Text>
                </View>
                <AbstractBloom size={44} color="#A7B978" secondaryColor="#E7CDAF" compact />
              </View>
            </Section>

            <Section title="Next Time...">
              <Text style={styles.sectionCopy}>
                Want to explore this further? Sato can watch whether earlier timing changes the pattern.
              </Text>
              <View style={styles.buttonRow}>
                <Pressable style={styles.orangeButton}>
                  <Text style={styles.orangeButtonText}>Watch for this</Text>
                </Pressable>
                <Pressable style={styles.creamButton}>
                  <Text style={styles.creamButtonText}>Remind me</Text>
                </Pressable>
              </View>
            </Section>

            <View style={styles.askCard}>
              <Text style={styles.askTitle}>Ask Sato</Text>
              <Text style={styles.askSubtitle}>Curious about something?</Text>
              <View style={styles.promptWrap}>
                {revelationPrompts.map((prompt) => (
                  <Pressable
                    key={prompt}
                    onPress={() => handleAskSato(prompt, "Revelation")}
                    style={styles.promptChip}
                  >
                    <Text style={styles.promptText}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <ScreenShell onNavigate={handleNavPress} showBottomNav>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AppHeader />

        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Discover</Text>
          <Text style={styles.pageSubtitle}>Patterns Sato has quietly noticed in your life.</Text>
        </View>

        <Pressable onPress={() => handleOpenRevelation("evening-trace")} style={styles.heroCard}>
          <View style={styles.heroArtworkWrap}>
            <AbstractBloom size={156} color="#D97748" secondaryColor="#5795C7" />
          </View>

          <View style={styles.confidencePill}>
            <Text style={styles.confidencePillText}>Strong Pattern</Text>
          </View>

          <Text style={styles.heroTitle}>The evening has been leaving a stronger trace.</Text>
          <Text style={styles.heroSupport}>
            Over the last 30 days, your glucose rhythm wandered more often between 7pm and 11pm.
          </Text>
          <Text style={styles.heroContext}>
            This pattern has appeared repeatedly and may help explain why some evenings feel less predictable.
          </Text>

          <Pressable onPress={() => handleOpenRevelation("evening-trace")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Explore this revelation</Text>
          </Pressable>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently uncovered</Text>
          <Pressable onPress={handleOpenDiscoveries} hitSlop={10}>
            <Text style={styles.seeAllText}>See all</Text>
          </Pressable>
        </View>

        <View style={styles.discoveryList}>
          {homeDiscoveries.map((discovery) => (
            <DiscoveryCard
              key={discovery.id}
              discovery={discovery}
              pressed={pressedDiscoveryId === discovery.id}
              onPress={() => handleOpenRevelation(discovery.id)}
            />
          ))}
        </View>

        <View style={styles.askCard}>
          <Text style={styles.askTitle}>Ask Sato about your discoveries</Text>
          <Text style={styles.askSubtitle}>Explore what these patterns may mean.</Text>
          <View style={styles.promptWrap}>
            {askPrompts.map((prompt) => (
              <Pressable key={prompt} onPress={() => handleAskSato(prompt)} style={styles.promptChip}>
                <Text style={styles.promptText}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function getFilteredDiscoveries(filter: FilterKey) {
  if (filter === "All") return allDiscoveries;
  if (filter === "Foods") return foodsDiscoveries;
  return allDiscoveries.filter((discovery) => discovery.filter === filter);
}

function ScreenShell({
  children,
  onNavigate,
  showBottomNav,
}: {
  children: React.ReactNode;
  onNavigate: (screen: ScreenName) => void;
  showBottomNav?: boolean;
}) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        {children}
        {showBottomNav ? <BottomNav onNavigate={onNavigate} /> : null}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function AppHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.logoText}>Sato</Text>
      <View style={styles.bellWrap}>
        <BellLineIcon color={bloomPalette.ink} />
        <View style={styles.notificationDot} />
      </View>
    </View>
  );
}

function TopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} style={styles.topBarButton} hitSlop={10}>
        <BackArrowIcon color={bloomPalette.ink} />
      </Pressable>
      <Text style={styles.topBarTitle}>{title}</Text>
      <View style={styles.topBarRight}>{right}</View>
    </View>
  );
}

function DiscoveryCard({ discovery, pressed, onPress }: { discovery: Discovery; pressed?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.discoveryCard, pressed && styles.discoveryCardPressed]}>
      <View style={styles.discoveryBloomWrap}>
        <AbstractBloom size={42} color={discovery.color} secondaryColor="#E7CDAF" compact />
      </View>
      <View style={styles.discoveryCopy}>
        <Text style={styles.discoveryTitle}>{discovery.title}</Text>
        <View style={styles.discoveryMetaRow}>
          <Text style={styles.discoveryConfidence}>{discovery.confidence}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.discoveryOccurrence}>{discovery.occurrence}</Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function MetricCard({ title, value, caption }: { title: string; value: string; caption: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricCaption}>{caption}</Text>
    </View>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.revelationSection}>
      <Text style={styles.revelationSectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.revelationSectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function StoryCard({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.storyCard}>
      <Text style={styles.storyTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.storyItem}>• {item}</Text>
      ))}
    </View>
  );
}

function MemoryCard({ date, title, line1, line2 }: { date: string; title: string; line1: string; line2: string }) {
  return (
    <View style={styles.memoryCard}>
      <Text style={styles.memoryDate}>{date}</Text>
      <Text style={styles.memoryTitle}>{title}</Text>
      <Text style={styles.memoryLine}>{line1}</Text>
      <Text style={styles.memoryLine}>{line2}</Text>
    </View>
  );
}

function SoftChart() {
  return (
    <View style={styles.softChart}>
      {[26, 44, 34, 58, 48, 66].map((height, index) => (
        <View key={index} style={[styles.chartBar, { height }]} />
      ))}
    </View>
  );
}

function AbstractBloom({
  size,
  color,
  secondaryColor,
  compact = false,
}: {
  size: number;
  color: string;
  secondaryColor: string;
  compact?: boolean;
}) {
  const petalLong = size * (compact ? 0.5 : 0.48);
  const petalShort = size * (compact ? 0.2 : 0.18);
  const offset = size * (compact ? 0.16 : 0.2);
  const washSize = size * (compact ? 0.72 : 0.86);

  return (
    <View style={[styles.abstractBloom, { width: size, height: size }]}>
      <View
        style={[
          styles.bloomWash,
          {
            width: washSize,
            height: washSize,
            borderRadius: washSize / 2,
            backgroundColor: secondaryColor,
            opacity: compact ? 0.16 : 0.2,
          },
        ]}
      />
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <View
          key={index}
          style={[
            styles.abstractPetal,
            {
              width: petalShort,
              height: petalLong,
              borderRadius: petalLong,
              backgroundColor: index % 2 === 0 ? color : secondaryColor,
              opacity: compact ? 0.32 : 0.28,
              transform: [{ rotate: `${index * 60 + 18}deg` }, { translateY: -offset }],
            },
          ]}
        />
      ))}
      <View
        style={[
          styles.bloomCore,
          {
            width: size * (compact ? 0.16 : 0.18),
            height: size * (compact ? 0.16 : 0.18),
            borderRadius: size * 0.09,
            backgroundColor: color,
            opacity: 0.72,
          },
        ]}
      />
    </View>
  );
}

function BottomNav({ onNavigate }: { onNavigate: (screen: ScreenName) => void }) {
  return (
    <View style={styles.bottomNav}>
      <NavItem icon="portrait" label="Portrait" onPress={() => onNavigate("Portrait")} />
      <NavItem icon="foods" label="Foods" onPress={() => onNavigate("Foods")} />
      <NavItem icon="discover" label="Discover" active />
      <NavItem icon="sato" label="Sato" />
      <NavItem icon="profile" label="Profile" onPress={() => onNavigate("Profile")} />
    </View>
  );
}

function NavItem({ icon, label, active, onPress }: NavItemProps) {
  const color = active ? "#D97748" : "#80786F";
  return (
    <Pressable onPress={onPress} style={styles.navItem}>
      <View style={styles.navIconWrap}>
        {icon === "portrait" ? <BlossomIcon color={color} size={25} /> : null}
        {icon === "foods" ? <UtensilsLineIcon color={color} /> : null}
        {icon === "discover" ? <MessageLineIcon color={color} /> : null}
        {icon === "sato" ? <BlossomIcon color={color} size={22} filled /> : null}
        {icon === "profile" ? <UserLineIcon color={color} /> : null}
      </View>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
      {active && <View style={styles.navDot} />}
    </Pressable>
  );
}

function BlossomIcon({ color, size = 26, filled = false }: { color: string; size?: number; filled?: boolean }) {
  const petalLong = size * 0.62;
  const petalShort = size * 0.31;
  const offset = size * 0.18;
  return (
    <View style={[styles.blossomIcon, { width: size, height: size }]}> 
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={[
            styles.blossomPetal,
            {
              width: petalShort,
              height: petalLong,
              borderRadius: petalLong,
              backgroundColor: filled ? color : "transparent",
              borderColor: color,
              opacity: filled ? 0.72 : 0.95,
              transform: [{ rotate: `${index * 90 + 45}deg` }, { translateY: -offset }],
            },
          ]}
        />
      ))}
      <View style={[styles.blossomCenter, { backgroundColor: color }]} />
    </View>
  );
}

function BackArrowIcon({ color }: { color: string }) {
  return (
    <View style={styles.backArrowBox}>
      <View style={[styles.backArrowHead, { borderColor: color }]} />
      <View style={[styles.backArrowLine, { backgroundColor: color }]} />
    </View>
  );
}

function SettingsIcon({ color }: { color: string }) {
  return (
    <View style={styles.settingsIconBox}>
      <View style={[styles.settingsLine, { backgroundColor: color, width: 16 }]} />
      <View style={[styles.settingsLine, { backgroundColor: color, width: 11 }]} />
      <View style={[styles.settingsLine, { backgroundColor: color, width: 14 }]} />
    </View>
  );
}

function BookmarkIcon({ color }: { color: string }) {
  return <View style={[styles.bookmarkIcon, { borderColor: color }]} />;
}

function ShareIcon({ color }: { color: string }) {
  return (
    <View style={styles.shareIconBox}>
      <View style={[styles.shareStem, { backgroundColor: color }]} />
      <View style={[styles.shareArrow, { borderColor: color }]} />
    </View>
  );
}

function BellLineIcon({ color }: { color: string }) {
  return (
    <View style={styles.bellIconBox}>
      <View style={[styles.bellDome, { borderColor: color }]} />
      <View style={[styles.bellBase, { borderColor: color }]} />
      <View style={[styles.bellClapper, { backgroundColor: color }]} />
    </View>
  );
}

function UtensilsLineIcon({ color }: { color: string }) {
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

function MessageLineIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconBox}>
      <View style={[styles.messageBubble, { borderColor: color }]} />
      <View style={[styles.messageTail, { borderRightColor: color, borderBottomColor: color, backgroundColor: "rgba(255,255,255,0.74)" }]} />
    </View>
  );
}

function UserLineIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconBox}>
      <View style={[styles.userHead, { borderColor: color }]} />
      <View style={[styles.userShoulders, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: bloomPalette.paper,
  },
  scrollContent: {
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 146,
  },
  feedScrollContent: {
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 146,
  },
  revelationScrollContent: {
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 44,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoText: {
    fontFamily: "Georgia",
    fontSize: 36,
    lineHeight: 36,
    color: bloomPalette.ink,
    fontWeight: "300",
    letterSpacing: -0.8,
  },
  bellWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#D97748",
    position: "absolute",
    top: 4,
    right: 4,
  },
  titleSection: {
    marginTop: 30,
  },
  pageTitle: {
    fontFamily: "Georgia",
    color: bloomPalette.ink,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.1,
    fontWeight: "300",
  },
  pageSubtitle: {
    marginTop: 8,
    color: "#80786F",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
  },
  heroCard: {
    marginTop: 24,
    padding: 22,
    minHeight: 430,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(36,31,27,0.075)",
    shadowColor: "#000",
    shadowOpacity: 0.065,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    overflow: "hidden",
  },
  heroArtworkWrap: {
    alignItems: "center",
    marginTop: 2,
    marginBottom: 16,
  },
  confidencePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(217,119,72,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,119,72,0.16)",
  },
  confidencePillText: {
    color: "#B45F39",
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "800",
    letterSpacing: 0.28,
  },
  heroTitle: {
    fontFamily: "Georgia",
    marginTop: 15,
    color: bloomPalette.ink,
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: -0.65,
    fontWeight: "300",
  },
  heroSupport: {
    marginTop: 12,
    color: "#625B53",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  heroContext: {
    marginTop: 10,
    color: "#8C8175",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 20,
    height: 50,
    borderRadius: 25,
    backgroundColor: bloomPalette.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFF9F0",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  sectionHeader: {
    marginTop: 30,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: "Georgia",
    color: bloomPalette.ink,
    fontSize: 23,
    lineHeight: 28,
    letterSpacing: -0.45,
    fontWeight: "300",
  },
  seeAllText: {
    color: "#D97748",
    fontSize: 13,
    fontWeight: "800",
  },
  topBar: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    position: "absolute",
    left: 54,
    right: 54,
    textAlign: "center",
    color: bloomPalette.ink,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
    letterSpacing: -0.15,
  },
  topBarRight: {
    minWidth: 40,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 14,
  },
  feedIntro: {
    marginTop: 27,
  },
  feedBody: {
    color: "#80786F",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    maxWidth: 310,
  },
  filterRow: {
    paddingTop: 20,
    paddingBottom: 18,
    gap: 9,
  },
  filterChip: {
    height: 38,
    paddingHorizontal: 17,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(36,31,27,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: "#D97748",
    borderColor: "#D97748",
  },
  filterText: {
    color: "#80786F",
    fontSize: 13,
    fontWeight: "800",
  },
  filterTextActive: {
    color: "#FFF9F0",
  },
  feedList: {
    gap: 12,
  },
  discoveryList: {
    gap: 12,
  },
  discoveryCard: {
    minHeight: 86,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: "rgba(255,255,255,0.66)",
    borderWidth: 1,
    borderColor: "rgba(36,31,27,0.07)",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.035,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  discoveryCardPressed: {
    borderColor: "rgba(217,119,72,0.65)",
    backgroundColor: "rgba(255,247,239,0.92)",
  },
  discoveryBloomWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,241,231,0.78)",
  },
  discoveryCopy: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 8,
  },
  discoveryTitle: {
    color: bloomPalette.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  discoveryMetaRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  discoveryConfidence: {
    color: "#B45F39",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
  },
  metaDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: "rgba(128,120,111,0.42)",
    marginHorizontal: 7,
  },
  discoveryOccurrence: {
    color: "#8C8175",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  chevron: {
    color: "rgba(128,120,111,0.55)",
    fontSize: 30,
    lineHeight: 30,
    fontWeight: "300",
    marginLeft: 2,
  },
  revelationActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  revelationHero: {
    marginTop: 18,
    alignItems: "center",
  },
  revelationPills: {
    marginTop: 12,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seenCount: {
    color: "#8C8175",
    fontSize: 12,
    fontWeight: "800",
  },
  revelationTitle: {
    fontFamily: "Georgia",
    marginTop: 18,
    color: bloomPalette.ink,
    fontSize: 31,
    lineHeight: 38,
    letterSpacing: -1,
    fontWeight: "300",
    alignSelf: "stretch",
  },
  revelationSupport: {
    marginTop: 12,
    color: "#625B53",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    alignSelf: "stretch",
  },
  metricGrid: {
    marginTop: 22,
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minHeight: 128,
    padding: 16,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.68)",
    borderWidth: 1,
    borderColor: "rgba(36,31,27,0.075)",
  },
  metricTitle: {
    color: "#80786F",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  metricValue: {
    marginTop: 10,
    color: bloomPalette.ink,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  metricCaption: {
    marginTop: 7,
    color: "#8C8175",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  revelationSection: {
    marginTop: 30,
  },
  revelationSectionTitle: {
    fontFamily: "Georgia",
    color: bloomPalette.ink,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.55,
    fontWeight: "300",
  },
  revelationSectionSubtitle: {
    marginTop: 7,
    color: "#80786F",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  beliefRow: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  checkList: {
    flex: 1,
    gap: 10,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  checkMark: {
    color: "#D97748",
    fontSize: 13,
    fontWeight: "900",
  },
  checkText: {
    flex: 1,
    color: "#625B53",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  softChart: {
    width: 92,
    height: 96,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.62)",
    borderWidth: 1,
    borderColor: "rgba(36,31,27,0.07)",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 5,
    paddingBottom: 17,
  },
  chartBar: {
    width: 6,
    borderRadius: 6,
    backgroundColor: "rgba(217,119,72,0.32)",
  },
  storyGrid: {
    marginTop: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  storyCard: {
    flex: 1,
    minWidth: 145,
    padding: 16,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.66)",
    borderWidth: 1,
    borderColor: "rgba(36,31,27,0.07)",
  },
  storyTitle: {
    color: bloomPalette.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
  storyItem: {
    marginTop: 8,
    color: "#625B53",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  reflectionNote: {
    marginTop: 14,
    color: "#8C8175",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  memoryRow: {
    paddingTop: 15,
    gap: 12,
  },
  memoryCard: {
    width: 142,
    minHeight: 138,
    padding: 15,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.68)",
    borderWidth: 1,
    borderColor: "rgba(36,31,27,0.075)",
  },
  memoryDate: {
    color: "#D97748",
    fontSize: 12,
    fontWeight: "900",
  },
  memoryTitle: {
    marginTop: 9,
    color: bloomPalette.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
  memoryLine: {
    marginTop: 6,
    color: "#80786F",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  moreMemoriesCard: {
    width: 132,
    minHeight: 138,
    padding: 15,
    borderRadius: 24,
    backgroundColor: "rgba(217,119,72,0.09)",
    borderWidth: 1,
    borderColor: "rgba(217,119,72,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreMemoriesText: {
    color: "#A95D39",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  traitWrap: {
    marginTop: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  traitChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(217,119,72,0.1)",
    borderWidth: 1,
    borderColor: "rgba(217,119,72,0.14)",
  },
  traitText: {
    color: "#A95D39",
    fontSize: 12,
    fontWeight: "800",
  },
  bestMemoryRow: {
    marginTop: 16,
    padding: 16,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.66)",
    borderWidth: 1,
    borderColor: "rgba(36,31,27,0.07)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bestMemoryEyebrow: {
    color: "#D97748",
    fontSize: 12,
    fontWeight: "900",
  },
  bestMemoryTitle: {
    marginTop: 6,
    color: bloomPalette.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  bestMemoryMeta: {
    marginTop: 6,
    color: "#80786F",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionCopy: {
    marginTop: 10,
    color: "#625B53",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  buttonRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  orangeButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D97748",
    alignItems: "center",
    justifyContent: "center",
  },
  orangeButtonText: {
    color: "#FFF9F0",
    fontSize: 13,
    fontWeight: "900",
  },
  creamButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(36,31,27,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  creamButtonText: {
    color: "#80786F",
    fontSize: 13,
    fontWeight: "900",
  },
  askCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.62)",
    borderWidth: 1,
    borderColor: "rgba(36,31,27,0.07)",
  },
  askTitle: {
    fontFamily: "Georgia",
    color: bloomPalette.ink,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.45,
    fontWeight: "300",
  },
  askSubtitle: {
    marginTop: 7,
    color: "#80786F",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  promptWrap: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  promptChip: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(217,119,72,0.1)",
    borderWidth: 1,
    borderColor: "rgba(217,119,72,0.14)",
  },
  promptText: {
    color: "#A95D39",
    fontSize: 12,
    fontWeight: "800",
  },
  abstractBloom: {
    alignItems: "center",
    justifyContent: "center",
  },
  bloomWash: {
    position: "absolute",
  },
  abstractPetal: {
    position: "absolute",
  },
  bloomCore: {
    position: "absolute",
  },
  bottomNav: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 20,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.76)",
    borderWidth: 1,
    borderColor: "rgba(36,31,27,0.075)",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.075,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  navItem: {
    alignItems: "center",
    minWidth: 62,
  },
  navIconWrap: {
    width: 28,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    marginTop: 5,
    color: "#80786F",
    fontSize: 11,
    fontWeight: "700",
  },
  navLabelActive: {
    color: "#D97748",
  },
  navDot: {
    marginTop: 5,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D97748",
  },
  backArrowBox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrowHead: {
    position: "absolute",
    left: 6,
    width: 10,
    height: 10,
    borderLeftWidth: 1.7,
    borderBottomWidth: 1.7,
    transform: [{ rotate: "45deg" }],
  },
  backArrowLine: {
    width: 16,
    height: 1.7,
    borderRadius: 1,
    marginLeft: 4,
  },
  settingsIconBox: {
    width: 24,
    height: 24,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
  settingsLine: {
    height: 1.6,
    borderRadius: 1,
  },
  bookmarkIcon: {
    width: 15,
    height: 20,
    borderWidth: 1.5,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  shareIconBox: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  shareStem: {
    width: 1.5,
    height: 16,
    borderRadius: 1,
  },
  shareArrow: {
    position: "absolute",
    top: 2,
    width: 9,
    height: 9,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    transform: [{ rotate: "-45deg" }],
  },
  blossomIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  blossomPetal: {
    position: "absolute",
    borderWidth: 1.25,
  },
  blossomCenter: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  bellIconBox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  bellDome: {
    width: 14,
    height: 14,
    borderWidth: 1.45,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  bellBase: {
    width: 18,
    height: 6,
    borderWidth: 1.45,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -1,
  },
  bellClapper: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  iconBox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  forkTines: {
    position: "absolute",
    left: 5,
    top: 4,
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
    left: 8,
    top: 10,
    width: 1.2,
    height: 10,
    borderRadius: 1,
  },
  knife: {
    position: "absolute",
    right: 6,
    top: 5,
    width: 4.5,
    height: 15,
    borderRightWidth: 1.2,
    borderTopWidth: 1.2,
    borderTopRightRadius: 5,
    transform: [{ rotate: "4deg" }],
  },
  messageBubble: {
    width: 20,
    height: 15,
    borderWidth: 1.35,
    borderRadius: 8,
  },
  messageTail: {
    position: "absolute",
    bottom: 4,
    left: 8,
    width: 5,
    height: 5,
    borderRightWidth: 1.35,
    borderBottomWidth: 1.35,
    transform: [{ rotate: "35deg" }],
  },
  userHead: {
    position: "absolute",
    top: 4,
    width: 7.8,
    height: 7.8,
    borderRadius: 4,
    borderWidth: 1.35,
  },
  userShoulders: {
    position: "absolute",
    bottom: 3,
    width: 16.5,
    height: 8,
    borderTopWidth: 1.35,
    borderLeftWidth: 1.35,
    borderRightWidth: 1.35,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
});
