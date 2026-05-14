import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGroup, listFlashcards } from '../../../../lib/db';
import { stripMarkdown } from '../../../../lib/stripMarkdown';
import { colors, layout, radii, spacing } from '../../../../lib/theme';

const MAX_CARDS = 6;

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function Match() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState(new Set());
  const [wrongPair, setWrongPair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState('idle'); // idle, playing, done
  const [time, setTime] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const timerRef = useRef(null);
  const wrongRef = useRef(null);
  const originalRef = useRef([]);

  useEffect(() => {
    (async () => {
      try {
        const [g, c] = await Promise.all([getGroup(id), listFlashcards(id)]);
        setGroup(g);
        originalRef.current = c;
        buildTiles(c);
      } catch (e) {
        Alert.alert('Failed to load', e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(wrongRef.current);
    };
  }, [id]);

  const buildTiles = (cards) => {
    const picked = cards
      .filter((card) => stripMarkdown(card.definition || '').trim())
      .slice(0, MAX_CARDS);
    const next = [];
    picked.forEach((card) => {
      next.push({ tileId: `t-${card.id}`, text: card.term, cardId: card.id });
      next.push({ tileId: `d-${card.id}`, text: stripMarkdown(card.definition || ''), cardId: card.id });
    });
    setTiles(shuffle(next));
    setSelected(null);
    setMatched(new Set());
    setWrongPair(null);
    setTime(0);
    setAttempts(0);
    setGameState('idle');
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  };

  const handleTile = (tile) => {
    if (matched.has(tile.cardId)) return;
    if (wrongPair) return;
    if (gameState === 'idle') { setGameState('playing'); startTimer(); }

    if (!selected) { setSelected(tile); return; }
    if (selected.tileId === tile.tileId) { setSelected(null); return; }

    setAttempts((a) => a + 1);

    if (selected.cardId === tile.cardId) {
      const next = new Set([...matched, tile.cardId]);
      setMatched(next);
      setSelected(null);
      if (next.size === tiles.length / 2) {
        clearInterval(timerRef.current);
        setGameState('done');
      }
    } else {
      setWrongPair({ a: selected.tileId, b: tile.tileId });
      wrongRef.current = setTimeout(() => {
        setWrongPair(null);
        setSelected(null);
      }, 700);
    }
  };

  const restart = () => {
    clearInterval(timerRef.current);
    clearTimeout(wrongRef.current);
    buildTiles(originalRef.current);
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const accuracy = attempts > 0 ? Math.round((matched.size / attempts) * 100) : 100;

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={colors.primary} /></View></SafeAreaView>;
  }

  if (tiles.length < 2) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.muted}>Need at least 1 card with a definition</Text>
          <Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (gameState === 'done') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.resultsScroll}>
          <View style={[styles.trophy, { backgroundColor: colors.success }]}><Text style={styles.trophyText}>OK</Text></View>
          <Text style={styles.resultsTitle}>All matched</Text>
          <Text style={styles.resultsSub}>{group.name}</Text>

          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statVal}>{fmtTime(time)}</Text>
                <Text style={styles.statLabel}>Time</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={[styles.statVal, { color: colors.success }]}>{accuracy}%</Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statVal}>{attempts}</Text>
                <Text style={styles.statLabel}>Attempts</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm, width: '100%' }}>
            <Pressable style={[styles.btn, { backgroundColor: colors.inputBg }]} onPress={restart}>
              <Text style={styles.btnGhostText}>Play again</Text>
            </Pressable>
            <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
              <Text style={styles.btnText}>Back to deck</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>← Back to deck</Text>
        </Pressable>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Match</Text>
            <Text style={styles.subtitle}>Tap two tiles that belong together.</Text>
          </View>
          <View style={styles.statsRight}>
            <Text style={styles.timer}>{fmtTime(time)}</Text>
            <Text style={styles.matchCount}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{matched.size}</Text>
              <Text> / {tiles.length / 2}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          {tiles.map((tile) => {
            const isMatched = matched.has(tile.cardId);
            const isSelected = selected?.tileId === tile.tileId;
            const isWrong = wrongPair?.a === tile.tileId || wrongPair?.b === tile.tileId;
            return (
              <Pressable
                key={tile.tileId}
                onPress={() => !isMatched && handleTile(tile)}
                style={[
                  styles.tile,
                  isMatched && styles.tileMatched,
                  isWrong && styles.tileWrong,
                  isSelected && !isWrong && styles.tileSelected,
                ]}
              >
                <Text
                  style={[
                    styles.tileText,
                    isMatched && { color: 'transparent' },
                    isSelected && { color: colors.text },
                    isWrong && { color: '#fca5a5' },
                  ]}
                  numberOfLines={4}
                >
                  {tile.text}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.progressTrack}>
          <View style={[
            styles.progressFill,
            { width: `${(matched.size / (tiles.length / 2)) * 100}%`, backgroundColor: colors.success },
          ]} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted, marginBottom: spacing.sm },
  link: { color: colors.primary, fontWeight: '500' },
  back: { color: colors.textMuted, marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.textDim, marginTop: 4, fontSize: 13 },
  statsRight: { alignItems: 'flex-end', gap: 4 },
  timer: { color: colors.textMuted, fontFamily: 'Menlo', fontSize: 13 },
  matchCount: { color: colors.textDim, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    justifyContent: 'center',
  },
  tileSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  tileWrong: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(239,68,68,0.10)',
  },
  tileMatched: {
    borderColor: 'rgba(34,197,94,0.20)',
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  tileText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  progressTrack: {
    marginTop: spacing.lg,
    height: 4, backgroundColor: colors.inputBg, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  resultsScroll: { padding: spacing.lg, alignItems: 'center' },
  trophy: {
    width: 72, height: 72, borderRadius: 999,
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
  statVal: { color: colors.text, fontSize: 24, fontWeight: '700' },
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
