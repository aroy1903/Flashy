const path = require('path');
const yauzl = require('yauzl');
const initSqlJs = require('sql.js');

const COLLECTION_FILES_BY_PRIORITY = ['collection.anki21b', 'collection.anki21', 'collection.anki2'];
const COLLECTION_FILE_SET = new Set(COLLECTION_FILES_BY_PRIORITY);
const COMPATIBILITY_WARNING_REGEX = /update to the latest anki version|import the \.colpkg\/\.apkg file again/i;

class AnkiImportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AnkiImportError';
  }
}

function decodeHtmlEntities(input) {
  if (!input) return '';
  const htmlEntityMap = {
    nbsp: ' ',
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'"
  };

  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (!entity) return match;

    if (entity[0] === '#') {
      const isHex = entity[1]?.toLowerCase() === 'x';
      const numeric = entity.slice(isHex ? 2 : 1);
      const codePoint = parseInt(numeric, isHex ? 16 : 10);
      if (Number.isNaN(codePoint)) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }

    const lowered = entity.toLowerCase();
    return htmlEntityMap[lowered] || match;
  });
}

function sanitizeFieldText(value) {
  if (value == null) return '';

  let text = String(value);
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/\[sound:[^\]]+\]/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(div|p|li|tr|h[1-6]|ul|ol|table)>/gi, '\n');
  text = text.replace(/<[^>]*>/g, '');
  text = decodeHtmlEntities(text);
  text = text.replace(/\r/g, '');
  text = text.replace(/[ \t]+/g, ' ');
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

function rowsFromSqlResult(result) {
  if (!result || result.length === 0) {
    return [];
  }
  const [{ columns, values }] = result;
  return values.map((valueRow) => {
    const row = {};
    columns.forEach((column, index) => {
      row[column] = valueRow[index];
    });
    return row;
  });
}

function parseJsonSafe(jsonText, fallback = {}) {
  if (!jsonText || typeof jsonText !== 'string') {
    return fallback;
  }
  try {
    return JSON.parse(jsonText);
  } catch {
    return fallback;
  }
}

function pickFieldIndexFromTemplate(templateText, fieldNames, ignoreSet = new Set()) {
  if (!templateText || !Array.isArray(fieldNames) || fieldNames.length === 0) {
    return null;
  }

  const tokenRegex = /{{([^{}]+)}}/g;
  let match = tokenRegex.exec(templateText);
  while (match) {
    const rawToken = (match[1] || '').trim();
    if (rawToken) {
      const firstChar = rawToken[0];
      if (firstChar !== '#' && firstChar !== '/' && firstChar !== '^' && firstChar !== '!') {
        let normalized = rawToken.split('|')[0].trim();
        if (normalized.includes(':')) {
          normalized = normalized.split(':').pop().trim();
        }
        if (normalized && normalized !== 'FrontSide') {
          const lowered = normalized.toLowerCase();
          if (!ignoreSet.has(lowered)) {
            const exactIndex = fieldNames.findIndex((name) => name === normalized);
            if (exactIndex >= 0) return exactIndex;

            const insensitiveIndex = fieldNames.findIndex((name) => name.toLowerCase() === lowered);
            if (insensitiveIndex >= 0) return insensitiveIndex;
          }
        }
      }
    }
    match = tokenRegex.exec(templateText);
  }

  return null;
}

function normalizeTemplateList(rawTemplates) {
  if (Array.isArray(rawTemplates)) {
    return rawTemplates;
  }
  if (rawTemplates && typeof rawTemplates === 'object') {
    return Object.values(rawTemplates);
  }
  return [];
}

function buildModelMap(modelsRaw) {
  const models = {};
  if (!modelsRaw || typeof modelsRaw !== 'object') {
    return models;
  }

  for (const [modelId, model] of Object.entries(modelsRaw)) {
    const fields = Array.isArray(model?.flds)
      ? model.flds.map((field) => String(field?.name || '').trim())
      : [];
    const templates = normalizeTemplateList(model?.tmpls)
      .filter(Boolean)
      .sort((a, b) => Number(a?.ord || 0) - Number(b?.ord || 0));

    const templateMap = {};
    templates.forEach((template, fallbackOrder) => {
      const ord = Number.isInteger(template?.ord) ? template.ord : fallbackOrder;
      const frontIndex = pickFieldIndexFromTemplate(template?.qfmt, fields);
      const ignored = new Set();
      if (frontIndex !== null && frontIndex >= 0 && fields[frontIndex]) {
        ignored.add(fields[frontIndex].toLowerCase());
      }
      let backIndex = pickFieldIndexFromTemplate(template?.afmt, fields, ignored);

      const resolvedFront = frontIndex ?? 0;
      if (backIndex == null) {
        if (fields.length > 1) {
          backIndex = resolvedFront === 0 ? 1 : 0;
        } else {
          backIndex = resolvedFront;
        }
      }

      templateMap[ord] = {
        frontIndex: resolvedFront,
        backIndex
      };
    });

    models[String(modelId)] = { fields, templateMap };
  }

  return models;
}

function resolveDeckName(decksRaw, cards, fallback) {
  if (!decksRaw || typeof decksRaw !== 'object' || !Array.isArray(cards)) {
    return fallback;
  }

  const countsByDeck = new Map();
  cards.forEach((card) => {
    const did = String(card.did || '');
    if (!did) return;
    countsByDeck.set(did, (countsByDeck.get(did) || 0) + 1);
  });

  const rankedDeckIds = [...countsByDeck.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([deckId]) => deckId);

  for (const deckId of rankedDeckIds) {
    const candidate = decksRaw[deckId]?.name;
    if (candidate && typeof candidate === 'string') {
      const leafName = candidate.split('::').pop().trim();
      if (leafName) return leafName;
    }
  }

  return fallback;
}

