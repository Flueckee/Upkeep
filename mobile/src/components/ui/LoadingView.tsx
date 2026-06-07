import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Spacing, Typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  message?: string;
  style?: ViewStyle;
  /** If true, fills the full screen */
  fullScreen?: boolean;
}

export function LoadingView({ message = 'Lädt…', style, fullScreen }: Props) {
  // Three dots, staggered bounce
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);
  const { primaryColor: primary } = useTheme();

  const bounce = (sv: Animated.SharedValue<number>, delay: number) => {
    sv.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay }),
        withTiming(-8, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0,  { duration: 280, easing: Easing.in(Easing.cubic) }),
        withTiming(0,  { duration: 200 }),
      ),
      -1,
      false,
    );
  };

  useEffect(() => {
    bounce(dot1, 0);
    bounce(dot2, 140);
    bounce(dot3, 280);
  }, []);

  const d1Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const d2Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const d3Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <View style={styles.dots}>
        <Animated.View style={[styles.dot, { backgroundColor: primary }, d1Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: primary }, d2Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: primary }, d3Style]} />
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.85,
  },
  message: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
