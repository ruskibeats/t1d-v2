import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors, Spacing, TypeScale } from '@/constants/theme';
import { PATTERNS, FEATURED_PATTERN } from '@/constants/patterns';
import { BloomFlower } from '@/components/BloomFlower';
import { useNavigation } from '../navigation/NavigationProvider';

export default function DiscoverScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Atmospheric fade transition on mount (resembling pigment settling)
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const goToPattern = (id: string) => {
    nav.openRevelation({ id });
  };

  // Helper to generate a smooth cubic Bezier path for the monochrome trace
  const getMonochromePath = (data: number[]) => {
    const chartWidth = 300;
    const chartHeight = 65;
    const baseline = 80;
    const points = data.map((val, idx) => {
      const x = 10 + (idx / (data.length - 1)) * chartWidth;
      const y = baseline - val * chartHeight;
      return { x, y };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const getClosedPath = (data: number[]) => {
    const chartWidth = 300;
    const baseline = 80;
    const path = getMonochromePath(data);
    const endX = 10 + chartWidth;
    return `${path} L ${endX} ${baseline} L 10 ${baseline} Z`;
  };

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Spacing.sm, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial Journal Header */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Discover</Text>
          <Text style={styles.heroSub}>Patterns Sato has quietly noticed in your life.</Text>
        </View>

        {/* Feature Discovery - Editorial Article Layout */}
        <TouchableOpacity
          style={styles.articleLayout}
          onPress={() => goToPattern(FEATURED_PATTERN.id)}
          activeOpacity={0.9}
        >
          {/* Section Header */}
          <Text style={styles.categoryBadge}>FEATURED DISCOVERY</Text>
          <Text style={styles.articleTitle}>{FEATURED_PATTERN.title}</Text>
          
          <Text style={styles.articleMeta}>
            Observed {FEATURED_PATTERN.seenCount} times · Recurring pattern
          </Text>

          <Text style={styles.articleNarrative}>
            {FEATURED_PATTERN.description} {FEATURED_PATTERN.insight}
          </Text>

          {/* Centered Large Bloom Flower floating directly on Paper */}
          <View style={styles.bloomContainer} pointerEvents="none">
            <BloomFlower
              {...Colors.bloom[FEATURED_PATTERN.bloom]}
              size={260}
            />
          </View>

          {/* Minimal Monochrome Chart (Evidence) */}
          <View style={styles.chartWrapper}>
            <Text style={styles.chartLabel}>GLYCEMIC DURATION OVERVIEW ({FEATURED_PATTERN.timeLabel})</Text>
            <Svg width={320} height={90}>
              <Defs>
                <LinearGradient id="monoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#181614" stopOpacity={0.06} />
                  <Stop offset="100%" stopColor="#181614" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {/* Soft pigment area fill */}
              <Path d={getClosedPath(FEATURED_PATTERN.graphData)} fill="url(#monoGrad)" />
              {/* Minimal monochrome trace stroke */}
              <Path d={getMonochromePath(FEATURED_PATTERN.graphData)} fill="none" stroke="#181614" strokeWidth={1.2} />
            </Svg>
          </View>
        </TouchableOpacity>

        {/* Other Discoveries Section */}
        <View style={styles.secondarySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Other Observations</Text>
            <TouchableOpacity onPress={() => nav.openAllDiscoveries()} hitSlop={10}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {/* simple, text observations spaced 8-12px apart, with no cards */}
          <View style={styles.observationList}>
            {PATTERNS.filter(p => p.id !== FEATURED_PATTERN.id).map((pattern) => (
              <TouchableOpacity
                key={pattern.id}
                style={styles.observationRow}
                onPress={() => goToPattern(pattern.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.observationText}>
                  {pattern.title} <Text style={styles.observationSub}>· Observed {pattern.seenCount} times</Text>
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: '#F1EBDD' // Primary Paper canvas
  },
  scroll: { 
    flex: 1 
  },
  scrollContent: { 
    paddingHorizontal: Spacing.xxl 
  },

  hero: { 
    paddingTop: Spacing.md, 
    paddingBottom: Spacing.xxl 
  },
  heroTitle: { 
    ...TypeScale.display, 
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 56,
    lineHeight: 62,
    color: '#181614',
    letterSpacing: -0.5,
  },
  heroSub: { 
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 26,
    color: '#7E756A', 
    marginTop: 4 
  },

  // Editorial article layout
  articleLayout: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xxxl,
  },
  categoryBadge: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#7E756A',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  articleTitle: { 
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 28,
    lineHeight: 34,
    color: '#181614', 
    marginBottom: Spacing.xs,
  },
  articleMeta: { 
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#A09689', 
    marginBottom: Spacing.lg,
  },
  articleNarrative: { 
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
    lineHeight: 30,
    color: '#7E756A',
    marginBottom: Spacing.xxl,
  },
  bloomContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xxl,
    opacity: 0.95,
  },
  chartWrapper: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  chartLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8.5,
    letterSpacing: 1,
    color: '#A09689',
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },

  // Secondary section for observations
  secondarySection: {
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)', // Borders avoid/light 30% opacity
    marginBottom: Spacing.xl,
  },
  sectionTitle: { 
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 28,
    color: '#181614',
  },
  seeAll: { 
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#D6784E', // Food primary orange accent tone
  },
  observationList: {
    gap: 10, // Spacing 8-12px minimal separation
  },
  observationRow: {
    paddingVertical: 10,
  },
  observationText: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 20,
    color: '#181614',
  },
  observationSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#7E756A',
  },
});
