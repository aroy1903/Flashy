import { useReducer, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Heart, Trophy, RotateCcw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGroup, getFlashcards, uploadUrl } from '../api';
import { stripMarkdown } from '../utils/stripMarkdown';

function getSpeed(score) {
  return Math.min(0.35 + Math.floor(score / 4) * 0.18, 2.4);
}

function getLevel(score) {
  return Math.floor(score / 4) + 1;
}

const initialGameState = {
  cards: [],
  currentIdx: 0,
  progress: 0,
  lives: 3,
  score: 0,
  gameState: 'idle', // idle, playing, won, lost
  feedback: null,    // null | 'correct' | 'wrong'
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return { ...initialGameState, cards: action.cards };

    case 'START': {
      const shuffled = [...state.cards].sort(() => Math.random() - 0.5);
      return { ...initialGameState, cards: shuffled, gameState: 'playing' };
    }

    case 'TICK': {
      if (state.gameState !== 'playing') return state;
      const speed = getSpeed(state.score);
      const newProgress = state.progress + speed;

      if (newProgress >= 100) {
        const newLives = state.lives - 1;
        if (newLives <= 0) {
          return { ...state, gameState: 'lost', lives: 0, progress: 100, feedback: 'wrong' };
        }
        const nextIdx = state.currentIdx + 1;
        if (nextIdx >= state.cards.length) {
          return { ...state, gameState: 'won', lives: newLives };
        }
        return { ...state, lives: newLives, currentIdx: nextIdx, progress: 0, feedback: 'wrong' };
      }

      return { ...state, progress: newProgress };
    }

    case 'CORRECT': {
      const newScore = state.score + 1;
      const nextIdx = state.currentIdx + 1;
      if (nextIdx >= state.cards.length) {
        return { ...state, score: newScore, gameState: 'won', feedback: 'correct' };
      }
      return { ...state, score: newScore, currentIdx: nextIdx, progress: 0, feedback: 'correct' };
    }

    case 'WRONG':
      return { ...state, feedback: 'wrong' };

    case 'CLEAR_FEEDBACK':
      return { ...state, feedback: null };

    default:
      return state;
  }
}

function GravityPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [game, dispatch] = useReducer(gameReducer, initialGameState);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupRes, cardsRes] = await Promise.all([getGroup(id), getFlashcards(id)]);
        setGroup(groupRes.data);
        dispatch({ type: 'INIT', cards: cardsRes.data });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Game tick
  useEffect(() => {
    if (game.gameState !== 'playing') return;
    const interval = setInterval(() => dispatch({ type: 'TICK' }), 100);
    return () => clearInterval(interval);
  }, [game.gameState]);

  // Clear feedback after short delay
  useEffect(() => {
    if (!game.feedback) return;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_FEEDBACK' }), 500);
    return () => clearTimeout(t);
  }, [game.feedback]);

  // Reset input when card changes
  useEffect(() => {
    setInput('');
    if (game.gameState === 'playing') {
      inputRef.current?.focus();
    }
  }, [game.currentIdx, game.gameState]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (game.gameState !== 'playing' || !input.trim()) return;

    const card = game.cards[game.currentIdx];
    const correct = stripMarkdown(card.definition).toLowerCase();
    const answer = input.trim().toLowerCase();

    if (answer === correct) {
      dispatch({ type: 'CORRECT' });
    } else {
      dispatch({ type: 'WRONG' });
      setInput('');
    }
  };

  const handleStart = () => {
    dispatch({ type: 'START' });
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group || game.cards.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">No cards to play Gravity</p>
        <Link to={`/group/${id}`} className="text-indigo-400 text-sm mt-2 inline-block">Go back</Link>
      </div>
    );
  }

  // Idle / Start screen
  if (game.gameState === 'idle') {
    return (
      <div>
        <div className="mb-8">
          <Link to={`/group/${id}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white mb-4 transition-colors">
            <ArrowLeft size={14} />
            Back to {group.name}
          </Link>
          <h1 className="text-2xl font-bold text-white">Gravity</h1>
          <p className="text-zinc-500 text-sm mt-1">Type the definition before the term hits the ground. Speed increases as you go.</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-[#141416] border border-white/5 rounded-2xl p-10 text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-6">
              <Zap size={28} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">How to Play</h2>
            <ul className="text-sm text-zinc-400 space-y-2 text-left max-w-sm mx-auto mb-8">
              <li className="flex gap-2"><span className="text-orange-400">→</span> A term falls from the top</li>
              <li className="flex gap-2"><span className="text-orange-400">→</span> Type its definition and press Enter</li>
              <li className="flex gap-2"><span className="text-orange-400">→</span> If it hits the ground, you lose a life</li>
              <li className="flex gap-2"><span className="text-orange-400">→</span> 3 lives — speed increases every 4 correct</li>
            </ul>
            <p className="text-xs text-zinc-600 mb-6">{game.cards.length} cards · needs exact match</p>
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Win screen
  if (game.gameState === 'won') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-6">
            <Trophy size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">You Won!</h2>
          <p className="text-zinc-500 mb-8">{group.name}</p>

          <div className="bg-[#141416] border border-white/5 rounded-2xl p-8 mb-8">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-orange-400">{game.score}</div>
                <p className="text-xs text-zinc-500 mt-1">Score</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">Lv {getLevel(game.score)}</div>
                <p className="text-xs text-zinc-500 mt-1">Max Level</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-400">{3 - game.lives}</div>
                <p className="text-xs text-zinc-500 mt-1">Lives Lost</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <RotateCcw size={16} />
              Play Again
            </button>
            <Link
              to={`/group/${id}`}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Back to Set
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Loss screen
  if (game.gameState === 'lost') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-800 flex items-center justify-center mx-auto mb-6 text-3xl">
            💀
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Game Over</h2>
          <p className="text-zinc-500 mb-8">{group.name}</p>

          <div className="bg-[#141416] border border-white/5 rounded-2xl p-8 mb-8">
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <div className="text-4xl font-bold text-orange-400">{game.score}</div>
                <p className="text-xs text-zinc-500 mt-1">Score</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-white">Lv {getLevel(game.score)}</div>
                <p className="text-xs text-zinc-500 mt-1">Reached Level</p>
              </div>
            </div>

            {game.cards[game.currentIdx] && (
              <div className="mt-6 p-4 bg-white/5 rounded-xl text-left">
                <p className="text-xs text-zinc-500 mb-1">The answer was:</p>
                <p className="text-sm text-zinc-300">{stripMarkdown(game.cards[game.currentIdx].definition)}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <RotateCcw size={16} />
              Try Again
            </button>
            <Link
              to={`/group/${id}`}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Back to Set
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active game
  const currentCard = game.cards[game.currentIdx];
  const visualY = Math.min(game.progress * 0.82, 82); // cap at 82% for visual space
  const isWrongFeedback = game.feedback === 'wrong';
  const isCorrectFeedback = game.feedback === 'correct';

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <Link to={`/group/${id}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          Quit
        </Link>

        <div className="flex items-center gap-6">
          {/* Level */}
          <div className="text-xs text-zinc-500">
            Level <span className="text-orange-400 font-bold">{getLevel(game.score)}</span>
          </div>

          {/* Score */}
          <div className="text-xs text-zinc-500">
            Score <span className="text-white font-bold tabular-nums">{game.score}</span>
          </div>

          {/* Lives */}
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <Heart
                key={i}
                size={16}
                className={i < game.lives ? 'text-red-500 fill-red-500' : 'text-zinc-700'}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-4 text-xs text-zinc-600">
          <span>{game.currentIdx + 1} / {game.cards.length}</span>
          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500/50 rounded-full transition-all"
              style={{ width: `${((game.currentIdx) / game.cards.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Falling area */}
        <div
          className={`relative h-72 xl:h-80 rounded-2xl border overflow-hidden mb-4 transition-colors duration-200 ${
            isWrongFeedback
              ? 'border-red-500/50 bg-red-500/5'
              : isCorrectFeedback
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-white/5 bg-[#141416]'
          }`}
        >
          {/* Danger zone at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-red-500/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-red-500/30" />

          {/* Falling term */}
          <AnimatePresence mode="wait">
            <motion.div
              key={game.currentIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-0 right-0 px-8 text-center"
              style={{ top: `${visualY}%`, transform: 'translateY(-50%)' }}
            >
              <p className={`text-2xl xl:text-3xl font-bold transition-colors ${
                isWrongFeedback ? 'text-red-400' : isCorrectFeedback ? 'text-green-400' : 'text-white'
              }`}>
                {currentCard.term}
              </p>
              {currentCard.term_image && (
                <img
                  src={uploadUrl(currentCard.term_image)}
                  alt=""
                  className="max-h-20 mx-auto mt-3 rounded-lg object-contain"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Speed indicator */}
          <div className="absolute top-3 right-3 text-[10px] text-zinc-700">
            {getSpeed(game.score).toFixed(1)}x
          </div>
        </div>

        {/* Time bar */}
        <div className="w-full h-1.5 bg-white/5 rounded-full mb-4 overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-colors ${
              game.progress > 75 ? 'bg-red-500' : game.progress > 50 ? 'bg-orange-500' : 'bg-orange-400'
            }`}
            style={{ width: `${100 - game.progress}%` }}
          />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type the definition and press Enter..."
            className={`w-full px-5 py-4 rounded-xl border text-white text-sm placeholder-zinc-600 focus:outline-none transition-all ${
              isWrongFeedback
                ? 'border-red-500/50 bg-red-500/5 focus:border-red-500'
                : isCorrectFeedback
                  ? 'border-green-500/50 bg-green-500/5 focus:border-green-500'
                  : 'border-white/10 bg-white/5 focus:border-orange-500/50'
            }`}
            autoComplete="off"
          />
        </form>

        <p className="text-xs text-zinc-700 mt-3 text-center">Press Enter to submit</p>
      </div>
    </div>
  );
}

export default GravityPage;
