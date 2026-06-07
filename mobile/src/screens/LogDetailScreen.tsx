import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Lock, ArrowUp } from 'lucide-react-native';
import { BikeStackParamList } from '../navigation/types';
import { MaintenanceLog, MaintenancePhoto, MaintenanceComment } from '../types';
import { getLog } from '../services/logsApi';
import { getPhotos } from '../services/photosApi';
import { getComments, createComment } from '../services/commentsApi';
import LoadingView from '../components/LoadingView';
import { Colors, Radius, Shadow, Spacing, Typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<BikeStackParamList, 'LogDetail'>;
  route: RouteProp<BikeStackParamList, 'LogDetail'>;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function LogDetailScreen({ navigation, route }: Props) {
  const { logId } = route.params;
  const { primaryColor: primary, primaryLight } = useTheme();
  const [log, setLog] = useState<MaintenanceLog | null>(null);
  const [photos, setPhotos] = useState<MaintenancePhoto[]>([]);
  const [comments, setComments] = useState<MaintenanceComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [logData, ph, co] = await Promise.all([
        getLog(logId),
        getPhotos(logId),
        getComments(logId),
      ]);
      setLog(logData);
      navigation.setOptions({ title: formatDate(logData.performed_at) });
      setPhotos(ph);
      setComments(co);
    } catch {
      setError('Konnte Eintrag nicht laden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    if (text.length > 1000) {
      Alert.alert('Zu lang', 'Kommentare dürfen maximal 1.000 Zeichen haben.');
      return;
    }
    setSubmitting(true);
    try {
      const comment = await createComment(logId, text);
      setComments(prev => [...prev, comment]);
      setCommentText('');
    } catch {
      Alert.alert('Fehler', 'Kommentar konnte nicht gespeichert werden.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingView />;
  if (error) return <LoadingView error={error} />;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={primary} />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Timestamp card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>PROTOKOLLEINTRAG</Text>
          <View style={styles.tsRow}>
            <View style={styles.tsBlock}>
              <Text style={styles.tsTitle}>{log ? formatDate(log.performed_at) : '—'}</Text>
              <Text style={styles.tsCaption}>Durchgeführt am</Text>
            </View>
          </View>
          <View style={styles.recordedRow}>
            <Lock size={12} color={Colors.textMuted} strokeWidth={2.5} />
            <Text style={styles.recordedText}>
              Erfasst: {log ? formatDateTime(log.recorded_at) : '—'}
            </Text>
            <View style={styles.immutableBadge}>
              <Text style={styles.immutableBadgeText}>Unveränderlich</Text>
            </View>
          </View>
        </View>

        {/* Description + cost */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>WARTUNGSBESCHREIBUNG</Text>
          <Text style={styles.description}>{log?.description ?? '—'}</Text>

          <View style={styles.metaRow}>
            {log?.cost != null && (
              <View style={styles.costChip}>
                <Text style={styles.costText}>
                  {log.cost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </Text>
              </View>
            )}
            {log?.odometer_km != null && (
              <Text style={styles.odoText}>
                📍 {log.odometer_km.toLocaleString('de-DE')} km
              </Text>
            )}
          </View>
        </View>

        {/* Photos */}
        {photos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>FOTOS ({photos.length})</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoStrip}
              contentContainerStyle={styles.photoStripContent}
            >
              {photos.map(p => (
                <View key={p.id} style={styles.photoItem}>
                  <Image
                    source={{ uri: p.thumbnail_url }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                  {p.caption ? (
                    <Text style={styles.photoCaption} numberOfLines={2}>{p.caption}</Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Comments */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            KOMMENTARE{comments.length > 0 ? ` (${comments.length})` : ''}
          </Text>
          <Text style={styles.commentHint}>
            Ergänzungen möglich — bestehende Einträge können nicht geändert werden.
          </Text>

          {comments.length === 0 ? (
            <Text style={styles.noComments}>Noch keine Kommentare.</Text>
          ) : (
            <View style={styles.commentList}>
              {comments.map(c => (
                <View key={c.id} style={[styles.commentItem, { borderLeftColor: primaryLight }]}>
                  <Text style={styles.commentTs}>{formatDateTime(c.created_at)}</Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Comment input bar */}
      <View style={styles.commentBar}>
        <TextInput
          style={styles.commentInput}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Kommentar hinzufügen…"
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: primary },
            (!commentText.trim() || submitting) && styles.sendBtnDisabled,
          ]}
          onPress={handleAddComment}
          disabled={!commentText.trim() || submitting}
        >
          {submitting
            ? <ActivityIndicator color={Colors.white} size="small" />
            : <ArrowUp size={20} color={Colors.white} strokeWidth={2.5} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.lg },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  cardLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  // Timestamps
  tsRow: { gap: Spacing.xs },
  tsBlock: { gap: 2 },
  tsTitle: { ...Typography.title3, color: Colors.text },
  tsCaption: { ...Typography.caption, color: Colors.textSecondary },
  recordedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  recordedText: { ...Typography.monospace, color: Colors.textMuted },
  immutableBadge: {
    backgroundColor: Colors.surfaceRaised,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginLeft: 4,
  },
  immutableBadgeText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '600',
  },

  // Description
  description: {
    ...Typography.body,
    color: Colors.text,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  costChip: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  costText: { ...Typography.caption, color: Colors.success, fontWeight: '700' },
  odoText: { ...Typography.caption, color: Colors.textMuted },

  // Photos
  photoStrip: { marginTop: 4 },
  photoStripContent: { gap: Spacing.sm },
  photoItem: { alignItems: 'center', gap: 4 },
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceRaised,
  },
  photoCaption: {
    ...Typography.caption,
    color: Colors.textMuted,
    maxWidth: 120,
    textAlign: 'center',
  },

  // Comments
  commentHint: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  noComments: { ...Typography.subhead, color: Colors.textMuted },
  commentList: { gap: Spacing.md },
  commentItem: {
    borderLeftWidth: 2.5,
    paddingLeft: Spacing.md,
    gap: 4,
  },
  commentTs: {
    ...Typography.monospace,
    color: Colors.textMuted,
  },
  commentText: {
    ...Typography.body,
    color: Colors.text,
    lineHeight: 22,
  },

  // Comment bar
  commentBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.surfaceRaised,
    color: Colors.text,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    fontSize: 15,
    maxHeight: 100,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.fab,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
