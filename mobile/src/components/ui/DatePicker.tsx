import React, { useRef, useEffect } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const CELL_WIDTH = 52;
const CELL_GAP  = 8;

// Build array of dates: today − 7 through today (8 days total)
function buildDays(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

interface Props {
  value: string;       // ISO date string "YYYY-MM-DD"
  onChange: (iso: string) => void;
  style?: ViewStyle;
  error?: string;
}

function DayCell({
  date,
  selected,
  isToday,
  onPress,
}: {
  date: Date;
  selected: boolean;
  isToday: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(selected ? 1 : 0.92);
  const { primaryColor: primary } = useTheme();

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 300 });
  }, [selected]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Animated.View
        style={[
          styles.cell,
          selected && { backgroundColor: primary, borderColor: primary },
          isToday && !selected && { borderColor: primary },
          animStyle,
        ]}
      >
        <Text style={[styles.dayName, selected && styles.textSelected]}>
          {DAY_NAMES[date.getDay()]}
        </Text>
        <Text style={[styles.dayNum, selected && styles.textSelected]}>
          {date.getDate()}
        </Text>
        {isToday && (
          <View
            style={[
              styles.dot,
              { backgroundColor: selected ? Colors.white : primary },
            ]}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export function DatePicker({ value, onChange, style, error }: Props) {
  const days = buildDays();
  const scrollRef = useRef<ScrollView>(null);

  // Scroll to selected day on mount
  useEffect(() => {
    const idx = days.findIndex((d) => toISO(d) === value);
    if (idx >= 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          x: idx * (CELL_WIDTH + CELL_GAP),
          animated: true,
        });
      }, 200);
    }
  }, []);

  return (
    <View style={style}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {days.map((d) => {
          const iso = toISO(d);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return (
            <DayCell
              key={iso}
              date={d}
              selected={value === iso}
              isToday={d.getTime() === today.getTime()}
              onPress={() => onChange(iso)}
            />
          );
        })}
      </ScrollView>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: CELL_GAP,
    flexDirection: 'row',
  },
  cell: {
    width: CELL_WIDTH,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 2,
  },
  dayName: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayNum: {
    ...Typography.title3,
    color: Colors.text,
  },
  textSelected: {
    color: Colors.white,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  error: {
    ...Typography.caption,
    color: Colors.danger,
    marginTop: 6,
    marginLeft: Spacing.md,
  },
});
