/**
 * Data Dashboard Component
 *
 * Displays a flat ledger grid of metric points for meals, check-ins, exercises, sleep, and goals.
 * Sits flat on the paper background without shadow boxes or carousels.
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import {
  MealSummary,
  CheckInData,
  ExerciseEntry,
  SleepData,
  GoalProgress,
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

interface LedgerRowProps {
  title: string;
  detail?: string;
  value: string;
  isLast?: boolean;
}

function LedgerRow({ title, detail, value, isLast = false }: LedgerRowProps) {
  return (
    <View style={[styles.ledgerRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.ledgerInfo}>
        <Text style={styles.ledgerTitle}>{title}</Text>
        {detail ? <Text style={styles.ledgerDetail}>{detail}</Text> : null}
      </View>
      <Text style={styles.ledgerValue}>{value}</Text>
    </View>
  );
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
  // Format helpers
  const formatCalories = (val: number) => `${val} kcal`;
  const formatCarbs = (val: number) => `${val}g`;
  const formatWeight = (val: number) => `${val} lbs`;
  const formatSteps = (val: number) => `${val.toLocaleString()}`;
  const formatMinutes = (val: number) => {
    const hrs = Math.floor(val / 60);
    const mins = val % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };
  const formatPercentage = (val: number) => `${val.toFixed(0)}%`;

  // Calculate retrospective glycemic stats (Class I SaMD educational context)
  const getRetrospectiveMetrics = (mealsList?: MealSummary[]) => {
    let totalVelocity = 0;
    let totalAuc = 0;
    let lateRiseCount = 0;
    let bufferStreak = 0;
    let count = 0;

    if (mealsList && mealsList.length > 0) {
      mealsList.forEach((meal) => {
        count++;
        const carbs = meal.carbs || 0;
        const fat = meal.fat || 0;
        const protein = meal.protein || 0;
        
        const isLateRise = fat > 12 && carbs > 35;
        if (isLateRise) {
          lateRiseCount++;
        }

        if (carbs > 0 && (protein > 10 || fat > 8)) {
          bufferStreak++;
        }

        const baseVelocity = carbs > 60 ? 2.1 : carbs > 30 ? 1.5 : 0.8;
        const fatBuffering = fat > 12 ? 0.65 : 1.0;
        const velocity = baseVelocity * fatBuffering;
        totalVelocity += velocity;

        totalAuc += (carbs * 55) + (fat * 25);
      });
    }

    const avgVelocity = count > 0 ? (totalVelocity / count).toFixed(2) : '0.00';
    const avgAuc = count > 0 ? Math.round(totalAuc / count) : 0;

    return {
      avgVelocity,
      avgAuc,
      lateRiseCount,
      bufferStreak,
    };
  };

  const retro = getRetrospectiveMetrics(meals);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.noData}>Loading Calibration Logs...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.noData}>No calibration logs available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section: Today's Nutrition */}
      {meals && meals.length > 0 && (
        <View style={styles.ledgerBlock}>
          <Text style={styles.sectionHeader}>Today's Nutrition</Text>
          {meals.map((meal, idx) => (
            <LedgerRow
              key={idx}
              title={`Meal Entry ${idx + 1}`}
              detail={`${formatCarbs(meal.carbs)} carbs · ${formatCarbs(meal.protein)} protein · ${formatCarbs(meal.fat)} fat`}
              value={formatCalories(meal.calories)}
              isLast={idx === meals.length - 1}
            />
          ))}
        </View>
      )}

      {/* Section: Check-In */}
      {checkIn && (
        <View style={styles.ledgerBlock}>
          <Text style={styles.sectionHeader}>Body Metrics</Text>
          <LedgerRow
            title="Weight Telemetry"
            detail={checkIn.body_fat_percentage ? `${checkIn.body_fat_percentage}% body fat` : 'Fasting scale'}
            value={checkIn.weight ? formatWeight(checkIn.weight) : '--'}
          />
          <LedgerRow
            title="Steps Activity"
            detail="Recorded step count"
            value={checkIn.steps ? formatSteps(checkIn.steps) : '0'}
            isLast={true}
          />
        </View>
      )}

      {/* Section: Recent Exercises */}
      {exercises && exercises.length > 0 && (
        <View style={styles.ledgerBlock}>
          <Text style={styles.sectionHeader}>Recent Exercises</Text>
          {exercises.map((exercise, idx) => (
            <LedgerRow
              key={exercise.id}
              title={exercise.exercise_name || 'Exercise'}
              detail={`Duration: ${formatMinutes(exercise.duration_minutes || 0)}`}
              value={`-${formatCalories(exercise.calories_burned || 0)}`}
              isLast={idx === exercises.length - 1}
            />
          ))}
        </View>
      )}

      {/* Section: Sleep */}
      {sleep && sleep.length > 0 && (
        <View style={styles.ledgerBlock}>
          <Text style={styles.sectionHeader}>Sleep Track</Text>
          {sleep.map((sleepDay, idx) => (
            <LedgerRow
              key={sleepDay.id}
              title="Rest Quality Index"
              detail={sleepDay.sleep_quality_score ? `Quality Score: ${formatPercentage(sleepDay.sleep_quality_score)}` : 'Sleep tracking active'}
              value={formatMinutes(sleepDay.sleep_duration_minutes || 0)}
              isLast={idx === sleep.length - 1}
            />
          ))}
        </View>
      )}

      {/* Section: Goals */}
      {goals && goals.length > 0 && (
        <View style={styles.ledgerBlock}>
          <Text style={styles.sectionHeader}>Goals Progress</Text>
          {goals.map((goal, idx) => (
            <LedgerRow
              key={goal.id}
              title={goal.goal_name}
              detail={`Value: ${goal.current_value}/${goal.target_value}`}
              value={`${formatPercentage(goal.progress_percentage)} met`}
              isLast={idx === goals.length - 1}
            />
          ))}
        </View>
      )}

      {/* Section: Retrospective Glycemic Insights */}
      {meals && meals.length > 0 && (
        <View style={styles.ledgerBlock}>
          <Text style={styles.sectionHeader}>Retrospective Glycemic Insights</Text>
          
          <LedgerRow
            title="Avg Rate of Rise"
            detail="Estimated velocity of glycemic trajectory"
            value={`${retro.avgVelocity} mg/dL/m`}
          />
          <LedgerRow
            title="Glycemic Exposure"
            detail="Pancreatic burden area-under-the-curve"
            value={`${retro.avgAuc.toLocaleString()} AUC`}
          />
          <LedgerRow
            title="Late Rises"
            detail="Digestion peaks delayed 3–4 hours"
            value={`${retro.lateRiseCount} detected`}
          />
          <LedgerRow
            title="Buffer Streak"
            detail="Macronutrient pairing sequences logged"
            value={`${retro.bufferStreak} meals`}
            isLast={true}
          />
          
          <View style={styles.footnoteRow}>
            <Text style={styles.footnoteText}>
              * Retrospective analysis calculated from general metabolic curves. Strictly educational; does not predict clinical values or guide insulin dosing.
            </Text>
          </View>
        </View>
      )}

      {/* Section: Metabolic Twin Calibration */}
      {data.graphSummary && (() => {
        const calibrationPercent = Math.min(100, Math.round((data.graphSummary.vertices / 50) * 100));
        return (
          <View style={styles.calibrationSection}>
            <Text style={styles.sectionHeader}>Metabolic Twin Calibration</Text>
            
            <View style={styles.calibrationInfoRow}>
              <Text style={styles.calibrationPercent}>{calibrationPercent}% Calibrated</Text>
              <Text style={styles.calibrationStats}>
                {data.graphSummary.vertices} memories · {data.graphSummary.edges} glycemic links
              </Text>
            </View>

            {/* Flat line progress indicator */}
            <View style={styles.progressBarOuter}>
              <View style={[styles.progressBarInner, { width: `${calibrationPercent}%` }]} />
            </View>
            
            <Text style={styles.calibrationFootnote}>
              Retrospective modeling accuracy increases as you record more food memories.
            </Text>
          </View>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.xs,
  },
  noData: {
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    color: Colors.softStone,
    fontSize: 14,
    paddingVertical: Spacing.xl,
  },
  ledgerBlock: {
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
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
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
  },
  ledgerInfo: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  ledgerTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.ink,
  },
  ledgerDetail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.softStone,
    marginTop: 2,
  },
  ledgerValue: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 20,
    color: Colors.ink,
    textAlign: 'right',
  },
  footnoteRow: {
    marginTop: 10,
    marginBottom: 6,
  },
  footnoteText: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.softStone,
  },
  calibrationSection: {
    marginHorizontal: Spacing.xxl,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  calibrationInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
    marginTop: Spacing.xs,
  },
  calibrationPercent: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 22,
    color: Colors.ink,
  },
  calibrationStats: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.softStone,
  },
  progressBarOuter: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(24, 22, 20, 0.08)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: Colors.ink,
    borderRadius: Radius.full,
  },
  calibrationFootnote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    color: Colors.softStone,
    marginTop: 8,
  },
});