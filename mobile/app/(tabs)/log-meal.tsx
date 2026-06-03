import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Switch, Text, TextInput } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { SafetyNotice, DataSourcePill } from '@/components/cards/DomainPrimitives';
import { colors, spacing } from '@/theme/theme';
import { useLegendProfile } from '@/state/useLegendProfile';
import { getTomEnvelope, tomLegend } from '@/data/tomLegend';
import { OutlinePillButton, PrimaryPillButton, StitchCard, StitchHeader, StitchHero, stitchImages, styles as stitchStyles } from '@/components/stitch/StitchNative';

export default function LogMealScreen() {
  const [mealDescription, setMealDescription] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const queryClient = useQueryClient();
  const { selectedProfile, getProfileInfo } = useLegendProfile();

  const generateForecast = () => {
    const envelope = getTomEnvelope(mealDescription || 'breakfast routine', 'breakfast');
    queryClient.setQueryData(['companion-run', envelope.runId], envelope);
    router.push(`/forecast/${envelope.runId}`);
  };

  const profileInfo = getProfileInfo();

  return (
    <View style={stitchStyles.screen}>
      <StitchHeader title="Log Meal" right="dots-vertical" />
      <ScrollView contentContainerStyle={stitchStyles.content}>
        <StitchHero uri={stitchImages.logMealHero} height={240} label="Dinner • Today 19:45" />

        {profileInfo ? (
          <View style={local.profileRow}>
            <Text variant="labelSmall" style={local.profileLabel}>Active Profile</Text>
            <DataSourcePill source={profileInfo.key === 'foot_to_floor_tom' ? 'real_cgm' : 'synthetic_legend'} label={`${tomLegend.name} • ${profileInfo.anchorLabel}`} />
          </View>
        ) : null}

        <StitchCard>
          <Text variant="titleLarge" style={local.question}>What are you eating?</Text>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={4}
            value={mealDescription}
            onChangeText={setMealDescription}
            placeholder="Describe your meal in detail"
            style={local.input}
            outlineColor="transparent"
            activeOutlineColor={colors.primary}
          />
          <View style={local.aiToggle}>
            <View style={local.inlineMeta}>
              <MaterialCommunityIcons name="auto-fix" size={20} color={colors.primary} />
              <Text variant="labelLarge" style={local.aiLabel}>AI Smart Parse</Text>
            </View>
            <Switch value={aiEnabled} onValueChange={setAiEnabled} />
          </View>
        </StitchCard>

        <StitchCard variant="low">
          <Text variant="labelLarge" style={local.routineLabel}>KNOWN ROUTINE</Text>
          <Text variant="bodyMedium" style={local.routineText}>{tomLegend.profile_summary.known_routine}</Text>
        </StitchCard>

        <View style={local.nutrientRow}>
          <Nutrient icon="nutrition" label="Carbs" value="45g" />
          <Nutrient icon="arm-flex-outline" label="Protein" value="22g" />
          <Nutrient icon="water" label="Fat" value="12g" />
        </View>

        <View style={local.actionGrid}>
          <View style={local.fullSpan}>
            <PrimaryPillButton label="Save Meal" icon="check-circle" onPress={generateForecast} />
          </View>
          <View style={local.halfSpan}>
            <OutlinePillButton label="Clarify" icon="chat" />
          </View>
          <View style={local.halfSpan}>
            <OutlinePillButton label="Edit Details" icon="note-edit" />
          </View>
          <View style={local.fullSpan}>
            <OutlinePillButton label="Export Entry" icon="export-variant" />
          </View>
        </View>

        <SafetyNotice label="Forecasts are educational simulations. This app does not recommend insulin doses, treatment changes, or emergency actions." />
      </ScrollView>
    </View>
  );
}

function Nutrient({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) {
  return (
    <View style={local.nutrientChip}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
      <Text variant="labelMedium" style={local.nutrientText}>{label}: <Text style={local.nutrientValue}>{value}</Text></Text>
    </View>
  );
}

const local = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  profileLabel: { color: colors.onSurfaceVariant, fontSize: 10, fontWeight: '700' },
  question: { color: colors.onSurface, fontWeight: '800', marginBottom: spacing.md },
  input: { backgroundColor: colors.surfaceContainerLow, minHeight: 112, borderRadius: 16 },
  aiToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 16, backgroundColor: 'rgba(212,227,255,0.35)' },
  inlineMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  aiLabel: { color: colors.primary, fontWeight: '800' },
  routineLabel: { color: colors.outline, fontWeight: '800', marginBottom: spacing.xs },
  routineText: { color: colors.onSurface, lineHeight: 22 },
  nutrientRow: { flexDirection: 'row', gap: spacing.xs },
  nutrientChip: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, borderRadius: 16, backgroundColor: colors.surfaceContainerLowest, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(193,198,211,0.35)' },
  nutrientText: { color: colors.onSurfaceVariant, textAlign: 'center' },
  nutrientValue: { color: colors.primary, fontWeight: '800' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fullSpan: { width: '100%' },
  halfSpan: { flex: 1, minWidth: '45%' },
});
