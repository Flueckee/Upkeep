import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Image,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Bike } from '../../types';
import { StatusBadge, BadgeVariant } from './StatusBadge';
import { Colors, Radius, Shadow, Spacing, Typography } from '../../theme';

const BIKE_TYPE_EMOJI: Record<string, string> = {
  road:   '🚴',
  gravel: '🚵',
  mtb:    '⛰',
  other:  '🚲',
};

interface Props {
  bike: Bike;
  /** Resolved full photo URL (or null) */
  photoUrl: string | null;
  overdueCount: number;
  dueSoonCount: number;
  onPress: () => void;
  style?: ViewStyle;
}

export function BikeCard({ bike, photoUrl, overdueCount, dueSoonCount, onPress, style }: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Accent bar color
  const accentColor =
    overdueCount > 0
      ? Colors.danger
      : dueSoonCount > 0
      ? Colors.warning
      : Colors.success;

  const badgeVariant: BadgeVariant =
    overdueCount > 0 ? 'overdue' : dueSoonCount > 0 ? 'dueSoon' : 'ok';

  const badgeLabel =
    overdueCount > 0
      ? `${overdueCount} überfällig`
      : dueSoonCount > 0
      ? `${dueSoonCount} bald fällig`
      : 'Alles OK';

  const emoji = BIKE_TYPE_EMOJI[bike.type] ?? '🚲';

  return (
    <Animated.View style={[styles.wrapper, Shadow.card, animStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.975, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        activeOpacity={1}
        style={styles.card}
      >
        {/* Left accent bar */}
        <View style={[styles.accent, { backgroundColor: accentColor }]} />

        {/* Cover photo or placeholder */}
        <View style={styles.photoArea}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.emoji}>{emoji}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{bike.name}</Text>
          {(bike.brand || bike.model) && (
            <Text style={styles.meta} numberOfLines={1}>
              {[bike.brand, bike.model].filter(Boolean).join(' · ')}
            </Text>
          )}
          <Text style={styles.km}>{bike.total_km.toLocaleString('de-DE')} km</Text>
          <StatusBadge label={badgeLabel} variant={badgeVariant} style={styles.badge} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    minHeight: 120,
  },
  accent: {
    width: 4,
  },
  photoArea: {
    width: 100,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 36,
  },
  info: {
    flex: 1,
    padding: Spacing.md,
    gap: 4,
    justifyContent: 'center',
  },
  name: {
    ...Typography.title3,
    color: Colors.text,
  },
  meta: {
    ...Typography.subhead,
    color: Colors.textSecondary,
  },
  km: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badge: {
    marginTop: 6,
  },
});
