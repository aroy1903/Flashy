import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Modal, ScrollView,
  Image, Linking, Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGroup, listFlashcards } from '../../../../lib/db';
import { explainCard } from '../../../../lib/ai';
import { imagePublicUrl } from '../../../../lib/storage';
import { colors, radii, spacing } from '../../../../lib/theme';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
});

export default function Study() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainText, setExplainText] = useState('');
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState('');
  const [extrasOpen, setExtrasOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [g, c] = await Promise.all([getGroup(id), listFlashcards(id)]);
        setGroup(g); setCards(c);
      } catch (e) {
        Alert.alert('Failed to load', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const resetExplain = () => { setExplainText(''); setExplainError(''); };
  const next = () => { setFlipped(false); resetExplain(); setIdx((i) => (i + 1) % Math.max(cards.length, 1)); };
  const prev = () => { setFlipped(false); resetExplain(); setIdx((i) => (i === 0 ? cards.length - 1 : i - 1)); };
  const shuffle = () => {
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
    setIdx(0); setFlipped(false); resetExplain();
  };

  const onExplain = async () => {
    setExplainOpen(true);
    if (explainText || explainLoading) return;
    setExplainLoading(true);
    setExplainError('');
    try {
      const card = cards[idx];
      const text = await explainCard({ term: card.term, definition: card.definition });
      setExplainText(text);
    } catch (e) {
      setExplainError(e.message);
    } finally {
      setExplainLoading(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={colors.primary} /></View></SafeAreaView>;
  }

  if (!cards.length) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No cards to study</Text>
          <Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const card = cards[idx];
  const progress = ((idx + 1) / cards.length) * 100;
  const sideText = flipped ? card.definition : card.term;
  const sideImage = flipped ? card.definition_image : card.term_image;
  const hasExtras = !!(card.notes || card.external_links?.length);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>← Back to {group?.name}</Text>
        </Pressable>
        <Text style={styles.title}>Study</Text>
        <Text style={styles.subtitle}>Tap card to flip</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Text style={styles.cardLabel}>{flipped ? 'DEFINITION' : 'TERM'}</Text>
            <Pressable onPress={() => setFlipped((f) => !f)} hitSlop={8} style={styles.flipPill}>
              <Text style={styles.flipPillText}>↺ Flip</Text>
            </Pressable>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={flipped ? styles.cardContentBack : styles.cardContent}
            showsVerticalScrollIndicator
          >
            <Pressable onPress={() => setFlipped((f) => !f)} style={{ width: '100%' }}>
              {sideImage ? (
                <Image source={{ uri: imagePublicUrl(sideImage) }} style={styles.cardImage} resizeMode="contain" />
              ) : null}
              {sideText ? (
                flipped ? (
                  <Markdown style={mdStyles}>{sideText}</Markdown>
                ) : (
                  <Text style={styles.cardText}>{sideText}</Text>
                )
              ) : null}
              {!sideText && !sideImage ? <Text style={[styles.cardText, { color: colors.textFaint }]}>—</Text> : null}
            </Pressable>
          </ScrollView>
        </View>

        <View style={styles.controls}>
          <Pressable style={styles.ctrlBtn} onPress={prev}>
            <Text style={styles.ctrlText}>‹</Text>
          </Pressable>
          <Text style={styles.counter}>{idx + 1} / {cards.length}</Text>
          <Pressable style={styles.ctrlBtn} onPress={next}>
            <Text style={styles.ctrlText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.bottomRow}>
          <Pressable style={styles.explainBtn} onPress={onExplain}>
            <Text style={styles.explainText}>✨ Explain with AI</Text>
          </Pressable>
          {hasExtras ? (
            <Pressable style={styles.extrasBtn} onPress={() => setExtrasOpen(true)}>
              <Text style={styles.extrasText}>📝 Notes & links</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.shuffle} onPress={shuffle}>
            <Text style={styles.shuffleText}>Shuffle</Text>
          </Pressable>
        </View>

        <Modal
          visible={explainOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setExplainOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setExplainOpen(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={1}>{card.term}</Text>
                <Pressable onPress={() => setExplainOpen(false)} hitSlop={8}>
                  <Text style={styles.modalClose}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 380 }}>
                {explainLoading && (
                  <View style={{ paddingVertical: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.modalMuted}>Generating explanation…</Text>
                  </View>
                )}
                {!!explainError && <Text style={styles.modalError}>{explainError}</Text>}
                {!explainLoading && !explainError && !!explainText && (
                  <Text style={styles.modalBody}>{explainText}</Text>
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={extrasOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setExtrasOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setExtrasOpen(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={1}>Notes & links</Text>
                <Pressable onPress={() => setExtrasOpen(false)} hitSlop={8}>
                  <Text style={styles.modalClose}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 420 }}>
                {card.notes ? (
                  <View style={{ marginBottom: spacing.md }}>
                    <Text style={styles.extrasHeader}>NOTES</Text>
                    <Text style={styles.modalBody}>{card.notes}</Text>
                  </View>
                ) : null}
                {card.external_links?.length ? (
                  <View>
                    <Text style={styles.extrasHeader}>LINKS</Text>
                    {card.external_links.map((l, i) => (
                      <Pressable key={i} onPress={() => l.url && Linking.openURL(l.url)} style={styles.linkChip}>
                        <Text style={styles.linkLabel}>{l.label || l.url}</Text>
                        {l.label ? <Text style={styles.linkUrl} numberOfLines={1}>{l.url}</Text> : null}
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, marginBottom: spacing.sm },
  link: { color: colors.primary, fontWeight: '500' },
  container: { flex: 1, padding: spacing.lg },
  back: { color: colors.textMuted, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.textDim, marginTop: 4, marginBottom: spacing.lg },
  progressTrack: { height: 4, backgroundColor: colors.inputBg, borderRadius: 2, overflow: 'hidden', marginBottom: spacing.lg },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  card: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.xl, padding: spacing.lg,
    minHeight: 240,
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardContent: { flexGrow: 1, alignItems: 'stretch', justifyContent: 'center', gap: spacing.md, paddingBottom: spacing.md },
  cardContentBack: { flexGrow: 1, alignItems: 'stretch', justifyContent: 'flex-start', gap: spacing.md, paddingBottom: spacing.md },
  cardImage: { width: '100%', height: 220, borderRadius: radii.md, backgroundColor: colors.inputBg, marginBottom: spacing.sm },
  cardLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  flipPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flipPillText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  cardText: { color: colors.text, fontSize: 22, fontWeight: '600', textAlign: 'left', lineHeight: 30 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.xl },
  ctrlBtn: {
    width: 56, height: 56, borderRadius: 999, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  ctrlText: { color: colors.text, fontSize: 28 },
  counter: { color: colors.textMuted, fontWeight: '600', minWidth: 80, textAlign: 'center' },
  shuffle: { padding: spacing.sm },
  shuffleText: { color: colors.textMuted, fontSize: 13 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, gap: spacing.sm, flexWrap: 'wrap' },
  explainBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radii.md,
  },
  explainText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  extrasBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
  },
  extrasText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.lg,
  },
  modalCard: {
    width: '100%', maxWidth: 520,
    backgroundColor: colors.card, borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  modalTitle: { color: colors.text, fontWeight: '700', fontSize: 15, flex: 1, marginRight: spacing.md },
  modalClose: { color: colors.textMuted, fontSize: 18 },
  modalBody: { color: colors.text, fontSize: 14, lineHeight: 21 },
  modalMuted: { color: colors.textMuted, fontSize: 13 },
  modalError: { color: '#f87171', fontSize: 13 },
  extrasHeader: { color: colors.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },
  linkChip: {
    backgroundColor: colors.inputBg, borderRadius: radii.sm, padding: spacing.sm, marginBottom: spacing.sm,
  },
  linkLabel: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  linkUrl: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
});

const mdStyles = {
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  paragraph: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 0, marginBottom: 8 },
  heading1: { color: colors.text, fontSize: 19, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  heading2: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  heading3: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  strong: { color: colors.text, fontWeight: '700' },
  em: { color: colors.textMuted, fontStyle: 'italic' },
  hr: { backgroundColor: colors.borderStrong, height: 1, marginVertical: 12 },
  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
  list_item: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: 2 },
  code_inline: {
    color: colors.primaryHover,
    backgroundColor: colors.inputBg,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontFamily: monoFont,
    fontSize: 13,
  },
  code_block: {
    color: colors.text,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    fontFamily: monoFont,
    fontSize: 12,
    marginVertical: 8,
  },
  fence: {
    color: colors.text,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    fontFamily: monoFont,
    fontSize: 12,
    marginVertical: 8,
  },
  blockquote: {
    backgroundColor: 'transparent',
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    paddingLeft: 10,
    marginVertical: 8,
  },
  table: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 6, marginVertical: 8 },
  thead: { backgroundColor: colors.inputBg },
  tr: { borderBottomWidth: 1, borderColor: colors.borderStrong },
  th: { padding: 6 },
  td: { padding: 6 },
  link: { color: colors.primary, textDecorationLine: 'underline' },
};
