import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { login as loginApi } from '../services/authApi';
import { Input } from '../components/ui/Input';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Colors, Spacing, Typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { primaryColor: primary } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Bitte alle Felder ausfüllen.');
      return;
    }
    setLoading(true);
    try {
      const { access_token } = await loginApi({ email: email.trim(), password });
      await login(access_token);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
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
          <Text style={styles.logo}>🚴</Text>
          <Text style={styles.appName}>Upkeep</Text>
          <Text style={styles.tagline}>Dein Fahrrad-Wartungsprotokoll</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            label="Passwort"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            error={error ?? undefined}
          />

          <PrimaryButton
            label="Anmelden"
            onPress={handleLogin}
            loading={loading}
            style={styles.btn}
          />
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.switchLink}>
          <Text style={styles.switchText}>
            Noch kein Konto?{' '}
            <Text style={[styles.switchAccent, { color: primary }]}>Jetzt registrieren</Text>
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
  logo: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  appName: {
    ...Typography.display,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  tagline: {
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
