import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface Props {
  error?: string | null;
  message?: string;
}

export default function LoadingView({ error, message }: Props) {
  const { primaryColor: primary } = useTheme();

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>⚠</Text>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <ActivityIndicator color={primary} size="large" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorIcon: {
    fontSize: 36,
  },
  error: {
    ...Typography.body,
    color: Colors.danger,
    textAlign: 'center',
  },
  message: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
