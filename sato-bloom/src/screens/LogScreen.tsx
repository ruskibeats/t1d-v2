import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Animated, ScrollView, LayoutAnimation, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, TypeScale } from '@/constants/theme';
import { PaperBackground } from '@/components/PaperBackground';
import { useNavigation } from '../navigation/NavigationProvider';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BloomFlower } from '@/components/BloomFlower';
import { useLogs, LogEntry } from '../context/LogContext';
import { GlucoseSparkline } from '../components/GlucoseSparkline';

const CONTEXT_DICTIONARY = [
  {
    id: 'pizza',
    keywords: ['pizza', 'carbonara', 'pasta', 'carb', 'dough'],
    label: 'Pizza/Carbs',
    insight: 'Pizza evening traces tend to linger, delaying peak glucose rise.',
  },
  {
    id: 'walk',
    keywords: ['walk', 'movement', 'stroll', 'run', 'step'],
    label: 'Walk',
    insight: 'A gentle stroll after meals acts as a natural stabilizer, calming the peak.',
  },
  {
    id: 'sleep',
    keywords: ['sleep', 'rest', 'bed', 'night', 'tired', 'fatigue'],
    label: 'Sleep',
    insight: 'Shorter sleep hours can make morning insulin responses more unpredictable.',
  },
  {
    id: 'jiujitsu',
    keywords: ['jiujitsu', 'bjj', 'workout', 'train', 'exercise'],
    label: 'Workout',
    insight: 'Physical intensity leaves a quiet late-night echo, sometimes raising glucose between 2–4 AM.',
  },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const { logs, addLog, updateLog, deleteLog } = useLogs();

  const [viewMode, setViewMode] = useState<'timeline' | 'compose' | 'edit'>('timeline');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Meals' | 'Insulin' | 'Notes'>('All');

  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [insulinVal, setInsulinVal] = useState<number | null>(null);
  const [foodVal, setFoodVal] = useState<string | null>(null);
  const [isInsulinExpanded, setIsInsulinExpanded] = useState(false);
  const [isFoodExpanded, setIsFoodExpanded] = useState(false);
  const [photoAttached, setPhotoAttached] = useState(false);

  const [isBlossoming, setIsBlossoming] = useState(false);
  const blossomAnim = useRef(new Animated.Value(0)).current;

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-5)).current;

  const footnoteYAnim = useRef(new Animated.Value(10)).current;
  const footnoteAlphaAnim = useRef(new Animated.Value(0)).current;

  const voiceScale = useRef(new Animated.Value(1)).current;
  const voiceLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Undo States
  const [lastSavedLog, setLastSavedLog] = useState<LogEntry | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoAnim = useRef(new Animated.Value(0)).current;
  const undoProgress = useRef(new Animated.Value(1)).current;
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const getSmartSuggestion = () => {
    const hour = new Date().getHours();
    if (hour < 11) {
      return {
        display: "Double Espresso & Croissant",
        text: "Had a double espresso and a butter croissant",
        insulin: 2.0,
        food: "Coffee",
        icon: "coffee" as const,
        label: "SUGGESTED BREAKFAST"
      };
    } else if (hour < 17) {
      return {
        display: "Al Dente Pasta & Salad",
        text: "Enjoyed al dente pasta with green salad starter",
        insulin: 5.0,
        food: "Pasta",
        icon: "sun" as const,
        label: "SUGGESTED LUNCH"
      };
    } else {
      return {
        display: "Rich Carbonara & Parmesan",
        text: "Tasted rich Carbonara with extra Parmesan cheese",
        insulin: 6.0,
        food: "Carbonara",
        icon: "moon" as const,
        label: "SUGGESTED DINNER"
      };
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: timestamp ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: timestamp ? 0 : -5,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [timestamp]);

  useEffect(() => {
    if (isRecording) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      voiceScale.setValue(1);
      voiceLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(voiceScale, {
            toValue: 1.45,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(voiceScale, {
            toValue: 1.05,
            duration: 950,
            useNativeDriver: true,
          }),
        ])
      );
      voiceLoopRef.current.start();
    } else {
      if (voiceLoopRef.current) {
        voiceLoopRef.current.stop();
      }
      Animated.timing(voiceScale, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording]);

  const formatDiaryTimestamp = (date: Date) => {
    const optionsDate: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    };
    const optionsTime: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    const dStr = date.toLocaleDateString('en-US', optionsDate);
    const tStr = date.toLocaleTimeString('en-US', optionsTime);
    return `${dStr} · ${tStr}`;
  };

  const handleTextChange = (val: string) => {
    setText(val);
    if (val.length > 0) {
      if (!timestamp) {
        setTimestamp(formatDiaryTimestamp(new Date()));
      }
    } else {
      setTimestamp(null);
      setInsulinVal(null);
      setFoodVal(null);
      setIsInsulinExpanded(false);
      setIsFoodExpanded(false);
    }

    // NLP pattern extraction
    const lowerVal = val.toLowerCase();
    
    // Scan for insulin: e.g. "6u", "6.5u", "6 units", "5.5 units"
    const insulinMatch = val.match(/(\b\d+(\.\d+)?)\s*(u|unit(s)?)\b/i);
    if (insulinMatch) {
      const parsed = parseFloat(insulinMatch[1]);
      if (!isNaN(parsed)) {
        if (insulinVal !== parsed) {
          setInsulinVal(parsed);
          setIsInsulinExpanded(true); // Auto-expand insulin editor
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      }
    }

    // Scan for food keywords matching known foods
    const matchedFood = ['carbonara', 'pasta', 'spaghetti', 'creamy pasta', 'parmesan', 'pork chop', 'mashed potato'].find(food =>
      lowerVal.includes(food)
    );
    if (matchedFood) {
      const formattedFood = matchedFood.charAt(0).toUpperCase() + matchedFood.slice(1);
      if (foodVal !== formattedFood) {
        setFoodVal(formattedFood);
        setIsFoodExpanded(true); // Auto-expand food editor
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    }
  };

  const lowerText = text.toLowerCase();
  const activeInsights = CONTEXT_DICTIONARY.filter((item) =>
    item.keywords.some((kw) => lowerText.includes(kw))
  );

  useEffect(() => {
    const shouldShow = text.length > 0;
    Animated.parallel([
      Animated.timing(footnoteAlphaAnim, {
        toValue: shouldShow ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(footnoteYAnim, {
        toValue: shouldShow ? 0 : 10,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [text.length > 0]);

  // Helper to match context insights for rendering inline on timeline cards
  const getInsightsForText = (itemText: string) => {
    const lower = itemText.toLowerCase();
    return CONTEXT_DICTIONARY.filter((item) =>
      item.keywords.some((kw) => lower.includes(kw))
    );
  };

  const handleUndo = () => {
    if (!lastSavedLog) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Delete the saved entry from the database
    deleteLog(lastSavedLog.id);

    // Fade out undo banner and restore values
    Animated.timing(undoAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowUndo(false);
      
      // Restore form inputs
      setText(lastSavedLog.text);
      setInsulinVal(lastSavedLog.insulin);
      setFoodVal(lastSavedLog.food);
      setPhotoAttached(lastSavedLog.photoAttachment || false);
      setIsInsulinExpanded(lastSavedLog.insulin !== null);
      setIsFoodExpanded(lastSavedLog.food !== null);
      
      // Navigate back to compose / edit mode
      if (lastSavedLog.id.startsWith('log-') && !['log-1', 'log-2', 'log-3', 'log-4'].includes(lastSavedLog.id)) {
        setViewMode('compose');
      } else {
        setEditingLogId(lastSavedLog.id);
        setViewMode('edit');
      }
      setLastSavedLog(null);
    });
  };

  const handleSave = () => {
    if (text.trim().length === 0) return;
    
    // Clear any existing undo timeouts or banner
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    setShowUndo(false);
    
    // Trigger multi-stage haptic clicks sequence
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      .then(() => new Promise(resolve => setTimeout(resolve, 80)))
      .then(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))
      .then(() => new Promise(resolve => setTimeout(resolve, 80)))
      .then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
      .catch(() => {});

    // Save inputs locally for undo operation
    const savedLogState = {
      text,
      insulin: insulinVal,
      food: foodVal,
      photoAttached,
    };

    let savedEntry: LogEntry;
    if (viewMode === 'edit' && editingLogId) {
      updateLog(editingLogId, text, insulinVal, foodVal, photoAttached);
      savedEntry = {
        id: editingLogId,
        text,
        timestamp: timestamp || '',
        insulin: insulinVal,
        food: foodVal,
        photoAttachment: photoAttached,
      };
    } else {
      savedEntry = addLog(text, insulinVal, foodVal, timestamp || undefined, photoAttached);
    }

    // Trigger full-screen blossom overlay animation
    setIsBlossoming(true);
    Animated.timing(blossomAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setText('');
        setInsulinVal(null);
        setFoodVal(null);
        setTimestamp(null);
        setEditingLogId(null);
        setPhotoAttached(false);
        setIsBlossoming(false);
        blossomAnim.setValue(0);
        setViewMode('timeline');

        // Setup and trigger Undo Banner sequence
        setLastSavedLog(savedEntry);
        setShowUndo(true);
        undoProgress.setValue(1);
        undoAnim.setValue(0);

        // Fade in the Undo Banner
        Animated.timing(undoAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // Animate the progress line shrinking over 5 seconds
        Animated.timing(undoProgress, {
          toValue: 0,
          duration: 5000,
          useNativeDriver: false,
        }).start();

        // Register timeout to dismiss Undo banner automatically after 5s
        undoTimeoutRef.current = setTimeout(() => {
          Animated.timing(undoAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowUndo(false);
            setLastSavedLog(null);
          });
        }, 5000);
      }, 400);
    });
  };

  const handleAdjust = (log: LogEntry) => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditingLogId(log.id);
    setText(log.text);
    setInsulinVal(log.insulin);
    setFoodVal(log.food);
    setTimestamp(log.timestamp);
    setIsInsulinExpanded(log.insulin !== null);
    setIsFoodExpanded(log.food !== null);
    setPhotoAttached(log.photoAttachment || false);
    setViewMode('edit');
  };

  const handleRelease = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    deleteLog(id);
  };

  // Sparkline data helpers based on food item
  const getSparklineData = (food: string | null) => {
    const fLower = food ? food.toLowerCase() : '';
    if (fLower.includes('carbonara')) return [0.1, 0.25, 0.5, 0.78, 0.9, 0.84, 0.7, 0.55, 0.4];
    if (fLower.includes('pasta')) return [0.1, 0.45, 0.88, 0.96, 0.52, 0.28, 0.16, 0.1, 0.08];
    if (fLower.includes('spaghetti')) return [0.1, 0.2, 0.55, 0.72, 0.65, 0.5, 0.38, 0.3, 0.25];
    if (fLower.includes('creamy')) return [0.1, 0.15, 0.35, 0.48, 0.5, 0.48, 0.45, 0.4, 0.35];
    if (fLower.includes('parmesan')) return [0.1, 0.12, 0.15, 0.14, 0.12, 0.1, 0.08, 0.07, 0.05];
    return [0.12, 0.15, 0.18, 0.22, 0.2, 0.18, 0.15, 0.12, 0.1];
  };

  const getSparklineColor = (food: string | null) => {
    const fLower = food ? food.toLowerCase() : '';
    if (fLower.includes('carbonara')) return Colors.bloom.mornings.petal1; // warm gold
    if (fLower.includes('pasta')) return Colors.bloom.mornings.petal2; // soft green
    if (fLower.includes('spaghetti')) return Colors.bloom.walks.petal1; // blue
    if (fLower.includes('creamy')) return Colors.bloom.sleep.petal1; // warm sandstone
    if (fLower.includes('parmesan')) return Colors.bloom.evening.petal1; // rose
    return Colors.softStone;
  };

  return (
    <PaperBackground>
      {isBlossoming && (
        <Animated.View style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: '#FCFAF6',
            zIndex: 100,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: blossomAnim,
          }
        ]}>
          <Animated.View style={{
            transform: [
              {
                scale: blossomAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1.1],
                })
              }
            ],
            opacity: blossomAnim.interpolate({
              inputRange: [0, 0.8, 1],
              outputRange: [0, 1, 0.9],
            }),
            alignItems: 'center',
          }}>
            <BloomFlower 
              petal1={Colors.bloom.mornings.petal1}
              petal2={Colors.bloom.mornings.petal2}
              petal3={Colors.bloom.mornings.petal3}
              size={180}
            />
            <Text style={{
              fontFamily: 'CormorantGaramond_500Medium',
              fontSize: 24,
              color: Colors.ink,
              marginTop: Spacing.xl,
              textAlign: 'center',
            }}>
              Memory Captured
            </Text>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 13,
              color: Colors.softStone,
              marginTop: 6,
              textAlign: 'center',
            }}>
              Calibrating your metabolic twin...
            </Text>
          </Animated.View>
        </Animated.View>
      )}

      {viewMode === 'timeline' ? (
        // Timeline View Mode
        (() => {
          const filteredLogs = logs.filter(log => {
            // Apply category filter
            if (selectedFilter === 'Meals' && !log.food) return false;
            if (selectedFilter === 'Insulin' && log.insulin === null) return false;
            if (selectedFilter === 'Notes' && (log.food || log.insulin !== null)) return false;
            
            // Apply search query
            if (searchQuery.trim()) {
              const query = searchQuery.toLowerCase().trim();
              const textMatch = log.text.toLowerCase().includes(query);
              const foodMatch = log.food ? log.food.toLowerCase().includes(query) : false;
              const dateMatch = log.timestamp.toLowerCase().includes(query);
              return textMatch || foodMatch || dateMatch;
            }
            
            return true;
          });

          // Group by date part
          const grouped: { [date: string]: LogEntry[] } = {};
          const dateKeys: string[] = [];

          filteredLogs.forEach(log => {
            const datePart = log.timestamp.split('·')[0].trim() || 'Date unknown';
            if (!grouped[datePart]) {
              grouped[datePart] = [];
              dateKeys.push(datePart);
            }
            grouped[datePart].push(log);
          });

          let absoluteIdx = 0;

          return (
            <View style={{ flex: 1, paddingTop: insets.top + Spacing.sm }}>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => nav.goBack()} style={styles.iconButton}>
                  <Feather name="arrow-left" size={24} color={Colors.ink} />
                </TouchableOpacity>
                <Text style={styles.timelineHeaderTitle}>Quiet Memories</Text>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setText('');
                    setInsulinVal(null);
                    setFoodVal(null);
                    setTimestamp(formatDiaryTimestamp(new Date()));
                    setIsInsulinExpanded(false);
                    setIsFoodExpanded(false);
                    setPhotoAttached(false);
                    setViewMode('compose');
                  }}
                  style={styles.newLogButton}
                >
                  <Text style={styles.newLogButtonText}>+ Record</Text>
                </TouchableOpacity>
              </View>

              {/* Log Search Bar */}
              <View style={styles.timelineSearchContainer}>
                <Feather name="search" size={16} color={Colors.softStone} style={styles.timelineSearchIcon} />
                <TextInput
                  style={styles.timelineSearchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search memories..."
                  placeholderTextColor={Colors.softStone}
                  selectionColor={Colors.burntOrange}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.timelineSearchClear}>
                    <Feather name="x-circle" size={16} color={Colors.softStone} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Log Category Filters */}
              <View style={styles.timelineFiltersContainer}>
                {(['All', 'Meals', 'Insulin', 'Notes'] as const).map((filter) => {
                  const isActive = selectedFilter === filter;
                  return (
                    <TouchableOpacity
                      key={filter}
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setSelectedFilter(filter);
                      }}
                      style={[styles.timelineFilterChip, isActive && styles.timelineFilterChipActive]}
                    >
                      <Text style={[styles.timelineFilterChipText, isActive && styles.timelineFilterChipTextActive]}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Dynamic Results Counter */}
              {(searchQuery.trim().length > 0 || selectedFilter !== 'All') && (
                <Text style={styles.timelineSummaryText}>
                  Found {filteredLogs.length} {filteredLogs.length === 1 ? 'memory' : 'memories'}
                </Text>
              )}

              <ScrollView
                style={styles.timelineContainer}
                contentContainerStyle={[styles.timelineScroll, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
              >
                {filteredLogs.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      {logs.length === 0 ? 'Your memory track is clear.' : 'No matching memories found.'}
                    </Text>
                    <Text style={styles.emptyStateSubtext}>
                      {logs.length === 0 ? 'Take a quiet moment to record a memory.' : 'Try adjusting your search terms or filters.'}
                    </Text>
                  </View>
                ) : (
                  dateKeys.map((dateKey) => (
                    <View key={dateKey} style={styles.dateGroupContainer}>
                      {/* Date Heading */}
                      <View style={styles.dateHeaderRow}>
                        <Text style={styles.dateHeaderText}>{dateKey}</Text>
                      </View>

                      {/* Group Logs */}
                      {grouped[dateKey].map((log) => {
                        const isLast = absoluteIdx === filteredLogs.length - 1;
                        absoluteIdx++;
                        const matchedInsights = getInsightsForText(log.text);
                        return (
                          <View key={log.id} style={styles.timelineItem}>
                            {/* Left Timeline Node column */}
                            <View style={styles.timelineLeft}>
                              <View style={[styles.timelineLine, isLast && { bottom: '50%' }]} />
                              <View style={styles.timelineDot} />
                            </View>

                             {/* Right Timeline Content cardless */}
                             <View style={[styles.timelineContent, isLast && { borderBottomWidth: 0 }]}>
                              <Text style={styles.timelineTimestamp}>{log.timestamp.split('·')[1]?.trim() || log.timestamp}</Text>
                              <Text style={styles.timelineText}>{log.text}</Text>

                              {/* Photo Attachment if true */}
                              {log.photoAttachment && (
                                <View style={styles.photoThumbnailTimeline}>
                                  <Feather name="image" size={20} color="#8A7A68" style={{ marginBottom: 4 }} />
                                  <Text style={styles.photoThumbnailText}>Captured Plate Snapshot</Text>
                                </View>
                              )}

                              {/* Badges */}
                              {(log.insulin !== null || log.food !== null) && (
                                <View style={styles.badgesRow}>
                                  {log.insulin !== null && (
                                    <View style={styles.badge}>
                                      <Feather name="droplet" size={11} color={Colors.softStone} style={{ marginRight: 4 }} />
                                      <Text style={styles.badgeText}>{log.insulin} u</Text>
                                    </View>
                                  )}
                                  {log.food !== null && (
                                    <View style={styles.badge}>
                                      <Feather name="coffee" size={11} color={Colors.softStone} style={{ marginRight: 4 }} />
                                      <Text style={styles.badgeText}>{log.food}</Text>
                                    </View>
                                  )}
                                </View>
                              )}

                              {/* Dynamic 4h post-meal glycemic traces */}
                              {log.food && (
                                <View style={styles.timelineSparklineWrap}>
                                  <Text style={styles.sparklineLabel}>4H POST-MEAL GLUCOSE TRACE</Text>
                                  <GlucoseSparkline 
                                    data={getSparklineData(log.food)}
                                    labels={['0h', '1h', '2h', '3h', '4h']}
                                    color={getSparklineColor(log.food)}
                                    width={240}
                                    height={75}
                                    showPeak={true}
                                  />
                                </View>
                              )}

                              {/* Matched Insights inside timeline */}
                              {matchedInsights.length > 0 && (
                                <View style={styles.timelineInsightsWrap}>
                                  {matchedInsights.map((ins) => (
                                    <Text key={ins.id} style={styles.timelineInsight}>
                                      • {ins.insight}
                                    </Text>
                                  ))}
                                </View>
                              )}

                              {/* Actions */}
                              <View style={styles.timelineActions}>
                                <TouchableOpacity 
                                  onPress={() => handleAdjust(log)}
                                  style={styles.timelineActionPill}
                                >
                                  <Feather name="edit-3" size={12} color={Colors.burntOrange} />
                                  <Text style={styles.timelineActionPillText}>Adjust</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                  onPress={() => handleRelease(log.id)}
                                  style={[styles.timelineActionPill, styles.timelineActionPillDelete]}
                                >
                                  <Feather name="trash-2" size={12} color="#D9534F" />
                                  <Text style={[styles.timelineActionPillText, styles.timelineActionPillTextDelete]}>Release</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          );
        })()
      ) : (
        // Compose / Edit View Mode
        <KeyboardAvoidingView 
          style={styles.keyboardAvoid} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
            <TouchableOpacity 
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setViewMode('timeline');
              }} 
              style={styles.iconButton}
            >
              <Feather name="arrow-left" size={24} color={Colors.ink} />
            </TouchableOpacity>
            <Animated.View style={[styles.headerTimestampContainer, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
              <Text style={styles.diaryTimestamp}>{timestamp || ' '}</Text>
            </Animated.View>
          </View>

          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={styles.editorScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <TextInput
                style={styles.textInput}
                placeholder="Record a memory..."
                placeholderTextColor={Colors.border}
                multiline
                autoFocus
                value={text}
                onChangeText={handleTextChange}
                selectionColor={Colors.burntOrange}
              />

              {/* Contextual Smart Suggestion */}
              {text.length === 0 && (
                <View style={styles.suggestionContainer}>
                  <Text style={styles.suggestionHeader}>{getSmartSuggestion().label}</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      const sug = getSmartSuggestion();
                      setText(sug.text);
                      setTimestamp(formatDiaryTimestamp(new Date()));
                      setInsulinVal(sug.insulin);
                      setFoodVal(sug.food);
                      setIsFoodExpanded(false);
                      setIsInsulinExpanded(false);
                    }}
                    style={styles.suggestionPill}
                  >
                    <Feather name={getSmartSuggestion().icon} size={14} color="#B97B3F" />
                    <Text style={styles.suggestionText}>{getSmartSuggestion().display}</Text>
                    <Feather name="corner-down-left" size={12} color={Colors.softStone} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Photo attachment notification inside composer */}
              {photoAttached && (
                <View style={styles.photoAttachmentCard}>
                  <Feather name="image" size={16} color="#D97947" />
                   <Text style={styles.photoAttachmentText}>Simulated meal photo attached</Text>
                  <TouchableOpacity 
                    onPress={() => setPhotoAttached(false)}
                    style={{ marginLeft: 'auto', padding: 2 }}
                  >
                    <Feather name="x" size={14} color="#D97947" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Contextual Logging Strip (Insulin & Food) */}
              {text.length > 0 && (
                <Animated.View 
                  style={[
                    styles.loggingStripContainer, 
                    { 
                      opacity: footnoteAlphaAnim, 
                      transform: [{ translateY: footnoteYAnim }] 
                    }
                  ]}
                >
                  <View style={styles.pillsRow}>
                    {/* Insulin Pill */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsInsulinExpanded(!isInsulinExpanded);
                        setIsFoodExpanded(false);
                      }}
                      style={[
                        styles.loggingPill,
                        insulinVal !== null && styles.loggingPillActive,
                        isInsulinExpanded && styles.loggingPillFocused
                      ]}
                    >
                      <Feather 
                        name="droplet" 
                        size={12} 
                        color={insulinVal !== null ? Colors.ink : Colors.softStone} 
                        style={{ marginRight: 6 }} 
                      />
                      <Text style={[
                        styles.loggingPillText,
                        insulinVal !== null && styles.loggingPillTextActive
                      ]}>
                        {insulinVal !== null ? `${insulinVal}u` : 'Add Insulin'}
                      </Text>
                    </TouchableOpacity>

                    {/* Food Pill */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsFoodExpanded(!isFoodExpanded);
                        setIsInsulinExpanded(false);
                      }}
                      style={[
                        styles.loggingPill,
                        foodVal !== null && styles.loggingPillActive,
                        isFoodExpanded && styles.loggingPillFocused
                      ]}
                    >
                      <Feather 
                        name="coffee" 
                        size={12} 
                        color={foodVal !== null ? Colors.ink : Colors.softStone} 
                        style={{ marginRight: 6 }} 
                      />
                      <Text style={[
                        styles.loggingPillText,
                        foodVal !== null && styles.loggingPillTextActive
                      ]}>
                        {foodVal !== null ? foodVal : 'Add Food'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Inline Insulin Editor */}
                  {isInsulinExpanded && (
                    <View style={styles.inlineEditor}>
                      <Text style={styles.editorLabel}>INSULIN AMOUNT</Text>
                      <View style={styles.counterRow}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            setInsulinVal(prev => Math.max(0, (prev || 0) - 0.5));
                          }}
                          style={styles.counterBtn}
                        >
                          <Feather name="minus" size={18} color={Colors.ink} />
                        </TouchableOpacity>
                        
                        <Text style={styles.counterVal}>
                          {insulinVal !== null ? `${insulinVal.toFixed(1)} u` : '0.0 u'}
                        </Text>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            setInsulinVal(prev => (prev || 0) + 0.5);
                          }}
                          style={styles.counterBtn}
                        >
                          <Feather name="plus" size={18} color={Colors.ink} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Inline Food Editor */}
                  {isFoodExpanded && (
                    <View style={styles.inlineEditor}>
                      <Text style={styles.editorLabel}>LINK FOOD MEMORY</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.foodChipsRow}
                        style={{ maxHeight: 40 }}
                      >
                        {['Carbonara', 'Pasta', 'Spaghetti', 'Creamy pasta', 'Parmesan', 'Pork chop', 'Mashed potato'].map((food) => {
                          const isSelected = foodVal === food;
                          return (
                            <TouchableOpacity
                              key={food}
                              activeOpacity={0.8}
                              onPress={() => {
                                Haptics.selectionAsync().catch(() => {});
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setFoodVal(food);
                                setIsFoodExpanded(false);
                              }}
                              style={[
                                styles.foodChip,
                                isSelected && styles.foodChipActive
                              ]}
                            >
                              <Text style={[
                                styles.foodChipText,
                                isSelected && styles.foodChipTextActive
                              ]}>
                                {food}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </Animated.View>
              )}

              {/* Active Biological Insights (Bulleted list) */}
              {text.length > 0 && activeInsights.length > 0 && (
                <Animated.View 
                  style={[
                    styles.insightsBulletContainer, 
                    { 
                      opacity: footnoteAlphaAnim, 
                      transform: [{ translateY: footnoteYAnim }] 
                    }
                  ]}
                >
                  {activeInsights.map((fn) => (
                    <View key={fn.id} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>
                        {fn.insight}
                      </Text>
                    </View>
                  ))}
                </Animated.View>
              )}

              {/* Metabolic Twin Accuracy Card */}
              {text.length > 0 && (
                <View style={styles.twinAccuracyCard}>
                  <View style={styles.twinHeader}>
                    <Feather name="cpu" size={14} color="#70824B" />
                    <Text style={styles.twinTitle}>METABOLIC DIGITAL TWIN</Text>
                    <View style={styles.twinLevelBadge}>
                      <Text style={styles.twinLevelBadgeText}>LVL 3</Text>
                    </View>
                  </View>
                  <Text style={styles.twinDesc}>
                    Your model accuracy is at <Text style={styles.twinHighlight}>85%</Text>. This log adds <Text style={styles.twinHighlight}>+5% calibration</Text> towards leveling up.
                  </Text>
                  {/* Small progress bar */}
                  <View style={styles.twinProgressOuter}>
                    <View style={[styles.twinProgressInner, { width: '85%' }]} />
                    <View style={[styles.twinProgressIncrement, { left: '85%', width: '5%' }]} />
                  </View>
                </View>
              )}

              {/* Live Predicted Glycemic Curve Preview inside Composer */}
              {text.length > 0 && foodVal && (
                <View style={styles.predictedCurveComposerCard}>
                  <Text style={styles.predictionTitle}>Predicted Glycemic Trace ({foodVal.toUpperCase()})</Text>
                  <View style={styles.predictionContentRow}>
                    <GlucoseSparkline 
                      data={getSparklineData(foodVal)}
                      labels={['0h', '1h', '2h', '3h', '4h']}
                      color={getSparklineColor(foodVal)}
                      width={200}
                      height={60}
                      showPeak={true}
                    />
                    <View style={styles.predictionStats}>
                      <Text style={styles.predictionStatLabel}>EST. PEAK</Text>
                      <Text style={styles.predictionStatValue}>
                        +{foodVal.toLowerCase().includes('carbonara') ? '42' : 
                          foodVal.toLowerCase().includes('pasta') ? '54' : 
                          foodVal.toLowerCase().includes('spaghetti') ? '36' : 
                          foodVal.toLowerCase().includes('creamy') ? '28' : 
                          foodVal.toLowerCase().includes('parmesan') ? '8' : '22'} mg/dL
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Confirm / Keep Silent actions */}
              <View style={styles.editorActionButtonsRow}>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setViewMode('timeline');
                  }}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Keep silent</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={handleSave}
                  style={[styles.saveBtn, text.trim().length === 0 && styles.saveBtnDisabled]}
                  disabled={text.trim().length === 0}
                >
                  <Text style={styles.saveBtnText}>
                    {viewMode === 'edit' ? 'Save adjustments' : 'Record memory'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quiet secondary media captures */}
              <View style={styles.actionsContainer}>
                {/* Camera Button (Simulates capturing meal photo) */}
                <TouchableOpacity 
                  style={[styles.quietAction, photoAttached && { opacity: 1 }]} 
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setPhotoAttached(!photoAttached);
                  }}
                >
                  <Feather name="camera" size={28} color={photoAttached ? Colors.burntOrange : Colors.softStone} />
                </TouchableOpacity>

                {/* Voice Flower & Visualizer */}
                <TouchableOpacity 
                  style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
                  activeOpacity={1}
                  onPressIn={() => setIsRecording(true)}
                  onPressOut={() => setIsRecording(false)}
                >
                  <View style={styles.voiceFlowerContainer}>
                    {/* Watercolor ink concentric ring visualizer */}
                    {isRecording && (
                      <>
                        <Animated.View 
                          style={[
                            styles.inkWashCircle, 
                            { 
                              transform: [{ scale: voiceScale }],
                              opacity: voiceScale.interpolate({
                                inputRange: [1, 1.45],
                                outputRange: [0.18, 0.02]
                              })
                            }
                          ]} 
                        />
                        <Animated.View 
                          style={[
                            styles.inkWashCircleOuter, 
                            { 
                              transform: [{ 
                                scale: voiceScale.interpolate({
                                  inputRange: [1, 1.45],
                                  outputRange: [1, 1.75]
                                }) 
                              }],
                              opacity: voiceScale.interpolate({
                                inputRange: [1, 1.45],
                                outputRange: [0.12, 0.0]
                              })
                            }
                          ]} 
                        />
                      </>
                    )}
                    <View style={styles.voiceFlowerWrap}>
                      <BloomFlower 
                        petal1={isRecording ? Colors.burntOrange : Colors.bloom.mornings.petal1}
                        petal2={isRecording ? Colors.amber : Colors.bloom.mornings.petal2}
                        petal3={Colors.bloom.mornings.petal3}
                        size={isRecording ? 100 : 80}
                      />
                    </View>
                  </View>
                  <Text style={[styles.voiceLabel, isRecording && styles.voiceLabelActive]}>
                    {isRecording ? 'Listening...' : 'Hold to speak'}
                  </Text>
                </TouchableOpacity>

                {/* Barcode Button (Simulates scanning Barilla Pasta pack) */}
                <TouchableOpacity 
                  style={styles.quietAction} 
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    const barcodeText = " (Barilla Pasta - 42g Carbs)";
                    setText(prev => prev + barcodeText);
                    setFoodVal('Pasta');
                  }}
                >
                  <Feather name="maximize" size={28} color={Colors.softStone} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {showUndo && lastSavedLog && (
        <Animated.View style={[styles.undoBanner, { opacity: undoAnim }]}>
          <View style={styles.undoContent}>
            <Feather name="check-circle" size={18} color="#EDE6DA" />
            <Text style={styles.undoText}>Memory recorded.</Text>
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={handleUndo}
              style={styles.undoButton}
            >
              <Text style={styles.undoButtonText}>Undo</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.undoProgressBarContainer}>
            <Animated.View style={[
              styles.undoProgressBar,
              {
                width: undoProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                })
              }
            ]} />
          </View>
        </Animated.View>
      )}
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.sm,
  },
  timelineHeaderTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 24,
    color: Colors.ink,
  },
  newLogButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.burntOrange,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
  },
  newLogButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.burntOrange,
  },
  timelineContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  timelineScroll: {
    paddingVertical: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 20,
    color: Colors.ink,
    marginBottom: Spacing.xs,
  },
  emptyStateSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.softStone,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
    position: 'relative',
  },
  timelineActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  timelineActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(217, 121, 71, 0.2)',
    backgroundColor: 'rgba(217, 121, 71, 0.03)',
  },
  timelineActionPillDelete: {
    borderColor: 'rgba(217, 83, 79, 0.2)',
    backgroundColor: 'rgba(217, 83, 79, 0.03)',
  },
  timelineActionPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.burntOrange,
  },
  timelineActionPillTextDelete: {
    color: '#D9534F',
  },
  predictedCurveComposerCard: {
    backgroundColor: '#F3EDE0', // light sandstone
    borderWidth: 1,
    borderColor: '#ECE6DB',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  predictionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: Colors.softStone,
    letterSpacing: 1.0,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  predictionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  predictionStats: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  predictionStatLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 8.5,
    color: Colors.softStone,
    letterSpacing: 0.5,
  },
  predictionStatValue: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 20,
    color: Colors.burntOrange,
    marginTop: 2,
  },
  timelineLine: {
    position: 'absolute',
    top: 10,
    bottom: -Spacing.xl - 10,
    width: 1,
    backgroundColor: '#E6DFD3',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FCFAF6',
    borderWidth: 2.5,
    borderColor: Colors.burntOrange,
    marginTop: 6,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.xl,
    marginLeft: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.3)',
  },
  timelineTimestamp: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 13,
    color: Colors.softStone,
    marginBottom: Spacing.xs,
  },
  timelineText: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 17,
    lineHeight: 22,
    color: Colors.ink,
    marginBottom: Spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badge: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderWidth: 1,
    borderColor: '#E6DFD3',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.softStone,
  },
  timelineInsightsWrap: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  timelineInsight: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 13,
    color: Colors.softStone,
    backgroundColor: 'rgba(217, 121, 71, 0.04)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    lineHeight: 17,
  },

  editorScrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    justifyContent: 'space-between',
    paddingBottom: Spacing.xxxl * 2,
  },
  headerTimestampContainer: {
    paddingRight: Spacing.sm,
  },
  diaryTimestamp: {
    ...TypeScale.metadata,
    color: Colors.softStone,
  },
  textInput: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 36,
    lineHeight: 42,
    color: Colors.ink,
    marginTop: Spacing.xl,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xl,
  },
  quietAction: {
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    opacity: 0.6,
  },
  voiceButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  voiceFlowerContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: Spacing.md,
  },
  voiceFlowerWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  inkWashCircle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#D97947',
    zIndex: 1,
  },
  inkWashCircleOuter: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: '#B97B3F',
    backgroundColor: 'rgba(241, 235, 221, 0.25)',
    zIndex: 1,
  },
  loggingStripContainer: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  loggingPill: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loggingPillActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
  },
  loggingPillFocused: {
    borderColor: Colors.burntOrange,
  },
  loggingPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.softStone,
  },
  loggingPillTextActive: {
    color: Colors.ink,
    fontFamily: 'Inter_600SemiBold',
  },
  inlineEditor: {
    backgroundColor: Colors.cardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  editorLabel: {
    ...TypeScale.label,
    fontSize: 10,
    letterSpacing: 1,
    color: Colors.softStone,
    marginBottom: Spacing.sm,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.xs,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterVal: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.ink,
    minWidth: 60,
    textAlign: 'center',
  },
  foodChipsRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  foodChip: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
  },
  foodChipActive: {
    backgroundColor: Colors.burntOrange,
  },
  foodChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.softStone,
  },
  foodChipTextActive: {
    color: Colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
  insightsBulletContainer: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.burntOrange,
    marginTop: 8,
  },
  bulletText: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.softStone,
    flex: 1,
  },
  editorActionButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: Radius.full,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E6DFD3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.softStone,
  },
  saveBtn: {
    flex: 1.5,
    borderRadius: Radius.full,
    paddingVertical: 12,
    backgroundColor: Colors.burntOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#E6DFD3',
  },
  saveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FCFAF6',
  },

  // Premium Custom Sparkline / Multimedia styles
  timelineSparklineWrap: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(231, 222, 207, 0.3)',
  },
  sparklineLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.softStone,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  photoAttachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(217, 121, 71, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(217, 121, 71, 0.15)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  photoAttachmentText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#D97947',
  },
  photoThumbnailTimeline: {
    width: '100%',
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: '#F3EDE0',
    marginBottom: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6DFD3',
    flexDirection: 'row',
    gap: 6,
  },
  photoThumbnailText: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 14,
    color: '#8A7A68',
  },
  voiceLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.softStone,
    letterSpacing: 0.3,
  },
  voiceLabelActive: {
    color: Colors.burntOrange,
  },
  suggestionContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  suggestionHeader: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: Colors.softStone,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 123, 63, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(185, 123, 63, 0.15)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 8,
  },
  suggestionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13.5,
    color: Colors.ink,
  },
  twinAccuracyCard: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(231, 222, 207, 0.3)',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  twinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  twinTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8.5,
    letterSpacing: 1,
    color: Colors.softStone,
  },
  twinLevelBadge: {
    backgroundColor: 'rgba(112, 130, 75, 0.12)',
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  twinLevelBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: '#70824B',
  },
  twinDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
    color: Colors.softStone,
    marginBottom: Spacing.sm,
  },
  twinHighlight: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.ink,
  },
  twinProgressOuter: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  twinProgressInner: {
    height: '100%',
    backgroundColor: '#70824B',
    borderRadius: 3,
  },
  twinProgressIncrement: {
    height: '100%',
    backgroundColor: '#B5C08D',
    position: 'absolute',
    borderRadius: 3,
  },
  undoBanner: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#181614', // SATO Charcoal ink
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 9999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  undoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  undoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#EDE6DA', // light cream text
    marginLeft: 8,
    flex: 1,
  },
  undoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  undoButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#EDE6DA',
  },
  undoProgressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomLeftRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
    overflow: 'hidden',
  },
  undoProgressBar: {
    height: '100%',
    backgroundColor: '#D97947', // accent color
  },
  timelineSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 222, 207, 0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  timelineSearchIcon: {
    marginRight: Spacing.xs,
  },
  timelineSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.ink,
    padding: 0,
  },
  timelineSearchClear: {
    padding: 2,
  },
  timelineFiltersContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  timelineFilterChip: {
    borderWidth: 1,
    borderColor: 'rgba(231, 222, 207, 0.6)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
  },
  timelineFilterChipActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  timelineFilterChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.softStone,
  },
  timelineFilterChipTextActive: {
    color: '#FCFAF6',
    fontFamily: 'Inter_600SemiBold',
  },
  timelineSummaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.softStone,
    textTransform: 'uppercase',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  dateGroupContainer: {
    marginBottom: Spacing.lg,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E6DFD3',
    opacity: 0.5,
  },
  dateHeaderText: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 20,
    color: Colors.ink,
  },
});
