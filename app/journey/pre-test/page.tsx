'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useJourneyStore } from '@/lib/journeyStore';
import { PRETEST_QUESTIONS } from '@/lib/testsData';

export default function PreTestPage() {
  const router = useRouter();
  const { preTestScore, setPreTestScore, studentName } = useJourneyStore();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(PRETEST_QUESTIONS.length).fill(-1));
  const [isFinished, setIsFinished] = useState(false);

  // If already taken, redirect to journey
  useEffect(() => {
    if (preTestScore !== null) {
      router.replace('/journey');
    }
  }, [preTestScore, router]);

  const handleSelectOption = (optIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < PRETEST_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate score (0 - 100)
      let correct = 0;
      answers.forEach((ans, idx) => {
        if (ans === PRETEST_QUESTIONS[idx].correctAnswer) {
          correct++;
        }
      });
      const score = Math.round((correct / PRETEST_QUESTIONS.length) * 100);
      setPreTestScore(score);
      setIsFinished(true);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  if (isFinished || preTestScore !== null) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 border-4 border-emerald-500 shadow-xl">
          <span className="material-symbols-outlined text-5xl text-emerald-600">check</span>
        </div>
        <h2 className="text-3xl font-extrabold text-[#083b54] mb-4" style={{ fontFamily: 'var(--font-outfit)' }}>
          Pretest Selesai!
        </h2>
        <p className="text-slate-600 mb-8 max-w-md">
          Bagus sekali, {studentName || 'Siswa'}! Kamu telah menyelesaikan penilaian awal. Mari kita mulai ekspedisi MicroJourney AR untuk mempelajari lebih dalam!
        </p>
        <button
          onClick={() => router.push('/journey')}
          className="bg-[linear-gradient(180deg,#f0a345_0%,#d27b22_100%)] text-white font-extrabold py-4 px-10 rounded-2xl shadow-[0_6px_0_#9a5310] active:translate-y-1 active:shadow-[0_2px_0_#9a5310] flex items-center gap-2 text-lg transition-all"
        >
          Mulai Ekspedisi <span className="material-symbols-outlined">explore</span>
        </button>
      </div>
    );
  }

  const q = PRETEST_QUESTIONS[currentQuestion];
  const hasAnswered = answers[currentQuestion] !== -1;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-slate-50 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-[#083b54] mb-2" style={{ fontFamily: 'var(--font-outfit)' }}>
            Tes Pemahaman Awal (Pre-test)
          </h1>
          <p className="text-slate-500 text-sm">Jawablah pertanyaan berikut sebelum memulai ekspedisi.</p>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-8 justify-center">
          {PRETEST_QUESTIONS.map((_, i) => (
            <div 
              key={i} 
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === currentQuestion ? 'w-10 bg-[#006591]' : 
                answers[i] !== -1 ? 'w-6 bg-[#006591]/40' : 'w-6 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-100 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#006591]" />
          
          <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-6 leading-relaxed">
            <span className="text-[#006591] mr-2">Soal {currentQuestion + 1}.</span>
            {q.question.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i !== q.question.split('\n').length - 1 && <br />}
              </span>
            ))}
          </h2>

          <div className="space-y-3">
            {q.options.map((opt, idx) => {
              const isSelected = answers[currentQuestion] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 ${
                    isSelected 
                      ? 'border-[#006591] bg-[#006591]/5 shadow-sm' 
                      : 'border-slate-200 hover:border-[#006591]/30 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected ? 'border-[#006591] bg-[#006591]' : 'border-slate-300'
                  }`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </div>
                  <span className={`text-sm font-medium leading-relaxed ${isSelected ? 'text-[#006591]' : 'text-slate-600'}`}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={currentQuestion === 0}
            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Sebelumnya
          </button>
          
          <button
            onClick={handleNext}
            disabled={!hasAnswered}
            className={`px-8 py-3 rounded-xl font-bold text-white transition-all flex items-center gap-2 shadow-lg ${
              !hasAnswered 
                ? 'bg-slate-300 cursor-not-allowed opacity-50' 
                : 'bg-[#006591] hover:bg-[#004c6e] hover:shadow-xl hover:-translate-y-0.5'
            }`}
          >
            {currentQuestion === PRETEST_QUESTIONS.length - 1 ? 'Selesaikan Pretest' : 'Selanjutnya'}
            <span className="material-symbols-outlined text-[20px]">{currentQuestion === PRETEST_QUESTIONS.length - 1 ? 'check_circle' : 'arrow_forward'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
