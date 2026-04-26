import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGroup, getFlashcards } from '../api';
import Flashcard from '../components/Flashcard';

function StudyPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [cards, setCards] = useState([]);
  const storageKey = `study_index_${id}`;
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = localStorage.getItem(`study_index_${id}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [loading, setLoading] = useState(true);
  const [touchStartX, setTouchStartX] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    localStorage.setItem(storageKey, currentIndex);
  }, [currentIndex, storageKey]);

  const fetchData = async () => {
    try {
      const [groupRes, cardsRes] = await Promise.all([
        getGroup(id),
        getFlashcards(id)
      ]);
      setGroup(groupRes.data);
      const fetched = cardsRes.data;
      setCards(fetched);
      setCurrentIndex(prev => Math.min(prev, fetched.length - 1));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : cards.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < cards.length - 1 ? prev + 1 : 0));
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      delta > 0 ? handleNext() : handlePrev();
    }
    setTouchStartX(null);
  };

  const handleReset = () => {
    localStorage.removeItem(storageKey);
    setCurrentIndex(0);
    fetchData();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') setCurrentIndex(prev => (prev > 0 ? prev - 1 : cards.length - 1));
      if (e.key === 'ArrowRight') setCurrentIndex(prev => (prev < cards.length - 1 ? prev + 1 : 0));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group || cards.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">No cards to study</p>
        <Link to={`/group/${id}`} className="text-indigo-400 text-sm mt-2 inline-block">Go back</Link>
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
        <h1 className="text-2xl font-bold text-white">Study Mode</h1>
        <p className="text-zinc-500 text-sm mt-1">Click the card to flip it. Use arrow keys or swipe to navigate.</p>
      </div>

      {/* Flashcard Display */}
      <div className="max-w-3xl mx-auto">
        {/* Progress bar */}
        <div className="w-full h-1 bg-white/5 rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Flashcard
                card={cards[currentIndex]}
                index={currentIndex}
                total={cards.length}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={handleReset}
            className="p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            title="Reset"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={handlePrev}
            className="p-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <ChevronLeft size={22} />
          </button>
          <span className="px-4 py-2 text-sm font-medium text-zinc-400 bg-white/5 rounded-lg min-w-[80px] text-center">
            {currentIndex + 1} / {cards.length}
          </span>
          <button
            onClick={handleNext}
            className="p-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <ChevronRight size={22} />
          </button>
          <button
            onClick={handleShuffle}
            className="p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            title="Shuffle"
          >
            <Shuffle size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudyPage;
