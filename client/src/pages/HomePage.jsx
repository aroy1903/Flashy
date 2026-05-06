import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { getGroups, createGroup, deleteGroup } from '../api';
import CreateGroupModal from '../components/CreateGroupModal';

const FILTER_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

function HomePage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await getGroups();
      setGroups(data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchesColor = colorFilter === 'all' || g.color === colorFilter;
    return matchesSearch && matchesColor;
  });

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
            placeholder="Search sets..."
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

      {/* Color filter */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        <button
          onClick={() => setColorFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            colorFilter === 'all'
              ? 'bg-white/10 text-white'
              : 'text-zinc-500 hover:text-white hover:bg-white/5'
          }`}
        >
          All
        </button>
        {FILTER_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColorFilter(c)}
            aria-label={`Filter by ${c}`}
            className={`w-6 h-6 rounded-full transition-all ${
              colorFilter === c
                ? 'ring-2 ring-offset-2 ring-offset-[#0a0a0b] ring-white/40 scale-110'
                : 'opacity-60 hover:opacity-100 hover:scale-110'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <BookOpen size={24} className="text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-zinc-400 mb-1">
            {search ? 'No sets found' : 'No sets yet'}
          </h3>
          <p className="text-sm text-zinc-600 mb-6">
            {search ? 'Try a different search' : 'Create your first flashcard set to get started'}
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
                    className="text-xs text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
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
    </div>
  );
}

export default HomePage;
