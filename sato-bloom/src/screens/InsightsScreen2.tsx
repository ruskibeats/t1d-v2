import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { useFonts } from "expo-font";
import {
  Bell,
  ChevronRight,
  UtensilsCrossed,
  Sparkles,
  User,
  Flower2,
} from "lucide-react-native";
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond";
import { ScreenName } from "../navigation/types";

type Discovery = {
  id: string;
  title: string;
  signal: "Strong Pattern" | "Emerging Signal";
  seen: string;
  category: "food" | "activity" | "sleep" | "stress" | "routine";
  iconColor: string;
};

const discoveries: Discovery[] = [
  {
    id: "pizza-evening",
    title: "Pizza leaves a stronger evening trace",
    signal: "Strong Pattern",
    seen: "Seen 18 times",
    category: "food",
    iconColor: "#F2D8CB",
  },
  {
    id: "walks-afternoon",
    title: "Walks soften your afternoons",
    signal: "Strong Pattern",
    seen: "Seen 14 times",
    category: "activity",
    iconColor: "#D7E7EE",
  },
  {
    id: "mornings-steady",
    title: "Your mornings are settling",
    signal: "Strong Pattern",
    seen: "Seen 21 times",
    category: "routine",
    iconColor: "#D7E7EE",
  },
  {
    id: "bjj-echo",
    title: "Jiu-jitsu leaves an overnight echo",
    signal: "Emerging Signal",
    seen: "Seen 6 times",
    category: "stress",
    iconColor: "#E8DDF3",
  },
  {
    id: "sleep-breakfast",
    title: "Short sleep changes breakfast rhythm",
    signal: "Emerging Signal",
    seen: "Seen 9 times",
    category: "sleep",
    iconColor: "#E8DDF3",
  },
];

export default function InsightsScreen({
  onNavigate,
}: {
  onNavigate?: (screen: ScreenName) => void;
}) {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <AppHeader />

        <View style={styles.heroSection}>
          <Text style={styles.pageTitle}>Discover</Text>
          <Text style={styles.pageSubtitle}>Patterns Sato has quietly noticed in your life.</Text>
        </View>

        <FeaturedCard />

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
  );
}

function FeaturedCard() {
  return (
    <View style={styles.featuredCard}>
      <View style={styles.flowerGraphic}>
        <View style={styles.flowerBlurCircle} />
      </View>

      <View style={styles.featuredBadge}>
        <Text style={styles.featuredBadgeText}>Strong Pattern</Text>
      </View>

      <Text style={styles.featuredTitle}>The evening left a stronger trace.</Text>

      <Text style={styles.featuredDescription}>
        Over the last 30 days, your glucose rhythm wandered more often between{"\n"}
        <Text style={styles.featuredHighlight}>7pm and 11pm</Text>.
      </Text>

      <Pressable style={styles.exploreButton}>
        <Text style={styles.exploreButtonText}>Explore this revelation</Text>
        <ChevronRight size={16} color="#FFFFFF" />
      </Pressable>

      <View style={styles.featuredIconPlaceholder} />
    </View>
  );
}

function DiscoveryCard({ discovery }: { discovery: Discovery }) {
  const bgColor = discovery.iconColor;
  const signalColor = discovery.signal === "Strong Pattern" ? "#C65A32" : "#B97B3F";

  return (
    <Pressable style={styles.discoveryCard}>
      {discovery.id === "pizza-evening" ? (
        <FlowerIcon />
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
          <Text style={styles.iconPlaceholder}>🌿</Text>
        </View>
      )}

      <View style={styles.discoveryCopy}>
        <Text style={styles.discoveryTitle}>{discovery.title}</Text>
        <Text style={styles.discoveryMeta}>
          <Text style={[styles.discoverySignal, { color: signalColor }]}>
            {discovery.signal}
          </Text>
          {"  •  "}
          <Text style={styles.discoverySeen}>{discovery.seen}</Text>
        </Text>
      </View>

      <Pressable style={styles.cardArrowButton}>
        <ChevronRight size={16} color="#181614" />
      </Pressable>
    </Pressable>
  );
}

