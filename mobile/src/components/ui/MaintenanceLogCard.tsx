import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { MessageCircle, Lock } from 'lucide-react-native';
import { MaintenanceLog, MaintenancePhoto } from '../../types';
import { Colors, Radius, Shadow, Spacing, Typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  log: MaintenanceLog;
  photos?: MaintenancePhoto[];
  commentCount?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export function MaintenanceLogCard({ log, photos, commentCount, onPress, style }: Props) {
  const { primaryColor: primary } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[styles.card, Shadow.card, style]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.dateBlock}>
          <Text style={styles.performedAt}>{formatDate(log.performed_at)}</Text>
          <View style={styles.lockedRow}>
            <Lock size={10} color={Colors.textMuted} strokeWidth={2.5} />
            <Text style={styles.recordedAt}>{formatDateTime(log.recorded_at)}</Text>
          </View>
        </View>
        {log.cost != null && (
          <Text style={[styles.cost, { color: primary }]}>
            {log.cost.toLocaleString('de-DE', {
              style: 'currency',
              currency: 'EUR',
            })}
          </Text>
        )}
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={3}>{log.description}</Text>

      {/* Odometer */}
      <Text style={styles.odometer}>
        📍 {log.odometer_km.toLocaleString('de-DE')} km
      </Text>

      {/* Photo strip */}
      {photos && photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoStrip}
          contentContainerStyle={styles.photoStripContent}
        >
          {photos.map((p) => (
            <Image
              key={p.id}
              source={{ uri: p.thumbnail_url }}
              style={styles.thumb}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      {/* Footer */}
      {(commentCount != null && commentCount > 0) && (
        <View style={styles.footer}>
          <MessageCircle size={14} color={Colors.textMuted} strokeWidth={2} />
          <Text style={styles.commentCount}>{commentCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateBlock: {
    gap: 2,
  },
  performedAt: {
    ...Typography.title3,
    color: Colors.text,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordedAt: {
    ...Typography.monospace,
    color: Colors.textMuted,
  },
  cost: {
    ...Typography.callout,
    fontWeight: '600',
  },
  description: {
    ...Typography.body,
    color: Colors.text,
    lineHeight: 22,
  },
  odometer: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  photoStrip: {
    marginTop: 4,
    marginHorizontal: -Spacing.md,
  },
  photoStripContent: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentCount: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
});
