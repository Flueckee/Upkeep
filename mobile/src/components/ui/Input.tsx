import React, { useEffect, useRef, useState } from 'react';
import {
  TextInput,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { Colors, Radius, Typography, Spacing } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  hint?: string;
  style?: ViewStyle;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  value,
  onChangeText,
  error,
  hint,
  style,
  rightElement,
  ...textInputProps
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { primaryColor: primary } = useTheme();

  // 0 = resting (inside input), 1 = floating (above input)
  const labelAnim = useSharedValue(value ? 1 : 0);
  const borderAnim = useSharedValue(0); // 0 = default, 1 = focused

  useEffect(() => {
    labelAnim.value = withTiming(value || isFocused ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });
    borderAnim.value = withTiming(isFocused ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });
  }, [isFocused, value]);

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(labelAnim.value, [0, 1], [0, -24]) },
      { scale: interpolate(labelAnim.value, [0, 1], [1, 0.85]) },
    ],
    color: interpolateColor(
      error ? 1 : borderAnim.value,
      [0, 1],
      error
        ? [Colors.textMuted, Colors.danger]
        : [Colors.textMuted, primary],
    ),
  }));

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? Colors.danger
      : interpolateColor(
          borderAnim.value,
          [0, 1],
          [Colors.border, primary],
        ),
  }));

  return (
    <View style={[styles.wrapper, style]}>
      <Animated.View style={[styles.container, containerStyle]}>
        {/* Floating label */}
        <Animated.Text
          style={[styles.label, labelStyle]}
          onPress={() => inputRef.current?.focus()}
        >
          {label}
        </Animated.Text>

        <View style={styles.row}>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={styles.input}
            placeholderTextColor={Colors.textMuted}
            selectionColor={primary}
            {...textInputProps}
          />
          {rightElement && <View style={styles.right}>{rightElement}</View>}
        </View>
      </Animated.View>

      {(error || hint) && (
        <Text style={[styles.helper, error ? styles.helperError : styles.helperHint]}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.sm,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 10,
    minHeight: 60,
  },
  label: {
    ...Typography.subhead,
    position: 'absolute',
    left: 16,
    top: 18,
    transformOrigin: 'left center',
    // Animated style controls transform/color
  } as any,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    padding: 0,
    // Remove default outline on web
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  right: {
    marginLeft: 8,
  },
  helper: {
    ...Typography.caption,
    marginTop: 6,
    marginLeft: 4,
  },
  helperError: {
    color: Colors.danger,
  },
  helperHint: {
    color: Colors.textMuted,
  },
});
