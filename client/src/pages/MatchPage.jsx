import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Timer, Trophy, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { getGroup, getFlashcards } from '../api';
import { stripMarkdown } from '../utils/stripMarkdown';

const MAX_CARDS = 8;

function MatchPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState(new Set());
  const [wrongPair, setWrongPair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState('idle'); // idle, playing, done
  const [time, setTime] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const timerRef = useRef(null);
  const wrongRef = useRef(null);
  const originalCardsRef = useRef([]);

  useEffect(() => {
    fetchData();
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(wrongRef.current);
    };
  }, [id]);

  const fetchData = async () => {
    try {
      const [groupRes, cardsRes] = await Promise.all([getGroup(id), getFlashcards(id)]);
      setGroup(groupRes.data);
      originalCardsRef.current = cardsRes.data;
      buildTiles(cardsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const buildTiles = (cards) => {
    const picked = cards.slice(0, MAX_CARDS);
    const newTiles = [];
    picked.forEach(card => {
      newTiles.push({ tileId: `term-${card.id}`, text: card.term, cardId: card.id });
      newTiles.push({ tileId: `def-${card.id}`, text: stripMarkdown(card.definition), cardId: card.id });
    });
    setTiles(newTiles.sort(() => Math.random() - 0.5));
    setSelected(null);
    setMatched(new Set());
    setWrongPair(null);
    setTime(0);
    setAttempts(0);
    setGameState('idle');
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
  };

  const handleTileClick = (tile) => {
    if (matched.has(tile.cardId)) return;
    if (wrongPair) return;

    if (gameState === 'idle') {
      setGameState('playing');
      startTimer();
    }

    if (!selected) {
      setSelected(tile);
      return;
    }

    if (selected.tileId === tile.tileId) {
      setSelected(null);
      return;
    }

    setAttempts(prev => prev + 1);

    if (selected.cardId === tile.cardId) {
      // Match!
      const newMatched = new Set([...matched, tile.cardId]);
      setMatched(newMatched);
      setSelected(null);

      if (newMatched.size === tiles.length / 2) {
        clearInterval(timerRef.current);
        setGameState('done');
      }
    } else {
      // Wrong
      setWrongPair({ a: selected.tileId, b: tile.tileId });
      wrongRef.current = setTimeout(() => {
        setWrongPair(null);
        setSelected(null);
      }, 700);
    }
  };

  const handleRestart = () => {
    clearInterval(timerRef.current);
    clearTimeout(wrongRef.current);
    buildTiles(originalCardsRef.current);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const accuracy = attempts > 0
    ? Math.round((matched.size / attempts) * 100)
    : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Set not found</p>
        <Link to="/" className="text-indigo-400 text-sm mt-2 inline-block">Go back</Link>
      </div>
    );
  }

  if (tiles.length < 2) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Need at least 1 card to play Match</p>
        <Link to={`/group/${id}`} className="text-indigo-400 text-sm mt-2 inline-block">Go back</Link>
      </div>
    );
  }

  if (gameState === 'done') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6">
            <Trophy size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">All Matched!</h2>
          <p className="text-zinc-500 mb-8">{group.name}</p>

          <div className="bg-[#141416] border border-white/5 rounded-2xl p-8 mb-8">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-white">{formatTime(time)}</div>
                <p className="text-xs text-zinc-500 mt-1">Time</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-400">{accuracy}%</div>
                <p className="text-xs text-zinc-500 mt-1">Accuracy</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-zinc-300">{attempts}</div>
                <p className="text-xs text-zinc-500 mt-1">Attempts</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRestart}
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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link to={`/group/${id}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white mb-4 transition-colors">
          <ArrowLeft size={14} />
          Back to {group.name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Match</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Click any two tiles that belong together. {gameState === 'idle' ? 'Click a tile to start.' : ''}
            </p>
          </div>

          {/* Timer & stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <Timer size={16} />
              <span className="tabular-nums font-mono">{formatTime(time)}</span>
            </div>
            <div className="text-zinc-500">
              <span className="text-white font-medium">{matched.size}</span> / {tiles.length / 2} matched
            </div>
          </div>
        </div>
      </div>

      {/* Tile grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {tiles.map(tile => {
          const isMatched = matched.has(tile.cardId);
          const isSelected = selected?.tileId === tile.tileId;
          const isWrong = wrongPair?.a === tile.tileId || wrongPair?.b === tile.tileId;

          return (
            <motion.button
              key={tile.tileId}
              animate={{
                opacity: isMatched ? 0 : 1,
                scale: isMatched ? 0.85 : 1,
              }}
              transition={{ duration: 0.3 }}
              onClick={() => !isMatched && handleTileClick(tile)}
              className={`
                relative p-4 rounded-xl border text-sm text-left transition-all min-h-[80px] xl:min-h-[96px]
                ${isMatched
                  ? 'pointer-events-none border-green-500/20 bg-green-500/5'
                  : isWrong
                    ? 'border-red-500 bg-red-500/10 text-red-300 scale-[0.98]'
                    : isSelected
                      ? 'border-indigo-500 bg-indigo-600/15 text-white shadow-lg shadow-indigo-500/10'
                      : 'border-white/5 bg-[#141416] hover:border-white/20 hover:bg-[#18181b] text-zinc-300 cursor-pointer'
                }
              `}
            >
              <span className="line-clamp-3 leading-relaxed">{tile.text}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-8 w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
          animate={{ width: `${(matched.size / (tiles.length / 2)) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
}

export default MatchPage;
