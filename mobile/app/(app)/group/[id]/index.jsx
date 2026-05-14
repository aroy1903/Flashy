import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput, Image,
  ActivityIndicator, Alert, RefreshControl, Modal, ScrollView, Platform,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  getGroup, listFlashcards, createFlashcard, updateFlashcard, deleteFlashcard,
  deleteGroup, bulkCreateFlashcards,
} from '../../../../lib/db';
import { uploadCardImage, imagePublicUrl, deleteCardImage } from '../../../../lib/storage';
import { parseBulkCards } from '../../../../lib/ai';
import { parseStructuredDeck } from '../../../../lib/parseDeck';
import { colors, layout, radii, spacing } from '../../../../lib/theme';
import MarkdownText from '../../../../lib/MarkdownText';

// Alert.alert with destructive buttons is a no-op on Expo Web, so use window.confirm there.
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

export default function GroupDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [adding, setAdding] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = async () => {
    try {
      const [g, c] = await Promise.all([getGroup(id), listFlashcards(id)]);
      setGroup(g); setCards(c);
    } catch (e) {
      Alert.alert('Failed to load', e.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [id]));

  const addCard = async () => {
    if (!term.trim()) return;
    setAdding(true);
    try {
      const created = await createFlashcard({
        group_id: id,
        term: term.trim(),
        definition: definition.trim(),
        position: cards.length,
      });
      setCards((prev) => [...prev, created]);
      setTerm(''); setDefinition('');
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setAdding(false);
    }
  };

  const removeCard = (cardId) => {
    confirmDestructive('Delete card?', 'This cannot be undone.', async () => {
      const card = cards.find((c) => c.id === cardId);
      await deleteFlashcard(cardId);
      if (card?.term_image) deleteCardImage(card.term_image).catch(() => {});
      if (card?.definition_image) deleteCardImage(card.definition_image).catch(() => {});
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    });
  };

  const removeSet = () => {
    confirmDestructive('Delete deck?', 'Removes all cards in this deck.', async () => {
      await deleteGroup(id);
      router.back();
    });
  };

  const handleBulkAdd = async (parsedCards) => {
    try {
      const created = await bulkCreateFlashcards(id, parsedCards, cards.length);
      setCards((prev) => [...prev, ...created]);
      setBulkOpen(false);
    } catch (e) {
      Alert.alert('Failed to add cards', e.message);
    }
  };

  if (loading || !group) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={cards}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: spacing.md }}>
              <Text style={styles.back}>← Back</Text>
            </Pressable>
            <View style={styles.titleRow}>
              <View style={[styles.dot, { backgroundColor: group.color }]} />
              <Text style={styles.title}>{group.name}</Text>
            </View>
            {group.description ? <Text style={styles.desc}>{group.description}</Text> : null}
            <Text style={styles.meta}>{cards.length} cards</Text>

            <View style={styles.modes}>
              {[
                { route: 'study',   label: 'Study',   desc: 'Flip cards',    bg: colors.primarySoft,  fg: colors.primaryHover },
                { route: 'learn',   label: 'Learn',   desc: 'Self-assess',   bg: 'rgba(34,197,94,0.14)',  fg: '#86efac' },
                { route: 'quiz',    label: 'Quiz',    desc: 'MC / T-F / write', bg: 'rgba(59,130,246,0.14)', fg: '#93c5fd' },
                { route: 'match',   label: 'Match',   desc: 'Pair tiles',    bg: 'rgba(16,185,129,0.15)',  fg: '#6ee7b7' },
                { route: 'gravity', label: 'Gravity', desc: 'Type to save',  bg: colors.secondarySoft,  fg: '#ffb19c' },
              ].map((m) => (
                <Pressable
                  key={m.route}
                  style={[styles.modeBtn, { backgroundColor: m.bg }]}
                  onPress={() => router.push(`/group/${id}/${m.route}`)}
                >
                  <Text style={[styles.modeText, { color: m.fg }]}>{m.label}</Text>
                  <Text style={styles.modeDesc}>{m.desc}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.section}>ADD CARD</Text>
              <Pressable style={styles.bulkBtn} onPress={() => setBulkOpen(true)}>
                <Text style={styles.bulkBtnText}>Bulk add</Text>
              </Pressable>
            </View>
            <TextInput
              style={[styles.input, { minHeight: 48, textAlignVertical: 'top' }]}
              placeholder="Term"
              placeholderTextColor={colors.textFaint}
              value={term}
              onChangeText={setTerm}
              multiline
            />
            <TextInput
              style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
              placeholder="Definition (optional). Press return for a new line."
              placeholderTextColor={colors.textFaint}
              value={definition}
              onChangeText={setDefinition}
              multiline
            />
            <Pressable style={styles.addBtn} onPress={addCard} disabled={adding}>
              {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Add card</Text>}
            </Pressable>

            <Text style={[styles.section, { marginTop: spacing.xl }]}>CARDS</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <CardRow
            card={item}
            index={index}
            groupId={id}
            onSave={async (patch) => {
              const updated = await updateFlashcard(item.id, patch);
              setCards((prev) => prev.map((c) => (c.id === item.id ? updated : c)));
              return updated;
            }}
            onDelete={() => removeCard(item.id)}
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyCards}>No cards yet. Add one above.</Text>}
        ListFooterComponent={
          <Pressable onPress={removeSet} style={styles.deleteSet}>
            <Text style={styles.deleteSetText}>Delete this deck</Text>
          </Pressable>
        }
      />

      <BulkAddModal
        visible={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onConfirm={handleBulkAdd}
      />
    </SafeAreaView>
  );
}

