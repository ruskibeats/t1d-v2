import { router } from 'expo-router';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { SafetyNotice } from '@/components/cards/DomainPrimitives';
import { colors, spacing } from '@/theme/theme';
import { useLegendProfile } from '@/state/useLegendProfile';
import { tomLegend } from '@/data/tomLegend';
import { StitchCard, StitchHeader, IconBubble, PrimaryPillButton, styles as stitchStyles } from '@/components/stitch/StitchNative';
import { demoEnvelope } from '@/data/demoEnvelope';

const entries = [
  { emoji: '🍣', food: 'Sushi Dinner', delta: '+45 mg/dL', date: 'Oct 24' },
  { emoji: '🥗', food: 'Greek Salad', delta: '+12 mg/dL', date: 'Oct 23' },
  { emoji: '🍞', food: 'Toast & Eggs', delta: '+50 mg/dL', date: 'Today' },
];

export default function HomeScreen() {
  const { selectedProfile } = useLegendProfile();
  const current = selectedProfile === 'foot_to_floor_tom' ? tomLegend.current_cgm.mg_dl : 105;

  return (
    <View style={stitchStyles.screen}>
      <StitchHeader title="T1D Companion" left="menu" right="account-circle-outline" />
      <ScrollView contentContainerStyle={stitchStyles.content}>
        <StitchCard>
          <View style={local.readingHeader}>
            <Text variant="labelLarge" style={local.muted}>Current Glucose</Text>
            <View style={local.anchorPill}>
              <Text variant="labelMedium" style={local.anchorText}>{selectedProfile === 'foot_to_floor_tom' ? 'FOOT2FLOOR' : 'WELL-CONTROLLED'}</Text>
            </View>
          </View>
          <View style={local.glucoseRow}>
            <Text style={local.glucoseValue}>{current}</Text>
            <Text variant="titleMedium" style={local.unit}>mg/dL</Text>
            <MaterialCommunityIcons name="trending-neutral" size={28} color={colors.primary} style={{ marginLeft: 'auto' }} />
          </View>
          <View style={local.inlineMeta}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={local.muted}>Updated 2 mins ago · Tom Batchelor</Text>
          </View>
        </StitchCard>

        <View style={local.quickGrid}>
          <QuickAction icon="silverware-fork-knife" label="Log Meal" onPress={() => router.push('/(tabs)/log-meal')} />
          <QuickAction icon="needle" label="Log Insulin" />
          <QuickAction icon="run" label="Exercise" />
        </View>

        <StitchCard variant="low">
          <View style={local.foodHeader}>
            <View style={local.inlineMeta}>
              <MaterialCommunityIcons name="history" size={18} color={colors.primary} />
              <Text variant="titleLarge" style={local.sectionTitle}>Food Memory</Text>
            </View>
            <View style={local.infoPill}>
              <MaterialCommunityIcons name="information-outline" size={14} color={colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={local.muted}>Last 3 Entries</Text>
            </View>
          </View>

          <View style={local.segmentedControl}>
            {['Week', 'Month', 'Year', 'All'].map((label, idx) => (
              <View key={label} style={[local.segment, idx === 0 && local.segmentActive]}>
                <Text variant="labelMedium" style={idx === 0 ? local.segmentActiveText : local.segmentText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={local.averagePanel}>
            <Text variant="labelMedium" style={local.muted}>Avg. Glucose After Similar Meals</Text>
            <Text style={local.avgValue}>138 mg/dL</Text>
            <Text variant="bodySmall" style={local.muted}>Within 2 hours post-meal</Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            {entries.map((entry) => (
              <View key={entry.food} style={local.entryRow}>
                <Text style={local.emoji}>{entry.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={local.entryFood}>{entry.food}</Text>
                  <Text variant="bodySmall" style={local.muted}>{entry.date}</Text>
                </View>
                <Text variant="labelLarge" style={local.delta}>{entry.delta}</Text>
              </View>
            ))}
          </View>
        </StitchCard>

        <SafetyNotice label={demoEnvelope.safety.label} />
      </ScrollView>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress?: () => void }) {
  return (
    <Pressable style={local.quickAction} onPress={onPress} accessibilityRole="button">
      <IconBubble icon={icon} tone="primary" />
      <Text variant="labelLarge" style={local.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const local = StyleSheet.create({
  muted: { color: colors.onSurfaceVariant },
  readingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  anchorPill: { backgroundColor: colors.secondaryContainer, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  anchorText: { color: colors.onSecondaryContainer, fontWeight: '800' },
  glucoseRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.xs },
  glucoseValue: { fontSize: 48, lineHeight: 56, fontWeight: '800', color: colors.primary, letterSpacing: -1 },
  unit: { color: colors.onSurfaceVariant, fontWeight: '600' },
  inlineMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickGrid: { flexDirection: 'row', gap: spacing.sm },
  quickAction: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerLowest, borderRadius: 24, padding: spacing.md, gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(193,198,211,0.35)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 2 },
  quickLabel: { color: colors.onSurface, fontWeight: '800', textAlign: 'center' },
  foodHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.onSurface, fontWeight: '800' },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  segmentedControl: { flexDirection: 'row', gap: spacing.xs, backgroundColor: 'rgba(255,255,255,0.35)', padding: 4, borderRadius: 999, marginTop: spacing.md },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 999 },
  segmentActive: { backgroundColor: '#ffffff' },
  segmentText: { color: colors.onSurfaceVariant, fontWeight: '700' },
  segmentActiveText: { color: colors.primary, fontWeight: '800' },
  averagePanel: { backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 16, padding: spacing.md, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.8)', marginVertical: spacing.md },
  avgValue: { color: colors.primary, fontWeight: '800', fontSize: 32, lineHeight: 40 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 12, padding: spacing.sm },
  emoji: { fontSize: 24 },
  entryFood: { color: colors.onSurface, fontWeight: '700' },
  delta: { color: colors.primary, fontWeight: '800' },
});
