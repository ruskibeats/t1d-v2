import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  LayoutAnimation,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, TypeScale } from '@/constants/theme';
import { BloomFlower } from '@/components/BloomFlower';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../navigation/NavigationProvider';
import { PaperBackground } from '@/components/PaperBackground';
import Svg, { Path as SvgPath, Line as SvgLine, Text as SvgText, Circle as SvgCircle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const ALL_FOODS = [
  {
    name: 'Carbonara',
    count: 7,
    bloom: 'mornings' as const,
    insight: 'Usually leaves\na stronger evening trace.',
    peakVal: 42,
    peakValStr: '+42',
    peakTime: 'after 1h 45m',
    lastObserved: 'Last observed 3 days ago',
  },
  {
    name: 'Pasta',
    count: 16,
    bloom: 'mornings' as const,
    insight: 'Sharp spike,\nquick return.',
    peakVal: 54,
    peakValStr: '+54',
    peakTime: 'after 1h 15m',
    lastObserved: 'Last observed 1 day ago',
  },
  {
    name: 'Spaghetti',
    count: 11,
    bloom: 'walks' as const,
    insight: 'Moderate spike,\ndelayed tail.',
    peakVal: 36,
    peakValStr: '+36',
    peakTime: 'after 2h 00m',
    lastObserved: 'Last observed 5 days ago',
  },
  {
    name: 'Creamy pasta',
    count: 5,
    bloom: 'sleep' as const,
    insight: 'Slow absorption,\nflat plateau.',
    peakVal: 28,
    peakValStr: '+28',
    peakTime: 'after 2h 30m',
    lastObserved: 'Last observed 1 week ago',
  },
  {
    name: 'Parmesan',
    count: 9,
    bloom: 'evening' as const,
    insight: 'Minimal impact,\nstable line.',
    peakVal: 8,
    peakValStr: '+8',
    peakTime: 'after 0h 45m',
    lastObserved: 'Last observed 2 days ago',
  },
];

const FOOD_CURVES: Record<string, { peakXPercent: number; peakVal: number; endVal: number; color: string; peakTime: string; rise: string }> = {
  carbonara: { peakXPercent: 0.44, peakVal: 42, endVal: 20, color: '#D7B36A', peakTime: '1h 45m', rise: '+42' },
  pasta: { peakXPercent: 0.31, peakVal: 54, endVal: 10, color: '#B5C08D', peakTime: '1h 15m', rise: '+54' },
  spaghetti: { peakXPercent: 0.50, peakVal: 36, endVal: 15, color: '#7EAEC3', peakTime: '2h 00m', rise: '+36' },
  'creamy pasta': { peakXPercent: 0.625, peakVal: 28, endVal: 18, color: '#D4B483', peakTime: '2h 30m', rise: '+28' },
  parmesan: { peakXPercent: 0.1875, peakVal: 8, endVal: 3, color: '#E9A07D', peakTime: '0h 45m', rise: '+8' },
};

export default function FoodsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'alphabetical' | 'observed' | 'stability'>('alphabetical');
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Sorting logic
  const sortFoods = (foodsList: typeof ALL_FOODS) => {
    const listCopy = [...foodsList];
    if (sortBy === 'alphabetical') {
      return listCopy.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'observed') {
      return listCopy.sort((a, b) => b.count - a.count);
    } else if (sortBy === 'stability') {
      // Stability Index: lowest average peak rise first
      return listCopy.sort((a, b) => a.peakVal - b.peakVal);
    }
    return listCopy;
  };

  const sortedAllFoods = sortFoods(ALL_FOODS);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const matches = isSearching
    ? sortedAllFoods.filter((food) => food.name.toLowerCase().includes(normalizedQuery))
    : [];

  const otherFoods = isSearching
    ? sortedAllFoods.filter((food) => !matches.some((m) => m.name === food.name))
    : sortedAllFoods;

  const handleToggleCompare = (foodName: string) => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (compareList.includes(foodName)) {
      setCompareList((prev) => prev.filter((name) => name !== foodName));
    } else {
      if (compareList.length < 2) {
        setCompareList((prev) => [...prev, foodName]);
      }
    }
  };

  const getComparisonZenNotes = (foodA: string, foodB: string) => {
    const fA = foodA.toLowerCase();
    const fB = foodB.toLowerCase();
    const valA = FOOD_CURVES[fA]?.peakVal || 30;
    const valB = FOOD_CURVES[fB]?.peakVal || 30;
    
    if (fA.includes('parmesan') || fB.includes('parmesan')) {
      return "Parmesan cheese represents a fat-protein stabilizer. Combining it with high-glycemic carbohydrates will significantly reduce their absorption rate and smooth the peak curve.";
    }
    if (valA > valB) {
      return `Comparing curves reveals that ${foodA} triggers a higher average spike (+${valA}) than ${foodB} (+${valB}). Incorporating fibrous greens or healthy fats into a ${foodA} meal can help buffer the glycemic impact to match the flatter profile of ${foodB}.`;
    }
    return `Comparing curves reveals that ${foodB} triggers a higher average spike (+${valB}) than ${foodA} (+${valA}). Incorporating fibrous greens or healthy fats into a ${foodB} meal can help buffer the glycemic impact to match the flatter profile of ${foodA}.`;
  };

  // Draw comparison curves helper
  const renderComparisonChart = () => {
    if (compareList.length < 2) return null;
    const foodA = compareList[0];
    const foodB = compareList[1];
    const curveA = FOOD_CURVES[foodA.toLowerCase()] || FOOD_CURVES['carbonara'];
    const curveB = FOOD_CURVES[foodB.toLowerCase()] || FOOD_CURVES['pasta'];

    const chartW = width - 80;
    const chartH = 140;
    const chartLeft = 35;
    const chartRight = chartW - 10;
    const chartWidth = chartRight - chartLeft;
    
    const baselineY = 110;
    const valToY = (val: number) => baselineY - val * (80 / 55);

    const getBezierPath = (curve: typeof curveA) => {
      const peakX = chartLeft + chartWidth * curve.peakXPercent;
      const peakY = valToY(curve.peakVal);
      const endX = chartLeft + chartWidth * 0.95;
      const endY = valToY(curve.endVal);
      return `M ${chartLeft} ${baselineY} Q ${(chartLeft + peakX) / 2} ${baselineY} ${peakX} ${peakY} Q ${(peakX + endX) / 2} ${peakY} ${endX} ${endY}`;
    };

    return (
      <View style={styles.chartContainer}>
        {/* Legends */}
        <View style={styles.chartLegendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorDot, { backgroundColor: curveA.color }]} />
            <Text style={styles.legendText}>{foodA}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorDot, { backgroundColor: curveB.color }]} />
            <Text style={styles.legendText}>{foodB}</Text>
          </View>
        </View>

        <Svg width={chartW} height={chartH}>
          {/* Baseline */}
          <SvgLine x1={chartLeft} y1={baselineY} x2={chartRight} y2={baselineY} stroke={Colors.border} strokeWidth={1} />
          {/* Guide Line */}
          <SvgLine x1={chartLeft} y1={valToY(30)} x2={chartRight} y2={valToY(30)} stroke={Colors.borderLight} strokeWidth={0.5} strokeDasharray="3,3" />
          <SvgText x={chartLeft - 8} y={valToY(30) + 3} fontSize={9} fill={Colors.softStone} textAnchor="end">30</SvgText>

          {/* Curve A */}
          <SvgPath d={getBezierPath(curveA)} fill="none" stroke={curveA.color} strokeWidth={2.5} strokeLinecap="round" />
          {/* Curve B */}
          <SvgPath d={getBezierPath(curveB)} fill="none" stroke={curveB.color} strokeWidth={2.5} strokeLinecap="round" />

          {/* X axis labels */}
          <SvgText x={chartLeft} y={baselineY + 16} fontSize={8} fill={Colors.softStone} textAnchor="middle">0h</SvgText>
          <SvgText x={chartLeft + chartWidth * 0.25} y={baselineY + 16} fontSize={8} fill={Colors.softStone} textAnchor="middle">1h</SvgText>
          <SvgText x={chartLeft + chartWidth * 0.5} y={baselineY + 16} fontSize={8} fill={Colors.softStone} textAnchor="middle">2h</SvgText>
          <SvgText x={chartLeft + chartWidth * 0.75} y={baselineY + 16} fontSize={8} fill={Colors.softStone} textAnchor="middle">3h</SvgText>
          <SvgText x={chartLeft + chartWidth * 0.95} y={baselineY + 16} fontSize={8} fill={Colors.softStone} textAnchor="middle">4h</SvgText>
        </Svg>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>Foods</Text>
          <Text style={styles.subtitle}>Search your food memories</Text>
        </View>

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

        {/* Dynamic Sort Filters */}
        <View style={styles.sortContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSortBy('alphabetical');
              }}
              style={[styles.sortChip, sortBy === 'alphabetical' && styles.sortChipActive]}
            >
              <Text style={[styles.sortChipText, sortBy === 'alphabetical' && styles.sortChipTextActive]}>Alphabetical</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSortBy('observed');
              }}
              style={[styles.sortChip, sortBy === 'observed' && styles.sortChipActive]}
            >
              <Text style={[styles.sortChipText, sortBy === 'observed' && styles.sortChipTextActive]}>Frequency</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSortBy('stability');
              }}
              style={[styles.sortChip, sortBy === 'stability' && styles.sortChipActive]}
            >
              <Text style={[styles.sortChipText, sortBy === 'stability' && styles.sortChipTextActive]}>Stability Index</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Matches Section */}
        {isSearching && matches.length > 0 && (
          <>
            <Text style={styles.matchesCount}>
              {matches.length} {matches.length === 1 ? 'MATCH' : 'MATCHES'}
            </Text>
            
            {matches.map((food, idx) => {
              const isComparing = compareList.includes(food.name);
              return (
                <TouchableOpacity 
                  key={idx}
                  style={styles.heroCard}
                  activeOpacity={0.8}
                  onPress={() => nav.openFoodMemory({ foodId: food.name })}
                >
                  <View style={styles.heroCardTop}>
                    <View style={styles.heroCardHeaderRow}>
                      <View style={styles.heroCardText}>
                        <Text style={styles.heroTitle}>{food.name}</Text>
                        <Text style={styles.heroSubtitle}>Observed {food.count} times</Text>
                      </View>
                      
                      {/* Compare toggle checkbox */}
                      <TouchableOpacity 
                        onPress={() => handleToggleCompare(food.name)}
                        style={styles.compareSelector}
                      >
                        <Feather 
                          name={isComparing ? 'check-square' : 'square'} 
                          size={20} 
                          color={isComparing ? Colors.burntOrange : Colors.softStone} 
                        />
                        <Text style={[styles.compareLabel, isComparing && styles.compareLabelActive]}>Compare</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.heroMiddle}>
                    <Text style={styles.heroInsight}>
                      {food.insight}
                    </Text>
                    <View style={styles.heroBloom}>
                      <BloomFlower
                        petal1={Colors.bloom[food.bloom].petal1}
                        petal2={Colors.bloom[food.bloom].petal2}
                        petal3={Colors.bloom[food.bloom].petal3}
                        size={156}
                      />
                    </View>
                  </View>

                  <View style={styles.heroStats}>
                    <Text style={styles.heroStatLabel}>Average peak</Text>
                    <View style={styles.heroStatValueRow}>
                      <Text style={styles.heroStatValue}>+{food.peakVal}</Text>
                      <Text style={styles.heroStatUnit}>mg/dL</Text>
                    </View>
                    <Text style={styles.heroStatSubtext}>{food.peakTime}</Text>
                  </View>

                  <View style={styles.heroFooter}>
                    <Text style={styles.heroFooterText}>{food.lastObserved}</Text>
                    <View style={styles.exploreLink}>
                      <Text style={styles.exploreText}>Explore</Text>
                      <Feather name="arrow-right" size={16} color={Colors.burntOrange} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Other foods list */}
        {otherFoods.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {isSearching ? 'Other foods' : 'All foods'}
              </Text>
              <Text style={styles.stabilityRankingLabel}>
                {sortBy === 'stability' ? 'Stable (lowest peak first)' : 'Sorted'}
              </Text>
            </View>
            <View style={styles.otherFoodsList}>
              {otherFoods.map((food, i) => {
                const isComparing = compareList.includes(food.name);
                return (
                  <View key={i} style={styles.otherFoodRowContainer}>
                    <TouchableOpacity 
                      style={styles.otherFoodRow}
                      onPress={() => nav.openFoodMemory({ foodId: food.name })}
                    >
                      <View style={styles.otherFoodBloom}>
                        <BloomFlower
                          petal1={Colors.bloom[food.bloom].petal1}
                          petal2={Colors.bloom[food.bloom].petal2}
                          petal3={Colors.bloom[food.bloom].petal3}
                          size={52}
                        />
                      </View>
                      <View style={styles.otherFoodInfo}>
                        <Text style={styles.otherFoodName}>{food.name}</Text>
                        <Text style={styles.otherFoodCount}>Observed {food.count} times • Peak +{food.peakVal} mg/dL</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Compare Selection Checkbox */}
                    <TouchableOpacity 
                      onPress={() => handleToggleCompare(food.name)}
                      style={styles.rowCompareButton}
                    >
                      <Feather 
                        name={isComparing ? 'check-square' : 'square'} 
                        size={20} 
                        color={isComparing ? Colors.burntOrange : Colors.softStone} 
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Compare Action Bar */}
      {compareList.length > 0 && (
        <View style={[styles.floatingCompareBar, { bottom: insets.bottom + 12 }]}>
          <Text style={styles.compareBarText}>
            {compareList.length === 1 
              ? 'Select another food memory' 
              : `Compare: ${compareList[0]} • ${compareList[1]}`
            }
          </Text>
          <TouchableOpacity 
            activeOpacity={0.8}
            disabled={compareList.length < 2}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setShowComparisonModal(true);
            }}
            style={[
              styles.compareSubmitBtn,
              compareList.length < 2 && styles.compareSubmitBtnDisabled
            ]}
          >
            <Text style={styles.compareSubmitBtnText}>Compare Curves</Text>
            <Feather name="bar-chart-2" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Full-Screen Comparison Modal */}
      {showComparisonModal && compareList.length === 2 && (
        <View style={StyleSheet.absoluteFillObject}>
          <PaperBackground>
            <View style={[styles.compareModalRoot, { paddingTop: insets.top + Spacing.sm }]}>
              {/* Header */}
              <View style={styles.compareModalHeader}>
                <Text style={styles.compareModalTitle}>Glycemic Trace Comparison</Text>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setShowComparisonModal(false);
                  }}
                  style={styles.modalCloseBtn}
                >
                  <Feather name="x" size={24} color={Colors.ink} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                contentContainerStyle={[styles.compareModalScrollContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
              >
                {/* SVG Curves */}
                {renderComparisonChart()}

                {/* Comparative Stats Table */}
                <View style={styles.tableCard}>
                  <Text style={styles.tableCardTitle}>METABOLIC DATA COMPARISON</Text>
                  
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableCol, styles.tableColHeader]}></Text>
                    <Text style={[styles.tableCol, styles.tableColHeader]}>{compareList[0]}</Text>
                    <Text style={[styles.tableCol, styles.tableColHeader]}>{compareList[1]}</Text>
                  </View>

                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Average Peak</Text>
                    <Text style={styles.tableVal}>{ALL_FOODS.find(f => f.name === compareList[0])?.peakValStr} mg/dL</Text>
                    <Text style={styles.tableVal}>{ALL_FOODS.find(f => f.name === compareList[1])?.peakValStr} mg/dL</Text>
                  </View>

                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Peak Time</Text>
                    <Text style={styles.tableVal}>{FOOD_CURVES[compareList[0].toLowerCase()]?.peakTime}</Text>
                    <Text style={styles.tableVal}>{FOOD_CURVES[compareList[1].toLowerCase()]?.peakTime}</Text>
                  </View>

                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Logs count</Text>
                    <Text style={styles.tableVal}>{ALL_FOODS.find(f => f.name === compareList[0])?.count} times</Text>
                    <Text style={styles.tableVal}>{ALL_FOODS.find(f => f.name === compareList[1])?.count} times</Text>
                  </View>
                </View>

                {/* Zen Insights Summary */}
                <View style={styles.comparisonInsightsCard}>
                  <Feather name="info" size={18} color={Colors.burntOrange} style={{ marginTop: 2 }} />
                  <Text style={styles.comparisonInsightsText}>
                    {getComparisonZenNotes(compareList[0], compareList[1])}
                  </Text>
                </View>

                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setCompareList([]);
                    setShowComparisonModal(false);
                  }}
                  style={styles.resetCompareBtn}
                >
                  <Text style={styles.resetCompareBtnText}>Clear selections</Text>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </PaperBackground>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  titleSection: { paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  title: { ...TypeScale.display, color: Colors.ink },
  subtitle: { ...TypeScale.body, color: Colors.softStone, marginTop: 4 },
  scroll: { paddingHorizontal: Spacing.xxl },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.ink,
  },
  clearIcon: {
    padding: Spacing.xs,
  },

  sortContainer: {
    marginBottom: Spacing.md,
  },
  sortScroll: {
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  sortChip: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipActive: {
    backgroundColor: Colors.burntOrange,
  },
  sortChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.softStone,
    textAlign: 'center',
  },
  sortChipTextActive: {
    color: '#FCFAF6',
    fontFamily: 'Inter_600SemiBold',
  },

  matchesCount: {
    ...TypeScale.label,
    color: Colors.softStone,
    marginBottom: Spacing.md,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  sectionTitle: { 
    ...TypeScale.sectionTitle, 
    color: Colors.ink, 
  },
  stabilityRankingLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.softStone,
  },

  // Hero Card layout
  heroCard: {
    backgroundColor: '#F3EDE0',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  heroCardTop: {
    marginBottom: Spacing.md,
  },
  heroCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroCardText: {},
  compareSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  compareLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.softStone,
  },
  compareLabelActive: {
    color: Colors.burntOrange,
    fontFamily: 'Inter_600SemiBold',
  },

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
    marginBottom: Spacing.lg,
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
  otherFoodRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  otherFoodRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
  },
  rowCompareButton: {
    padding: Spacing.md,
  },
  otherFoodBloom: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherFoodInfo: {
    flex: 1,
  },
  otherFoodName: {
    ...TypeScale.cardTitle,
    color: Colors.ink,
    marginBottom: 2,
  },
  otherFoodCount: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    textTransform: 'none',
  },

  // Floating Compare bar
  floatingCompareBar: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: '#1E1B18', // charcoal
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 99,
  },
  compareBarText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#C4B9AD',
    flex: 1,
    paddingRight: Spacing.sm,
  },
  compareSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.burntOrange,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radius.full,
    gap: 6,
  },
  compareSubmitBtnDisabled: {
    backgroundColor: '#4E453C',
  },
  compareSubmitBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFF',
  },

  // Modal styling
  compareModalRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  compareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  compareModalTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 22,
    color: Colors.ink,
  },
  modalCloseBtn: {
    padding: Spacing.xs,
  },
  compareModalScrollContent: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  chartContainer: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: '#E6DFD3',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  chartLegendRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.ink,
  },

  tableCard: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: '#E6DFD3',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  tableCardTitle: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    letterSpacing: 1.2,
    marginBottom: Spacing.md,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  tableCol: {
    flex: 1,
    textAlign: 'center',
  },
  tableColHeader: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.ink,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
  },
  tableLabel: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.softStone,
  },
  tableVal: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.ink,
  },

  comparisonInsightsCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: 'rgba(217, 121, 71, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(217, 121, 71, 0.12)',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  comparisonInsightsText: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.ink,
    flex: 1,
  },

  resetCompareBtn: {
    borderWidth: 1,
    borderColor: '#E6DFD3',
    borderRadius: Radius.full,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  resetCompareBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.softStone,
  },
});
