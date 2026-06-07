import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { X, Camera, Lock } from 'lucide-react-native';
import { BikeStackParamList } from '../navigation/types';
import { createLog } from '../services/logsApi';
import { uploadPhoto } from '../services/photosApi';
import { DatePicker } from '../components/ui/DatePicker';
import { Input } from '../components/ui/Input';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Colors, Radius, Shadow, Spacing, Typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<BikeStackParamList, 'AddLog'>;
  route: RouteProp<BikeStackParamList, 'AddLog'>;
};

interface PickedPhoto {
  uri: string;
  mimeType: string;
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export default function AddLogScreen({ navigation, route }: Props) {
  const { componentId, bikeTotalKm } = route.params;
  const { primaryColor: primary } = useTheme();

  const [date, setDate] = useState(todayIso());
  const [km, setKm] = useState(String(bikeTotalKm));
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handlePickPhoto = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung erforderlich', 'Bitte erlaube den Zugriff auf deine Fotos in den Einstellungen.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhotos(prev => [...prev, {
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
      }]);
    }
  };

  const handleSave = async () => {
    setApiError(null);
    if (!km || !description.trim()) {
      setApiError('km-Stand und Beschreibung sind Pflichtfelder.');
      return;
    }
    const kmVal = parseFloat(km);
    if (isNaN(kmVal) || kmVal < 0) {
      setApiError('Ungültiger km-Stand.');
      return;
    }

    setLoading(true);
    try {
      const log = await createLog(componentId, {
        performed_at: date,
        odometer_km: kmVal,
        description: description.trim(),
        cost: cost ? parseFloat(cost) : undefined,
      });

      for (const photo of photos) {
        try {
          await uploadPhoto(log.id, photo.uri, photo.mimeType);
        } catch {
          // Don't abort if a photo upload fails
        }
      }

      setSaved(true);
      setTimeout(() => navigation.goBack(), 2000);
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      if (typeof detail === 'string') {
        setApiError(detail);
      } else if (Array.isArray(detail)) {
        setApiError(detail.map((d: any) => d.msg).join('\n'));
      } else {
        setApiError('Speichern fehlgeschlagen.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Saved confirmation ────────────────────────────────────────────────────
  if (saved) {
    return (
      <View style={styles.savedContainer}>
        <View style={styles.savedCheck}>
          <Text style={styles.savedCheckIcon}>✓</Text>
        </View>
        <Text style={styles.savedTitle}>Sicher gespeichert</Text>
        <Text style={styles.savedSub}>
          Der Eintrag ist jetzt Teil des unveränderlichen Wartungsprotokolls.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Date picker */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DATUM</Text>
        <DatePicker value={date} onChange={setDate} />
      </View>

      {/* Form fields */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DETAILS</Text>
        <View style={styles.fieldsCard}>
          <Input
            label="km-Stand *"
            value={km}
            onChangeText={setKm}
            keyboardType="decimal-pad"
          />
          <Input
            label="Beschreibung *"
            value={description}
            onChangeText={setDescription}
            multiline
            style={styles.descInput}
          />
          <Input
            label="Kosten (optional)"
            value={cost}
            onChangeText={setCost}
            keyboardType="decimal-pad"
            hint="z.B. 34.90"
          />
        </View>
      </View>

      {/* Photo strip */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>FOTOS (OPTIONAL)</Text>
        <View style={styles.photoRow}>
          {photos.map((p, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image source={{ uri: p.uri }} style={styles.thumbImg} />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
              >
                <X size={10} color={Colors.white} strokeWidth={3} />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 5 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickPhoto}>
              <Camera size={20} color={primary} strokeWidth={2} />
              <Text style={styles.addPhotoLabel}>Foto</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Immutability notice */}
      <View style={styles.lockNote}>
        <Lock size={16} color={Colors.textMuted} strokeWidth={2} />
        <Text style={styles.lockText}>
          Nach dem Speichern kann dieser Eintrag nicht mehr geändert oder gelöscht werden.
        </Text>
      </View>

      {apiError && (
        <Text style={styles.apiError}>{apiError}</Text>
      )}

      <PrimaryButton
        label="Eintrag speichern"
        onPress={handleSave}
        loading={loading}
        style={styles.saveBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 48 },

  section: {
    marginBottom: Spacing.md,
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

  fieldsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.card,
  },
  descInput: {
    // Extra height hint for multiline — Input component handles this via minHeight
  } as any,

  // Photos
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    position: 'relative',
    overflow: 'visible',
  },
  thumbImg: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
  },
  addPhotoLabel: { ...Typography.caption, color: Colors.textMuted },

  // Lock notice
  lockNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  lockText: {
    ...Typography.caption,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },

  apiError: {
    ...Typography.caption,
    color: Colors.danger,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  saveBtn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },

  // Saved screen
  savedContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
    gap: Spacing.lg,
  },
  savedCheck: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedCheckIcon: { fontSize: 36, color: Colors.success },
  savedTitle: {
    ...Typography.title2,
    color: Colors.text,
    textAlign: 'center',
  },
  savedSub: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
