import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { register as registerApi } from '../services/authApi';
import { Input } from '../components/ui/Input';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Colors, Spacing, Typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

export default function RegisterScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { primaryColor: primary } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError('Bitte alle Felder ausfüllen.');
      return;
    }
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen haben.');
      return;
    }
    setLoading(true);
    try {
      const { access_token } = await registerApi({ name: name.trim(), email: email.trim(), password });
      await login(access_token);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Registrierung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding */}
        <View style={styles.brand}>
          <Text style={styles.title}>Konto erstellen</Text>
          <Text style={styles.sub}>Starte dein persönliches Wartungsprotokoll</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
          />
          <Input
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            label="Passwort (min. 8 Zeichen)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            error={error ?? undefined}
          />

          <PrimaryButton
            label="Konto erstellen"
            onPress={handleRegister}
            loading={loading}
            style={styles.btn}
          />
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.switchLink}>
          <Text style={styles.switchText}>
            Bereits ein Konto?{' '}
            <Text style={[styles.switchAccent, { color: primary }]}>Anmelden</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.title1,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  sub: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  btn: {
    marginTop: Spacing.sm,
  },
  switchLink: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  switchText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  switchAccent: {
    fontWeight: '600',
  },
});
