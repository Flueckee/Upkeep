import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DueStatus } from '../types';
import { Colors, Radius, Typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Status = DueStatus | 'ok' | 'not_tracked';

interface Props {
  status: Status;
}

export default function StatusBadge({ status }: Props) {
  const { primaryColor: primary, primaryLight } = useTheme();

  const CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
    ok:                  { label: '✓ OK',             color: Colors.success,     bg: Colors.successLight  },
    due_soon:            { label: '⚠ Bald fällig',    color: Colors.warning,     bg: Colors.warningLight  },
    overdue:             { label: '✕ Überfällig',     color: Colors.danger,      bg: Colors.dangerLight   },
    needs_first_service: { label: '● Erstservice',    color: primary,            bg: primaryLight         },
    not_tracked:         { label: '– Kein Intervall', color: Colors.textMuted,   bg: Colors.surfaceRaised },
  };

  const { label, color, bg } = CONFIG[status] ?? CONFIG.not_tracked;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
