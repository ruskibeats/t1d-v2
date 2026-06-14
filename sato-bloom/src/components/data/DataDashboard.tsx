/**
 * Data Dashboard Component
 *
 * Displays a grid of data cards for meals, check-ins, exercises, sleep, and goals.
 */

import React from 'react';
import { ScrollView, View, StyleSheet, Text } from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { DataCard } from './DataCard';
import {
  FoodEntry,
  CheckInData,
  ExerciseEntry,
  SleepData,
  GoalProgress,
  MealSummary,
  SatoPageData,
} from '@/types/data';

interface DataDashboardProps {
  meals?: MealSummary[];
  checkIn?: CheckInData | null;
  exercises?: ExerciseEntry[];
  sleep?: SleepData[];
  goals?: GoalProgress[];
  data: SatoPageData | null;
  isLoading?: boolean;
}

export function DataDashboard({
  meals,
  checkIn,
  exercises,
  sleep,
  goals,
  data,
  isLoading = false,
}: DataDashboardProps) {
  // Format number with units
  const formatCalories = (val: number) => `${val} kcal`;
  const formatCarbs = (val: number) => `${val}g`;
  const formatWeight = (val: number) => `${val} lbs`;
  const formatSteps = (val: number) => `${val.toLocaleString()}`;
  const formatMinutes = (val: number) => `${val}m`;
  const formatPercentage = (val: number) => `${val.toFixed(0)}%`;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.noData}>Loading your data...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.noData}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section: Today's Meals */}
      {meals && meals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Nutrition</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardRow}>
            {meals.slice(0, 3).map((meal, idx) => (
              <DataCard
                key={idx}
                title="Calories"
                value={formatCalories(meal.calories)}
                subtext={`${formatCarbs(meal.carbs)} carbs • ${formatCarbs(meal.protein)} protein`}
                icon="restaurant"
                trend="neutral"
                color={Colors.burntOrange} // Using burnt orange for active data
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Section: Check-In */}
      {checkIn && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Metrics</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardRow}>
            {checkIn.weight && (
              <DataCard
                key="weight"
                title="Weight"
                value={formatWeight(checkIn.weight)}
                subtext={checkIn.body_fat_percentage ? `${formatCalories(checkIn.body_fat_percentage)} body fat` : ''}
                icon="scale-outline"
                trend="neutral"
                color={Colors.burntOrange}
              />
            )}
            {checkIn.steps && (
              <DataCard
                key="steps"
                title="Steps"
                value={formatSteps(checkIn.steps)}
                subtext="Daily activity"
                icon="footprints"
                trend="neutral"
                color={Colors.burntOrange}
              />
            )}
          </ScrollView>
        </View>
      )}

      {/* Section: Recent Exercises */}
      {exercises && exercises.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Exercises</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardRow}>
            {exercises.slice(0, 3).map((exercise) => (
              <DataCard
                key={exercise.id}
                title="Burn"
                value={formatCalories(exercise.calories_burned || 0)}
                subtext={formatMinutes(exercise.duration_minutes || 0)}
                icon="flame"
                trend="neutral"
                color={Colors.burntOrange}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Section: Sleep */}
      {sleep && sleep.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardRow}>
            {sleep.slice(0, 3).map((sleepDay) => (
              <DataCard
                key={sleepDay.id}
                title="Duration"
                value={formatMinutes(sleepDay.sleep_duration_minutes || 0)}
                subtext={sleepDay.sleep_quality_score ? `Quality: ${formatPercentage(sleepDay.sleep_quality_score)}` : ''}
                icon="moon"
                trend="neutral"
                color={Colors.burntOrange}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Section: Goals */}
      {goals && goals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goals Progress</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardRow}>
            {goals.slice(0, 3).map((goal) => (
              <DataCard
                key={goal.id}
                title={goal.goal_name}
                value={formatPercentage(goal.progress_percentage)}
                subtext={`${goal.current_value}/${goal.target_value}`}
                icon="trophy"
                trend={goal.achieved ? 'neutral' : 'neutral'}
                color={Colors.burntOrange}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Section: Food Graph Summary */}
      {data.graphSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Food Memory Graph</Text>
          <View style={styles.graphCard}>
            <View style={styles.graphInfo}>
              <Text style={styles.graphValue}>{data.graphSummary.vertices}</Text>
              <Text style={styles.graphLabel}>vertices</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.graphInfo}>
              <Text style={styles.graphValue}>{data.graphSummary.edges}</Text>
              <Text style={styles.graphLabel}>edges</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.softStone,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  noData: {
    textAlign: 'center',
    color: Colors.softStone,
    fontSize: 14,
  },
  graphCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.ink,
  },
  graphInfo: {
    flex: 1,
    alignItems: 'center',
  },
  graphValue: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 24,
    color: Colors.burntOrange,
    letterSpacing: -0.5,
  },
  graphLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.softStone,
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});