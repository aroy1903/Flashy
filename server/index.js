const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const groupsRouter = require('./routes/groups');
const flashcardsRouter = require('./routes/flashcards');
const quizzesRouter = require('./routes/quizzes');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/groups', groupsRouter);
app.use('/api/flashcards', flashcardsRouter);
app.use('/api/quizzes', quizzesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
