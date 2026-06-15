import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet } from 'react-native';
import { Canvas, Circle, BlurMask } from '@shopify/react-native-skia';
import { useRoute, useRouteStack } from '../navigation/NavigationProvider';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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
  const [progress, setProgress] = useState(1);

  // Sync Animated value changes to React state for Skia render updates
  useEffect(() => {
    const listenerId = animValue.addListener(({ value }) => {
      setProgress(value);
    });
    return () => {
      animValue.removeListener(listenerId);
    };
  }, []);

  // React state update during render to synchronously reset animation values
  if (route !== prevRoute || routeStack.length !== prevStackLength) {
    let type: 'push' | 'pop' | 'tab' | 'none' = 'none';
    if (routeStack.length > prevStackLength) {
      type = 'push';
    } else if (routeStack.length < prevStackLength) {
      type = 'pop';
    } else if (JSON.stringify(route) !== JSON.stringify(prevRoute)) {
      // Smooth fade/slide transition for tabs
      type = 'tab';
    }

    setPrevRoute(route);
    setPrevStackLength(routeStack.length);
    setAnimType(type);

    if (type !== 'none') {
      animValue.setValue(0);
      setProgress(0);
    } else {
      animValue.setValue(1);
      setProgress(1);
    }
  }

  useEffect(() => {
    if (animType === 'none') return;

    Animated.timing(animValue, {
      toValue: 1,
      duration: animType === 'tab' ? 260 : 300, // snappier tab transition
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start(() => {
      setAnimType('none');
    });
  }, [animType]);

  // Opacity fade for tab transitions, constant 1.0 for push/pop to prevent flashing
  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: animType === 'tab' ? [0.0, 1] : [1, 1],
  });

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: animType === 'push' ? [SCREEN_W * 0.12, 0] : animType === 'pop' ? [-SCREEN_W * 0.08, 0] : [0, 0],
  });

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: animType === 'tab' ? [12, 0] : [0, 0],
  });

  // Calculate ink bleed attributes based on animation progress
  const showInkBleed = animType === 'tab' && progress < 0.99;
  const mainRadius = 40 + progress * 240;
  const mainBlur = 15 + progress * 75;
  const inkOpacity = (1 - progress) * 0.75;

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

      {showInkBleed && (
        <Canvas style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {/* Main central drop */}
          <Circle
            cx={SCREEN_W / 2}
            cy={SCREEN_H / 2}
            r={mainRadius}
            color="#181614"
            opacity={inkOpacity}
          >
            <BlurMask blur={mainBlur} style="normal" />
          </Circle>

          {/* Secondary top-left drop */}
          <Circle
            cx={SCREEN_W * 0.25}
            cy={SCREEN_H * 0.3}
            r={mainRadius * 0.6}
            color="#181614"
            opacity={inkOpacity * 0.8}
          >
            <BlurMask blur={mainBlur * 0.7} style="normal" />
          </Circle>

          {/* Secondary bottom-right drop */}
          <Circle
            cx={SCREEN_W * 0.75}
            cy={SCREEN_H * 0.7}
            r={mainRadius * 0.7}
            color="#181614"
            opacity={inkOpacity * 0.8}
          >
            <BlurMask blur={mainBlur * 0.8} style="normal" />
          </Circle>
        </Canvas>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
