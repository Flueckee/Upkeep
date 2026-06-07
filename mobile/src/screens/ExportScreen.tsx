import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, Platform, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Check, FileText } from 'lucide-react-native';
import { BikeStackParamList } from '../navigation/types';
import { Component } from '../types';
import { getComponents } from '../services/componentsApi';
import { pdfExportUrl, getToken } from '../services/exportApi';
import { LoadingView } from '../components/ui/LoadingView';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Colors, Radius, Shadow, Spacing, Typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<BikeStackParamList, 'Export'>;
  route: RouteProp<BikeStackParamList, 'Export'>;
};

const CATEGORY_LABELS: Record<string, string> = {
  brakes: 'Bremsen',
  drivetrain: 'Antrieb',
  wheels: 'Räder',
  suspension: 'Federung',
  other: 'Sonstige',
};

async function downloadWeb(url: string, token: string, filename: string): Promise<void> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Server antwortete mit ${response.status}${text ? ': ' + text : ''}`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

async function downloadNative(url: string, token: string, filename: string): Promise<void> {
  const FileSystem = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const dest = `${FileSystem.cacheDirectory}${filename}`;
  const result = await FileSystem.downloadAsync(url, dest, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (result.status !== 200) throw new Error('Download fehlgeschlagen.');
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(dest, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  } else {
    Alert.alert('Gespeichert', `PDF gespeichert unter:\n${dest}`);
  }
}

export default function ExportScreen({ navigation, route }: Props) {
  const { bikeId, bikeName } = route.params;
  const { primaryColor: primary, primaryLight } = useTheme();
  const [components, setComponents] = useState<Component[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const comps = await getComponents(bikeId);
        setComponents(comps);
        setSelected(new Set(comps.map(c => c.id)));
      } finally {
        setLoading(false);
      }
    })();
  }, [bikeId]));

  const toggleComponent = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(
      selected.size === components.length
        ? new Set()
        : new Set(components.map(c => c.id)),
    );
  };

  const handleExport = async () => {
    if (selected.size === 0) {
      Alert.alert('Hinweis', 'Bitte mindestens eine Komponente auswählen.');
      return;
    }
    setExporting(true);
    try {
      const token = await getToken();
      if (!token) { Alert.alert('Fehler', 'Nicht eingeloggt.'); return; }
      const allSelected = selected.size === components.length;
      const ids = allSelected ? undefined : [...selected];
      const url = pdfExportUrl(bikeId, ids);
      const safeName = bikeName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Upkeep_${safeName}.pdf`;
      if (Platform.OS === 'web') {
        await downloadWeb(url, token, filename);
      } else {
        await downloadNative(url, token, filename);
      }
    } catch (e: any) {
      Alert.alert('Fehler', e.message ?? 'Export fehlgeschlagen.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingView fullScreen message="Komponenten laden…" />;

  const allSelected = selected.size === components.length;

  return (
    <View style={styles.root}>
      {/* Generating overlay */}
      {exporting && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <FileText size={40} color={primary} strokeWidth={1.5} />
            <ActivityIndicator size="large" color={primary} />
            <Text style={styles.overlayTitle}>PDF wird erstellt…</Text>
            <Text style={styles.overlaySub}>Einen Moment bitte.</Text>
          </View>
        </View>
      )}

      <FlatList
        data={components}
        keyExtractor={c => c.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>
              {selected.size} von {components.length} ausgewählt
            </Text>
            <TouchableOpacity onPress={toggleAll}>
              <Text style={[styles.toggleAllText, { color: primary }]}>
                {allSelected ? 'Alle abwählen' : 'Alle auswählen'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: comp }) => {
          const isSelected = selected.has(comp.id);
          return (
            <TouchableOpacity
              style={[
                styles.row,
                isSelected && { borderColor: primary, backgroundColor: primaryLight },
              ]}
              onPress={() => toggleComponent(comp.id)}
            >
              <View style={[
                styles.checkbox,
                isSelected && { borderColor: primary, backgroundColor: primary },
              ]}>
                {isSelected && (
                  <Check size={13} color={Colors.white} strokeWidth={3} />
                )}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.compName}>{comp.name}</Text>
                <Text style={styles.compCat}>
                  {CATEGORY_LABELS[comp.category] ?? comp.category}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <PrimaryButton
          label="📄  PDF exportieren"
          onPress={handleExport}
          loading={exporting}
          disabled={selected.size === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Loading overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: 'rgba(248,247,244,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
    minWidth: 240,
    ...Shadow.modal,
  },
  overlayTitle: { ...Typography.title3, color: Colors.text },
  overlaySub: { ...Typography.subhead, color: Colors.textSecondary },

  // List
  list: { padding: Spacing.md, paddingBottom: 120 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  listHeaderText: { ...Typography.subhead, color: Colors.textSecondary },
  toggleAllText: { ...Typography.subhead, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadow.card,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  rowText: { flex: 1 },
  compName: { ...Typography.callout, color: Colors.text, fontWeight: '600' },
  compCat: { ...Typography.caption, color: Colors.textMuted },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
