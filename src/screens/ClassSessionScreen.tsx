import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DailyStudentRecord,
  DisciplineEvaluation,
  LessonEvaluation,
  MistakeType,
  RecitationStatus,
  ScoringRulesConfig,
  Student
} from '../types';
import { DEFAULT_TEAMS } from '../scoring/scoringConfig';
import { calculateDailyScore } from '../scoring/scoringEngine';
import { storage } from '../data/storage';
import { FineModal } from '../components/FineModal';
import { SurahPickerModal } from '../components/SurahPickerModal';
import { playFeedbackSound } from '../utils/audioFeedback';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  MinusCircle,
  PlusCircle,
  CheckCircle2,
  Star,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
  FileCheck,
  DollarSign,
  ShieldAlert,
  Play,
  Pause,
  Timer,
  BookOpen
} from 'lucide-react';

interface ClassSessionScreenProps {
  students: Student[];
  scoringRules: ScoringRulesConfig;
  todayDate: string;
  soundEnabled?: boolean;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onOpenSettings?: () => void;
}

export const ClassSessionScreen: React.FC<ClassSessionScreenProps> = ({
  students,
  scoringRules,
  todayDate,
  soundEnabled = true,
  onShowToast
}) => {
  // 1. Student selection
  const activeStudents = useMemo(() => students.filter((s) => s.active), [students]);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const currentStudent = activeStudents[selectedStudentIndex] || activeStudents[0];

  // 2. Mistake tagging preference
  const [lastMistakeType, setLastMistakeType] = useState<MistakeType>('lqma');

  // 3. Current in-memory record state for the selected student
  const [currentRecord, setCurrentRecord] = useState<DailyStudentRecord | null>(null);

  // 4. Undo action history stack for the active student
  const [undoStack, setUndoStack] = useState<DailyStudentRecord[]>([]);

  // 5. Expandable portion details
  const [expandedDetails, setExpandedDetails] = useState<{ [key: string]: boolean }>({
    sabaq: false,
    sabqi: false,
    manzil: false
  });

  // 6. Ad-hoc discipline modal
  const [showAdHocModal, setShowAdHocModal] = useState(false);
  const [adHocPoints, setAdHocPoints] = useState<number>(1);
  const [adHocReason, setAdHocReason] = useState<string>('');

  // 7. Fine modal state
  const [showFineModal, setShowFineModal] = useState(false);

  // 8. Surah picker modal state
  const [showSurahPicker, setShowSurahPicker] = useState<false | 'sabaq' | 'sabqi' | 'manzil'>(false);

  // 9. Review and Save Day Modal
  const [showReviewDayModal, setShowReviewDayModal] = useState(false);

  // 10. Recitation Stopwatch Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Active student's pending fines
  const studentPendingFines = useMemo(() => {
    if (!currentStudent) return 0;
    return storage
      .getFines(currentStudent.id)
      .filter((f) => f.status === 'pending')
      .reduce((sum, f) => sum + f.amount, 0);
  }, [currentStudent, todayDate]);

  // Load or initialize record when student changes or on mount
  useEffect(() => {
    if (!currentStudent) return;
    const existing = storage.getStudentRecord(currentStudent.id, todayDate);
    if (existing) {
      setCurrentRecord(existing);
      setTimerSeconds(existing.recitationDurationSeconds || 0);
    } else {
      // Create clean draft record
      const defaultSabaq: LessonEvaluation = {
        status: 'recited',
        mistakes: 0,
        lqmaCount: 0,
        tajweedCount: 0,
        details: {
          para: currentStudent.currentPara || 30,
          surah: currentStudent.currentSurah || 'Al-Mulk',
          ayahFrom: 1,
          ayahTo: 10
        }
      };
      const defaultSabqi: LessonEvaluation = {
        status: 'recited',
        mistakes: 0,
        lqmaCount: 0,
        tajweedCount: 0,
        details: {
          para: (currentStudent.currentPara || 30) - 1,
          surah: 'Revision',
          ayahFrom: 1,
          ayahTo: 20
        }
      };
      const defaultManzil: LessonEvaluation = {
        status: 'recited',
        mistakes: 0,
        lqmaCount: 0,
        tajweedCount: 0,
        details: {
          para: 5,
          surah: 'Retention test',
          ayahFrom: 1,
          ayahTo: 30
        }
      };
      const defaultDiscipline: DisciplineEvaluation = {
        uniform: true,
        behaviour: true,
        onTime: true,
        customPoints: 0
      };

      const calc = calculateDailyScore(
        {
          sabaq: defaultSabaq,
          sabqi: defaultSabqi,
          manzil: defaultManzil,
          discipline: defaultDiscipline
        },
        scoringRules
      );

      const newRecord: DailyStudentRecord = {
        id: `${currentStudent.id}_${todayDate}`,
        studentId: currentStudent.id,
        teamId: currentStudent.teamId,
        date: todayDate,
        sabaq: defaultSabaq,
        sabqi: defaultSabqi,
        manzil: defaultManzil,
        discipline: defaultDiscipline,
        sabaqScore: calc.sabaqScore,
        sabqiScore: calc.sabqiScore,
        manzilScore: calc.manzilScore,
        disciplineScore: calc.disciplineScore,
        cleanRecitationBonus: calc.cleanRecitationBonus,
        comebackBonus: calc.comebackBonus,
        rawTotal: calc.rawTotal,
        cappedTotal: calc.cappedTotal,
        recitationDurationSeconds: 0,
        isDraft: true,
        updatedAt: new Date().toISOString()
      };
      setCurrentRecord(newRecord);
      storage.saveDailyRecord(newRecord);
      setTimerSeconds(0);
    }
    setIsTimerRunning(false);
    setUndoStack([]);
  }, [currentStudent?.id, todayDate]);

  // Push state to undo stack before mutating
  const pushUndo = (rec: DailyStudentRecord) => {
    setUndoStack((prev) => [...prev.slice(-15), JSON.parse(JSON.stringify(rec))]);
  };

  // Recompute scores and auto-save draft
  const updateRecordState = (updater: (prev: DailyStudentRecord) => DailyStudentRecord) => {
    if (!currentRecord) return;
    pushUndo(currentRecord);
    const updated = updater(currentRecord);
    const calc = calculateDailyScore(
      {
        sabaq: updated.sabaq,
        sabqi: updated.sabqi,
        manzil: updated.manzil,
        discipline: updated.discipline
      },
      scoringRules
    );

    const fullUpdated: DailyStudentRecord = {
      ...updated,
      sabaqScore: calc.sabaqScore,
      sabqiScore: calc.sabqiScore,
      manzilScore: calc.manzilScore,
      disciplineScore: calc.disciplineScore,
      cleanRecitationBonus: calc.cleanRecitationBonus,
      comebackBonus: calc.comebackBonus,
      rawTotal: calc.rawTotal,
      cappedTotal: calc.cappedTotal,
      recitationDurationSeconds: timerSeconds,
      updatedAt: new Date().toISOString()
    };
    setCurrentRecord(fullUpdated);
    storage.saveDailyRecord(fullUpdated);
  };

  const handleGlobalUndo = () => {
    if (undoStack.length === 0) {
      onShowToast('Nothing to undo', 'info');
      return;
    }
    playFeedbackSound('undo', soundEnabled);
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setCurrentRecord(previous);
    storage.saveDailyRecord(previous);
    onShowToast('Last action undone', 'info');
  };

  // Lesson status toggle
  const setLessonStatus = (lessonKey: 'sabaq' | 'sabqi' | 'manzil', status: RecitationStatus) => {
    playFeedbackSound('click', soundEnabled);
    updateRecordState((prev) => {
      const lesson = { ...prev[lessonKey], status };
      return { ...prev, [lessonKey]: lesson };
    });
  };

  // Add mistake
  const addMistake = (lessonKey: 'sabaq' | 'sabqi' | 'manzil') => {
    playFeedbackSound('mistake', soundEnabled);
    updateRecordState((prev) => {
      const lesson = { ...prev[lessonKey] };
      lesson.mistakes += 1;
      if (lastMistakeType === 'lqma') {
        lesson.lqmaCount += 1;
      } else {
        lesson.tajweedCount += 1;
      }
      return { ...prev, [lessonKey]: lesson };
    });
  };

  // Remove mistake
  const removeMistake = (lessonKey: 'sabaq' | 'sabqi' | 'manzil') => {
    if (!currentRecord || currentRecord[lessonKey].mistakes <= 0) return;
    playFeedbackSound('undo', soundEnabled);
    updateRecordState((prev) => {
      const lesson = { ...prev[lessonKey] };
      lesson.mistakes = Math.max(0, lesson.mistakes - 1);
      if (lastMistakeType === 'lqma' && lesson.lqmaCount > 0) {
        lesson.lqmaCount -= 1;
      } else if (lesson.tajweedCount > 0) {
        lesson.tajweedCount -= 1;
      }
      return { ...prev, [lessonKey]: lesson };
    });
  };

  // Discipline toggles
  const toggleDiscipline = (field: 'uniform' | 'behaviour' | 'onTime') => {
    playFeedbackSound('click', soundEnabled);
    updateRecordState((prev) => {
      const discipline = { ...prev.discipline, [field]: !prev.discipline[field] };
      return { ...prev, discipline };
    });
  };

  // Save current student
  const handleSaveStudent = () => {
    if (!currentRecord) return;
    playFeedbackSound('save', soundEnabled);
    const finalized: DailyStudentRecord = {
      ...currentRecord,
      recitationDurationSeconds: timerSeconds,
      isDraft: false,
      savedAt: new Date().toISOString()
    };
    setCurrentRecord(finalized);
    storage.saveDailyRecord(finalized);
    onShowToast(`${currentStudent.name} saved!`, 'success');

    if (selectedStudentIndex < activeStudents.length - 1) {
      setSelectedStudentIndex(selectedStudentIndex + 1);
    } else {
      setShowReviewDayModal(true);
    }
  };

  const handleNext = () => {
    playFeedbackSound('click', soundEnabled);
    if (selectedStudentIndex < activeStudents.length - 1) {
      setSelectedStudentIndex(selectedStudentIndex + 1);
    } else {
      setShowReviewDayModal(true);
    }
  };

  const handlePrev = () => {
    playFeedbackSound('click', soundEnabled);
    if (selectedStudentIndex > 0) {
      setSelectedStudentIndex(selectedStudentIndex - 1);
    }
  };

  // Touch swipe support
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 70) {
      handlePrev();
    } else if (diff < -70) {
      handleNext();
    }
    touchStartX.current = null;
  };

  const studentTeam = DEFAULT_TEAMS.find((t) => t.id === currentStudent?.teamId) || DEFAULT_TEAMS[0];

  if (!currentStudent || !currentRecord) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#5B6470]">
        <p>No active students in roster. Add students in Teams.</p>
      </div>
    );
  }

  const allTodayRecs = storage.getDailyRecords(todayDate);
  const completedCount = allTodayRecs.filter((r) => !r.isDraft).length;

  return (
    <div
      className="flex flex-col w-full pb-32 px-4 pt-20 max-w-md mx-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Horizontal Scrolling Student Chips Grouped by Team */}
      <section
        aria-label="Student Selection Carousel"
        className="w-full mb-3 -mx-4 px-4 overflow-x-auto flex items-center gap-2 py-1 scroll-smooth no-scrollbar"
      >
        {activeStudents.map((s, idx) => {
          const isSelected = idx === selectedStudentIndex;
          const team = DEFAULT_TEAMS.find((t) => t.id === s.teamId) || DEFAULT_TEAMS[0];
          const rec = allTodayRecs.find((r) => r.studentId === s.id);
          const isDone = rec && !rec.isDraft;

          return (
            <button
              key={s.id}
              onClick={() => {
                playFeedbackSound('click', soundEnabled);
                setSelectedStudentIndex(idx);
              }}
              type="button"
              className={`flex-shrink-0 flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full text-[13px] font-medium transition-all shadow-xs border ${
                isSelected
                  ? 'bg-[#E6F4F2] text-[#0F766E] border-[#0F766E] ring-1 ring-[#0F766E]/30 font-semibold'
                  : 'bg-white text-[#5B6470] border-[#E4E0D7] hover:bg-[#F7F5F0]'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: team.color }}
              />
              <span className="truncate max-w-[100px]">{s.name.split(' ')[0]}</span>
              <span
                className="text-[11px] font-bold px-1.5 py-0.2 rounded-full"
                style={{
                  backgroundColor: isSelected ? '#0F766E' : '#F0EDE6',
                  color: isSelected ? '#FFFFFF' : '#5B6470'
                }}
              >
                {team.code}
              </span>
              {isDone && <CheckCircle2 size={13} className="text-[#16803C]" />}
            </button>
          );
        })}
      </section>

      {/* 2. Student Header & Live Score Plate */}
      <section className="w-full bg-white rounded-2xl p-4 mb-3 border border-[#E4E0D7] shadow-xs flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[20px] font-bold text-[#1A1F26] truncate tracking-tight">
                {currentStudent.name}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                style={{ backgroundColor: studentTeam.color }}
              >
                {studentTeam.name}
              </span>

              {studentPendingFines > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFineModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B42318] bg-[#FEE2E2] px-2 py-0.5 rounded-full border border-[#FCA5A5] hover:bg-red-100 transition-all"
                >
                  <DollarSign size={11} />
                  <span>Rs. {studentPendingFines} Fine Due</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-[#5B6470]">
              <span className="text-[12px]">
                {currentRecord.isDraft ? 'In-progress draft' : 'Saved recitation'}
              </span>
              {currentRecord.cleanRecitationBonus > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                  <Star size={11} className="fill-[#F59E0B]" />
                  +{currentRecord.cleanRecitationBonus} Bonus
                </span>
              )}

              {/* Stopwatch Timer Widget */}
              <div className="flex items-center gap-1.5 ml-1 bg-[#F7F5F0] px-2 py-0.5 rounded-md border border-[#E4E0D7] text-[11px] font-mono">
                <Timer size={12} className="text-[#0F766E]" />
                <span className="font-bold text-[#1A1F26]">{formatTimer(timerSeconds)}</span>
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="text-[#0F766E] hover:text-[#0B5D57] ml-0.5"
                  title={isTimerRunning ? 'Pause timer' : 'Start timer'}
                >
                  {isTimerRunning ? <Pause size={11} /> : <Play size={11} />}
                </button>
              </div>
            </div>
          </div>

          {/* Running Live Score (out of 50) */}
          <div className="flex flex-col items-end flex-shrink-0 bg-[#F7F5F0] px-3.5 py-1.5 rounded-xl border border-[#E4E0D7]">
            <div className="flex items-baseline gap-1">
              <span className="text-[32px] font-bold text-[#0F766E] tabular-nums leading-none">
                {currentRecord.cappedTotal}
              </span>
              <span className="text-[14px] text-[#8A929C] font-semibold">/ 50</span>
            </div>
            <span className="text-[11px] text-[#5B6470] font-semibold uppercase tracking-wider">
              Today's Score
            </span>
          </div>
        </div>

        {/* Global Mistake Type Selector (Lqma vs Tajweed) & Global Undo */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#F7F5F0] border border-[#E4E0D7]">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-[#5B6470]">
              Mistake Tagging:
            </span>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#E4E0D7]">
              <button
                type="button"
                onClick={() => setLastMistakeType('lqma')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  lastMistakeType === 'lqma'
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'text-[#5B6470] hover:text-[#1A1F26]'
                }`}
              >
                Lqma (Prompt)
              </button>
              <button
                type="button"
                onClick={() => setLastMistakeType('tajweed')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  lastMistakeType === 'tajweed'
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'text-[#5B6470] hover:text-[#1A1F26]'
                }`}
              >
                Tajweed / Makhraj
              </button>
            </div>
          </div>

          {undoStack.length > 0 && (
            <button
              type="button"
              onClick={handleGlobalUndo}
              className="text-[11px] font-bold text-[#B45309] hover:underline flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>Undo ({undoStack.length})</span>
            </button>
          )}
        </div>
      </section>

      {/* 3. Stacked Recitation Cards */}
      <div className="flex flex-col gap-3 w-full">
        {/* --- CARD 1: SABAQ --- */}
        <article className="w-full bg-white rounded-2xl p-4 border border-[#E4E0D7] shadow-xs flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#0F766E] rounded-full" />
                <span className="text-[15px] font-bold text-[#1A1F26] uppercase tracking-wider">
                  1. Sabaq (سبق)
                </span>
                <span className="text-[11px] bg-[#F0EDE6] px-2 py-0.5 rounded-md text-[#5B6470]">
                  New Lesson ({scoringRules.sabaqBase} pts)
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 ml-3.5">
                <p className="text-[13px] text-[#5B6470] font-medium truncate max-w-[200px]">
                  {currentRecord.sabaq.details.para ? `Para ${currentRecord.sabaq.details.para} • ` : ''}
                  {currentRecord.sabaq.details.surah || 'Assigned Portion'}
                  {currentRecord.sabaq.details.ayahFrom && currentRecord.sabaq.details.ayahTo ? (
                    <span className="text-xs text-[#8A929C] ml-1">
                      ({currentRecord.sabaq.details.ayahFrom}-{currentRecord.sabaq.details.ayahTo})
                    </span>
                  ) : null}
                </p>
                <button
                  type="button"
                  onClick={() => setShowSurahPicker('sabaq')}
                  className="text-[11px] text-[#0F766E] font-bold hover:underline flex items-center gap-0.5"
                >
                  <BookOpen size={12} />
                  <span>Portion</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[26px] font-bold text-[#0F766E] tabular-nums leading-none">
                {currentRecord.sabaqScore}
                <span className="text-[14px] text-[#8A929C] font-normal">/{scoringRules.sabaqBase}</span>
              </span>
            </div>
          </div>

          {/* 3-way Segmented Control */}
          <div className="grid grid-cols-3 gap-1 bg-[#F7F5F0] p-1 rounded-xl border border-[#E4E0D7]">
            <button
              type="button"
              onClick={() => setLessonStatus('sabaq', 'recited')}
              className={`py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                currentRecord.sabaq.status === 'recited'
                  ? 'bg-white text-[#0F766E] shadow-xs'
                  : 'text-[#5B6470] hover:text-[#1A1F26]'
              }`}
            >
              سنایا (Recited)
            </button>
            <button
              type="button"
              onClick={() => setLessonStatus('sabaq', 'not_recited')}
              className={`py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                currentRecord.sabaq.status === 'not_recited'
                  ? 'bg-white text-[#B42318] shadow-xs'
                  : 'text-[#5B6470] hover:text-[#1A1F26]'
              }`}
            >
              نہیں سنایا ({scoringRules.notRecitedSabaq})
            </button>
            <button
              type="button"
              onClick={() => setLessonStatus('sabaq', 'absent')}
              className={`py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                currentRecord.sabaq.status === 'absent'
                  ? 'bg-white text-[#5B6470] shadow-xs'
                  : 'text-[#5B6470] hover:text-[#1A1F26]'
              }`}
            >
              غیر حاضر
            </button>
          </div>

          {/* Status or Mistakes Counter banner */}
          {currentRecord.sabaq.status === 'recited' && (
            <>
              {currentRecord.sabaq.mistakes === 0 ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FEF3C7] text-[#92400E]">
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-[#F59E0B] fill-[#F59E0B]" />
                    <span className="text-[13px] font-bold">0 Mistakes • Clean Recitation!</span>
                  </div>
                  <span className="text-[12px] font-bold text-[#B45309]">+1 Bonus</span>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FEE2E2] text-[#B42318]">
                  <span className="text-[13px] font-bold">
                    {currentRecord.sabaq.mistakes} Mistake{currentRecord.sabaq.mistakes === 1 ? '' : 's'} (
                    {currentRecord.sabaq.lqmaCount} Lqma, {currentRecord.sabaq.tajweedCount} Tajweed)
                  </span>
                  <span className="text-[13px] font-bold">
                    -{currentRecord.sabaq.mistakes * scoringRules.sabaqMistakeDeduction} pts
                  </span>
                </div>
              )}

              {/* Large Thumb Rapid-Action Row (Buttons >= 64px high) */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => addMistake('sabaq')}
                  className="col-span-2 min-h-[66px] rounded-xl bg-[#FEE2E2] hover:bg-[#FCA5A5] text-[#991B1B] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-[16px] font-bold px-4 border border-[#FCA5A5]"
                >
                  <MinusCircle size={24} />
                  <span>غلطی Mistake (-{scoringRules.sabaqMistakeDeduction})</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeMistake('sabaq')}
                  className="min-h-[66px] rounded-xl bg-[#F7F5F0] hover:bg-[#EAE6DE] text-[#1A1F26] active:scale-[0.98] transition-transform flex flex-col items-center justify-center gap-0.5 border border-[#E4E0D7]"
                >
                  <RotateCcw size={20} className="text-[#5B6470]" />
                  <span className="text-[12px] font-medium">Undo</span>
                </button>
              </div>
            </>
          )}

          {/* Details Collapsible */}
          <div className="border-t border-[#E4E0D7] pt-2">
            <button
              type="button"
              onClick={() =>
                setExpandedDetails((p) => ({ ...p, sabaq: !p.sabaq }))
              }
              className="w-full flex items-center justify-between text-[12px] text-[#5B6470] hover:text-[#1A1F26]"
            >
              <span>Portion Details (Surah, Ayah, Page)</span>
              {expandedDetails.sabaq ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedDetails.sabaq && (
              <div className="grid grid-cols-3 gap-2 mt-2 pt-1">
                <div>
                  <label className="text-[11px] text-[#5B6470]">Surah</label>
                  <input
                    type="text"
                    value={currentRecord.sabaq.details.surah || ''}
                    onChange={(e) => {
                      const surah = e.target.value;
                      updateRecordState((p) => ({
                        ...p,
                        sabaq: { ...p.sabaq, details: { ...p.sabaq.details, surah } }
                      }));
                    }}
                    className="w-full h-9 px-2 text-[12px] rounded-lg border border-[#E4E0D7] bg-[#F7F5F0]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#5B6470]">Ayah From</label>
                  <input
                    type="number"
                    value={currentRecord.sabaq.details.ayahFrom || ''}
                    onChange={(e) => {
                      const ayahFrom = parseInt(e.target.value, 10) || 0;
                      updateRecordState((p) => ({
                        ...p,
                        sabaq: { ...p.sabaq, details: { ...p.sabaq.details, ayahFrom } }
                      }));
                    }}
                    className="w-full h-9 px-2 text-[12px] rounded-lg border border-[#E4E0D7] bg-[#F7F5F0]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#5B6470]">Ayah To</label>
                  <input
                    type="number"
                    value={currentRecord.sabaq.details.ayahTo || ''}
                    onChange={(e) => {
                      const ayahTo = parseInt(e.target.value, 10) || 0;
                      updateRecordState((p) => ({
                        ...p,
                        sabaq: { ...p.sabaq, details: { ...p.sabaq.details, ayahTo } }
                      }));
                    }}
                    className="w-full h-9 px-2 text-[12px] rounded-lg border border-[#E4E0D7] bg-[#F7F5F0]"
                  />
                </div>
              </div>
            )}
          </div>
        </article>

        {/* --- CARD 2: SABQI --- */}
        <article className="w-full bg-white rounded-2xl p-4 border border-[#E4E0D7] shadow-xs flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#4F5BD5] rounded-full" />
                <span className="text-[15px] font-bold text-[#1A1F26] uppercase tracking-wider">
                  2. Sabqi (سبقی)
                </span>
                <span className="text-[11px] bg-[#F0EDE6] px-2 py-0.5 rounded-md text-[#5B6470]">
                  Recent Revision ({scoringRules.sabqiBase} pts)
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 ml-3.5">
                <p className="text-[13px] text-[#5B6470] font-medium truncate max-w-[200px]">
                  {currentRecord.sabqi.details.para ? `Para ${currentRecord.sabqi.details.para} • ` : ''}
                  {currentRecord.sabqi.details.surah || 'Recent Juz'}
                  {currentRecord.sabqi.details.ayahFrom && currentRecord.sabqi.details.ayahTo ? (
                    <span className="text-xs text-[#8A929C] ml-1">
                      ({currentRecord.sabqi.details.ayahFrom}-{currentRecord.sabqi.details.ayahTo})
                    </span>
                  ) : null}
                </p>
                <button
                  type="button"
                  onClick={() => setShowSurahPicker('sabqi')}
                  className="text-[11px] text-[#4F5BD5] font-bold hover:underline flex items-center gap-0.5"
                >
                  <BookOpen size={12} />
                  <span>Portion</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[26px] font-bold text-[#0F766E] tabular-nums leading-none">
                {currentRecord.sabqiScore}
                <span className="text-[14px] text-[#8A929C] font-normal">/{scoringRules.sabqiBase}</span>
              </span>
            </div>
          </div>

          {/* 3-way Segmented Control */}
          <div className="grid grid-cols-3 gap-1 bg-[#F7F5F0] p-1 rounded-xl border border-[#E4E0D7]">
            <button
              type="button"
              onClick={() => setLessonStatus('sabqi', 'recited')}
              className={`py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                currentRecord.sabqi.status === 'recited'
                  ? 'bg-white text-[#0F766E] shadow-xs'
                  : 'text-[#5B6470] hover:text-[#1A1F26]'
              }`}
            >
              سنایا (Recited)
            </button>
            <button
              type="button"
              onClick={() => setLessonStatus('sabqi', 'not_recited')}
              className={`py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                currentRecord.sabqi.status === 'not_recited'
                  ? 'bg-white text-[#B42318] shadow-xs'
                  : 'text-[#5B6470] hover:text-[#1A1F26]'
              }`}
            >
              نہیں سنایا ({scoringRules.notRecitedSabqi})
            </button>
            <button
              type="button"
              onClick={() => setLessonStatus('sabqi', 'absent')}
              className={`py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                currentRecord.sabqi.status === 'absent'
                  ? 'bg-white text-[#5B6470] shadow-xs'
                  : 'text-[#5B6470] hover:text-[#1A1F26]'
              }`}
            >
              غیر حاضر
            </button>
          </div>

          {currentRecord.sabqi.status === 'recited' && (
            <>
              {currentRecord.sabqi.mistakes === 0 ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FEF3C7] text-[#92400E]">
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-[#F59E0B] fill-[#F59E0B]" />
                    <span className="text-[13px] font-bold">0 Mistakes • Clean Recitation!</span>
                  </div>
                  <span className="text-[12px] font-bold text-[#B45309]">+1 Bonus</span>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FEE2E2] text-[#B42318]">
                  <span className="text-[13px] font-bold">
                    {currentRecord.sabqi.mistakes} Mistake{currentRecord.sabqi.mistakes === 1 ? '' : 's'} (
                    {currentRecord.sabqi.lqmaCount} Lqma, {currentRecord.sabqi.tajweedCount} Tajweed)
                  </span>
                  <span className="text-[13px] font-bold">
                    -{currentRecord.sabqi.mistakes * scoringRules.sabqiMistakeDeduction} pts
                  </span>
                </div>
              )}

              {/* Large Thumb Action Row */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => addMistake('sabqi')}
                  className="col-span-2 min-h-[66px] rounded-xl bg-[#FEE2E2] hover:bg-[#FCA5A5] text-[#991B1B] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-[16px] font-bold px-4 border border-[#FCA5A5]"
                >
                  <MinusCircle size={24} />
                  <span>غلطی Mistake (-{scoringRules.sabqiMistakeDeduction})</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeMistake('sabqi')}
                  className="min-h-[66px] rounded-xl bg-[#F7F5F0] hover:bg-[#EAE6DE] text-[#1A1F26] active:scale-[0.98] transition-transform flex flex-col items-center justify-center gap-0.5 border border-[#E4E0D7]"
                >
                  <RotateCcw size={20} className="text-[#5B6470]" />
                  <span className="text-[12px] font-medium">Undo</span>
                </button>
              </div>
            </>
          )}
        </article>

        {/* --- CARD 3: MANZIL --- */}
        <article className="w-full bg-white rounded-2xl p-4 border border-[#E4E0D7] shadow-xs flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#C2456B] rounded-full" />
                <span className="text-[15px] font-bold text-[#1A1F26] uppercase tracking-wider">
                  3. Manzil (منزل)
                </span>
                <span className="text-[11px] bg-[#F0EDE6] px-2 py-0.5 rounded-md text-[#5B6470]">
                  Old Retention ({scoringRules.manzilBase} pts)
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 ml-3.5">
                <p className="text-[13px] text-[#5B6470] font-medium truncate max-w-[200px]">
                  {currentRecord.manzil.details.para ? `Para ${currentRecord.manzil.details.para} • ` : ''}
                  {currentRecord.manzil.details.surah || 'Cumulative Juz'}
                  {currentRecord.manzil.details.ayahFrom && currentRecord.manzil.details.ayahTo ? (
                    <span className="text-xs text-[#8A929C] ml-1">
                      ({currentRecord.manzil.details.ayahFrom}-{currentRecord.manzil.details.ayahTo})
                    </span>
                  ) : null}
                </p>
                <button
                  type="button"
                  onClick={() => setShowSurahPicker('manzil')}
                  className="text-[11px] text-[#C2456B] font-bold hover:underline flex items-center gap-0.5"
                >
                  <BookOpen size={12} />
                  <span>Portion</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[26px] font-bold text-[#0F766E] tabular-nums leading-none">
                {currentRecord.manzilScore}
                <span className="text-[14px] text-[#8A929C] font-normal">/{scoringRules.manzilBase}</span>
              </span>
            </div>
          </div>

          {/* 3-way Segmented Control */}
          <div className="grid grid-cols-3 gap-1 bg-[#F7F5F0] p-1 rounded-xl border border-[#E4E0D7]">
            <button
              type="button"
              onClick={() => setLessonStatus('manzil', 'recited')}
              className={`py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                currentRecord.manzil.status === 'recited'
                  ? 'bg-white text-[#0F766E] shadow-xs'
                  : 'text-[#5B6470] hover:text-[#1A1F26]'
              }`}
            >
              سنایا (Recited)
            </button>
            <button
              type="button"
              onClick={() => setLessonStatus('manzil', 'not_recited')}
              className={`py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                currentRecord.manzil.status === 'not_recited'
                  ? 'bg-white text-[#B42318] shadow-xs'
                  : 'text-[#5B6470] hover:text-[#1A1F26]'
              }`}
            >
              نہیں سنایا ({scoringRules.notRecitedManzil})
            </button>
            <button
              type="button"
              onClick={() => setLessonStatus('manzil', 'absent')}
              className={`py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                currentRecord.manzil.status === 'absent'
                  ? 'bg-white text-[#5B6470] shadow-xs'
                  : 'text-[#5B6470] hover:text-[#1A1F26]'
              }`}
            >
              غیر حاضر
            </button>
          </div>

          {currentRecord.manzil.status === 'recited' && (
            <>
              {currentRecord.manzil.mistakes === 0 ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FEF3C7] text-[#92400E]">
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-[#F59E0B] fill-[#F59E0B]" />
                    <span className="text-[13px] font-bold">0 Mistakes • Clean Recitation!</span>
                  </div>
                  <span className="text-[12px] font-bold text-[#B45309]">+1 Bonus</span>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FEE2E2] text-[#B42318]">
                  <span className="text-[13px] font-bold">
                    {currentRecord.manzil.mistakes} Mistake{currentRecord.manzil.mistakes === 1 ? '' : 's'} (
                    {currentRecord.manzil.lqmaCount} Lqma, {currentRecord.manzil.tajweedCount} Tajweed)
                  </span>
                  <span className="text-[13px] font-bold">
                    -{currentRecord.manzil.mistakes * scoringRules.manzilMistakeDeduction} pts
                  </span>
                </div>
              )}

              {/* Large Thumb Action Row */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => addMistake('manzil')}
                  className="col-span-2 min-h-[66px] rounded-xl bg-[#FEE2E2] hover:bg-[#FCA5A5] text-[#991B1B] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-[16px] font-bold px-4 border border-[#FCA5A5]"
                >
                  <MinusCircle size={24} />
                  <span>غلطی Mistake (-{scoringRules.manzilMistakeDeduction})</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeMistake('manzil')}
                  className="min-h-[66px] rounded-xl bg-[#F7F5F0] hover:bg-[#EAE6DE] text-[#1A1F26] active:scale-[0.98] transition-transform flex flex-col items-center justify-center gap-0.5 border border-[#E4E0D7]"
                >
                  <RotateCcw size={20} className="text-[#5B6470]" />
                  <span className="text-[12px] font-medium">Undo</span>
                </button>
              </div>
            </>
          )}
        </article>

        {/* --- DISCIPLINE & ADAB CARD --- */}
        <article className="w-full bg-white rounded-2xl p-4 border border-[#E4E0D7] shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold text-[#1A1F26]">
              Adab & Attendance Discipline (ادب و حاضری)
            </span>
            <span className="text-[16px] font-bold text-[#0F766E] tabular-nums">
              {currentRecord.disciplineScore} / 5 pts
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Uniform */}
            <button
              type="button"
              onClick={() => toggleDiscipline('uniform')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                currentRecord.discipline.uniform
                  ? 'bg-[#E6F4F2] text-[#0F766E] border-[#0F766E]'
                  : 'bg-[#F7F5F0] text-[#8A929C] border-[#E4E0D7]'
              }`}
            >
              <CheckCircle2 size={18} className="mb-0.5" />
              <span className="font-bold text-[12px]">Uniform</span>
              <span className="text-[10px] opacity-80">+{scoringRules.disciplineUniform} pts</span>
            </button>

            {/* Behaviour */}
            <button
              type="button"
              onClick={() => toggleDiscipline('behaviour')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                currentRecord.discipline.behaviour
                  ? 'bg-[#E6F4F2] text-[#0F766E] border-[#0F766E]'
                  : 'bg-[#F7F5F0] text-[#8A929C] border-[#E4E0D7]'
              }`}
            >
              <CheckCircle2 size={18} className="mb-0.5" />
              <span className="font-bold text-[12px]">Behaviour</span>
              <span className="text-[10px] opacity-80">+{scoringRules.disciplineBehaviour} pts</span>
            </button>

            {/* On Time */}
            <button
              type="button"
              onClick={() => toggleDiscipline('onTime')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                currentRecord.discipline.onTime
                  ? 'bg-[#E6F4F2] text-[#0F766E] border-[#0F766E]'
                  : 'bg-[#F7F5F0] text-[#8A929C] border-[#E4E0D7]'
              }`}
            >
              <CheckCircle2 size={18} className="mb-0.5" />
              <span className="font-bold text-[12px]">On Time</span>
              <span className="text-[10px] opacity-80">+{scoringRules.disciplineOnTime} pt</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowAdHocModal(true)}
              className="py-2.5 px-3 rounded-xl bg-[#F7F5F0] hover:bg-[#EAE6DE] text-[#1A1F26] border border-[#E4E0D7] text-[12px] font-semibold flex items-center justify-center gap-1.5"
            >
              <PlusCircle size={15} className="text-[#0F766E]" />
              <span>± Points Note</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFineModal(true)}
              className="py-2.5 px-3 rounded-xl bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B42318] border border-[#FCA5A5] text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all"
            >
              <ShieldAlert size={15} className="text-[#B42318]" />
              <span>جرمانہ عائد کریں (Fine)</span>
            </button>
          </div>
        </article>
      </div>

      {/* 4. Sticky Bottom Action Bar */}
      <div className="fixed bottom-16 inset-x-0 z-40 px-4 py-2 bg-[#F7F5F0]/95 backdrop-blur-md border-t border-[#E4E0D7] no-print">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Prev */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={selectedStudentIndex === 0}
            className={`h-12 px-3 rounded-xl border border-[#E4E0D7] bg-white text-[#1A1F26] flex items-center justify-center gap-1 text-[14px] font-semibold ${
              selectedStudentIndex === 0 ? 'opacity-40 pointer-events-none' : 'hover:bg-[#F0EDE6]'
            }`}
          >
            <ChevronLeft size={18} />
            <span>Prev</span>
          </button>

          {/* Session Progress Pill */}
          <div
            onClick={() => setShowReviewDayModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20 text-[12px] font-bold cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E] animate-ping" />
            <span>{completedCount}/{activeStudents.length} Done</span>
          </div>

          {/* Primary Save & Next */}
          <button
            type="button"
            onClick={handleSaveStudent}
            className="h-12 flex-1 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0B5D57] active:scale-[0.99] text-white flex items-center justify-center gap-1.5 font-bold text-[14px] shadow-sm transition-all"
          >
            <span>Save & Next</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 5. Ad-Hoc Bonus or Deduction Modal */}
      {showAdHocModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs no-print">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 border-t border-[#E4E0D7] shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-[#1A1F26]">
                Ad-Hoc Discipline / Bonus
              </h3>
              <button
                type="button"
                onClick={() => setShowAdHocModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5B6470]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold text-[#1A1F26] block mb-1">
                  Points Adjustment (+ or -)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdHocPoints((p) => p - 1)}
                    className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#B42318] font-bold text-lg flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={adHocPoints}
                    onChange={(e) => setAdHocPoints(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 h-10 text-center font-bold text-lg rounded-xl border border-[#E4E0D7] bg-[#F7F5F0]"
                  />
                  <button
                    type="button"
                    onClick={() => setAdHocPoints((p) => p + 1)}
                    className="w-10 h-10 rounded-xl bg-[#E6F4F2] text-[#0F766E] font-bold text-lg flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#1A1F26] block mb-1">
                  Reason Note
                </label>
                <input
                  type="text"
                  value={adHocReason}
                  onChange={(e) => setAdHocReason(e.target.value)}
                  placeholder="e.g. helped a friend, outstanding adab, late..."
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px]"
                />
              </div>

              {/* Quick Reason Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { text: 'Helped classmate (+1)', pts: 1 },
                  { text: 'Exceptional Tajweed (+2)', pts: 2 },
                  { text: 'Disruptive speech (-2)', pts: -2 },
                  { text: 'Clean dress code (+1)', pts: 1 }
                ].map((chip) => (
                  <button
                    key={chip.text}
                    type="button"
                    onClick={() => {
                      setAdHocPoints(chip.pts);
                      setAdHocReason(chip.text);
                    }}
                    className="text-[11px] py-1 px-2.5 rounded-lg bg-[#F0EDE6] text-[#1A1F26] hover:bg-[#E4E0D7]"
                  >
                    {chip.text}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdHocModal(false)}
                  className="h-11 rounded-xl border border-[#C9C4B8] text-[#1A1F26] font-semibold text-[14px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateRecordState((p) => ({
                      ...p,
                      discipline: {
                        ...p.discipline,
                        customPoints: adHocPoints,
                        customReason: adHocReason
                      }
                    }));
                    setShowAdHocModal(false);
                    onShowToast(`Discipline adjusted by ${adHocPoints > 0 ? '+' : ''}${adHocPoints}`, 'success');
                  }}
                  className="h-11 rounded-xl bg-[#0F766E] text-white font-semibold text-[14px]"
                >
                  Apply Points
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Review and Save Day Modal */}
      {showReviewDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs no-print">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-[#E4E0D7] shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-1 border-b border-[#E4E0D7]">
              <div className="flex items-center gap-2">
                <FileCheck size={20} className="text-[#0F766E]" />
                <h3 className="text-[17px] font-bold text-[#1A1F26]">
                  Review & Lock Day
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewDayModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5B6470]"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[13px] text-[#5B6470] leading-snug">
              Review every student's daily score before final submission. Saving the day locks all records.
            </p>

            {/* Students list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-[#E4E0D7]/60">
              {activeStudents.map((s) => {
                const rec = allTodayRecs.find((r) => r.studentId === s.id);
                const score = rec ? rec.cappedTotal : '—';
                const team = DEFAULT_TEAMS.find((t) => t.id === s.teamId) || DEFAULT_TEAMS[0];
                return (
                  <div key={s.id} className="pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                      <span className="text-[14px] font-semibold text-[#1A1F26] truncate">{s.name}</span>
                    </div>
                    <span className="text-[14px] font-bold text-[#0F766E] tabular-nums">
                      {score} / 50
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#E4E0D7] space-y-2">
              <button
                type="button"
                onClick={() => {
                  const recordsToLock = allTodayRecs.map((r) => ({
                    ...r,
                    isDraft: false,
                    savedAt: new Date().toISOString()
                  }));
                  storage.saveDailyRecordsBatch(recordsToLock);
                  setShowReviewDayModal(false);
                  playFeedbackSound('save', soundEnabled);
                  onShowToast('Day successfully locked and saved!', 'success');
                }}
                className="w-full h-12 rounded-xl bg-[#0F766E] hover:bg-[#0B5D57] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-sm"
              >
                <Lock size={18} />
                <span>Confirm & Lock Today's Scores</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Surah & Ayah Portion Picker Modal */}
      {showSurahPicker && currentRecord && (
        <SurahPickerModal
          isOpen={!!showSurahPicker}
          lessonLabel={showSurahPicker.toUpperCase()}
          currentPara={currentRecord[showSurahPicker].details.para}
          currentSurah={currentRecord[showSurahPicker].details.surah}
          ayahFrom={currentRecord[showSurahPicker].details.ayahFrom || 1}
          ayahTo={currentRecord[showSurahPicker].details.ayahTo || 15}
          onClose={() => setShowSurahPicker(false)}
          onSelectPortion={(para, surah, from, to) => {
            if (!showSurahPicker) return;
            const targetKey = showSurahPicker;
            updateRecordState((prev) => ({
              ...prev,
              [targetKey]: {
                ...prev[targetKey],
                details: {
                  ...prev[targetKey].details,
                  para,
                  surah,
                  ayahFrom: from,
                  ayahTo: to
                }
              }
            }));
            onShowToast(`${targetKey.toUpperCase()}: Para ${para}, ${surah} (${from}-${to}) assigned!`, 'success');
          }}
        />
      )}

      {/* Fine Modal for Active Student */}
      {currentStudent && (
        <FineModal
          isOpen={showFineModal}
          students={students}
          preSelectedStudent={currentStudent}
          preSelectedTeamId={currentStudent.teamId}
          todayDate={todayDate}
          soundEnabled={soundEnabled}
          onClose={() => setShowFineModal(false)}
          onFineIssued={(fine) => {
            onShowToast(`${currentStudent.name} پر Rs. ${fine.amount} جرمانہ عائد ہوا`, 'warning');
          }}
        />
      )}
    </div>
  );
};
