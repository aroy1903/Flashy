import { supabase } from './supabase';

// supabase.functions.invoke wraps non-2xx responses in a FunctionsHttpError
// whose message is generic. The function body carries the real reason as
// { error: "..." } — surface that instead.
async function invokeFn(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let detail = '';
    try {
      const payload = await error.context?.json?.();
      detail = payload?.error || '';
    } catch {
      /* body wasn't JSON */
    }
    throw new Error(detail || error.message || 'AI request failed');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function explainCard({ term, definition }) {
  const data = await invokeFn('explain-card', { term, definition });
  return data?.explanation || '';
}

export async function chatAboutCard({ term, definition, messages }) {
  const data = await invokeFn('chat-card', { term, definition, messages });
  return data?.reply || '';
}

export async function parseBulkCards(text) {
  const data = await invokeFn('parse-bulk-cards', { text });
  return Array.isArray(data?.cards) ? data.cards : [];
}
