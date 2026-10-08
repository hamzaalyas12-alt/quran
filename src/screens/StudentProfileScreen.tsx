import React, { useState, useMemo } from 'react';
import { DailyStudentRecord, FineRecord, Student, TerminationRecord, WarningRecord } from '../types';
import { DEFAULT_TEAMS } from '../scoring/scoringConfig';
import { storage } from '../data/storage';
import { WarningDialog } from '../components/WarningDialog';
import { FineModal } from '../components/FineModal';
import {
  ChevronLeft,
  Calendar,
  AlertTriangle,
  Star,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  Trash2,
  Plus
} from 'lucide-react';

interface StudentProfileScreenProps {
  student: Student;
  dailyRecords: DailyStudentRecord[];
  warnings: WarningRecord[];
  terminations: TerminationRecord[];
  todayDate: string;
  onBack: () => void;
  onRefreshData: () => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const StudentProfileScreen: React.FC<StudentProfileScreenProps> = ({
  student,
  dailyRecords,
  warnings,
  terminations,
  todayDate,
  onBack,
  onRefreshData,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'sabaq_log' | 'mistakes' | 'history' | 'fines'>('progress');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showFineModal, setShowFineModal] = useState(false);

  const team = DEFAULT_TEAMS.find((t) => t.id === student.teamId) || DEFAULT_TEAMS[0];

  // Fines for this student
  const studentFines = useMemo(() => {
    return storage.getFines(student.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [student.id, dailyRecords]);

  const totalFines = useMemo(() => studentFines.reduce((sum, f) => sum + f.amount, 0), [studentFines]);
  const pendingFines = useMemo(() => studentFines.filter((f) => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0), [studentFines]);
  const paidFines = useMemo(() => studentFines.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0), [studentFines]);

  // Records for this student sorted desc by date
  const studentRecords = useMemo(() => {
    return dailyRecords
      .filter((r) => r.studentId === student.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [dailyRecords, student.id]);

  const activeWarnings = useMemo(() => {
    return warnings.filter((w) => w.studentId === student.id && !w.isUndone);
  }, [warnings, student.id]);

  const isTerminated = useMemo(() => {
    return terminations.some((t) => t.studentId === student.id && !t.isUndone);
  }, [terminations, student.id]);

  // Scores
  const todayRecord = studentRecords.find((r) => r.date === todayDate);
  const todayScore = todayRecord ? todayRecord.cappedTotal : 0;
  const weeklyScore = useMemo(() => {
    return studentRecords.slice(0, 7).reduce((acc, r) => acc + r.cappedTotal, 0);
  }, [studentRecords]);
  const monthlyScore = useMemo(() => {
    return studentRecords.slice(0, 30).reduce((acc, r) => acc + r.cappedTotal, 0);
  }, [studentRecords]);
  const totalBonuses = useMemo(() => {
    return studentRecords.reduce((acc, r) => acc + (r.cleanRecitationBonus || 0), 0);
  }, [studentRecords]);

  // Mistakes aggregation: Lqma vs Tajweed
  const mistakesStats = useMemo(() => {
    let totalLqma = 0;
    let totalTajweed = 0;
    let sabaqMistakes = 0;
    let sabqiMistakes = 0;
    let manzilMistakes = 0;

    studentRecords.forEach((r) => {
      totalLqma += (r.sabaq.lqmaCount || 0) + (r.sabqi.lqmaCount || 0) + (r.manzil.lqmaCount || 0);
      totalTajweed += (r.sabaq.tajweedCount || 0) + (r.sabqi.tajweedCount || 0) + (r.manzil.tajweedCount || 0);
      sabaqMistakes += r.sabaq.mistakes || 0;
      sabqiMistakes += r.sabqi.mistakes || 0;
      manzilMistakes += r.manzil.mistakes || 0;
    });

    const grandTotal = totalLqma + totalTajweed;
    return {
      totalLqma,
      totalTajweed,
      sabaqMistakes,
      sabqiMistakes,
      manzilMistakes,
      grandTotal: grandTotal || 1,
      lqmaPct: grandTotal > 0 ? Math.round((totalLqma / grandTotal) * 100) : 50,
      tajweedPct: grandTotal > 0 ? Math.round((totalTajweed / grandTotal) * 100) : 50
    };
  }, [studentRecords]);

  // Handle issuing warning or termination
  const handleIssueWarning = (reason: string, isTermination: boolean) => {
    if (isTermination) {
      const warn: WarningRecord = {
        id: `warn_${Date.now()}`,
        studentId: student.id,
        studentName: student.name,
        teamId: student.teamId,
        date: todayDate,
        reason,
        isUndone: false,
        createdAt: new Date().toISOString()
      };
      storage.addWarning(warn);

      const term: TerminationRecord = {
        id: `term_${Date.now()}`,
        studentId: student.id,
        studentName: student.name,
        teamId: student.teamId,
        date: todayDate,
        reason,
        penaltyPoints: 500,
        isUndone: false,
        createdAt: new Date().toISOString()
      };
      storage.addTermination(term);
      onShowToast(`3rd warning issued. ${student.name} terminated, -500 pts team fine applied.`, 'error');
    } else {
      const warn: WarningRecord = {
        id: `warn_${Date.now()}`,
        studentId: student.id,
        studentName: student.name,
        teamId: student.teamId,
        date: todayDate,
        reason,
        isUndone: false,
        createdAt: new Date().toISOString()
      };
      storage.addWarning(warn);
      onShowToast(`Discipline warning recorded for ${student.name}`, 'warning');
    }
    setShowWarningModal(false);
    onRefreshData();
  };

  const handleUndoWarning = (warningId: string) => {
    storage.undoWarning(warningId);
    onShowToast('Warning reversed with Undo', 'info');
    onRefreshData();
  };

  const handleUndoTermination = () => {
    const studentTerm = terminations.find((t) => t.studentId === student.id && !t.isUndone);
    if (studentTerm) {
      storage.undoTermination(studentTerm.id);
      onShowToast('Termination and penalty reversed with Undo', 'info');
      onRefreshData();
    }
  };

  return (
    <div className="flex flex-col w-full pb-32 px-4 pt-20 max-w-md mx-auto space-y-4">
      {/* 1. Header with Initials Avatar & Team Badge */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white border border-[#E4E0D7] flex items-center justify-center text-[#1A1F26] hover:bg-[#F7F5F0]"
          aria-label="Back to Teams"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="w-12 h-12 rounded-full text-white flex items-center justify-center font-bold text-[17px] shadow-xs flex-shrink-0"
            style={{ backgroundColor: team.color }}
          >
            {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0">
            <h1 className="text-[19px] font-bold text-[#1A1F26] truncate">
              {student.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: team.color }}
              >
                {team.name}
              </span>
              {isTerminated && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#B42318]">
                  Terminated
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Summary Card: Today, Week, Month, Warnings, Bonus */}
      <div className="bg-white rounded-2xl p-4 border border-[#E4E0D7] shadow-xs space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#E4E0D7]">
            <div className="text-[11px] text-[#5B6470] font-medium">Today</div>
            <div className="text-[20px] font-bold text-[#0F766E] tabular-nums mt-0.5">
              {todayRecord ? `${todayScore}/50` : '—'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#E4E0D7]">
            <div className="text-[11px] text-[#5B6470] font-medium">7-Day Sum</div>
            <div className="text-[20px] font-bold text-[#1A1F26] tabular-nums mt-0.5">
              {weeklyScore}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#E4E0D7]">
            <div className="text-[11px] text-[#5B6470] font-medium">30-Day Sum</div>
            <div className="text-[20px] font-bold text-[#1A1F26] tabular-nums mt-0.5">
              {monthlyScore}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#E4E0D7] text-[13px]">
          <div className="flex items-center gap-2">
            <span className="text-[#5B6470]">Warnings:</span>
            <div className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded-full ${activeWarnings.length >= 1 ? 'bg-[#B45309]' : 'bg-[#E4E0D7]'}`} />
              <span className={`w-3 h-3 rounded-full ${activeWarnings.length >= 2 ? 'bg-[#B45309]' : 'bg-[#E4E0D7]'}`} />
              <span className={`w-3 h-3 rounded-full ${activeWarnings.length >= 3 ? 'bg-[#B42318]' : 'bg-[#E4E0D7]'}`} />
            </div>
            <span className="text-[12px] font-bold text-[#B45309]">
              {activeWarnings.length}/3
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#FEF3C7] text-[#92400E] px-2.5 py-1 rounded-full text-[12px] font-bold">
            <Star size={13} className="fill-[#F59E0B] text-[#F59E0B]" />
            <span>{totalBonuses} Clean Bonuses</span>
          </div>
        </div>

        {/* Warning and Fine Action buttons */}
        <div className="pt-1 flex items-center gap-2">
          {!isTerminated ? (
            <button
              type="button"
              onClick={() => setShowWarningModal(true)}
              className="flex-1 h-10 rounded-xl bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] font-bold text-[12px] flex items-center justify-center gap-1.5 border border-[#FDE68A] transition-all"
            >
              <AlertTriangle size={15} />
              <span>Give Warning</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUndoTermination}
              className="flex-1 h-10 rounded-xl bg-[#FEE2E2] hover:bg-[#FCA5A5] text-[#B42318] font-bold text-[12px] flex items-center justify-center gap-1.5 border border-[#FCA5A5] transition-all"
            >
              <RotateCcw size={15} />
              <span>Undo Termination</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowFineModal(true)}
            className="flex-1 h-10 rounded-xl bg-[#B42318] hover:bg-[#991B1B] text-white font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
          >
            <DollarSign size={15} />
            <span>جرمانہ (Fine)</span>
          </button>
        </div>

        {/* Fines summary chip if student has fines */}
        {studentFines.length > 0 && (
          <div
            onClick={() => setActiveTab('fines')}
            className="p-2 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-between text-[12px] cursor-pointer hover:bg-red-100 transition-all"
          >
            <div className="flex items-center gap-1.5 text-[#B42318] font-bold">
              <DollarSign size={14} />
              <span>کل جرمانے: {studentFines.length}</span>
            </div>
            <div className="text-[12px] font-bold text-[#B42318]">
              {pendingFines > 0 ? `واجب: Rs. ${pendingFines}` : 'مکمل ادا شدہ'}
            </div>
          </div>
        )}
      </div>

      {/* 3. Five Tabs: Progress, Sabaq Log, Mistakes, History, Fines */}
      <div className="bg-[#F0EDE6] p-1 rounded-xl flex items-center justify-between text-[12px] font-semibold gap-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap ${
            activeTab === 'progress'
              ? 'bg-white text-[#0F766E] shadow-xs font-bold'
              : 'text-[#5B6470] hover:text-[#1A1F26]'
          }`}
        >
          Progress
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sabaq_log')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap ${
            activeTab === 'sabaq_log'
              ? 'bg-white text-[#0F766E] shadow-xs font-bold'
              : 'text-[#5B6470] hover:text-[#1A1F26]'
          }`}
        >
          Sabaq Log
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mistakes')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap ${
            activeTab === 'mistakes'
              ? 'bg-white text-[#0F766E] shadow-xs font-bold'
              : 'text-[#5B6470] hover:text-[#1A1F26]'
          }`}
        >
          Mistakes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-white text-[#0F766E] shadow-xs font-bold'
              : 'text-[#5B6470] hover:text-[#1A1F26]'
          }`}
        >
          History
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fines')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap relative ${
            activeTab === 'fines'
              ? 'bg-white text-[#B42318] shadow-xs font-bold'
              : 'text-[#5B6470] hover:text-[#1A1F26]'
          }`}
        >
          <span>Fines</span>
          {pendingFines > 0 && (
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#B42318] inline-block align-top" />
          )}
        </button>
      </div>

      {/* 4. Tab Content Panels */}
      {activeTab === 'progress' && (
        <div className="bg-white rounded-2xl p-4 border border-[#E4E0D7] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[#1A1F26]">
              Recitation Consistency Curve
            </h3>
            <span className="text-[12px] text-[#5B6470]">Last 7 entries</span>
          </div>

          <div className="space-y-2.5">
            {studentRecords.slice(0, 7).map((r) => {
              const pct = Math.max(0, Math.min(100, (r.cappedTotal / 50) * 100));
              return (
                <div key={r.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#5B6470]">{r.date}</span>
                    <span className="font-bold text-[#0F766E] tabular-nums">{r.cappedTotal}/50</span>
                  </div>
                  <div className="w-full bg-[#E4E0D7] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#0F766E] h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'sabaq_log' && (
        <div className="bg-white rounded-2xl p-4 border border-[#E4E0D7] shadow-xs space-y-3">
          <h3 className="text-[15px] font-bold text-[#1A1F26] mb-2">
            Sabaq Portions Log (Para & Surah)
          </h3>
          <div className="space-y-2.5 divide-y divide-[#E4E0D7]/60">
            {studentRecords.map((r) => (
              <div key={r.id} className="pt-2 flex items-start justify-between">
                <div>
                  <div className="text-[14px] font-semibold text-[#1A1F26]">
                    {r.sabaq.details.surah || 'Daily Sabaq'} (Para {r.sabaq.details.para || 30})
                  </div>
                  <div className="text-[12px] text-[#5B6470]">
                    Ayah {r.sabaq.details.ayahFrom || 1} – {r.sabaq.details.ayahTo || 15}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-bold text-[#0F766E]">
                    {r.sabaqScore}/10 pts
                  </div>
                  <div className="text-[11px] text-[#8A929C]">{r.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'mistakes' && (
        <div className="bg-white rounded-2xl p-4 border border-[#E4E0D7] shadow-xs space-y-4">
          <h3 className="text-[15px] font-bold text-[#1A1F26]">
            Mistakes Breakdown (Lqma vs Tajweed)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#F7F5F0] border border-[#E4E0D7] text-center">
              <span className="text-[12px] text-[#5B6470] font-medium">Lqma (Prompts)</span>
              <div className="text-[24px] font-bold text-[#1A1F26] tabular-nums mt-0.5">
                {mistakesStats.totalLqma}
              </div>
              <span className="text-[11px] text-[#5B6470]">{mistakesStats.lqmaPct}% of errors</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F7F5F0] border border-[#E4E0D7] text-center">
              <span className="text-[12px] text-[#5B6470] font-medium">Tajweed / Makhraj</span>
              <div className="text-[24px] font-bold text-[#1A1F26] tabular-nums mt-0.5">
                {mistakesStats.totalTajweed}
              </div>
              <span className="text-[11px] text-[#5B6470]">{mistakesStats.tajweedPct}% of errors</span>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-[#E4E0D7]">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#5B6470]">Sabaq Errors:</span>
              <span className="font-bold text-[#1A1F26]">{mistakesStats.sabaqMistakes}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#5B6470]">Sabqi Errors:</span>
              <span className="font-bold text-[#1A1F26]">{mistakesStats.sabqiMistakes}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#5B6470]">Manzil Errors:</span>
              <span className="font-bold text-[#1A1F26]">{mistakesStats.manzilMistakes}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl p-4 border border-[#E4E0D7] shadow-xs space-y-3">
          <h3 className="text-[15px] font-bold text-[#1A1F26]">
            Daily Evaluation Records
          </h3>
          <div className="space-y-2.5 divide-y divide-[#E4E0D7]/60">
            {studentRecords.map((r) => (
              <div key={r.id} className="pt-2 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold text-[#1A1F26]">{r.date}</div>
                  <div className="text-[11px] text-[#5B6470]">
                    Sabaq {r.sabaqScore} • Sabqi {r.sabqiScore} • Manzil {r.manzilScore} • Adab {r.disciplineScore}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[16px] font-bold text-[#0F766E] tabular-nums">
                    {r.cappedTotal}/50
                  </span>
                  {r.cleanRecitationBonus > 0 && (
                    <div className="text-[10px] font-bold text-[#B45309]">+ {r.cleanRecitationBonus} Bonus</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4.5 Fines Tab Panel */}
      {activeTab === 'fines' && (
        <div className="bg-white rounded-2xl p-4 border border-[#E4E0D7] shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[#1A1F26] flex items-center gap-1.5">
              <DollarSign size={17} className="text-[#B42318]" />
              <span>جرمانہ رجسٹر (Fines Ledger)</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowFineModal(true)}
              className="px-2.5 py-1 rounded-xl bg-[#B42318] hover:bg-[#991B1B] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs"
            >
              <Plus size={13} />
              <span>نیا جرمانہ</span>
            </button>
          </div>

          {/* Fines 3-stat bar */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-[#F7F5F0] border border-[#E4E0D7]">
              <div className="text-[10px] text-[#5B6470] font-semibold">کل رقم</div>
              <div className="text-[15px] font-bold text-[#1A1F26] mt-0.5">Rs. {totalFines}</div>
            </div>
            <div className="p-2 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5]">
              <div className="text-[10px] text-[#B42318] font-semibold">واجب الادا</div>
              <div className="text-[15px] font-bold text-[#B42318] mt-0.5">Rs. {pendingFines}</div>
            </div>
            <div className="p-2 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
              <div className="text-[10px] text-[#16803C] font-semibold">وصول شدہ</div>
              <div className="text-[15px] font-bold text-[#16803C] mt-0.5">Rs. {paidFines}</div>
            </div>
          </div>

          {/* Fines List */}
          {studentFines.length === 0 ? (
            <div className="py-8 text-center text-[#8A929C] space-y-1">
              <div className="w-10 h-10 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto text-[#16803C]">
                <CheckCircle2 size={20} />
              </div>
              <p className="text-[13px] font-semibold text-[#16803C]">کوئی جرمانہ درج نہیں ہے</p>
              <p className="text-[11px]">طالب علم نے تمام اصولوں کی پاسداری کی ہے۔</p>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {studentFines.map((fine) => (
                <div
                  key={fine.id}
                  className={`p-3 rounded-xl border text-[12px] transition-all ${
                    fine.status === 'pending'
                      ? 'bg-[#FFFBF5] border-[#FDE68A]'
                      : fine.status === 'paid'
                      ? 'bg-[#F9FCF9] border-[#BBF7D0]'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-[13px] text-[#1A1F26] flex items-center gap-1.5">
                        <span>{fine.reason}</span>
                        <span className="text-[11px] text-[#8A929C] font-normal">({fine.date})</span>
                      </div>
                      {fine.notes && (
                        <div className="text-[11px] text-[#6B7280] italic mt-0.5">
                          تفصیل: {fine.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[15px] font-bold text-[#B42318]">Rs. {fine.amount}</div>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                          fine.status === 'pending'
                            ? 'bg-[#FEF3C7] text-[#B45309]'
                            : fine.status === 'paid'
                            ? 'bg-[#DCFCE7] text-[#16803C]'
                            : 'bg-[#F3F4F6] text-[#6B7280]'
                        }`}
                      >
                        {fine.status === 'pending' ? 'واجب (Pending)' : fine.status === 'paid' ? 'وصول (Paid)' : 'معاف (Waived)'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-end gap-1.5">
                    {fine.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            storage.updateFineStatus(fine.id, 'paid');
                            onRefreshData();
                            onShowToast('وصولی درج ہو گئی', 'success');
                          }}
                          className="px-2 py-0.5 rounded-lg bg-[#16803C] hover:bg-[#14532D] text-white text-[11px] font-bold flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} />
                          <span>وصول</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            storage.updateFineStatus(fine.id, 'waived');
                            onRefreshData();
                            onShowToast('جرمانہ معاف ہو گیا', 'info');
                          }}
                          className="px-2 py-0.5 rounded-lg bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#374151] text-[11px] font-semibold"
                        >
                          معاف
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        storage.deleteFine(fine.id);
                        onRefreshData();
                        onShowToast('جرمانہ خارج ہو گیا', 'info');
                      }}
                      className="p-1 rounded-lg text-gray-400 hover:text-[#B42318] hover:bg-red-50 transition-colors"
                      title="حذف کریں"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warnings History List */}
      {activeWarnings.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-[#FDE68A] shadow-xs space-y-2.5">
          <h3 className="text-[14px] font-bold text-[#92400E] flex items-center gap-1.5">
            <AlertTriangle size={16} />
            <span>Active Warnings Log</span>
          </h3>
          <div className="space-y-2">
            {activeWarnings.map((w, idx) => (
              <div
                key={w.id}
                className="p-2.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-between text-[12px]"
              >
                <div>
                  <div className="font-bold text-[#92400E]">
                    Warning #{idx + 1} • {w.date}
                  </div>
                  <div className="text-[#78350F]">{w.reason}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUndoWarning(w.id)}
                  className="px-2 py-1 rounded-lg bg-white text-[#92400E] font-bold text-[11px] border border-[#FDE68A] hover:bg-[#FDE68A]"
                >
                  Undo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Warning Dialog Modal */}
      <WarningDialog
        isOpen={showWarningModal}
        student={student}
        activeWarningCount={activeWarnings.length}
        onClose={() => setShowWarningModal(false)}
        onIssueWarning={handleIssueWarning}
      />

      {/* 6. Fine Modal */}
      <FineModal
        isOpen={showFineModal}
        students={[student]}
        preSelectedStudent={student}
        preSelectedTeamId={student.teamId}
        todayDate={todayDate}
        onClose={() => setShowFineModal(false)}
        onFineIssued={(fine) => {
          onRefreshData();
          onShowToast(`${student.name} پر Rs. ${fine.amount} جرمانہ عائد ہوا`, 'warning');
        }}
      />
    </div>
  );
};
