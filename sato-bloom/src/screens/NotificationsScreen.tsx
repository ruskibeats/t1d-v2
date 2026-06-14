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
import { Colors, Spacing, Radius, TypeScale } from '@/constants/theme';
import { PaperBackground } from '@/components/PaperBackground';
import { BloomFlower } from '@/components/BloomFlower';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '../navigation/NavigationProvider';

interface Observation {
  patternId: string;
  title: string;
  count: number;
  description: string;
  bloom: 'mornings' | 'evening' | 'walks' | 'sleep' | 'pizza';
  flareColor1: string;
  flareColor2: string;
}

const OBSERVATIONS: Observation[] = [
  {
    patternId: 'mornings',
    title: 'Mornings find rhythm',
    count: 24,
    description: 'A grounding consistency. Over the last 3 mornings, your fasting values have settled near 94 mg/dL with minimal morning drift.',
    bloom: 'mornings',
    flareColor1: '#B6C09A',
    flareColor2: '#8B9C6F',
  },
  {
    patternId: 'pizza',
    title: 'Evenings linger',
    count: 18,
    description: 'Accumulation and warmth. Glucose responses after 8 PM show a slower clearance tail, lingering 45 minutes longer than daytime meals.',
    bloom: 'evening',
    flareColor1: '#E8A98C',
    flareColor2: '#D6784E',
  },
  {
    patternId: 'walks',
    title: 'Afternoons soften',
    count: 12,
    description: 'A gentle flow. Post-lunch movement consistently dampens your average response peak by 22%, encouraging faster recovery.',
    bloom: 'walks',
    flareColor1: '#A8C1D1',
    flareColor2: '#6F9AB3',
  },
  {
    patternId: 'sleep',
    title: 'Rest restores',
    count: 9,
    description: 'Reflective repair. During periods of deep sleep, your glucose profile remains remarkably flat, permitting metabolic rest.',
    bloom: 'sleep',
    flareColor1: '#C8B9DB',
    flareColor2: '#A38CBF',
  },
  {
    patternId: 'pizza',
    title: 'An emerging profile',
    count: 3,
    description: 'A potential pattern. Cold pasta (resistant starch) shows a flatter response curve compared to freshly cooked alternatives.',
    bloom: 'pizza',
    flareColor1: '#D9C39D',
    flareColor2: '#B89258',
  },
];

export default function NotificationsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500, // Atmospheric material fade
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <PaperBackground>
      <Animated.View 
        style={[
          styles.root, 
          { 
            paddingTop: insets.top,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {/* Minimalist Close Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.iconButton}>
            <Feather name="x" size={24} color={Colors.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Reflections</Text>
            <Text style={styles.subtitle}>Observations Sato has quietly gathered.</Text>
          </View>

          {/* Observations List - Spaced 8-12px apart, minimal separation */}
          <View style={styles.listContainer}>
            {OBSERVATIONS.map((obs, i) => (
              <TouchableOpacity 
                key={i} 
                activeOpacity={0.75}
                onPress={() => nav.openRevelation({ id: obs.patternId })}
                style={[
                  styles.observationItem,
                  i > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(231,222,207,0.3)' }
                ]}
              >
                {/* Mini bloom floating directly on paper */}
                <View style={styles.bloomContainer}>
                  <BloomFlower
                    petal1={Colors.bloom[obs.bloom].petal1}
                    petal2={Colors.bloom[obs.bloom].petal2}
                    petal3={Colors.bloom[obs.bloom].petal3}
                    size={48}
                  />
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.obsTitle}>{obs.title}</Text>
                    <Text style={styles.obsCount}>Seen {obs.count}x</Text>
                  </View>
                  <Text style={styles.obsDesc}>{obs.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quiet Footer Note */}
          <View style={styles.footerNote}>
            <Text style={styles.footerText}>Reflecting on patterns, not tracking data.</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    alignItems: 'flex-start',
  },
  iconButton: {
    padding: Spacing.sm,
  },
  scroll: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
  },
  titleSection: {
    marginBottom: Spacing.xxl,
  },
  title: {
    ...TypeScale.display,
    fontSize: 38,
    color: Colors.ink,
  },
  subtitle: {
    ...TypeScale.body,
    color: Colors.softStone,
    marginTop: 4,
  },

  listContainer: {
    marginBottom: Spacing.xl,
  },
  observationItem: {
    flexDirection: 'row',
    paddingVertical: Spacing.xl, // Spaced 8-12px minimal separation via spacing and fine lines
    gap: Spacing.lg,
  },
  bloomContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  obsTitle: {
    ...TypeScale.cardTitle,
    fontSize: 19,
    color: Colors.ink,
  },
  obsCount: {
    ...TypeScale.metadata,
    fontSize: 12,
    color: Colors.softStone,
  },
  obsDesc: {
    ...TypeScale.body,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.softStone,
  },

  footerNote: {
    marginTop: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(231,222,207,0.2)',
    alignItems: 'center',
  },
  footerText: {
    ...TypeScale.metadata,
    fontSize: 12,
    color: Colors.softStone,
  },
});
