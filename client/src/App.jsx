import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import GroupPage from './pages/GroupPage';
import StudyPage from './pages/StudyPage';
import QuizPage from './pages/QuizPage';
import LearnPage from './pages/LearnPage';
import MatchPage from './pages/MatchPage';
import GravityPage from './pages/GravityPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/group/:id" element={<GroupPage />} />
                <Route path="/group/:id/study" element={<StudyPage />} />
                <Route path="/group/:id/learn" element={<LearnPage />} />
                <Route path="/group/:id/quiz" element={<QuizPage />} />
                <Route path="/group/:id/match" element={<MatchPage />} />
                <Route path="/group/:id/gravity" element={<GravityPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
