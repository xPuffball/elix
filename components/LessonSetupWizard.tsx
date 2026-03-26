import React, { useState, useRef, useCallback } from 'react';
import { useGameStore } from '../store';
import { GameMode, Archetype, LessonConfig, LessonAttachment, UserLevel, StudentKnowledgeLevel, InterruptFrequency, QuestionDifficulty, SessionGoal, ExplanationStyle } from '../types';
import { X, ChevronRight, ChevronLeft, BookOpen, Users, Sliders, Play, Upload, FileText, Image, Trash2 } from 'lucide-react';

const STEP_TITLES = ['What are you teaching?', 'Configure your class', 'Choose your students', 'Teaching style'];
const STEP_ICONS = [BookOpen, Sliders, Users, Play];

const ARCHETYPE_INFO: Record<string, { label: string; desc: string; emoji: string }> = {
  [Archetype.EAGER_BIRD]: { label: 'Fast Learner', desc: 'Moves quickly, jumps to conclusions', emoji: '🐦' },
  [Archetype.SKEPTIC_SNAKE]: { label: 'Skeptical', desc: 'Challenges logic, questions assumptions', emoji: '🐍' },
  [Archetype.SLOW_BEAR]: { label: 'Struggling', desc: 'Gets confused, needs simpler explanations', emoji: '🐻' },
  [Archetype.CURIOUS_CAT]: { label: 'Curious', desc: 'Asks "why?", wants examples', emoji: '🐱' },
  [Archetype.SILENT_OWL]: { label: 'Silent Observer', desc: 'Watches quietly, quizzes at the end', emoji: '🦉' },
};

const USER_LEVELS: { value: UserLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'exam_review', label: 'Exam Review' },
];

const STUDENT_KNOWLEDGE: { value: StudentKnowledgeLevel; label: string }[] = [
  { value: 'knows_nothing', label: 'Knows nothing' },
  { value: 'basic_prerequisites', label: 'Basic prerequisites' },
  { value: 'same_level', label: 'Same course level' },
  { value: 'studied_once', label: 'Already studied once' },
];

const SESSION_GOALS: { value: SessionGoal; label: string; emoji: string }[] = [
  { value: 'understand', label: 'Understand concept', emoji: '💡' },
  { value: 'exam_prep', label: 'Prepare for exam', emoji: '📝' },
  { value: 'practice_teaching', label: 'Practice teaching', emoji: '🎤' },
  { value: 'fix_weak_areas', label: 'Fix weak areas', emoji: '🔧' },
];

const SESSION_LENGTHS = [10, 15, 20, 25, 30, 45, 60];

