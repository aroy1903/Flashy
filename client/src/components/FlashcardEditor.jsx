import { useState } from 'react';
import { Plus, Trash2, Image, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { uploadUrl } from '../api';

function FlashcardEditor({ cards, onAdd, onUpdate, onDelete, onImageUpload }) {
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');

  const handleAdd = () => {
    if (!newTerm.trim() || !newDefinition.trim()) return;
    onAdd({ term: newTerm.trim(), definition: newDefinition.trim() });
    setNewTerm('');
    setNewDefinition('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAdd();
    }
  };

  return (
    <div className="space-y-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="group relative bg-[#141416] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all"
        >
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-zinc-600 mr-2">{index + 1}</span>
            <button
              onClick={() => onDelete(card.id)}
              className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Term</label>
              <input
                type="text"
                value={card.term}
                onChange={(e) => onUpdate(card.id, { ...card, term: e.target.value })}
                className="w-full bg-transparent border-b border-white/10 pb-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
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
              <label className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600 hover:text-indigo-400 cursor-pointer transition-colors">
                <Image size={12} />
                <span>Add image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onImageUpload(card.id, 'term_image', e.target.files[0])}
                />
              </label>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Definition</label>
              <input
                type="text"
                value={card.definition}
                onChange={(e) => onUpdate(card.id, { ...card, definition: e.target.value })}
                className="w-full bg-transparent border-b border-white/10 pb-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
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
              <label className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600 hover:text-indigo-400 cursor-pointer transition-colors">
                <Image size={12} />
                <span>Add image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onImageUpload(card.id, 'definition_image', e.target.files[0])}
                />
              </label>
            </div>
          </div>
        </motion.div>
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
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Definition</label>
            <input
              type="text"
              value={newDefinition}
              onChange={(e) => setNewDefinition(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter definition..."
              className="w-full bg-transparent border-b border-white/10 pb-2 text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!newTerm.trim() || !newDefinition.trim()}
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
