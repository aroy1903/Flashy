import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, TextInput, ScrollView,
  ActivityIndicator, Modal, Alert, RefreshControl, Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import {
  listGroups, createGroup, deleteGroup,
  listDeckCollections, createDeckCollection,
  renameDeckCollection, deleteDeckCollection, setDeckCollectionMembers,
} from '../../lib/db';
import { colors, layout, radii, spacing } from '../../lib/theme';
import { colorBucket } from '../../lib/colorBucket';

const COLLECTION_STORAGE_KEY = 'home.collectionFilter';

const COLOR_CHOICES = ['#14b8a6', '#ff7a59', '#f5b84b', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444'];

const BUCKET_LABELS = {
  red: 'Red', orange: 'Orange', yellow: 'Yellow', green: 'Green',
  teal: 'Teal', blue: 'Blue', purple: 'Purple', pink: 'Pink', gray: 'Gray',
};

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

export default function Home() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [collections, setCollections] = useState([]);
  const [collectionFilter, setCollectionFilter] = useState('all'); // 'all' or collection id
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [collectionEditor, setCollectionEditor] = useState(null); // null | { mode: 'new'|'edit', collection? }

  const load = async () => {
    try {
      const [g, cols] = await Promise.all([listGroups(), listDeckCollections()]);
      setGroups(g);
      setCollections(cols);
      // If the saved filter points to a deleted collection, drop back to 'all'
      setCollectionFilter((cur) =>
        cur === 'all' || cols.some((c) => c.id === cur) ? cur : 'all'
      );
    } catch (e) {
      Alert.alert('Failed to load', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(COLLECTION_STORAGE_KEY)
      .then((v) => { if (v) setCollectionFilter(v); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(COLLECTION_STORAGE_KEY, collectionFilter).catch(() => {});
  }, [collectionFilter]);

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = () => { setRefreshing(true); load(); };

  const onDelete = (g) => {
    confirmDestructive('Delete deck?', `Remove "${g.name}" and all its cards.`, async () => {
      await deleteGroup(g.id);
      load();
    });
  };

  // Build one exact-color filter chip per unique deck color the user actually has.
  const HUE_ORDER = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'gray'];
  const filterChips = (() => {
    const seen = new Map();
    for (const g of groups) {
      const key = (g.color || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.set(key, { color: key, bucket: colorBucket(key) });
    }
    return [...seen.values()].sort(
      (a, b) => HUE_ORDER.indexOf(a.bucket) - HUE_ORDER.indexOf(b.bucket),
    );
  })();

  const isFolderView = collectionFilter === 'all';
  const assignedIds = new Set(collections.flatMap((c) => c.group_ids));
  const unassignedDecks = groups.filter((g) => !assignedIds.has(g.id));

  const activeCollection =
    collectionFilter === '__unassigned__'
      ? null
      : collections.find((c) => c.id === collectionFilter);
  const memberSet =
    collectionFilter === '__unassigned__'
      ? new Set(unassignedDecks.map((g) => g.id))
      : activeCollection
      ? new Set(activeCollection.group_ids)
      : null;

  const filteredDecks = groups.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchesColor =
      colorFilter === 'all' || (g.color || '').toLowerCase() === colorFilter;
    const matchesCollection = !memberSet || memberSet.has(g.id);
    return matchesSearch && matchesColor && matchesCollection;
  });

  const folderCards = (() => {
    const items = collections.map((c) => ({
      kind: 'collection',
      id: c.id,
      name: c.name,
      count: c.group_ids.length,
      sampleColors: groups
        .filter((g) => c.group_ids.includes(g.id))
        .slice(0, 4)
        .map((g) => g.color),
    }));
    if (unassignedDecks.length > 0) {
      items.push({
        kind: 'unassigned',
        id: '__unassigned__',
        name: 'Unassigned',
        count: unassignedDecks.length,
        sampleColors: unassignedDecks.slice(0, 4).map((g) => g.color),
      });
    }
    const q = search.toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  })();

  const onLongPressCollection = (collection) => {
    Alert.alert(collection.name, undefined, [
      { text: 'Manage decks', onPress: () => setCollectionEditor({ mode: 'edit', collection }) },
      {
        text: 'Delete collection',
        style: 'destructive',
        onPress: () =>
          confirmDestructive(
            'Delete collection?',
            'Decks inside will not be deleted.',
            async () => {
              await deleteDeckCollection(collection.id);
              if (collectionFilter === collection.id) setCollectionFilter('all');
              load();
            },
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

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
          <Text style={styles.kicker}>StuddyPebble</Text>
          <Text style={styles.title}>Your Decks</Text>
          <Text style={styles.subtitle}>Create and study flashcard decks</Text>
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
          placeholder={isFolderView ? 'Search collections...' : 'Search decks...'}
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
        />
        <Pressable style={styles.newBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.collectionRow}
      >
        <Pressable
          onPress={() => setCollectionFilter('all')}
          hitSlop={6}
          style={[
            styles.collectionPill,
            collectionFilter === 'all' && styles.collectionPillActive,
          ]}
        >
          <Text
            style={[
              styles.collectionPillText,
              collectionFilter === 'all' && styles.collectionPillTextActive,
            ]}
          >
            All decks
          </Text>
        </Pressable>
        {collections.map((c) => {
          const active = collectionFilter === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCollectionFilter(active ? 'all' : c.id)}
              onLongPress={() => onLongPressCollection(c)}
              hitSlop={6}
              style={[styles.collectionPill, active && styles.collectionPillActive]}
            >
              <Text
                style={[
                  styles.collectionPillText,
                  active && styles.collectionPillTextActive,
                ]}
                numberOfLines={1}
              >
                {c.name}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setCollectionEditor({ mode: 'new' })}
          hitSlop={6}
          style={[styles.collectionPill, styles.collectionPillAdd]}
        >
          <Text style={styles.collectionPillAddText}>+ New collection</Text>
        </Pressable>
      </ScrollView>

      {!isFolderView && (
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setColorFilter('all')}
            hitSlop={6}
            style={[styles.allChip, colorFilter === 'all' && styles.allChipActive]}
          >
            <Text style={[
              styles.allChipText,
              colorFilter === 'all' && styles.allChipTextActive,
            ]}>All</Text>
          </Pressable>
          {filterChips.map(({ color, bucket }) => {
            const active = colorFilter === color;
            return (
              <Pressable
                key={color}
                onPress={() => setColorFilter(active ? 'all' : color)}
                hitSlop={10}
                accessibilityLabel={`Filter by ${BUCKET_LABELS[bucket] || color}`}
                style={[styles.colorChipWrap, active && styles.colorChipWrapActive]}
              >
                <View
                  style={[
                    styles.colorChip,
                    { backgroundColor: color },
                    !active && { opacity: 0.55 },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      )}

      {isFolderView ? (
        <FlatList
          data={folderCards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {search ? 'No collections found' : 'No collections yet'}
              </Text>
              <Text style={styles.emptySub}>
                {search
                  ? 'Try a different search'
                  : 'Tap + New collection to group your decks'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setCollectionFilter(item.id)}
              onLongPress={() => {
                if (item.kind === 'collection') {
                  const c = collections.find((x) => x.id === item.id);
                  if (c) onLongPressCollection(c);
                }
              }}
              style={({ pressed }) => [styles.folderCard, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.folderIcon}>
                {item.sampleColors.length === 0 ? (
                  <View style={[styles.folderDot, { backgroundColor: colors.border }]} />
                ) : (
                  item.sampleColors.map((c, i) => (
                    <View key={i} style={[styles.folderDot, { backgroundColor: c }]} />
                  ))
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {item.count} {item.count === 1 ? 'deck' : 'decks'}
                </Text>
              </View>
              <Text style={styles.folderChevron}>›</Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={filteredDecks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{search ? 'No decks found' : 'No decks here'}</Text>
              <Text style={styles.emptySub}>
                {search ? 'Try a different search' : 'Add decks to this collection from its edit menu'}
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
      )}

      <CreateModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />

      <CollectionEditorModal
        editor={collectionEditor}
        groups={groups}
        onClose={() => setCollectionEditor(null)}
        onSaved={(newId) => {
          setCollectionEditor(null);
          if (newId) setCollectionFilter(newId);
          load();
        }}
      />
    </SafeAreaView>
  );
}

function CollectionEditorModal({ editor, groups, onClose, onSaved }) {
  const mode = editor?.mode;
  const visible = !!editor;
  const existing = editor?.collection;
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(existing?.name ?? '');
    setSelected(new Set(existing?.group_ids ?? []));
  }, [visible, existing]);

  const toggle = (gid) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid);
      else next.add(gid);
      return next;
    });
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Give your collection a name.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'new') {
        const created = await createDeckCollection({
          name: trimmed,
          group_ids: [...selected],
        });
        onSaved(created.id);
      } else {
        if (trimmed !== existing.name) {
          await renameDeckCollection(existing.id, trimmed);
        }
        await setDeckCollectionMembers(existing.id, [...selected]);
        onSaved(existing.id);
      }
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>
            {mode === 'new' ? 'New Collection' : 'Edit Collection'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Collection name"
            placeholderTextColor={colors.textFaint}
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.label}>Decks in this collection</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {groups.length === 0 ? (
              <Text style={styles.collectionEmpty}>You don't have any decks yet.</Text>
            ) : (
              groups.map((g) => {
                const on = selected.has(g.id);
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => toggle(g.id)}
                    style={[styles.deckPickerRow, on && styles.deckPickerRowActive]}
                  >
                    <View style={[styles.deckPickerDot, { backgroundColor: g.color }]} />
                    <Text style={styles.deckPickerName} numberOfLines={1}>{g.name}</Text>
                    <View style={[styles.deckPickerCheck, on && styles.deckPickerCheckOn]}>
                      {on ? <Text style={styles.deckPickerCheckMark}>✓</Text> : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
            <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={onClose}>
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={save}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.modalBtnPrimaryText}>
                  {mode === 'new' ? 'Create' : 'Save'}
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
          <Text style={styles.modalTitle}>New Deck</Text>
          <TextInput
            style={styles.input}
            placeholder="Deck name"
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
                  color === c && { borderColor: colors.text, borderWidth: 2 },
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
  kicker: { color: colors.primaryHover, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.textDim, marginTop: 4 },
  signOut: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.inputBg,
    minHeight: layout.touchTarget,
    justifyContent: 'center',
  },
  signOutText: { color: colors.textMuted, fontSize: 13 },
  row: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    rowGap: spacing.sm,
  },
  allChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  allChipActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  allChipText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  allChipTextActive: { color: colors.text },
  colorChipWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorChipWrapActive: {
    borderColor: 'rgba(255,255,255,0.55)',
  },
  colorChip: {
    width: 22,
    height: 22,
    borderRadius: 999,
  },
  search: {
    flex: 1, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.text,
    minHeight: layout.touchTarget,
  },
  newBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
    minHeight: layout.touchTarget,
  },
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
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(236,253,245,0.025)',
  },
  emptyTitle: { color: colors.textMuted, fontSize: 16, fontWeight: '500' },
  emptySub: { color: colors.textFaint, marginTop: 6, fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl, paddingBottom: 40,
    maxHeight: layout.maxSheetHeight,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: 14, color: colors.text, marginBottom: spacing.md,
    minHeight: layout.touchTarget,
  },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  colorRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  colorSwatch: { width: layout.touchTarget, height: layout.touchTarget, borderRadius: 999 },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.touchTarget,
  },
  modalBtnGhost: { backgroundColor: colors.inputBg },
  modalBtnGhostText: { color: colors.textMuted, fontWeight: '600' },
  modalBtnPrimary: { backgroundColor: colors.primary },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '600' },
  collectionRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  collectionPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    minHeight: 36,
    maxWidth: 200,
    justifyContent: 'center',
  },
  collectionPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  collectionPillText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  collectionPillTextActive: { color: colors.primaryHover },
  collectionPillAdd: { borderStyle: 'dashed' },
  collectionPillAddText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  collectionEmpty: { color: colors.textFaint, textAlign: 'center', paddingVertical: spacing.md },
  deckPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  deckPickerRowActive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.border,
  },
  deckPickerDot: { width: 10, height: 10, borderRadius: 999 },
  deckPickerName: { color: colors.text, flex: 1, fontSize: 14 },
  deckPickerCheck: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  deckPickerCheckOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  deckPickerCheckMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  folderCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, borderRadius: radii.lg, marginBottom: spacing.md,
  },
  folderIcon: {
    width: 36, height: 36, borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
    padding: 6, gap: 3,
  },
  folderDot: { width: 10, height: 10, borderRadius: 999 },
  folderChevron: { color: colors.textFaint, fontSize: 22, paddingHorizontal: spacing.xs },
});
