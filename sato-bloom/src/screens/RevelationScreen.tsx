import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius, TypeScale } from '@/constants/theme';
import { PATTERNS, Pattern } from '@/constants/patterns';
import { BloomFlower } from '@/components/BloomFlower';
import { GlucoseSparkline } from '@/components/GlucoseSparkline';
import { PaperBackground } from '@/components/PaperBackground';
import { useNavigation } from '../navigation/NavigationProvider';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');

import { usePatterns } from '../context/PatternContext';

export default function RevelationScreen({ revelationId }: { revelationId: string }) {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { toggleWatch, toggleRemind, isWatched, isReminded } = usePatterns();

  const isWatching = isWatched(revelationId);
  const hasReminder = isReminded(revelationId);

  const pattern = PATTERNS.find((p) => p.id === revelationId);

  if (!pattern) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={[TypeScale.body, { color: Colors.softStone, padding: 32 }]}>Pattern not found.</Text>
      </View>
    );
  }

  const bloom = Colors.bloom[pattern.bloom];
  const isStrong = pattern.strength === 'strong';

  const handleWatchPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    toggleWatch(revelationId);
  };

  const handleRemindPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    toggleRemind(revelationId);
  };

  return (
    <PaperBackground>
      <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={20} color={Colors.ink} />
          <Text style={styles.backLabel}>Discover</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreBtn}>
          <Feather name="more-horizontal" size={20} color={Colors.softStone} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Large bloom hero */}
        <View style={styles.bloomHero}>
          <View style={[styles.bloomBg, { backgroundColor: bloom.bg }]}>
            <BloomFlower
              petal1={bloom.petal1}
              petal2={bloom.petal2}
              petal3={bloom.petal3}
              size={220}
            />
          </View>
        </View>

        {/* Pattern header */}
        <View style={styles.patternHeader}>
          <View style={[styles.badge, { backgroundColor: isStrong ? bloom.bg : '#F5EDD8' }]}>
            <Text style={[styles.badgeText, { color: isStrong ? bloom.text : Colors.amber }]}>
              {isStrong ? 'Strong Pattern' : 'Emerging Signal'}
            </Text>
          </View>
          <Text style={styles.title}>{pattern.title}</Text>
          <Text style={styles.timeLabel}>
            {pattern.seenCount} observations · {pattern.timeLabel}
          </Text>
        </View>

        {/* Description */}
        <View style={[styles.card, { backgroundColor: bloom.cardBg }]}>
          <Text style={styles.cardLabel}>WHAT SATO NOTICED</Text>
          <Text style={styles.description}>{pattern.description}</Text>
        </View>

        {/* Glucose chart */}
        <View style={[styles.card, { backgroundColor: bloom.cardBg }]}>
          <Text style={styles.cardLabel}>GLUCOSE RHYTHM</Text>
          <Text style={styles.chartCaption}>Average glucose deviation on {pattern.shortTitle} days</Text>
          <View style={styles.chartWrap}>
            <GlucoseSparkline
              data={pattern.graphData}
              labels={pattern.graphLabels}
              color={bloom.petal1}
              width={SCREEN_W - 64}
              height={120}
            />
          </View>
        </View>

        {/* Insight */}
        <View style={[styles.card, styles.insightCard, { backgroundColor: bloom.cardBg }]}>
          <Feather name="info" size={22} color={bloom.text || Colors.burntOrange} style={{ marginRight: Spacing.md }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>SATO'S SUGGESTION</Text>
            <Text style={styles.insightText}>{pattern.insight}</Text>
          </View>
        </View>

        {/* Next Time Section */}
        <View style={[styles.card, { backgroundColor: bloom.cardBg }]}>
          <Text style={styles.cardLabel}>NEXT TIME...</Text>
          <Text style={styles.nextTimeDesc}>
            Want to explore this further? Sato can watch whether earlier timing or adjustments change this pattern.
          </Text>
          <View style={styles.actionButtonRow}>
            <TouchableOpacity
              style={[styles.actionBtn, isWatching && styles.actionBtnActive]}
              onPress={handleWatchPress}
              activeOpacity={0.85}
            >
              <Text style={[styles.actionBtnText, isWatching && styles.actionBtnTextActive]}>
                {isWatching ? '✓ Watching Pattern' : 'Watch for this'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, hasReminder && styles.actionBtnActive]}
              onPress={handleRemindPress}
              activeOpacity={0.85}
            >
              <Text style={[styles.actionBtnText, hasReminder && styles.actionBtnTextActive]}>
                {hasReminder ? '✓ Reminder Scheduled' : 'Remind me'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Related patterns */}
        <View style={styles.relatedSection}>
          <Text style={styles.relatedTitle}>Related patterns</Text>
          {PATTERNS.filter((p) => p.id !== pattern.id)
            .slice(0, 2)
            .map((p) => {
              const rb = Colors.bloom[p.bloom];
              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.relatedRow}
                  onPress={() => nav.openRevelation({ id: p.id })}
                  activeOpacity={0.88}
                >
                  <View style={[styles.relatedIcon, { backgroundColor: rb.bg }]}>
                    <BloomFlower
                      petal1={rb.petal1}
                      petal2={rb.petal2}
                      petal3={rb.petal3}
                      size={36}
                    />
                  </View>
                  <Text style={styles.relatedLabel} numberOfLines={1}>{p.title}</Text>
                  <Feather name="chevron-right" size={16} color={Colors.softStone} />
                </TouchableOpacity>
              );
            })}
        </View>
      </ScrollView>
    </View>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backLabel: { ...TypeScale.body, color: Colors.ink, fontWeight: '500' },
  moreBtn: { padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xxl },

  // Bloom hero
  bloomHero: { alignItems: 'center', marginVertical: Spacing.xl },
  bloomBg: {
    width: 260,
    height: 260,
    borderRadius: 130,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },

  // Header
  patternHeader: { marginBottom: Spacing.xl },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  badgeText: { ...TypeScale.badge },
  title: {
    ...TypeScale.heroTitle,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  timeLabel: { ...TypeScale.caption, color: Colors.softStone },

  // Cards
  card: {
    backgroundColor: 'transparent',
    paddingVertical: Spacing.xl,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
    marginBottom: Spacing.xs,
  },
  cardLabel: {
    ...TypeScale.label,
    color: Colors.softStone,
    marginBottom: Spacing.sm,
  },
  description: { ...TypeScale.body, color: Colors.ink },
  chartCaption: { ...TypeScale.caption, color: Colors.softStone, marginBottom: Spacing.md },
  chartWrap: { marginHorizontal: -4 },

  // Insight
  insightCard: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  insightIcon: { fontSize: 22 },
  insightText: { ...TypeScale.chatBody, color: Colors.ink },

  // Related
  relatedSection: { marginTop: Spacing.sm },
  relatedTitle: {
    ...TypeScale.sectionTitle,
    color: Colors.ink,
    marginBottom: Spacing.md,
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
    gap: Spacing.md,
  },
  relatedIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  relatedLabel: { flex: 1, ...TypeScale.body, fontWeight: '500', color: Colors.ink },

  nextTimeDesc: {
    ...TypeScale.body,
    color: Colors.ink,
    marginBottom: Spacing.md,
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.burntOrange,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  actionBtnActive: {
    backgroundColor: Colors.burntOrange,
  },
  actionBtnText: {
    ...TypeScale.button,
    color: Colors.burntOrange,
  },
  actionBtnTextActive: {
    color: Colors.white,
  },
});
