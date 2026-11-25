// Supabase Edge Function: explain-card
// POST { term: string, definition?: string } -> { explanation: string }
// Requires OPENAI_API_KEY in Supabase project secrets.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return json({ error: 'OPENAI_API_KEY not configured' }, 500);
    }

    const { term, definition } = await req.json();
    if (!term) return json({ error: 'Term is required' }, 400);

    const cardInfo = definition ? `Term: ${term}\nDefinition: ${definition}` : `Term: ${term}`;

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
              'You are a helpful tutor. Explain the given flashcard concept clearly and memorably. ' +
              'Use examples, analogies, or real-world context where helpful. ' +
              'Keep it concise but thorough — 2 to 4 short paragraphs. Plain text only, no markdown.',
          },
          { role: 'user', content: `Please explain this concept:\n${cardInfo}` },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return json({ error: `OpenAI request failed: ${errText}` }, 502);
    }

    const data = await res.json();
    const explanation = data.choices?.[0]?.message?.content ?? '';
    return json({ explanation });
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
