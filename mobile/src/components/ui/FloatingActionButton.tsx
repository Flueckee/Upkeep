import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Colors, Shadow } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  onPress: () => void;
  icon: React.ReactNode;
  style?: ViewStyle;
  /** Delay entrance animation in ms (default 100) */
  entranceDelay?: number;
}

export function FloatingActionButton({ onPress, icon, style, entranceDelay = 100 }: Props) {
  const scale = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const { primaryColor: primary } = useTheme();

  // Entrance spring from zero
  useEffect(() => {
    scale.value = withDelay(
      entranceDelay,
      withSpring(1, { damping: 14, stiffness: 220 }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * pressScale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: primary },
        Shadow.fab,
        { shadowColor: primary },
        animStyle,
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => {
          pressScale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        activeOpacity={1}
        style={styles.button}
      >
        {icon}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  button: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
