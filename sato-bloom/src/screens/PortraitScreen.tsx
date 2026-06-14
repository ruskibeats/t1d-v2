import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BloomClock } from "../features/bloom/BloomClock";
import { todayBloomWindows } from "../features/bloom/bloomSampleData";
import { bloomPalette } from "../features/bloom/bloomColors";
import { Colors, TypeScale } from '@/constants/theme';
import { useNavigation } from "../navigation/NavigationProvider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function PortraitScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

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
              currentHour={19}
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
      </View>
    </GestureHandlerRootView>
  );

}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 100,
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