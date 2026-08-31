import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius, TypeScale } from '@/constants/theme';
import { PaperBackground } from '@/components/PaperBackground';
import { BloomFlower } from '@/components/BloomFlower';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

const PAST_MOMENTS = [
  { date: 'May 28, 2026', time: '7:32 PM', start: 112, insulin: 6, after: 128, bloom: 'pizza' as const },
  { date: 'April 17, 2026', time: '8:10 PM', start: 95, insulin: 5, after: 102, bloom: 'walks' as const },
  { date: 'March 2, 2026', time: '7:15 PM', start: 105, insulin: 6, after: 114, bloom: 'mornings' as const },
];

const PATTERNS = [
  { icon: 'moon', title: 'When eaten after 8pm', subtitle: 'Average rise +17% higher' },
  { icon: 'activity', title: 'After a walk', subtitle: 'Average rise -12% lower' },
  { icon: 'cloud', title: 'When sleep was poor', subtitle: 'Response becomes less predictable' },
];

export default function FoodMemoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  // Draw the simple soft curve SVG
  const graphWidth = width - (Spacing.xxl * 2);
  const graphHeight = 200;
  
  // Dummy curve path
  const curvePath = `M 0 ${graphHeight - 40} Q ${graphWidth * 0.3} ${graphHeight - 40}, ${graphWidth * 0.5} 40 T ${graphWidth} ${graphHeight - 60}`;
  // Area under curve
  const areaPath = `${curvePath} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`;

  return (
    <PaperBackground>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Feather name="chevron-left" size={24} color={Colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="more-horizontal" size={24} color={Colors.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.heroSection}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.title}>Carbonara</Text>
              <Text style={styles.subtitle}>Observed 7 times</Text>
              
              <Text style={styles.insightText}>
                A meal that tends{'\n'}to linger.
              </Text>
            </View>
            <View style={styles.heroBloom}>
              <BloomFlower
                petal1={Colors.bloom.mornings.petal1}
                petal2={Colors.bloom.mornings.petal2}
                petal3={Colors.bloom.mornings.petal3}
                flare1Color="#D7B36A"
                flare2Color="#A98BC5"
                size={208}
              />
            </View>
          </View>

          {/* Average Response */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>AVERAGE RESPONSE</Text>
            <View style={styles.timeDropdown}>
              <Text style={styles.timeDropdownText}>4 hours</Text>
              <Feather name="chevron-down" size={14} color={Colors.softStone} />
            </View>
          </View>

          <View style={styles.graphContainer}>
            <Svg width={graphWidth} height={graphHeight}>
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={Colors.burntOrange} stopOpacity="0.15" />
                  <Stop offset="1" stopColor={Colors.burntOrange} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              
              {/* Y Axis labels */}
              <SvgText x={0} y={40} fontSize="10" fill={Colors.softStone}>+60</SvgText>
              <SvgText x={0} y={110} fontSize="10" fill={Colors.softStone}>+30</SvgText>
              <SvgText x={0} y={graphHeight - 40} fontSize="10" fill={Colors.softStone}>Baseline</SvgText>
              <SvgText x={0} y={graphHeight} fontSize="10" fill={Colors.softStone}>-30</SvgText>

              {/* X Axis labels */}
              <SvgText x={30} y={graphHeight + 15} fontSize="10" fill={Colors.softStone}>0</SvgText>
              <SvgText x={graphWidth * 0.25} y={graphHeight + 15} fontSize="10" fill={Colors.softStone}>1h</SvgText>
              <SvgText x={graphWidth * 0.5} y={graphHeight + 15} fontSize="10" fill={Colors.softStone}>2h</SvgText>
              <SvgText x={graphWidth * 0.75} y={graphHeight + 15} fontSize="10" fill={Colors.softStone}>3h</SvgText>
              <SvgText x={graphWidth - 15} y={graphHeight + 15} fontSize="10" fill={Colors.softStone}>4h</SvgText>

              <Path d={areaPath} fill="url(#grad)" />
              <Path d={curvePath} stroke={Colors.burntOrange} strokeWidth="2" fill="none" />
              
              {/* Peak marker */}
              <Line x1={graphWidth * 0.5} y1={40} x2={graphWidth * 0.5} y2={graphHeight} stroke={Colors.burntOrange} strokeWidth="1" strokeDasharray="4,4" strokeOpacity={0.3} />
              <Circle cx={graphWidth * 0.5} cy={40} r="4" fill={Colors.burntOrange} />
            </Svg>

            {/* Peak info overlay (approx positioning) */}
            <View style={styles.peakInfo}>
              <Text style={styles.peakLabel}>Peak after</Text>
              <Text style={styles.peakTime}>1h 45m</Text>
              <View style={styles.peakValueRow}>
                <Text style={styles.peakValue}>+42</Text>
                <Text style={styles.peakUnit}>mg/dL</Text>
              </View>
            </View>
          </View>

          {/* Average rise text */}
          <View style={styles.averageRiseContainer}>
            <Feather name="sun" size={20} color={Colors.softStone} style={styles.averageRiseIcon} />
            <View>
              <Text style={styles.averageRiseText}>Average rise <Text style={{fontFamily: 'Inter_500Medium', color: Colors.ink}}>+42 mg/dL</Text></Text>
              <Text style={styles.averageRiseSub}>from baseline</Text>
            </View>
          </View>

          {/* Past Moments */}
          <Text style={[styles.sectionTitle, { marginTop: Spacing.xl * 2 }]}>PAST MOMENTS</Text>
          <View style={styles.timelineContainer}>
            {PAST_MOMENTS.map((moment, i) => (
              <View key={i} style={styles.timelineRow}>
                <View style={styles.timelineLine}>
                  <View style={[styles.timelineDot, { backgroundColor: Colors.bloom[moment.bloom].petal1 }]} />
                  {i < PAST_MOMENTS.length - 1 && <View style={styles.timelineSegment} />}
                </View>
                
                <View style={styles.timelineContent}>
                  <View style={styles.momentHeader}>
                    <Text style={styles.momentDate}>{moment.date}</Text>
                    <Text style={styles.momentTime}> · {moment.time}</Text>
                  </View>
                  
                  <View style={styles.momentStatsRow}>
                    <View style={styles.momentStat}>
                      <Text style={styles.momentStatLabel}>Starting</Text>
                      <Text style={styles.momentStatValue}>{moment.start}</Text>
                      <Text style={styles.momentStatUnit}>mg/dL</Text>
                    </View>
                    <View style={styles.momentStat}>
                      <Text style={styles.momentStatLabel}>Insulin</Text>
                      <Text style={styles.momentStatValue}>{moment.insulin}</Text>
                      <Text style={styles.momentStatUnit}>units</Text>
                    </View>
                    <View style={styles.momentStat}>
                      <Text style={styles.momentStatLabel}>After 4h</Text>
                      <Text style={styles.momentStatValue}>{moment.after}</Text>
                      <Text style={styles.momentStatUnit}>mg/dL</Text>
                    </View>
                    <View style={styles.momentBloomWrap}>
                      <BloomFlower
                        petal1={Colors.bloom[moment.bloom].petal1}
                        petal2={Colors.bloom[moment.bloom].petal2}
                        petal3={Colors.bloom[moment.bloom].petal3}
                        size={32}
                      />
                      <Feather name="chevron-right" size={16} color={Colors.softStone} style={{marginLeft: 8}} />
                    </View>
                  </View>
                </View>
              </View>
            ))}
            
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View all 7 moments</Text>
              <Feather name="arrow-right" size={16} color={Colors.softStone} />
            </TouchableOpacity>
          </View>

          {/* Patterns */}
          <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>PATTERNS WE'VE NOTICED</Text>
          <View style={styles.patternsContainer}>
            {PATTERNS.map((pattern, i) => (
              <TouchableOpacity key={i} style={styles.patternRow}>
                <View style={[styles.patternIconWrap, { backgroundColor: 'rgba(0,0,0,0.03)' }]}>
                  <Feather name={pattern.icon as any} size={20} color={Colors.burntOrange} />
                </View>
                <View style={styles.patternInfo}>
                  <Text style={styles.patternTitle}>{pattern.title}</Text>
                  <Text style={styles.patternSubtitle}>{pattern.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={Colors.softStone} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footerNote}>
            <Feather name="heart" size={16} color={Colors.softStone} style={{marginRight: 8}} />
            <Text style={styles.footerText}>Your body. Your patterns. Your story.</Text>
          </View>

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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.sm,
  },
  scroll: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
  },

  heroSection: {
    flexDirection: 'row',
    marginBottom: Spacing.xxl,
    minHeight: 180,
  },
  heroTextContainer: {
    flex: 1,
    paddingTop: Spacing.sm,
  },
  title: {
    ...TypeScale.display,
    fontSize: 40,
    lineHeight: 44,
    color: Colors.ink,
  },
  subtitle: {
    ...TypeScale.body,
    color: Colors.softStone,
    marginTop: 4,
  },
  insightText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 18,
    lineHeight: 26,
    color: Colors.ink,
    marginTop: Spacing.xl,
  },
  heroBloom: {
    position: 'absolute',
    right: -50,
    top: -10,
    opacity: 0.9,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    letterSpacing: 1.2,
    marginBottom: Spacing.md,
  },
  timeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 4,
  },
  timeDropdownText: {
    ...TypeScale.metadata,
    color: Colors.ink,
    textTransform: 'none',
  },

  graphContainer: {
    height: 230,
    marginBottom: Spacing.lg,
  },
  peakInfo: {
    position: 'absolute',
    right: '15%',
    top: 10,
    alignItems: 'flex-start',
  },
  peakLabel: {
    ...TypeScale.metadata,
    color: Colors.softStone,
  },
  peakTime: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.ink,
  },
  peakValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  peakValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 20,
    letterSpacing: -0.5,
    color: Colors.ink,
  },
  peakUnit: {
    ...TypeScale.metadata,
    color: Colors.ink,
    textTransform: 'none',
    marginLeft: 2,
  },

  averageRiseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: Spacing.xl,
  },
  averageRiseIcon: {
    marginRight: Spacing.md,
  },
  averageRiseText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.softStone,
  },
  averageRiseSub: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    textTransform: 'none',
    marginTop: 2,
  },

  timelineContainer: {
    marginBottom: Spacing.xl,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  timelineSegment: {
    width: 1,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginTop: 8,
    marginBottom: -Spacing.lg,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  momentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  momentDate: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.ink,
  },
  momentTime: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    textTransform: 'none',
  },
  momentStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  momentStat: {
    flex: 1,
  },
  momentStatLabel: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    marginBottom: 4,
  },
  momentStatValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 22,
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  momentStatUnit: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    textTransform: 'none',
    marginTop: 2,
  },
  momentBloomWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  viewAllText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.softStone,
  },

  patternsContainer: {
    marginBottom: Spacing.xl,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  patternIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  patternInfo: {
    flex: 1,
  },
  patternTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 2,
  },
  patternSubtitle: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    textTransform: 'none',
  },

  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: Radius.lg,
  },
  footerText: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    textTransform: 'none',
  },
});
