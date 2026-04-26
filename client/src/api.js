import axios from 'axios';

const isElectron = window.location.protocol === 'file:';

const api = axios.create({
  baseURL: isElectron ? 'http://localhost:5000/api' : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Groups
export const getGroups = () => api.get('/groups');
export const getGroup = (id) => api.get(`/groups/${id}`);
export const createGroup = (data) => api.post('/groups', data);
export const importAnkiDeck = (formData) => api.post('/groups/import/anki', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const importTextDeck = (formData) => api.post('/groups/import/text', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateGroup = (id, data) => api.put(`/groups/${id}`, data);
export const deleteGroup = (id) => api.delete(`/groups/${id}`);

// Flashcards
export const getFlashcards = (groupId) => api.get(`/flashcards/group/${groupId}`);
export const createFlashcard = (formData) => api.post('/flashcards', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateFlashcard = (id, formData) => api.put(`/flashcards/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteFlashcard = (id) => api.delete(`/flashcards/${id}`);

// Quizzes
export const generateQuiz = (groupId, type) => api.get(`/quizzes/generate/${groupId}?type=${type}`);
export const saveQuizResult = (data) => api.post('/quizzes/results', data);

export const uploadUrl = (filename) =>
  isElectron ? `http://localhost:5000/uploads/${filename}` : `/uploads/${filename}`;

export default api;
