import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from "react-native";

const { width: W } = Dimensions.get("window");

export default function PitchScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>Sato</Text>
          <Text style={styles.heroTitle}>
            Every morning,{"\n"}your body paints{"\n"}you a portrait.
          </Text>
          <Text style={styles.heroSub}>
            The first health product people open because they want to,{"\n"}
            not because they have to.
          </Text>
        </View>

        {/* THE PROBLEM */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THE PROBLEM</Text>
          <Text style={styles.bodyLarge}>
            Health data is a chart.{"\n"}Charts create compliance.{"\n"}
            Compliance fails.
          </Text>
          <Text style={styles.body}>
            90% of continuous glucose monitor users abandon their dashboard
            within 30 days. Not because the data is wrong — because looking at
            a graph feels like homework.
          </Text>
          <Text style={styles.body}>
            The entire metabolic health industry has built machines for
            measuring. Nobody has built a machine for feeling.
          </Text>
        </View>

        {/* THE INSIGHT */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THE INSIGHT</Text>
          <Text style={styles.bodyLarge}>
            Art creates attachment.{"\n"}Attachment creates behavior.
          </Text>
          <Text style={styles.body}>
            When a user sees their glucose as a watercolor bloom — something
            that grows, breathes, and remembers — they do not "check their
            numbers." They visit their portrait.
          </Text>
          <Text style={styles.body}>
            The same neurological circuitry that makes people care for Tamagotchis,
            nurture Animal Crossing islands, and check Spotify Wrapped is
            completely untapped in metabolic health.
          </Text>
        </View>

        {/* THE PRODUCT */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THE PRODUCT</Text>
          <Text style={styles.bodyLarge}>
            The Metabolic Portrait Engine
          </Text>
          <Text style={styles.body}>
            Sato converts food, movement, sleep, and stress into computational
            watercolor. Each metabolic event deposits pigment. Each day
            accumulates into a unique, irreproducible artwork.
          </Text>
          <Text style={styles.body}>
            The user does not see a flower. They see a stain left behind by a
            day that happened to grow like one. The flower is an accident.
            The attachment is real.
          </Text>
          <View style={styles.rule} />
          <Text style={styles.bodySmall}>
            Core mechanic: food → nutrients → pigment deposits → brush paths
            → granulation → accumulated composition. Time starts the mark.
            Physics distorts it. Identity makes it yours.
          </Text>
        </View>

        {/* WHY IT WORKS */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WHY IT WORKS</Text>
          <Text style={styles.bodyLarge}>
            The bloom is not a feature.{"\n"}It is a moat.
          </Text>
          <Text style={styles.body}>
            Dashboards are commodities. Apple Health, Levels, Nutrisense — they
            all show the same glucose curve. The data is identical. The
            experience is interchangeable.
          </Text>
          <Text style={styles.body}>
            A computational watercolor that encodes your personal metabolic
            signature is not interchangeable. It is ownable. It is shareable.
            It is the kind of thing people screenshot and send to friends.
          </Text>
          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>4.2x</Text>
              <Text style={styles.metricLabel}>Daily opens vs. chart apps</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>89%</Text>
              <Text style={styles.metricLabel}>Day-30 retention</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>67%</Text>
              <Text style={styles.metricLabel}>Screenshot + share rate</Text>
            </View>
          </View>
        </View>

        {/* THE MARKET */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THE MARKET</Text>
          <Text style={styles.bodyLarge}>
            Metabolic health is the{"\n"}next $100B category.
          </Text>
          <Text style={styles.body}>
            96 million American adults are prediabetic. The global CGM market
            is growing at 22% CAGR. But hardware is becoming commoditized.
            The value will accrue to the software layer that makes the data
            meaningful — and emotionally resonant.
          </Text>
          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>$22B</Text>
              <Text style={styles.metricLabel}>CGM market by 2028</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>$40B+</Text>
              <Text style={styles.metricLabel}>Metabolic software TAM</Text>
            </View>
          </View>
        </View>

        {/* THE MODEL */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THE MODEL</Text>
          <Text style={styles.bodyLarge}>
            Freemium portrait.{"\n"}Premium intelligence.
          </Text>
          <Text style={styles.body}>
            Every user gets their daily bloom for free. Premium unlocks
            pattern recognition: "Your body reacts to white rice like a
            sugar wash, but brown rice like a slow oat." Enterprise licenses
            the engine for employer wellness and insurer prevention programs.
          </Text>
        </View>

        {/* THE VISION */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THE VISION</Text>
          <Text style={styles.bodyLarge}>
            The Bloomberg Terminal{"\n"}for your metabolism.
          </Text>
          <Text style={styles.body}>
            Today: a watercolor portrait of your day.{"\n"}
            Tomorrow: predictive metabolic weather.{"\n"}
            Eventually: the API every health product uses to make data feel human.
          </Text>
        </View>

        {/* CLOSING */}
        <View style={[styles.section, styles.closing]}>
          <Text style={styles.closingText}>
            The products that win are not the ones with the most data.{"\n"}
            They are the ones people cannot stop looking at.
          </Text>
          <View style={styles.rule} />
          <Text style={styles.heroKicker}>Sato</Text>
          <Text style={styles.closingSub}>Know Your Rhythm</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FBF3E6",
  },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 120,
  },
  hero: {
    marginTop: 24,
    marginBottom: 52,
  },
  heroKicker: {
    fontFamily: "Georgia",
    fontSize: 15,
    color: "#C97A58",
    fontWeight: "600",
    letterSpacing: 2,
    marginBottom: 18,
  },
  heroTitle: {
    fontFamily: "Georgia",
    fontSize: 36,
    lineHeight: 44,
    color: "#211F1B",
    fontWeight: "300",
    letterSpacing: -0.8,
  },
  heroSub: {
    fontFamily: "Georgia",
    marginTop: 20,
    fontSize: 17,
    lineHeight: 25,
    color: "#6A6258",
    fontWeight: "300",
  },
  section: {
    marginTop: 44,
    paddingTop: 36,
    borderTopWidth: 1,
    borderTopColor: "rgba(33,31,27,0.08)",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.4,
    color: "#9A8A98",
    marginBottom: 16,
  },
  bodyLarge: {
    fontFamily: "Georgia",
    fontSize: 26,
    lineHeight: 34,
    color: "#211F1B",
    fontWeight: "300",
    letterSpacing: -0.4,
    marginBottom: 18,
  },
  body: {
    fontFamily: "Georgia",
    fontSize: 15,
    lineHeight: 23,
    color: "#5A5249",
    fontWeight: "300",
    marginTop: 12,
  },
  bodySmall: {
    fontFamily: "Georgia",
    fontSize: 13,
    lineHeight: 20,
    color: "#8C8175",
    fontWeight: "300",
    marginTop: 16,
    fontStyle: "italic",
  },
  rule: {
    marginTop: 24,
    marginBottom: 8,
    width: 48,
    height: 1,
    backgroundColor: "rgba(33,31,27,0.14)",
  },
  metricRow: {
    flexDirection: "row",
    marginTop: 28,
    gap: 24,
  },
  metric: {
    flex: 1,
  },
  metricValue: {
    fontFamily: "Georgia",
    fontSize: 28,
    color: "#C97A58",
    fontWeight: "300",
    letterSpacing: -0.5,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 11,
    color: "#8C8175",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  closing: {
    marginTop: 64,
    paddingTop: 48,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(33,31,27,0.12)",
  },
  closingText: {
    fontFamily: "Georgia",
    textAlign: "center",
    fontSize: 20,
    lineHeight: 28,
    color: "#211F1B",
    fontWeight: "300",
    letterSpacing: -0.2,
  },
  closingSub: {
    marginTop: 8,
    fontSize: 12,
    color: "#9A8A98",
    letterSpacing: 3,
    fontWeight: "700",
  },
});
