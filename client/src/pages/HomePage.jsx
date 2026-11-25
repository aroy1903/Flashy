import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Search, X, Pencil, Trash2, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  getGroups, createGroup, deleteGroup,
  getDeckCollections, createDeckCollection,
  renameDeckCollection, deleteDeckCollection, setDeckCollectionMembers,
} from '../api';
import CreateGroupModal from '../components/CreateGroupModal';

const FILTER_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];
const COLLECTION_STORAGE_KEY = 'home.collectionFilter';

function HomePage() {
  const [groups, setGroups] = useState([]);
  const [collections, setCollections] = useState([]);
  const [collectionFilter, setCollectionFilter] = useState(() => {
    if (typeof window === 'undefined') return 'all';
    return window.localStorage.getItem(COLLECTION_STORAGE_KEY) || 'all';
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [collectionEditor, setCollectionEditor] = useState(null); // null | { mode, collection? }
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COLLECTION_STORAGE_KEY, collectionFilter);
    }
  }, [collectionFilter]);

  const fetchAll = async () => {
    try {
      const [{ data: g }, { data: cols }] = await Promise.all([
        getGroups(),
        getDeckCollections(),
      ]);
      setGroups(g);
      setCollections(cols);
      setCollectionFilter((cur) =>
        cur === 'all' || cols.some((c) => c.id === cur) ? cur : 'all'
      );
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchGroups = fetchAll;

  const handleCreateGroup = async (groupData) => {
    try {
      await createGroup(groupData);
      await fetchGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  };

  const handleDeleteGroup = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Delete this set and all its cards?')) {
      try {
        await deleteGroup(id);
        fetchGroups();
      } catch (error) {
        console.error('Failed to delete group:', error);
        alert(`Failed to delete set: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  const isFolderView = collectionFilter === 'all';
  const assignedIds = new Set(collections.flatMap((c) => c.group_ids));
  const unassignedDecks = groups.filter((g) => !assignedIds.has(g.id));

  const memberSet =
    collectionFilter === '__unassigned__'
      ? new Set(unassignedDecks.map((g) => g.id))
      : collectionFilter === 'all'
      ? null
      : new Set(collections.find((c) => c.id === collectionFilter)?.group_ids ?? []);

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchesColor = colorFilter === 'all' || g.color === colorFilter;
    const matchesCollection = !memberSet || memberSet.has(g.id);
    return matchesSearch && matchesColor && matchesCollection;
  });

  const folderMatchesColor = (decks) =>
    colorFilter === 'all' || decks.some((g) => g.color === colorFilter);

  const folderCards = (() => {
    const items = collections.map((c) => {
      const memberDecks = groups.filter((g) => c.group_ids.includes(g.id));
      return {
        kind: 'collection',
        id: c.id,
        name: c.name,
        count: c.group_ids.length,
        sampleColors: memberDecks.slice(0, 4).map((g) => g.color),
        decks: memberDecks,
        raw: c,
      };
    });
    if (unassignedDecks.length > 0) {
      items.push({
        kind: 'unassigned',
        id: '__unassigned__',
        name: 'Unassigned',
        count: unassignedDecks.length,
        sampleColors: unassignedDecks.slice(0, 4).map((g) => g.color),
        decks: unassignedDecks,
      });
    }
    const q = search.toLowerCase();
    return items.filter(
      (i) => (!q || i.name.toLowerCase().includes(q)) && folderMatchesColor(i.decks),
    );
  })();

  const handleDeleteCollection = async (col) => {
    if (!window.confirm(`Delete collection "${col.name}"? Decks inside will not be deleted.`)) return;
    try {
      await deleteDeckCollection(col.id);
      if (collectionFilter === col.id) setCollectionFilter('all');
      fetchAll();
    } catch (e) {
      alert(`Failed to delete: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Your Sets</h1>
        <p className="text-zinc-500">Create and study flashcard sets</p>
      </div>

      {/* Search & Create */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            placeholder={isFolderView ? 'Search collections...' : 'Search sets...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} />
          New Set
        </button>
      </div>

      {/* Filter dropdowns */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        <CollectionDropdown
          collections={collections}
          active={collectionFilter}
          hasUnassigned={unassignedDecks.length > 0}
          onPick={setCollectionFilter}
          onEdit={(c) => setCollectionEditor({ mode: 'edit', collection: c })}
          onDelete={handleDeleteCollection}
          onNew={() => setCollectionEditor({ mode: 'new' })}
        />
        <ColorDropdown
          colors={FILTER_COLORS}
          active={colorFilter}
          onPick={setColorFilter}
        />
      </div>

      {/* Folder view (collection cards) */}
      {isFolderView ? (
        folderCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Folder size={24} className="text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-zinc-400 mb-1">
              {search ? 'No collections found' : 'No collections yet'}
            </h3>
            <p className="text-sm text-zinc-600 mb-6">
              {search ? 'Try a different search' : 'Create a collection to organize your decks'}
            </p>
            {!search && (
              <button
                onClick={() => setCollectionEditor({ mode: 'new' })}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus size={16} />
                New Collection
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {folderCards.map((f, index) => (
              <motion.button
                key={f.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setCollectionFilter(f.id)}
                className="group text-left bg-[#141416] border border-white/5 rounded-2xl p-6 hover:border-white/10 hover:bg-[#18181b] transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 flex-wrap max-w-[160px]">
                    {f.sampleColors.length === 0 ? (
                      <Folder size={18} className="text-zinc-600" />
                    ) : (
                      f.sampleColors.map((c, i) => (
                        <span
                          key={i}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: c }}
                        />
                      ))
                    )}
                  </div>
                  {f.kind === 'collection' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCollectionEditor({ mode: 'edit', collection: f.raw });
                      }}
                      className="text-zinc-600 hover:text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      aria-label={`Edit collection ${f.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
                <h3 className="text-base font-semibold text-white mb-1 line-clamp-1">{f.name}</h3>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs font-medium text-zinc-500 bg-white/5 px-2.5 py-1 rounded-md">
                    {f.count} {f.count === 1 ? 'deck' : 'decks'}
                  </span>
                  <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
        )
      ) : filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <BookOpen size={24} className="text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-zinc-400 mb-1">
            {search ? 'No sets found' : 'No sets here'}
          </h3>
          <p className="text-sm text-zinc-600 mb-6">
            {search ? 'Try a different search' : 'Add decks to this collection from its edit menu'}
          </p>
          {!search && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={16} />
              Create Set
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredGroups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/group/${group.id}`}
                className="group block bg-[#141416] border border-white/5 rounded-2xl p-6 hover:border-white/10 hover:bg-[#18181b] transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <button
                    onClick={(e) => handleDeleteGroup(e, group.id)}
                    className="text-xs text-zinc-500 hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all"
                  >
                    Delete
                  </button>
                </div>
                <h3 className="text-base font-semibold text-white mb-1 line-clamp-1">
                  {group.name}
                </h3>
                {group.description && (
                  <p className="text-sm text-zinc-500 mb-3 line-clamp-2">
                    {group.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-xs font-medium text-zinc-500 bg-white/5 px-2.5 py-1 rounded-md">
                    {group.card_count} {group.card_count === 1 ? 'card' : 'cards'}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <CreateGroupModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateGroup}
      />

      {collectionEditor && (
        <CollectionEditorModal
          editor={collectionEditor}
          groups={groups}
          onClose={() => setCollectionEditor(null)}
          onDelete={handleDeleteCollection}
          onSaved={(newId) => {
            setCollectionEditor(null);
            if (newId) setCollectionFilter(newId);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

function CollectionEditorModal({ editor, groups, onClose, onSaved, onDelete }) {
  const mode = editor.mode;
  const existing = editor.collection;
  const [name, setName] = useState(existing?.name ?? '');
  const [selected, setSelected] = useState(() => new Set(existing?.group_ids ?? []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (gid) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid);
      else next.add(gid);
      return next;
    });

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give your collection a name.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (mode === 'new') {
        const { data } = await createDeckCollection({
          name: trimmed,
          group_ids: [...selected],
        });
        onSaved(data.id);
      } else {
        if (trimmed !== existing.name) await renameDeckCollection(existing.id, trimmed);
        await setDeckCollectionMembers(existing.id, [...selected]);
        onSaved(existing.id);
      }
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] flex flex-col bg-[#141416] border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">
            {mode === 'new' ? 'New Collection' : 'Edit Collection'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Collection name"
          className="w-full px-3 py-2 mb-4 bg-white/5 border border-white/10 focus:border-indigo-500/50 focus:outline-none rounded-lg text-sm text-white placeholder-zinc-500"
        />

        <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">
          Decks in this collection
        </p>
        <div className="flex-1 overflow-y-auto -mx-1 px-1 mb-3 space-y-1">
          {groups.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">You don't have any decks yet.</p>
          ) : (
            groups.map((g) => {
              const on = selected.has(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggle(g.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-left ${
                    on
                      ? 'bg-white/5 border-white/10'
                      : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                  <span className="flex-1 text-sm text-white truncate">{g.name}</span>
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                      on ? 'bg-indigo-600 text-white' : 'border border-white/15 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                </button>
              );
            })
          )}
        </div>

        {error && <p className="text-sm text-red-400 mb-2">{error}</p>}

        <div className="flex items-center gap-2">
          {mode === 'edit' && (
            <button
              onClick={() => { onClose(); onDelete(existing); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {busy ? 'Saving…' : (mode === 'new' ? 'Create' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterDropdown({ label, displayValue, accent, children }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-colors min-w-[180px]"
      >
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
          {label}
        </span>
        <span className="flex-1 flex items-center gap-2 text-sm text-white text-left truncate">
          {accent}
          <span className="truncate">{displayValue}</span>
        </span>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-2 min-w-full max-w-xs bg-[#141416] border border-white/10 rounded-xl shadow-xl p-1 max-h-[60vh] overflow-y-auto">
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

function CollectionDropdown({ collections, active, hasUnassigned, onPick, onEdit, onDelete, onNew }) {
  const displayValue =
    active === 'all'
      ? 'All collections'
      : active === '__unassigned__'
      ? 'Unassigned'
      : collections.find((c) => c.id === active)?.name ?? 'All collections';

  return (
    <FilterDropdown label="Collection" displayValue={displayValue}>
      {(close) => (
        <>
          <DropdownRow
            label="All collections"
            active={active === 'all'}
            onClick={() => { onPick('all'); close(); }}
          />
          {hasUnassigned && (
            <DropdownRow
              label="Unassigned"
              active={active === '__unassigned__'}
              onClick={() => { onPick('__unassigned__'); close(); }}
            />
          )}
          {collections.length > 0 && <div className="my-1 border-t border-white/5" />}
          {collections.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center rounded-lg ${active === c.id ? 'bg-indigo-600/15' : 'hover:bg-white/5'}`}
            >
              <button
                onClick={() => { onPick(c.id); close(); }}
                className={`flex-1 text-left px-3 py-2 text-sm truncate ${
                  active === c.id ? 'text-indigo-300 font-semibold' : 'text-zinc-200'
                }`}
              >
                {c.name}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); close(); onEdit(c); }}
                className="p-1.5 text-zinc-500 hover:text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label={`Edit ${c.name}`}
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); close(); onDelete(c); }}
                className="p-1.5 mr-1 text-zinc-500 hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label={`Delete ${c.name}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="mt-1 pt-1 border-t border-white/5">
            <button
              onClick={() => { close(); onNew(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
            >
              <Plus size={14} />
              New collection
            </button>
          </div>
        </>
      )}
    </FilterDropdown>
  );
}

function ColorDropdown({ colors, active, onPick }) {
  const accent =
    active === 'all'
      ? null
      : <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: active }} />;
  const displayValue = active === 'all' ? 'All colors' : 'Color';

  return (
    <FilterDropdown label="Color" displayValue={displayValue} accent={accent}>
      {(close) => (
        <>
          <DropdownRow
            label="All colors"
            active={active === 'all'}
            onClick={() => { onPick('all'); close(); }}
          />
          <div className="my-1 border-t border-white/5" />
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => { onPick(c); close(); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${
                active === c ? 'bg-indigo-600/15 text-indigo-300 font-semibold' : 'text-zinc-200 hover:bg-white/5'
              }`}
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
              {c}
            </button>
          ))}
        </>
      )}
    </FilterDropdown>
  );
}

function DropdownRow({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm rounded-lg ${
        active ? 'bg-indigo-600/15 text-indigo-300 font-semibold' : 'text-zinc-200 hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  );
}

export default HomePage;