function readEntryBuffer(zipfile, entry) {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (streamErr, stream) => {
      if (streamErr) {
        reject(streamErr);
        return;
      }

      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  });
}

function readCollectionCandidatesFromPackage(filePath) {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (openErr, zipfile) => {
      if (openErr) {
        reject(openErr);
        return;
      }

      const found = new Map();
      let closed = false;

      const fail = (err) => {
        if (closed) return;
        closed = true;
        zipfile.close();
        reject(err);
      };

      const succeed = () => {
        if (closed) return;
        closed = true;
        zipfile.close();
        resolve(found);
      };

      zipfile.on('error', fail);
      zipfile.on('entry', (entry) => {
        const entryName = entry.fileName.split('/').pop();
        if (!COLLECTION_FILE_SET.has(entryName) || found.has(entryName)) {
          zipfile.readEntry();
          return;
        }

        readEntryBuffer(zipfile, entry)
          .then((buffer) => {
            found.set(entryName, buffer);
            zipfile.readEntry();
          })
          .catch(fail);
      });
      zipfile.on('end', succeed);

      zipfile.readEntry();
    });
  });
}

function parseCollectionBuffer(collectionBuffer, SQL, fallbackDeckName) {
  const db = new SQL.Database(collectionBuffer);
  try {
    const cardRows = rowsFromSqlResult(
      db.exec(`
        SELECT
          CAST(c.did AS TEXT) AS did,
          CAST(c.nid AS TEXT) AS nid,
          c.ord AS ord,
          n.flds AS flds,
          CAST(n.mid AS TEXT) AS mid
        FROM cards c
        INNER JOIN notes n ON n.id = c.nid
        ORDER BY c.id ASC
      `)
    );

    if (cardRows.length === 0) {
      throw new AnkiImportError('This .apkg file does not contain importable cards.');
    }

    const colRows = rowsFromSqlResult(db.exec('SELECT decks, models FROM col LIMIT 1'));
    const colData = colRows[0] || {};
    const decks = parseJsonSafe(colData.decks);
    const models = buildModelMap(parseJsonSafe(colData.models));

    const cards = [];
    cardRows.forEach((cardRow) => {
      const modelKey = String(cardRow.mid || '');
      const modelInfo = models[modelKey];
      const rawFields = String(cardRow.flds || '').split('\u001f');

      const templateInfo = modelInfo?.templateMap?.[Number(cardRow.ord)] || {};
      const frontIndex = Number.isInteger(templateInfo.frontIndex) ? templateInfo.frontIndex : 0;
      let backIndex = Number.isInteger(templateInfo.backIndex) ? templateInfo.backIndex : (rawFields.length > 1 ? 1 : 0);

      if (backIndex === frontIndex && rawFields.length > 1) {
        backIndex = frontIndex === 0 ? 1 : 0;
      }

      const term = sanitizeFieldText(rawFields[frontIndex]);
      let definition = sanitizeFieldText(rawFields[backIndex]);
      if (!definition && rawFields.length > 1) {
        definition = sanitizeFieldText(rawFields.find((field, idx) => idx !== frontIndex));
      }

      if (!term && !definition) return;

      cards.push({
        term: term || '(empty front)',
        definition: definition || '(empty back)'
      });
    });

    if (cards.length === 0) {
      throw new AnkiImportError('No readable card text was found in this .apkg file.');
    }

    const onlyCardText = `${cards[0]?.term || ''} ${cards[0]?.definition || ''}`;
    const isCompatibilityPlaceholder =
      cards.length === 1 && COMPATIBILITY_WARNING_REGEX.test(onlyCardText);

    return {
      deckName: resolveDeckName(decks, cardRows, fallbackDeckName),
      cards,
      isCompatibilityPlaceholder
    };
  } finally {
    db.close();
  }
}

function candidateScore(result) {
  if (!result || !Array.isArray(result.cards)) return -Infinity;
  let score = result.cards.length;
  if (result.isCompatibilityPlaceholder) {
    score -= 100000;
  }
  return score;
}

async function importApkg(filePath, options = {}) {
  const fallbackDeckName = options.defaultDeckName || 'Imported Anki Deck';
  const collections = await readCollectionCandidatesFromPackage(filePath);

  if (collections.size === 0) {
    throw new AnkiImportError('No collection database found in this package.');
  }

  const wasmDir = path.dirname(require.resolve('sql.js/dist/sql-wasm.wasm'));
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmDir, file)
  });

  let best = null;
  const parseErrors = [];

  for (const filename of COLLECTION_FILES_BY_PRIORITY) {
    const buffer = collections.get(filename);
    if (!buffer) continue;

    try {
      const parsed = parseCollectionBuffer(buffer, SQL, fallbackDeckName);
      if (!best || candidateScore(parsed) > candidateScore(best)) {
        best = parsed;
      }
    } catch (error) {
      parseErrors.push(`${filename}: ${error.message}`);
    }
  }

  if (!best) {
    throw new AnkiImportError(
      parseErrors.length
        ? `Unable to parse Anki collection. ${parseErrors.join(' | ')}`
        : 'Unable to parse Anki collection.'
    );
  }

  if (best.isCompatibilityPlaceholder) {
    throw new AnkiImportError(
      'This package appears to be a compatibility placeholder deck. Re-export the deck from the latest Anki and try again.'
    );
  }

  return {
    deckName: best.deckName,
    cards: best.cards
  };
}

module.exports = {
  importApkg,
  AnkiImportError
};
