const OpenAI = require('openai');

let _client = null;

function getClient() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set in environment');
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

// Deterministic parser for structured markdown decks like:
//   ## Card 1: List
//   **What it is:** ...
//   **Visual:** ``` ... ```
//   ---
//   ## Card 2: Tuple
// Preserves full markdown body (code fences, ASCII art, tables) verbatim.
function parseStructuredDeck(text) {
  const headerRe = /^##\s+(?:Card\s+\d+\s*[:\-–]\s*)?(.+?)\s*$/gm;
  const matches = [];
  let m;
  while ((m = headerRe.exec(text)) !== null) {
    matches.push({ term: m[1].trim(), start: m.index, headerEnd: m.index + m[0].length });
  }
  if (matches.length < 2) return null; // not the structured format

  const cards = [];
  for (let i = 0; i < matches.length; i++) {
    const bodyStart = matches[i].headerEnd;
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].start : text.length;
    let body = text.slice(bodyStart, bodyEnd);
    // strip trailing horizontal rule separating cards
    body = body.replace(/\n\s*---\s*\n?\s*$/m, '\n').trim();
    cards.push({ term: matches[i].term, definition: body });
  }
  return cards;
}

async function parseBulkCards(text) {
  const structured = parseStructuredDeck(text);
  if (structured) return structured;

  const client = getClient();
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Extract flashcard term-definition pairs from the user\'s text. ' +
          'Return ONLY a valid JSON object in the format: {"cards":[{"term":"...","definition":"..."},...]}. ' +
          'Preserve the full original formatting of each definition (newlines, code fences, markdown, ASCII tables) verbatim. ' +
          'Handle any input format: "term: X\\ndefinition: Y", tab-separated, numbered lists, colon-separated on same line, etc. ' +
          'If a definition is missing for a term, leave it as an empty string.'
      },
      { role: 'user', content: text }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 8000
  });
  const data = JSON.parse(completion.choices[0].message.content);
  return Array.isArray(data.cards) ? data.cards : [];
}

async function explainCard(term, definition) {
  const client = getClient();
  const cardInfo = definition
    ? `Term: ${term}\nDefinition: ${definition}`
    : `Term: ${term}`;
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful tutor. Explain the given flashcard concept clearly and memorably. ' +
          'Use examples, analogies, or real-world context where helpful. ' +
          'Keep it concise but thorough — 2 to 4 short paragraphs. Plain text only, no markdown.'
      },
      { role: 'user', content: `Please explain this concept:\n${cardInfo}` }
    ]
  });
  return completion.choices[0].message.content;
}

module.exports = { parseBulkCards, explainCard };
