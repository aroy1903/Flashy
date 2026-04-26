const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const path = require('path');
const multer = require('multer');
const pool = require('../config/db');
const { importApkg, AnkiImportError } = require('../services/anki-import');
const { importFromText, TextImportError } = require('../services/text-import');

const ankiTempDir = path.join(os.tmpdir(), 'flashy-anki-imports');
if (!fs.existsSync(ankiTempDir)) {
  fs.mkdirSync(ankiTempDir, { recursive: true });
}

const ankiUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, ankiTempDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.apkg';
      cb(null, `${uuidv4()}${ext}`);
    }
  }),
  limits: {
    fileSize: parseInt(process.env.MAX_ANKI_FILE_SIZE, 10) || 100 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext === '.apkg' || ext === '.colpkg') {
      cb(null, true);
      return;
    }
    cb(new Error('Only .apkg or .colpkg files are allowed for Anki import'));
  }
});

const textUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, ankiTempDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.txt';
      cb(null, `${uuidv4()}${ext}`);
    }
  }),
  limits: {
    fileSize: parseInt(process.env.MAX_TEXT_IMPORT_FILE_SIZE, 10) || 15 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext === '.txt' || ext === '.tsv' || ext === '.csv') {
      cb(null, true);
      return;
    }
    cb(new Error('Only .txt, .tsv, or .csv files are allowed for text import'));
  }
});

// Get all groups with card count
router.get('/', async (req, res) => {
  try {
    const [groups] = await pool.query(`
      SELECT g.*, COUNT(f.id) as card_count 
      FROM \`groups\` g 
      LEFT JOIN flashcards f ON g.id = f.group_id 
      GROUP BY g.id 
      ORDER BY g.updated_at DESC
    `);
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const handleAnkiUpload = (req, res, next) => {
  ankiUpload.single('deck_file')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(400).json({ error: error.message || 'Invalid Anki upload.' });
  });
};

const handleTextUpload = (req, res, next) => {
  textUpload.single('deck_file')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(400).json({ error: error.message || 'Invalid text upload.' });
  });
};

async function createGroupWithCards({ name, description, color, cards }) {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const groupId = uuidv4();
    await connection.query(
      'INSERT INTO `groups` (id, name, description, color) VALUES (?, ?, ?, ?)',
      [groupId, name, description, color]
    );

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      await connection.query(
        'INSERT INTO flashcards (id, group_id, term, definition, position) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), groupId, card.term, card.definition, i]
      );
    }

    await connection.commit();

    const [createdGroups] = await pool.query(`
      SELECT g.*, COUNT(f.id) as card_count
      FROM \`groups\` g
      LEFT JOIN flashcards f ON g.id = f.group_id
      WHERE g.id = ?
      GROUP BY g.id
    `, [groupId]);

    return createdGroups[0];
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Import an Anki .apkg file and create a group with cards
router.post('/import/anki', handleAnkiUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an Anki .apkg or .colpkg file.' });
    }

    const fallbackName = path.parse(req.file.originalname || 'Imported Anki Deck').name || 'Imported Anki Deck';
    const parsed = await importApkg(req.file.path, { defaultDeckName: fallbackName });
    const importedCards = parsed.cards || [];

    if (importedCards.length === 0) {
      return res.status(400).json({ error: 'No cards found in this Anki package.' });
    }

    const providedName = String(req.body?.name || '').trim();
    const providedDescription = String(req.body?.description || '').trim();
    const providedColor = String(req.body?.color || '').trim();

    const name = (providedName || parsed.deckName || fallbackName).slice(0, 255);
    const description = providedDescription || null;
    const color = /^#[0-9a-f]{6}$/i.test(providedColor) ? providedColor : '#6366f1';

    const createdGroup = await createGroupWithCards({
      name,
      description,
      color,
      cards: importedCards
    });

    res.status(201).json({
      group: createdGroup,
      imported_count: importedCards.length
    });
  } catch (error) {
    if (error instanceof AnkiImportError) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: `Failed to import Anki deck: ${error.message}` });
  } finally {
    if (req.file?.path) {
      await fsPromises.unlink(req.file.path).catch(() => {});
    }
  }
});

// Import from plain text/tsv/csv and create a group with cards
router.post('/import/text', handleTextUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a .txt, .tsv, or .csv file.' });
    }

    const fallbackName = path.parse(req.file.originalname || 'Imported Text Deck').name || 'Imported Text Deck';
    const fileText = await fsPromises.readFile(req.file.path, 'utf8');
    const parsed = importFromText(fileText, { defaultDeckName: fallbackName });
    const importedCards = parsed.cards || [];

    if (importedCards.length === 0) {
      return res.status(400).json({ error: 'No cards found in this text file.' });
    }

    const providedName = String(req.body?.name || '').trim();
    const providedDescription = String(req.body?.description || '').trim();
    const providedColor = String(req.body?.color || '').trim();

    const name = (providedName || parsed.deckName || fallbackName).slice(0, 255);
    const description = providedDescription || null;
    const color = /^#[0-9a-f]{6}$/i.test(providedColor) ? providedColor : '#6366f1';

    const createdGroup = await createGroupWithCards({
      name,
      description,
      color,
      cards: importedCards
    });

    res.status(201).json({
      group: createdGroup,
      imported_count: importedCards.length
    });
  } catch (error) {
    if (error instanceof TextImportError) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: `Failed to import text deck: ${error.message}` });
  } finally {
    if (req.file?.path) {
      await fsPromises.unlink(req.file.path).catch(() => {});
    }
  }
});

// Get single group
router.get('/:id', async (req, res) => {
  try {
    const [groups] = await pool.query(
      'SELECT * FROM `groups` WHERE id = ?',
      [req.params.id]
    );
    if (groups.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(groups[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create group
router.post('/', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const id = uuidv4();
    await pool.query(
      'INSERT INTO `groups` (id, name, description, color) VALUES (?, ?, ?, ?)',
      [id, name, description || null, color || '#6366f1']
    );
    const [created] = await pool.query('SELECT * FROM `groups` WHERE id = ?', [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update group
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    await pool.query(
      'UPDATE `groups` SET name = ?, description = ?, color = ? WHERE id = ?',
      [name, description, color, req.params.id]
    );
    const [updated] = await pool.query('SELECT * FROM `groups` WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete group
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM `groups` WHERE id = ?', [req.params.id]);
    res.json({ message: 'Group deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
