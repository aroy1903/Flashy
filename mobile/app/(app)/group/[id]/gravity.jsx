import { useEffect, useReducer, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGroup, listFlashcards } from '../../../../lib/db';
import { stripMarkdown } from '../../../../lib/stripMarkdown';
import { colors, radii, spacing } from '../../../../lib/theme';

function getSpeed(score) {
  return Math.min(0.35 + Math.floor(score / 4) * 0.18, 2.4);
}
function getLevel(score) {
  return Math.floor(score / 4) + 1;
}

const initial = {
  cards: [],
  currentIdx: 0,
  progress: 0,
  lives: 3,
  score: 0,
  gameState: 'idle', // idle, playing, won, lost
  feedback: null,    // null | 'correct' | 'wrong'
};

function reducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return { ...initial, cards: action.cards };
    case 'START': {
      const shuffled = [...state.cards].sort(() => Math.random() - 0.5);
      return { ...initial, cards: shuffled, gameState: 'playing' };
    }
    case 'TICK': {
      if (state.gameState !== 'playing') return state;
      const np = state.progress + getSpeed(state.score);
      if (np >= 100) {
        const lives = state.lives - 1;
        if (lives <= 0) return { ...state, gameState: 'lost', lives: 0, progress: 100, feedback: 'wrong' };
        const next = state.currentIdx + 1;
        if (next >= state.cards.length) return { ...state, gameState: 'won', lives };
        return { ...state, lives, currentIdx: next, progress: 0, feedback: 'wrong' };
      }
      return { ...state, progress: np };
    }
    case 'CORRECT': {
      const score = state.score + 1;
      const next = state.currentIdx + 1;
      if (next >= state.cards.length) return { ...state, score, gameState: 'won', feedback: 'correct' };
      return { ...state, score, currentIdx: next, progress: 0, feedback: 'correct' };
    }
    case 'WRONG':
      return { ...state, feedback: 'wrong' };
    case 'CLEAR_FEEDBACK':
      return { ...state, feedback: null };
    default:
      return state;
  }
}

