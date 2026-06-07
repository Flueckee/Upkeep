import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, Disc } from 'lucide-react-native';
import { SettingsStackParamList } from '../navigation/types';
import { ThemeContext, useTheme, computePrimaryLight } from '../context/ThemeContext';
import { updateMe } from '../services/usersApi';
import { ComponentRow } from '../components/ui/ComponentRow';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Colors, Radius, Shadow, Spacing, Typography } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<SettingsStackParamList, 'ColorPicker'>;
};

export const PRESET_COLORS: { hex: string; name: string }[] = [
  { hex: '#5C6EFF', name: 'Indigo'    },
  { hex: '#FF6B6B', name: 'Coral'     },
  { hex: '#FF9F43', name: 'Orange'    },
  { hex: '#FFC312', name: 'Gelb'      },
  { hex: '#2ECC71', name: 'Grün'      },
  { hex: '#00B894', name: 'Minze'     },
  { hex: '#00CEC9', name: 'Türkis'    },
  { hex: '#A29BFE', name: 'Lavendel'  },
  { hex: '#E84393', name: 'Pink'      },
  { hex: '#636E72', name: 'Stahl'     },
];

export default function ColorPickerScreen({ navigation }: Props) {
  const { primaryColor, setPrimaryColor } = useTheme();
  const [selected, setSelected] = useState(primaryColor);
  const [saving, setSaving] = useState(false);

  const previewLight = computePrimaryLight(selected);

  const handleApply = async () => {
    setSaving(true);
    // Apply locally immediately
    setPrimaryColor(selected);
    try {
      await updateMe({ primary_color: selected });
    } catch {
      // Non-fatal: local color still applied, backend will sync on next login
      Alert.alert(
        'Hinweis',
        'Farbe lokal gespeichert. Synchronisierung mit dem Server fehlgeschlagen.',
        [{ text: 'OK' }],
      );
    } finally {
      setSaving(false);
      navigation.goBack();
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Live Preview ───────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>VORSCHAU</Text>
      <View style={styles.previewCard}>
        {/*
          Wrap preview components in a local ThemeContext.Provider
          so they render with the selected colour without touching
          the global theme until "Übernehmen" is pressed.
        */}
        <ThemeContext.Provider
          value={{
            primaryColor: selected,
            primaryLight: previewLight,
            setPrimaryColor: () => {},
          }}
        >
          <ComponentRow
            name="Bremsbeläge"
            subtitle="Bremsen · 340 km seit Wartung"
            badgeLabel="Erstservice"
            badgeVariant="info"
            icon={<Disc size={20} color={selected} strokeWidth={2} />}
            onPress={() => {}}
          />
          <PrimaryButton
            label="Wartung eintragen"
            onPress={() => {}}
            style={styles.previewBtn}
          />
        </ThemeContext.Provider>
      </View>

      {/* ── Color Grid ─────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>FARBE WÄHLEN</Text>
      <View style={styles.grid}>
        {PRESET_COLORS.map((c) => {
          const isSelected = c.hex === selected;
          return (
            <TouchableOpacity
              key={c.hex}
              style={styles.swatchWrap}
              onPress={() => setSelected(c.hex)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: c.hex },
                  isSelected && styles.swatchSelected,
                ]}
              >
                {isSelected && (
                  <Check size={22} color={Colors.white} strokeWidth={3} />
                )}
              </View>
              <Text style={[styles.swatchName, isSelected && { color: selected, fontWeight: '700' }]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Apply Button ───────────────────────────────────────── */}
      <PrimaryButton
        label="Übernehmen"
        onPress={handleApply}
        loading={saving}
        style={styles.applyBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 48,
  },

  sectionLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },

  // Preview
  previewCard: {
    marginHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  previewBtn: {
    marginTop: Spacing.xs,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  swatchWrap: {
    width: '18%',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  swatchSelected: {
    // Ring effect via shadow colour (cross-platform)
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  },
  swatchName: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Apply
  applyBtn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
});
