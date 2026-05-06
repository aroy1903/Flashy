import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, TextInput,
  ActivityIndicator, Modal, Alert, RefreshControl, Platform, ScrollView,
} from 'react-native';

function confirmDestructive(title, message, onConfirm) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      Promise.resolve(onConfirm()).catch((e) => window.alert(`Failed: ${e.message}`));
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { listGroups, createGroup, deleteGroup } from '../../lib/db';
import { colors, radii, spacing } from '../../lib/theme';

const COLOR_CHOICES = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f97316', '#ef4444', '#eab308'];
const FILTER_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

export default function Home() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try {
      const data = await listGroups();
      setGroups(data);
    } catch (e) {
      Alert.alert('Failed to load', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = () => { setRefreshing(true); load(); };

  const onDelete = (g) => {
    confirmDestructive('Delete set?', `Remove "${g.name}" and all its cards.`, async () => {
      await deleteGroup(g.id);
      load();
    });
  };

  const filtered = groups.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchesColor = colorFilter === 'all' || g.color === colorFilter;
    return matchesSearch && matchesColor;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Your Sets</Text>
          <Text style={styles.subtitle}>Create and study flashcard sets</Text>
        </View>
        <Pressable
          onPress={() => supabase.auth.signOut()}
          style={styles.signOut}
          hitSlop={8}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <TextInput
          style={styles.search}
          placeholder="Search sets..."
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
        />
        <Pressable style={styles.newBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Pressable
          onPress={() => setColorFilter('all')}
          style={[
            styles.allChip,
            colorFilter === 'all' && styles.allChipActive,
          ]}
        >
          <Text style={[
            styles.allChipText,
            colorFilter === 'all' && styles.allChipTextActive,
          ]}>All</Text>
        </Pressable>
        {FILTER_COLORS.map((c) => {
          const active = colorFilter === c;
          return (
            <Pressable
              key={c}
              onPress={() => setColorFilter(active ? 'all' : c)}
              style={[
                styles.colorChip,
                { backgroundColor: c },
                active && styles.colorChipActive,
                !active && { opacity: 0.55 },
              ]}
            />
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{search ? 'No sets found' : 'No sets yet'}</Text>
            <Text style={styles.emptySub}>
              {search ? 'Try a different search' : 'Create your first set to get started'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/group/${item.id}`)}
            onLongPress={() => onDelete(item)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <Text style={styles.cardMeta}>
                {item.card_count} {item.card_count === 1 ? 'card' : 'cards'}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <CreateModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />
    </SafeAreaView>
  );
}

function CreateModal({ visible, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createGroup({ name: name.trim(), description: description.trim(), color });
      setName(''); setDescription(''); setColor(COLOR_CHOICES[0]);
      onCreated();
    } catch (e) {
      Alert.alert('Failed to create', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>New Set</Text>
          <TextInput
            style={styles.input}
            placeholder="Set name"
            placeholderTextColor={colors.textFaint}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textFaint}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {COLOR_CHOICES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  color === c && { borderColor: '#fff', borderWidth: 2 },
                ]}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
            <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={onClose}>
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnPrimaryText}>Create</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.textDim, marginTop: 4 },
  signOut: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.inputBg },
  signOutText: { color: colors.textMuted, fontSize: 13 },
  row: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  allChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: 'transparent',
  },
  allChipActive: { backgroundColor: 'rgba(255,255,255,0.10)' },
  allChipText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  allChipTextActive: { color: '#fff' },
  colorChip: {
    width: 24, height: 24, borderRadius: 999,
  },
  colorChipActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    transform: [{ scale: 1.1 }],
  },
  search: {
    flex: 1, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.text,
  },
  newBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, justifyContent: 'center', borderRadius: radii.md },
  newBtnText: { color: '#fff', fontWeight: '600' },
  card: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, borderRadius: radii.lg, marginBottom: spacing.md,
  },
  dot: { width: 12, height: 12, borderRadius: 999, marginTop: 6 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  cardDesc: { color: colors.textDim, marginTop: 4, fontSize: 13 },
  cardMeta: { color: colors.textFaint, fontSize: 12, marginTop: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: colors.textMuted, fontSize: 16, fontWeight: '500' },
  emptySub: { color: colors.textFaint, marginTop: 6, fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl, paddingBottom: 40,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: 14, color: colors.text, marginBottom: spacing.md,
  },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  colorRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  colorSwatch: { width: 32, height: 32, borderRadius: 999 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: radii.md, alignItems: 'center' },
  modalBtnGhost: { backgroundColor: colors.inputBg },
  modalBtnGhostText: { color: colors.textMuted, fontWeight: '600' },
  modalBtnPrimary: { backgroundColor: colors.primary },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '600' },
});
