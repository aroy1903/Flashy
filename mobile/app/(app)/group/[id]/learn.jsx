import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGroup, listFlashcards } from '../../../../lib/db';
import { imagePublicUrl } from '../../../../lib/storage';
import { stripMarkdown } from '../../../../lib/stripMarkdown';
import { colors, layout, radii, spacing } from '../../../../lib/theme';

export default function Learn() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [queue, setQueue] = useState([]);
  const [total, setTotal] = useState(0);
  const [mastered, setMastered] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 });
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [g, c] = await Promise.all([getGroup(id), listFlashcards(id)]);
        setGroup(g);
        const shuffled = [...c].sort(() => Math.random() - 0.5);
        setQueue(shuffled);
        setTotal(shuffled.length);
      } catch (e) {
        Alert.alert('Failed to load', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const know = () => {
    setStats((s) => ({ ...s, correct: s.correct + 1 }));
    const rest = queue.slice(1);
    setMastered((m) => m + 1);
    setFlipped(false);
    if (rest.length === 0) setDone(true);
    else setQueue(rest);
  };

  const dontKnow = () => {
    setStats((s) => ({ ...s, incorrect: s.incorrect + 1 }));
    const [first, ...rest] = queue;
    setQueue([...rest, first]);
    setFlipped(false);
  };

  const restart = async () => {
    setLoading(true);
    try {
      const c = await listFlashcards(id);
      const shuffled = [...c].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setTotal(shuffled.length);
      setMastered(0);
      setStats({ correct: 0, incorrect: 0 });
      setFlipped(false);
      setDone(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={colors.primary} /></View></SafeAreaView>;
  }

  if (!group || total === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.muted}>No cards to learn</Text>
          <Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (done) {
    const totalAttempts = stats.correct + stats.incorrect;
    const accuracy = totalAttempts > 0 ? Math.round((stats.correct / totalAttempts) * 100) : 100;
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.resultsScroll}>
          <View style={styles.trophy}><Text style={styles.trophyText}>OK</Text></View>
          <Text style={styles.resultsTitle}>All mastered</Text>
          <Text style={styles.resultsSub}>{group.name} - {total} cards</Text>

          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={[styles.statVal, { color: colors.success }]}>{stats.correct}</Text>
                <Text style={styles.statLabel}>Got it</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statVal}>{accuracy}%</Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={[styles.statVal, { color: colors.danger }]}>{stats.incorrect}</Text>
                <Text style={styles.statLabel}>Retries</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm, width: '100%' }}>
            <Pressable style={[styles.btn, { backgroundColor: colors.inputBg }]} onPress={restart}>
              <Text style={styles.btnGhostText}>Study again</Text>
            </Pressable>
            <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
              <Text style={styles.btnText}>Back to deck</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const card = queue[0];
  const progress = mastered / total;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>← Back to deck</Text>
        </Pressable>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.subtitle}>Flip and rate. Misses come back.</Text>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.success }]} />
          </View>
          <Text style={styles.progressText}>{mastered} / {total}</Text>
        </View>

        <View style={styles.statsLine}>
          <Text style={styles.statsHint}>{stats.correct} got it</Text>
          <Text style={styles.statsHint}>{stats.incorrect} retries</Text>
          <Text style={[styles.statsHint, { marginLeft: 'auto' }]}>{queue.length} left</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Text style={[styles.cardLabel, flipped && { color: colors.primaryHover }]}>
              {flipped ? 'DEFINITION' : 'TERM'}
            </Text>
            <Pressable onPress={() => setFlipped((f) => !f)} hitSlop={8} style={styles.flipPill}>
              <Text style={styles.flipPillText}>↺ Flip</Text>
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator>
            <Pressable onPress={() => setFlipped((f) => !f)} style={{ width: '100%' }}>
              {flipped ? (
                <>
                  {card.definition_image ? (
                    <Image source={{ uri: imagePublicUrl(card.definition_image) }} style={styles.cardImage} resizeMode="contain" />
                  ) : null}
                  <Text style={styles.cardTextDef}>{stripMarkdown(card.definition || '-')}</Text>
                </>
              ) : (
                <>
                  {card.term_image ? (
                    <Image source={{ uri: imagePublicUrl(card.term_image) }} style={styles.cardImage} resizeMode="contain" />
                  ) : null}
                  <Text style={styles.cardText}>{card.term}</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>

        {flipped ? (
          <View style={styles.actionRow}>
            <Pressable style={[styles.actBtn, styles.actDanger]} onPress={dontKnow}>
              <Text style={[styles.actText, { color: colors.danger }]}>Still learning</Text>
            </Pressable>
            <Pressable style={[styles.actBtn, styles.actSuccess]} onPress={know}>
              <Text style={[styles.actText, { color: colors.success }]}>Got it</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.flipHint}>Flip the card before rating</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted, marginBottom: spacing.sm },
  link: { color: colors.primary, fontWeight: '500' },
  container: { flex: 1, padding: spacing.lg },
  back: { color: colors.textMuted, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.textDim, marginTop: 4, marginBottom: spacing.lg },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  progressTrack: { flex: 1, height: 6, backgroundColor: colors.inputBg, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { color: colors.textMuted, fontSize: 12 },
  statsLine: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statsHint: { color: colors.textFaint, fontSize: 11 },
  card: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.xl, padding: spacing.lg, minHeight: 240,
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  flipPill: {
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.sm,
    borderWidth: 1, borderColor: colors.border,
    minHeight: layout.touchTarget,
    justifyContent: 'center',
  },
  flipPillText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  cardContent: { flexGrow: 1, alignItems: 'stretch', justifyContent: 'center', paddingBottom: spacing.md },
  cardImage: { width: '100%', height: 180, borderRadius: radii.md, backgroundColor: colors.inputBg, marginBottom: spacing.md },
  cardText: { color: colors.text, fontSize: 22, fontWeight: '600', lineHeight: 30 },
  cardTextDef: { color: colors.text, fontSize: 18, lineHeight: 26 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: layout.touchTarget,
  },
  actDanger: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.10)' },
  actSuccess: { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.10)' },
  actText: { fontWeight: '700' },
  flipHint: { color: colors.textFaint, textAlign: 'center', marginTop: spacing.md, fontSize: 12 },

  resultsScroll: { padding: spacing.lg, alignItems: 'center' },
  trophy: {
    width: 72, height: 72, borderRadius: 999, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center', marginVertical: spacing.lg,
  },
  trophyText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  resultsTitle: { color: colors.text, fontSize: 26, fontWeight: '700' },
  resultsSub: { color: colors.textDim, marginTop: 4, marginBottom: spacing.lg },
  statsCard: {
    width: '100%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statCol: { alignItems: 'center' },
  statVal: { color: colors.text, fontSize: 28, fontWeight: '700' },
  statLabel: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
  btn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: layout.touchTarget,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  btnGhostText: { color: colors.textMuted, fontWeight: '600' },
});
