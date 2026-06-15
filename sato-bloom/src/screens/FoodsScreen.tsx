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
import Svg, { Path as SvgPath, Line as SvgLine, Text as SvgText, Circle as SvgCircle, Defs, LinearGradient, Stop } from 'react-native-svg';
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

  // Meal Sequencing Sandbox State
  const [isSandboxExpanded, setIsSandboxExpanded] = useState(false);
  const [sandboxBase, setSandboxBase] = useState<'Rice' | 'Pasta' | 'Potatoes' | 'Bread'>('Pasta');
  const [sandboxHasFiber, setSandboxHasFiber] = useState(false);
  const [sandboxHasProtein, setSandboxHasProtein] = useState(false);
  const [sandboxHasFat, setSandboxHasFat] = useState(false);
  const [sandboxSequence, setSandboxSequence] = useState<'carbsFirst' | 'balanced' | 'fibersFirst'>('carbsFirst');

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

  const getMinutes = (timeStr: string) => {
    const match = timeStr.match(/(\d+)h\s*(\d+)m/);
    if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
    return 60;
  };

  const getComparisonZenNotes = (foodA: string, foodB: string) => {
    const fA = foodA.toLowerCase();
    const fB = foodB.toLowerCase();
    const curveA = FOOD_CURVES[fA];
    const curveB = FOOD_CURVES[fB];
    if (!curveA || !curveB) return "Select two food memories to evaluate their metabolic dynamics.";

    const valA = curveA.peakVal;
    const valB = curveB.peakVal;

    // Let's create beautiful custom pairing notes
    if ((fA === 'pasta' && fB === 'carbonara') || (fB === 'pasta' && fA === 'carbonara')) {
      return "Plain Pasta triggers a fast, unbuffered spike peaking at 1h 15m. Carbonara, despite having similar pasta noodles, introduces cheese, egg yolk, and guanciale (fats and proteins). These macronutrients act as a strong metabolic brake, delaying the peak by 30 minutes and reducing the peak rise by 22%. To duplicate this buffering effect on plain pasta, always sequence your meal by eating a fiber starter first.";
    }
    if ((fA === 'pasta' && fB === 'creamy pasta') || (fB === 'pasta' && fA === 'creamy pasta')) {
      return "Creamy Pasta exhibits a classic lipid-buffered profile. Its peak rise (+28 mg/dL) is 48% lower than plain Pasta, delayed to a late 2h 30m. However, the heavy cream creates a prolonged tail, keeping your glucose slightly elevated at the 4-hour mark. Standard Pasta is a quick surge and drop. Pre-meal insulin timing (bolus offset) should be adjusted earlier for plain Pasta, and split or delayed for Creamy Pasta.";
    }
    if ((fA === 'pasta' && fB === 'parmesan') || (fB === 'pasta' && fA === 'parmesan')) {
      return "This is a study in macronutrient opposites. Parmesan is virtually pure protein and fat, yielding a stable 'Whispering Meadow' response (+8 mg/dL). Plain Pasta is a rapid carbohydrate that spikes to +54 mg/dL. Adding a generous amount of Parmesan cheese to your pasta is a proven metabolic hack: the lipid layer slows down carbohydrate enzyme access, flattening the curve.";
    }
    if ((fA === 'carbonara' && fB === 'creamy pasta') || (fB === 'carbonara' && fA === 'creamy pasta')) {
      return "Creamy Pasta has higher fat content than Carbonara, resulting in a flatter, more delayed curve (+28 mg/dL at 2h 30m) compared to Carbonara's (+42 mg/dL at 1h 45m). Both are highly buffered by fats, but Creamy Pasta's absorption is so delayed that it might lead to a late-night glucose spike if eaten close to bedtime.";
    }
    if ((fA === 'spaghetti' && fB === 'pasta') || (fB === 'spaghetti' && fA === 'pasta')) {
      return "Plain Pasta spikes higher and faster (+54 mg/dL at 1h 15m) than Spaghetti (+36 mg/dL at 2h 00m). Spaghetti has a longer boiling time or a different grain density, resulting in a more moderate absorption speed. Consider cooking your pasta 'al dente' to retain resistant starch, which lowers the rate of rise.";
    }
    
    // Dynamic general notes generator if no hardcoded match
    const higher = valA > valB ? foodA : foodB;
    const lower = valA > valB ? foodB : foodA;
    const curveHigher = valA > valB ? curveA : curveB;
    const curveLower = valA > valB ? curveB : curveA;
    const valDiff = Math.abs(valA - valB);

    return `${lower} provides a much gentler metabolic trajectory, with a peak that is ${valDiff} mg/dL lower than ${higher}. Furthermore, ${lower} peaks at ${curveLower.peakTime} compared to ${higher} at ${curveHigher.peakTime}, showing that adding protein, fat, or fiber plays an essential role in smoothing out simple starch spikes.`;
  };

  const getMetabolicComparisonSummary = (foodA: string, foodB: string) => {
    const fA = foodA.toLowerCase();
    const fB = foodB.toLowerCase();
    const valA = FOOD_CURVES[fA]?.peakVal || 30;
    const valB = FOOD_CURVES[fB]?.peakVal || 30;
    
    if (valA === valB) {
      return { text: `${foodA} and ${foodB} show an identical average glucose peak.`, diffPercent: 0 };
    }
    const diff = Math.abs(valA - valB);
    const diffPercent = Math.round((diff / Math.min(valA, valB)) * 100);
    const higherFood = valA > valB ? foodA : foodB;
    const lowerFood = valA > valB ? foodB : foodA;
    return {
      text: `${higherFood} triggers a ${diffPercent}% higher average glucose peak than ${lowerFood}.`,
      diffPercent,
    };
  };

  // Helper to extract detailed metrics for display
  const getMetabolicMetrics = (foodName: string) => {
    const curve = FOOD_CURVES[foodName.toLowerCase()] || { peakVal: 30, peakTime: '1h 00m', endVal: 15, color: '#D97947' };
    const peakVal = curve.peakVal;
    const mins = getMinutes(curve.peakTime);
    const velocity = peakVal / mins;
    
    // Estimated Area Under the Curve (AUC)
    // Triangle rising phase + Trapezoid falling phase (4 hours = 240 mins)
    const riseArea = 0.5 * peakVal * mins;
    const fallArea = 0.5 * (peakVal + curve.endVal) * (240 - mins);
    const auc = Math.round(riseArea + fallArea);

    // Stability Signature mapping
    let signature = {
      grade: 'C',
      label: 'Steep Ridge',
      color: Colors.burntOrange as string,
      desc: 'Distinct elevation wave. Moderate carb load with moderate buffering.',
    };
    if (peakVal < 15) {
      signature = {
        grade: 'A+',
        label: 'Whispering Meadow',
        color: '#70824B',
        desc: 'A peaceful flatline. Protein and fats maintain pristine baseline stability.',
      };
    } else if (peakVal < 35) {
      signature = {
        grade: 'B+',
        label: 'Rolling Hills',
        color: '#7EAEC3',
        desc: 'A gentle, gradual rise and fall. Excellent glycemic buffering.',
      };
    } else if (peakVal < 50) {
      signature = {
        grade: 'B-',
        label: 'Steep Ridge',
        color: '#D7B36A',
        desc: 'Moderate elevation wave. Carbohydrates present with moderate fat buffering.',
      };
    } else {
      signature = {
        grade: 'D',
        label: 'Mountain Peak',
        color: '#C65A32',
        desc: 'Sharp, rapid climb and crash. Fast carbs requiring buffering.',
      };
    }

    return {
      peakVal,
      mins,
      velocity: velocity.toFixed(2),
      auc,
      signature,
      curve,
    };
  };

  // Draw comparison curves helper with area gradients and annotations
  const renderComparisonChart = () => {
    if (compareList.length < 2) return null;
    const foodA = compareList[0];
    const foodB = compareList[1];
    const curveA = FOOD_CURVES[foodA.toLowerCase()] || FOOD_CURVES['carbonara'];
    const curveB = FOOD_CURVES[foodB.toLowerCase()] || FOOD_CURVES['pasta'];

    const chartW = width - 80;
    const chartH = 150;
    const chartLeft = 35;
    const chartRight = chartW - 10;
    const chartWidth = chartRight - chartLeft;
    
    const baselineY = 120;
    const valToY = (val: number) => baselineY - val * (85 / 55);

    const getBezierPath = (curve: typeof curveA) => {
      const peakX = chartLeft + chartWidth * curve.peakXPercent;
      const peakY = valToY(curve.peakVal);
      const endX = chartLeft + chartWidth * 0.95;
      const endY = valToY(curve.endVal);
      return `M ${chartLeft} ${baselineY} Q ${(chartLeft + peakX) / 2} ${baselineY} ${peakX} ${peakY} Q ${(peakX + endX) / 2} ${peakY} ${endX} ${endY}`;
    };

    const peakAX = chartLeft + chartWidth * curveA.peakXPercent;
    const peakAY = valToY(curveA.peakVal);
    const peakBX = chartLeft + chartWidth * curveB.peakXPercent;
    const peakBY = valToY(curveB.peakVal);

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
          <Defs>
            <LinearGradient id="gradA" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={curveA.color} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={curveA.color} stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="gradB" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={curveB.color} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={curveB.color} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Glycemic Buffer Guideline (+35 mg/dL) */}
          <SvgLine 
            x1={chartLeft} 
            y1={valToY(35)} 
            x2={chartRight} 
            y2={valToY(35)} 
            stroke="rgba(217, 121, 71, 0.2)" 
            strokeWidth={1} 
            strokeDasharray="4,4" 
          />
          <SvgText 
            x={chartRight - 5} 
            y={valToY(35) - 4} 
            fontSize={8} 
            fontFamily="Inter_500Medium"
            fill={Colors.softStone} 
            textAnchor="end"
          >
            Glycemic Buffer (+35)
          </SvgText>

          {/* Baseline */}
          <SvgLine x1={chartLeft} y1={baselineY} x2={chartRight} y2={baselineY} stroke={Colors.border} strokeWidth={1} />
          {/* Guide Line */}
          <SvgLine x1={chartLeft} y1={valToY(30)} x2={chartRight} y2={valToY(30)} stroke={Colors.borderLight} strokeWidth={0.5} strokeDasharray="3,3" />
          <SvgText x={chartLeft - 8} y={valToY(30) + 3} fontSize={9} fill={Colors.softStone} textAnchor="end">30</SvgText>

          {/* Gradient areas under the curves */}
          <SvgPath d={`${getBezierPath(curveA)} L ${chartLeft + chartWidth * 0.95} ${baselineY} Z`} fill="url(#gradA)" />
          <SvgPath d={`${getBezierPath(curveB)} L ${chartLeft + chartWidth * 0.95} ${baselineY} Z`} fill="url(#gradB)" />

          {/* Curve A */}
          <SvgPath d={getBezierPath(curveA)} fill="none" stroke={curveA.color} strokeWidth={2.5} strokeLinecap="round" />
          {/* Curve B */}
          <SvgPath d={getBezierPath(curveB)} fill="none" stroke={curveB.color} strokeWidth={2.5} strokeLinecap="round" />

          {/* Vertical Guides from peaks */}
          <SvgLine x1={peakAX} y1={peakAY} x2={peakAX} y2={baselineY} stroke="rgba(126, 117, 106, 0.2)" strokeWidth={1} strokeDasharray="2,2" />
          <SvgLine x1={peakBX} y1={peakBY} x2={peakBX} y2={baselineY} stroke="rgba(126, 117, 106, 0.2)" strokeWidth={1} strokeDasharray="2,2" />

          {/* Peak Indicators & Labels */}
          <SvgCircle cx={peakAX} cy={peakAY} r={4.5} fill={curveA.color} stroke="#FCFAF6" strokeWidth={1.5} />
          <SvgText x={peakAX} y={peakAY - 8} fontSize={9} fontWeight="600" fill={curveA.color} textAnchor="middle">+{curveA.peakVal}</SvgText>

          <SvgCircle cx={peakBX} cy={peakBY} r={4.5} fill={curveB.color} stroke="#FCFAF6" strokeWidth={1.5} />
          <SvgText x={peakBX} y={peakBY - 8} fontSize={9} fontWeight="600" fill={curveB.color} textAnchor="middle">+{curveB.peakVal}</SvgText>

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

  const getSandboxMetrics = () => {
    let basePeak = 54;
    let baseTimeMins = 60; // 1h
    let baseEnd = 10;
    let color: string = Colors.burntOrange;

    if (sandboxBase === 'Rice') {
      basePeak = 45;
      baseTimeMins = 75; // 1h 15m
      baseEnd = 12;
      color = '#B5C08D';
    } else if (sandboxBase === 'Pasta') {
      basePeak = 54;
      baseTimeMins = 75;
      baseEnd = 10;
      color = '#7EAEC3';
    } else if (sandboxBase === 'Potatoes') {
      basePeak = 50;
      baseTimeMins = 60;
      baseEnd = 10;
      color = '#D7B36A';
    } else if (sandboxBase === 'Bread') {
      basePeak = 48;
      baseTimeMins = 60;
      baseEnd = 8;
      color = '#E9A07D';
    }

    // Apply pairing buffers (mutually compounding reductions)
    let peakReduction = 1.0;
    let shiftMins = 0;
    
    if (sandboxHasFiber) {
      peakReduction *= 0.75; // 25% drop
      shiftMins += 15;
    }
    if (sandboxHasProtein) {
      peakReduction *= 0.85; // 15% drop
      shiftMins += 30;
    }
    if (sandboxHasFat) {
      peakReduction *= 0.85; // 15% drop
      shiftMins += 60; // fat shifts significantly (pizza effect)
    }

    // Apply sequencing modifier
    if (sandboxSequence === 'balanced') {
      peakReduction *= 0.85; // 15% drop
      shiftMins += 15;
    } else if (sandboxSequence === 'fibersFirst') {
      peakReduction *= 0.65; // 35% drop
      shiftMins += 30;
    }

    const calculatedPeak = Math.round(basePeak * peakReduction);
    const calculatedTimeMins = baseTimeMins + shiftMins;

    // Simulate 3-4 hour delayed peak for high-fat or rice combinations
    const hasDelayTrigger = sandboxHasFat || (sandboxBase === 'Rice' && (sandboxHasProtein || sandboxHasFat));
    
    // Normal 4 hours = 240 mins. Shift peakXPercent accordingly.
    // 60 mins is 0.25. 240 mins is 1.0.
    const peakXPercent = Math.min(0.9, calculatedTimeMins / 240);
    const endVal = Math.round(baseEnd * (sandboxHasFat ? 1.8 : 1.0));

    // Convert peak time in mins to string
    const hrs = Math.floor(calculatedTimeMins / 60);
    const mins = calculatedTimeMins % 60;
    const peakTimeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

    return {
      peakVal: calculatedPeak,
      peakXPercent,
      endVal,
      color,
      peakTime: peakTimeStr,
      hasDelay: hasDelayTrigger && calculatedTimeMins >= 150,
    };
  };

  const sandbox = getSandboxMetrics();

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

        {/* Meal Sequencing Sandbox Collapsible Panel */}
        <View style={styles.sandboxWrapper}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setIsSandboxExpanded(!isSandboxExpanded);
            }}
            style={styles.sandboxHeader}
          >
            <Ionicons name="color-filter-outline" size={18} color={Colors.burntOrange} />
            <Text style={styles.sandboxHeaderTitle}>Meal Sequencing Sandbox</Text>
            <Feather 
              name={isSandboxExpanded ? 'chevron-up' : 'chevron-down'} 
              size={18} 
              color={Colors.softStone} 
              style={{ marginLeft: 'auto' }} 
            />
          </TouchableOpacity>

          {isSandboxExpanded && (
            <View style={styles.sandboxContent}>
              {/* Regulatory Class I Disclaimer */}
              <View style={styles.sandboxDisclaimer}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.softStone} style={styles.sandboxDisclaimerIcon} />
                <Text style={styles.sandboxDisclaimerText}>
                  Educational Simulation only. Illustrates established food pairing and gastric emptying science. Does not predict clinical readings or determine dosage.
                </Text>
              </View>

              {/* SVG Curve Output */}
              <View style={styles.sandboxChartWrap}>
                <Text style={styles.sandboxChartTitle}>ESTIMATED ABSORPTION TRAJECTORY</Text>
                
                {(() => {
                  const chartW = width - 76;
                  const chartH = 120;
                  const chartLeft = 30;
                  const chartRight = chartW - 10;
                  const chartWidth = chartRight - chartLeft;
                  const baselineY = 95;
                  const valToY = (val: number) => baselineY - val * (65 / 55);

                  const peakX = chartLeft + chartWidth * sandbox.peakXPercent;
                  const peakY = valToY(sandbox.peakVal);
                  const endX = chartLeft + chartWidth * 0.95;
                  const endY = valToY(sandbox.endVal);
                  
                  const path = `M ${chartLeft} ${baselineY} Q ${(chartLeft + peakX) / 2} ${baselineY} ${peakX} ${peakY} Q ${(peakX + endX) / 2} ${peakY} ${endX} ${endY}`;
                  
                  return (
                    <Svg width={chartW} height={chartH}>
                      {/* Guideline */}
                      <SvgLine x1={chartLeft} y1={baselineY} x2={chartRight} y2={baselineY} stroke={Colors.border} strokeWidth={1} />
                      <SvgLine x1={chartLeft} y1={valToY(30)} x2={chartRight} y2={valToY(30)} stroke={Colors.borderLight} strokeWidth={0.5} strokeDasharray="3,3" />

                      {/* Curve area fill */}
                      <Defs>
                        <LinearGradient id="sandboxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <Stop offset="0%" stopColor={sandbox.color} stopOpacity={0.25} />
                          <Stop offset="100%" stopColor={sandbox.color} stopOpacity={0} />
                        </LinearGradient>
                      </Defs>
                      <SvgPath d={`${path} L ${chartLeft + chartWidth * 0.95} ${baselineY} Z`} fill="url(#sandboxGrad)" />
                      
                      {/* Path stroke */}
                      <SvgPath d={path} fill="none" stroke={sandbox.color} strokeWidth={2.5} strokeLinecap="round" />

                      {/* Peak indicator dot */}
                      <SvgCircle cx={peakX} cy={peakY} r={4} fill={sandbox.color} stroke="#FCFAF6" strokeWidth={1.5} />
                      <SvgText x={peakX} y={peakY - 8} fontSize={9} fontWeight="600" fill={sandbox.color} textAnchor="middle">+{sandbox.peakVal}</SvgText>

                      {/* X Axis Labels */}
                      <SvgText x={chartLeft} y={baselineY + 14} fontSize={8} fill={Colors.softStone} textAnchor="middle">0h</SvgText>
                      <SvgText x={chartLeft + chartWidth * 0.25} y={baselineY + 14} fontSize={8} fill={Colors.softStone} textAnchor="middle">1h</SvgText>
                      <SvgText x={chartLeft + chartWidth * 0.5} y={baselineY + 14} fontSize={8} fill={Colors.softStone} textAnchor="middle">2h</SvgText>
                      <SvgText x={chartLeft + chartWidth * 0.75} y={baselineY + 14} fontSize={8} fill={Colors.softStone} textAnchor="middle">3h</SvgText>
                      <SvgText x={chartLeft + chartWidth * 0.95} y={baselineY + 14} fontSize={8} fill={Colors.softStone} textAnchor="middle">4h</SvgText>
                    </Svg>
                  );
                })()}

                <View style={styles.sandboxStatsSummary}>
                  <Text style={styles.sandboxStatLabel}>Peak: <Text style={styles.sandboxStatVal}>+{sandbox.peakVal} mg/dL</Text></Text>
                  <Text style={styles.sandboxStatLabel}>Timing: <Text style={styles.sandboxStatVal}>{sandbox.peakTime}</Text></Text>
                  {sandbox.hasDelay && (
                    <View style={styles.delayBadge}>
                      <Text style={styles.delayBadgeText}>Delayed Curve (3-4h)</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Starch Selector */}
              <View style={styles.sandboxSection}>
                <Text style={styles.sandboxSectionLabel}>Base Carbohydrate</Text>
                <View style={styles.sandboxRow}>
                  {(['Rice', 'Pasta', 'Potatoes', 'Bread'] as const).map((starch) => (
                    <TouchableOpacity
                      key={starch}
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setSandboxBase(starch);
                      }}
                      style={[styles.sandboxButton, sandboxBase === starch && styles.sandboxButtonActive]}
                    >
                      <Text style={[styles.sandboxButtonText, sandboxBase === starch && styles.sandboxButtonTextActive]}>
                        {starch}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Buffer Modifiers */}
              <View style={styles.sandboxSection}>
                <Text style={styles.sandboxSectionLabel}>Macronutrient Buffers</Text>
                <View style={styles.sandboxRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSandboxHasFiber(!sandboxHasFiber);
                    }}
                    style={[styles.sandboxAddonPill, sandboxHasFiber && styles.sandboxAddonPillActive]}
                  >
                    <Text style={[styles.sandboxAddonText, sandboxHasFiber && styles.sandboxAddonTextActive]}>
                      +Fiber (Salad)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSandboxHasProtein(!sandboxHasProtein);
                    }}
                    style={[styles.sandboxAddonPill, sandboxHasProtein && styles.sandboxAddonPillActive]}
                  >
                    <Text style={[styles.sandboxAddonText, sandboxHasProtein && styles.sandboxAddonTextActive]}>
                      +Protein (Chicken)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSandboxHasFat(!sandboxHasFat);
                    }}
                    style={[styles.sandboxAddonPill, sandboxHasFat && styles.sandboxAddonPillActive]}
                  >
                    <Text style={[styles.sandboxAddonText, sandboxHasFat && styles.sandboxAddonTextActive]}>
                      +Fat (Avocado/Oil)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Ingestion Sequence */}
              <View style={styles.sandboxSection}>
                <Text style={styles.sandboxSectionLabel}>Eating Sequence</Text>
                <View style={styles.sandboxRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSandboxSequence('carbsFirst');
                    }}
                    style={[styles.sandboxButton, sandboxSequence === 'carbsFirst' && styles.sandboxButtonActive]}
                  >
                    <Text style={[styles.sandboxButtonText, sandboxSequence === 'carbsFirst' && styles.sandboxButtonTextActive]}>
                      Carbs First
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSandboxSequence('balanced');
                    }}
                    style={[styles.sandboxButton, sandboxSequence === 'balanced' && styles.sandboxButtonActive]}
                  >
                    <Text style={[styles.sandboxButtonText, sandboxSequence === 'balanced' && styles.sandboxButtonTextActive]}>
                      Mixed Plate
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSandboxSequence('fibersFirst');
                    }}
                    style={[styles.sandboxButton, sandboxSequence === 'fibersFirst' && styles.sandboxButtonActive]}
                  >
                    <Text style={[styles.sandboxButtonText, sandboxSequence === 'fibersFirst' && styles.sandboxButtonTextActive]}>
                      Fiber/Fat First
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
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
                const isLast = i === otherFoods.length - 1;
                return (
                  <View key={i} style={[styles.otherFoodRowContainer, isLast && { borderBottomWidth: 0 }]}>
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
        <View style={[styles.floatingCompareBar, { bottom: insets.bottom + 84 }]}>
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

                {/* Metabolic Summary Header */}
                {(() => {
                  const summary = getMetabolicComparisonSummary(compareList[0], compareList[1]);
                  const metricsA = getMetabolicMetrics(compareList[0]);
                  const metricsB = getMetabolicMetrics(compareList[1]);
                  const fA = compareList[0].toLowerCase();
                  const fB = compareList[1].toLowerCase();

                  return (
                    <View style={{ gap: Spacing.xl }}>
                      {/* Premium Summary Card */}
                      <View style={styles.comparisonSummaryCard}>
                        <Text style={styles.comparisonSummaryTitle}>Metabolic Analysis</Text>
                        <Text style={styles.comparisonSummaryDesc}>{summary.text}</Text>
                        
                        {/* Comparison Progress Bars */}
                        <View style={styles.barsContainer}>
                          <View style={styles.barItem}>
                            <Text style={styles.barLabel}>{compareList[0]}</Text>
                            <View style={styles.barOuter}>
                              <View style={[styles.barInner, { 
                                width: `${Math.min(100, (metricsA.peakVal / 60) * 100)}%`,
                                backgroundColor: metricsA.curve.color || Colors.burntOrange
                              }]} />
                            </View>
                            <Text style={styles.barValue}>+{metricsA.peakVal} mg/dL</Text>
                          </View>
                          
                          <View style={styles.barItem}>
                            <Text style={styles.barLabel}>{compareList[1]}</Text>
                            <View style={styles.barOuter}>
                              <View style={[styles.barInner, { 
                                width: `${Math.min(100, (metricsB.peakVal / 60) * 100)}%`,
                                backgroundColor: metricsB.curve.color || Colors.burntOrange
                              }]} />
                            </View>
                            <Text style={styles.barValue}>+{metricsB.peakVal} mg/dL</Text>
                          </View>
                        </View>
                      </View>

                      {/* Clinical Insights Grid */}
                      <View style={{ marginTop: Spacing.sm }}>
                        <Text style={styles.gridSectionTitle}>CLINICAL METABOLIC METRICS</Text>
                        <View style={styles.insightsGrid}>
                          {/* Food A Column */}
                          <View style={styles.gridColumn}>
                            <Text style={[styles.gridColHeader, { color: metricsA.curve.color }]}>{compareList[0]}</Text>
                            
                            {/* Metric 1: Stability Signature */}
                            <View style={styles.gridCell}>
                              <Text style={styles.gridCellLabel}>STABILITY SIGNATURE</Text>
                              <View style={[styles.signatureBadge, { backgroundColor: metricsA.signature.color + '15' }]}>
                                <Text style={[styles.signatureBadgeText, { color: metricsA.signature.color }]}>
                                  {metricsA.signature.label}
                                </Text>
                              </View>
                              <Text style={styles.gridCellSub}>{metricsA.signature.desc}</Text>
                            </View>

                            {/* Metric 2: Metabolic Velocity */}
                            <View style={styles.gridCell}>
                              <Text style={styles.gridCellLabel}>METABOLIC VELOCITY</Text>
                              <Text style={styles.gridCellValue}>{metricsA.velocity} <Text style={styles.gridCellUnit}>mg/dL/min</Text></Text>
                              <Text style={styles.gridCellSub}>Rate of glucose rise</Text>
                            </View>

                            {/* Metric 3: Total Glycemic Exposure */}
                            <View style={styles.gridCell}>
                              <Text style={styles.gridCellLabel}>GLYCEMIC EXPOSURE</Text>
                              <Text style={styles.gridCellValue}>{metricsA.auc} <Text style={styles.gridCellUnit}>AUC</Text></Text>
                              <Text style={styles.gridCellSub}>Estimated pancreatic load</Text>
                            </View>
                          </View>

                          {/* Divider Line */}
                          <View style={styles.gridVerticalDivider} />

                          {/* Food B Column */}
                          <View style={styles.gridColumn}>
                            <Text style={[styles.gridColHeader, { color: metricsB.curve.color }]}>{compareList[1]}</Text>
                            
                            {/* Metric 1: Stability Signature */}
                            <View style={styles.gridCell}>
                              <Text style={styles.gridCellLabel}>STABILITY SIGNATURE</Text>
                              <View style={[styles.signatureBadge, { backgroundColor: metricsB.signature.color + '15' }]}>
                                <Text style={[styles.signatureBadgeText, { color: metricsB.signature.color }]}>
                                  {metricsB.signature.label}
                                </Text>
                              </View>
                              <Text style={styles.gridCellSub}>{metricsB.signature.desc}</Text>
                            </View>

                            {/* Metric 2: Metabolic Velocity */}
                            <View style={styles.gridCell}>
                              <Text style={styles.gridCellLabel}>METABOLIC VELOCITY</Text>
                              <Text style={styles.gridCellValue}>{metricsB.velocity} <Text style={styles.gridCellUnit}>mg/dL/min</Text></Text>
                              <Text style={styles.gridCellSub}>Rate of glucose rise</Text>
                            </View>

                            {/* Metric 3: Total Glycemic Exposure */}
                            <View style={styles.gridCell}>
                              <Text style={styles.gridCellLabel}>GLYCEMIC EXPOSURE</Text>
                              <Text style={styles.gridCellValue}>{metricsB.auc} <Text style={styles.gridCellUnit}>AUC</Text></Text>
                              <Text style={styles.gridCellSub}>Estimated pancreatic load</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Raw Comparison Table */}
                      <View style={styles.tableCard}>
                        <Text style={styles.tableCardTitle}>DATA LOG COMPARISON</Text>
                        
                        <View style={styles.tableHeaderRow}>
                          <Text style={[styles.tableCol, styles.tableColHeader, { textAlign: 'left' }]}>Metric</Text>
                          <Text style={[styles.tableCol, styles.tableColHeader]}>{compareList[0]}</Text>
                          <Text style={[styles.tableCol, styles.tableColHeader]}>{compareList[1]}</Text>
                        </View>

                        <View style={styles.tableRow}>
                          <Text style={styles.tableLabel}>Average Peak Rise</Text>
                          <Text style={styles.tableVal}>+{metricsA.peakVal} mg/dL</Text>
                          <Text style={styles.tableVal}>+{metricsB.peakVal} mg/dL</Text>
                        </View>

                        <View style={styles.tableRow}>
                          <Text style={styles.tableLabel}>Time to Peak</Text>
                          <Text style={styles.tableVal}>{metricsA.curve.peakTime}</Text>
                          <Text style={styles.tableVal}>{metricsB.curve.peakTime}</Text>
                        </View>

                        <View style={styles.tableRow}>
                          <Text style={styles.tableLabel}>Observations</Text>
                          <Text style={styles.tableVal}>{ALL_FOODS.find(f => f.name.toLowerCase() === fA)?.count || ALL_FOODS.find(f => f.name === compareList[0])?.count || 0} times</Text>
                          <Text style={styles.tableVal}>{ALL_FOODS.find(f => f.name.toLowerCase() === fB)?.count || ALL_FOODS.find(f => f.name === compareList[1])?.count || 0} times</Text>
                        </View>
                      </View>

                      {/* Zen Insights Summary */}
                      <View style={styles.comparisonInsightsCard}>
                        <Feather name="activity" size={20} color="#70824B" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.insightsHeaderLabel}>SATO'S SYNAPSE INSIGHT</Text>
                          <Text style={styles.comparisonInsightsText}>
                            {getComparisonZenNotes(compareList[0], compareList[1])}
                          </Text>
                        </View>
                      </View>

                      {/* Sato's Actionable Sequence Hack Card */}
                      <View style={styles.hackCard}>
                        <View style={styles.hackHeader}>
                          <Ionicons name="bulb-outline" size={20} color="#B97B3F" />
                          <Text style={styles.hackHeaderTitle}>SATO'S METABOLIC SEQUENCE HACKS</Text>
                        </View>
                        <View style={styles.hackContent}>
                          <View style={styles.hackItem}>
                            <View style={styles.hackBulletContainer}>
                              <Feather name="layers" size={16} color="#B97B3F" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.hackItemTitle}>Order of Operations (Food Sequencing)</Text>
                              <Text style={styles.hackItemText}>
                                Always eat fiber/vegetables first, followed by fats/proteins, and carbohydrates last. This sequencing coats the gut lining and slows glucose absorption, flattening the peak of {metricsA.peakVal > metricsB.peakVal ? compareList[0] : compareList[1]} by up to 35%.
                              </Text>
                            </View>
                          </View>
                          
                          <View style={styles.hackItem}>
                            <View style={styles.hackBulletContainer}>
                              <Feather name="activity" size={16} color="#B97B3F" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.hackItemTitle}>Post-Meal Movement Window</Text>
                              <Text style={styles.hackItemText}>
                                Plan a brief 10-minute walk starting 30 minutes after your first bite. This matches the onset curve and uses active muscle contraction to absorb excess bloodstream glucose, blunting the speed of rise.
                              </Text>
                            </View>
                          </View>

                          <View style={styles.hackItem}>
                            <View style={styles.hackBulletContainer}>
                              <Feather name="clock" size={16} color="#B97B3F" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.hackItemTitle}>Bolus Timing Buffer</Text>
                              <Text style={styles.hackItemText}>
                                {metricsA.peakVal > metricsB.peakVal ? compareList[0] : compareList[1]} is a fast-rising food that benefits from a 15-20 min pre-bolus buffer. But for lipid-rich options like {metricsA.peakVal > metricsB.peakVal ? compareList[1] : compareList[0]}, a split insulin bolus is recommended to prevent early hypo followed by a late rise.
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })()}

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
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderWidth: 1,
    borderColor: '#E6DFD3',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 44,
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
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: '#E6DFD3',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
    paddingVertical: Spacing.xl,
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
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
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
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
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
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
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
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
  },
  comparisonInsightsText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: Colors.ink,
    flex: 1,
  },
  insightsHeaderLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9.5,
    color: '#70824B',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  comparisonSummaryCard: {
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
  },
  comparisonSummaryTitle: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  comparisonSummaryDesc: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 20,
    color: Colors.ink,
    lineHeight: 25,
    marginBottom: Spacing.lg,
  },
  barsContainer: {
    gap: Spacing.md,
  },
  barItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  barLabel: {
    width: 90,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.ink,
  },
  barOuter: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    width: 60,
    textAlign: 'right',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.ink,
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
  gridSectionTitle: {
    ...TypeScale.metadata,
    color: Colors.softStone,
    letterSpacing: 1.2,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  gridColumn: {
    flex: 1,
  },
  gridColHeader: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  gridCell: {
    borderTopWidth: 1,
    borderColor: 'rgba(231, 222, 207, 0.3)',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    minHeight: 110,
    justifyContent: 'center',
  },
  gridCellLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8.5,
    letterSpacing: 1,
    color: Colors.softStone,
    marginBottom: 4,
  },
  gridCellValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.ink,
  },
  gridCellUnit: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.softStone,
  },
  gridCellSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
    color: Colors.softStone,
    marginTop: 2,
    lineHeight: 14,
  },
  signatureBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    marginBottom: 4,
  },
  signatureBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  gridVerticalDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
    alignSelf: 'stretch',
  },
  hackCard: {
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(231, 222, 207, 0.3)',
  },
  hackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  hackHeaderTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#B97B3F',
  },
  hackContent: {
    gap: Spacing.md,
  },
  hackItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  hackBulletContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  hackBullet: {
    fontSize: 16,
    marginTop: 2,
  },
  hackItemTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.ink,
    marginBottom: 2,
  },
  hackItemText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: Colors.softStone,
  },
  sandboxWrapper: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(231, 222, 207, 0.3)',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  sandboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: 8,
  },
  sandboxHeaderTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 20,
    color: Colors.ink,
  },
  sandboxContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(231, 222, 207, 0.3)',
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  sandboxDisclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  sandboxDisclaimerIcon: {
    flexShrink: 0,
  },
  sandboxDisclaimerText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 15,
    color: Colors.softStone,
  },
  sandboxChartWrap: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  sandboxChartTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.softStone,
    letterSpacing: 0.8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sandboxStatsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: Spacing.sm,
  },
  sandboxStatLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.softStone,
  },
  sandboxStatVal: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.ink,
  },
  delayBadge: {
    backgroundColor: 'rgba(185, 123, 63, 0.08)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  delayBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#B97B3F',
  },
  sandboxSection: {
    marginTop: Spacing.lg,
  },
  sandboxSectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.softStone,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  sandboxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  sandboxButton: {
    borderWidth: 1,
    borderColor: 'rgba(231, 222, 207, 0.6)',
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sandboxButtonActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  sandboxButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.softStone,
  },
  sandboxButtonTextActive: {
    color: '#FCFAF6',
    fontFamily: 'Inter_600SemiBold',
  },
  sandboxAddonPill: {
    borderWidth: 1,
    borderColor: 'rgba(231, 222, 207, 0.6)',
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sandboxAddonPillActive: {
    backgroundColor: Colors.amber,
    borderColor: Colors.amber,
  },
  sandboxAddonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.softStone,
  },
  sandboxAddonTextActive: {
    color: '#FCFAF6',
    fontFamily: 'Inter_600SemiBold',
  },
});