function CardRow({ card, index, groupId, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [t, setT] = useState(card.term);
  const [d, setD] = useState(card.definition || '');
  const [notes, setNotes] = useState(card.notes || '');
  const [links, setLinks] = useState(card.external_links || []);
  const [uploading, setUploading] = useState(null); // 'term' | 'definition' | null
  const [saving, setSaving] = useState(false);

  const pickImage = async (side) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(side);
    try {
      const path = await uploadCardImage({ groupId, side, asset: result.assets[0] });
      const field = side === 'term' ? 'term_image' : 'definition_image';
      const oldPath = card[field];
      await onSave({ [field]: path });
      if (oldPath) deleteCardImage(oldPath).catch(() => {});
    } catch (e) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(null);
    }
  };

  const removeImage = async (side) => {
    const field = side === 'term' ? 'term_image' : 'definition_image';
    const oldPath = card[field];
    try {
      await onSave({ [field]: null });
      if (oldPath) deleteCardImage(oldPath).catch(() => {});
    } catch (e) {
      Alert.alert('Failed', e.message);
    }
  };

  const addLink = () => setLinks((arr) => [...arr, { label: '', url: '' }]);
  const updateLink = (i, field, value) =>
    setLinks((arr) => arr.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  const removeLink = (i) => setLinks((arr) => arr.filter((_, idx) => idx !== i));
  const saveEdits = async () => {
    const nextTerm = t.trim();
    if (!nextTerm) {
      Alert.alert('Term required', 'Cards need a term before they can be saved.');
      return;
    }
    const cleanLinks = links
      .map((l) => ({ label: l.label?.trim() || '', url: l.url?.trim() || '' }))
      .filter((l) => l.label || l.url);
    const patch = {};
    if (nextTerm !== card.term) patch.term = nextTerm;
    if (d !== (card.definition || '')) patch.definition = d || null;
    if (notes !== (card.notes || '')) patch.notes = notes;
    const cur = JSON.stringify(card.external_links || []);
    const next = JSON.stringify(cleanLinks);
    if (cur !== next) patch.external_links = cleanLinks;
    if (!Object.keys(patch).length) {
      setLinks(cleanLinks);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(patch);
      setT(nextTerm);
      setLinks(cleanLinks);
      setEditing(false);
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <View style={styles.cardItem}>
        <Text style={styles.cardLabel}>TERM</Text>
        <TextInput
          style={[styles.input, { minHeight: 48, textAlignVertical: 'top' }]}
          value={t}
          onChangeText={setT}
          placeholder="Term"
          placeholderTextColor={colors.textFaint}
          multiline
        />
        <ImageSlot
          path={card.term_image}
          uploading={uploading === 'term'}
          onPick={() => pickImage('term')}
          onRemove={() => removeImage('term')}
        />

        <Text style={[styles.cardLabel, { marginTop: spacing.md }]}>DEFINITION</Text>
        <TextInput
          style={[styles.input, { minHeight: 160, textAlignVertical: 'top' }]}
          value={d}
          onChangeText={setD}
          placeholder="Definition (optional). Press return for a new line."
          placeholderTextColor={colors.textFaint}
          multiline
        />
        <ImageSlot
          path={card.definition_image}
          uploading={uploading === 'definition'}
          onPick={() => pickImage('definition')}
          onRemove={() => removeImage('definition')}
        />

        <Pressable onPress={() => setExpanded((v) => !v)} style={{ marginTop: spacing.md }}>
          <Text style={styles.expandLink}>{expanded ? 'Hide notes & links' : 'Notes & links'}</Text>
        </Pressable>

        {expanded && (
          <View style={{ marginTop: spacing.sm }}>
            <Text style={styles.cardLabel}>NOTES</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Mnemonics, context, anything..."
              placeholderTextColor={colors.textFaint}
              multiline
            />

            <Text style={[styles.cardLabel, { marginTop: spacing.sm }]}>LINKS</Text>
            {links.map((lnk, i) => (
              <View key={i} style={styles.linkRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Label"
                  placeholderTextColor={colors.textFaint}
                  value={lnk.label}
                  onChangeText={(v) => updateLink(i, 'label', v)}
                />
                <TextInput
                  style={[styles.input, { flex: 2, marginBottom: 0 }]}
                  placeholder="https://..."
                  placeholderTextColor={colors.textFaint}
                  value={lnk.url}
                  autoCapitalize="none"
                  keyboardType="url"
                  onChangeText={(v) => updateLink(i, 'url', v)}
                />
                <Pressable onPress={() => removeLink(i)} hitSlop={8}>
                  <Text style={styles.removeLink}>Remove</Text>
                </Pressable>
              </View>
            ))}
            <Pressable onPress={addLink} style={{ marginTop: spacing.xs }}>
              <Text style={styles.expandLink}>+ Add link</Text>
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <Pressable
            style={[styles.smallBtn, { backgroundColor: colors.primary }]}
            onPress={saveEdits}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.smallBtnText}>Save</Text>}
          </Pressable>
          <Pressable
            style={[styles.smallBtn, { backgroundColor: colors.inputBg }]}
            onPress={() => {
              setT(card.term); setD(card.definition || '');
              setNotes(card.notes || ''); setLinks(card.external_links || []);
              setEditing(false);
            }}
          >
            <Text style={[styles.smallBtnText, { color: colors.textMuted }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hasExtras = !!(card.notes || (card.external_links?.length));

  return (
    <View style={styles.cardItem}>
      <Text style={styles.cardIdx}>#{index + 1}</Text>
      <Text style={styles.cardTerm}>{card.term}</Text>
      {card.term_image ? (
        <Image source={{ uri: imagePublicUrl(card.term_image) }} style={styles.thumb} />
      ) : null}
      {card.definition ? (
        <View style={styles.cardDefWrap}>
          <MarkdownText size="sm">{card.definition}</MarkdownText>
        </View>
      ) : null}
      {card.definition_image ? (
        <Image source={{ uri: imagePublicUrl(card.definition_image) }} style={styles.thumb} />
      ) : null}
      {hasExtras ? (
        <Text style={styles.extrasHint}>
          {card.notes ? 'Notes' : ''}{card.notes && card.external_links?.length ? '  |  ' : ''}
          {card.external_links?.length ? `${card.external_links.length} link${card.external_links.length > 1 ? 's' : ''}` : ''}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <Pressable onPress={() => setEditing(true)}>
          <Text style={styles.cardAction}>Edit</Text>
        </Pressable>
        <Pressable onPress={onDelete}>
          <Text style={[styles.cardAction, { color: colors.danger }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ImageSlot({ path, uploading, onPick, onRemove }) {
  return (
    <View style={styles.imageSlot}>
      {path ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Image source={{ uri: imagePublicUrl(path) }} style={styles.thumbSmall} />
          <Pressable onPress={onRemove}><Text style={styles.removeImage}>Remove</Text></Pressable>
        </View>
      ) : (
        <Pressable onPress={onPick} disabled={uploading} style={styles.imagePick}>
          {uploading
            ? <ActivityIndicator color={colors.primary} />
            : <Text style={styles.imagePickText}>Add image or GIF</Text>}
        </Pressable>
      )}
    </View>
  );
}

function BulkAddModal({ visible, onClose, onConfirm }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setText(''); setParsed(null); setError(''); };
  const close = () => { reset(); onClose(); };

  const handleParseAI = async () => {
    if (!text.trim()) return;
    setParsing(true); setError(''); setParsed(null);
    try {
      const cards = await parseBulkCards(text);
      if (!cards.length) setError('No cards found in that text.');
      else setParsed(cards);
    } catch (e) {
      setError(e.message || 'Failed to parse with AI');
    } finally {
      setParsing(false);
    }
  };

  const handleParseSimple = () => {
    setError('');
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const cards = [];
    let pendingTerm = '';
    for (const line of lines) {
      const field = line.match(/^(term|front|question|definition|back|answer)\s*:\s*(.*)$/i);
      if (field) {
        const key = field[1].toLowerCase();
        const value = field[2].trim();
        if (['term', 'front', 'question'].includes(key)) {
          if (pendingTerm) cards.push({ term: pendingTerm, definition: '' });
          pendingTerm = value;
        } else if (pendingTerm) {
          cards.push({ term: pendingTerm, definition: value });
          pendingTerm = '';
        } else if (value) {
          cards.push({ term: value, definition: '' });
        }
        continue;
      }
      // Tab, spaced dash, or the first colon splits term/definition.
      let split = line.split('\t');
      if (split.length < 2) split = line.split(/\s+[—-]\s+/);
      if (split.length < 2) {
        const idx = line.indexOf(':');
        split = idx > 0 ? [line.slice(0, idx), line.slice(idx + 1)] : [line];
      }
      const t = (split[0] || '').trim();
      const d = (split.slice(1).join(' ') || '').trim();
      if (t) cards.push({ term: t, definition: d });
    }
    if (pendingTerm) cards.push({ term: pendingTerm, definition: '' });
    if (!cards.length) setError('No cards found. Try one card per line.');
    else setParsed(cards);
  };

  const handleParseMarkdown = () => {
    setError('');
    const cards = parseStructuredDeck(text);
    if (!cards || !cards.length) {
      setError('No "## Card N: Title" headings found. Use AI for free-form text.');
      return;
    }
    setParsed(cards);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.modalBackdrop}>
        <View style={styles.bulkSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bulk Add Cards</Text>
            <Pressable onPress={close} hitSlop={8}><Text style={styles.modalClose}>Close</Text></Pressable>
          </View>

          <Text style={styles.modalHelp}>
            Paste one card per line, term: definition pairs, or a Markdown deck with "## Card N: Title" headings.
          </Text>

          <TextInput
            style={[styles.input, { minHeight: 140, textAlignVertical: 'top' }]}
            multiline
            value={text}
            onChangeText={(v) => { setText(v); setParsed(null); }}
            placeholder={`Photosynthesis: How plants convert light to food\nMitosis: Cell division producing two identical cells\n\nterm: Osmosis\ndefinition: Water across a membrane`}
            placeholderTextColor={colors.textFaint}
          />

          {error ? <Text style={styles.modalError}>{error}</Text> : null}

          {parsed ? (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={styles.modalHelp}>Found {parsed.length} card{parsed.length !== 1 ? 's' : ''}:</Text>
              <ScrollView style={{ maxHeight: 180 }}>
                {parsed.map((c, i) => (
                  <View key={i} style={styles.previewItem}>
                    <Text style={styles.previewTerm}>{c.term}</Text>
                    {c.definition ? <Text style={styles.previewDef}> - {c.definition}</Text> : null}
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
            {!parsed ? (
              <>
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleParseMarkdown}
                  disabled={!text.trim()}
                >
                  <Text style={styles.smallBtnText}>Markdown deck</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: colors.primary, flex: 1 }]}
                  onPress={handleParseAI}
                  disabled={!text.trim() || parsing}
                >
                  {parsing
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.smallBtnText}>Parse with AI</Text>}
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: colors.inputBg }]}
                  onPress={handleParseSimple}
                  disabled={!text.trim()}
                >
                  <Text style={[styles.smallBtnText, { color: colors.text }]}>Quick parse</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: colors.primary, flex: 1 }]}
                  onPress={() => { onConfirm(parsed); reset(); }}
                >
                  <Text style={styles.smallBtnText}>Add {parsed.length} card{parsed.length !== 1 ? 's' : ''}</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: colors.inputBg }]}
                  onPress={() => setParsed(null)}
                >
                  <Text style={[styles.smallBtnText, { color: colors.text }]}>Edit</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { color: colors.textMuted, fontSize: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  dot: { width: 12, height: 12, borderRadius: 999 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  desc: { color: colors.textDim, marginTop: 4 },
  meta: { color: colors.textFaint, fontSize: 13, marginTop: 6 },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.lg },
  modeBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 80,
    padding: spacing.md,
    borderRadius: radii.lg,
    justifyContent: 'center',
  },
  modeText: { fontWeight: '700', fontSize: 15 },
  modeDesc: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  section: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  bulkBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radii.sm,
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.42)',
    minHeight: layout.touchTarget,
    justifyContent: 'center',
  },
  bulkBtnText: { color: colors.primaryHover, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: 12, color: colors.text, marginBottom: spacing.sm,
    minHeight: layout.touchTarget,
  },
  addBtn: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    minHeight: layout.touchTarget,
  },
  addBtnText: { color: '#fff', fontWeight: '600' },
  cardItem: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  cardIdx: { color: colors.textFaint, fontSize: 11, marginBottom: 4 },
  cardTerm: { color: colors.text, fontWeight: '600' },
  cardDefWrap: { marginTop: 4 },
  cardLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  cardAction: { color: colors.primary, fontSize: 13, fontWeight: '500' },
  emptyCards: { color: colors.textFaint, textAlign: 'center', paddingVertical: spacing.xl },
  smallBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.touchTarget,
  },
  smallBtnText: { color: '#fff', fontWeight: '600' },
  deleteSet: { padding: spacing.md, alignItems: 'center', marginTop: spacing.xl },
  deleteSetText: { color: colors.danger, fontSize: 13 },
  thumb: { width: '100%', height: 160, borderRadius: radii.sm, marginTop: spacing.sm, backgroundColor: colors.inputBg },
  thumbSmall: { width: 64, height: 64, borderRadius: radii.sm, backgroundColor: colors.inputBg },
  imageSlot: { marginTop: 4, marginBottom: spacing.sm },
  imagePick: {
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: radii.sm, padding: 10, alignItems: 'center', justifyContent: 'center',
    minHeight: layout.touchTarget,
  },
  imagePickText: { color: colors.textMuted, fontSize: 13 },
  removeImage: { color: colors.danger, fontSize: 12 },
  expandLink: { color: colors.primary, fontSize: 13, fontWeight: '500' },
  linkRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  removeLink: { color: colors.danger, fontSize: 12, fontWeight: '600', paddingHorizontal: 4 },
  extrasHint: { color: colors.textFaint, fontSize: 11, marginTop: spacing.sm },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  bulkSheet: {
    backgroundColor: colors.card, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
    maxHeight: layout.maxSheetHeight,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  modalTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  modalClose: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  modalHelp: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },
  modalError: { color: '#f87171', fontSize: 13, marginTop: 4 },
  previewItem: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  previewTerm: { color: colors.text, fontSize: 13, fontWeight: '600' },
  previewDef: { color: colors.textMuted, fontSize: 12 },
});
