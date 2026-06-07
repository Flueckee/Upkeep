import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Radius, Typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function PrimaryButton({ label, onPress, loading, disabled, style, icon }: Props) {
  const scale = useSharedValue(1);
  const { primaryColor: primary } = useTheme();

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[styles.wrapper, animStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        activeOpacity={1}
        disabled={isDisabled}
        style={[styles.button, { backgroundColor: primary }, isDisabled && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <>
            {icon && <Animated.View style={styles.iconWrap}>{icon}</Animated.View>}
            <Text style={styles.label}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Animated.View wraps so scale applies to the full touch target
  },
  button: {
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  iconWrap: {
    marginRight: 4,
  },
  label: {
    ...Typography.callout,
    color: Colors.white,
    fontWeight: '600',
  },
});
