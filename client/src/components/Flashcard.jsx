import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uploadUrl, explainCard } from '../api';

const mdComponents = {
  h1: ({ node, ...p }) => <h1 className="text-lg font-semibold text-white mt-3 mb-2" {...p} />,
  h2: ({ node, ...p }) => <h2 className="text-base font-semibold text-white mt-3 mb-2" {...p} />,
  h3: ({ node, ...p }) => <h3 className="text-sm font-semibold text-zinc-200 mt-3 mb-1" {...p} />,
  p:  ({ node, ...p }) => <p className="text-sm text-zinc-300 leading-relaxed my-2" {...p} />,
  strong: ({ node, ...p }) => <strong className="text-white font-semibold" {...p} />,
  em: ({ node, ...p }) => <em className="text-zinc-200 italic" {...p} />,
  ul: ({ node, ...p }) => <ul className="list-disc pl-5 my-2 space-y-1 text-sm text-zinc-300" {...p} />,
  ol: ({ node, ...p }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-sm text-zinc-300" {...p} />,
  li: ({ node, ...p }) => <li className="leading-relaxed" {...p} />,
  hr: () => <hr className="my-3 border-white/10" />,
  blockquote: ({ node, ...p }) => <blockquote className="border-l-2 border-indigo-500/40 pl-3 my-2 text-zinc-400 italic" {...p} />,
  a: ({ node, ...p }) => <a className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noreferrer" {...p} />,
  code: ({ node, className, children, ...p }) => {
    const isBlock =
      /language-\w/.test(className || '') ||
      (node?.position && node.position.start.line !== node.position.end.line);
    return isBlock ? (
      <code className={`block bg-black/40 text-zinc-200 rounded-lg p-3 my-2 text-xs font-mono whitespace-pre overflow-x-auto ${className || ''}`} {...p}>{children}</code>
    ) : (
      <code className="bg-white/5 text-indigo-300 rounded px-1 py-0.5 text-[0.85em] font-mono" {...p}>{children}</code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  table: ({ node, ...p }) => <div className="overflow-x-auto my-2"><table className="text-xs text-zinc-300 border-collapse" {...p} /></div>,
  th: ({ node, ...p }) => <th className="border border-white/10 px-2 py-1 bg-white/5 font-semibold text-left" {...p} />,
  td: ({ node, ...p }) => <td className="border border-white/10 px-2 py-1 align-top" {...p} />,
};

function Flashcard({ card, index, total }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExplain = async (e) => {
    e.stopPropagation();
    setShowExplanation(true);
    if (explanation || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await explainCard({ term: card.term, definition: card.definition });
      setExplanation(res.data.explanation);
    } catch (err) {
      setError(err.message || 'Failed to get explanation. Check your OpenAI API key.');
    } finally {
      setLoading(false);
    }
  };

  const closeExplanation = (e) => {
    e?.stopPropagation();
    setShowExplanation(false);
  };

  // Reset explanation when card changes
  if (card.id && explanation && card._lastExplainedId !== card.id) {
    // simple invalidation: we tag once, but since component remounts on key change in StudyPage,
    // we don't need extra logic here. Left intentionally minimal.
  }

  return (
    <div className="relative">
      <div
        className="flip-card w-full cursor-pointer select-none"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
          {/* Front - Term */}
          <div className="flip-card-front relative flex flex-col bg-[#141416] border border-white/5 rounded-2xl p-8 pt-12 pb-12 min-h-[360px]">
            <div className="absolute top-4 right-4 text-xs text-zinc-600">
              {index + 1} / {total}
            </div>
            <div className="absolute top-4 left-4 text-[10px] uppercase tracking-widest text-zinc-600 font-medium">
              Term
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              {card.term_image && (
                <img
                  src={uploadUrl(card.term_image)}
                  alt=""
                  className="max-h-32 rounded-xl object-contain shrink-0"
                />
              )}
              <p className="text-xl md:text-2xl font-semibold text-white text-left leading-relaxed whitespace-pre-wrap">
                {card.term}
              </p>
            </div>
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-zinc-700 whitespace-nowrap">Click to flip</p>
          </div>

          {/* Back - Definition */}
          <div className="flip-card-back relative flex flex-col bg-[#18181b] border border-white/5 rounded-2xl p-8 pt-12 pb-12 min-h-[360px]">
            <div className="absolute top-4 right-4 text-xs text-zinc-600">
              {index + 1} / {total}
            </div>
            <div className="absolute top-4 left-4 text-[10px] uppercase tracking-widest text-indigo-400 font-medium">
              Definition
            </div>
            <div className="flex-1 flex flex-col gap-4">
              {card.definition_image && (
                <img
                  src={uploadUrl(card.definition_image)}
                  alt=""
                  className="max-h-32 rounded-xl object-contain shrink-0 self-center"
                />
              )}
              <div className="w-full text-left">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {card.definition || ''}
                </ReactMarkdown>
              </div>
            </div>
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-zinc-700 whitespace-nowrap">Click to flip</p>
          </div>
        </div>
      </div>

      {/* Explain button */}
      <button
        onClick={handleExplain}
        className="mt-4 mx-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-400 hover:text-white hover:bg-indigo-600 border border-indigo-500/30 rounded-lg transition-all"
      >
        <Sparkles size={14} />
        Explain with AI
      </button>

      {/* Explanation overlay */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeExplanation}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl max-h-[80vh] overflow-y-auto bg-[#141416] border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">{card.term}</h3>
                </div>
                <button
                  onClick={closeExplanation}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-zinc-500 py-6">
                  <span className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  Generating explanation…
                </div>
              )}
              {error && <p className="text-sm text-red-400">{error}</p>}
              {!loading && !error && explanation && (
                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {explanation}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Flashcard;
