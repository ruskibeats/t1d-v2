import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, TypeScale } from '@/constants/theme';
import { BloomFlower } from '@/components/BloomFlower';
import { PaperBackground } from '@/components/PaperBackground';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '../navigation/NavigationProvider';
import { useGlucose } from '../context/GlucoseContext';
import { DataDashboard } from '../components/data/DataDashboard';
import { getSatoPageData } from '../services/api';
import { SatoPageData } from '../types/data';

const SETTINGS = [
  {
    section: 'Sensor',
    items: [
      { name: 'CGM Connection', sub: 'Streaming from Dexcom Cloud' },
      { name: 'Target Range', sub: 'Currently set to 70–180 mg/dL' },
      { name: 'Alert Thresholds', sub: 'Hypo alert triggers at 70 mg/dL' },
    ],
  },
  {
    section: 'Sato AI',
    items: [
      { name: 'Learning Preferences', sub: 'Tailored to delayed post-meal rise observations' },
      { name: 'Pattern Sensitivity', sub: 'Sato filters for significant shifts' },
      { name: 'Notification Style', sub: 'Quiet reflections at morning and dusk' },
    ],
  },
  {
    section: 'Privacy',
    items: [
      { name: 'Data Sharing', sub: 'Secure, encrypted storage on device' },
      { name: 'Export My Data', sub: 'Generate PDF or JSON archives' },
      { name: 'Delete History', sub: 'Permanently wipe local calibration memory' },
    ],
  },
];

const MOCK_SATO_PAGE_DATA: SatoPageData = {
  page: {
    title: 'Sato Food Memory',
    subtitle: 'Your food memory is ready.',
    tone: 'calm',
  },
  hero: {
    message: 'Your food memory is ready.',
    mood: 'curious',
    calmNarrative: 'Welcome to Sato. Explore nutritional insights, manage recipes, and build your personalized food knowledge graph — all backed by reliable data.',
  },
  graphSummary: {
    ageAvailable: true,
    graphExists: true,
    vertices: 42,
    edges: 87,
    lastSyncAt: new Date().toISOString(),
    lastSyncStatus: 'success',
  },
  foodGraph: {
    query: 'Chicken Caesar salad',
    answer: 'Chicken Caesar salad contains grilled chicken (high protein, low carb), romaine lettuce (fiber), croutons (carbs), and parmesan (fats).',
    facts: [
      { calories: 350, protein: 32, carbs: 12, fat: 18, fiber: 3, sugars: 2, sodium: 850 }
    ],
    sources: [],
    conflicts: [],
    uncertainty: 0.15,
  },
  companionCards: {
    template: null,
    demoCard: null,
  },
  recipeParser: {
    template: null,
    recommendedDemo: {
      title: 'Best Ever Lasagna',
      sourceUrl: 'https://www.gimmesomeoven.com/best-lasagna/',
      ingredientCount: 5,
      prepTime: '45 minutes',
      cookTime: '75 minutes',
      nutritionSource: 'page_provided',
      safetyNote: 'Educational only.',
    },
  },
  audit: {
    provenance: 'Mock Data',
    uncertaintyScore: 0.2,
    safetyNote: 'Educational purposes only.',
    educationalOnly: true,
  },
  actions: [],
};

const MOCK_MEALS = [
  {
    entry_date: new Date().toISOString().split('T')[0],
    calories: 640,
    protein: 34,
    carbs: 72,
    fat: 22,
    fiber: 8,
    sugars: 12,
    sodium: 480,
  },
  {
    entry_date: new Date().toISOString().split('T')[0],
    calories: 420,
    protein: 28,
    carbs: 45,
    fat: 12,
    fiber: 5,
    sugars: 6,
    sodium: 320,
  }
];

const MOCK_CHECK_IN = {
  id: 'mock-checkin',
  weight: 172.5,
  body_fat_percentage: 16.2,
  steps: 10420,
  entry_date: new Date().toISOString(),
};

const MOCK_EXERCISES = [
  {
    id: 'mock-ex-1',
    exercise_name: 'Afternoon Run',
    calories_burned: 420,
    duration_minutes: 35,
    entry_date: new Date().toISOString(),
  },
  {
    id: 'mock-ex-2',
    exercise_name: 'Jiu-Jitsu Training',
    calories_burned: 650,
    duration_minutes: 60,
    entry_date: new Date().toISOString(),
  }
];

const MOCK_SLEEP = [
  {
    id: 'mock-sleep-1',
    date: new Date().toISOString(),
    sleep_duration_minutes: 480,
    sleep_quality_score: 85,
  }
];

const MOCK_GOALS = [
  {
    id: 'mock-goal-1',
    goal_name: 'Daily Step Target',
    target_value: 10000,
    current_value: 10420,
    progress_percentage: 104,
    achieved: true,
  },
  {
    id: 'mock-goal-2',
    goal_name: 'Fasting Glucose Stability',
    target_value: 95,
    current_value: 92,
    progress_percentage: 97,
    achieved: true,
  }
];

