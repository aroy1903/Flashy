// Deterministic parser for structured markdown decks like:
//   ## Card 1: List
//   **What it is:** ...
//   ---
//   ## Card 2: Tuple
// Returns null when the input doesn't look structured.
export function parseStructuredDeck(text) {
  const headerRe = /^##\s+(?:Card\s+\d+\s*[:\-–]\s*)?(.+?)\s*$/gm;
  const matches = [];
  let m;
  while ((m = headerRe.exec(text)) !== null) {
    matches.push({ term: m[1].trim(), start: m.index, headerEnd: m.index + m[0].length });
  }
  if (matches.length < 2) return null;

  const cards = [];
  for (let i = 0; i < matches.length; i++) {
    const bodyStart = matches[i].headerEnd;
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].start : text.length;
    let body = text.slice(bodyStart, bodyEnd);
    body = body.replace(/\n\s*---\s*\n?\s*$/m, '\n').trim();
    cards.push({ term: matches[i].term, definition: body });
  }
  return cards;
}
