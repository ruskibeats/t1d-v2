import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, TypeScale } from '@/constants/theme';
import { PaperBackground } from '@/components/PaperBackground';
import { BloomFlower } from '@/components/BloomFlower';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useNavigation } from '../navigation/NavigationProvider';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

type BloomKey = 'pizza' | 'walks' | 'mornings' | 'jiujitsu' | 'sleep' | 'evening';

interface FoodConfig {
  title: string;
  subtitle: string;
  insightText: string;
  bloom: BloomKey;
  flare1Color?: string;
  flare2Color?: string;
  peakTime: string;
  peakValue: string;
  averageRise: string;
  totalMoments: number;
  graph: {
    peakXPercent: number;
    peakVal: number;
    endVal: number;
  };
  pastMoments: Array<{
    date: string;
    time: string;
    start: number;
    insulin: number;
    after: number;
    bloom: BloomKey;
    peakXPercent?: number;
    peakVal?: number;
    endVal?: number;
    peakTime?: string;
    notes?: string;
    sleep?: string;
    feeling?: string;
    overlappingLogs?: Array<{
      food: string;
      timeOffset: string;
      timeOffsetHours: number;
    }>;
  }>;
  patterns: Array<{
    icon: string;
    title: string;
    subtitle: string;
  }>;
}