export default function ProfileScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { simulateGlucoseChange } = useGlucose();

  const [pageData, setPageData] = useState<SatoPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPageData();
  }, []);

  const fetchPageData = async () => {
    try {
      const data = await getSatoPageData();
      setPageData(data);
    } catch (error) {
      console.warn('Failed to fetch Sato page data on ProfileScreen, using fallback:', error);
      setPageData(MOCK_SATO_PAGE_DATA);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PaperBackground>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Journal Profile</Text>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.iconButton}>
            <Feather name="x" size={20} color={Colors.ink} />
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Hero Asymmetric */}
          <View style={styles.profileHero}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.name}>Russell</Text>
              <Text style={styles.dx}>Type 1 Diabetes · Dexcom G7</Text>
              <Text style={styles.calibrationStatus}>Calibrating since 2018</Text>
            </View>
            <View style={styles.avatarContainer}>
              <BloomFlower
                petal1={Colors.bloom.mornings.petal1}
                petal2={Colors.bloom.mornings.petal2}
                petal3={Colors.bloom.mornings.petal3}
                size={64}
              />
            </View>
          </View>

          {/* Stats Ledger */}
          <View style={styles.statsLedger}>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Active Observations</Text>
              <Text style={styles.statsValue}>12 Patterns</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Calibration History</Text>
              <Text style={styles.statsValue}>247 Days</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Mean Exposure</Text>
              <Text style={styles.statsValue}>71% Avg TIR</Text>
            </View>
          </View>

          {/* Health Dashboard / Vitals Summary */}
          {pageData && (
            <DataDashboard
              data={pageData}
              meals={MOCK_MEALS}
              checkIn={MOCK_CHECK_IN}
              exercises={MOCK_EXERCISES}
              sleep={MOCK_SLEEP}
              goals={MOCK_GOALS}
              isLoading={isLoading}
            />
          )}

          {/* Settings sections */}
          {SETTINGS.map(({ section, items }) => (
            <View key={section} style={styles.settingsGroup}>
              <Text style={styles.settingsSection}>{section}</Text>
              {items.map((item) => (
                <TouchableOpacity key={item.name} style={styles.settingsRow} activeOpacity={0.7}>
                  <View style={styles.settingsTextContainer}>
                    <Text style={styles.settingsItem}>{item.name}</Text>
                    <Text style={styles.settingsSub}>{item.sub}</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={Colors.softStone} />
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Developer Simulations Section */}
          <View style={[styles.settingsGroup, styles.devGroup]}>
            <Text style={styles.devSection}>System Diagnostics</Text>
            
            <TouchableOpacity 
              style={styles.devRow}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
                simulateGlucoseChange(58); // Hypo
              }}
            >
              <View style={styles.devTextContainer}>
                <Text style={styles.devItem}>Hypoglycemia Trigger</Text>
                <Text style={styles.devSub}>Force blood glucose telemetry to 58 mg/dL (alert simulation)</Text>
              </View>
              <Feather name="activity" size={14} color={Colors.softStone} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.devRow}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
                simulateGlucoseChange(250); // Hyper
              }}
            >
              <View style={styles.devTextContainer}>
                <Text style={styles.devItem}>Hyperglycemia Trigger</Text>
                <Text style={styles.devSub}>Force blood glucose telemetry to 250 mg/dL (alert simulation)</Text>
              </View>
              <Feather name="activity" size={14} color={Colors.softStone} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.devRow, { borderBottomWidth: 0 }]}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                simulateGlucoseChange(95); // Normal
              }}
            >
              <View style={styles.devTextContainer}>
                <Text style={styles.devItem}>Telemetry Reset</Text>
                <Text style={styles.devSub}>Revert simulated blood glucose reading to stable baseline (95 mg/dL)</Text>
              </View>
              <Feather name="refresh-cw" size={14} color={Colors.softStone} />
            </TouchableOpacity>
          </View>

          <Text style={styles.version}>Sato v1.0 · Not a medical device</Text>
        </ScrollView>
      </View>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.25)',
  },
  headerTitle: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 22,
    color: Colors.ink,
    letterSpacing: 0.5,
  },
  iconButton: {
    padding: 4,
  },
  scroll: { gap: Spacing.xxl, paddingTop: Spacing.md },

  profileHero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.sm,
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  name: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 40,
    lineHeight: 44,
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  dx: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.softStone,
    marginTop: 4,
  },
  calibrationStatus: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.softStone,
    opacity: 0.8,
    marginTop: 2,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsLedger: {
    marginHorizontal: Spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(231, 222, 207, 0.4)',
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
  },
  statsLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.softStone,
  },
  statsValue: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 18,
    color: Colors.ink,
  },

  settingsGroup: {
    backgroundColor: 'transparent',
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.xs,
  },
  settingsSection: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.softStone,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
    paddingBottom: 8,
    marginBottom: Spacing.xs,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
  },
  settingsTextContainer: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  settingsItem: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.ink,
  },
  settingsSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.softStone,
    marginTop: 3,
    lineHeight: 16,
  },

  devGroup: {
    marginTop: Spacing.xxl,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(231, 222, 207, 0.4)',
  },
  devSection: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.softStone,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
  },
  devTextContainer: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  devItem: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.ink,
  },
  devSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.softStone,
    marginTop: 3,
    lineHeight: 16,
  },

  version: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.softStone,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

