import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Modal, ScrollView,
  Image, Linking, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGroup, listFlashcards } from '../../../../lib/db';
import { explainCard, chatAboutCard } from '../../../../lib/ai';
import { imagePublicUrl } from '../../../../lib/storage';
import { colors, layout, radii, spacing } from '../../../../lib/theme';
import MarkdownText from '../../../../lib/MarkdownText';

export default function Study() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [messages, setMessages] = useState([]); // [{ role: 'assistant'|'user', content }]
  const [explainLoading, setExplainLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [explainError, setExplainError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [extrasOpen, setExtrasOpen] = useState(false);
  const chatScrollRef = useRef(null);

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

  const resetExplain = () => { setMessages([]); setExplainError(''); setChatInput(''); };
  const next = () => { setFlipped(false); resetExplain(); setIdx((i) => (i + 1) % Math.max(cards.length, 1)); };
  const prev = () => { setFlipped(false); resetExplain(); setIdx((i) => (i === 0 ? cards.length - 1 : i - 1)); };
  const shuffle = () => {
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
    setIdx(0); setFlipped(false); resetExplain();
  };

  const scrollChatToEnd = () => {
    requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd?.({ animated: true }));
  };

  const onExplain = async () => {
    setExplainOpen(true);
    if (messages.length || explainLoading) return;
    setExplainLoading(true);
    setExplainError('');
    try {
      const card = cards[idx];
      const text = await explainCard({ term: card.term, definition: card.definition });
      setMessages([{ role: 'assistant', content: text }]);
      scrollChatToEnd();
    } catch (e) {
      setExplainError(e.message);
    } finally {
      setExplainLoading(false);
    }
  };

  const onSendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatSending || explainLoading) return;
    const card = cards[idx];
    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setChatInput('');
    setChatSending(true);
    setExplainError('');
    scrollChatToEnd();
    try {
      const reply = await chatAboutCard({
        term: card.term,
        definition: card.definition,
        messages: nextMessages,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      scrollChatToEnd();
    } catch (e) {
      setExplainError(e.message);
    } finally {
      setChatSending(false);
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
          <Text style={styles.back}>← Back to deck</Text>
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
                  <MarkdownText size="md">{sideText}</MarkdownText>
                ) : (
                  <Text style={styles.cardText}>{sideText}</Text>
                )
              ) : null}
              {!sideText && !sideImage ? <Text style={[styles.cardText, { color: colors.textFaint }]}>-</Text> : null}
            </Pressable>
          </ScrollView>
        </View>

        <View style={styles.controls}>
          <Pressable style={styles.ctrlBtn} onPress={prev}>
            <Text style={styles.ctrlText}>Prev</Text>
          </Pressable>
          <Text style={styles.counter}>{idx + 1} / {cards.length}</Text>
          <Pressable style={styles.ctrlBtn} onPress={next}>
            <Text style={styles.ctrlText}>Next</Text>
          </Pressable>
        </View>

        <View style={styles.bottomRow}>
          <Pressable style={styles.explainBtn} onPress={onExplain}>
            <Text style={styles.explainText}>Explain with AI</Text>
          </Pressable>
          {hasExtras ? (
            <Pressable style={styles.extrasBtn} onPress={() => setExtrasOpen(true)}>
              <Text style={styles.extrasText}>Notes & links</Text>
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
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.chatKav}
              pointerEvents="box-none"
            >
              <Pressable style={styles.chatCard} onPress={() => {}}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={1}>{card.term}</Text>
                  <Pressable onPress={() => setExplainOpen(false)} hitSlop={8}>
                    <Text style={styles.modalClose}>Close</Text>
                  </Pressable>
                </View>
                <ScrollView
                  ref={chatScrollRef}
                  style={styles.chatScroll}
                  contentContainerStyle={{ paddingVertical: spacing.sm, gap: spacing.sm }}
                  onContentSizeChange={scrollChatToEnd}
                >
                  {explainLoading && messages.length === 0 && (
                    <View style={{ paddingVertical: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.modalMuted}>Generating explanation...</Text>
                    </View>
                  )}
                  {messages.map((m, i) => (
                    <View
                      key={i}
                      style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}
                    >
                      <Text style={m.role === 'user' ? styles.bubbleUserText : styles.bubbleAiText}>
                        {m.content}
                      </Text>
                    </View>
                  ))}
                  {chatSending && (
                    <View style={[styles.bubble, styles.bubbleAi, { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }]}>
                      <ActivityIndicator color={colors.primary} size="small" />
                      <Text style={styles.modalMuted}>Thinking...</Text>
                    </View>
                  )}
                  {!!explainError && <Text style={styles.modalError}>{explainError}</Text>}
                </ScrollView>
                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatInput}
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder="Ask a follow-up..."
                    placeholderTextColor={colors.textFaint}
                    multiline
                    editable={!explainLoading}
                    onSubmitEditing={onSendChat}
                    blurOnSubmit
                  />
                  <Pressable
                    style={[
                      styles.chatSendBtn,
                      (!chatInput.trim() || chatSending || explainLoading) && styles.chatSendBtnDisabled,
                    ]}
                    onPress={onSendChat}
                    disabled={!chatInput.trim() || chatSending || explainLoading}
                  >
                    <Text style={styles.chatSendText}>Send</Text>
                  </Pressable>
                </View>
              </Pressable>
            </KeyboardAvoidingView>
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
                  <Text style={styles.modalClose}>Close</Text>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
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
    minHeight: layout.touchTarget,
    justifyContent: 'center',
  },
  flipPillText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  cardText: { color: colors.text, fontSize: 22, fontWeight: '600', textAlign: 'left', lineHeight: 30 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.xl },
  ctrlBtn: {
    width: 56, height: 56, borderRadius: 999, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  ctrlText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  counter: { color: colors.textMuted, fontWeight: '600', minWidth: 80, textAlign: 'center' },
  shuffle: { padding: spacing.sm, minHeight: layout.touchTarget, justifyContent: 'center' },
  shuffleText: { color: colors.textMuted, fontSize: 13 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, gap: spacing.sm, flexWrap: 'wrap' },
  explainBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radii.md,
    minHeight: layout.touchTarget,
  },
  explainText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  extrasBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    minHeight: layout.touchTarget,
    justifyContent: 'center',
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
    maxHeight: layout.maxSheetHeight,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  modalTitle: { color: colors.text, fontWeight: '700', fontSize: 15, flex: 1, marginRight: spacing.md },
  modalClose: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  modalBody: { color: colors.text, fontSize: 14, lineHeight: 21 },
  modalMuted: { color: colors.textMuted, fontSize: 13 },
  modalError: { color: '#f87171', fontSize: 13 },
  extrasHeader: { color: colors.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },
  linkChip: {
    backgroundColor: colors.inputBg, borderRadius: radii.sm, padding: spacing.sm, marginBottom: spacing.sm,
  },
  linkLabel: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  linkUrl: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  chatKav: { width: '100%', maxWidth: 520, maxHeight: '85%' },
  chatCard: {
    width: '100%', flexShrink: 1,
    backgroundColor: colors.card, borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  chatScroll: { flexGrow: 0, maxHeight: 380, marginBottom: spacing.sm },
  bubble: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radii.md, maxWidth: '92%',
  },
  bubbleAi: { backgroundColor: colors.inputBg, alignSelf: 'flex-start' },
  bubbleUser: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleAiText: { color: colors.text, fontSize: 14, lineHeight: 21 },
  bubbleUserText: { color: '#fff', fontSize: 14, lineHeight: 21 },
  chatInputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm,
  },
  chatInput: {
    flex: 1, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text, maxHeight: 120, minHeight: layout.touchTarget,
  },
  chatSendBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.md,
    borderRadius: radii.md, alignItems: 'center', justifyContent: 'center',
    minHeight: layout.touchTarget,
  },
  chatSendBtnDisabled: { opacity: 0.5 },
  chatSendText: { color: '#fff', fontWeight: '600' },
});
