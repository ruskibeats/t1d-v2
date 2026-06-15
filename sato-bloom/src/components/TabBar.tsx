import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path as SvgPath, Circle as SvgCircle } from 'react-native-svg';
import { Colors, Spacing } from '@/constants/theme';
import { MainTab } from '../navigation/types';
import { useNavigation } from '../navigation/NavigationProvider';

interface TabBarProps {
  active?: MainTab;
  onSelect: (tab: MainTab) => void;
}

type TabItem = { 
  name: MainTab | 'log'; 
  label: string; 
  icon: (active: boolean) => React.ReactNode; 
  isAction?: boolean; 
};

// Calligraphy-style Japanese custom SVGs replacing generic outline icons
const PortraitIcon = ({ active }: { active: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 20 20">
    <SvgPath
      d="M 10 2 L 10 18"
      stroke={active ? '#181614' : '#7E756A'}
      strokeWidth={1.3}
      strokeLinecap="round"
    />
  </Svg>
);

const FoodsIcon = ({ active }: { active: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 20 20">
    <SvgCircle
      cx={10}
      cy={10}
      r={4}
      stroke={active ? '#181614' : '#7E756A'}
      strokeWidth={1.3}
      fill="none"
    />
    <SvgCircle
      cx={10}
      cy={10}
      r={8}
      stroke={active ? '#181614' : '#7E756A'}
      strokeWidth={1.3}
      fill="none"
      strokeDasharray="2,2"
    />
  </Svg>
);

const LogIcon = ({ active }: { active: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 20 20">
    <SvgPath
      d="M 4 10 L 16 10 M 10 4 L 10 16"
      stroke={active ? '#181614' : '#7E756A'}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

const DiscoverIcon = ({ active }: { active: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 20 20">
    <SvgPath
      d="M 16 10 A 6 6 0 1 1 10 4 A 6 6 0 0 1 15 5.8"
      stroke={active ? '#181614' : '#7E756A'}
      strokeWidth={1.3}
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

const SatoIcon = ({ active }: { active: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 20 20">
    <SvgCircle
      cx={10}
      cy={6}
      r={1.8}
      fill={active ? '#181614' : '#7E756A'}
    />
    <SvgCircle
      cx={10}
      cy={14}
      r={1.8}
      fill={active ? '#181614' : '#7E756A'}
    />
  </Svg>
);

const TABS: TabItem[] = [
  {
    name: 'portrait',
    label: 'Portrait',
    icon: (active) => <PortraitIcon active={active} />,
  },
  {
    name: 'discover',
    label: 'Discover',
    icon: (active) => <DiscoverIcon active={active} />,
  },
  {
    name: 'log',
    label: 'Record',
    isAction: true,
    icon: (active) => <LogIcon active={active} />,
  },
  {
    name: 'foods',
    label: 'Foods',
    icon: (active) => <FoodsIcon active={active} />,
  },
  {
    name: 'sato',
    label: 'Sato',
    icon: (active) => <SatoIcon active={active} />,
  },
];

const getTabIndex = (tabName: string): number => {
  switch (tabName) {
    case 'portrait': return 0;
    case 'discover': return 1;
    case 'log': return 2;
    case 'foods': return 3;
    case 'sato': return 4;
    default: return 0;
  }
};

export function TabBar({ active, onSelect }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();

  // Opacity indicators array for pigment-settling fade transition
  const tabOpacities = useRef(
    [0, 1, 2, 3, 4].map((i) => new Animated.Value(i === getTabIndex(active || 'portrait') ? 1 : 0))
  ).current;

  useEffect(() => {
    if (active) {
      const activeIdx = getTabIndex(active);
      const animations = tabOpacities.map((anim, idx) => {
        return Animated.timing(anim, {
          toValue: idx === activeIdx ? 1 : 0,
          duration: 300, // SATO normal timing
          useNativeDriver: true,
        });
      });
      Animated.parallel(animations).start();
    }
  }, [active]);

  return (
    <View 
      style={[
        styles.container, 
        { 
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom 
        }
      ]}
    >
      {TABS.map((tab, idx) => {
        const isActive = tab.name === active;
        const opacity = tabOpacities[idx];

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
            {/* Zen Icon */}
            <View style={styles.iconWrap}>
              {tab.icon(isActive)}
            </View>

            {/* Typographic navigation label */}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>

            {/* Quiet active indicator mark (Atmospheric fade-in) */}
            <Animated.View style={[styles.activeIndicator, { opacity }]} />
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
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F2ECDF', // Primary Surface (1% luminance shift from #F1EBDD)
    borderTopWidth: 1,
    borderTopColor: 'rgba(231, 222, 207, 0.3)', // Borders avoid/light 30% opacity
    alignItems: 'center',
    zIndex: 99,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: 8,
    position: 'relative',
  },
  iconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium', // Instrument Sans fallback
    color: '#7E756A', // Secondary SATO text color
    textAlign: 'center',
  },
  labelActive: {
    color: '#181614', // Active SATO text color
    fontFamily: 'Inter_500Medium',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 10,
    height: 1.2,
    backgroundColor: '#181614',
    borderRadius: 0.6,
  },
});
