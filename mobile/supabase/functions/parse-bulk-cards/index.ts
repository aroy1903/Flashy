// Supabase Edge Function: parse-bulk-cards
// POST { text: string } -> { cards: [{ term, definition }, ...] }
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
    if (!apiKey) return json({ error: 'OPENAI_API_KEY not configured' }, 500);

    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return json({ error: 'text is required' }, 400);
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              "Extract flashcard term-definition pairs from the user's text. " +
              'Return ONLY a valid JSON object in the format: {"cards":[{"term":"...","definition":"..."},...]}. ' +
              'Handle any input format: "term: X\\ndefinition: Y", tab-separated, numbered lists, colon-separated on same line, etc. ' +
              'If a definition is missing for a term, leave it as an empty string.',
          },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return json({ error: `OpenAI request failed: ${errText}` }, 502);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '{"cards":[]}';
    let parsed: { cards?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      return json({ error: 'Failed to parse AI response' }, 502);
    }
    const cards = Array.isArray(parsed.cards)
      ? parsed.cards
          .filter((c): c is { term: string; definition?: string } =>
            !!c && typeof (c as any).term === 'string' && (c as any).term.trim().length > 0
          )
          .map((c) => ({
            term: String(c.term).trim(),
            definition: c.definition ? String(c.definition).trim() : '',
          }))
      : [];
    return json({ cards });
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
