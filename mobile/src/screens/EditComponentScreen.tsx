import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { BikeStackParamList } from '../navigation/types';
import { Component, IntervalType } from '../types';
import { getComponents, updateComponent } from '../services/componentsApi';
import { createInterval, updateInterval, deleteInterval } from '../services/intervalsApi';
import { Input } from '../components/ui/Input';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import LoadingView from '../components/LoadingView';
import { Colors, Radius, Shadow, Spacing, Typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<BikeStackParamList, 'EditComponent'>;
  route: RouteProp<BikeStackParamList, 'EditComponent'>;
};

const INTERVAL_TYPES: { value: IntervalType; label: string }[] = [
  { value: 'time',     label: 'Zeit' },
  { value: 'distance', label: 'Distanz' },
  { value: 'both',     label: 'Beides' },
];

export default function EditComponentScreen({ navigation, route }: Props) {
  const { componentId, bikeId } = route.params;
  const { primaryColor: primary, primaryLight } = useTheme();
  const [component, setComponent] = useState<Component | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Component fields
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseUrl, setPurchaseUrl] = useState('');

  // Interval fields
  const [hasInterval, setHasInterval] = useState(false);
  const [intervalType, setIntervalType] = useState<IntervalType>('distance');
  const [intervalDays, setIntervalDays] = useState('');
  const [intervalKm, setIntervalKm] = useState('');
  const [reminderDays, setReminderDays] = useState('14');

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const comps = await getComponents(bikeId);
        const comp = comps.find(c => c.id === componentId);
        if (!comp) return;
        setComponent(comp);
        setName(comp.name);
        setNotes(comp.notes ?? '');
        setPurchaseUrl(comp.purchase_url ?? '');
        if (comp.service_interval) {
          setHasInterval(true);
          setIntervalType(comp.service_interval.interval_type);
          setIntervalDays(String(comp.service_interval.interval_days ?? ''));
          setIntervalKm(String(comp.service_interval.interval_km ?? ''));
          setReminderDays(String(comp.service_interval.reminder_days_before));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [componentId, bikeId]));

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Fehler', 'Name darf nicht leer sein.');
      return;
    }
    setSaving(true);
    try {
      await updateComponent(componentId, {
        name: name.trim(),
        notes: notes.trim() || undefined,
        purchase_url: purchaseUrl.trim() || undefined,
      });

      const existingInterval = component?.service_interval;
      if (hasInterval) {
        const payload = {
          interval_type: intervalType,
          interval_days: intervalType !== 'distance' && intervalDays
            ? parseInt(intervalDays, 10) : undefined,
          interval_km: intervalType !== 'time' && intervalKm
            ? parseInt(intervalKm, 10) : undefined,
          reminder_days_before: parseInt(reminderDays, 10) || 14,
        };
        if (existingInterval) {
          await updateInterval(existingInterval.id, payload);
        } else {
          await createInterval(componentId, payload);
        }
      } else if (existingInterval) {
        await deleteInterval(existingInterval.id);
      }

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Fehler', e.response?.data?.detail ?? 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView />;

  const showDays = intervalType === 'time' || intervalType === 'both';
  const showKm = intervalType === 'distance' || intervalType === 'both';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Component details */}
      <Text style={styles.sectionLabel}>KOMPONENTE</Text>
      <View style={styles.fieldsCard}>
        <Input label="Name *" value={name} onChangeText={setName} />
        <Input
          label="Notizen"
          value={notes}
          onChangeText={setNotes}
          multiline
          hint="Optionale Hinweise zur Komponente"
        />
        <Input
          label="Kauflink (optional)"
          value={purchaseUrl}
          onChangeText={setPurchaseUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          hint="https://..."
        />
      </View>

      {/* Interval toggle */}
      <Text style={styles.sectionLabel}>WARTUNGSINTERVALL</Text>
      <View style={styles.toggleCard}>
        <Text style={styles.toggleLabel}>Intervall aktivieren</Text>
        <Switch
          value={hasInterval}
          onValueChange={setHasInterval}
          trackColor={{ false: Colors.border, true: primary }}
          thumbColor={Colors.white}
          ios_backgroundColor={Colors.border}
        />
      </View>

      {hasInterval && (
        <>
          {/* Interval type picker */}
          <View style={styles.typeRow}>
            {INTERVAL_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.typeBtn,
                  intervalType === t.value && { borderColor: primary, backgroundColor: primaryLight },
                ]}
                onPress={() => setIntervalType(t.value)}
              >
                <Text style={[
                  styles.typeBtnText,
                  intervalType === t.value && { color: primary, fontWeight: '700' },
                ]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Interval values */}
          <View style={styles.fieldsCard}>
            {showDays && (
              <Input
                label="Intervall (Tage)"
                value={intervalDays}
                onChangeText={setIntervalDays}
                keyboardType="numeric"
                hint="z.B. 365"
              />
            )}
            {showKm && (
              <Input
                label="Intervall (km)"
                value={intervalKm}
                onChangeText={setIntervalKm}
                keyboardType="numeric"
                hint="z.B. 2500"
              />
            )}
            <Input
              label="Erinnerung (Tage vorher)"
              value={reminderDays}
              onChangeText={setReminderDays}
              keyboardType="numeric"
              hint="Standardmäßig 14 Tage"
            />
          </View>
        </>
      )}

      <PrimaryButton
        label="Speichern"
        onPress={handleSave}
        loading={saving}
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

  fieldsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.card,
  },

  toggleCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadow.card,
  },
  toggleLabel: { ...Typography.callout, color: Colors.text },

  typeRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  typeBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnText: { ...Typography.subhead, color: Colors.textSecondary, fontWeight: '500' },

  btn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
});
