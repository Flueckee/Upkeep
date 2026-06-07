import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { StatusBadge, BadgeVariant } from './StatusBadge';
import { Colors, Radius, Shadow, Spacing, Typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  name: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeVariant?: BadgeVariant;
  /** Lucide icon element, sized ~20 */
  icon?: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
}

export function ComponentRow({
  name,
  subtitle,
  badgeLabel,
  badgeVariant = 'neutral',
  icon,
  onPress,
  style,
}: Props) {
  const scale = useSharedValue(1);
  const { primaryLight } = useTheme();

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, Shadow.card, animStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        activeOpacity={1}
        style={styles.row}
      >
        {/* Icon box */}
        {icon && (
          <View style={[styles.iconBox, { backgroundColor: primaryLight }]}>
            {icon}
          </View>
        )}

        {/* Text */}
        <View style={styles.textBlock}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          )}
          {badgeLabel && (
            <StatusBadge
              label={badgeLabel}
              variant={badgeVariant}
              style={styles.badge}
            />
          )}
        </View>

        {/* Chevron */}
        <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...Typography.callout,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  badge: {
    marginTop: 4,
  },
});
