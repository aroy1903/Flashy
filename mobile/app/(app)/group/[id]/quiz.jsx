import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGroup, listFlashcards, saveQuizResult } from '../../../../lib/db';
import { stripMarkdown } from '../../../../lib/stripMarkdown';
import { colors, layout, radii, spacing } from '../../../../lib/theme';

const TYPES = [
  {
    id: 'multiple_choice',
    label: 'Multiple Choice',
    desc: 'Pick the correct answer from 4 options',
    min: 4,
    minLabel: '4 unique definitions',
  },
  {
    id: 'true_false',
    label: 'True / False',
    desc: 'Decide if the pairing is correct',
    min: 2,
    minLabel: '2 unique definitions',
  },
  {
    id: 'written',
    label: 'Written',
    desc: 'Type the answer from memory',
    min: 1,
    minLabel: '1 card',
  },
];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildMultipleChoice(cards) {
  return shuffle(cards).map((c) => {
    const correct = stripMarkdown(c.definition || '');
    const wrong = shuffle(
      [...new Set(
        cards
          .filter((x) => x.id !== c.id)
          .map((x) => stripMarkdown(x.definition || ''))
          .filter((answer) => answer && answer !== correct),
      )],
    )
      .slice(0, 3);
    const options = shuffle([correct, ...wrong]);
    return {
      id: c.id,
      type: 'multiple_choice',
      question: c.term,
      options,
      correct_answer: correct,
    };
  });
}

function buildTrueFalse(cards) {
  return shuffle(cards).map((c) => {
    const showCorrect = Math.random() < 0.5;
    let shown;
    if (showCorrect) {
      shown = stripMarkdown(c.definition || '');
    } else {
      const correct = stripMarkdown(c.definition || '');
      const decoys = cards
        .filter((x) => x.id !== c.id)
        .map((x) => stripMarkdown(x.definition || ''))
        .filter((answer) => answer && answer !== correct);
      shown = decoys[Math.floor(Math.random() * decoys.length)] || correct;
    }
    return {
      id: c.id,
      type: 'true_false',
      question: c.term,
      shown_answer: shown,
      correct_answer: showCorrect,
    };
  });
}

function buildWritten(cards) {
  return shuffle(cards).map((c) => ({
    id: c.id,
    type: 'written',
    question: c.term,
    correct_answer: stripMarkdown(c.definition || ''),
  }));
}

