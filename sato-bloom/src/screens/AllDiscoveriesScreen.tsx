import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, TypeScale } from '@/constants/theme';
import { PaperBackground } from '@/components/PaperBackground';
import { useNavigation } from '../navigation/NavigationProvider';
import { PATTERNS, Pattern } from '@/constants/patterns';
import { BloomFlower } from '@/components/BloomFlower';

const FILTERS = ['All', 'Food', 'Activity', 'Sleep', 'Stress', 'Routine'] as const;
type Filter = typeof FILTERS[number];

export default function AllDiscoveriesScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const [activeFilter, setActiveFilter] = useState<Filter>('All');

  const filteredPatterns = PATTERNS.filter(
    (p) => activeFilter === 'All' || p.category === activeFilter
  );

  return (
    <PaperBackground>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.iconButton}>
            <Feather name="arrow-left" size={24} color={Colors.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>All Discoveries</Text>
            <Text style={styles.subtitle}>Patterns Sato has quietly noticed in your life.</Text>
          </View>

          <View style={styles.filterWrapper}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
                  onPress={() => setActiveFilter(f)}
                >
                  <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.list}>
            {filteredPatterns.length === 0 ? (
              <Text style={styles.emptyText}>No discoveries in this category yet.</Text>
            ) : (
              filteredPatterns.map((pattern, i) => {
                const isLast = i === filteredPatterns.length - 1;
                return (
                  <TouchableOpacity
                    key={pattern.id}
                    style={[styles.patternRow, isLast && { borderBottomWidth: 0 }]}
                    onPress={() => nav.openRevelation({ id: pattern.id })}
                    activeOpacity={0.9}
                  >
                    <View style={styles.patternIcon}>
                      <BloomFlower
                        petal1={Colors.bloom[pattern.bloom].petal1}
                        petal2={Colors.bloom[pattern.bloom].petal2}
                        petal3={Colors.bloom[pattern.bloom].petal3}
                        size={52}
                      />
                    </View>

                    <View style={styles.patternInfo}>
                      <Text style={styles.patternTitle} numberOfLines={2}>{pattern.title}</Text>
                      <View style={styles.patternMeta}>
                        <Text style={styles.patternStrength}>
                          {pattern.strength === 'strong' ? 'Recurring pattern' : 'Emerging signal'}
                        </Text>
                        <Text style={styles.patternSeen}>· Seen {pattern.seenCount} times</Text>
                      </View>
                    </View>
                    
                    <Feather name="chevron-right" size={16} color={Colors.softStone} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    alignItems: 'flex-start',
  },
  iconButton: {
    padding: Spacing.sm,
  },
  titleSection: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  title: {
    ...TypeScale.screenTitle,
    color: Colors.ink,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...TypeScale.body,
    color: Colors.softStone,
  },
  filterWrapper: {
    marginBottom: Spacing.xl,
  },
  filterScroll: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(24, 22, 20, 0.15)',
  },
  filterChipActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  filterText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.softStone,
  },
  filterTextActive: {
    color: '#FCFAF6',
    fontFamily: 'Inter_600SemiBold',
  },
  list: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxl * 2,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
    gap: Spacing.lg,
  },
  patternIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  patternInfo: {
    flex: 1,
  },
  patternTitle: {
    ...TypeScale.cardTitle,
    color: Colors.ink,
    marginBottom: 3,
  },
  patternMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patternStrength: {
    ...TypeScale.metadata,
    color: Colors.softStone,
  },
  patternSeen: {
    ...TypeScale.metadata,
    color: Colors.softStone,
  },
  emptyText: {
    ...TypeScale.body,
    color: Colors.softStone,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});
