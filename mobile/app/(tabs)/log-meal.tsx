import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Switch, Text, TextInput } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { SafetyNotice, DataSourcePill } from '@/components/cards/DomainPrimitives';
import { colors, spacing } from '@/theme/theme';
import { useLegendProfile } from '@/state/useLegendProfile';
import { getTomEnvelope, tomLegend } from '@/data/tomLegend';

export default function LogMealScreen() {
  const [mealDescription, setMealDescription] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [carbs, setCarbs] = useState(45);
  const [protein, setProtein] = useState(22);
  const [fat, setFat] = useState(12);
  const queryClient = useQueryClient();
  const { selectedProfile, getProfileInfo } = useLegendProfile();

  // Generate forecast based on selected legend profile
  const generateForecast = () => {
    const envelope = selectedProfile === 'foot_to_floor_tom' 
      ? getTomEnvelope(mealDescription || 'breakfast routine', 'breakfast')
      : require('@/data/demoEnvelope').getDemoEnvelope();
    queryClient.setQueryData(['companion-run', envelope.runId], envelope);
    router.push(`/forecast/${envelope.runId}`);
  };

  const profileInfo = getProfileInfo();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Indicator */}
        {profileInfo && (
          <View style={styles.profileRow}>
            <Text variant="labelSmall" style={styles.profileLabel}>Active Profile</Text>
            <DataSourcePill 
              source={profileInfo.key === 'foot_to_floor_tom' ? 'real_cgm' : 'synthetic_legend'}
              label={tomLegend.name + ' • ' + profileInfo.anchorLabel}
            />
          </View>
        )}

        {/* Hero Placeholder */}
        <View style={styles.heroPlaceholder}>
          <Text variant="titleLarge" style={styles.heroEmoji}>🍽️</Text>
          <Text variant="bodySmall" style={styles.heroText}>Meal logging for T1D management</Text>
        </View>

        {/* Meal Description Area */}
        <View style={styles.card}>
          <Text variant="labelLarge" style={styles.label}>What are you eating?</Text>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={4}
            value={mealDescription}
            onChangeText={setMealDescription}
            placeholder="Describe your meal in detail (e.g., Grilled salmon with half cup of quinoa and roasted asparagus)"
            style={styles.textInput}
          />
          
          {/* AI Toggle */}
          <View style={styles.aiToggle}>
            <View style={styles.aiToggleContent}>
              <Text variant="labelLarge" style={styles.aiLabel}>AI Smart Parse</Text>
              <Switch value={aiEnabled} onValueChange={setAiEnabled} />
            </View>
          </View>
        </View>

        {/* Known Routine for Tom */}
        {selectedProfile === 'foot_to_floor_tom' && (
          <View style={styles.routineCard}>
            <Text variant="labelSmall" style={styles.routineLabel}>Known routine (breakfast)</Text>
            <Text variant="bodyMedium" style={styles.routineText}>
              {tomLegend.profile_summary.known_routine}
            </Text>
          </View>
        )}

        {/* Nutrient Chips */}
        <View style={styles.nutrientRow}>
          <View style={[styles.nutrientChip, styles.carbsChip]}>
            <Text variant="labelMedium">Carbs: <Text style={styles.nutrientValue}>{carbs}g</Text></Text>
          </View>
          <View style={[styles.nutrientChip, styles.proteinChip]}>
            <Text variant="labelMedium">Protein: <Text style={styles.nutrientValue}>{protein}g</Text></Text>
          </View>
          <View style={[styles.nutrientChip, styles.fatChip]}>
            <Text variant="labelMedium">Fat: <Text style={styles.nutrientValue}>{fat}g</Text></Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button mode="contained" onPress={generateForecast} style={styles.saveButton}>
            Save Meal
          </Button>
          <View style={styles.secondaryActions}>
            <Button mode="outlined" icon="chat-bubble" style={styles.secondaryButton}>
              Clarify
            </Button>
            <Button mode="outlined" icon="edit" style={styles.secondaryButton}>
              Edit Details
            </Button>
          </View>
        </View>

        <SafetyNotice label="Forecasts are educational simulations. This app does not recommend insulin doses, treatment changes, or emergency actions." />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.screenEdge, gap: spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  profileLabel: { color: colors.onSurfaceVariant, fontSize: 10 },
  heroPlaceholder: {
    height: 120,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroEmoji: { fontSize: 48 },
  heroText: { color: colors.onSurfaceVariant },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  label: { color: colors.onSurfaceVariant },
  textInput: { backgroundColor: colors.surfaceContainerLow },
  aiToggle: {
    backgroundColor: colors.primaryFixed + '50',
    borderRadius: 12,
    padding: spacing.sm,
  },
  aiToggleContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aiLabel: { color: colors.primary },
  routineCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  routineLabel: { color: colors.onSurfaceVariant, marginBottom: spacing.xs, fontWeight: '600' },
  routineText: { color: colors.onSurface },
  nutrientRow: { flexDirection: 'row', gap: spacing.xs },
  nutrientChip: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  carbsChip: { backgroundColor: colors.primaryFixed + '50' },
  proteinChip: { backgroundColor: colors.secondaryFixed + '50' },
  fatChip: { backgroundColor: colors.tertiaryFixed + '50' },
  nutrientValue: { fontWeight: '600' },
  actions: { gap: spacing.sm },
  saveButton: { borderRadius: 16 },
  secondaryActions: { flexDirection: 'row', gap: spacing.sm },
  secondaryButton: { flex: 1, borderRadius: 16 },
});