export default function Quiz() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [cards, setCards] = useState([]);
  const [quizType, setQuizType] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [g, c] = await Promise.all([getGroup(id), listFlashcards(id)]);
        setGroup(g);
        setCards(c);
      } catch (e) {
        Alert.alert('Failed to load', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const start = (type) => {
    const def = TYPES.find((t) => t.id === type);
    const answerableCards = cards.filter((c) => stripMarkdown(c.definition || '').trim());
    const uniqueAnswers = new Set(answerableCards.map((c) => stripMarkdown(c.definition || '').trim()));
    const available = type === 'written' ? answerableCards.length : uniqueAnswers.size;
    if (available < def.min) {
      Alert.alert(
        'Not enough cards',
        `Need at least ${def.min} unique definition${def.min > 1 ? 's' : ''} for ${def.label}.`,
      );
      return;
    }
    let qs = [];
    if (type === 'multiple_choice') qs = buildMultipleChoice(answerableCards);
    else if (type === 'true_false') qs = buildTrueFalse(answerableCards);
    else qs = buildWritten(answerableCards);
    setQuestions(qs);
    setAnswers({});
    setIdx(0);
    setDone(false);
    setQuizType(type);
  };

  const score = useMemo(() => {
    return questions.reduce((acc, q) => {
      const a = answers[q.id];
      if (q.type === 'written') {
        if (typeof a !== 'string') return acc;
        return acc + (a.trim().toLowerCase() === String(q.correct_answer).toLowerCase() ? 1 : 0);
      }
      return acc + (a === q.correct_answer ? 1 : 0);
    }, 0);
  }, [questions, answers]);

  const submit = async () => {
    setSaving(true);
    try {
      await saveQuizResult({ group_id: id, score, total: questions.length, quiz_type: quizType });
    } catch {} // best-effort
    setSaving(false);
    setDone(true);
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={colors.primary} /></View></SafeAreaView>;
  }

  // Type selection
  if (!quizType) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.back}>← Back to deck</Text>
          </Pressable>
          <Text style={styles.title}>Quiz</Text>
          <Text style={styles.subtitle}>Choose a quiz type</Text>

          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            {TYPES.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => start(t.id)}
                style={styles.typeCard}
              >
                <Text style={styles.typeLabel}>{t.label}</Text>
                <Text style={styles.typeDesc}>{t.desc}</Text>
                <Text style={styles.typeMin}>Min {t.minLabel}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.resultsScroll}>
          <View style={styles.trophy}><Text style={styles.trophyText}>OK</Text></View>
          <Text style={styles.resultsTitle}>Quiz complete</Text>
          <Text style={styles.resultsSub}>{group?.name}</Text>

          <View style={styles.scoreCard}>
            <Text style={styles.scorePct}>{pct}%</Text>
            <Text style={styles.scoreLine}>{score} of {questions.length} correct</Text>
            <View style={styles.progressTrack}>
              <View style={[
                styles.progressFill,
                { width: `${pct}%`, backgroundColor: pct >= 70 ? colors.success : pct >= 40 ? colors.warning : colors.danger },
              ]} />
            </View>
          </View>

          {questions.map((q) => {
            let ok;
            const a = answers[q.id];
            if (q.type === 'written') {
              ok = (typeof a === 'string') && a.trim().toLowerCase() === String(q.correct_answer).toLowerCase();
            } else {
              ok = a === q.correct_answer;
            }
            const correctText = q.type === 'true_false' ? (q.correct_answer ? 'True' : 'False') : String(q.correct_answer);
            return (
              <View
                key={q.id}
                style={[styles.review, { borderColor: ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' }]}
              >
                <Text style={styles.reviewQ}>{ok ? 'Correct' : 'Review'}: {q.question}</Text>
                {!ok && (
                  <Text style={styles.reviewA}>
                    Correct: <Text style={{ color: colors.success }}>{correctText}</Text>
                  </Text>
                )}
              </View>
            );
          })}

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
            <Pressable
              style={[styles.btn, { backgroundColor: colors.inputBg }]}
              onPress={() => { setQuizType(null); setDone(false); setAnswers({}); setIdx(0); }}
            >
              <Text style={styles.btnGhostText}>Try again</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={() => router.back()}
            >
              <Text style={styles.btnText}>Back to deck</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const q = questions[idx];
  const allAnswered = questions.every((qq) => answers[qq.id] !== undefined && answers[qq.id] !== '');
  const last = idx === questions.length - 1;
  const typeLabel = TYPES.find((t) => t.id === quizType)?.label || 'Quiz';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => { setQuizType(null); }} hitSlop={8}>
          <Text style={styles.back}>← Change quiz type</Text>
        </Pressable>
        <Text style={styles.title}>{typeLabel}</Text>

        <View style={[styles.progressTrack, { marginTop: spacing.lg }]}>
          <View style={[styles.progressFill, { width: `${((idx + 1) / questions.length) * 100}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={styles.qCount}>Question {idx + 1} of {questions.length}</Text>

        <View style={styles.qCard}>
          <Text style={styles.qText}>{q.question}</Text>

          {q.type === 'multiple_choice' && q.options.map((opt, i) => {
            const selected = answers[q.id] === opt;
            return (
              <Pressable
                key={i}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
              >
                <Text style={[styles.optionLetter]}>{String.fromCharCode(65 + i)}</Text>
                <Text style={[styles.optionText, selected && { color: colors.text }]}>{opt}</Text>
              </Pressable>
            );
          })}

          {q.type === 'true_false' && (
            <View>
              <View style={styles.tfShown}>
                <Text style={styles.tfShownLabel}>Proposed definition:</Text>
                <Text style={styles.tfShownText}>{q.shown_answer}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {[true, false].map((val) => {
                  const selected = answers[q.id] === val;
                  const tone = val ? colors.success : colors.danger;
                  return (
                    <Pressable
                      key={String(val)}
                      onPress={() => setAnswers((a) => ({ ...a, [q.id]: val }))}
                      style={[
                        styles.tfBtn,
                        selected && { borderColor: tone, backgroundColor: `${tone}22` },
                      ]}
                    >
                      <Text style={[
                        styles.tfBtnText,
                        selected && { color: tone },
                      ]}>{val ? 'True' : 'False'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {q.type === 'written' && (
            <TextInput
              style={styles.writtenInput}
              value={answers[q.id] || ''}
              onChangeText={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              placeholder="Type your answer..."
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
        </View>

        <View style={styles.nav}>
          <Pressable onPress={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
            <Text style={[styles.navText, idx === 0 && { opacity: 0.3 }]}>Previous</Text>
          </Pressable>
          {last ? (
            <Pressable
              style={[styles.btn, { backgroundColor: colors.primary, opacity: allAnswered ? 1 : 0.4 }]}
              disabled={!allAnswered || saving}
              onPress={submit}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit</Text>}
            </Pressable>
          ) : (
            <Pressable onPress={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}>
              <Text style={styles.navText}>Next</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.dots}>
          {questions.map((qq, i) => {
            const answered = answers[qq.id] !== undefined && answers[qq.id] !== '';
            return (
              <Pressable
                key={qq.id}
                onPress={() => setIdx(i)}
                style={[
                  styles.dot,
                  i === idx ? styles.dotActive : answered ? styles.dotAnswered : styles.dotEmpty,
                ]}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { color: colors.textMuted, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.textDim, marginTop: 4 },

  typeCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: spacing.lg,
  },
  typeLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  typeDesc: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  typeMin: { color: colors.textFaint, fontSize: 11, marginTop: spacing.sm },

  progressTrack: { height: 4, backgroundColor: colors.inputBg, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  qCount: { color: colors.textFaint, fontSize: 12, marginTop: spacing.sm, marginBottom: spacing.lg },
  qCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: spacing.lg,
  },
  qText: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: spacing.lg },

  option: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    padding: spacing.md, marginBottom: spacing.sm,
    minHeight: layout.touchTarget,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionLetter: { color: colors.textFaint, fontFamily: 'Menlo', fontSize: 12, marginTop: 2 },
  optionText: { color: colors.textMuted, flex: 1, fontSize: 14 },

  tfShown: {
    backgroundColor: colors.inputBg, padding: spacing.md, borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  tfShownLabel: { color: colors.textDim, fontSize: 12 },
  tfShownText: { color: colors.text, fontSize: 14, marginTop: 4 },
  tfBtn: {
    flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center',
    minHeight: layout.touchTarget,
  },
  tfBtnText: { color: colors.textMuted, fontWeight: '600' },

  writtenInput: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: 14, color: colors.text, fontSize: 14,
    minHeight: layout.touchTarget,
  },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg },
  navText: { color: colors.textMuted, fontSize: 14 },
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

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.xl, flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 22, backgroundColor: colors.primary },
  dotAnswered: { backgroundColor: 'rgba(20,184,166,0.5)' },
  dotEmpty: { backgroundColor: 'rgba(255,255,255,0.10)' },

  resultsScroll: { padding: spacing.lg, alignItems: 'center' },
  trophy: {
    width: 72, height: 72, borderRadius: 999, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginVertical: spacing.lg,
  },
  trophyText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  resultsTitle: { color: colors.text, fontSize: 26, fontWeight: '700' },
  resultsSub: { color: colors.textDim, marginTop: 4, marginBottom: spacing.lg },
  scoreCard: {
    width: '100%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg,
  },
  scorePct: { color: colors.text, fontSize: 44, fontWeight: '700' },
  scoreLine: { color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  review: {
    width: '100%', borderWidth: 1, borderRadius: radii.md,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  reviewQ: { color: colors.text, fontWeight: '500' },
  reviewA: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
});
