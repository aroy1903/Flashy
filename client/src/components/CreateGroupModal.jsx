import { useEffect, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

function CreateGroupModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  onImportAnki,
  onImportText,
  isImporting = false
}) {
  const isEditMode = Boolean(initialData);
  const canImportAnki = !isEditMode && typeof onImportAnki === 'function';
  const canImportText = !isEditMode && typeof onImportText === 'function';
  const canImport = canImportAnki || canImportText;
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [color, setColor] = useState(initialData?.color || '#6366f1');
  const [mode, setMode] = useState('manual');
  const [deckFile, setDeckFile] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name || '');
    setDescription(initialData?.description || '');
    setColor(initialData?.color || '#6366f1');
    setMode('manual');
    setDeckFile(null);
    setError('');
    setSubmitting(false);
  }, [isOpen, initialData]);

  const busy = submitting || isImporting;

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'import_anki' && canImportAnki) {
      if (!deckFile) {
        setError('Please select an Anki .apkg or .colpkg file.');
        return;
      }
      setSubmitting(true);
      try {
        await onImportAnki({
          name: name.trim(),
          description: description.trim(),
          color,
          file: deckFile
        });
        onClose();
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to import Anki deck.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'import_text' && canImportText) {
      if (!deckFile) {
        setError('Please select a .txt, .tsv, or .csv file.');
        return;
      }
      setSubmitting(true);
      try {
        await onImportText({
          name: name.trim(),
          description: description.trim(),
          color,
          file: deckFile
        });
        onClose();
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to import text deck.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), color });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save set.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-[#141416] border border-white/10 rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {initialData ? 'Edit Set' : 'Create New Set'}
              </h2>
              <button onClick={handleClose} disabled={busy} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {canImport && (
              <div
                className={`grid gap-2 p-1 bg-white/5 rounded-xl mb-5 ${
                  canImportAnki && canImportText ? 'grid-cols-3' : 'grid-cols-2'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode('manual');
                    setError('');
                    setDeckFile(null);
                  }}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    mode === 'manual' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                  disabled={busy}
                >
                  Manual
                </button>
                {canImportAnki && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('import_anki');
                      setError('');
                      setDeckFile(null);
                    }}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      mode === 'import_anki' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                    disabled={busy}
                  >
                    Anki File
                  </button>
                )}
                {canImportText && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('import_text');
                      setError('');
                      setDeckFile(null);
                    }}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      mode === 'import_text' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                    disabled={busy}
                  >
                    Text File
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  {mode === 'manual' ? 'Name' : 'Set name (optional)'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={mode === 'manual' ? 'e.g., Biology Chapter 5' : 'Leave blank to use filename'}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  autoFocus={mode === 'manual'}
                  disabled={busy}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                  disabled={busy}
                />
              </div>

              {mode === 'import_anki' && canImportAnki && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Anki package</label>
                  <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-zinc-300 cursor-pointer hover:border-white/20 transition-colors">
                    <Upload size={16} />
                    <span className="text-sm line-clamp-1">
                      {deckFile?.name || 'Choose .apkg or .colpkg file'}
                    </span>
                    <input
                      type="file"
                      accept=".apkg,.colpkg,application/apkg"
                      className="hidden"
                      onChange={(e) => {
                        setDeckFile(e.target.files?.[0] || null);
                        setError('');
                      }}
                      disabled={busy}
                    />
                  </label>
                  <p className="text-xs text-zinc-600 mt-2">
                    Imports text fields from Anki cards in this package.
                  </p>
                </div>
              )}

              {mode === 'import_text' && canImportText && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Text export file</label>
                  <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-zinc-300 cursor-pointer hover:border-white/20 transition-colors">
                    <Upload size={16} />
                    <span className="text-sm line-clamp-1">
                      {deckFile?.name || 'Choose .txt, .tsv, or .csv file'}
                    </span>
                    <input
                      type="file"
                      accept=".txt,.tsv,.csv,text/plain,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        setDeckFile(e.target.files?.[0] || null);
                        setError('');
                      }}
                      disabled={busy}
                    />
                  </label>
                  <p className="text-xs text-zinc-600 mt-2">
                    Use two columns per line: term[TAB]definition (or CSV with first two columns).
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Color</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        color === c ? 'ring-2 ring-offset-2 ring-offset-[#141416] scale-110' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                      disabled={busy}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 text-sm font-medium text-zinc-400 bg-white/5 rounded-xl hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={busy}
                >
                  {busy
                    ? (mode === 'manual' ? 'Saving...' : 'Importing...')
                    : (mode === 'manual' ? (initialData ? 'Save' : 'Create') : 'Import Deck')}
                </button>
              </div>
            </form>
          </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CreateGroupModal;
