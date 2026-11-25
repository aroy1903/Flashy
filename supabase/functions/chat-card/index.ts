// Supabase Edge Function: chat-card
// POST { term, definition?, messages: [{ role: 'user'|'assistant', content }] } -> { reply }
// Requires OPENAI_API_KEY in Supabase project secrets.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_HISTORY = 20;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return json({ error: 'OPENAI_API_KEY not configured' }, 500);

    const { term, definition, messages } = await req.json();
    if (!term) return json({ error: 'Term is required' }, 400);
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'messages array is required' }, 400);
    }

    const cardInfo = definition ? `Term: ${term}\nDefinition: ${definition}` : `Term: ${term}`;
    const history = messages
      .slice(-MAX_HISTORY)
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m: any) => ({ role: m.role, content: m.content }));

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful tutor having a follow-up conversation about a flashcard the student is studying. ' +
              'Stay focused on the flashcard topic and related concepts the student asks about. ' +
              'Use examples, analogies, and real-world context. Keep replies concise — a few short paragraphs at most. ' +
              'Plain text only, no markdown.\n\n' +
              `Flashcard context:\n${cardInfo}`,
          },
          ...history,
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return json({ error: `OpenAI request failed: ${errText}` }, 502);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? '';
    return json({ reply });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
