// Thin shim over Supabase helpers — preserves the { data } return shape used
// by existing pages so call sites don't need to change. All data access goes
// through @supabase/supabase-js (see ./lib/*).
import * as db from './lib/db';
import * as ai from './lib/ai';
import { uploadCardImage, imagePublicUrl } from './lib/storage';
import { supabase } from './lib/supabase';

const wrap = (data) => ({ data });

// ── Groups ──────────────────────────────────────────────────────────────────
export const getGroups = async () => wrap(await db.listGroups());
export const getGroup = async (id) => wrap(await db.getGroup(id));
export const createGroup = async (data) => wrap(await db.createGroup(data));
export const updateGroup = async (id, data) => wrap(await db.updateGroup(id, data));
export const deleteGroup = async (id) => {
  await db.deleteGroup(id);
  return wrap(null);
};

// ── Flashcards ──────────────────────────────────────────────────────────────
export const getFlashcards = async (groupId) => wrap(await db.listFlashcards(groupId));

// FormData-based shim: pages still build FormData; we extract fields, upload
// any image File to Supabase storage, and insert the row.
async function formDataToCardPatch(formData, groupId) {
  const patch = {};
  for (const [key, value] of formData.entries()) {
    if (key === 'group_id' || key === 'position') continue;
    if (key === 'clear_term_image') { patch.term_image = null; continue; }
    if (key === 'clear_definition_image') { patch.definition_image = null; continue; }
    if (key === 'external_links') {
      try { patch.external_links = JSON.parse(value); } catch { patch.external_links = []; }
      continue;
    }
    if ((key === 'term_image' || key === 'definition_image') && value instanceof File) {
      const side = key === 'term_image' ? 'term' : 'definition';
      patch[key] = await uploadCardImage({ groupId, side, file: value });
      continue;
    }
    patch[key] = value;
  }
  return patch;
}

export const createFlashcard = async (formData) => {
  const group_id = formData.get('group_id');
  const positionRaw = formData.get('position');
  const position = positionRaw != null ? Number(positionRaw) : 0;
  const patch = await formDataToCardPatch(formData, group_id);
  return wrap(await db.createFlashcard({ group_id, position, ...patch }));
};

export const updateFlashcard = async (id, formData) => {
  let groupId = formData.get('group_id');
  if (!groupId) {
    const { data } = await supabase
      .from('flashcards')
      .select('group_id')
      .eq('id', id)
      .single();
    groupId = data?.group_id;
  }
  const patch = await formDataToCardPatch(formData, groupId);
  return wrap(await db.updateFlashcard(id, patch));
};

export const deleteFlashcard = async (id) => {
  await db.deleteFlashcard(id);
  return wrap(null);
};

export const bulkCreateFlashcards = async ({ group_id, cards }) =>
  wrap(await db.bulkCreateFlashcards(group_id, cards));

export const parseBulkCards = async ({ text }) =>
  wrap({ cards: await ai.parseBulkCards(text) });

export const explainCard = async ({ term, definition }) =>
  wrap({ explanation: await ai.explainCard({ term, definition }) });

// ── Quizzes ─────────────────────────────────────────────────────────────────
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export const generateQuiz = async (groupId, type = 'multiple_choice') => {
  const cards = shuffle(await db.listFlashcards(groupId));
  if (cards.length < 1) throw new Error('No flashcards in this set');
  if (type === 'multiple_choice' && cards.length < 4) {
    throw new Error('Need at least 4 flashcards for multiple choice quiz');
  }
  if (type === 'true_false' && cards.length < 2) {
    throw new Error('Need at least 2 flashcards for true/false quiz');
  }

  let questions = [];
  if (type === 'multiple_choice') {
    questions = cards.map((card) => {
      const wrongAnswers = shuffle(cards.filter((c) => c.id !== card.id))
        .slice(0, 3)
        .map((c) => c.definition);
      const options = shuffle([...wrongAnswers, card.definition]);
      return {
        id: crypto.randomUUID(),
        card_id: card.id,
        question: card.term,
        question_image: card.term_image,
        correct_answer: card.definition,
        options,
        type: 'multiple_choice',
      };
    });
  } else if (type === 'true_false') {
    questions = cards.map((card) => {
      const isTrue = Math.random() > 0.5;
      const wrongCard = cards.find((c) => c.id !== card.id);
      const shownDefinition = isTrue ? card.definition : (wrongCard?.definition || card.definition);
      return {
        id: crypto.randomUUID(),
        card_id: card.id,
        question: card.term,
        question_image: card.term_image,
        shown_answer: shownDefinition,
        correct_answer: isTrue,
        type: 'true_false',
      };
    });
  } else if (type === 'written') {
    questions = cards.map((card) => ({
      id: crypto.randomUUID(),
      card_id: card.id,
      question: card.term,
      question_image: card.term_image,
      correct_answer: card.definition,
      type: 'written',
    }));
  }
  return wrap({ questions, total: questions.length });
};

export const saveQuizResult = async (data) => wrap(await db.saveQuizResult(data));

// ── Image URLs ──────────────────────────────────────────────────────────────
// Replaces the old server `/uploads/<file>` URL. Storage paths now look like
// `<userId>/<groupId>/<side>-<ts>.<ext>`; legacy values that already start
// with http(s) are passed through.
export const uploadUrl = (path) => imagePublicUrl(path);
