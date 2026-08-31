import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';

export type TabName = 'portrait' | 'foods' | 'discover' | 'sato' | 'profile';

interface TabBarProps {
  active: TabName;
  onPress: (tab: TabName) => void;
}

const TABS: { name: TabName; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    name: 'portrait',
    label: 'Portrait',
    icon: (active) => (
      <View style={[styles.iconWrap]}>
        {/* Person silhouette */}
        <View style={[styles.iconCircle, { borderColor: active ? Colors.burntOrange : Colors.softStone }]} />
        <View style={[styles.iconBody, { backgroundColor: active ? Colors.burntOrange : Colors.softStone }]} />
      </View>
    ),
  },
  {
    name: 'foods',
    label: 'Foods',
    icon: (active) => (
      <View style={[styles.iconWrap]}>
        <View style={[styles.iconFoodRow]}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.iconDot, { backgroundColor: active ? Colors.burntOrange : Colors.softStone }]} />
          ))}
        </View>
      </View>
    ),
  },
  {
    name: 'discover',
    label: 'Discover',
    icon: (active) => (
      <View style={[styles.iconWrap]}>
        <View style={[styles.iconDiscover, { borderColor: active ? Colors.burntOrange : Colors.softStone }]}>
          <View style={[styles.iconDiscoverTail, { backgroundColor: active ? Colors.burntOrange : Colors.softStone }]} />
        </View>
      </View>
    ),
  },
  {
    name: 'sato',
    label: 'Sato',
    icon: (active) => (
      <View style={[styles.iconWrap]}>
        <View style={[styles.iconFlower, { backgroundColor: active ? Colors.burntOrange : Colors.softStone }]} />
      </View>
    ),
  },
  {
    name: 'profile',
    label: 'Profile',
    icon: (active) => (
      <View style={[styles.iconWrap]}>
        <View style={[styles.iconHeadCircle, { borderColor: active ? Colors.burntOrange : Colors.softStone }]} />
        <View style={[styles.iconShoulders, { borderColor: active ? Colors.burntOrange : Colors.softStone }]} />
      </View>
    ),
  },
];

export function TabBar({ active, onPress }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 4 }]}>
      {TABS.map((tab) => {
        const isActive = tab.name === active;
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => onPress(tab.name)}
            style={styles.tab}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            {tab.icon(isActive)}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.navBg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 10,
    paddingHorizontal: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: Colors.ink,
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 10,
    color: Colors.softStone,
    fontWeight: '500',
  },
  labelActive: {
    color: Colors.burntOrange,
    fontWeight: '700',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.burntOrange,
    marginTop: 1,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Portrait
  iconCircle: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, marginBottom: 1 },
  iconBody: { width: 14, height: 7, borderRadius: 7 },
  // Foods
  iconFoodRow: { flexDirection: 'row', gap: 2 },
  iconDot: { width: 4, height: 4, borderRadius: 2 },
  // Discover (chat bubble)
  iconDiscover: { width: 16, height: 13, borderRadius: 4, borderWidth: 1.5, position: 'relative' },
  iconDiscoverTail: { position: 'absolute', bottom: -4, left: 3, width: 5, height: 5, borderRadius: 2 },
  // Sato (small flower)
  iconFlower: { width: 8, height: 8, borderRadius: 4 },
  // Profile
  iconHeadCircle: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, marginBottom: 1 },
  iconShoulders: { width: 14, height: 6, borderRadius: 7, borderWidth: 1.5 },
});
