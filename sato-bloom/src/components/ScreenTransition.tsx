import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet } from 'react-native';
import { useRoute, useRouteStack } from '../navigation/NavigationProvider';

const { width: SCREEN_W } = Dimensions.get('window');

interface ScreenTransitionProps {
  children: React.ReactNode;
}

export function ScreenTransition({ children }: ScreenTransitionProps) {
  const route = useRoute();
  const routeStack = useRouteStack();

  const [prevRoute, setPrevRoute] = useState(route);
  const [prevStackLength, setPrevStackLength] = useState(routeStack.length);
  const [animType, setAnimType] = useState<'push' | 'pop' | 'tab' | 'none'>('none');

  const animValue = useRef(new Animated.Value(1)).current;

  // React state update during render to synchronously reset animation values
  if (route !== prevRoute || routeStack.length !== prevStackLength) {
    let type: 'push' | 'pop' | 'tab' | 'none' = 'none';
    if (routeStack.length > prevStackLength) {
      type = 'push';
    } else if (routeStack.length < prevStackLength) {
      type = 'pop';
    } else if (JSON.stringify(route) !== JSON.stringify(prevRoute)) {
      // Instant transition for tabs (no animation)
      type = 'none';
    }

    setPrevRoute(route);
    setPrevStackLength(routeStack.length);
    setAnimType(type);

    if (type !== 'none') {
      animValue.setValue(0);
    } else {
      animValue.setValue(1);
    }
  }

  useEffect(() => {
    if (animType === 'none') return;

    Animated.timing(animValue, {
      toValue: 1,
      duration: 300, // Standard smooth iOS slide duration
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start(() => {
      setAnimType('none');
    });
  }, [animType]);

  // Constant opacity (1.0) for push and pop to completely prevent flashing
  const opacity = 1;

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: animType === 'push' ? [SCREEN_W * 0.12, 0] : animType === 'pop' ? [-SCREEN_W * 0.08, 0] : [0, 0],
  });

  const translateY = 0;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
