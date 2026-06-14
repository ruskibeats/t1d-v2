import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { Colors, Spacing, Radius, TypeScale, Fonts } from '@/constants/theme';
import { PATTERNS, FEATURED_PATTERN } from '@/constants/patterns';
import { BloomFlower } from '@/components/BloomFlower';
import { TabBar } from '@/components/TabBar';
import { PaperBackground } from '@/components/PaperBackground';

export default function DiscoverScreen({ onNavigate }: { onNavigate?: (screen: any) => void }) {
  const insets = useSafeAreaInsets();

  const goToPattern = (id: string) => {};

  return (
    <PaperBackground>
      <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../../assets/sato_logo_mark.png')} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
          <Text style={styles.logoText}>Sato</Text>
        </View>
        <Pressable style={styles.bellWrap}>
          <Ionicons name="notifications-outline" size={26} color={Colors.ink} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero text */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Discover</Text>
          <Text style={styles.heroSub}>Patterns Sato has quietly noticed in your life.</Text>
        </View>

        {/* Hero Insight composition */}
        <TouchableOpacity
          style={styles.featuredLayout}
          onPress={() => goToPattern(FEATURED_PATTERN.id)}
          activeOpacity={0.95}
        >
          <View style={styles.featuredBloom} pointerEvents="none">
            {/* Ghost Enso watermark */}
            <Svg width={220} height={220} viewBox="0 0 100 100" style={styles.ensoWatermark}>
              <Path
                d="M 80 50 A 30 30 0 1 1 50 20 A 30 30 0 0 1 75 32"
                fill="none"
                stroke={Colors.ink}
                strokeWidth={4.5}
                strokeLinecap="round"
              />
            </Svg>
            <BloomFlower
              {...Colors.bloom[FEATURED_PATTERN.bloom]}
              size={180}
            />
          </View>

          <View style={styles.featuredContent}>
            <Text style={styles.featuredTitle}>{FEATURED_PATTERN.title}</Text>
            <Text style={styles.featuredMeta}>Observed {FEATURED_PATTERN.seenCount} times · Recurring pattern</Text>
            <Text style={styles.featuredDesc} numberOfLines={2}>
              A pattern appearing between 7pm and 11pm.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Recently uncovered */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently uncovered</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>

        <View style={styles.patternList}>
          {PATTERNS.map((pattern) => (
            <TouchableOpacity
              key={pattern.id}
              style={styles.patternRow}
              onPress={() => goToPattern(pattern.id)}
              activeOpacity={0.9}
            >
              {/* Mini bloom floating directly on paper */}
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
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TabBar active="discover" onPress={(tab) => {
        if (tab !== 'discover') {
          const screenMap: any = { portrait: 'Portrait', foods: 'Foods', sato: 'Sato', profile: 'Profile' };
          onNavigate?.(screenMap[tab]);
        }
      }} />
      </View>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoImage: { width: 56, height: 56 },
  logoText: {
    fontFamily: Fonts.serifSemiBold,
    fontWeight: 'bold',
    color: Colors.ink,
    fontSize: 38,
    lineHeight: 42,
  },
  bellWrap: { position: 'relative', padding: 4 },
  bellDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.burntOrange,
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  hero: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.sm, paddingBottom: Spacing.lg },
  heroTitle: { ...TypeScale.display, color: Colors.ink },
  heroSub: { ...TypeScale.body, color: Colors.softStone, marginTop: 4 },

  // Featured layout
  featuredLayout: {
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
    minHeight: 180,
  },
  featuredBloom: {
    width: 180,
    height: 180,
    position: 'absolute',
    right: -20,
    opacity: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ensoWatermark: {
    position: 'absolute',
    opacity: 0.02,
  },
  featuredContent: { flex: 1, paddingRight: 100 },
  featuredTitle: { ...TypeScale.heroTitle, color: Colors.ink, marginBottom: 4 },
  featuredMeta: { ...TypeScale.metadata, color: Colors.softStone, marginBottom: 8 },
  featuredDesc: { ...TypeScale.caption, color: Colors.softStone },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  sectionTitle: { ...TypeScale.sectionTitle, color: Colors.ink },
  seeAll: { ...TypeScale.button, color: Colors.burntOrange },

  // Pattern list
  patternList: { paddingHorizontal: Spacing.xl },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.lg,
  },
  patternIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  patternInfo: { flex: 1 },
  patternTitle: { ...TypeScale.cardTitle, color: Colors.ink, marginBottom: 3 },
  patternMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  patternStrength: { ...TypeScale.metadata, color: Colors.softStone },
  patternSeen: { ...TypeScale.metadata, color: Colors.softStone },
  chevronWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { fontSize: 18, color: Colors.ink, marginTop: -1 },
});
