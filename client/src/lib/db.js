import { supabase } from './supabase';

export async function listGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, description, color, updated_at, flashcards(count)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((g) => ({
    ...g,
    card_count: g.flashcards?.[0]?.count ?? 0,
  }));
}

export async function getGroup(id) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createGroup({ name, description, color }) {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, description: description || null, color: color || '#6366f1' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGroup(id, patch) {
  const { data, error } = await supabase
    .from('groups')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGroup(id) {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw error;
}

export async function listFlashcards(groupId) {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('group_id', groupId)
    .order('position', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createFlashcard({
  group_id, term, definition, position,
  notes, external_links, term_image, definition_image,
}) {
  const row = { group_id, term, definition: definition || null, position: position ?? 0 };
  if (notes !== undefined) row.notes = notes;
  if (external_links !== undefined) row.external_links = external_links;
  if (term_image !== undefined) row.term_image = term_image;
  if (definition_image !== undefined) row.definition_image = definition_image;
  const { data, error } = await supabase
    .from('flashcards')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function bulkCreateFlashcards(group_id, cards, startPosition = 0) {
  if (!cards?.length) return [];
  const rows = cards.map((c, i) => ({
    group_id,
    term: c.term,
    definition: c.definition || null,
    position: startPosition + i,
  }));
  const { data, error } = await supabase
    .from('flashcards')
    .insert(rows)
    .select();
  if (error) throw error;
  return data ?? [];
}

export async function updateFlashcard(id, patch) {
  const { data, error } = await supabase
    .from('flashcards')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFlashcard(id) {
  const { error } = await supabase.from('flashcards').delete().eq('id', id);
  if (error) throw error;
}

export async function saveQuizResult({ group_id, score, total, quiz_type }) {
  const { data, error } = await supabase
    .from('quiz_results')
    .insert({ group_id, score, total, quiz_type })
    .select()
    .single();
  if (error) throw error;
  return data;
}
