import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Brain, Settings, Trash2, BookOpen, Layers, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { getGroup, getFlashcards, createFlashcard, updateFlashcard, deleteFlashcard, updateGroup } from '../api';
import FlashcardEditor from '../components/FlashcardEditor';
import CreateGroupModal from '../components/CreateGroupModal';

function GroupPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [groupRes, cardsRes] = await Promise.all([
        getGroup(id),
        getFlashcards(id)
      ]);
      setGroup(groupRes.data);
      setCards(cardsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (cardData) => {
    try {
      const formData = new FormData();
      formData.append('group_id', id);
      formData.append('term', cardData.term);
      formData.append('definition', cardData.definition);
      formData.append('position', cards.length);
      await createFlashcard(formData);
      fetchData();
    } catch (error) {
      console.error('Failed to add card:', error);
    }
  };

  const handleUpdateCard = async (cardId, updatedCard) => {
    try {
      const formData = new FormData();
      formData.append('term', updatedCard.term);
      formData.append('definition', updatedCard.definition);
      const original = cards.find(c => c.id === cardId);
      if (original?.term_image && updatedCard.term_image === null) {
        formData.append('clear_term_image', 'true');
      }
      if (original?.definition_image && updatedCard.definition_image === null) {
        formData.append('clear_definition_image', 'true');
      }
      await updateFlashcard(cardId, formData);
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updatedCard } : c));
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  };

  const handleDeleteCard = async (cardId) => {
    try {
      await deleteFlashcard(cardId);
      setCards(prev => prev.filter(c => c.id !== cardId));
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  const handleImageUpload = async (cardId, field, file) => {
    if (!file) return;
    try {
      const formData = new FormData();
      const card = cards.find(c => c.id === cardId);
      formData.append('term', card.term);
      formData.append('definition', card.definition);
      formData.append(field, file);
      await updateFlashcard(cardId, formData);
      fetchData();
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  };

  const handleEditGroup = async (data) => {
    try {
      await updateGroup(id, data);
      fetchData();
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  };

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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white mb-4 transition-colors">
          <ArrowLeft size={14} />
          Back to sets
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
              <h1 className="text-2xl font-bold text-white">{group.name}</h1>
            </div>
            {group.description && (
              <p className="text-zinc-500 mt-1 ml-6">{group.description}</p>
            )}
            <p className="text-sm text-zinc-600 mt-2 ml-6">{cards.length} cards</p>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="p-2 text-zinc-600 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Mode Cards */}
      {cards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10"
        >
          {[
            { to: `/group/${id}/study`, icon: Play, label: 'Study', desc: 'Flip through cards', accent: 'indigo' },
            { to: `/group/${id}/learn`, icon: BookOpen, label: 'Learn', desc: 'Self-assessment', accent: 'purple' },
            { to: `/group/${id}/quiz`, icon: Brain, label: 'Quiz', desc: 'Multiple choice & more', accent: 'blue' },
            { to: `/group/${id}/match`, icon: Layers, label: 'Match', desc: 'Match term to definition', accent: 'emerald' },
            { to: `/group/${id}/gravity`, icon: Zap, label: 'Gravity', desc: 'Type before it falls', accent: 'orange' },
          ].map(({ to, icon: Icon, label, desc, accent }) => (
            <Link
              key={to}
              to={to}
              className={`group flex flex-col gap-3 p-5 bg-[#141416] border border-white/5 hover:border-white/15 rounded-2xl transition-all hover:bg-[#18181b]`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                accent === 'indigo' ? 'bg-indigo-600/20 text-indigo-400' :
                accent === 'purple' ? 'bg-purple-500/15 text-purple-400' :
                accent === 'blue'   ? 'bg-blue-500/15 text-blue-400' :
                accent === 'emerald'? 'bg-emerald-500/15 text-emerald-400' :
                                     'bg-orange-500/15 text-orange-400'
              }`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </motion.div>
      )}

      {/* Card Editor */}
      <div>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
          Cards
        </h2>
        <FlashcardEditor
          cards={cards}
          onAdd={handleAddCard}
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
          onImageUpload={handleImageUpload}
        />
      </div>

      <CreateGroupModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditGroup}
        initialData={group}
      />
    </div>
  );
}

export default GroupPage;
