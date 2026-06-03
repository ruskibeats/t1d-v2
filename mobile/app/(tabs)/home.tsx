import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, IconButton, Menu, Text } from 'react-native-paper';
import { DemoModeBanner, DomainCard, SafetyNotice, DataSourcePill } from '@/components/cards/DomainPrimitives';
import { demoEnvelope } from '@/data/demoEnvelope';
import { colors, spacing } from '@/theme/theme';
import { useLegendProfile } from '@/state/useLegendProfile';
import { tomLegend } from '@/data/tomLegend';

type TimeRange = 'week' | 'month' | 'year' | 'all';

const mockFoodHistory = [
  { id: 1, food: 'Pepperoni Pizza', date: 'Today 19:30', avgRise: '+45 mg/dL', confidence: 'high' },
  { id: 2, food: 'Grilled Chicken Salad', date: 'Yesterday 12:15', avgRise: '+12 mg/dL', confidence: 'medium' },
  { id: 3, food: 'Oatmeal with Berries', date: '2 days ago 08:00', avgRise: '+28 mg/dL', confidence: 'high' },
];

export default function HomeScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [menuVisible, setMenuVisible] = useState(false);
  const { selectedProfile, getProfileInfo } = useLegendProfile();

  const getAvgGlucose = () => {
    const avgs = { week: 125, month: 132, year: 118, all: 128 };
    return avgs[timeRange];
  };

  const getCurrentGlucose = () => {
    return selectedProfile === 'foot_to_floor_tom' ? tomLegend.current_cgm.mg_dl : 105;
  };

  const getAnchorLabel = () => {
    return selectedProfile === 'foot_to_floor_tom' ? tomLegend.anchor_label : 'WELL-CONTROLLED';
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <DemoModeBanner dataMode={demoEnvelope.dataMode} sourceLabel={demoEnvelope.sourceLabel} />
      
      {/* Current Reading Section */}
      <View style={styles.readingCard}>
        <View style={styles.readingHeader}>
          <Text variant="labelLarge" style={styles.label}>Current Glucose</Text>
          <View style={styles.badge}>
            <Text variant="labelMedium" style={styles.badgeText}>{getAnchorLabel()}</Text>
          </View>
        </View>
        <View style={styles.glucoseRow}>
          <Text variant="displayMedium" style={styles.glucoseValue}>{getCurrentGlucose()}</Text>
          <Text variant="titleMedium" style={styles.unit}>mg/dL</Text>
          <Text variant="headlineSmall" style={styles.trend}>→</Text>
        </View>
        {selectedProfile === 'foot_to_floor_tom' && (
          <Text variant="bodySmall" style={styles.muted}>
            Tom Batchelor • Updated {new Date(tomLegend.current_cgm.timestamp).toLocaleTimeString()}
          </Text>
        )}
      </View>

      {/* Profile Indicator */}
      <View style={styles.profileRow}>
        <Text variant="labelSmall" style={styles.profileLabel}>Profile</Text>
        <DataSourcePill 
          source={selectedProfile === 'foot_to_floor_tom' ? 'real_cgm' : 'synthetic_legend'}
          label={selectedProfile === 'foot_to_floor_tom' ? tomLegend.name : 'Demo'}
        />
      </View>

      {/* Quick Actions Grid */}
      <View style={styles.actionsGrid}>
        <Button
          mode="contained"
          icon="flatware"
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/meals')}
        >
          Log Meal
        </Button>
        <Button mode="outlined" icon="syringe" style={styles.actionButton} onPress={() => router.push('/meal-entry')}>
          Log Insulin
        </Button>
        <Button mode="outlined" icon="directions-run" style={styles.actionButton}>
          Exercise
        </Button>
      </View>

      {/* Food Memory Card */}
      <Card mode="outlined" style={styles.foodCard}>
        <Card.Content>
          <View style={styles.foodHeader}>
            <Text variant="titleMedium" style={styles.foodTitle}>Food Memory</Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={<Button mode="text" onPress={() => setMenuVisible(true)}>{timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}</Button>}
            >
              <Menu.Item onPress={() => { setTimeRange('week'); setMenuVisible(false); }} title="Last Week" />
              <Menu.Item onPress={() => { setTimeRange('month'); setMenuVisible(false); }} title="Last Month" />
              <Menu.Item onPress={() => { setTimeRange('year'); setMenuVisible(false); }} title="Last Year" />
              <Menu.Item onPress={() => { setTimeRange('all'); setMenuVisible(false); }} title="All Time" />
            </Menu>
          </View>
          
          {/* Average Graph Placeholder */}
          <View style={styles.avgGraph}>
            <Text variant="displaySmall" style={styles.avgValue}>{getAvgGlucose()} mg/dL</Text>
            <Text variant="bodySmall" style={styles.avgLabel}>average after similar meals</Text>
          </View>

          {/* Last 3 Food History */}
          <View style={styles.historyList}>
            {mockFoodHistory.map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <View style={styles.historyIcon}>
                  <Text style={styles.foodEmoji}>🍕</Text>
                </View>
                <View style={styles.historyInfo}>
                  <Text variant="bodyLarge" style={styles.foodName}>{item.food}</Text>
                  <Text variant="bodySmall" style={styles.foodDate}>{item.date}</Text>
                </View>
                <Text variant="bodyMedium" style={styles.avgRise}>{item.avgRise}</Text>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Forecast Chart Placeholder */}
      <Card mode="outlined" style={styles.chartCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.chartTitle}>Forecast (3h)</Text>
        </Card.Content>
      </Card>

      <SafetyNotice label={demoEnvelope.safety.label} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.screenEdge, gap: spacing.md, backgroundColor: colors.surface, flexGrow: 1 },
  readingCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  readingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  label: { color: colors.onSurfaceVariant },
  badge: { backgroundColor: colors.secondaryContainer, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { color: colors.onSecondaryContainer, fontWeight: '600', fontSize: 12 },
  glucoseRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginVertical: spacing.xs },
  glucoseValue: { color: colors.primary, fontWeight: '700' },
  unit: { color: colors.onSurfaceVariant },
  trend: { color: colors.primary, marginLeft: 'auto' },
  muted: { color: colors.onSurfaceVariant },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  profileLabel: { color: colors.onSurfaceVariant, fontSize: 10 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: { flex: 1, minWidth: '30%' },
  foodCard: { backgroundColor: colors.surfaceContainerLowest },
  foodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  foodTitle: { color: colors.onSurface },
  avgGraph: { alignItems: 'center', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, marginBottom: spacing.md },
  avgValue: { color: colors.primary, fontWeight: '700' },
  avgLabel: { color: colors.onSurfaceVariant },
  historyList: { gap: spacing.sm },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  historyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  foodEmoji: { fontSize: 20 },
  historyInfo: { flex: 1 },
  foodName: { color: colors.onSurface },
  foodDate: { color: colors.onSurfaceVariant },
  avgRise: { color: colors.onSurfaceVariant },
  chartCard: { backgroundColor: colors.surfaceContainerLowest },
  chartTitle: { color: colors.onSurface },
});