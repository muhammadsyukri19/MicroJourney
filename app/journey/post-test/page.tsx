'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useJourneyStore } from '@/lib/journeyStore';
import { POSTTEST_QUESTIONS } from '@/lib/testsData';

export default function PostTestPage() {
  const router = useRouter();
  const state = useJourneyStore();
  const { postTestScore, setPostTestScore, studentName, preTestScore, sessionId } = state;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(POSTTEST_QUESTIONS.length).fill(-1));
  const [isFinished, setIsFinished] = useState(false);

  // If already taken, redirect to summary
  useEffect(() => {
    if (postTestScore !== null) {
      router.replace('/summary');
    }
  }, [postTestScore, router]);

  const handleSelectOption = (optIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < POSTTEST_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate score (0 - 100)
      let correct = 0;
      answers.forEach((ans, idx) => {
        if (ans === POSTTEST_QUESTIONS[idx].correctAnswer) {
          correct++;
        }
      });
      const score = Math.round((correct / POSTTEST_QUESTIONS.length) * 100);
      setPostTestScore(score);
      setIsFinished(true);

      // Sync postTestScore to MongoDB (assuming tahap-6 already created the doc)
      fetch('/api/lkpd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || `session-${Date.now()}`,
          preTestScore: preTestScore,
          postTestScore: score,
        }),
      }).catch(e => console.error('Failed to sync post-test score', e));
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  if (isFinished || postTestScore !== null) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-[#f0a345] rounded-full flex items-center justify-center mb-6 border-4 border-[#d27b22] shadow-xl">
          <span className="material-symbols-outlined text-5xl text-white">emoji_events</span>
        </div>
        <h2 className="text-3xl font-extrabold text-[#083b54] mb-4" style={{ fontFamily: 'var(--font-outfit)' }}>
          Post-test Selesai!
        </h2>
        <p className="text-slate-600 mb-8 max-w-md">
          Selamat, {studentName || 'Siswa'}! Kamu telah menyelesaikan seluruh rangkaian kegiatan dan tes akhir. Mari kita lihat rangkuman ekspedisimu!
        </p>
        <button
          onClick={() => router.push('/summary')}
          className="bg-[linear-gradient(180deg,#f0a345_0%,#d27b22_100%)] text-white font-extrabold py-4 px-10 rounded-2xl shadow-[0_6px_0_#9a5310] active:translate-y-1 active:shadow-[0_2px_0_#9a5310] flex items-center gap-2 text-lg transition-all"
        >
          Lihat Rangkuman <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    );
  }

  const q = POSTTEST_QUESTIONS[currentQuestion];
  const hasAnswered = answers[currentQuestion] !== -1;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-slate-50 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-[#083b54] mb-2" style={{ fontFamily: 'var(--font-outfit)' }}>
            Tes Pemahaman Akhir (Post-test)
          </h1>
          <p className="text-slate-500 text-sm">Jawablah pertanyaan berikut untuk mengukur pemahamanmu setelah ekspedisi.</p>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-8 justify-center">
          {POSTTEST_QUESTIONS.map((_, i) => (
            <div 
              key={i} 
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === currentQuestion ? 'w-10 bg-[#006e2f]' : 
                answers[i] !== -1 ? 'w-6 bg-[#006e2f]/40' : 'w-6 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-100 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#006e2f]" />
          
          <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-6 leading-relaxed">
            <span className="text-[#006e2f] mr-2">Soal {currentQuestion + 1}.</span>
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
                      ? 'border-[#006e2f] bg-[#006e2f]/5 shadow-sm' 
                      : 'border-slate-200 hover:border-[#006e2f]/30 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected ? 'border-[#006e2f] bg-[#006e2f]' : 'border-slate-300'
                  }`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </div>
                  <span className={`text-sm font-medium leading-relaxed ${isSelected ? 'text-[#006e2f]' : 'text-slate-600'}`}>
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
                : 'bg-[#006e2f] hover:bg-[#005524] hover:shadow-xl hover:-translate-y-0.5'
            }`}
          >
            {currentQuestion === POSTTEST_QUESTIONS.length - 1 ? 'Selesaikan Post-test' : 'Selanjutnya'}
            <span className="material-symbols-outlined text-[20px]">{currentQuestion === POSTTEST_QUESTIONS.length - 1 ? 'check_circle' : 'arrow_forward'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
