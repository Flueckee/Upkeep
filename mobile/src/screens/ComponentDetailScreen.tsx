import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Linking,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, interpolateColor,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Plus, ExternalLink, ChevronRight, Lock } from 'lucide-react-native';
import { BikeStackParamList } from '../navigation/types';
import { Component, MaintenanceLog } from '../types';
import { getComponents, deleteComponent } from '../services/componentsApi';
import { getLogs } from '../services/logsApi';
import { getBike } from '../services/bikesApi';
import { FloatingActionButton } from '../components/ui/FloatingActionButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import LoadingView from '../components/LoadingView';
import { Colors, Radius, Shadow, Spacing, Typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<BikeStackParamList, 'ComponentDetail'>;
  route: RouteProp<BikeStackParamList, 'ComponentDetail'>;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function ComponentDetailScreen({ navigation, route }: Props) {
  const { componentId, bikeId, highlight } = route.params;
  const { primaryColor: primary, primaryLight } = useTheme();
  const [component, setComponent] = useState<Component | null>(null);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [bikeTotalKm, setBikeTotalKm] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Highlight flash animation (when arriving from Fällig tab) ───────────────
  const highlightProgress = useSharedValue(0);

  useEffect(() => {
    if (highlight) {
      // Delay until after the push transition finishes (~400 ms)
      const t = setTimeout(() => {
        highlightProgress.value = withSequence(
          withTiming(1, { duration: 150 }),
          withTiming(0, { duration: 350 }),
        );
      }, 400);
      return () => clearTimeout(t);
    }
  }, []);

  const infoCardHighlight = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      highlightProgress.value,
      [0, 1],
      [Colors.surface, Colors.warningLight],
    ),
  }));

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [comps, logList, bike] = await Promise.all([
        getComponents(bikeId),
        getLogs(componentId),
        getBike(bikeId),
      ]);
      const comp = comps.find(c => c.id === componentId);
      if (!comp) throw new Error('Component not found');
      setComponent(comp);
      setLogs(logList);
      setBikeTotalKm(bike.total_km);
      navigation.setOptions({ title: comp.name });
    } catch {
      setError('Konnte Komponente nicht laden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [componentId, bikeId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDeleteComponent = () => {
    Alert.alert(
      'Komponente löschen?',
      'Die Komponente und alle Wartungseinträge werden endgültig gelöscht.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen', style: 'destructive', onPress: async () => {
            try {
              await deleteComponent(componentId);
              navigation.goBack();
            } catch {
              Alert.alert('Fehler', 'Löschen fehlgeschlagen.');
            }
          }
        },
      ],
    );
  };

  if (loading) return <LoadingView />;
  if (error || !component) return <LoadingView error={error ?? 'Nicht gefunden.'} />;

  const interval = component.service_interval;

  return (
    <View style={styles.root}>
      <FlatList
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={primary} />
        }
        ListHeaderComponent={
          <>
            {/* Component info card — flashes warningLight when opened from Fällig tab */}
            <Animated.View style={[styles.infoCard, infoCardHighlight]}>
              <View style={styles.infoHeader}>
                <Text style={styles.compName}>{component.name}</Text>
                <TouchableOpacity
                  style={[styles.editChip, { backgroundColor: primaryLight }]}
                  onPress={() => navigation.navigate('EditComponent', { componentId, bikeId })}
                >
                  <Text style={[styles.editChipText, { color: primary }]}>Bearbeiten</Text>
                </TouchableOpacity>
              </View>

              {component.installed_at && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Eingebaut</Text>
                  <Text style={styles.metaValue}>
                    {formatDate(component.installed_at)}
                    {component.installed_km != null
                      ? ` · ${component.installed_km.toLocaleString('de-DE')} km`
                      : ''}
                  </Text>
                </View>
              )}

              {component.notes ? (
                <Text style={styles.notes}>{component.notes}</Text>
              ) : null}

              {component.purchase_url ? (
                <TouchableOpacity
                  style={styles.purchaseLink}
                  onPress={() => Linking.openURL(component.purchase_url!)}
                >
                  <ExternalLink size={14} color={primary} strokeWidth={2} />
                  <Text style={[styles.purchaseLinkText, { color: primary }]}>Kauflink öffnen</Text>
                </TouchableOpacity>
              ) : null}
            </Animated.View>

            {/* Service interval card */}
            <View style={styles.intervalCard}>
              <Text style={styles.cardSectionLabel}>WARTUNGSINTERVALL</Text>
              {interval ? (
                <View style={styles.intervalContent}>
                  <View style={styles.chipsRow}>
                    {interval.interval_type !== 'distance' && interval.interval_days && (
                      <View style={[styles.chip, { backgroundColor: primaryLight }]}>
                        <Text style={[styles.chipVal, { color: primary }]}>{interval.interval_days}</Text>
                        <Text style={[styles.chipUnit, { color: primary }]}>Tage</Text>
                      </View>
                    )}
                    {interval.interval_type !== 'time' && interval.interval_km && (
                      <View style={[styles.chip, { backgroundColor: primaryLight }]}>
                        <Text style={[styles.chipVal, { color: primary }]}>{interval.interval_km.toLocaleString('de-DE')}</Text>
                        <Text style={[styles.chipUnit, { color: primary }]}>km</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.reminderText}>
                    Erinnerung {interval.reminder_days_before} Tage vorher
                  </Text>
                </View>
              ) : (
                <Text style={styles.noInterval}>Kein Intervall konfiguriert</Text>
              )}
            </View>

            {/* Delete */}
            <SecondaryButton
              label="Komponente löschen"
              onPress={handleDeleteComponent}
              destructive
              style={styles.deleteBtn}
            />

            {/* Logs section header */}
            <Text style={styles.sectionTitle}>
              WARTUNGSPROTOKOLL{logs.length > 0 ? ` (${logs.length})` : ''}
            </Text>
          </>
        }
        data={logs}
        keyExtractor={l => l.id}
        ListEmptyComponent={
          <View style={styles.emptyLogs}>
            <Text style={styles.emptyLogsText}>Noch keine Einträge</Text>
            <Text style={styles.emptyLogsSub}>Tippe auf + um den ersten Wartungseintrag hinzuzufügen.</Text>
          </View>
        }
        renderItem={({ item: log }) => (
          <TouchableOpacity
            style={styles.logCard}
            onPress={() => navigation.navigate('LogDetail', { logId: log.id })}
          >
            <View style={styles.logRow}>
              <View style={styles.logLeft}>
                <Text style={styles.logDate}>{formatDate(log.performed_at)}</Text>
                <Text style={styles.logKm}>{log.odometer_km.toLocaleString('de-DE')} km</Text>
              </View>
              <View style={styles.logRight}>
                {log.cost != null && (
                  <Text style={styles.logCost}>
                    {log.cost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </Text>
                )}
                <ChevronRight size={16} color={Colors.textMuted} strokeWidth={2} />
              </View>
            </View>
            <Text style={styles.logDesc} numberOfLines={2}>{log.description}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.content}
      />

      <FloatingActionButton
        onPress={() => navigation.navigate('AddLog', { componentId, bikeTotalKm })}
        icon={<Plus size={26} color={Colors.white} strokeWidth={2.5} />}
        style={styles.fab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 100 },

  // Info card
  infoCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compName: { ...Typography.title2, color: Colors.text, flex: 1 },
  editChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  editChipText: { ...Typography.caption, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  metaLabel: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600' },
  metaValue: { ...Typography.caption, color: Colors.textSecondary },
  notes: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  purchaseLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingTop: 4,
  },
  purchaseLinkText: { ...Typography.subhead, fontWeight: '500' },

  // Interval card
  intervalCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  cardSectionLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: Spacing.md,
  },
  intervalContent: { gap: Spacing.sm },
  chipsRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  chipVal: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  chipUnit: { ...Typography.caption, fontWeight: '600' },
  reminderText: { ...Typography.caption, color: Colors.textMuted },
  noInterval: { ...Typography.subhead, color: Colors.textMuted },

  deleteBtn: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },

  // Section
  sectionTitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },

  // Log cards
  logCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 6,
    ...Shadow.card,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logLeft: { gap: 2 },
  logDate: { ...Typography.callout, color: Colors.text, fontWeight: '600' },
  logKm: { ...Typography.caption, color: Colors.textMuted },
  logRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logCost: { ...Typography.subhead, color: Colors.success, fontWeight: '600' },
  logDesc: { ...Typography.subhead, color: Colors.textSecondary, lineHeight: 20 },

  emptyLogs: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyLogsText: { ...Typography.callout, color: Colors.textSecondary },
  emptyLogsSub: {
    ...Typography.subhead,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
  },
});
