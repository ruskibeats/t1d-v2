import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BloomClock } from "../features/bloom/BloomClock";
import { todayBloomWindows } from "../features/bloom/bloomSampleData";
import { bloomPalette } from "../features/bloom/bloomColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SATO_LOGO_MARK = require("../../assets/sato_logo_mark.png");

export default function PortraitScreen() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Image source={SATO_LOGO_MARK} style={styles.logoMarkImage} resizeMode="contain" />
              <View>
                <Text style={styles.logoText}>Sato</Text>
                <Text style={styles.tagline}>KNOW YOUR RHYTHM</Text>
              </View>
            </View>
            <View style={styles.bellWrap}>
              <BellLineIcon color={bloomPalette.ink} />
              <View style={styles.notificationDot} />
            </View>
          </View>

          <Text style={styles.greeting}>Good morning, Tom</Text>

          <Text style={styles.headline}>
            Your bloom feels more{"\n"}
            <Text style={styles.headlineAccent}>reactive</Text> today.
          </Text>

          <View style={styles.bloomWrap}>
            <BloomClock
              windows={todayBloomWindows}
              size={Math.min(390, SCREEN_WIDTH - 20)}
              glucose={110}
              currentHour={13}
            />
          </View>

          <View style={styles.editorialCaption}>
            <Text style={styles.caption}>
              Today left a stronger{"\n"}impression after lunch.
            </Text>
            <View style={styles.rule} />
            <Text style={styles.philosophy}>
              The portrait remembers.{"\n"}The numbers explain.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          <NavItem icon="portrait" label="Portrait" active />
          <NavItem icon="foods" label="Foods" />
          <NavItem icon="insights" label="Insights" />
          <NavItem icon="profile" label="Profile" />
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function NavItem({
  icon,
  label,
  active,
}: {
  icon: "portrait" | "foods" | "insights" | "profile";
  label: string;
  active?: boolean;
}) {
  const color = active ? "#D97748" : "#80786F";
  return (
    <View style={styles.navItem}>
      <View style={styles.navIconWrap}>
        {icon === "portrait" ? <BlossomIcon color={color} size={25} /> : null}
        {icon === "foods" ? <UtensilsLineIcon color={color} /> : null}
        {icon === "insights" ? <MessageLineIcon color={color} /> : null}
        {icon === "profile" ? <UserLineIcon color={color} /> : null}
      </View>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
      {active && <View style={styles.navDot} />}
    </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoMarkImage: {
    width: 44,
    height: 44,
  },
  logoText: {
    fontFamily: "Georgia",
    fontSize: 36,
    lineHeight: 36,
    color: bloomPalette.ink,
    fontWeight: "300",
    letterSpacing: -0.8,
  },
  tagline: {
    fontSize: 8.5,
    letterSpacing: 3.2,
    color: "#9B9188",
    fontWeight: "700",
    marginTop: 3,
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
  greeting: {
    marginTop: 31,
    color: "#80786F",
    fontSize: 17,
    fontWeight: "600",
  },
  headline: {
    fontFamily: "Georgia",
    marginTop: 18,
    color: bloomPalette.ink,
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.85,
    fontWeight: "300",
  },
  headlineAccent: {
    color: "#5795C7",
  },
  bloomWrap: {
    marginTop: 16,
    alignItems: "center",
  },
  editorialCaption: {
    marginTop: 20,
    marginHorizontal: 32,
    alignItems: "center",
    opacity: 0.88,
  },
  caption: {
    fontFamily: "Georgia",
    textAlign: "center",
    color: bloomPalette.ink,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    fontWeight: "300",
  },
  rule: {
    marginTop: 16,
    width: 56,
    height: 1,
    backgroundColor: "rgba(140,129,117,0.28)",
  },
  philosophy: {
    marginTop: 16,
    textAlign: "center",
    color: "#8C8175",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0.4,
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