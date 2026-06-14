import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, Radius, TypeScale } from '@/constants/theme';
import { TabBar } from '@/components/TabBar';
import { PaperBackground } from '@/components/PaperBackground';
import { BloomFlower } from '@/components/BloomFlower';
import { Feather, Ionicons } from '@expo/vector-icons';

const OTHER_FOODS = [
  { name: 'Pasta', count: 16, bloom: 'mornings' as const },
  { name: 'Spaghetti', count: 11, bloom: 'walks' as const },
  { name: 'Creamy pasta', count: 5, bloom: 'sleep' as const },
  { name: 'Parmesan', count: 9, bloom: 'evening' as const },
];

export default function FoodsScreen({ onNavigate }: { onNavigate?: (screen: any) => void }) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('carbonara');

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  return (
    <PaperBackground>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View>
              <Text style={styles.title}>Foods</Text>
              <Text style={styles.subtitle}>Search your food memories</Text>
            </View>
            <TouchableOpacity style={styles.bellWrap}>
              <Ionicons name="notifications-outline" size={24} color={Colors.ink} />
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color={Colors.softStone} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search your memories..."
              placeholderTextColor={Colors.softStone}
            />
            {isSearching && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIcon}>
                <Feather name="x-circle" size={18} color={Colors.softStone} />
              </TouchableOpacity>
            )}
          </View>

          {/* Matches Section */}
          <Text style={styles.sectionTitle}>1 MATCH</Text>
          
          <TouchableOpacity 
            style={styles.heroCard}
            activeOpacity={0.8}
          >
            <View style={styles.heroCardTop}>
              <View style={styles.heroCardText}>
                <Text style={styles.heroTitle}>Carbonara</Text>
                <Text style={styles.heroSubtitle}>Observed 7 times</Text>
              </View>
            </View>

            <View style={styles.heroMiddle}>
              <Text style={styles.heroInsight}>
                Usually leaves{'\n'}a stronger evening trace.
              </Text>
              <View style={styles.heroBloom}>
                <BloomFlower
                  petal1={Colors.bloom.mornings.petal1}
                  petal2={Colors.bloom.mornings.petal2}
                  petal3={Colors.bloom.mornings.petal3}
                  flare1Color="#D7B36A"
                  flare2Color="#A98BC5"
                  size={156}
                />
              </View>
            </View>

            <View style={styles.heroStats}>
              <Text style={styles.heroStatLabel}>Average peak</Text>
              <View style={styles.heroStatValueRow}>
                <Text style={styles.heroStatValue}>+42</Text>
                <Text style={styles.heroStatUnit}>mg/dL</Text>
              </View>
              <Text style={styles.heroStatSubtext}>after 1h 45m</Text>
            </View>

            <View style={styles.heroFooter}>
              <Text style={styles.heroFooterText}>Last observed 3 days ago</Text>
              <View style={styles.exploreLink}>
                <Text style={styles.exploreText}>Explore</Text>
                <Feather name="arrow-right" size={16} color={Colors.burntOrange} />
              </View>
            </View>
          </TouchableOpacity>

          {/* OTHER FOODS matches */}
          <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>OTHER FOODS</Text>
          <View style={styles.otherFoodsList}>
            {OTHER_FOODS.map((food, i) => (
              <TouchableOpacity 
                key={i} 
                style={styles.otherFoodRow} 
              >
                <View style={styles.otherFoodBloom}>
                  <BloomFlower
                    petal1={Colors.bloom[food.bloom].petal1}
                    petal2={Colors.bloom[food.bloom].petal2}
                    petal3={Colors.bloom[food.bloom].petal3}
                    size={40}
                  />
                </View>
                <View style={styles.otherFoodInfo}>
                  <Text style={styles.otherFoodName}>{food.name}</Text>
                  <Text style={styles.otherFoodCount}>Observed {food.count} times</Text>
                </View>
                <Feather name="chevron-right" size={20} color={Colors.softStone} />
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>

        <TabBar active="foods" onPress={(tab) => {
          if (tab !== 'foods') {
            const screenMap: any = { portrait: 'Portrait', discover: 'Discover', sato: 'Sato', profile: 'Profile' };
            onNavigate?.(screenMap[tab]);
          }
        }} />
      </View>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...TypeScale.display, color: Colors.ink },
  subtitle: { ...TypeScale.body, color: Colors.softStone, marginTop: 4 },
  scroll: { paddingHorizontal: Spacing.xxl },

  bellWrap: {
    position: 'relative',
    padding: Spacing.sm,
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.burntOrange,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    marginVertical: Spacing.lg,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.ink,
  },
  clearIcon: {
    padding: Spacing.xs,
  },

  sectionTitle: { 
    ...TypeScale.metadata, 
    color: Colors.softStone, 
    marginBottom: Spacing.md,
    letterSpacing: 1.2,
  },

  // Hero Search Match Card
  heroCard: {
    backgroundColor: '#F3EDE0',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  heroCardTop: {
    marginBottom: Spacing.lg,
  },
  heroCardText: {},
  heroTitle: {
    ...TypeScale.display,
    fontSize: 28,
    color: Colors.ink,
  },
  heroSubtitle: {
    ...TypeScale.body,
    color: Colors.softStone,
    marginTop: 2,
  },
  heroMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    minHeight: 120,
  },
  heroInsight: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: '#70824B',
    flex: 1,
    paddingRight: Spacing.md,
  },
  heroBloom: {
    width: 156,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -18,
  },
  heroStats: {
    marginBottom: Spacing.xl,
  },
  heroStatLabel: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    marginBottom: 4,
  },
  heroStatValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroStatValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 28,
    letterSpacing: -0.5,
    color: Colors.ink,
  },
  heroStatUnit: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: Colors.ink,
    marginLeft: 4,
  },
  heroStatSubtext: {
    ...TypeScale.body,
    color: Colors.softStone,
    marginTop: 2,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: Spacing.lg,
  },
  heroFooterText: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    textTransform: 'none',
  },
  exploreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exploreText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.burntOrange,
  },

  otherFoodsList: {
    marginBottom: Spacing.xxl,
  },
  otherFoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  otherFoodBloom: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  otherFoodInfo: {
    flex: 1,
  },
  otherFoodName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 17,
    color: Colors.ink,
    marginBottom: 2,
  },
  otherFoodCount: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    textTransform: 'none',
  },
});
