import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import { BikeStackParamList } from '../navigation/types';
import { Bike, ComponentDue } from '../types';
import { getBikes, getDueComponents, mediaUrl } from '../services/bikesApi';
import { BikeCard } from '../components/ui/BikeCard';
import { FloatingActionButton } from '../components/ui/FloatingActionButton';
import { useTheme } from '../context/ThemeContext';
import { LoadingView } from '../components/ui/LoadingView';
import { Colors, Spacing, Typography } from '../theme';

type Props = { navigation: NativeStackNavigationProp<BikeStackParamList, 'Home'> };

interface DueCounts {
  overdueCount: number;
  dueSoonCount: number;
}

export default function HomeScreen({ navigation }: Props) {
  const { primaryColor: primary } = useTheme();
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [dueCounts, setDueCounts] = useState<Record<string, DueCounts>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const list = await getBikes();
      setBikes(list);
      const results = await Promise.allSettled(
        list.map(b => getDueComponents(b.id)),
      );
      const counts: Record<string, DueCounts> = {};
      list.forEach((b, i) => {
        const res = results[i];
        if (res.status === 'fulfilled') {
          const due: ComponentDue[] = res.value;
          counts[b.id] = {
            overdueCount: due.filter(d => d.status === 'overdue').length,
            dueSoonCount: due.filter(d => d.status === 'due_soon' || d.status === 'needs_first_service').length,
          };
        } else {
          counts[b.id] = { overdueCount: 0, dueSoonCount: 0 };
        }
      });
      setDueCounts(counts);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingView fullScreen message="Bikes laden…" />;

  return (
    <View style={styles.root}>
      <FlatList
        data={bikes}
        keyExtractor={b => b.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={primary}
          />
        }
        contentContainerStyle={bikes.length === 0 ? styles.emptyContainer : styles.list}
        ListHeaderComponent={
          bikes.length > 0 ? (
            <Text style={styles.sectionHeader}>
              {bikes.length === 1 ? '1 Fahrrad' : `${bikes.length} Fahrräder`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Text style={styles.emptyIcon}>🚲</Text>
            <Text style={styles.emptyTitle}>Noch keine Bikes</Text>
            <Text style={styles.emptySub}>
              Tippe auf + um dein erstes Fahrrad hinzuzufügen.
            </Text>
          </View>
        }
        renderItem={({ item: bike }) => {
          const counts = dueCounts[bike.id] ?? { overdueCount: 0, dueSoonCount: 0 };
          return (
            <BikeCard
              bike={bike}
              photoUrl={mediaUrl(bike.photo_url)}
              overdueCount={counts.overdueCount}
              dueSoonCount={counts.dueSoonCount}
              onPress={() => navigation.navigate('BikeDetail', { bikeId: bike.id })}
              style={styles.card}
            />
          );
        }}
      />

      <FloatingActionButton
        onPress={() => navigation.navigate('AddBike')}
        icon={<Plus size={26} color={Colors.white} strokeWidth={2.5} />}
        style={styles.fab}
        entranceDelay={150}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md, paddingBottom: 100 },
  emptyContainer: { flexGrow: 1 },
  sectionHeader: {
    ...Typography.caption,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: Spacing.md,
    paddingHorizontal: 2,
  },
  card: {
    marginBottom: Spacing.md,
  },
  emptyInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    ...Typography.title2,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySub: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
  },
});
