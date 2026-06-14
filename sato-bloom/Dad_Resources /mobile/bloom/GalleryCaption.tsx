import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BloomWindow } from "./bloomTypes";

type GalleryCaptionProps = {
  window: BloomWindow;
  anchor: { x: number; y: number };
};

export function GalleryCaption({ window, anchor }: GalleryCaptionProps) {
  return (
    <View style={[styles.caption, { left: anchor.x - 48, top: anchor.y - 38 }]}>
      <Text style={styles.time}>
        {window.startHour === 12 ? "1 PM" : window.label}
      </Text>
      <Text style={styles.body}>Your body asked for a little more time.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    position: "absolute",
    width: 130,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,251,244,0.78)",
    borderWidth: 1,
    borderColor: "rgba(224,214,200,0.6)",
  },
  time: {
    color: "#5795C7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  body: {
    marginTop: 3,
    fontFamily: "Georgia",
    color: "#241F1B",
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "300",
  },
});