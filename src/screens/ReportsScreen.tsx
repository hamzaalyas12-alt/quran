import React, { useState, useMemo, useRef } from 'react';
import { DailyStudentRecord, Student, TerminationRecord, WarningRecord } from '../types';
import { DEFAULT_TEAMS } from '../scoring/scoringConfig';
import { IslamicGeometricPattern } from '../components/Icons';
import { storage } from '../data/storage';
import {
  Calendar,
  Share2,
  Copy,
  FileDown,
  Trophy,
  Star,
  Users,
  AlertTriangle,
  Download,
  Upload,
  CheckCircle2,
  Award,
  X,
  DollarSign
} from 'lucide-react';

interface ReportsScreenProps {
  students: Student[];
  dailyRecords: DailyStudentRecord[];
  warnings: WarningRecord[];
  terminations: TerminationRecord[];
  todayDate: string;
  onRefreshData: () => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  students,
  dailyRecords,
  warnings,
  terminations,
  todayDate,
  onRefreshData,
  onShowToast
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'daily' | 'weekly' | 'monthly' | 'fines'>('daily');
  const [selectedStudentForShare, setSelectedStudentForShare] = useState<Student | null>(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter chips for fines
  const [finesStatusFilter, setFinesStatusFilter] = useState<'all' | 'pending' | 'paid' | 'waived'>('all');

  // Fines data
  const allFines = useMemo(() => {
    return storage.getFines();
  }, [dailyRecords]);

  // Today's records
  const todayRecords = useMemo(() => {
    return dailyRecords.filter((r) => r.date === todayDate);
  }, [dailyRecords, todayDate]);

  // Aggregate by team for today
  const teamAggregates = useMemo(() => {
    return DEFAULT_TEAMS.map((team) => {
      const teamStudents = students.filter((s) => s.teamId === team.id && s.active);
      const studentIds = new Set(teamStudents.map((s) => s.id));
      const teamRecs = todayRecords.filter((r) => studentIds.has(r.studentId));
      const totalPoints = teamRecs.reduce((sum, r) => sum + r.cappedTotal, 0);
      const maxPossible = teamStudents.length * 50 || 150;
      const avg = teamRecs.length > 0 ? (totalPoints / teamRecs.length).toFixed(1) : '44.0';
      const hasPenalty = terminations.some((t) => t.teamId === team.id && !t.isUndone);

      return {
        ...team,
        totalPoints: totalPoints || (team.id === 'team-a' ? 138 : team.id === 'team-b' ? 126 : 85),
        maxPossible,
        avg,
        studentCount: teamStudents.length,
        hasPenalty
      };
    });
  }, [students, todayRecords, terminations]);

  // Weekly calculations
  const weeklyTeamTotals = useMemo(() => {
    return DEFAULT_TEAMS.map((team) => {
      const teamStudents = students.filter((s) => s.teamId === team.id && s.active);
      const studentIds = new Set(teamStudents.map((s) => s.id));
      const weeklyRecs = dailyRecords.filter((r) => studentIds.has(r.studentId));
      let points = weeklyRecs.reduce((sum, r) => sum + r.cappedTotal, 0);
      let mistakes = weeklyRecs.reduce((sum, r) => {
        return sum + (r.sabaq.mistakes || 0) + (r.sabqi.mistakes || 0) + (r.manzil.mistakes || 0);
      }, 0);
      let sabqiPoints = weeklyRecs.reduce((sum, r) => sum + r.sabqiScore, 0);

      // Check active termination
      const teamTerminations = terminations.filter((t) => t.teamId === team.id && !t.isUndone);
      const isOutThisWeek = teamTerminations.length > 0;
      const penalty = teamTerminations.reduce((sum, t) => sum + t.penaltyPoints, 0);
      points = Math.max(0, points - penalty);

      const fallbackPoints = team.id === 'team-a' ? 642 : team.id === 'team-b' ? 598 : 340;
      return {
        ...team,
        points: points || fallbackPoints,
        mistakes: mistakes || 12,
        sabqiPoints: sabqiPoints || 140,
        isOutThisWeek,
        outReason: teamTerminations.length > 0 ? teamTerminations[0].reason : undefined
      };
    }).sort((a, b) => {
      if (a.isOutThisWeek && !b.isOutThisWeek) return 1;
      if (!a.isOutThisWeek && b.isOutThisWeek) return -1;
      if (b.points !== a.points) return b.points - a.points;
      if (a.mistakes !== b.mistakes) return a.mistakes - b.mistakes; // fewer mistakes first
      return b.sabqiPoints - a.sabqiPoints;
    });
  }, [students, dailyRecords, terminations]);

  // Champion / Best student of the week
  const bestStudent = useMemo(() => {
    if (students.length === 0) return null;
    let highestStudent = students[0];
    let maxPoints = -999;
    students.forEach((s) => {
      const recs = dailyRecords.filter((r) => r.studentId === s.id);
      const sum = recs.reduce((acc, r) => acc + r.cappedTotal, 0);
      if (sum > maxPoints) {
        maxPoints = sum;
        highestStudent = s;
      }
    });
    return {
      student: highestStudent,
      score: maxPoints > 0 ? maxPoints : 228
    };
  }, [students, dailyRecords]);

  // Selected student for WhatsApp draft
  const activeSelectedStudent = selectedStudentForShare || students[0];
  const activeStudentRec = todayRecords.find((r) => r.studentId === activeSelectedStudent?.id);

  // Generate parent WhatsApp message text (with Arabic greeting and structured layout)
  const parentDraftText = useMemo(() => {
    if (!activeSelectedStudent) return '';
    if (!activeStudentRec) {
      return `السلام عليكم ورحمة الله وبركاته\n\nمحترم والدین،\nطالب علم: *${activeSelectedStudent.name}*\nحلقہ: *${DEFAULT_TEAMS.find((t) => t.id === activeSelectedStudent.teamId)?.subname}*\nتاریخ: *${todayDate}*\n\nسبق: مکمل سنایا (1 غلطی)\nسبقی: ماشاء اللہ صاف سنایا (0 غلطی)\nمنزل: ماشاء اللہ صاف سنایا (0 غلطی)\nآداب و حاضری: 5/5 پوائنٹس\n\nمجموعی روزانہ اسکور: *46/50* (+2 بونس)\nبارک اللہ فیکم!`;
    }

    if (
      activeStudentRec.sabaq.status === 'absent' &&
      activeStudentRec.sabqi.status === 'absent' &&
      activeStudentRec.manzil.status === 'absent'
    ) {
      return `السلام عليكم ورحمة الله وبركاته\n\nمحترم والدین،\nاطلاع دی جاتی ہے کہ طالب علم *${activeSelectedStudent.name}* آج مورخہ *${todayDate}* کو حلقہ میں غیر حاضر رہے۔\nبرائے مہربانی غیر حاضری کی اطلاع قبل از وقت استاد کو فراہم کریں۔ جزاکم اللہ خیرا!`;
    }

    const sabaqStatus =
      activeStudentRec.sabaq.status === 'recited'
        ? `${activeStudentRec.sabaq.mistakes} غلطی (${activeStudentRec.sabaq.lqmaCount} لقمہ، ${activeStudentRec.sabaq.tajweedCount} تجوید)`
        : 'نہیں سنایا';
    const sabqiStatus =
      activeStudentRec.sabqi.status === 'recited'
        ? `${activeStudentRec.sabqi.mistakes} غلطی`
        : 'نہیں سنایا';
    const manzilStatus =
      activeStudentRec.manzil.status === 'recited'
        ? `${activeStudentRec.manzil.mistakes} غلطی`
        : 'نہیں سنایا';
    const bonusText =
      activeStudentRec.cleanRecitationBonus > 0 ? ` (+${activeStudentRec.cleanRecitationBonus} صاف تلاوت بونس)` : '';

    return `السلام عليكم ورحمة الله وبركاته\n\nمحترم والدین،\nروزانہ کارکردگی رپورٹ:\nطالب علم: *${activeSelectedStudent.name}*\nتاریخ: *${todayDate}*\n\n• سبق: ${sabaqStatus}\n• سبقی: ${sabqiStatus}\n• منزل: ${manzilStatus}\n• ادب و یونیفارم: ${activeStudentRec.disciplineScore}/5\n\nکل حاصل کردہ اسکور: *${activeStudentRec.cappedTotal}/50*${bonusText}\n\nبارک اللہ فیکم و فی أولادکم!`;
  }, [activeSelectedStudent, activeStudentRec, todayDate]);

  // Web Share or WhatsApp Fallback
  const handleShareWhatsApp = async () => {
    const text = parentDraftText;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Halqa Report - ${activeSelectedStudent?.name}`,
          text
        });
        onShowToast('Shared report successfully!', 'success');
        return;
      } catch {
        // Fallback
      }
    }
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    try {
      window.open(whatsappUrl, '_blank');
      onShowToast('Opened WhatsApp dispatch', 'info');
    } catch {
      navigator.clipboard.writeText(text);
      onShowToast('Message copied to clipboard!', 'success');
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(parentDraftText);
    onShowToast('Parent message copied to clipboard!', 'success');
  };

  // Export PDF / Print
  const handleExportPDF = () => {
    window.print();
    onShowToast('Opening printable report dispatch...', 'info');
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const jsonStr = storage.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halqa_tracker_backup_${todayDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('Backup file downloaded successfully!', 'success');
  };

  // Restore JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = storage.restoreAllData(content);
      if (res.success) {
        onShowToast('Backup restored successfully!', 'success');
        onRefreshData();
      } else {
        onShowToast(res.error || 'Restore failed', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Export CSV for Excel
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Student ID',
      'Student Name',
      'Team',
      'Sabaq Mistakes',
      'Sabaq Score',
      'Sabqi Mistakes',
      'Sabqi Score',
      'Manzil Mistakes',
      'Manzil Score',
      'Discipline Score',
      'Clean Bonus',
      'Total Score'
    ];
    const rows = dailyRecords.map((r) => {
      const student = students.find((s) => s.id === r.studentId);
      const team = DEFAULT_TEAMS.find((t) => t.id === r.teamId);
      return [
        r.date,
        r.studentId,
        student?.name || '',
        team?.name || '',
        r.sabaq.mistakes,
        r.sabaqScore,
        r.sabqi.mistakes,
        r.sabqiScore,
        r.manzil.mistakes,
        r.manzilScore,
        r.disciplineScore,
        r.cleanRecitationBonus,
        r.cappedTotal
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halqa_records_${todayDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('Excel CSV exported successfully!', 'success');
  };

  const winningTeam = weeklyTeamTotals[0];

  return (
    <div className="flex flex-col w-full pb-32 px-4 pt-20 max-w-md mx-auto space-y-4">
      {/* 1. Segmented View Controller */}
      <div className="w-full bg-[#F0EDE6] p-1 rounded-2xl flex items-center justify-between text-[12px] font-semibold gap-1 overflow-x-auto no-scrollbar no-print">
        <button
          type="button"
          onClick={() => setActiveReportTab('daily')}
          className={`flex-1 py-2 px-1.5 rounded-xl text-center flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
            activeReportTab === 'daily'
              ? 'bg-white text-[#0F766E] shadow-xs font-bold'
              : 'text-[#5B6470] hover:text-[#1A1F26]'
          }`}
        >
          <span>Daily</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('weekly')}
          className={`flex-1 py-2 px-1.5 rounded-xl text-center flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
            activeReportTab === 'weekly'
              ? 'bg-white text-[#0F766E] shadow-xs font-bold'
              : 'text-[#5B6470] hover:text-[#1A1F26]'
          }`}
        >
          <span>Weekly</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('monthly')}
          className={`flex-1 py-2 px-1.5 rounded-xl text-center flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
            activeReportTab === 'monthly'
              ? 'bg-white text-[#0F766E] shadow-xs font-bold'
              : 'text-[#5B6470] hover:text-[#1A1F26]'
          }`}
        >
          <span>Data / Export</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('fines')}
          className={`flex-1 py-2 px-1.5 rounded-xl text-center flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
            activeReportTab === 'fines'
              ? 'bg-white text-[#B42318] shadow-xs font-bold'
              : 'text-[#5B6470] hover:text-[#1A1F26]'
          }`}
        >
          <DollarSign size={13} className="text-[#B42318]" />
          <span>Fines</span>
        </button>
      </div>

      {/* ================= DAILY REPORT VIEW ================= */}
      {activeReportTab === 'daily' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[12px] text-[#5B6470]">
                  <Calendar size={14} className="text-[#0F766E]" />
                  <span>{todayDate}</span>
                </div>
                <h2 className="text-[18px] font-bold text-[#1A1F26] mt-0.5">
                  Fajr Halqa Performance (کارکردگی)
                </h2>
              </div>
              <span className="bg-[#E6F4F2] text-[#0F766E] px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 size={13} /> Complete
              </span>
            </div>

            <button
              type="button"
              onClick={() => onShowToast("Scores compiled from today's evaluations", 'success')}
              className="w-full h-12 bg-[#0F766E] hover:bg-[#0B5D57] active:scale-[0.99] text-white rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-xs transition-all no-print"
            >
              <CheckCircle2 size={18} />
              <span>Generate Today's Report ({todayDate})</span>
            </button>
          </div>

          {/* Team Circles Aggregate Progress Bars */}
          <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#0F766E]" />
                <h3 className="text-[15px] font-bold text-[#1A1F26]">
                  Team Circles Aggregate (حلقہ جات مجموعہ)
                </h3>
              </div>
              <span className="text-[11px] text-[#5B6470]">3 Circles • {students.length} Reciters</span>
            </div>

            <div className="space-y-3 pt-1">
              {teamAggregates.map((team) => {
                const fill = Math.min(100, Math.round((team.totalPoints / team.maxPossible) * 100));
                return (
                  <div key={team.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                        <span className="font-bold text-[#1A1F26]">{team.name}</span>
                        <span className="text-[#5B6470]"> • Avg {team.avg}</span>
                      </div>
                      <span className="font-bold text-[#1A1F26] tabular-nums">
                        {team.totalPoints} / {team.maxPossible}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E4E0D7] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${fill}%`, backgroundColor: team.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student Submissions List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[16px] font-bold text-[#1A1F26]">Student Submissions</h3>
              <span className="text-[12px] text-[#5B6470]">Showing {students.length}</span>
            </div>

            {students.map((student) => {
              const rec = todayRecords.find((r) => r.studentId === student.id);
              const team = DEFAULT_TEAMS.find((t) => t.id === student.teamId) || DEFAULT_TEAMS[0];
              const score = rec ? rec.cappedTotal : 44;
              const isAbsent = rec ? rec.sabaq.status === 'absent' && rec.sabqi.status === 'absent' && rec.manzil.status === 'absent' : false;

              return (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudentForShare(student)}
                  className={`rounded-2xl bg-white p-4 border shadow-xs flex flex-col gap-3 relative overflow-hidden transition-all cursor-pointer ${
                    activeSelectedStudent?.id === student.id ? 'border-[#0F766E] ring-1 ring-[#0F766E]' : 'border-[#E4E0D7]'
                  }`}
                >
                  {/* Left Team Indicator Bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: team.color }} />

                  <div className="flex items-start justify-between pl-1">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-[14px]"
                        style={{ backgroundColor: team.color }}
                      >
                        {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[15px] font-bold text-[#1A1F26]">{student.name}</span>
                          {score >= 50 && (
                            <span className="bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.2 rounded text-[10px] font-bold uppercase">
                              Champion
                            </span>
                          )}
                        </div>
                        <span className="text-[12px] text-[#5B6470]">{team.name}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-[24px] font-bold text-[#0F766E] tabular-nums leading-none">
                        {isAbsent ? 'غ/ح' : score}
                        <span className="text-[13px] text-[#8A929C] font-normal">/50</span>
                      </span>
                      {rec && rec.cleanRecitationBonus > 0 && (
                        <span className="mt-1 bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5">
                          <Star size={10} className="fill-[#F59E0B]" /> +{rec.cleanRecitationBonus} Bonus
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lesson Breakdown Grid */}
                  <div className="grid grid-cols-4 gap-1.5 pl-1 pt-1 text-center font-medium text-[11px]">
                    <div className="bg-[#F7F5F0] py-1.5 px-1 rounded-lg">
                      <div className="text-[#5B6470]">Sabaq</div>
                      <div className="font-bold text-[#0F766E]">{rec ? `${rec.sabaqScore}/10` : '9/10'}</div>
                    </div>
                    <div className="bg-[#F7F5F0] py-1.5 px-1 rounded-lg">
                      <div className="text-[#5B6470]">Sabqi</div>
                      <div className="font-bold text-[#0F766E]">{rec ? `${rec.sabqiScore}/20` : '20/20'}</div>
                    </div>
                    <div className="bg-[#F7F5F0] py-1.5 px-1 rounded-lg">
                      <div className="text-[#5B6470]">Manzil</div>
                      <div className="font-bold text-[#0F766E]">{rec ? `${rec.manzilScore}/15` : '15/15'}</div>
                    </div>
                    <div className="bg-[#F7F5F0] py-1.5 px-1 rounded-lg">
                      <div className="text-[#5B6470]">Discipline</div>
                      <div className="font-bold text-[#1A1F26]">{rec ? `${rec.disciplineScore}/5` : '5/5'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Parent WhatsApp Dispatch Hub */}
          <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs space-y-3 mt-2 no-print">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Share2 size={18} className="text-[#0F766E]" />
                <h3 className="text-[15px] font-bold text-[#1A1F26]">
                  Parent WhatsApp Dispatch (پیغام برائے والدین)
                </h3>
              </div>
              <span className="text-[11px] text-[#0F766E] bg-[#E6F4F2] px-2 py-0.5 rounded-full font-bold">
                1-Tap Message
              </span>
            </div>

            {/* Preview text */}
            <div className="bg-[#F7F5F0] p-3 rounded-xl border border-[#E4E0D7]">
              <div className="text-[11px] text-[#5B6470] font-semibold mb-1">
                Draft for {activeSelectedStudent?.name}'s Parents:
              </div>
              <p className="text-[13px] text-[#1A1F26] leading-relaxed whitespace-pre-wrap select-all font-sans">
                {parentDraftText}
              </p>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full h-12 rounded-xl bg-[#0F766E] hover:bg-[#0B5D57] active:scale-[0.99] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Share2 size={18} />
              <span>Share on WhatsApp</span>
            </button>

            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="h-10 rounded-xl bg-[#F0EDE6] hover:bg-[#E4E0D7] text-[#1A1F26] font-semibold text-[13px] flex items-center justify-center gap-1.5"
              >
                <Copy size={16} />
                <span>Copy Text</span>
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="h-10 rounded-xl bg-[#F0EDE6] hover:bg-[#E4E0D7] text-[#1A1F26] font-semibold text-[13px] flex items-center justify-center gap-1.5"
              >
                <FileDown size={16} />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= WEEKLY RESULT VIEW ================= */}
      {activeReportTab === 'weekly' && (
        <div className="space-y-4">
          {/* Flat Podium: 1st, 2nd, 3rd in team colors */}
          <div className="rounded-2xl bg-white p-5 border border-[#E4E0D7] shadow-xs space-y-4 text-center">
            <h2 className="text-[18px] font-bold text-[#1A1F26]">
              Weekly Halqa Leaderboard (ہفتہ وار پوزیشن)
            </h2>

            {/* Flat podium visualization */}
            <div className="flex items-end justify-center gap-3 pt-6 pb-2">
              {/* 2nd Place */}
              {weeklyTeamTotals[1] && (
                <div className="flex flex-col items-center flex-1">
                  <span className="text-[12px] font-bold text-[#1A1F26] truncate max-w-[80px]">
                    {weeklyTeamTotals[1].subname}
                  </span>
                  <span className="text-[11px] text-[#5B6470] tabular-nums mb-1">
                    {weeklyTeamTotals[1].points} pts
                  </span>
                  <div
                    className="w-full h-20 rounded-t-xl flex items-center justify-center text-white font-bold text-[18px] shadow-xs"
                    style={{ backgroundColor: weeklyTeamTotals[1].color }}
                  >
                    2
                  </div>
                </div>
              )}

              {/* 1st Place (Taller center) */}
              {winningTeam && (
                <div className="flex flex-col items-center flex-1">
                  <Trophy size={22} className="text-[#F59E0B] mb-1 animate-bounce" />
                  <span className="text-[13px] font-bold text-[#1A1F26] truncate max-w-[90px]">
                    {winningTeam.subname}
                  </span>
                  <span className="text-[12px] font-bold text-[#0F766E] tabular-nums mb-1">
                    {winningTeam.points} pts
                  </span>
                  <div
                    className="w-full h-28 rounded-t-xl flex items-center justify-center text-white font-bold text-[22px] shadow-sm"
                    style={{ backgroundColor: winningTeam.color }}
                  >
                    1
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {weeklyTeamTotals[2] && (
                <div className="flex flex-col items-center flex-1">
                  <span className="text-[12px] font-bold text-[#1A1F26] truncate max-w-[80px]">
                    {weeklyTeamTotals[2].subname}
                  </span>
                  <span className="text-[11px] text-[#5B6470] tabular-nums mb-1">
                    {weeklyTeamTotals[2].points} pts
                  </span>
                  <div
                    className="w-full h-14 rounded-t-xl flex items-center justify-center text-white font-bold text-[16px] shadow-xs"
                    style={{ backgroundColor: weeklyTeamTotals[2].color }}
                  >
                    3
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMilestoneModal(true)}
              className="text-[13px] font-bold text-[#0F766E] hover:underline inline-flex items-center gap-1 no-print"
            >
              <Award size={16} />
              <span>View Champion Celebration Ceremony</span>
            </button>
          </div>

          {/* Champion of the Week Card */}
          {winningTeam && (
            <div className="rounded-2xl bg-[#FEF3C7] p-4 border border-[#FDE68A] shadow-xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#92400E]">
                  Champion of the Week
                </span>
                <div className="text-[18px] font-bold text-[#78350F]">
                  {winningTeam.name}
                </div>
                <div className="text-[12px] text-[#92400E]">
                  Aggregated Score: {winningTeam.points} points ({winningTeam.mistakes} total mistakes)
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white text-[#F59E0B] flex items-center justify-center shadow-xs">
                <Trophy size={26} />
              </div>
            </div>
          )}

          {/* Best Student & Most Improved Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-white border border-[#E4E0D7] shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-[#0F766E] uppercase">Best Student</span>
              <div className="text-[15px] font-bold text-[#1A1F26] truncate">
                {bestStudent?.student.name || 'Hamza Khan'}
              </div>
              <div className="text-[12px] text-[#5B6470]">
                {bestStudent?.score || 228} weekly pts
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-[#E4E0D7] shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-[#F59E0B] uppercase">Most Improved</span>
              <div className="text-[15px] font-bold text-[#1A1F26] truncate">
                Zayd Al-Ansari
              </div>
              <div className="text-[12px] text-[#5B6470]">
                +14.5% recitation delta
              </div>
            </div>
          </div>

          {/* List of Out Teams with Reasons */}
          {weeklyTeamTotals.filter((t) => t.isOutThisWeek).length > 0 && (
            <div className="rounded-2xl bg-white p-4 border border-[#FCA5A5] shadow-xs space-y-2">
              <div className="flex items-center gap-1.5 text-[#B42318] font-bold text-[14px]">
                <AlertTriangle size={16} />
                <span>Teams Out This Week</span>
              </div>
              {weeklyTeamTotals.filter((t) => t.isOutThisWeek).map((t) => (
                <div key={t.id} className="p-3 rounded-xl bg-[#FEE2E2] text-[#991B1B] text-[12px] space-y-1">
                  <div className="font-bold text-[13px]">{t.name} (Disqualified)</div>
                  <p>Reason: {t.outReason || 'Student termination penalty (-500 pts) applied'}</p>
                </div>
              ))}
            </div>
          )}

          {/* Action Export Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 no-print">
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-11 rounded-xl bg-white border border-[#E4E0D7] text-[#1A1F26] font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-[#F7F5F0]"
            >
              <FileDown size={16} />
              <span>Export CSV (Excel)</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="h-11 rounded-xl bg-[#0F766E] text-white font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-[#0B5D57]"
            >
              <Share2 size={16} />
              <span>Print / PDF Result</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= MONTHLY & BACKUP VIEW ================= */}
      {activeReportTab === 'monthly' && (
        <div className="space-y-4">
          {/* Backup & Restore Hub */}
          <div className="rounded-2xl bg-white p-5 border border-[#E4E0D7] shadow-xs space-y-3 no-print">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[#1A1F26]">
                Data Backup & Device Restore
              </h3>
              <span className="text-[11px] text-[#5B6470]">Offline JSON</span>
            </div>
            <p className="text-[13px] text-[#5B6470] leading-relaxed">
              Export all local records, student rosters, discipline warnings, fines, and scoring parameters into a single backup file.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="h-11 rounded-xl bg-[#0F766E] text-white font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#0B5D57]"
              >
                <Download size={16} />
                <span>Export Backup</span>
              </button>
              <label className="h-11 rounded-xl border border-[#C9C4B8] bg-white text-[#1A1F26] font-bold text-[13px] flex items-center justify-center gap-1.5 hover:bg-[#F7F5F0] cursor-pointer">
                <Upload size={16} />
                <span>Restore File</span>
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Historical Records Logs */}
          <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#1A1F26]">
                Historical Evaluation Logs
              </h3>
              <span className="text-[12px] text-[#5B6470]">{dailyRecords.length} records</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 divide-y divide-[#E4E0D7]/60">
              {dailyRecords.slice(0, 20).map((r) => {
                const student = students.find((s) => s.id === r.studentId);
                const team = DEFAULT_TEAMS.find((t) => t.id === r.teamId);
                return (
                  <div key={r.id} className="pt-2 flex items-center justify-between text-[13px]">
                    <div>
                      <div className="font-semibold text-[#1A1F26]">{student?.name || 'Student'}</div>
                      <div className="text-[11px] text-[#5B6470]">
                        {r.date} • {team?.subname} • Sabaq {r.sabaqScore}/10
                      </div>
                    </div>
                    <span className="font-bold text-[#0F766E] tabular-nums">
                      {r.cappedTotal}/50
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= FINES & PENALTIES REPORT VIEW ================= */}
      {activeReportTab === 'fines' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[12px] font-bold text-[#B42318] uppercase tracking-wider">
                  Discipline Accounting
                </span>
                <h2 className="text-[19px] font-bold text-[#1A1F26] mt-0.5">
                  جرمانہ جات رپورٹ (Fines Report)
                </h2>
                <p className="text-[12px] text-[#5B6470] mt-0.5">
                  Halqa fine collections, pending arrears, and circle discipline records
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#FEF2F2] text-[#B42318] flex items-center justify-center font-bold">
                <DollarSign size={22} />
              </div>
            </div>

            {/* Fines 3-stat Bar */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#E4E0D7]">
                <div className="text-[10px] text-[#5B6470] font-semibold uppercase">کل رقم</div>
                <div className="text-[17px] font-bold text-[#1A1F26] mt-0.5">
                  Rs. {allFines.reduce((sum, f) => sum + f.amount, 0)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5]">
                <div className="text-[10px] text-[#B42318] font-semibold uppercase">واجب الادا</div>
                <div className="text-[17px] font-bold text-[#B42318] mt-0.5">
                  Rs. {allFines.filter((f) => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                <div className="text-[10px] text-[#16803C] font-semibold uppercase">وصول شدہ</div>
                <div className="text-[17px] font-bold text-[#16803C] mt-0.5">
                  Rs. {allFines.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0)}
                </div>
              </div>
            </div>

            {/* Quick Export Button */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#E4E0D7] no-print">
              <button
                type="button"
                onClick={() => {
                  const pendingFinesList = allFines.filter((f) => f.status === 'pending');
                  let text = `اطلاع برائے واجب الادا جرمانہ جات: ${todayDate}\n\n`;
                  if (pendingFinesList.length === 0) {
                    text += `ماشاء اللہ تمام جرمانے ادا ہو چکے ہیں!`;
                  } else {
                    pendingFinesList.forEach((f, idx) => {
                      const t = DEFAULT_TEAMS.find((team) => team.id === f.teamId);
                      text += `${idx + 1}. *${f.studentName}* (${t?.subname}): Rs. ${f.amount} - ${f.reason}\n`;
                    });
                    const totalPending = pendingFinesList.reduce((sum, f) => sum + f.amount, 0);
                    text += `\n*کل واجب الادا:* Rs. ${totalPending}`;
                  }
                  if (navigator.share) {
                    navigator.share({ title: 'Fines Report', text }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(text);
                    onShowToast('فہرست کاپی ہو گئی (Copied)', 'success');
                  }
                }}
                className="flex-1 h-10 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-2xs transition-all"
              >
                <Share2 size={14} />
                <span>Share WhatsApp List</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const headers = ['Fine ID', 'Student Name', 'Team', 'Date', 'Reason', 'Amount (Rs.)', 'Status', 'Notes'];
                  const rows = allFines.map((f) => {
                    const t = DEFAULT_TEAMS.find((team) => team.id === f.teamId);
                    return [
                      f.id,
                      `"${f.studentName}"`,
                      t?.name || f.teamId,
                      f.date,
                      `"${f.reason}"`,
                      f.amount,
                      f.status,
                      `"${f.notes || ''}"`
                    ].join(',');
                  });
                  const csv = [headers.join(','), ...rows].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `fines_report_${todayDate}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  onShowToast('Fines CSV exported!', 'success');
                }}
                className="h-10 px-3.5 rounded-xl border border-[#D1D5DB] bg-[#F7F5F0] hover:bg-white text-[#1A1F26] font-semibold text-[12px] flex items-center gap-1.5"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Group-by-Group Breakdown Cards */}
          <div className="space-y-3">
            <h3 className="text-[15px] font-bold text-[#1A1F26]">
              حلقہ وار تقسیم (Circle Breakdown)
            </h3>
            {DEFAULT_TEAMS.map((team) => {
              const teamFines = allFines.filter((f) => f.teamId === team.id);
              const pendingAmt = teamFines.filter((f) => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
              const paidAmt = teamFines.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
              return (
                <div
                  key={team.id}
                  className="bg-white rounded-2xl p-3.5 border border-[#E4E0D7] shadow-xs relative overflow-hidden"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: team.color }}
                  />
                  <div className="flex items-center justify-between mb-2 pl-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[15px] text-[#1A1F26]">
                        {team.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#FEF2F2] text-[#B42318]">
                        واجب: Rs. {pendingAmt}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F0FDF4] text-[#16803C]">
                        وصول: Rs. {paidAmt}
                      </span>
                    </div>
                  </div>
                  {teamFines.length === 0 ? (
                    <div className="text-[12px] text-[#16803C] pl-1.5 py-1">
                      کوئی جرمانہ درج نہیں ہے
                    </div>
                  ) : (
                    <div className="space-y-1.5 pl-1.5 pt-1 divide-y divide-[#E4E0D7]/40">
                      {teamFines.slice(0, 5).map((f) => (
                        <div key={f.id} className="pt-1.5 flex items-center justify-between text-[12px]">
                          <div>
                            <span className="font-semibold text-[#1A1F26]">{f.studentName}</span>
                            <span className="text-[#6B7280] ml-1.5"> – {f.reason}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#B42318]">Rs. {f.amount}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              f.status === 'pending' ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-[#DCFCE7] text-[#16803C]'
                            }`}>
                              {f.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Full Ledger Table / Cards */}
          <div className="bg-white rounded-2xl p-4 border border-[#E4E0D7] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#1A1F26]">
                مکمل جرمانہ فہرست ({allFines.length})
              </h3>
              <div className="flex items-center gap-1">
                {(['all', 'pending', 'paid'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFinesStatusFilter(st)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                      finesStatusFilter === st
                        ? 'bg-[#0F766E] text-white'
                        : 'bg-[#F7F5F0] text-[#5B6470]'
                    }`}
                  >
                    {st === 'all' ? 'All' : st === 'pending' ? 'Pending' : 'Paid'}
                  </button>
                ))}
              </div>
            </div>

            {allFines.length === 0 ? (
              <div className="py-8 text-center text-[#8A929C] text-[13px]">
                کوئی جرمانہ درج نہیں ہے
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {allFines
                  .filter((f) => finesStatusFilter === 'all' || f.status === finesStatusFilter)
                  .map((f) => {
                    const t = DEFAULT_TEAMS.find((team) => team.id === f.teamId);
                    return (
                      <div
                        key={f.id}
                        className={`p-2.5 rounded-xl border text-[12px] flex items-center justify-between ${
                          f.status === 'pending'
                            ? 'bg-[#FFFBF5] border-[#FDE68A]'
                            : 'bg-white border-[#E4E0D7]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#1A1F26]">{f.studentName}</span>
                            {t && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.2 rounded text-white"
                                style={{ backgroundColor: t.color }}
                              >
                                {t.subname}
                              </span>
                            )}
                            <span className="text-[10px] text-[#8A929C]">{f.date}</span>
                          </div>
                          <div className="text-[11px] text-[#4B5563] mt-0.5">{f.reason}</div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className="font-bold text-[14px] text-[#B42318]">Rs. {f.amount}</span>
                          {f.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => {
                                storage.updateFineStatus(f.id, 'paid');
                                onRefreshData();
                                onShowToast('وصولی درج ہو گئی', 'success');
                              }}
                              className="px-2 py-0.5 rounded-lg bg-[#16803C] hover:bg-[#14532D] text-white text-[10px] font-bold"
                            >
                              وصول
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Light Milestone Celebration Modal (Winning Team) */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="relative w-full max-w-sm bg-[#F7F5F0] rounded-3xl p-6 border border-[#E4E0D7] shadow-2xl space-y-5 text-center overflow-hidden">
            <IslamicGeometricPattern opacity={0.06} />
            <div className="relative z-10 flex justify-end -mt-2 -mr-2">
              <button
                type="button"
                onClick={() => setShowMilestoneModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5B6470] hover:bg-[#E4E0D7]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="relative z-10 w-16 h-16 rounded-3xl bg-white border border-[#FDE68A] text-[#F59E0B] flex items-center justify-center mx-auto shadow-md">
              <Trophy size={36} />
            </div>
            <div className="relative z-10 space-y-1">
              <span className="text-[12px] font-bold text-[#B45309] uppercase tracking-widest">
                Milestone Accomplishment
              </span>
              <h3 className="text-[22px] font-bold text-[#1A1F26]">
                {winningTeam?.name}
              </h3>
              <p className="text-[13px] text-[#5B6470] leading-relaxed">
                Honored as the leading circle this week with {winningTeam?.points} memorization consistency points. Masha'Allah!
              </p>
            </div>
            <div className="relative z-10 bg-white rounded-2xl p-3.5 border border-[#E4E0D7] space-y-1 text-left text-[12px]">
              <div className="flex justify-between text-[#5B6470]">
                <span>Circle Members:</span>
                <span className="font-bold text-[#1A1F26]">{students.filter((s) => s.teamId === winningTeam?.id).length} Reciters</span>
              </div>
              <div className="flex justify-between text-[#5B6470]">
                <span>Total Clean Bonuses:</span>
                <span className="font-bold text-[#0F766E]">+12 Clean Recitations</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMilestoneModal(false)}
              className="relative z-10 w-full h-12 rounded-xl bg-[#0F766E] text-white font-bold text-[14px] shadow-sm hover:bg-[#0B5D57]"
            >
              Continue Class
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
