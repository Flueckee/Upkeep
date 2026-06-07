import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
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
  disabled?: boolean;
  style?: ViewStyle;
  destructive?: boolean;
  icon?: React.ReactNode;
}

export function SecondaryButton({ label, onPress, disabled, style, destructive, icon }: Props) {
  const scale = useSharedValue(1);
  const { primaryColor: primary } = useTheme();

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const color = destructive ? Colors.danger : primary;

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
        disabled={disabled}
        style={[styles.button, { borderColor: color }, disabled && styles.disabled]}
      >
        {icon && <Animated.View style={styles.iconWrap}>{icon}</Animated.View>}
        <Text style={[styles.label, { color }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  button: {
    height: 56,
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  disabled: {
    opacity: 0.4,
  },
  iconWrap: {
    marginRight: 4,
  },
  label: {
    ...Typography.callout,
    fontWeight: '600',
  },
});
