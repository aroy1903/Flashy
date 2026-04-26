import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import GroupPage from './pages/GroupPage';
import StudyPage from './pages/StudyPage';
import QuizPage from './pages/QuizPage';
import LearnPage from './pages/LearnPage';
import MatchPage from './pages/MatchPage';
import GravityPage from './pages/GravityPage';

function App() {
  return (
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
  );
}

export default App;
