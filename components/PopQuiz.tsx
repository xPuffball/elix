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
      <div className="absolute inset-0 bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] z-50 flex flex-col items-center justify-center">
        <Loader size={48} className="text-amber-600 animate-spin" />
        <p className="mt-4 text-[#A08060] font-brand text-lg">Generating your quiz...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] z-50 flex flex-col items-center justify-center gap-4">
        <p className="text-[#A08060] font-brand text-lg">Couldn't generate a quiz. Let's head back!</p>
        <button onClick={handleReturn} className="bg-gradient-to-r from-amber-600 to-amber-800 text-white px-6 py-3 rounded-2xl font-brand font-bold shadow-[0_4px_16px_rgba(139,90,43,0.25)]">
          Return to Classroom
        </button>
      </div>
    );
  }

  if (finished) {
    const bonus = score * COINS_PER_CORRECT;
    return (
      <div className="absolute inset-0 bg-[#F5EDDA]/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8">
        <div className="max-w-lg w-full bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-3xl shadow-[0_8px_40px_rgba(139,90,43,0.15)] p-8 border border-[#E8D5B7] anim-pop">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-amber-300 to-amber-500 w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_4px_16px_rgba(245,158,11,0.3)]">
              <Award size={36} className="text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-brand font-bold text-center text-[#5D3A1A] mb-2">Quiz Complete!</h2>
          <p className="text-center text-[#A08060] font-brand text-lg mb-6">You scored</p>

          <div className="text-center mb-6">
            <span className="text-6xl font-brand font-bold text-emerald-500">{score}</span>
            <span className="text-3xl font-brand font-bold text-[#C4A882]">/{questions.length}</span>
          </div>

          {bonus > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-center mb-6">
              <p className="font-brand font-bold text-amber-700">+{bonus} bonus coins earned!</p>
            </div>
          )}

          <button onClick={handleReturn}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-brand font-bold text-xl py-4 rounded-2xl hover:from-amber-700 hover:to-amber-900 shadow-[0_4px_16px_rgba(139,90,43,0.25)] active:scale-[0.98] transition-all">
            Return to Classroom
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];

  return (
    <div className="absolute inset-0 bg-[#F5EDDA]/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-3xl shadow-[0_8px_40px_rgba(139,90,43,0.15)] p-8 border border-[#E8D5B7] anim-scale-in">
        {/* Progress */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-brand font-bold text-[#A08060]">Question {currentIdx + 1} / {questions.length}</span>
          <span className="text-sm font-brand font-bold text-emerald-500">{score} correct</span>
        </div>

        <div className="flex gap-1 mb-6">
          {questions.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < currentIdx ? 'bg-emerald-400' : i === currentIdx ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-[#E8D5B7]'}`} />
          ))}
        </div>

        {/* Question */}
        <h3 className="text-xl font-brand font-bold text-[#5D3A1A] mb-6">{q.question}</h3>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {q.options.map((opt, i) => {
            let style = 'border-[#E8D5B7] bg-[#FFF5EB] hover:border-amber-400';
            if (answered) {
              if (i === q.correctIndex) style = 'border-emerald-400 bg-emerald-50';
              else if (i === selectedAnswer) style = 'border-rose-400 bg-rose-50';
              else style = 'border-[#E8D5B7] bg-[#F5EDDA] opacity-50';
            } else if (selectedAnswer === i) {
              style = 'border-amber-500 bg-amber-50';
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)}
                className={`w-full text-left p-4 rounded-xl border font-brand transition-all flex items-center gap-3 ${style}`}>
                <span className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1 text-[#4A2C17]">{opt}</span>
                {answered && i === q.correctIndex && <CheckCircle size={20} className="text-emerald-500 shrink-0" />}
                {answered && i === selectedAnswer && i !== q.correctIndex && <XCircle size={20} className="text-rose-500 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {answered && (
          <div className="bg-[#FFF5EB] border border-[#E8D5B7] rounded-xl p-4 mb-6">
            <p className="text-sm text-[#5D3A1A] font-brand">
              <span className="font-bold">Explanation:</span> {q.explanation}
            </p>
          </div>
        )}

        {/* Next Button */}
        {answered && (
          <button onClick={handleNext}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-brand font-bold text-lg py-3 rounded-2xl hover:from-amber-600 hover:to-orange-600 shadow-[0_4px_16px_rgba(245,158,11,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            {currentIdx < questions.length - 1 ? (<>Next Question <ArrowRight size={18} /></>) : 'See Results'}
          </button>
        )}
      </div>
    </div>
  );
};
