const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const upload = require('../middleware/upload');

// Get all flashcards for a group
router.get('/group/:groupId', async (req, res) => {
  try {
    const [cards] = await pool.query(
      'SELECT * FROM flashcards WHERE group_id = ? ORDER BY position ASC',
      [req.params.groupId]
    );
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single flashcard
router.get('/:id', async (req, res) => {
  try {
    const [cards] = await pool.query('SELECT * FROM flashcards WHERE id = ?', [req.params.id]);
    if (cards.length === 0) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }
    res.json(cards[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create flashcard
router.post('/', upload.fields([
  { name: 'term_image', maxCount: 1 },
  { name: 'definition_image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { group_id, term, definition, position } = req.body;
    const id = uuidv4();
    const termImage = req.files?.term_image?.[0]?.filename || null;
    const defImage = req.files?.definition_image?.[0]?.filename || null;

    await pool.query(
      'INSERT INTO flashcards (id, group_id, term, definition, term_image, definition_image, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, group_id, term, definition, termImage, defImage, position || 0]
    );
    const [created] = await pool.query('SELECT * FROM flashcards WHERE id = ?', [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update flashcard
router.put('/:id', upload.fields([
  { name: 'term_image', maxCount: 1 },
  { name: 'definition_image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { term, definition, position } = req.body;
    const termImage = req.files?.term_image?.[0]?.filename || undefined;
    const defImage = req.files?.definition_image?.[0]?.filename || undefined;

    let query = 'UPDATE flashcards SET term = ?, definition = ?';
    let params = [term, definition];

    if (position !== undefined) {
      query += ', position = ?';
      params.push(position);
    }
    if (termImage !== undefined) {
      query += ', term_image = ?';
      params.push(termImage);
    } else if (req.body.clear_term_image === 'true') {
      query += ', term_image = NULL';
    }
    if (defImage !== undefined) {
      query += ', definition_image = ?';
      params.push(defImage);
    } else if (req.body.clear_definition_image === 'true') {
      query += ', definition_image = NULL';
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    await pool.query(query, params);
    const [updated] = await pool.query('SELECT * FROM flashcards WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete flashcard
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM flashcards WHERE id = ?', [req.params.id]);
    res.json({ message: 'Flashcard deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk create flashcards
router.post('/bulk', async (req, res) => {
  try {
    const { group_id, cards } = req.body;
    const created = [];
    for (let i = 0; i < cards.length; i++) {
      const id = uuidv4();
      const { term, definition } = cards[i];
      await pool.query(
        'INSERT INTO flashcards (id, group_id, term, definition, position) VALUES (?, ?, ?, ?, ?)',
        [id, group_id, term, definition, i]
      );
      created.push({ id, group_id, term, definition, position: i });
    }
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
