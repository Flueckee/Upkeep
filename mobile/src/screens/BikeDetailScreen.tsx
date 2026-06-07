import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Modal, TextInput, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Camera, FileText, Trash2, Wrench, Disc, Settings, Circle, Layers, Package, Plus } from 'lucide-react-native';
import { BikeStackParamList } from '../navigation/types';
import { Bike, Component, ComponentDue } from '../types';
import { getBike, updateOdometer, deleteBike, getDueComponents, uploadBikePhoto, mediaUrl } from '../services/bikesApi';
import { getComponents } from '../services/componentsApi';
import { ComponentRow } from '../components/ui/ComponentRow';
import { FloatingActionButton } from '../components/ui/FloatingActionButton';
import { BadgeVariant } from '../components/ui/StatusBadge';
import LoadingView from '../components/LoadingView';
import { Colors, Radius, Shadow, Spacing, Typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<BikeStackParamList, 'BikeDetail'>;
  route: RouteProp<BikeStackParamList, 'BikeDetail'>;
};

const CATEGORY_LABEL: Record<string, string> = {
  brakes: 'Bremsen',
  drivetrain: 'Antrieb',
  wheels: 'Räder',
  suspension: 'Federung',
  other: 'Sonstiges',
};

function getCategoryIcon(cat: string, color: string) {
  const size = 20;
  switch (cat) {
    case 'brakes':     return <Disc size={size} color={color} strokeWidth={2} />;
    case 'drivetrain': return <Settings size={size} color={color} strokeWidth={2} />;
    case 'wheels':     return <Circle size={size} color={color} strokeWidth={2} />;
    case 'suspension': return <Layers size={size} color={color} strokeWidth={2} />;
    default:           return <Wrench size={size} color={color} strokeWidth={2} />;
  }
}

function getDueBadge(due: ComponentDue | undefined, hasInterval: boolean): { label: string; variant: BadgeVariant } | null {
  if (!due) {
    if (hasInterval) return { label: 'OK', variant: 'ok' };
    return null;
  }
  switch (due.status) {
    case 'overdue':              return { label: 'Überfällig',  variant: 'overdue' };
    case 'due_soon':             return { label: 'Bald fällig', variant: 'dueSoon' };
    case 'needs_first_service':  return { label: 'Erstservice', variant: 'info'    };
    default: return null;
  }
}

