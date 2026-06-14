import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';

import { MainTab } from '../navigation/types';
import { useNavigation } from '../navigation/NavigationProvider';

interface TabBarProps {
  active?: MainTab;
  onSelect: (tab: MainTab) => void;
}

type TabItem = { name: MainTab | 'log'; label: string; icon: (active: boolean) => React.ReactNode; isAction?: boolean };

const TABS: TabItem[] = [
  {
    name: 'portrait',
    label: 'Portrait',
    icon: (active) => (
      <View style={styles.iconWrap}>
        <Feather name="clock" size={20} color={active ? Colors.burntOrange : Colors.softStone} />
      </View>
    ),
  },
  {
    name: 'foods',
    label: 'Foods',
    icon: (active) => (
      <View style={styles.iconWrap}>
        <Feather name="coffee" size={20} color={active ? Colors.burntOrange : Colors.softStone} />
      </View>
    ),
  },
  {
    name: 'log',
    label: '',
    isAction: true,
    icon: () => (
      <View style={styles.actionIconWrap}>
        <Feather name="plus" size={22} color={Colors.burntOrange} />
      </View>
    ),
  },
  {
    name: 'discover',
    label: 'Discover',
    icon: (active) => (
      <View style={styles.iconWrap}>
        <Feather name="compass" size={20} color={active ? Colors.burntOrange : Colors.softStone} />
      </View>
    ),
  },
  {
    name: 'sato',
    label: 'Sato',
    icon: (active) => (
      <View style={styles.iconWrap}>
        <Feather name="message-circle" size={20} color={active ? Colors.burntOrange : Colors.softStone} />
      </View>
    ),
  },
];

const getTabIndex = (tabName: string): number => {
  switch (tabName) {
    case 'portrait': return 0;
    case 'foods': return 1;
    case 'log': return 2;
    case 'discover': return 3;
    case 'sato': return 4;
    default: return 0;
  }
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTAINER_WIDTH = SCREEN_WIDTH - 40; // left: 20, right: 20
const TAB_WIDTH = CONTAINER_WIDTH / 5;
const CAPSULE_WIDTH = TAB_WIDTH - 12;

export function TabBar({ active, onSelect }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();

  const [activeAnim] = React.useState(() => new Animated.Value(getTabIndex(active || 'portrait')));

  React.useEffect(() => {
    if (active) {
      Animated.spring(activeAnim, {
        toValue: getTabIndex(active),
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [active]);

  const translateX = activeAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [
      TAB_WIDTH * 0 + 6,
      TAB_WIDTH * 1 + 6,
      TAB_WIDTH * 2 + 6, // Glides organically behind central action button
      TAB_WIDTH * 3 + 6,
      TAB_WIDTH * 4 + 6,
    ],
  });

  return (
    <View 
      style={[
        styles.container, 
        { bottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }
      ]}
    >
      <Animated.View
        style={[
          styles.capsuleSlider,
          {
            width: CAPSULE_WIDTH,
            transform: [{ translateX }],
          },
        ]}
      />

      {TABS.map((tab) => {
        const isActive = tab.name === active;
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => {
              if (tab.name === 'log') {
                nav.openLog();
              } else {
                onSelect(tab.name as MainTab);
              }
            }}
            style={styles.tab}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            {tab.icon(isActive)}
            {!tab.isAction && (
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'absolute',
    left: 20,
    right: 20,
    height: 64,
    backgroundColor: 'rgba(252, 250, 246, 0.96)',
    borderWidth: 1,
    borderColor: '#ECE6DB',
    borderRadius: 32,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#181614',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
    zIndex: 99,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 2,
  },
  label: {
    fontSize: 9.5,
    color: Colors.softStone,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
    textAlign: 'center',
  },
  labelActive: {
    color: Colors.burntOrange,
    fontFamily: 'Inter_600SemiBold',
  },
  iconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.burntOrange,
    backgroundColor: 'rgba(217, 121, 71, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.burntOrange,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  capsuleSlider: {
    position: 'absolute',
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(217, 121, 71, 0.08)',
    top: 10,
    zIndex: 1,
  },
});

