/**
 * Data Card Component
 *
 * Displays a single data point with icon, value, and optional trend.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, TypeScale } from '@/constants/theme';
import { DataCardProps } from '@/types/data';

export function DataCard({ title, value, subtext, icon, trend, color }: DataCardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return 'trending-up';
    if (trend === 'down') return 'trending-down';
    return 'remove';
  };

  return (
    <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: color }]}>
      <View style={styles.header}>
        <Ionicons name={icon as any} size={18} color={color} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtext && <Text style={styles.subtext}>{subtext}</Text>}
      {trend && (
        <View style={styles.trendContainer}>
          <Ionicons
            name={getTrendIcon() as any}
            size={12}
            color={color}
          />
          <Text style={[styles.trendText, { color }]}>
            {trend === 'up' ? 'Higher than average' : trend === 'down' ? 'Lower than average' : 'On track'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardAlt,
    padding: Spacing.md,
    borderRadius: Radius.md,
    minHeight: 110,
    width: 140, // fix card width for horizontal scrolling
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.015,
    shadowRadius: 12,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.softStone,
  },
  value: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 24,
    color: Colors.ink,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  subtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.softStone,
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  trendText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
});