function FlowerIcon() {
  return (
    <View style={styles.flowerIconContainer}>
      <Image
        source={require("../../assets/flower.png")}
        style={styles.flowerImage}
        resizeMode="contain"
      />
    </View>
  );
}

function AppHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.logoWrap}>
        <View style={styles.logoMark} />
        <Text style={styles.logoText}>Sato</Text>
      </View>

      <Pressable style={styles.bell}>
        <Bell size={24} color="#181614" />
        <View style={styles.notificationDot} />
      </Pressable>
    </View>
  );
}

function BottomNav({ onNavigate }: { onNavigate?: (screen: ScreenName) => void }) {
  const items: { label: string; icon: React.ReactNode; screen?: ScreenName }[] = [
    { label: "Portrait", icon: <Flower2 size={22} color="#857D74" />, screen: "Portrait" },
    { label: "Foods", icon: <UtensilsCrossed size={20} color="#857D74" />, screen: "Foods" },
    { label: "Discover", icon: <Sparkles size={24} color="#D97947" />, screen: "Insights" },
    { label: "Sato", icon: null },
    { label: "Profile", icon: <User size={20} color="#857D74" />, screen: "Profile" },
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
            <View style={[styles.navIconWrapper, active && styles.navIconActive]}>
              {item.icon}
            </View>
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F2EA",
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  header: {
    marginTop: 16,
    height: 64,
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
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: "#D97947",
  },
  logoText: {
    fontSize: 24,
    fontFamily: "CormorantGaramond_600SemiBold",
    letterSpacing: -0.5,
    color: "#181614",
  },
  bell: {
    position: "relative",
    padding: 8,
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D97947",
    borderWidth: 2,
    borderColor: "#F6F2EA",
  },
  navIconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  navIconActive: {},
  heroSection: {
    paddingHorizontal: 8,
    marginTop: 16,
    marginBottom: 40,
  },
  pageTitle: {
    fontSize: 56,
    lineHeight: 56,
    fontFamily: "CormorantGaramond_600SemiBold",
    letterSpacing: -1,
    color: "#181614",
  },
  pageSubtitle: {
    marginTop: 8,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "CormorantGaramond_400Regular",
    color: "#857D74",
  },
  featuredCard: {
    backgroundColor: "#F9F6F1",
    borderRadius: 32,
    padding: 24,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E3DDD1",
    shadowColor: "#211F1B",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  flowerGraphic: {
    position: "absolute",
    top: -48,
    right: -48,
    width: 192,
    height: 192,
    opacity: 0.15,
  },
  flowerBlurCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 96,
    backgroundColor: "#D7E7EE",
  },
  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F2D8CB",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 24,
  },
  featuredBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#C65A32",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: "#181614",
    marginBottom: 12,
  },
  featuredDescription: {
    fontSize: 16,
    lineHeight: 22,
    color: "#857D74",
    marginBottom: 32,
  },
  featuredHighlight: {
    color: "#D97947",
    fontWeight: "600",
  },
  exploreButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181614",
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    gap: 8,
  },
  exploreButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  featuredIconPlaceholder: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8E3DA",
    opacity: 0.2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 48,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 32,
    letterSpacing: -0.8,
    color: "#181614",
  },
  seeAll: {
    fontSize: 16,
    fontWeight: "600",
    color: "#D97947",
  },
  list: {
    gap: 12,
  },
  discoveryCard: {
    backgroundColor: "#F9F6F1",
    borderRadius: 24,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ECE6DB",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  flowerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    overflow: "hidden",
  },
  flowerImage: {
    width: 48,
    height: 48,
  },
  iconPlaceholder: {
    fontSize: 24,
  },
  discoveryCopy: {
    flex: 1,
  },
  discoveryTitle: {
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 22,
    color: "#181614",
  },
  discoveryMeta: {
    marginTop: 2,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  discoverySignal: {
    fontWeight: "700",
  },
  discoverySeen: {
    color: "#857D74",
  },
  cardArrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDE7DD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  bottomNav: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 18,
    height: 70,
    borderRadius: 999,
    backgroundColor: "rgba(246, 242, 234, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#211F1B",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    color: "#857D74",
  },
  navLabelActive: {
    color: "#181614",
  },
  navDot: {
    marginTop: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D97947",
  },
});