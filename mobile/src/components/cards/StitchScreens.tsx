import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { colors, spacing } from '@/theme/theme';

// Stitch HTML screenshots for reference
// These URLs point to the actual Stitch-generated designs
export const STITCH_SCREEN_URLS = {
  forecast: 'https://lh3.googleusercontent.com/aida/AP1WRLt9N9sUc_a09_qC6fBZ__zM94Y4T1Shorjzi3noKe_V1x3y3_9kBQgTD7Qax7TzxoFAdekEj9_xOQeiwaBqtmvtg6CwsUjhC7Hs0WIODvQtDn8v51D4EhyiFffTAU_6R9HMETLcMDpNEU-Z2BqzvuHdGm0hwYJnagcCFus7Eu3J_sxSTRVr29MgJFt5l7IvVsIB3CmtT-K7YVKkr3sIJcE0QIjFn4GCKdyC2LQj1w8NJ5dnkuczicADM8E',
  confidence: 'https://lh3.googleusercontent.com/aida/AP1WRLvU44VJlbMKRglSB6sfPe8VJQr5b85kru_M7EUq9jqWxNLobRryd87Q49y14XFxUm6MwcfHxOzz2csGqTaJEFrfeUPsDCSkvCtOF0x7TtM7TGC2saNPNR-jQHZs-LDPJxcT7YfLzMVTCU9TdLY-WKP9NG03OSd_xbiGYiZncSaGFzxg0BI9H4lihQVjxcRzd5J6jaIgSbuhNs0ZWboFwHX4sjSVkGpCSj4UnrhIPMV2QTDKev-MwK_AUwE',
  parsedFoods: 'https://lh3.googleusercontent.com/aida/AP1WRLuC080ZQzdrEvPxaqs4cgud0fR01QsYxzChyQ5RNpiozKRJvXE6d2yDoBheE1zophGK0NSrcwT7isivyPLdf-yyP_iazDdRVFtw4RG78VLIEh6nfeBMjaBu5nqG1wnGzeFgjtHZrkWzXEkGCX6-8XjfMCpTOJbyIsLBub1Q5VtMNwFm3BVFp231sraU7J7LqvGDR6Y9aMm_-RDXNvci34d0bG0w9o4fApH6K8dPSDg-jg_XKoulfv3oltk',
  foodEvidence: 'https://lh3.googleusercontent.com/aida/AP1WRLtRFJO9tmp6htjTa0e4fXloEwh5MAdNNaotGz7Sf1re9xWhJWePhXC-3xH9vflW5CLA116q_HHT6YLcpkqpBQ4wG1jdTRzOocVSOMs8jDtI1f3ubWGUvyIMqPok_9gUFBzLGftRc7TpTywqbBZMC-j5WTmszr_b7_hPu9s8IsjJ4crBNlFtnukWboV9EdNcot65rHW3ZoewAfv4ZPsLHI6eZ4Gfi6XPu6VnEo13bvi-t6TsHT4mWWw0Ux0',
  mealMemory: 'https://lh3.googleusercontent.com/aida/AP1WRLtKrZJtVM054QvX36bmfjWNEb_jiOZtcDF2vzBbBz3bY0lKBshbif_jsODgCzgszsyWLMeyh6bUE-X4JgmTSZUitvAxPDepApDUmxScfIQg83fH8fNrMO_hq4_HS-XlSuKrMsbTuOim5QRLxDFfaeVT6HmebwkSalxuh4Ua7BJxQ_nruhhJZYLh7P9rs3jxrEUPy4BSQCfCvH24IbyWNZXYF0g-d7bBrVbf96Zu8GqVR4XrB_knBkv2YVw',
};

// ViewShot component to display Stitch screenshot references
export function StitchScreenReference({ screenType }: { screenType: keyof typeof STITCH_SCREEN_URLS }) {
  return (
    <View style={styles.referenceCard}>
      <Text variant="labelSmall" style={styles.referenceLabel}>
        Stitch Design Reference
      </Text>
      <Text variant="bodySmall" style={styles.referenceText}>
        {screenType} screen matches Stitch output
      </Text>
      <View style={styles.colorSwatch}>
        {colors.primary && (
          <View style={[styles.swatch, { backgroundColor: colors.primary }]} />
        )}
      </View>
    </View>
  );
}

// Enhanced ForecastCard matching Stitch design exactly
export function StitchForecastCard({ card }: { card: any }) {
  const payload = card.payload || {};
  const theme = useTheme();
  
  // Extract Stitch-style design tokens
  const baseline = payload.baselineMgDl || 0;
  const peak = payload.peakMgDl || 0;
  const timeMinutes = payload.peakTimeMinutes || 0;
  const uncertainty = payload.uncertaintyRangeMgDl || [peak, peak];
  
  return (
    <Card style={[styles.card, { backgroundColor: colors.surfaceContainerLowest }]}>
      <Card.Content>
        {/* Header matching Stitch: title + confidence + source */}
        <View style={styles.headerRow}>
          <Text variant="titleLarge" style={{ color: colors.primary, fontWeight: '600' }}>
            Expected glucose shape
          </Text>
          <View style={styles.headerBadges}>
            <View style={[styles.confidenceBadge, { backgroundColor: '#d4e3ff' }]}>
              <Text variant="labelSmall" style={{ color: colors.primary }}>MEDIUM</Text>
            </View>
          </View>
        </View>
        
        {/* Main metrics in Stitch-style layout */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text variant="labelSmall" style={styles.muted}>Baseline</Text>
            <Text variant="headlineMedium" style={{ color: colors.primary }}>{baseline}</Text>
            <Text variant="labelSmall" style={styles.muted}>mg/dL</Text>
          </View>
          <View style={styles.metric}>
            <Text variant="labelSmall" style={styles.muted}>Peak</Text>
            <Text variant="headlineMedium" style={{ color: colors.primary }}>{peak}</Text>
            <Text variant="labelSmall" style={styles.muted}>mg/dL</Text>
          </View>
          <View style={styles.metric}>
            <Text variant="labelSmall" style={styles.muted}>Time</Text>
            <Text variant="headlineMedium">{timeMinutes}</Text>
            <Text variant="labelSmall" style={styles.muted}>min</Text>
          </View>
        </View>
        
        {/* Uncertainty range */}
        {uncertainty[1] > uncertainty[0] ? (
          <Text variant="bodySmall" style={styles.muted}>
            Uncertainty: {uncertainty[0]}–{uncertainty[1]} mg/dL
          </Text>
        ) : null}
        
        {/* Action buttons matching Stitch */}
        <View style={styles.actionsRow}>
          <Text variant="bodySmall" style={styles.sourceLabel}>
            Tom Batchelor / Foot2Floor
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  referenceCard: {
    padding: spacing.sm,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  referenceLabel: {
    color: '#5F6B6D',
    fontWeight: '600',
    marginBottom: 2,
  },
  referenceText: {
    color: '#5F6B6D',
  },
  colorSwatch: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  confidenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  muted: {
    color: '#5F6B6D',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.md,
  },
  metric: {
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  sourceLabel: {
    color: '#5F6B6D',
    fontStyle: 'italic',
  },
});