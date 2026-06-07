import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TouchableOpacity, ActivityIndicator, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Check, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { getBikes } from '../services/bikesApi';
import {
  getStravaStatus, getStravaGear, saveStravaMappings,
  disconnectStrava, connectStrava, MappingItem,
} from '../services/stravaApi';
import { Bike, StravaGearItem, StravaStatus } from '../types';
import { Colors, Radius, Shadow, Spacing, Typography } from '../theme';

// A gear's choice: a bike id, or one of these sentinels.
const IGNORE = '__ignore__';
const DEFAULT = '__default__';
type Choice = string; // bike id | IGNORE | DEFAULT

export default function StravaSettingsScreen() {
  const { primaryColor: primary } = useTheme();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [gear, setGear] = useState<StravaGearItem[]>([]);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [defaultBike, setDefaultBike] = useState<string | null>(null);

  // Picker modal target: a gear_id, or 'default' for the default-bike picker.
  const [picker, setPicker] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, bk] = await Promise.all([getStravaStatus(), getBikes()]);
      setStatus(st);
      setBikes(bk);
      setDefaultBike(st.default_bike_id);
      if (st.connected) {
        const g = await getStravaGear();
        setGear(g);
        const initial: Record<string, Choice> = {};
        g.forEach((item) => {
          initial[item.gear_id] = item.ignored ? IGNORE : item.bike_id ?? DEFAULT;
        });
        setChoices(initial);
      }
    } catch {
      Alert.alert('Fehler', 'Strava-Status konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleConnect = async () => {
    setBusy(true);
    try {
      await connectStrava();
      // Backend imported recent rides in the background; reload after returning.
      await load();
    } catch {
      Alert.alert('Fehler', 'Verbindung mit Strava fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert('Strava trennen?', 'Bereits importierte Kilometer bleiben erhalten.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Trennen',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await disconnectStrava();
            await load();
          } catch {
            Alert.alert('Fehler', 'Trennen fehlgeschlagen.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const mappings: MappingItem[] = gear
        .map((item): MappingItem | null => {
          const c = choices[item.gear_id] ?? DEFAULT;
          if (c === DEFAULT) return null;
          if (c === IGNORE) return { gear_id: item.gear_id, ignore: true };
          return { gear_id: item.gear_id, bike_id: c };
        })
        .filter((m): m is MappingItem => m !== null);
      const st = await saveStravaMappings(mappings, defaultBike);
      setStatus(st);
      Alert.alert('Gespeichert', 'Zuordnung wurde gespeichert.');
    } catch {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const bikeName = (id: string | null): string =>
    bikes.find((b) => b.id === id)?.name ?? '–';

  const choiceLabel = (c: Choice): string => {
    if (c === IGNORE) return 'Ignorieren';
    if (c === DEFAULT) return 'Standard-Fahrrad';
    return bikeName(c);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  if (!status?.connected) {
    return (
      <View style={styles.root}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Mit Strava verbinden</Text>
          <Text style={styles.introText}>
            Verbinde dein Strava-Konto, damit gefahrene Kilometer automatisch auf deine
            Fahrräder übertragen werden.
          </Text>
        </View>
        <SecondaryButton
          label={busy ? 'Verbinde …' : 'Mit Strava verbinden'}
          onPress={handleConnect}
          disabled={busy}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={[styles.statusPill, { backgroundColor: primary }]}>
        <Check size={14} color={Colors.white} strokeWidth={3} />
        <Text style={styles.statusPillText}>Mit Strava verbunden</Text>
      </View>

      {/* Default bike */}
      <Text style={styles.sectionLabel}>STANDARD-FAHRRAD</Text>
      <Text style={styles.hint}>
        Kilometer ohne zugeordnetes Strava-Fahrrad werden hierauf gebucht.
      </Text>
      <View style={styles.card}>
        <PickerRow
          label="Standard-Fahrrad"
          value={defaultBike ? bikeName(defaultBike) : 'Keins'}
          onPress={() => setPicker('default')}
        />
      </View>

      {/* Gear mapping */}
      <Text style={styles.sectionLabel}>FAHRRAD-ZUORDNUNG</Text>
      {gear.length === 0 ? (
        <Text style={styles.hint}>Keine Fahrräder in Strava gefunden.</Text>
      ) : (
        <View style={styles.card}>
          {gear.map((item, i) => (
            <View key={item.gear_id}>
              {i > 0 && <View style={styles.divider} />}
              <PickerRow
                label={item.name}
                value={choiceLabel(choices[item.gear_id] ?? DEFAULT)}
                onPress={() => setPicker(item.gear_id)}
              />
            </View>
          ))}
        </View>
      )}

      <SecondaryButton
        label={busy ? 'Speichere …' : 'Speichern'}
        onPress={handleSave}
        disabled={busy}
        style={styles.saveBtn}
      />
      <SecondaryButton
        label="Verbindung trennen"
        destructive
        onPress={handleDisconnect}
        disabled={busy}
        style={styles.disconnectBtn}
      />

      {/* Picker modal */}
      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPicker(null)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {picker === 'default' ? 'Standard-Fahrrad wählen' : 'Fahrrad zuordnen'}
            </Text>
            <ScrollView style={styles.modalList}>
              {/* Default bike picker: bikes + "Keins". Gear picker: bikes + Standard + Ignorieren. */}
              {picker === 'default' && (
                <OptionRow
                  label="Keins"
                  selected={defaultBike === null}
                  onPress={() => { setDefaultBike(null); setPicker(null); }}
                  accent={primary}
                />
              )}
              {picker !== 'default' && (
                <>
                  <OptionRow
                    label="Standard-Fahrrad"
                    selected={(choices[picker!] ?? DEFAULT) === DEFAULT}
                    onPress={() => { setChoices((p) => ({ ...p, [picker!]: DEFAULT })); setPicker(null); }}
                    accent={primary}
                  />
                  <OptionRow
                    label="Ignorieren"
                    selected={choices[picker!] === IGNORE}
                    onPress={() => { setChoices((p) => ({ ...p, [picker!]: IGNORE })); setPicker(null); }}
                    accent={primary}
                  />
                </>
              )}
              {bikes.map((b) => {
                const selected = picker === 'default'
                  ? defaultBike === b.id
                  : choices[picker!] === b.id;
                return (
                  <OptionRow
                    key={b.id}
                    label={b.name}
                    selected={selected}
                    accent={primary}
                    onPress={() => {
                      if (picker === 'default') setDefaultBike(b.id);
                      else setChoices((p) => ({ ...p, [picker!]: b.id }));
                      setPicker(null);
                    }}
                  />
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function PickerRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
        <ChevronRight size={16} color={Colors.textMuted} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

function OptionRow({
  label, selected, onPress, accent,
}: { label: string; selected: boolean; onPress: () => void; accent: string }) {
  return (
    <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.optionLabel, selected && { color: accent, fontWeight: '700' }]}>{label}</Text>
      {selected && <Check size={18} color={accent} strokeWidth={2.5} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  content: { paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  intro: { paddingVertical: Spacing.xl, gap: Spacing.sm },
  introTitle: { ...Typography.title2, color: Colors.text },
  introText: { ...Typography.subhead, color: Colors.textSecondary, lineHeight: 22 },

  statusPill: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
  },
  statusPillText: { ...Typography.subhead, color: Colors.white, fontWeight: '700' },

  sectionLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  hint: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.sm },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    ...Shadow.card,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.md,
  },
  rowLabel: { ...Typography.callout, color: Colors.text, flexShrink: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  rowValue: { ...Typography.subhead, color: Colors.textSecondary, maxWidth: 160 },

  saveBtn: { marginTop: Spacing.sm },
  disconnectBtn: { marginTop: Spacing.md },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '70%',
  },
  modalTitle: {
    ...Typography.title3,
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  modalList: { paddingHorizontal: Spacing.lg },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionLabel: { ...Typography.callout, color: Colors.text },
});
