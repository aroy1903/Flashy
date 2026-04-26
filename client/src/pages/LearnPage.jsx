import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGroup, getFlashcards, uploadUrl } from '../api';

function LearnPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [queue, setQueue] = useState([]);
  const [totalCards, setTotalCards] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [groupRes, cardsRes] = await Promise.all([getGroup(id), getFlashcards(id)]);
      setGroup(groupRes.data);
      const shuffled = [...cardsRes.data].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setTotalCards(shuffled.length);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKnow = () => {
    setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    const newQueue = queue.slice(1);
    setMasteredCount(prev => prev + 1);
    if (newQueue.length === 0) {
      setDone(true);
    } else {
      setQueue(newQueue);
      setIsFlipped(false);
    }
  };

  const handleDontKnow = () => {
    setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    const [first, ...rest] = queue;
    setQueue([...rest, first]);
    setIsFlipped(false);
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      const { data } = await getFlashcards(id);
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setTotalCards(shuffled.length);
    } catch (e) {
      console.error(e);
    }
    setMasteredCount(0);
    setStats({ correct: 0, incorrect: 0 });
    setIsFlipped(false);
    setDone(false);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group || totalCards === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">No cards to learn</p>
        <Link to={`/group/${id}`} className="text-indigo-400 text-sm mt-2 inline-block">Go back</Link>
      </div>
    );
  }

  if (done) {
    const total = stats.correct + stats.incorrect;
    const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 100;

    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6">
            <Trophy size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">All Mastered!</h2>
          <p className="text-zinc-500 mb-8">{group.name} — {totalCards} cards</p>

          <div className="bg-[#141416] border border-white/5 rounded-2xl p-8 mb-8">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-green-400">{stats.correct}</div>
                <p className="text-xs text-zinc-500 mt-1">Got It</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{accuracy}%</div>
                <p className="text-xs text-zinc-500 mt-1">Accuracy</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-400">{stats.incorrect}</div>
                <p className="text-xs text-zinc-500 mt-1">Retries</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <RotateCcw size={16} />
              Study Again
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

  const card = queue[0];
  const progress = masteredCount / totalCards;

  return (
    <div>
      <div className="mb-8">
        <Link to={`/group/${id}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white mb-4 transition-colors">
          <ArrowLeft size={14} />
          Back to {group.name}
        </Link>
        <h1 className="text-2xl font-bold text-white">Learn Mode</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Flip each card and rate yourself. Cards you miss come back until you know them all.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-sm text-zinc-500 shrink-0 tabular-nums">{masteredCount} / {totalCards}</span>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-6 text-xs text-zinc-600">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-green-500" />
            {stats.correct} got it
          </span>
          <span className="flex items-center gap-1.5">
            <XCircle size={12} className="text-red-500" />
            {stats.incorrect} retries
          </span>
          <span className="ml-auto">{queue.length} remaining</span>
        </div>

        {/* Flip Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={card.id + String(isFlipped)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <div
              className="flip-card w-full h-[380px] xl:h-[440px] cursor-pointer select-none mb-6"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
                {/* Front - Term */}
                <div className="flip-card-front flex flex-col bg-[#141416] border border-white/5 rounded-2xl p-10">
                  <div className="absolute top-5 left-5 text-[10px] uppercase tracking-widest text-zinc-600 font-medium">
                    Term
                  </div>
                  <div className="flex-1 flex flex-col items-center overflow-y-auto mt-4 mb-4">
                    <div className="my-auto flex flex-col items-center gap-4">
                      {card.term_image && (
                        <img src={uploadUrl(card.term_image)} alt="" className="max-h-32 rounded-xl object-contain shrink-0" />
                      )}
                      <p className="text-2xl xl:text-3xl font-semibold text-white text-center leading-relaxed">
                        {card.term}
                      </p>
                    </div>
                  </div>
                  <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-zinc-700 whitespace-nowrap">Click to reveal definition</p>
                </div>

                {/* Back - Definition */}
                <div className="flip-card-back flex flex-col bg-[#18181b] border border-white/5 rounded-2xl p-10">
                  <div className="absolute top-5 left-5 text-[10px] uppercase tracking-widest text-indigo-400 font-medium">
                    Definition
                  </div>
                  <div className="flex-1 flex flex-col items-center overflow-y-auto mt-4 mb-4">
                    <div className="my-auto flex flex-col items-center gap-4">
                      {card.definition_image && (
                        <img src={uploadUrl(card.definition_image)} alt="" className="max-h-32 rounded-xl object-contain shrink-0" />
                      )}
                      <p className="text-xl xl:text-2xl text-zinc-300 text-center leading-relaxed">
                        {card.definition}
                      </p>
                    </div>
                  </div>
                  <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-zinc-700 whitespace-nowrap">How well did you know this?</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Action buttons — shown after flipping */}
        <AnimatePresence>
          {isFlipped ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3"
            >
              <button
                onClick={handleDontKnow}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-xl transition-all"
              >
                <XCircle size={18} />
                Still Learning
              </button>
              <button
                onClick={handleKnow}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 text-green-400 text-sm font-medium rounded-xl transition-all"
              >
                <CheckCircle2 size={18} />
                Got It
              </button>
            </motion.div>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm text-zinc-600"
            >
              Flip the card before rating yourself
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default LearnPage;
