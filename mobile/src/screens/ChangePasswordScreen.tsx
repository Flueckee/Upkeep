import React, { useState } from 'react';
import {
  View, StyleSheet, Alert, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Eye, EyeOff } from 'lucide-react-native';
import { SettingsStackParamList } from '../navigation/types';
import { changePassword } from '../services/usersApi';
import { Input } from '../components/ui/Input';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Colors, Radius, Shadow, Spacing } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<SettingsStackParamList, 'ChangePassword'>;
};

// ── Eye toggle ────────────────────────────────────────────────────────────────

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {show
        ? <EyeOff size={20} color={Colors.textMuted} strokeWidth={2} />
        : <Eye    size={20} color={Colors.textMuted} strokeWidth={2} />
      }
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ChangePasswordScreen({ navigation }: Props) {
  const [currentPw, setCurrentPw]     = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [submitted, setSubmitted]     = useState(false);

  // ── Validation (only shown after first submit attempt) ──────────────────────
  const currentPwError = submitted && currentPw.length === 0
    ? 'Pflichtfeld'
    : undefined;

  const newPwError = submitted
    ? newPw.length === 0
      ? 'Pflichtfeld'
      : newPw.length < 8
        ? 'Mindestens 8 Zeichen'
        : undefined
    : undefined;

  const confirmError = submitted
    ? confirmPw.length === 0
      ? 'Pflichtfeld'
      : confirmPw !== newPw
        ? 'Passwörter stimmen nicht überein'
        : undefined
    : undefined;

  const isValid =
    currentPw.length > 0 &&
    newPw.length >= 8 &&
    confirmPw === newPw;

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSubmitted(true);
    if (!isValid) return;

    setSaving(true);
    try {
      await changePassword({ current_password: currentPw, new_password: newPw });
      Alert.alert(
        'Passwort geändert',
        'Dein Passwort wurde erfolgreich aktualisiert.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400 || status === 401) {
        Alert.alert('Falsches Passwort', 'Das aktuelle Passwort ist nicht korrekt.');
      } else {
        Alert.alert('Fehler', 'Passwort konnte nicht geändert werden. Bitte versuche es erneut.');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Input
            label="Aktuelles Passwort"
            value={currentPw}
            onChangeText={setCurrentPw}
            secureTextEntry={!showCurrent}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            error={currentPwError}
            rightElement={
              <EyeToggle show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
            }
          />

          <Input
            label="Neues Passwort"
            value={newPw}
            onChangeText={setNewPw}
            secureTextEntry={!showNew}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            error={newPwError}
            hint={!submitted ? 'Mindestens 8 Zeichen' : undefined}
            rightElement={
              <EyeToggle show={showNew} onToggle={() => setShowNew(v => !v)} />
            }
          />

          <Input
            label="Passwort bestätigen"
            value={confirmPw}
            onChangeText={setConfirmPw}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            error={confirmError}
            style={styles.lastInput}
            rightElement={
              <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
            }
          />
        </View>

        <PrimaryButton
          label="Passwort ändern"
          onPress={handleSave}
          loading={saving}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadow.card,
    marginBottom: Spacing.lg,
  },
  lastInput: { marginBottom: 0 },
});
