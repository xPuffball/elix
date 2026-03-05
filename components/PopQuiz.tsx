import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { GameMode, QuizQuestion } from '../types';
import { generatePopQuiz } from '../services/geminiService';
import { CheckCircle, XCircle, Award, ArrowRight, Loader } from 'lucide-react';

const COINS_PER_CORRECT = 20;

export const PopQuiz = () => {
  const { activeLesson, chatHistory, setMode, addCoins } = useGameStore();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!activeLesson) return;
      const qs = await generatePopQuiz(activeLesson.topic, chatHistory, activeLesson.questionDifficulty);
      setQuestions(qs);
      setLoading(false);
    };
    load();
  }, []);

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelectedAnswer(idx);
    setAnswered(true);
    if (idx === questions[currentIdx].correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    } else {
      const bonus = score * COINS_PER_CORRECT;
      if (bonus > 0) addCoins(bonus);
      setFinished(true);
    }
  };

  const handleReturn = () => {
    setMode(GameMode.FREE_ROAM);
  };

  if (loading) {
    return (
      <div className="absolute inset-0 bg-cozy-bg z-50 flex flex-col items-center justify-center">
        <Loader size={48} className="text-cozy-brown animate-spin" />
        <p className="mt-4 text-gray-500 font-display text-lg">Generating your quiz...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="absolute inset-0 bg-cozy-bg z-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 font-display text-lg">Couldn't generate a quiz. Let's head back!</p>
        <button onClick={handleReturn} className="bg-cozy-brown text-white px-6 py-3 rounded-xl font-display font-bold">
          Return to Classroom
        </button>
      </div>
    );
  }

  if (finished) {
    const bonus = score * COINS_PER_CORRECT;
    return (
      <div className="absolute inset-0 bg-cozy-bg z-50 flex flex-col items-center justify-center p-8">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-8 border-4 border-cozy-green">
          <div className="flex justify-center mb-4">
            <Award size={64} className="text-yellow-400" />
          </div>
          <h2 className="text-3xl font-display font-bold text-center text-cozy-brown mb-2">Quiz Complete!</h2>
          <p className="text-center text-gray-500 text-lg mb-6">You scored</p>

          <div className="text-center mb-6">
            <span className="text-6xl font-display font-bold text-cozy-green">{score}</span>
            <span className="text-3xl font-display font-bold text-gray-400">/{questions.length}</span>
          </div>

          {bonus > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-center mb-6">
              <p className="font-display font-bold text-yellow-700">+{bonus} bonus coins earned!</p>
            </div>
          )}

          <button onClick={handleReturn}
            className="w-full bg-cozy-brown text-white font-display font-bold text-xl py-4 rounded-xl hover:bg-brown-600 shadow-lg active:scale-95 transition-transform">
            Return to Classroom
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];

  return (
    <div className="absolute inset-0 bg-cozy-bg z-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8 border-4 border-cozy-blue">
        {/* Progress */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-display font-bold text-gray-400">Question {currentIdx + 1} / {questions.length}</span>
          <span className="text-sm font-display font-bold text-cozy-green">{score} correct</span>
        </div>

        <div className="flex gap-1 mb-6">
          {questions.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < currentIdx ? 'bg-cozy-green' : i === currentIdx ? 'bg-cozy-blue' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* Question */}
        <h3 className="text-xl font-display font-bold text-cozy-brown mb-6">{q.question}</h3>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {q.options.map((opt, i) => {
            let style = 'border-orange-200 bg-orange-50 hover:border-cozy-brown';
            if (answered) {
              if (i === q.correctIndex) style = 'border-green-400 bg-green-50';
              else if (i === selectedAnswer) style = 'border-red-400 bg-red-50';
              else style = 'border-gray-200 bg-gray-50 opacity-60';
            } else if (selectedAnswer === i) {
              style = 'border-cozy-blue bg-blue-50';
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)}
                className={`w-full text-left p-4 rounded-xl border-2 font-display transition-all flex items-center gap-3 ${style}`}>
                <span className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {answered && i === q.correctIndex && <CheckCircle size={20} className="text-green-500 shrink-0" />}
                {answered && i === selectedAnswer && i !== q.correctIndex && <XCircle size={20} className="text-red-500 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {answered && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-800 font-display">
              <span className="font-bold">Explanation:</span> {q.explanation}
            </p>
          </div>
        )}

        {/* Next Button */}
        {answered && (
          <button onClick={handleNext}
            className="w-full bg-cozy-green text-white font-display font-bold text-lg py-3 rounded-xl hover:bg-green-500 shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
            {currentIdx < questions.length - 1 ? (<>Next Question <ArrowRight size={18} /></>) : 'See Results'}
          </button>
        )}
      </div>
    </div>
  );
};
