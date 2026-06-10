import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { bloomPalette } from "./bloomColors";

type GlucoseReadoutProps = {
  value?: number;
  unit?: string;
  trend?: string;
  size?: number;
};

export function GlucoseReadout({
  value = 110,
  unit = "mg/dL",
  trend = "~",
  size = 220,
}: GlucoseReadoutProps) {
  const center = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* highlight duplicate — faint light above-left */}
      <Text style={[styles.value, styles.valueHighlight]}>{value}</Text>
      {/* shadow duplicate — deeper blurred below-right */}
      <Text style={[styles.value, styles.valueShadow]}>{value}</Text>
      {/* main value — deep sumi/charcoal */}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  value: {
    fontSize: 58,
    lineHeight: 62,
    fontWeight: "400",
    letterSpacing: -1.8,
    color: bloomPalette.ink,
    // main soft shadow
    textShadowColor: "rgba(50, 38, 24, 0.28)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    // deep serif
    fontFamily: "Georgia",
  },
  valueHighlight: {
    position: "absolute",
    color: "rgba(255, 247, 232, 0.45)",
    transform: [{ translateX: -1 }, { translateY: -1 }],
    textShadowColor: "transparent",
  },
  valueShadow: {
    position: "absolute",
    color: "rgba(71, 47, 28, 0.22)",
    transform: [{ translateX: 1.4 }, { translateY: 2.4 }],
    textShadowColor: "rgba(60, 38, 20, 0.18)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  unit: {
    marginTop: -2,
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: -0.4,
    color: "#C98A4B", // warm amber
    textShadowColor: "rgba(255, 248, 230, 0.38)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});