export const LessonSetupWizard = () => {
  const { setMode, setActiveLesson, students } = useGameStore();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [attachments, setAttachments] = useState<LessonAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userLevel, setUserLevel] = useState<UserLevel>('intermediate');
  const [learningGoal, setLearningGoal] = useState('');
  const [sessionGoal, setSessionGoal] = useState<SessionGoal>('understand');
  const [sessionLength, setSessionLength] = useState(20);

  const [activeStudentIds, setActiveStudentIds] = useState<string[]>(students.map(s => s.id));
  const [studentKnowledge, setStudentKnowledge] = useState<StudentKnowledgeLevel>('basic_prerequisites');

  const [interruptFreq, setInterruptFreq] = useState<InterruptFrequency>('moderate');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('mixed');
  const [explStyle, setExplStyle] = useState<ExplanationStyle>({
    askToSimplify: true,
    askForAnalogies: true,
    askForExamples: true,
    detectMissingSteps: true,
  });
  const [enableQuiz, setEnableQuiz] = useState(false);
  const [rememberProgress, setRememberProgress] = useState(false);
  const [rewardsMode, setRewardsMode] = useState(true);

  const toggleStudent = (id: string) => {
    setActiveStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const processFile = useCallback(async (file: File) => {
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) return;
    if (attachments.some(a => a.name === file.name)) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachments(prev => [...prev, { name: file.name, type: 'image', mimeType: file.type, data: base64 }]);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
      const text = await file.text();
      setAttachments(prev => [...prev, { name: file.name, type: 'text', mimeType: file.type, data: text.slice(0, 50000) }]);
    } else if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachments(prev => [...prev, { name: file.name, type: 'image', mimeType: 'application/pdf', data: base64 }]);
      };
      reader.readAsDataURL(file);
    } else {
      try {
        const text = await file.text();
        setAttachments(prev => [...prev, { name: file.name, type: 'text', mimeType: 'text/plain', data: text.slice(0, 50000) }]);
      } catch { /* unsupported */ }
    }
  }, [attachments]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) Array.from(files).forEach(processFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files) Array.from(files).forEach(processFile);
  }, [processFile]);

  const removeAttachment = (name: string) => {
    setAttachments(prev => prev.filter(a => a.name !== name));
  };

  const canProceed = () => {
    if (step === 0) return topic.trim().length > 0;
    if (step === 2) return activeStudentIds.length > 0;
    return true;
  };

  const startLesson = () => {
    const config: LessonConfig = {
      title: title.trim() || topic.trim(),
      topic: topic.trim(),
      context: context.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
      learningGoal: learningGoal.trim() || undefined,
      userLevel,
      activeStudentIds,
      studentKnowledgeLevel: studentKnowledge,
      interruptFrequency: interruptFreq,
      questionDifficulty: difficulty,
      explanationStyle: explStyle,
      sessionGoal,
      sessionLengthMin: sessionLength,
      enablePopQuiz: enableQuiz,
      rememberProgress,
      rewardsMode,
    };
    setActiveLesson(config);
    setMode(GameMode.TEACHING);
  };

  return (
    <div className="absolute inset-0 bg-[#F5EDDA]/75 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-[#FFF9F0] to-[#FFF3E0] rounded-3xl w-full max-w-2xl shadow-[0_8px_40px_rgba(139,90,43,0.15)] border border-[#E8D5B7] overflow-hidden max-h-[90vh] flex flex-col anim-scale-in">
        {/* Header */}
        <div className="p-6 pb-4 flex justify-between items-center border-b border-[#E8D5B7]">
          <div>
            <h2 className="text-2xl font-brand font-bold text-[#5D3A1A]">{STEP_TITLES[step]}</h2>
            <p className="text-sm text-[#A08060] font-brand mt-1">Step {step + 1} of {STEP_TITLES.length}</p>
          </div>
          <button onClick={() => setMode(GameMode.FREE_ROAM)} className="text-[#A08060] hover:text-rose-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="px-6 pt-4 flex gap-2">
          {STEP_TITLES.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-[#E8D5B7]'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 anim-slide-up" key={step}>
          {step === 0 && (
            <>
              <div>
                <label className="block text-sm font-brand font-bold text-[#6B4226] mb-1">Lesson Title (optional)</label>
                <input type="text" className="w-full bg-[#FFF5EB] border border-[#E8D5B7] rounded-xl p-3 focus:outline-none focus:border-amber-500 font-brand text-[#4A2C17]"
                  placeholder={'e.g. "Fermat\'s Last Theorem"'} value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-brand font-bold text-[#6B4226] mb-1">What are you teaching today? *</label>
                <input type="text" className="w-full bg-[#FFF5EB] border border-[#E8D5B7] rounded-xl p-3 focus:outline-none focus:border-amber-500 font-brand text-lg text-[#4A2C17]"
                  placeholder="e.g. Photosynthesis, Cardiac Output..." value={topic} onChange={e => setTopic(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-brand font-bold text-[#6B4226] mb-1">Source Material / Notes (optional)</label>
                <textarea className="w-full bg-[#FFF5EB] border border-[#E8D5B7] rounded-xl p-3 focus:outline-none focus:border-amber-500 h-32 resize-none text-sm font-brand text-[#4A2C17]"
                  placeholder="Paste notes, textbook excerpts, or any reference material..." value={context} onChange={e => setContext(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-brand font-bold text-[#6B4226] mb-2">Attachments (optional)</label>
                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md,.csv,.doc,.docx" className="hidden"
                  onChange={handleFileSelect} />
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging ? 'border-amber-500 bg-amber-50/50' : 'border-[#E8D5B7] bg-[#FFF5EB]/50 hover:border-amber-400 hover:bg-amber-50/30'}`}>
                  <Upload size={24} className="mx-auto mb-2 text-[#C4A882]" />
                  <p className="font-brand text-sm text-[#8B6E4E]">
                    Drop files here or <span className="text-amber-600 font-bold">browse</span>
                  </p>
                  <p className="font-brand text-xs text-[#C4A882] mt-1">Images, PDFs, text files (max 10 MB each)</p>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map(a => (
                      <div key={a.name} className="flex items-center gap-3 bg-[#FFF9F0] border border-[#E8D5B7] rounded-xl px-3 py-2">
                        {a.type === 'image' ? (
                          <Image size={16} className="text-amber-600 shrink-0" />
                        ) : (
                          <FileText size={16} className="text-amber-600 shrink-0" />
                        )}
                        <span className="font-brand text-sm text-[#5D3A1A] truncate flex-1">{a.name}</span>
                        <span className="font-brand text-xs text-[#C4A882]">
                          {a.type === 'image' ? 'image' : `${Math.round(a.data.length / 1024)}KB`}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); removeAttachment(a.name); }}
                          className="text-[#C4A882] hover:text-rose-500 transition-colors p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-brand font-bold text-[#6B4226] mb-2">Your Knowledge Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {USER_LEVELS.map(l => (
                    <button key={l.value} onClick={() => setUserLevel(l.value)}
                      className={`p-3 rounded-xl border font-brand font-bold text-sm transition-all ${userLevel === l.value ? 'border-amber-500 bg-amber-50 text-[#5D3A1A] shadow-[0_2px_8px_rgba(245,158,11,0.15)]' : 'border-[#E8D5B7] bg-[#FFF5EB] text-[#8B6E4E] hover:border-amber-400'}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-brand font-bold text-[#6B4226] mb-1">Learning Goal (optional)</label>
                <input type="text" className="w-full bg-[#FFF5EB] border border-[#E8D5B7] rounded-xl p-3 focus:outline-none focus:border-amber-500 text-sm font-brand text-[#4A2C17]"
                  placeholder='e.g. "Explain this well enough for a midterm"' value={learningGoal} onChange={e => setLearningGoal(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-brand font-bold text-[#6B4226] mb-2">Session Goal</label>
                <div className="grid grid-cols-2 gap-2">
                  {SESSION_GOALS.map(g => (
                    <button key={g.value} onClick={() => setSessionGoal(g.value)}
                      className={`p-3 rounded-xl border font-brand font-bold text-sm flex items-center gap-2 transition-all ${sessionGoal === g.value ? 'border-amber-500 bg-amber-50 text-[#5D3A1A] shadow-[0_2px_8px_rgba(245,158,11,0.15)]' : 'border-[#E8D5B7] bg-[#FFF5EB] text-[#8B6E4E] hover:border-amber-400'}`}>
                      <span>{g.emoji}</span> {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-brand font-bold text-[#6B4226] mb-2">Session Length</label>
                <div className="flex gap-2 flex-wrap">
                  {SESSION_LENGTHS.map(m => (
                    <button key={m} onClick={() => setSessionLength(m)}
                      className={`px-4 py-2 rounded-xl border font-brand font-bold text-sm transition-all ${sessionLength === m ? 'border-amber-500 bg-amber-50 text-[#5D3A1A] shadow-[0_2px_8px_rgba(245,158,11,0.15)]' : 'border-[#E8D5B7] bg-[#FFF5EB] text-[#8B6E4E] hover:border-amber-400'}`}>
                      {m} min
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-brand font-bold text-[#6B4226] mb-2">Choose AI Students</label>
                <div className="space-y-2">
                  {students.map(s => {
                    const info = ARCHETYPE_INFO[s.archetype];
                    const active = activeStudentIds.includes(s.id);
                    return (
                      <button key={s.id} onClick={() => toggleStudent(s.id)}
                        className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all text-left ${active ? 'border-amber-500 bg-amber-50 shadow-[0_2px_10px_rgba(245,158,11,0.12)]' : 'border-[#E8D5B7] bg-[#FFF5EB] opacity-60 hover:opacity-100'}`}>
                        <span className="text-3xl">{info?.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-brand font-bold text-[#5D3A1A]">{s.name}</span>
                            <span className="text-xs bg-[#FFF9F0] px-2 py-0.5 rounded-lg border border-[#E8D5B7] text-[#8B6E4E] font-brand">{info?.label}</span>
                          </div>
                          <p className="text-xs text-[#A08060] font-brand mt-0.5">{info?.desc}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${active ? 'bg-gradient-to-br from-amber-500 to-orange-500 border-amber-500 text-white' : 'border-[#D4B896]'}`}>
                          {active && <span className="text-sm font-bold">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-brand font-bold text-[#6B4226] mb-2">Student Knowledge Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {STUDENT_KNOWLEDGE.map(k => (
                    <button key={k.value} onClick={() => setStudentKnowledge(k.value)}
                      className={`p-3 rounded-xl border font-brand font-bold text-xs transition-all ${studentKnowledge === k.value ? 'border-amber-500 bg-amber-50 text-[#5D3A1A] shadow-[0_2px_8px_rgba(245,158,11,0.15)]' : 'border-[#E8D5B7] bg-[#FFF5EB] text-[#8B6E4E] hover:border-amber-400'}`}>
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <TripleSlider label="How often should students interrupt?" value={interruptFreq}
                options={[{ v: 'rare', l: 'Rare' }, { v: 'moderate', l: 'Moderate' }, { v: 'frequent', l: 'Frequent' }]}
                onChange={v => setInterruptFreq(v as InterruptFrequency)} />
              <TripleSlider label="Question Difficulty" value={difficulty}
                options={[{ v: 'easy', l: 'Easy' }, { v: 'mixed', l: 'Mixed' }, { v: 'challenging', l: 'Challenging' }]}
                onChange={v => setDifficulty(v as QuestionDifficulty)} />

              <div>
                <label className="block text-sm font-brand font-bold text-[#6B4226] mb-2">Explanation Style</label>
                <div className="space-y-2">
                  {([
                    ['askToSimplify', 'Ask me to simplify explanations'],
                    ['askForAnalogies', 'Ask for analogies'],
                    ['askForExamples', 'Ask for real-life examples'],
                    ['detectMissingSteps', 'Detect missing steps'],
                  ] as const).map(([key, label]) => (
                    <ToggleRow key={key} label={label} checked={explStyle[key]}
                      onChange={v => setExplStyle(prev => ({ ...prev, [key]: v }))} />
                  ))}
                </div>
              </div>

              <div className="border-t border-[#E8D5B7] pt-4 space-y-2">
                <ToggleRow label="Pop quiz at end of session" checked={enableQuiz} onChange={setEnableQuiz} />
                <ToggleRow label="Remember student progress across sessions" checked={rememberProgress} onChange={setRememberProgress} />
                <ToggleRow label="Earn coins for teaching well" checked={rewardsMode} onChange={setRewardsMode} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-[#E8D5B7] flex justify-between items-center">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-[#A08060] hover:text-[#5D3A1A] font-brand font-bold transition-colors">
              <ChevronLeft size={18} /> Back
            </button>
          ) : <div />}

          {step < STEP_TITLES.length - 1 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
              className={`flex items-center gap-1 px-6 py-3 rounded-xl font-brand font-bold text-white shadow-[0_4px_16px_rgba(245,158,11,0.25)] btn-press hover-lift transition-all ${canProceed() ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' : 'bg-[#D4B896] cursor-not-allowed shadow-none'}`}>
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button onClick={startLesson} disabled={!canProceed()}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-brand font-bold text-xl text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-[0_4px_16px_rgba(245,158,11,0.25)] btn-press hover-lift transition-all">
              <Play size={20} /> Start Class
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const TripleSlider = ({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="block text-sm font-brand font-bold text-[#6B4226] mb-2">{label}</label>
    <div className="flex rounded-xl overflow-hidden border border-[#E8D5B7]">
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`flex-1 py-2.5 font-brand font-bold text-sm transition-all ${value === o.v ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'bg-[#FFF5EB] text-[#8B6E4E] hover:bg-[#FFF0DC]'}`}>
          {o.l}
        </button>
      ))}
    </div>
  </div>
);

const ToggleRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!checked)}
    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${checked ? 'border-amber-500 bg-amber-50' : 'border-[#E8D5B7] bg-[#FFF5EB]'}`}>
    <span className="text-sm font-brand font-bold text-[#5D3A1A]">{label}</span>
    <div className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-[#D4B896]'}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </div>
  </button>
);