export default function Gravity() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [game, dispatch] = useReducer(reducer, initial);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [g, c] = await Promise.all([getGroup(id), listFlashcards(id)]);
        setGroup(g);
        dispatch({ type: 'INIT', cards: c });
      } catch (e) {
        Alert.alert('Failed to load', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // tick
  useEffect(() => {
    if (game.gameState !== 'playing') return;
    const i = setInterval(() => dispatch({ type: 'TICK' }), 100);
    return () => clearInterval(i);
  }, [game.gameState]);

  // clear feedback
  useEffect(() => {
    if (!game.feedback) return;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_FEEDBACK' }), 500);
    return () => clearTimeout(t);
  }, [game.feedback]);

  // reset input on new card
  useEffect(() => {
    setInput('');
    if (game.gameState === 'playing') {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [game.currentIdx, game.gameState]);

  const submit = () => {
    if (game.gameState !== 'playing' || !input.trim()) return;
    const card = game.cards[game.currentIdx];
    const correct = stripMarkdown(card.definition || '').toLowerCase();
    const answer = input.trim().toLowerCase();
    if (answer === correct) {
      dispatch({ type: 'CORRECT' });
    } else {
      dispatch({ type: 'WRONG' });
      setInput('');
    }
  };

  const start = () => dispatch({ type: 'START' });

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={colors.primary} /></View></SafeAreaView>;
  }

  if (!group || game.cards.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.muted}>No cards to play Gravity</Text>
          <Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (game.gameState === 'idle') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.back}>← Back to {group.name}</Text>
          </Pressable>
          <Text style={styles.title}>Gravity</Text>
          <Text style={styles.subtitle}>Type the definition before the term hits the ground.</Text>

          <View style={styles.idleCard}>
            <View style={styles.idleZap}><Text style={styles.idleZapText}>⚡</Text></View>
            <Text style={styles.idleTitle}>How to Play</Text>
            <View style={{ marginTop: spacing.md, gap: 8, alignSelf: 'stretch' }}>
              <Text style={styles.rule}><Text style={styles.ruleArrow}>→</Text> A term falls from the top</Text>
              <Text style={styles.rule}><Text style={styles.ruleArrow}>→</Text> Type its definition and press Enter</Text>
              <Text style={styles.rule}><Text style={styles.ruleArrow}>→</Text> If it hits the ground you lose a life</Text>
              <Text style={styles.rule}><Text style={styles.ruleArrow}>→</Text> 3 lives — speed +18% every 4 right</Text>
            </View>
            <Text style={styles.idleFoot}>{game.cards.length} cards · needs exact match</Text>
            <Pressable style={styles.startBtn} onPress={start}>
              <Text style={styles.startBtnText}>Start Game</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (game.gameState === 'won' || game.gameState === 'lost') {
    const lost = game.gameState === 'lost';
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.resultsScroll}>
          <View style={[styles.trophy, { backgroundColor: lost ? colors.danger : '#f97316' }]}>
            <Text style={styles.trophyText}>{lost ? '💀' : '🏆'}</Text>
          </View>
          <Text style={styles.resultsTitle}>{lost ? 'Game Over' : 'You Won!'}</Text>
          <Text style={styles.resultsSub}>{group.name}</Text>

          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={[styles.statVal, { color: '#fdba74' }]}>{game.score}</Text>
                <Text style={styles.statLabel}>Score</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statVal}>Lv {getLevel(game.score)}</Text>
                <Text style={styles.statLabel}>{lost ? 'Reached' : 'Max'}</Text>
              </View>
              {!lost && (
                <View style={styles.statCol}>
                  <Text style={[styles.statVal, { color: colors.danger }]}>{3 - game.lives}</Text>
                  <Text style={styles.statLabel}>Lost</Text>
                </View>
              )}
            </View>
            {lost && game.cards[game.currentIdx] && (
              <View style={styles.answerBox}>
                <Text style={styles.answerLabel}>The answer was:</Text>
                <Text style={styles.answerText}>{stripMarkdown(game.cards[game.currentIdx].definition || '')}</Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm, width: '100%' }}>
            <Pressable
              style={[styles.btn, { backgroundColor: lost ? '#f97316' : colors.inputBg }]}
              onPress={start}
            >
              <Text style={styles.btnText}>{lost ? 'Try again' : 'Play again'}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: colors.inputBg }]}
              onPress={() => router.back()}
            >
              <Text style={styles.btnGhostText}>Back to set</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Active game
  const currentCard = game.cards[game.currentIdx];
  const visualY = Math.min(game.progress * 0.82, 82);
  const isWrong = game.feedback === 'wrong';
  const isCorrect = game.feedback === 'correct';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, padding: spacing.lg }}>
          <View style={styles.gameHeader}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.back}>← Quit</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Text style={styles.headStat}>Lv <Text style={{ color: '#fdba74', fontWeight: '700' }}>{getLevel(game.score)}</Text></Text>
              <Text style={styles.headStat}>Score <Text style={{ color: colors.text, fontWeight: '700' }}>{game.score}</Text></Text>
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {[0, 1, 2].map((i) => (
                  <Text key={i} style={{ color: i < game.lives ? colors.danger : colors.textFaint }}>♥</Text>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.cardCountRow}>
            <Text style={styles.cardCountText}>{game.currentIdx + 1} / {game.cards.length}</Text>
            <View style={styles.cardCountTrack}>
              <View style={[styles.cardCountFill, { width: `${(game.currentIdx / game.cards.length) * 100}%` }]} />
            </View>
          </View>

          <View
            style={[
              styles.fallArea,
              isWrong && { borderColor: 'rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.05)' },
              isCorrect && { borderColor: 'rgba(34,197,94,0.5)', backgroundColor: 'rgba(34,197,94,0.05)' },
            ]}
          >
            <View style={styles.dangerZone} />
            <View style={[styles.fallingTerm, { top: `${visualY}%` }]}>
              <Text
                style={[
                  styles.fallText,
                  isWrong && { color: '#fca5a5' },
                  isCorrect && { color: '#86efac' },
                ]}
              >
                {currentCard.term}
              </Text>
            </View>
            <Text style={styles.speedTag}>{getSpeed(game.score).toFixed(1)}x</Text>
          </View>

          <View style={styles.timeBar}>
            <View
              style={[
                styles.timeFill,
                {
                  width: `${100 - game.progress}%`,
                  backgroundColor: game.progress > 75 ? colors.danger : game.progress > 50 ? '#f97316' : '#fb923c',
                },
              ]}
            />
          </View>

          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={submit}
            placeholder="Type the definition and press Enter…"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            blurOnSubmit={false}
            returnKeyType="send"
            style={[
              styles.input,
              isWrong && { borderColor: 'rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.05)' },
              isCorrect && { borderColor: 'rgba(34,197,94,0.5)', backgroundColor: 'rgba(34,197,94,0.05)' },
            ]}
          />
          <Text style={styles.inputHint}>Press Enter to submit</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted, marginBottom: spacing.sm },
  link: { color: colors.primary, fontWeight: '500' },
  back: { color: colors.textMuted },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: spacing.md },
  subtitle: { color: colors.textDim, marginTop: 4, marginBottom: spacing.lg, fontSize: 13 },

  idleCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.xl, padding: spacing.xl, alignItems: 'center',
  },
  idleZap: {
    width: 56, height: 56, borderRadius: radii.lg,
    backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  idleZapText: { fontSize: 28 },
  idleTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  rule: { color: colors.textMuted, fontSize: 13 },
  ruleArrow: { color: '#fb923c' },
  idleFoot: { color: colors.textFaint, fontSize: 11, marginTop: spacing.lg, marginBottom: spacing.md },
  startBtn: { backgroundColor: '#f97316', paddingVertical: 12, paddingHorizontal: 32, borderRadius: radii.md },
  startBtnText: { color: '#fff', fontWeight: '700' },

  gameHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  headStat: { color: colors.textDim, fontSize: 12 },
  cardCountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  cardCountText: { color: colors.textFaint, fontSize: 11 },
  cardCountTrack: { flex: 1, height: 4, backgroundColor: colors.inputBg, borderRadius: 2, overflow: 'hidden' },
  cardCountFill: { height: '100%', backgroundColor: 'rgba(249,115,22,0.5)' },

  fallArea: {
    flex: 1,
    minHeight: 220,
    borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, marginBottom: spacing.md,
    position: 'relative', overflow: 'hidden',
  },
  dangerZone: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 60, backgroundColor: 'rgba(239,68,68,0.10)',
  },
  fallingTerm: {
    position: 'absolute', left: 0, right: 0, paddingHorizontal: spacing.lg, alignItems: 'center',
  },
  fallText: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  speedTag: { position: 'absolute', top: 8, right: 8, color: colors.textFaint, fontSize: 10 },

  timeBar: { width: '100%', height: 6, backgroundColor: colors.inputBg, borderRadius: 3, overflow: 'hidden', marginBottom: spacing.md },
  timeFill: { height: '100%', borderRadius: 3 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: radii.md, padding: 14, color: colors.text, fontSize: 14,
  },
  inputHint: { color: colors.textFaint, fontSize: 11, textAlign: 'center', marginTop: 6 },

  resultsScroll: { padding: spacing.lg, alignItems: 'center' },
  trophy: {
    width: 72, height: 72, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', marginVertical: spacing.lg,
  },
  trophyText: { fontSize: 32 },
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
  answerBox: { backgroundColor: colors.inputBg, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  answerLabel: { color: colors.textFaint, fontSize: 11, marginBottom: 4 },
  answerText: { color: colors.textMuted, fontSize: 13 },
  btn: { paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: radii.md, alignItems: 'center', flex: 1 },
  btnText: { color: '#fff', fontWeight: '600' },
  btnGhostText: { color: colors.textMuted, fontWeight: '600' },
});
