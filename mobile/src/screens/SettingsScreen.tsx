import React from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import { SettingsStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { Colors, Radius, Shadow, Spacing, Typography } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<SettingsStackParamList, 'Profile'>;
};

function SettingsRow({
  label,
  value,
  onPress,
  accent,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  accent?: boolean;
}) {
  const { primaryColor: primary } = useTheme();
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? (
          <Text style={[styles.rowValue, accent && { color: primary }]}>{value}</Text>
        ) : null}
        {onPress ? (
          <ChevronRight size={16} color={Colors.textMuted} strokeWidth={2} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { primaryColor: primary, primaryLight } = useTheme();

  const handleLogout = () => {
    Alert.alert('Abmelden?', 'Du wirst abgemeldet.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.root}>
      {/* Avatar / user */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: primaryLight }]}>
          <Text style={[styles.avatarLetter, { color: primary }]}>
            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Personalisierung */}
      <Text style={styles.sectionLabel}>PERSONALISIERUNG</Text>
      <View style={styles.card}>
        <SettingsRow
          label="Akzentfarbe"
          value="Ändern"
          onPress={() => navigation.navigate('ColorPicker')}
          accent
        />
      </View>

      {/* Verbindungen */}
      <Text style={styles.sectionLabel}>VERBINDUNGEN</Text>
      <View style={styles.card}>
        <SettingsRow
          label="Strava"
          value="Verwalten"
          onPress={() => navigation.navigate('Strava')}
          accent
        />
      </View>

      {/* Account */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.card}>
        <SettingsRow label="E-Mail" value={user?.email ?? '–'} />
        <View style={styles.divider} />
        <SettingsRow label="Name" value={user?.name ?? '–'} />
      </View>

      {/* Actions */}
      <SecondaryButton
        label="Abmelden"
        destructive
        onPress={handleLogout}
        style={styles.logoutBtn}
      />

      <Text style={styles.version}>Upkeep v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  avatarLetter: {
    ...Typography.title1,
  },
  userName: {
    ...Typography.title3,
    color: Colors.text,
  },
  userEmail: {
    ...Typography.subhead,
    color: Colors.textSecondary,
  },

  // Sections
  sectionLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },

  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
    ...Shadow.card,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },

  // Row
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  rowLabel: {
    ...Typography.callout,
    color: Colors.text,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValue: {
    ...Typography.subhead,
    color: Colors.textSecondary,
  },

  logoutBtn: {
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },

  version: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