const FOOD_DATA: Record<string, FoodConfig> = {
  carbonara: {
    title: 'Carbonara',
    subtitle: 'Observed 7 times',
    insightText: 'A meal that tends\nto linger.',
    bloom: 'mornings',
    flare1Color: '#D7B36A',
    flare2Color: '#A98BC5',
    peakTime: '1h 45m',
    peakValue: '+42',
    averageRise: '+42 mg/dL',
    totalMoments: 7,
    graph: {
      peakXPercent: 0.44, // 1.75 hours / 4 hours
      peakVal: 42,
      endVal: 20,
    },
    pastMoments: [
      { 
        date: 'May 28, 2026', 
        time: '7:32 PM', 
        start: 112, 
        insulin: 6, 
        after: 128, 
        bloom: 'pizza', 
        peakXPercent: 0.6, 
        peakVal: 48, 
        endVal: 16, 
        peakTime: '2h 15m', 
        notes: 'Had dinner with Tom near the canal. Walked home in the cool rain. Felt peaceful.', 
        sleep: 'Deep sleep (7.8h) — no overnight rise', 
        feeling: 'Grounding energy, high focus',
        overlappingLogs: [{ food: 'Gelato', timeOffset: '2.5h', timeOffsetHours: 2.5 }]
      },
      { 
        date: 'April 17, 2026', 
        time: '8:10 PM', 
        start: 95, 
        insulin: 5, 
        after: 102, 
        bloom: 'walks', 
        peakXPercent: 0.35, 
        peakVal: 22, 
        endVal: 7, 
        peakTime: '1h 15m', 
        notes: 'Rushed lunch at the office. Left a heavy trace that lingered into the afternoon.', 
        sleep: 'Short sleep (5.2h) — high fatigue', 
        feeling: 'A bit hyperactive and stressed',
        overlappingLogs: [{ food: 'Espresso & Biscotti', timeOffset: '1.5h', timeOffsetHours: 1.5 }]
      },
      { 
        date: 'March 2, 2026', 
        time: '7:15 PM', 
        start: 105, 
        insulin: 6, 
        after: 114, 
        bloom: 'mornings', 
        peakXPercent: 0.45, 
        peakVal: 35, 
        endVal: 9, 
        peakTime: '1h 45m', 
        notes: 'Weekend dinner. Cooked for the family. High glycemic delay but beautiful conversation.', 
        sleep: 'Restless sleep (6.1h) — delayed digestion', 
        feeling: 'Relaxed, happy',
        overlappingLogs: [{ food: 'Matcha Latte', timeOffset: '5.5h', timeOffsetHours: 5.5 }]
      },
    ],
    patterns: [
      { icon: 'moon', title: 'When eaten after 8pm', subtitle: 'Average rise +17% higher' },
      { icon: 'activity', title: 'After a walk', subtitle: 'Average rise -12% lower' },
      { icon: 'cloud', title: 'When sleep was poor', subtitle: 'Response becomes less predictable' },
    ],
  },
  pasta: {
    title: 'Pasta',
    subtitle: 'Observed 16 times',
    insightText: 'Sharp spike,\nquick return.',
    bloom: 'mornings',
    flare1Color: '#B5C08D',
    flare2Color: '#70824B',
    peakTime: '1h 15m',
    peakValue: '+54',
    averageRise: '+54 mg/dL',
    totalMoments: 16,
    graph: {
      peakXPercent: 0.31, // 1.25 hours / 4 hours
      peakVal: 54,
      endVal: 10,
    },
    pastMoments: [
      { date: 'June 10, 2026', time: '1:15 PM', start: 98, insulin: 8, after: 105, bloom: 'walks', peakXPercent: 0.3, peakVal: 40, endVal: 7, peakTime: '1h 10m', notes: 'Quick fuel before BJJ session. Cleared fast, active mat warmups.', sleep: 'Deep sleep (8.0h) — excellent rest', feeling: 'Energetic and warm' },
      { date: 'June 2, 2026', time: '12:45 PM', start: 102, insulin: 7, after: 110, bloom: 'mornings', peakXPercent: 0.35, peakVal: 55, endVal: 8, peakTime: '1h 20m', notes: 'Lunch at that cozy Italian place. Stabilized quickly by a stroll in the park.', sleep: 'Stable sleep (7.0h) — zero drift', feeling: 'Relaxed, mindful' },
      { date: 'May 28, 2026', time: '1:30 PM', start: 95, insulin: 8, after: 101, bloom: 'pizza', peakXPercent: 0.4, peakVal: 62, endVal: 15, peakTime: '1h 35m', notes: 'Eaten late after a stressful workday. Cortisol made this spike much higher.', sleep: 'Interrupted sleep (4.8h) — dawn effect active', feeling: 'Fatigued, foggy' },
    ],
    patterns: [
      { icon: 'activity', title: 'With fiber starter', subtitle: 'Average rise -22% lower' },
      { icon: 'sun', title: 'Eaten at lunch', subtitle: 'Faster clearance observed' },
      { icon: 'zap', title: 'High intensity walk', subtitle: 'Peak reduced by 30%' },
    ],
  },
  spaghetti: {
    title: 'Spaghetti',
    subtitle: 'Observed 11 times',
    insightText: 'Moderate spike,\ndelayed tail.',
    bloom: 'walks',
    flare1Color: '#7EAEC3',
    flare2Color: '#2B6B86',
    peakTime: '2h 00m',
    peakValue: '+36',
    averageRise: '+36 mg/dL',
    totalMoments: 11,
    graph: {
      peakXPercent: 0.50, // 2.0 hours / 4 hours
      peakVal: 36,
      endVal: 15,
    },
    pastMoments: [
      { date: 'June 5, 2026', time: '7:45 PM', start: 108, insulin: 6, after: 118, bloom: 'walks', peakXPercent: 0.45, peakVal: 28, endVal: 10, peakTime: '1h 50m', notes: 'Portion controlled dinner. Followed by a light yoga session.', sleep: 'Deep rest (7.5h) — peaceful mind', feeling: 'Light, aligned' },
      { date: 'May 29, 2026', time: '8:00 PM', start: 101, insulin: 6, after: 112, bloom: 'pizza', peakXPercent: 0.55, peakVal: 46, endVal: 12, peakTime: '2h 10m', notes: 'Spaghetti with rich marinara sauce. Met up with friends, stayed up talking.', sleep: 'Restless sleep (5.8h) — slow tail', feeling: 'Excited but tired' },
      { date: 'May 15, 2026', time: '1:30 PM', start: 99, insulin: 5, after: 105, bloom: 'mornings', peakXPercent: 0.5, peakVal: 34, endVal: 6, peakTime: '2h 00m', notes: 'Late night plate after travel. Body cleared it slowly during sleep.', sleep: 'Interrupted sleep (5.0h) — jetlag drift', feeling: 'Exhausted' },
    ],
    patterns: [
      { icon: 'moon', title: 'Eaten late evening', subtitle: 'Average rise +25% higher' },
      { icon: 'activity', title: 'Portion control', subtitle: 'Peak reduced by 40%' },
      { icon: 'droplet', title: 'With red wine', subtitle: 'Flatter but prolonged response' },
    ],
  },
  'creamy pasta': {
    title: 'Creamy pasta',
    subtitle: 'Observed 5 times',
    insightText: 'Slow absorption,\nflat plateau.',
    bloom: 'sleep',
    flare1Color: '#D4B483',
    flare2Color: '#B97B3F',
    peakTime: '2h 30m',
    peakValue: '+28',
    averageRise: '+28 mg/dL',
    totalMoments: 5,
    graph: {
      peakXPercent: 0.625, // 2.5 hours / 4 hours
      peakVal: 28,
      endVal: 18,
    },
    pastMoments: [
      { date: 'June 12, 2026', time: '8:15 PM', start: 110, insulin: 5, after: 122, bloom: 'sleep', peakXPercent: 0.65, peakVal: 32, endVal: 12, peakTime: '2h 40m', notes: 'Very high-fat plate. Delayed insulin absorbency, flat plateau.', sleep: 'Deep sleep (8.5h) — overnight plateau', feeling: 'Heavy, relaxed' },
      { date: 'June 3, 2026', time: '7:30 PM', start: 97, insulin: 5, after: 109, bloom: 'pizza', peakXPercent: 0.6, peakVal: 24, endVal: 15, peakTime: '2h 20m', notes: 'Cooked creamy pasta on Sunday. Felt the fat delay peak for hours.', sleep: 'Restless sleep (6.0h) — elevated baseline', feeling: 'Satisfied but heavy' },
      { date: 'May 20, 2026', time: '8:30 PM', start: 104, insulin: 6, after: 116, bloom: 'sleep', peakXPercent: 0.62, peakVal: 30, endVal: 16, peakTime: '2h 30m', notes: 'Mini portion size before a heavy training session. Cleared fast.', sleep: 'Stable sleep (7.2h) — normal overnight', feeling: 'Focused' },
    ],
    patterns: [
      { icon: 'clock', title: 'Fat-protein delay', subtitle: 'Peak delayed by 45 minutes' },
      { icon: 'moon', title: 'Next-day fasting', subtitle: 'Fasting glucose +12 mg/dL higher' },
      { icon: 'activity', title: 'Post-meal activity', subtitle: 'Attenuates late-phase rise' },
    ],
  },
  parmesan: {
    title: 'Parmesan',
    subtitle: 'Observed 9 times',
    insightText: 'Minimal impact,\nstable line.',
    bloom: 'evening',
    flare1Color: '#E9A07D',
    flare2Color: '#D97947',
    peakTime: '0h 45m',
    peakValue: '+8',
    averageRise: '+8 mg/dL',
    totalMoments: 9,
    graph: {
      peakXPercent: 0.1875, // 0.75 hours / 4 hours
      peakVal: 8,
      endVal: 0,
    },
    pastMoments: [
      { date: 'June 13, 2026', time: '9:00 PM', start: 95, insulin: 0, after: 98, bloom: 'evening', peakXPercent: 0.2, peakVal: 6, endVal: 3, peakTime: '0h 45m', notes: 'Snacked on a few chunks before dinner. Practically zero glycemic trace.', sleep: 'Deep rest (8.2h) — highly stable', feeling: 'Perfect satiety' },
      { date: 'June 7, 2026', time: '4:15 PM', start: 92, insulin: 0, after: 94, bloom: 'evening', peakXPercent: 0.15, peakVal: 5, endVal: 2, peakTime: '0h 35m', notes: 'Added parmesan shavings on top of salad. Calm line throughout.', sleep: 'Deep rest (7.8h) — no spikes', feeling: 'Light and crisp' },
      { date: 'May 24, 2026', time: '8:30 PM', start: 99, insulin: 0, after: 101, bloom: 'walks', peakXPercent: 0.22, peakVal: 10, endVal: 2, peakTime: '0h 50m', notes: 'Late night cheese snack. Stabilized pre-bed values.', sleep: 'Restless sleep (5.9h) — stable sugar', feeling: 'Tired' },
    ],
    patterns: [
      { icon: 'activity', title: 'Pre-meal snack', subtitle: 'Stabilizes subsequent meal rise' },
      { icon: 'heart', title: 'Zero insulin impact', subtitle: 'No significant rise observed' },
      { icon: 'shield', title: 'Pure dairy response', subtitle: 'Very high glycemic tolerance' },
    ],
  },
};