export default function BikeDetailScreen({ navigation, route }: Props) {
  const { bikeId } = route.params;
  const { primaryColor: primary, primaryLight } = useTheme();
  const [bike, setBike] = useState<Bike | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [dueMap, setDueMap] = useState<Record<string, ComponentDue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [kmModal, setKmModal] = useState(false);
  const [newKm, setNewKm] = useState('');
  const [kmSaving, setKmSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [b, comps, due] = await Promise.all([
        getBike(bikeId),
        getComponents(bikeId),
        getDueComponents(bikeId),
      ]);
      setBike(b);
      setComponents(comps);
      navigation.setOptions({ title: b.name });
      const map: Record<string, ComponentDue> = {};
      due.forEach(d => { map[d.id] = d; });
      setDueMap(map);
    } catch {
      setError('Konnte Bike nicht laden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bikeId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleOdometerSave = async () => {
    const km = parseFloat(newKm);
    if (isNaN(km) || km < 0) { Alert.alert('Fehler', 'Ungültiger km-Stand.'); return; }
    setKmSaving(true);
    try {
      const updated = await updateOdometer(bikeId, km);
      setBike(updated);
      setKmModal(false);
    } finally {
      setKmSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Bike löschen?', 'Alle Komponenten und Logs werden gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive', onPress: async () => {
          await deleteBike(bikeId);
          navigation.goBack();
        }
      },
    ]);
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Berechtigung erforderlich', 'Bitte erlaube den Zugriff auf deine Fotos in den Einstellungen.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      const updated = await uploadBikePhoto(bikeId, asset.uri, asset.mimeType ?? 'image/jpeg');
      setBike(updated);
    } catch {
      Alert.alert('Fehler', 'Foto konnte nicht hochgeladen werden.');
    }
  };

  if (loading) return <LoadingView />;
  if (error || !bike) return <LoadingView error={error ?? 'Bike nicht gefunden.'} />;

  const photoUri = mediaUrl(bike.photo_url);

  return (
    <View style={styles.root}>
      <FlatList
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={primary} />
        }
        ListHeaderComponent={
          <>
            {/* Hero cover photo */}
            <TouchableOpacity style={styles.hero} onPress={handlePickPhoto} activeOpacity={0.9}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <View style={styles.heroPlaceholder}>
                  <Text style={styles.heroEmoji}>🚴</Text>
                  <Text style={styles.heroPlaceholderLabel}>Titelfoto hinzufügen</Text>
                </View>
              )}
              {/* Camera overlay */}
              <View style={styles.cameraChip}>
                <Camera size={14} color={Colors.white} strokeWidth={2} />
                <Text style={styles.cameraLabel}>Foto ändern</Text>
              </View>
            </TouchableOpacity>

            {/* Bike header */}
            <View style={styles.headerCard}>
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <Text style={styles.bikeName}>{bike.name}</Text>
                  {(bike.brand || bike.model) && (
                    <Text style={styles.bikeMeta}>
                      {[bike.brand, bike.model, bike.year].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('Export', { bikeId, bikeName: bike.name })}
                  >
                    <FileText size={20} color={primary} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
                    <Trash2 size={20} color={Colors.danger} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Odometer */}
              <TouchableOpacity
                style={[styles.odoCard, { backgroundColor: primaryLight }]}
                onPress={() => { setNewKm(String(bike.total_km)); setKmModal(true); }}
              >
                <Text style={[styles.odoLabel, { color: primary }]}>KM-STAND</Text>
                <View style={styles.odoRow}>
                  <Text style={[styles.odoValue, { color: primary }]}>
                    {bike.total_km.toLocaleString('de-DE')}
                  </Text>
                  <Text style={[styles.odoUnit, { color: primary }]}> km</Text>
                  <Text style={[styles.odoEdit, { color: primary }]}>Aktualisieren →</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Section header */}
            <Text style={styles.sectionTitle}>
              KOMPONENTEN {components.length > 0 ? `(${components.length})` : ''}
            </Text>
          </>
        }
        data={components}
        keyExtractor={c => c.id}
        renderItem={({ item: comp }) => {
          const due = dueMap[comp.id];
          const badge = getDueBadge(due, !!comp.service_interval);
          return (
            <ComponentRow
              name={comp.name}
              subtitle={CATEGORY_LABEL[comp.category] ?? comp.category}
              badgeLabel={badge?.label}
              badgeVariant={badge?.variant}
              icon={getCategoryIcon(comp.category, primary)}
              onPress={() => navigation.navigate('ComponentDetail', { componentId: comp.id, bikeId })}
              style={styles.compRow}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyComps}>
            <Text style={styles.emptyCompsText}>Noch keine Komponenten.</Text>
            <Text style={styles.emptyCompsSub}>
              Tippe auf + um eine Komponente hinzuzufügen.
            </Text>
          </View>
        }
        contentContainerStyle={styles.content}
      />

      {/* Odometer modal */}
      <Modal visible={kmModal} transparent animationType="fade" onRequestClose={() => setKmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>km-Stand aktualisieren</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="decimal-pad"
              value={newKm}
              onChangeText={setNewKm}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setKmModal(false)}
              >
                <Text style={styles.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: primary }]}
                onPress={handleOdometerSave}
                disabled={kmSaving}
              >
                {kmSaving
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.modalSaveText}>Speichern</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FloatingActionButton
        onPress={() => navigation.navigate('AddBike')}
        icon={<Plus size={26} color={Colors.white} strokeWidth={2.5} />}
        style={styles.fab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 100 },

  // Hero
  hero: {
    height: 220,
    backgroundColor: Colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroPlaceholder: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroEmoji: { fontSize: 56, opacity: 0.4 },
  heroPlaceholderLabel: {
    ...Typography.subhead,
    color: Colors.textMuted,
  },
  cameraChip: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cameraLabel: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
  },

  // Header card
  headerCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: { flex: 1, marginRight: Spacing.md },
  bikeName: { ...Typography.title2, color: Colors.text },
  bikeMeta: { ...Typography.subhead, color: Colors.textSecondary, marginTop: 4 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Odometer
  odoCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  odoLabel: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  odoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  odoValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  odoUnit: {
    ...Typography.title3,
    opacity: 0.7,
  },
  odoEdit: {
    ...Typography.caption,
    marginLeft: 'auto',
    fontWeight: '600',
  },

  // Section
  sectionTitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  compRow: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyComps: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyCompsText: { ...Typography.callout, color: Colors.textSecondary },
  emptyCompsSub: { ...Typography.subhead, color: Colors.textMuted, textAlign: 'center' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadow.modal,
  },
  modalTitle: { ...Typography.title3, color: Colors.text },
  modalInput: {
    backgroundColor: Colors.surfaceRaised,
    color: Colors.text,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  modalBtns: { flexDirection: 'row', gap: Spacing.sm },
  modalCancel: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { ...Typography.callout, color: Colors.textSecondary, fontWeight: '600' },
  modalSave: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: { ...Typography.callout, color: Colors.white, fontWeight: '700' },

  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
  },
});
