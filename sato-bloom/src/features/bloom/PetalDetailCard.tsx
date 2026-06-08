import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { BloomWindow } from "./bloomTypes";

type PetalDetailCardProps = {
  window: BloomWindow;
  anchor: { x: number; y: number };
  containerSize: number;
  onClose?: () => void;
  onExpand?: () => void;
};

function formatWindow(startHour: number, endHour: number) {
  const fmt = (h: number) => {
    const normalized = h % 24;
    if (normalized === 0) return "12 AM";
    if (normalized === 12) return "12 PM";
    if (normalized < 12) return `${normalized} AM`;
    return `${normalized - 12} PM`;
  };
  return `${fmt(startHour)}–${fmt(endHour)}`;
}

export function PetalDetailCard({
  window,
  anchor,
  containerSize,
  onExpand,
}: PetalDetailCardProps) {
  const cardWidth = Math.min(332, containerSize - 34);
  const left = Math.max(16, Math.min(containerSize - cardWidth - 16, anchor.x - cardWidth / 2));
  const top = anchor.y < containerSize / 2 ? anchor.y + 18 : anchor.y - 154;

  const phrase =
    window.state === "reactive"
      ? "More reactive window"
      : window.state === "balanced"
      ? "Steady window"
      : "Quiet window";

  return (
    <View style={[styles.card, { left, top, width: cardWidth }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.cardTime}>{formatWindow(window.startHour, window.endHour)}</Text>
          <Text style={styles.cardTitle}>{phrase}</Text>
        </View>
        <Pressable onPress={onExpand} style={styles.expandButton}>
          <Text style={styles.expandText}>See why</Text>
        </Pressable>
      </View>

      <View style={styles.metricsRail}>
        <MetricPill label="Average" value={`${window.glucoseAvg ?? "—"}`} suffix="mg/dL" />
        <MetricPill label="Peak" value={`${window.glucosePeak ?? "—"}`} suffix="mg/dL" />
        <MetricPill label="Return" value={window.state === "reactive" ? "2h 40m" : "Gentle"} />
      </View>

      {window.eventContext ? <Text style={styles.context}>{window.eventContext}</Text> : null}

      <Text style={styles.reason}>
        {window.classificationReason ??
          "This petal reflects how your body moved through this part of the day."}
      </Text>
    </View>
  );
}

function MetricPill({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}{suffix ? <Text style={styles.metricSuffix}> {suffix}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    zIndex: 3,
    backgroundColor: "rgba(255,250,242,0.95)",
    borderWidth: 1,
    borderColor: "#E7DCCF",
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 13,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleBlock: {
    flex: 1,
  },
  cardTime: {
    color: "#8C8175",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  cardTitle: {
    fontFamily: "Georgia",
    marginTop: 4,
    color: "#241F1B",
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "300",
  },
  metricsRail: {
    marginTop: 12,
    flexDirection: "row",
    gap: 7,
  },
  metricPill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 9,
    backgroundColor: "rgba(245,235,221,0.62)",
    borderWidth: 1,
    borderColor: "rgba(231,220,207,0.72)",
  },
  metricLabel: {
    color: "#8C8175",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  metricValue: {
    marginTop: 3,
    color: "#241F1B",
    fontSize: 12,
    fontWeight: "800",
  },
  metricSuffix: {
    color: "#8C8175",
    fontSize: 10,
    fontWeight: "600",
  },
  context: {
    marginTop: 10,
    color: "#625A52",
    fontSize: 12,
    lineHeight: 17,
  },
  reason: {
    fontFamily: "Georgia",
    marginTop: 7,
    color: "#625A52",
    fontSize: 13,
    lineHeight: 18,
  },
  expandButton: {
    marginTop: 1,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: "rgba(232,121,95,0.10)",
  },
  expandText: {
    color: "#D76F55",
    fontSize: 12,
    fontWeight: "800",
  },
});