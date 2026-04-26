class TextImportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TextImportError';
  }
}

function stripBom(text) {
  if (!text) return '';
  return text.replace(/^\uFEFF/, '');
}

function unquoteCell(value) {
  const trimmed = String(value ?? '').trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"').trim();
  }
  return trimmed;
}

function countDelimiterOutsideQuotes(line, delimiter) {
  let inQuotes = false;
  let count = 0;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === delimiter) {
      count += 1;
    }
  }

  return count;
}

function detectDelimiter(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30);

  if (lines.length === 0) return '\t';

  const candidates = ['\t', ';', ','];
  let bestDelimiter = '\t';
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = lines.reduce(
      (sum, line) => sum + countDelimiterOutsideQuotes(line, candidate),
      0
    );
    if (score > bestScore) {
      bestDelimiter = candidate;
      bestScore = score;
    }
  }

  return bestDelimiter;
}

function parseDelimitedText(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(unquoteCell(cell));
      cell = '';
      continue;
    }

    if (!inQuotes && char === '\n') {
      row.push(unquoteCell(cell));
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    if (!inQuotes && char === '\r') {
      continue;
    }

    cell += char;
  }

  row.push(unquoteCell(cell));
  rows.push(row);

  return rows.filter((cols) => cols.some((col) => String(col).trim().length > 0));
}

function looksLikeHeader(first, second) {
  const left = String(first || '').toLowerCase().trim();
  const right = String(second || '').toLowerCase().trim();

  const leftHeaders = new Set(['front', 'question', 'term']);
  const rightHeaders = new Set(['back', 'answer', 'definition']);
  return leftHeaders.has(left) && rightHeaders.has(right);
}

function importFromText(rawText, options = {}) {
  const fallbackDeckName = options.defaultDeckName || 'Imported Text Deck';
  const normalized = stripBom(String(rawText || ''));

  if (!normalized.trim()) {
    throw new TextImportError('The uploaded text file is empty.');
  }

  const delimiter = detectDelimiter(normalized);
  const rows = parseDelimitedText(normalized, delimiter);

  if (rows.length === 0) {
    throw new TextImportError('No rows found in the uploaded text file.');
  }

  const cards = [];
  rows.forEach((cols, index) => {
    if (!Array.isArray(cols) || cols.length < 2) {
      return;
    }

    if (index === 0 && looksLikeHeader(cols[0], cols[1])) {
      return;
    }

    const term = String(cols[0] || '').trim();
    const definition = String(cols[1] || '').trim();

    if (!term && !definition) {
      return;
    }

    cards.push({
      term: term || '(empty front)',
      definition: definition || '(empty back)'
    });
  });

  if (cards.length === 0) {
    throw new TextImportError('No valid cards found. Expected two columns: term and definition.');
  }

  return {
    deckName: fallbackDeckName,
    cards
  };
}

module.exports = {
  importFromText,
  TextImportError
};
