import { supabase } from './supabase';

export async function explainCard({ term, definition }) {
  const { data, error } = await supabase.functions.invoke('explain-card', {
    body: { term, definition },
  });
  if (error) throw new Error(error.message || 'Failed to get explanation');
  if (data?.error) throw new Error(data.error);
  return data?.explanation || '';
}

export async function parseBulkCards(text) {
  const { data, error } = await supabase.functions.invoke('parse-bulk-cards', {
    body: { text },
  });
  if (error) throw new Error(error.message || 'Failed to parse cards');
  if (data?.error) throw new Error(data.error);
  return Array.isArray(data?.cards) ? data.cards : [];
}
