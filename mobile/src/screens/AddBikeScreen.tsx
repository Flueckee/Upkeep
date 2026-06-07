import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BikeStackParamList } from '../navigation/types';
import { createBike } from '../services/bikesApi';
import { BikeType } from '../types';
import { Input } from '../components/ui/Input';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Colors, Radius, Shadow, Spacing, Typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = { navigation: NativeStackNavigationProp<BikeStackParamList, 'AddBike'> };

const TYPES: { value: BikeType; label: string; emoji: string }[] = [
  { value: 'road',   label: 'Road',     emoji: '🚴' },
  { value: 'gravel', label: 'Gravel',   emoji: '🚵' },
  { value: 'mtb',    label: 'MTB',      emoji: '⛰' },
  { value: 'other',  label: 'Sonstige', emoji: '🚲' },
];

export default function AddBikeScreen({ navigation }: Props) {
  const { primaryColor: primary, primaryLight } = useTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<BikeType>('road');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [totalKm, setTotalKm] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) { setError('Bitte einen Namen eingeben.'); return; }
    setLoading(true);
    try {
      const bike = await createBike({
        name: name.trim(),
        type,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        year: year ? parseInt(year, 10) : undefined,
        total_km: parseFloat(totalKm) || 0,
      });
      navigation.replace('BikeDetail', { bikeId: bike.id });
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Speichern fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Type selector */}
      <Text style={styles.sectionLabel}>TYP</Text>
      <View style={styles.typeGrid}>
        {TYPES.map(t => (
          <TouchableOpacity
            key={t.value}
            style={[
              styles.typeBtn,
              type === t.value && { borderColor: primary, backgroundColor: primaryLight },
            ]}
            onPress={() => setType(t.value)}
          >
            <Text style={styles.typeEmoji}>{t.emoji}</Text>
            <Text style={[
              styles.typeBtnText,
              type === t.value && { color: primary, fontWeight: '700' },
            ]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main fields */}
      <Text style={styles.sectionLabel}>DETAILS</Text>
      <View style={styles.fieldsCard}>
        <Input
          label="Name *"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          error={error ?? undefined}
        />
        <Input
          label="Marke"
          value={brand}
          onChangeText={setBrand}
          autoCapitalize="words"
          hint="z.B. Canyon"
        />
        <Input
          label="Modell"
          value={model}
          onChangeText={setModel}
          autoCapitalize="words"
          hint="z.B. Ultimate CF SLX"
        />
      </View>

      <Text style={styles.sectionLabel}>WEITERE INFOS</Text>
      <View style={styles.fieldsCard}>
        <Input
          label="Baujahr"
          value={year}
          onChangeText={setYear}
          keyboardType="numeric"
          hint="z.B. 2023"
        />
        <Input
          label="Aktueller km-Stand"
          value={totalKm}
          onChangeText={setTotalKm}
          keyboardType="decimal-pad"
          hint="0 wenn neu"
        />
      </View>

      <PrimaryButton
        label="Bike speichern"
        onPress={handleSave}
        loading={loading}
        style={styles.btn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 48 },

  sectionLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },

  // Type grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  typeBtn: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 4,
  },
  typeEmoji: { fontSize: 22 },
  typeBtnText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // Fields
  fieldsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.card,
  },

  btn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
});
