const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

// Generate quiz for a group
router.get('/generate/:groupId', async (req, res) => {
  try {
    const { type = 'multiple_choice' } = req.query;
    const [cards] = await pool.query(
      'SELECT * FROM flashcards WHERE group_id = ? ORDER BY RAND()',
      [req.params.groupId]
    );

    if (cards.length < 1) {
      return res.status(400).json({ error: 'No flashcards in this group' });
    }

    if (cards.length < 4 && type === 'multiple_choice') {
      return res.status(400).json({
        error: 'Need at least 4 flashcards for multiple choice quiz'
      });
    }

    if (cards.length < 2 && type === 'true_false') {
      return res.status(400).json({
        error: 'Need at least 2 flashcards for true/false quiz'
      });
    }

    let questions = [];

    if (type === 'multiple_choice') {
      questions = cards.map((card) => {
        const wrongAnswers = cards
          .filter(c => c.id !== card.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map(c => c.definition);

        const options = [...wrongAnswers, card.definition]
          .sort(() => Math.random() - 0.5);

        return {
          id: uuidv4(),
          card_id: card.id,
          question: card.term,
          question_image: card.term_image,
          correct_answer: card.definition,
          options,
          type: 'multiple_choice'
        };
      });
    } else if (type === 'true_false') {
      questions = cards.map((card) => {
        const isTrue = Math.random() > 0.5;
        const wrongCard = cards.find(c => c.id !== card.id);
        const shownDefinition = isTrue ? card.definition : (wrongCard?.definition || card.definition);

        return {
          id: uuidv4(),
          card_id: card.id,
          question: card.term,
          question_image: card.term_image,
          shown_answer: shownDefinition,
          correct_answer: isTrue,
          type: 'true_false'
        };
      });
    } else if (type === 'written') {
      questions = cards.map((card) => ({
        id: uuidv4(),
        card_id: card.id,
        question: card.term,
        question_image: card.term_image,
        correct_answer: card.definition,
        type: 'written'
      }));
    }

    res.json({ questions, total: questions.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save quiz result
router.post('/results', async (req, res) => {
  try {
    const { group_id, score, total, quiz_type } = req.body;
    const id = uuidv4();
    await pool.query(
      'INSERT INTO quiz_results (id, group_id, score, total, quiz_type) VALUES (?, ?, ?, ?, ?)',
      [id, group_id, score, total, quiz_type]
    );
    res.status(201).json({ id, group_id, score, total, quiz_type });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get quiz history for a group
router.get('/results/:groupId', async (req, res) => {
  try {
    const [results] = await pool.query(
      'SELECT * FROM quiz_results WHERE group_id = ? ORDER BY completed_at DESC',
      [req.params.groupId]
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
