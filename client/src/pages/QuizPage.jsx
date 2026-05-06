import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { getGroup, generateQuiz, saveQuizResult, uploadUrl } from '../api';
import { stripMarkdown } from '../utils/stripMarkdown';

function QuizPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [quizType, setQuizType] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizLoading, setQuizLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGroup();
  }, [id]);

  const fetchGroup = async () => {
    try {
      const { data } = await getGroup(id);
      setGroup(data);
    } catch (err) {
      console.error('Failed to fetch group:', err);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (type) => {
    setError(null);
    setQuizLoading(true);
    try {
      const { data } = await generateQuiz(id, type);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswers({});
      setShowResults(false);
      setQuizType(type);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const score = questions.reduce((acc, q) => {
      if (q.type === 'multiple_choice') {
        return acc + (answers[q.id] === q.correct_answer ? 1 : 0);
      } else if (q.type === 'true_false') {
        return acc + (answers[q.id] === q.correct_answer ? 1 : 0);
      } else if (q.type === 'written') {
        const userAnswer = (answers[q.id] || '').trim().toLowerCase();
        const correct = stripMarkdown(q.correct_answer).toLowerCase();
        return acc + (userAnswer === correct ? 1 : 0);
      }
      return acc;
    }, 0);

    try {
      await saveQuizResult({
        group_id: id,
        score,
        total: questions.length,
        quiz_type: quizType
      });
    } catch (err) {
      console.error('Failed to save result:', err);
    }

    setShowResults(true);
  };

  const getScore = () => {
    return questions.reduce((acc, q) => {
      if (q.type === 'multiple_choice') {
        return acc + (answers[q.id] === q.correct_answer ? 1 : 0);
      } else if (q.type === 'true_false') {
        return acc + (answers[q.id] === q.correct_answer ? 1 : 0);
      } else if (q.type === 'written') {
        const userAnswer = (answers[q.id] || '').trim().toLowerCase();
        const correct = stripMarkdown(q.correct_answer).toLowerCase();
        return acc + (userAnswer === correct ? 1 : 0);
      }
      return acc;
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Quiz type selection
  if (!quizType) {
    return (
      <div>
        <div className="mb-8">
          <Link to={`/group/${id}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white mb-4 transition-colors">
            <ArrowLeft size={14} />
            Back to {group?.name}
          </Link>
          <h1 className="text-2xl font-bold text-white">Quiz Mode</h1>
          <p className="text-zinc-500 text-sm mt-1">Choose a quiz type to test your knowledge</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
          {[
            { type: 'multiple_choice', label: 'Multiple Choice', desc: 'Pick the correct answer from 4 options', min: 4 },
            { type: 'true_false', label: 'True / False', desc: 'Determine if the pairing is correct', min: 2 },
            { type: 'written', label: 'Written', desc: 'Type the answer from memory', min: 1 }
          ].map((quiz) => (
            <motion.button
              key={quiz.type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startQuiz(quiz.type)}
              className="text-left bg-[#141416] border border-white/5 rounded-2xl p-6 hover:border-indigo-500/30 transition-all"
            >
              <h3 className="text-base font-semibold text-white mb-2">{quiz.label}</h3>
              <p className="text-sm text-zinc-500">{quiz.desc}</p>
              <p className="text-xs text-zinc-700 mt-3">Min {quiz.min} cards</p>
            </motion.button>
          ))}
        </div>

        {quizLoading && (
          <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Generating quiz...
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Results screen
  if (showResults) {
    const score = getScore();
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
            <Trophy size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
          <p className="text-zinc-500 mb-8">{group?.name}</p>

          <div className="bg-[#141416] border border-white/5 rounded-2xl p-8 mb-8">
            <div className="text-5xl font-bold text-white mb-2">{percentage}%</div>
            <p className="text-zinc-400">
              {score} out of {questions.length} correct
            </p>
            <div className="w-full h-2 bg-white/5 rounded-full mt-6 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
          </div>

          {/* Review answers */}
          <div className="space-y-3 text-left mb-8">
            {questions.map((q, i) => {
              const userAnswer = answers[q.id];
              let isCorrect;
              if (q.type === 'written') {
                isCorrect = (userAnswer || '').trim().toLowerCase() === stripMarkdown(q.correct_answer).toLowerCase();
              } else {
                isCorrect = userAnswer === q.correct_answer;
              }

              return (
                <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle2 size={18} className="text-green-400 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm text-white font-medium">{q.question}</p>
                      {!isCorrect && (
                        <p className="text-xs text-zinc-500 mt-1">
                          Correct: <span className="text-green-400">{q.type === 'true_false' ? String(q.correct_answer) : stripMarkdown(String(q.correct_answer))}</span>
                          {userAnswer !== undefined && (
                            <> | Your answer: <span className="text-red-400">{q.type === 'multiple_choice' ? stripMarkdown(String(userAnswer)) : String(userAnswer)}</span></>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setQuizType(null); setShowResults(false); }}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <RotateCcw size={16} />
              Try Again
            </button>
            <Link
              to={`/group/${id}`}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Back to Set
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active quiz
  const currentQuestion = questions[currentIndex];
  const allAnswered = questions.every(q => answers[q.id] !== undefined);

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => { setQuizType(null); setError(null); }}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          Change quiz type
        </button>
        <h1 className="text-2xl font-bold text-white">
          {quizType === 'multiple_choice' ? 'Multiple Choice' : quizType === 'true_false' ? 'True / False' : 'Written'}
        </h1>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Progress */}
        <div className="w-full h-1 bg-white/5 rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="text-sm text-zinc-600 mb-6">
          Question {currentIndex + 1} of {questions.length}
        </div>

        {/* Question */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#141416] border border-white/5 rounded-2xl p-8 mb-6"
        >
          {currentQuestion.question_image && (
            <img
              src={uploadUrl(currentQuestion.question_image)}
              alt=""
              className="max-h-40 rounded-xl object-contain mb-4"
            />
          )}
          <h3 className="text-xl font-semibold text-white mb-6">{currentQuestion.question}</h3>

          {/* Multiple Choice */}
          {currentQuestion.type === 'multiple_choice' && (
            <div className="space-y-3">
              {currentQuestion.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(currentQuestion.id, option)}
                  className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${
                    answers[currentQuestion.id] === option
                      ? 'border-indigo-500 bg-indigo-600/15 text-white'
                      : 'border-white/5 hover:border-white/15 text-zinc-300 hover:text-white'
                  }`}
                >
                  <span className="text-xs text-zinc-600 mr-3 font-mono">{String.fromCharCode(65 + i)}</span>
                  {stripMarkdown(option)}
                </button>
              ))}
            </div>
          )}

          {/* True/False */}
          {currentQuestion.type === 'true_false' && (
            <div>
              <div className="mb-4 p-4 bg-white/5 rounded-xl">
                <p className="text-sm text-zinc-400">Proposed definition:</p>
                <p className="text-white mt-1">{stripMarkdown(currentQuestion.shown_answer)}</p>
              </div>
              <div className="flex gap-3">
                {[true, false].map((val) => (
                  <button
                    key={String(val)}
                    onClick={() => handleAnswer(currentQuestion.id, val)}
                    className={`flex-1 px-5 py-4 rounded-xl border font-medium transition-all ${
                      answers[currentQuestion.id] === val
                        ? val ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-red-500 bg-red-500/10 text-red-400'
                        : 'border-white/5 hover:border-white/15 text-zinc-300'
                    }`}
                  >
                    {val ? 'True' : 'False'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Written */}
          {currentQuestion.type === 'written' && (
            <input
              type="text"
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
              placeholder="Type your answer..."
              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all"
              autoFocus
            />
          )}
        </motion.div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          {currentIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Next
            </button>
          )}
        </div>

        {/* Question dots */}
        <div className="flex items-center justify-center gap-1.5 mt-8">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex
                  ? 'bg-indigo-600 w-6'
                  : answers[q.id] !== undefined
                    ? 'bg-indigo-500/50'
                    : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default QuizPage;
