import React, { useEffect } from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Radius, Typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export type BadgeVariant = 'ok' | 'dueSoon' | 'overdue' | 'info' | 'neutral';

interface Props {
  label: string;
  variant: BadgeVariant;
  style?: ViewStyle;
  /** Show pulsing animation (auto-enabled when variant === 'overdue') */
  pulse?: boolean;
}

export function StatusBadge({ label, variant, style, pulse }: Props) {
  const opacity = useSharedValue(1);
  const shouldPulse = pulse ?? variant === 'overdue';
  const { primaryColor: primary, primaryLight } = useTheme();

  const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
    ok:      { bg: Colors.successLight, text: Colors.success },
    dueSoon: { bg: Colors.warningLight, text: Colors.warning },
    overdue: { bg: Colors.dangerLight,  text: Colors.danger  },
    info:    { bg: primaryLight,        text: primary        },
    neutral: { bg: Colors.surfaceRaised, text: Colors.textSecondary },
  };

  useEffect(() => {
    if (shouldPulse) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1,    { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      opacity.value = 1;
    }
  }, [shouldPulse]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const { bg, text } = VARIANT_COLORS[variant];

  return (
    <Animated.View style={[styles.badge, { backgroundColor: bg }, animStyle, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
