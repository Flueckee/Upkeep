import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Alert, Linking, ActivityIndicator,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, ChevronRight, Pencil } from 'lucide-react-native';
import { SettingsStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { mediaUrl } from '../services/bikesApi';
import { uploadAvatar, updateMe } from '../services/usersApi';
import { Colors, Radius, Shadow, Spacing, Typography } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<SettingsStackParamList, 'Profile'>;
};

// ── Shared sub-components ─────────────────────────────────────────────────────

interface RowProps {
  label: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}

function ProfileRow({ label, value, right, onPress }: RowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {right ?? (value ? <Text style={styles.rowValue}>{value}</Text> : null)}
        {onPress ? <ChevronRight size={16} color={Colors.textMuted} strokeWidth={2} /> : null}
      </View>
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout, updateUser } = useAuth();
  const { primaryColor: primary, primaryLight } = useTheme();
  const [uploading, setUploading] = useState(false);

  // ── Inline name edit ────────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name ?? '');
  const nameInputRef = useRef<TextInput>(null);

  // Keep local value in sync when user data arrives after mount (e.g. slow auth)
  useEffect(() => {
    if (!editingName) setNameValue(user?.name ?? '');
  }, [user?.name]);

  const handleNameSave = async () => {
    const trimmed = nameValue.trim();
    setEditingName(false);
    if (!trimmed || trimmed === user?.name) {
      setNameValue(user?.name ?? '');
      return;
    }
    try {
      const updated = await updateMe({ name: trimmed });
      updateUser({ name: updated.name });
    } catch {
      Alert.alert('Fehler', 'Name konnte nicht gespeichert werden.');
      setNameValue(user?.name ?? '');
    }
  };

  const avatarUri = user?.avatar_url ? mediaUrl(user.avatar_url) : null;

  // ── Avatar upload ───────────────────────────────────────────────────────────

  const handleAvatarPress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Berechtigung erforderlich',
        'Bitte erlaube den Zugriff auf deine Fotos in den Einstellungen.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const updatedUser = await uploadAvatar(
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
      );
      updateUser({ avatar_url: updatedUser.avatar_url });
    } catch {
      Alert.alert('Fehler', 'Profilbild konnte nicht hochgeladen werden. Bitte versuche es erneut.');
    } finally {
      setUploading(false);
    }
  };

  // ── Logout ──────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert('Abmelden?', 'Du wirst abgemeldet und musst dich erneut anmelden.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: logout },
    ]);
  };

  // ── Feedback ────────────────────────────────────────────────────────────────

  const handleFeedback = () => {
    Linking.openURL('mailto:feedback@upkeep.app?subject=Upkeep%20Feedback').catch(() =>
      Alert.alert('Kein E-Mail-Programm', 'Bitte schreibe uns an feedback@upkeep.app'),
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Avatar + Name ───────────────────────────────────────── */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={handleAvatarPress}
          activeOpacity={0.8}
          disabled={uploading}
        >
          {/* Photo or initials */}
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: primaryLight }]}>
              <Text style={[styles.avatarLetter, { color: primary }]}>
                {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}

          {/* Upload loading overlay */}
          {uploading && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color={Colors.white} size="small" />
            </View>
          )}

          {/* Camera chip */}
          {!uploading && (
            <View style={[styles.cameraChip, { backgroundColor: primary }]}>
              <Camera size={13} color={Colors.white} strokeWidth={2.5} />
            </View>
          )}
        </TouchableOpacity>

        {/* Name — tap to edit inline */}
        {editingName ? (
          <TextInput
            ref={nameInputRef}
            style={[styles.userName, styles.nameInput, { borderBottomColor: primary }]}
            value={nameValue}
            onChangeText={setNameValue}
            onBlur={handleNameSave}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleNameSave}
            selectTextOnFocus
            maxLength={40}
            textAlign="center"
          />
        ) : (
          <TouchableOpacity
            style={styles.nameRow}
            onPress={() => setEditingName(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.userName}>{user?.name ?? '–'}</Text>
            <Pencil size={14} color={Colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        )}
        <Text style={styles.userEmail}>{user?.email ?? '–'}</Text>
      </View>

      {/* ── Personalisierung ────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>PERSONALISIERUNG</Text>
      <View style={styles.card}>
        <ProfileRow
          label="Akzentfarbe"
          right={
            <View style={styles.rowRight}>
              <View style={[styles.colorDot, { backgroundColor: primary }]} />
              <ChevronRight size={16} color={Colors.textMuted} strokeWidth={2} />
            </View>
          }
          onPress={() => navigation.navigate('ColorPicker')}
        />
      </View>

      {/* ── Account ─────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.card}>
        <ProfileRow label="E-Mail" value={user?.email ?? '–'} />
        <Divider />
        <ProfileRow
          label="Passwort ändern"
          onPress={() => navigation.navigate('ChangePassword')}
        />
      </View>

      {/* ── App ─────────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>APP</Text>
      <View style={styles.card}>
        <ProfileRow label="Version" value="1.0.0" />
        <Divider />
        <ProfileRow label="Feedback senden" onPress={handleFeedback} />
      </View>

      {/* ── Logout ──────────────────────────────────────────────── */}
      <SecondaryButton
        label="Abmelden"
        destructive
        onPress={handleLogout}
        style={styles.logoutBtn}
      />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const AVATAR_SIZE  = 96;
const CAMERA_CHIP  = 28;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 48 },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    marginBottom: Spacing.sm,
  },
  avatarImg: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 38,
    fontWeight: '700',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraChip: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: CAMERA_CHIP,
    height: CAMERA_CHIP,
    borderRadius: CAMERA_CHIP / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  userName: {
    ...Typography.title2,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameInput: {
    minWidth: 140,
    paddingVertical: 2,
    borderBottomWidth: 1.5,
    // borderBottomColor is applied inline (dynamic primary)
  },
  userEmail: {
    ...Typography.subhead,
    color: Colors.textSecondary,
  },

  // Section labels
  sectionLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    ...Shadow.card,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },

  // Row
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  rowLabel: { ...Typography.callout, color: Colors.text },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { ...Typography.subhead, color: Colors.textSecondary },

  // Color dot
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },

  logoutBtn: { marginTop: Spacing.lg },
});