const formatAxisLabel = (hours: number) => {
  if (hours === 0) return '0';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const whole = Math.floor(hours);
  const frac = hours - whole;
  if (frac === 0) return `${whole}h`;
  return `${hours.toFixed(1)}h`;
};

export default function FoodMemoryScreen({ foodId }: { foodId: string }) {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [selectedMomentIndex, setSelectedMomentIndex] = React.useState<number | null>(null);
  const [timeframe, setTimeframe] = React.useState<'week' | 'month' | 'year' | 'all'>('year');
  const [scrubX, setScrubX] = React.useState<number | null>(null);
  const [duration, setDuration] = React.useState(4);
  const [showAllMoments, setShowAllMoments] = React.useState(false);
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);
  const [highlightedPatternIdx, setHighlightedPatternIdx] = React.useState<number | null>(null);

  const [shouldRenderPicker, setShouldRenderPicker] = React.useState(false);
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const sheetTranslateY = React.useRef(new Animated.Value(350)).current;

  const openPicker = () => {
    setShouldRenderPicker(true);
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closePicker = (onComplete?: () => void) => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 350,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShouldRenderPicker(false);
      if (onComplete) onComplete();
    });
  };

  const config = FOOD_DATA[foodId?.toLowerCase()] || FOOD_DATA['carbonara'];

  // Derived averages based on timeframe
  const getAverageParams = (tf: typeof timeframe) => {
    const defaultGraph = config.graph;
    const defaultPeakTime = config.peakTime;
    const defaultPeakValueStr = config.peakValue;
    
    const valBase = Math.abs(parseInt(defaultPeakValueStr, 10)) || 30;
    
    switch (tf) {
      case 'week':
        return {
          peakVal: Math.round(valBase * 0.8),
          peakXPercent: Math.max(0.2, defaultGraph.peakXPercent - 0.05),
          endVal: Math.round(defaultGraph.endVal * 0.75),
          peakTime: '1h 30m',
          subtitle: `Based on 2 logs this week`,
        };
      case 'month':
        return {
          peakVal: Math.round(valBase * 0.9),
          peakXPercent: Math.max(0.25, defaultGraph.peakXPercent - 0.02),
          endVal: Math.round(defaultGraph.endVal * 0.9),
          peakTime: '1h 40m',
          subtitle: `Based on 5 logs this month`,
        };
      case 'year':
        return {
          peakVal: valBase,
          peakXPercent: defaultGraph.peakXPercent,
          endVal: defaultGraph.endVal,
          peakTime: defaultPeakTime,
          subtitle: `Based on all logs this year`,
        };
      case 'all':
        return {
          peakVal: Math.round(valBase * 1.15),
          peakXPercent: Math.min(0.8, defaultGraph.peakXPercent + 0.04),
          endVal: Math.round(defaultGraph.endVal * 1.25),
          peakTime: '1h 55m',
          subtitle: `Based on ${config.totalMoments} logs all-time`,
        };
    }
  };

  const tfParams = getAverageParams(timeframe);

  // Svg dimensions
  const graphWidth = width - (Spacing.xxl * 2);
  const graphHeight = 220; // Full Svg container height to allow bottom X labels

  // Coordinates inside Svg
  const chartLeft = 45;
  const chartRight = graphWidth - 10;
  const chartTop = 30;
  const chartBottom = 200;
  const chartWidth = chartRight - chartLeft;

  const baselineY = 150;

  // Value-to-Y conversion: baseline is 150, 30 units = 50px
  const valToY = (val: number) => baselineY - val * (50 / 30);

  const startX = chartLeft;
  const startY = baselineY;

  // State overrides for curve
  const isMomentSelected = selectedMomentIndex !== null;
  const activeMoment = isMomentSelected ? config.pastMoments[selectedMomentIndex] : null;

  const basePeakXPercent = activeMoment && activeMoment.peakXPercent !== undefined ? activeMoment.peakXPercent : tfParams.peakXPercent;
  const scaledPeakXPercent = Math.min(0.92, basePeakXPercent * (4 / duration));

  const peakVal = activeMoment && activeMoment.peakVal !== undefined ? activeMoment.peakVal : tfParams.peakVal;
  const endVal = activeMoment && activeMoment.endVal !== undefined ? activeMoment.endVal : tfParams.endVal;

  const activeBloomKey = activeMoment ? activeMoment.bloom : config.bloom;
  const activeBloom = Colors.bloom[activeBloomKey];
  const curveColor = activeMoment ? activeBloom.petal1 : Colors.burntOrange;

  const peakX = chartLeft + chartWidth * scaledPeakXPercent;
  const peakY = valToY(peakVal);

  const endX = chartRight;
  const endY = valToY(endVal);

  // Construct active curve path (Bezier)
  const cp1x = startX + (peakX - startX) * 0.45;
  const cp1y = startY;
  const cp2x = peakX - (peakX - startX) * 0.3;
  const cp2y = peakY;

  const cp3x = peakX + (endX - peakX) * 0.3;
  const cp3y = peakY;
  const cp4x = endX - (endX - peakX) * 0.5;
  const cp4y = endY;

  const curvePath = `M ${startX} ${startY} ` +
    `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${peakX} ${peakY} ` +
    `C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${endX} ${endY}`;

  const areaPath = `${curvePath} L ${endX} ${baselineY} L ${startX} ${baselineY} Z`;

  // Construct background average reference curve path
  const avgPeakXPercent = Math.min(0.92, tfParams.peakXPercent * (4 / duration));
  const avgPeakX = chartLeft + chartWidth * avgPeakXPercent;
  const avgPeakY = valToY(tfParams.peakVal);
  const avgEndX = chartRight;
  const avgEndY = valToY(tfParams.endVal);

  const acp1x = startX + (avgPeakX - startX) * 0.45;
  const acp1y = startY;
  const acp2x = avgPeakX - (avgPeakX - startX) * 0.3;
  const acp2y = avgPeakY;

  const acp3x = avgPeakX + (avgEndX - avgPeakX) * 0.3;
  const acp3y = avgPeakY;
  const acp4x = avgEndX - (avgEndX - avgPeakX) * 0.5;
  const acp4y = avgEndY;

  const avgCurvePath = `M ${startX} ${startY} ` +
    `C ${acp1x} ${acp1y}, ${acp2x} ${acp2y}, ${avgPeakX} ${avgPeakY} ` +
    `C ${acp3x} ${acp3y}, ${acp4x} ${acp4y}, ${avgEndX} ${avgEndY}`;

  const getBezierY = (x: number) => {
    if (x <= startX) return startY;
    if (x >= endX) return endY;
    if (x <= peakX) {
      const t = (x - startX) / (peakX - startX);
      const mt = 1 - t;
      return mt * mt * mt * startY +
             3 * mt * mt * t * cp1y +
             3 * mt * t * t * cp2y +
             t * t * t * peakY;
    } else {
      const t = (x - peakX) / (endX - peakX);
      const mt = 1 - t;
      return mt * mt * mt * peakY +
             3 * mt * mt * t * cp3y +
             3 * mt * t * t * cp4y +
             t * t * t * endY;
    }
  };

  const isScrubbing = scrubX !== null;
  const scrubY = isScrubbing ? getBezierY(scrubX!) : startY;

  // Dynamic overlays based on scrubbing
  let displayValue = '';
  let displayTime = '';
  let displayLabel = '';

  const getScrubTimeText = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  if (isScrubbing) {
    const scrubVal = Math.round((baselineY - scrubY) * (30 / 50));
    displayValue = scrubVal >= 0 ? `+${scrubVal}` : `${scrubVal}`;
    
    const scrubPercent = (scrubX! - chartLeft) / chartWidth;
    const mins = scrubPercent * duration * 60;
    displayTime = getScrubTimeText(mins);
    displayLabel = 'At this point';
  } else {
    displayValue = activeMoment && activeMoment.peakVal !== undefined ? `+${activeMoment.peakVal}` : `+${tfParams.peakVal}`;
    
    const basePeakTimeMins = basePeakXPercent * 4 * 60;
    const ph = Math.floor(basePeakTimeMins / 60);
    const pm = Math.round(basePeakTimeMins % 60);
    const derivedPeakTimeStr = ph === 0 ? `${pm}m` : `${ph}h ${pm}m`;

    displayTime = activeMoment && activeMoment.peakTime ? activeMoment.peakTime : derivedPeakTimeStr;
    displayLabel = isMomentSelected ? 'Peak response' : 'Average peak';
  }

  return (
    <PaperBackground>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.iconButton}>
            <Feather name="chevron-left" size={24} color={Colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowMoreMenu(!showMoreMenu);
          }}>
            <Feather name="more-horizontal" size={24} color={Colors.ink} />
          </TouchableOpacity>
        </View>

        {/* Inline More Menu */}
        {showMoreMenu && (
          <View style={styles.moreMenuRow}>
            <TouchableOpacity style={styles.moreMenuItem} onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              setShowMoreMenu(false);
            }}>
              <Feather name="share" size={16} color={Colors.burntOrange} />
              <Text style={styles.moreMenuText}>Share Memory</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreMenuItem} onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setShowMoreMenu(false);
            }}>
              <Feather name="message-circle" size={16} color={Colors.burntOrange} />
              <Text style={styles.moreMenuText}>Ask Sato</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.heroSection}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.subtitle}>
                {activeMoment 
                  ? `${activeMoment.date} · ${activeMoment.time}` 
                  : tfParams.subtitle
                }
              </Text>
              
              <Text style={styles.insightText}>
                {config.insightText}
              </Text>
            </View>
            <View style={styles.heroBloom}>
              <BloomFlower
                petal1={Colors.bloom[config.bloom].petal1}
                petal2={Colors.bloom[config.bloom].petal2}
                petal3={Colors.bloom[config.bloom].petal3}
                flare1Color={config.flare1Color}
                flare2Color={config.flare2Color}
                size={208}
              />
            </View>
          </View>

          {/* Average Response */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{isMomentSelected ? 'MOMENT RESPONSE' : 'AVERAGE RESPONSE'}</Text>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                openPicker();
              }}
              style={styles.timeDropdown}
            >
              <Text style={styles.timeDropdownText}>{duration} {duration === 1 ? 'hour' : 'hours'}</Text>
              <Feather name="chevron-down" size={14} color={Colors.softStone} />
            </TouchableOpacity>
          </View>

          {/* Timeframe Selector tabs */}
          {!isMomentSelected && (
            <View style={styles.timeframeRow}>
              {(['week', 'month', 'year', 'all'] as const).map((tf) => {
                const isActive = timeframe === tf;
                const label = tf === 'all' ? 'All Time' : tf.charAt(0).toUpperCase() + tf.slice(1);
                return (
                  <TouchableOpacity
                    key={tf}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setTimeframe(tf);
                    }}
                    style={[
                      styles.timeframeTab,
                      isActive && styles.timeframeTabActive
                    ]}
                  >
                    <Text style={[
                      styles.timeframeTabText,
                      isActive && styles.timeframeTabTextActive
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View 
            style={styles.graphContainer}
            onTouchStart={(e) => {
              const x = e.nativeEvent.locationX;
              setScrubX(Math.max(chartLeft, Math.min(chartRight, x)));
            }}
            onTouchMove={(e) => {
              const x = e.nativeEvent.locationX;
              setScrubX(Math.max(chartLeft, Math.min(chartRight, x)));
            }}
            onTouchEnd={() => {
              setScrubX(null);
            }}
            onTouchCancel={() => {
              setScrubX(null);
            }}
          >
            <Svg width={graphWidth} height={graphHeight} pointerEvents="none">
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={curveColor} stopOpacity="0.15" />
                  <Stop offset="1" stopColor={curveColor} stopOpacity="0" />
                </LinearGradient>
              </Defs>

              {/* Grid Lines */}
              <Line x1={chartLeft} y1={50} x2={chartRight} y2={50} stroke="rgba(0,0,0,0.04)" strokeDasharray="3,3" />
              <Line x1={chartLeft} y1={100} x2={chartRight} y2={100} stroke="rgba(0,0,0,0.04)" strokeDasharray="3,3" />
              <Line x1={chartLeft} y1={150} x2={chartRight} y2={150} stroke="rgba(0,0,0,0.06)" />
              <Line x1={chartLeft} y1={200} x2={chartRight} y2={200} stroke="rgba(0,0,0,0.04)" strokeDasharray="3,3" />
              
              {/* Y Axis labels */}
              <SvgText x={5} y={54} fontSize="10" fill={Colors.softStone} fontFamily="Inter_400Regular">+60</SvgText>
              <SvgText x={5} y={104} fontSize="10" fill={Colors.softStone} fontFamily="Inter_400Regular">+30</SvgText>
              <SvgText x={5} y={154} fontSize="10" fill={Colors.softStone} fontFamily="Inter_400Regular">Baseline</SvgText>
              <SvgText x={5} y={204} fontSize="10" fill={Colors.softStone} fontFamily="Inter_400Regular">-30</SvgText>

              {/* X Axis labels */}
              <SvgText x={chartLeft} y={214} fontSize="10" fill={Colors.softStone} fontFamily="Inter_400Regular" textAnchor="start">0</SvgText>
              <SvgText x={chartLeft + chartWidth * 0.25} y={214} fontSize="10" fill={Colors.softStone} fontFamily="Inter_400Regular" textAnchor="middle">{formatAxisLabel(duration * 0.25)}</SvgText>
              <SvgText x={chartLeft + chartWidth * 0.5} y={214} fontSize="10" fill={Colors.softStone} fontFamily="Inter_400Regular" textAnchor="middle">{formatAxisLabel(duration * 0.5)}</SvgText>
              <SvgText x={chartLeft + chartWidth * 0.75} y={214} fontSize="10" fill={Colors.softStone} fontFamily="Inter_400Regular" textAnchor="middle">{formatAxisLabel(duration * 0.75)}</SvgText>
              <SvgText x={chartRight} y={214} fontSize="10" fill={Colors.softStone} fontFamily="Inter_400Regular" textAnchor="end">{formatAxisLabel(duration)}</SvgText>

              {/* Draw background average curve as dotted reference when a specific moment is selected */}
              {isMomentSelected && (
                <Path d={avgCurvePath} stroke="rgba(24, 22, 20, 0.12)" strokeWidth="1.5" strokeDasharray="3,3" fill="none" />
              )}

              <Path d={areaPath} fill="url(#grad)" />
              <Path d={curvePath} stroke={curveColor} strokeWidth="2.5" fill="none" />
              
              {/* Peak marker (only render when NOT scrubbing) */}
              {!isScrubbing && (
                <>
                  <Line x1={peakX} y1={peakY} x2={peakX} y2={baselineY} stroke={curveColor} strokeWidth="1.2" strokeDasharray="4,4" strokeOpacity={0.4} />
                  <Circle cx={peakX} cy={peakY} r="5" fill={curveColor} />
                </>
              )}

              {/* Scrubbing indicator guide & dot */}
              {isScrubbing && (
                <>
                  <Line x1={scrubX} y1={chartTop} x2={scrubX} y2={baselineY} stroke={Colors.burntOrange} strokeWidth="1.5" strokeDasharray="2,2" />
                  <Circle cx={scrubX} cy={scrubY} r="6" fill={Colors.white} stroke={curveColor} strokeWidth="3" />
                </>
              )}
            </Svg>

            {/* Peak info overlay (approx positioning) */}
            <View style={styles.peakInfo} pointerEvents="none">
              <Text style={styles.peakLabel}>{displayLabel}</Text>
              <Text style={styles.peakTime}>{displayTime}</Text>
              <View style={styles.peakValueRow}>
                <Text style={[styles.peakValue, { color: curveColor }]}>{displayValue}</Text>
                <Text style={styles.peakUnit}>mg/dL</Text>
              </View>
            </View>
          </View>

          {/* Average/Selected rise text */}
          <View style={styles.averageRiseContainer}>
            <Feather name={isMomentSelected ? 'activity' : 'sun'} size={20} color={curveColor} style={styles.averageRiseIcon} />
            <View>
              <Text style={styles.averageRiseText}>
                {isMomentSelected ? 'Moment rise ' : 'Average rise '}
                <Text style={{fontFamily: 'Inter_500Medium', color: curveColor}}>
                  {activeMoment ? `+${activeMoment.peakVal} mg/dL` : config.averageRise}
                </Text>
              </Text>
              <Text style={styles.averageRiseSub}>from baseline</Text>
            </View>
          </View>

          {/* Past Moments */}
          <Text style={[styles.sectionTitle, { marginTop: Spacing.xl * 2 }]}>PAST MOMENTS</Text>
          <View style={styles.timelineContainer}>
            {config.pastMoments.map((moment, i) => {
              const isSelected = selectedMomentIndex === i;
              const activeOverlaps = (moment.overlappingLogs || []).filter(
                (log) => log.timeOffsetHours <= duration
              );
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.9}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSelectedMomentIndex(isSelected ? null : i);
                  }}
                  style={[
                    styles.timelineRow,
                    isSelected && styles.timelineRowSelected
                  ]}
                >
                  <View style={styles.timelineLine}>
                    <View style={[styles.timelineDot, { backgroundColor: Colors.bloom[moment.bloom].petal1 }]} />
                    {i < config.pastMoments.length - 1 && <View style={styles.timelineSegment} />}
                  </View>
                  
                  <View style={styles.timelineContent}>
                    <View style={styles.momentHeader}>
                      <Text style={styles.momentDate}>{moment.date}</Text>
                      <Text style={styles.momentTime}> · {moment.time}</Text>
                      {isSelected && (
                        <View style={styles.selectedPill}>
                          <Text style={styles.selectedPillText}>Selected</Text>
                        </View>
                      )}
                    </View>

                    {activeOverlaps.length > 0 && (
                      <View style={styles.overlapRow}>
                        <Feather name="layers" size={10} color="#D97947" />
                        <Text style={styles.overlapText} numberOfLines={1} ellipsizeMode="tail">
                          Overlaps with {activeOverlaps[0].food}
                        </Text>
                      </View>
                    )}
                    
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
                        <Text style={styles.momentStatLabel}>After {duration}h</Text>
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

                    {/* Expandable Scrapbook Card details */}
                    {isSelected && (moment.notes || moment.sleep || moment.feeling || activeOverlaps.length > 0) && (
                      <View style={styles.scrapbookDetails}>
                        <View style={styles.scrapbookDivider} />
                        {moment.notes && (
                          <View style={styles.scrapbookNoteRow}>
                            <Text style={styles.quoteMark}>“</Text>
                            <Text style={styles.scrapbookNoteText}>{moment.notes}</Text>
                          </View>
                        )}
                        {activeOverlaps.map((overlap, idx) => (
                          <View key={idx} style={styles.scrapbookOverlapRow}>
                            <Feather name="shuffle" size={12} color="#D97947" style={{ marginTop: 2 }} />
                            <Text style={styles.scrapbookOverlapText}>
                              An overlap of paths • {overlap.food} was logged {overlap.timeOffset} later, which may influence the trace of this curve.
                            </Text>
                          </View>
                        ))}
                        <View style={styles.scrapbookMetadataRow}>
                          {moment.sleep && (
                            <View style={styles.scrapbookMetaPill}>
                              <Feather name="moon" size={12} color={Colors.softStone} />
                              <Text style={styles.scrapbookMetaText}>{moment.sleep}</Text>
                            </View>
                          )}
                          {moment.feeling && (
                            <View style={styles.scrapbookMetaPill}>
                              <Feather name="heart" size={12} color={Colors.softStone} />
                              <Text style={styles.scrapbookMetaText}>{moment.feeling}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
            
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowAllMoments(!showAllMoments);
              }}
            >
              <Text style={styles.viewAllText}>
                {showAllMoments ? 'Show recent moments' : `View all ${config.totalMoments} moments`}
              </Text>
              <Feather name={showAllMoments ? 'chevron-up' : 'arrow-right'} size={16} color={Colors.softStone} />
            </TouchableOpacity>
          </View>

          {/* Patterns */}
          <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>PATTERNS WE'VE NOTICED</Text>
          <View style={styles.patternsContainer}>
            {config.patterns.map((pattern, i) => {
              const isHighlighted = highlightedPatternIdx === i;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.patternRow, isHighlighted && styles.patternRowHighlighted]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setHighlightedPatternIdx(isHighlighted ? null : i);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.patternIconWrap, { backgroundColor: isHighlighted ? 'rgba(217,121,71,0.08)' : 'rgba(0,0,0,0.03)' }]}>
                    <Feather name={pattern.icon as any} size={20} color={Colors.burntOrange} />
                  </View>
                  <View style={styles.patternInfo}>
                    <Text style={styles.patternTitle}>{pattern.title}</Text>
                    <Text style={styles.patternSubtitle}>{pattern.subtitle}</Text>
                  </View>
                  <Feather name={isHighlighted ? 'chevron-down' : 'chevron-right'} size={16} color={isHighlighted ? Colors.burntOrange : Colors.softStone} />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footerNote}>
            <Feather name="heart" size={16} color={Colors.softStone} style={{marginRight: 8}} />
            <Text style={styles.footerText}>Your body. Your patterns. Your story.</Text>
          </View>

        </ScrollView>
      </View>

      {/* Duration Selector Modal Overlay */}
      {shouldRenderPicker && (
        <View style={styles.modalBackdrop}>
          <Animated.View 
            style={[
              StyleSheet.absoluteFillObject, 
              { backgroundColor: 'rgba(24, 22, 20, 0.4)', opacity: backdropOpacity }
            ]}
          >
            <TouchableOpacity 
              style={styles.modalDismiss} 
              activeOpacity={1} 
              onPress={() => closePicker()} 
            />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.modalContent, 
              { transform: [{ translateY: sheetTranslateY }] }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time Window</Text>
              <TouchableOpacity 
                onPress={() => closePicker()}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={Colors.ink} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((hr) => {
                const isActive = duration === hr;
                return (
                  <TouchableOpacity
                    key={hr}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      closePicker(() => setDuration(hr));
                    }}
                    style={[
                      styles.modalChip,
                      isActive && styles.modalChipActive
                    ]}
                  >
                    <Text style={[
                      styles.modalChipText,
                      isActive && styles.modalChipTextActive
                    ]}>
                      {hr} {hr === 1 ? 'hour' : 'hours'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      )}
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
  timeframeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    marginTop: -Spacing.xs,
  },
  timeframeTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    backgroundColor: 'transparent',
  },
  timeframeTabActive: {
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  timeframeTabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.softStone,
    letterSpacing: 0.3,
  },
  timeframeTabTextActive: {
    color: Colors.burntOrange,
    fontFamily: 'Inter_600SemiBold',
  },
  graphContainer: {
    height: 230,
    marginBottom: Spacing.lg,
    position: 'relative',
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
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timelineRowSelected: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderColor: 'rgba(0,0,0,0.05)',
  },
  selectedPill: {
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9.5,
    color: Colors.burntOrange,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  scrapbookDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },
  scrapbookDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginBottom: Spacing.md,
    marginRight: Spacing.md,
  },
  scrapbookNoteRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    paddingRight: Spacing.lg,
  },
  quoteMark: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 28,
    lineHeight: 28,
    color: Colors.burntOrange,
    marginRight: 4,
    marginTop: -4,
  },
  scrapbookNoteText: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.ink,
    flex: 1,
  },
  scrapbookMetadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  scrapbookMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(24, 22, 20, 0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  scrapbookMetaText: {
    ...TypeScale.caption,
    fontSize: 11,
    color: Colors.softStone,
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

  overlapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
    marginTop: 2,
  },
  overlapText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#D97947',
  },
  scrapbookOverlapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scrapbookOverlapText: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 13,
    color: Colors.softStone,
    flex: 1,
    lineHeight: 17,
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
  moreMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
  },
  moreMenuText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.burntOrange,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  patternRowHighlighted: {
    backgroundColor: 'rgba(217,121,71,0.04)',
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderBottomColor: 'transparent',
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
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 10,
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxxl + 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.ink,
    letterSpacing: 0.2,
  },
  modalCloseBtn: {
    padding: Spacing.sm,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  modalChip: {
    width: '30%',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  modalChipActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  modalChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.softStone,
  },
  modalChipTextActive: {
    color: Colors.burntOrange,
    fontFamily: 'Inter_600SemiBold',
  },
});
