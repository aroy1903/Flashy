import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Image, X, ChevronDown, ChevronUp,
  FileText, Link2, ExternalLink, Sparkles, Clipboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadUrl, parseBulkCards } from '../api';
import { parseStructuredDeck } from '../utils/parseDeck';
import { stripMarkdown } from '../utils/stripMarkdown';

// ── Card row with per-card local state ──────────────────────────────────────
function CardRow({ card, index, onUpdate, onDelete, onImageUpload }) {
  const [expanded, setExpanded] = useState(false);
  const [localNotes, setLocalNotes] = useState(card.notes || '');

  useEffect(() => {
    setLocalNotes(card.notes || '');
  }, [card.notes]);

  const handleNotesBlur = () => {
    if (localNotes !== (card.notes || '')) {
      onUpdate(card.id, { ...card, notes: localNotes });
    }
  };

  const addLink = () => {
    const links = [...(card.external_links || []), { label: '', url: '' }];
    onUpdate(card.id, { ...card, external_links: links });
  };

  const removeLink = (idx) => {
    const links = (card.external_links || []).filter((_, i) => i !== idx);
    onUpdate(card.id, { ...card, external_links: links });
  };

  const updateLink = (idx, field, value) => {
    const links = (card.external_links || []).map((l, i) =>
      i === idx ? { ...l, [field]: value } : l
    );
    onUpdate(card.id, { ...card, external_links: links });
  };

  const hasExtras = !!(card.notes || (card.external_links && card.external_links.length > 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group relative bg-[#141416] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all"
    >
      {/* Card header */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <span className="text-xs text-zinc-600 mr-2">{index + 1}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Delete this card?')) onDelete(card.id);
          }}
          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
          aria-label="Delete card"
          title="Delete card"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Term / Definition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Term side */}
        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Term</label>
          <textarea
            value={card.term}
            onChange={(e) => onUpdate(card.id, { ...card, term: e.target.value })}
            rows={Math.min(8, Math.max(1, (card.term || '').split('\n').length))}
            className="w-full bg-transparent border-b border-white/10 pb-2 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-y"
          />
          {card.term_image && (
            <div className="mt-2 relative inline-block">
              <img src={uploadUrl(card.term_image)} alt="" className="h-20 rounded-lg object-cover" />
              <button
                onClick={() => onUpdate(card.id, { ...card, term_image: null })}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
              >
                <X size={10} className="text-white" />
              </button>
            </div>
          )}
          <label className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-400 cursor-pointer transition-colors">
            <Image size={12} />
            <span>Add image / GIF</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => onImageUpload(card.id, 'term_image', e.target.files[0])}
            />
          </label>
        </div>

        {/* Definition side */}
        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">
            Definition <span className="text-zinc-700 normal-case font-normal">(optional)</span>
          </label>
          <textarea
            value={card.definition || ''}
            onChange={(e) => onUpdate(card.id, { ...card, definition: e.target.value })}
            placeholder="Leave empty for image-only card. Multi-line, markdown, code blocks all welcome."
            rows={Math.min(20, Math.max(1, (card.definition || '').split('\n').length))}
            className="w-full bg-transparent border-b border-white/10 pb-2 text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors font-mono text-sm resize-y"
          />
          {card.definition_image && (
            <div className="mt-2 relative inline-block">
              <img src={uploadUrl(card.definition_image)} alt="" className="h-20 rounded-lg object-cover" />
              <button
                onClick={() => onUpdate(card.id, { ...card, definition_image: null })}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
              >
                <X size={10} className="text-white" />
              </button>
            </div>
          )}
          <label className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-400 cursor-pointer transition-colors">
            <Image size={12} />
            <span>Add image / GIF</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => onImageUpload(card.id, 'definition_image', e.target.files[0])}
            />
          </label>
        </div>
      </div>

      {/* Expand / collapse notes & links */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="mt-4 flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? 'Hide extras' : `Notes & links${hasExtras ? ' •' : ''}`}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4 border-t border-white/5 pt-4">
              {/* Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  <FileText size={11} />
                  Notes
                </label>
                <textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Add extra notes, mnemonics, context…"
                  rows={3}
                  className="w-full bg-[#0f0f11] border border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                />
              </div>

              {/* External links */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  <Link2 size={11} />
                  External Links
                </label>
                <div className="space-y-2">
                  {(card.external_links || []).map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateLink(idx, 'label', e.target.value)}
                        placeholder="Label"
                        className="w-28 bg-[#0f0f11] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateLink(idx, 'url', e.target.value)}
                        placeholder="https://..."
                        className="flex-1 bg-[#0f0f11] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                      <button
                        onClick={() => removeLink(idx)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addLink}
                    className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-indigo-400 transition-colors"
                  >
                    <Plus size={12} />
                    Add link
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Bulk add panel ───────────────────────────────────────────────────────────
function BulkAddPanel({ onBulkAdd, onClose }) {
  const [bulkText, setBulkText] = useState('');
  const [parsedCards, setParsedCards] = useState(null);
  const [parsedVia, setParsedVia] = useState(null); // 'structured' | 'ai'
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');

  const handleParseStructured = () => {
    const cards = parseStructuredDeck(bulkText);
    if (!cards || !cards.length) {
      setError('No "## Card N: Title" headings found. Use "Parse with AI" for free-form text.');
      return;
    }
    setError('');
    setParsedCards(cards);
    setParsedVia('structured');
  };

  const handleParseAI = async () => {
    if (!bulkText.trim()) return;
    setIsParsing(true);
    setError('');
    setParsedCards(null);
    try {
      const res = await parseBulkCards({ text: bulkText });
      setParsedCards(res.data.cards);
      setParsedVia('ai');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to parse. Check your OpenAI API key.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = () => {
    if (!parsedCards?.length) return;
    onBulkAdd(parsedCards);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-[#141416] border border-indigo-500/20 rounded-xl p-5 mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Bulk Add with AI</h3>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
          <X size={14} />
        </button>
      </div>

      <p className="text-xs text-zinc-500 mb-3">
        Paste your cards in any format — "term: X definition: Y", one per line, numbered lists, etc. AI will extract the pairs.
      </p>

      <textarea
        value={bulkText}
        onChange={(e) => { setBulkText(e.target.value); setParsedCards(null); setParsedVia(null); }}
        placeholder={`Photosynthesis: The process plants use to convert light into food\nMitosis: Cell division producing two identical daughter cells\n\n— or paste a structured deck —\n\n## Card 1: List\n**What it is:** ...\n\`\`\`\ncode block\n\`\`\`\n\n## Card 2: Tuple\n...`}
        rows={6}
        className="w-full bg-[#0f0f11] border border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none mb-3 font-mono"
      />

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      {parsedCards && (
        <div className="mb-3">
          <p className="text-xs text-zinc-500 mb-2">
            Found <span className="text-indigo-400 font-semibold">{parsedCards.length}</span> cards
            {parsedVia === 'structured' && <span className="text-emerald-400/80"> · markdown structure (no AI)</span>}
            {parsedVia === 'ai' && <span className="text-indigo-400/80"> · parsed with AI</span>}:
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {parsedCards.map((c, i) => {
              const preview = stripMarkdown(c.definition || '');
              const short = preview.length > 120 ? preview.slice(0, 120) + '…' : preview;
              return (
                <div key={i} className="bg-white/3 rounded-lg px-3 py-2 text-xs">
                  <span className="text-white font-medium">{c.term}</span>
                  {short && <span className="text-zinc-500"> — {short}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {!parsedCards ? (
          <>
            <button
              onClick={handleParseStructured}
              disabled={!bulkText.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Parses markdown decks with ## Card N: headers verbatim, no AI."
            >
              <FileText size={14} />
              Parse Markdown Deck
            </button>
            <button
              onClick={handleParseAI}
              disabled={!bulkText.trim() || isParsing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isParsing ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {isParsing ? 'Parsing…' : 'Parse with AI'}
            </button>
          </>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={!parsedCards.length}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Add {parsedCards.length} card{parsedCards.length !== 1 ? 's' : ''}
          </button>
        )}
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ── Main FlashcardEditor ─────────────────────────────────────────────────────
function FlashcardEditor({ cards, onAdd, onUpdate, onDelete, onImageUpload, onBulkAdd }) {
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const handleAdd = () => {
    if (!newTerm.trim()) return;
    onAdd({ term: newTerm.trim(), definition: newDefinition.trim() });
    setNewTerm('');
    setNewDefinition('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) handleAdd();
  };

  return (
    <div className="space-y-4">
      {/* Bulk add toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-600">Add cards one by one below, or use Bulk Add to paste many at once.</p>
        <button
          onClick={() => setShowBulkAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:text-white hover:bg-indigo-600 border border-indigo-500/30 rounded-lg transition-all"
        >
          <Clipboard size={12} />
          Bulk Add
        </button>
      </div>

      <AnimatePresence>
        {showBulkAdd && (
          <BulkAddPanel
            onBulkAdd={onBulkAdd}
            onClose={() => setShowBulkAdd(false)}
          />
        )}
      </AnimatePresence>

      {/* Existing cards */}
      {cards.map((card, index) => (
        <CardRow
          key={card.id}
          card={card}
          index={index}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onImageUpload={onImageUpload}
        />
      ))}

      {/* Add new card */}
      <div className="bg-[#141416] border border-dashed border-white/10 rounded-xl p-5 hover:border-indigo-500/30 transition-all">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Term</label>
            <input
              type="text"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter term..."
              className="w-full bg-transparent border-b border-white/10 pb-2 text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">
              Definition <span className="text-zinc-700 normal-case font-normal">(optional · markdown ok)</span>
            </label>
            <textarea
              value={newDefinition}
              onChange={(e) => setNewDefinition(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter definition. Press return for a new line, Ctrl+Enter to add the card."
              rows={3}
              className="w-full bg-transparent border-b border-white/10 pb-2 text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors font-mono text-sm resize-y"
            />
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!newTerm.trim()}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          Add Card
        </button>
        <p className="mt-2 text-xs text-zinc-600">Ctrl + Enter to add quickly</p>
      </div>
    </div>
  );
}

export default FlashcardEditor;
