import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Pressable,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolateColor,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import { DueSoonStackParamList } from '../navigation/types';
import { Bike, ComponentDue } from '../types';
import { getBikes, getDueComponents } from '../services/bikesApi';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingView } from '../components/ui/LoadingView';
import { Colors, Radius, Shadow, Spacing, Typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<DueSoonStackParamList, 'DueSoon'>;
};

interface DueItem extends ComponentDue {
  bikeName: string;
  bikeId: string;
}

// ── Animated press card ───────────────────────────────────────────────────────

function PressableCard({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      pressed.value,
      [0, 1],
      [Colors.surface, Colors.surfaceRaised],
    ),
  }));

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
          pressed.value = withTiming(1, { duration: 80 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 20, stiffness: 400 });
          pressed.value = withTiming(0, { duration: 200 });
        }}
        style={styles.cardInner}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ── Due detail line ───────────────────────────────────────────────────────────

function DueDetail({ item }: { item: ComponentDue }) {
  const lines: string[] = [];
  if (item.days_since_service != null) {
    lines.push(`${item.days_since_service} Tage seit Wartung`);
  }
  if (item.days_until_due != null) {
    if (item.days_until_due >= 0) {
      lines.push(`Fällig in ${item.days_until_due} Tagen`);
    } else {
      lines.push(`Überfällig seit ${Math.abs(item.days_until_due)} Tagen`);
    }
  }
  if (item.km_since_service != null) {
    lines.push(`${item.km_since_service.toLocaleString('de-DE')} km seit Wartung`);
  }
  if (item.km_until_due != null) {
    if (item.km_until_due >= 0) {
      lines.push(`Noch ${item.km_until_due.toLocaleString('de-DE')} km`);
    } else {
      lines.push(`Überfällig um ${Math.abs(item.km_until_due).toLocaleString('de-DE')} km`);
    }
  }
  return lines.length > 0
    ? <Text style={styles.dueDetail}>{lines.join('  ·  ')}</Text>
    : null;
}

// ── Screen ────────────────────────────────────────────────────────────────────

const STATUS_VARIANT_MAP: Record<string, 'overdue' | 'dueSoon' | 'info'> = {
  overdue: 'overdue',
  due_soon: 'dueSoon',
  needs_first_service: 'info',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  overdue: 'Überfällig',
  due_soon: 'Bald fällig',
  needs_first_service: 'Erstservice',
};

export default function DueSoonScreen({ navigation }: Props) {
  const { primaryColor: primary } = useTheme();
  const [items, setItems] = useState<DueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const bikes: Bike[] = await getBikes();
      const results = await Promise.allSettled(
        bikes.map(b =>
          getDueComponents(b.id).then(due =>
            due.map(d => ({ ...d, bikeName: b.name, bikeId: b.id }))
          )
        ),
      );
      const all: DueItem[] = [];
      results.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value); });
      all.sort((a, b) => {
        const order: Record<string, number> = { overdue: 0, due_soon: 1, needs_first_service: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      });
      setItems(all);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingView fullScreen message="Wartungsstatus laden…" />;

  return (
    <FlatList
      data={items}
      keyExtractor={i => i.id}
      style={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={primary} />
      }
      contentContainerStyle={items.length === 0 ? styles.emptyOuter : styles.listContent}
      ListEmptyComponent={
        <View style={styles.emptyInner}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>Alles in Ordnung!</Text>
          <Text style={styles.emptySub}>Keine fälligen Wartungen.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <PressableCard
          onPress={() =>
            navigation.navigate('ComponentDetail', {
              componentId: item.id,
              bikeId: item.bikeId,
              highlight: true,
            })
          }
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardLeft}>
              <Text style={styles.compName}>{item.name}</Text>
              <Text style={styles.bikeName}>{item.bikeName}</Text>
            </View>
            <View style={styles.cardRight}>
              <StatusBadge
                label={STATUS_LABEL_MAP[item.status] ?? item.status}
                variant={STATUS_VARIANT_MAP[item.status] ?? 'neutral'}
              />
              <ChevronRight size={16} color={Colors.textMuted} strokeWidth={2} />
            </View>
          </View>
          <DueDetail item={item} />
        </PressableCard>
      )}
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: Spacing.md },
  emptyOuter: { flexGrow: 1, backgroundColor: Colors.background },
  emptyInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { ...Typography.title2, color: Colors.text, textAlign: 'center' },
  emptySub: { ...Typography.subhead, color: Colors.textSecondary, textAlign: 'center' },

  // Card shell — backgroundColor animated by Reanimated
  card: {
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  // Inner Pressable provides padding and content layout
  cardInner: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  cardLeft: { flex: 1, gap: 3 },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 0,
  },
  compName: { ...Typography.callout, color: Colors.text, fontWeight: '600' },
  bikeName: { ...Typography.caption, color: Colors.textSecondary },
  dueDetail: {
    ...Typography.caption,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
