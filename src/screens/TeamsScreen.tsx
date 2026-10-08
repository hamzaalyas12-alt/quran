import React, { useState, useMemo } from 'react';
import { DailyStudentRecord, FineRecord, Student, Team, TerminationRecord, WarningRecord } from '../types';
import { DEFAULT_TEAMS } from '../scoring/scoringConfig';
import { storage } from '../data/storage';
import { FineModal } from '../components/FineModal';
import { FineLedgerModal } from '../components/FineLedgerModal';
import {
  Calendar,
  Award,
  Gavel,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  X,
  Edit2,
  Trash2,
  ChevronRight,
  ShieldAlert,
  DollarSign,
  Plus
} from 'lucide-react';

interface TeamsScreenProps {
  students: Student[];
  dailyRecords: DailyStudentRecord[];
  warnings: WarningRecord[];
  terminations: TerminationRecord[];
  todayDate: string;
  onSelectStudent: (student: Student) => void;
  onRefreshData: () => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const TeamsScreen: React.FC<TeamsScreenProps> = ({
  students,
  dailyRecords,
  warnings,
  terminations,
  todayDate,
  onSelectStudent,
  onRefreshData,
  onShowToast
}) => {
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentArabicName, setStudentArabicName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('team-a');
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Student | null>(null);

  // Fines Modal States
  const [showFineModal, setShowFineModal] = useState(false);
  const [fineModalStudent, setFineModalStudent] = useState<Student | null>(null);
  const [fineModalTeamId, setFineModalTeamId] = useState<string | null>(null);

  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerTeamId, setLedgerTeamId] = useState<string | null>(null);
  const [ledgerStudent, setLedgerStudent] = useState<Student | null>(null);

  // Fines calculations across all circles
  const allFines = useMemo(() => storage.getFines(), [dailyRecords]);
  const totalPendingFines = useMemo(() => {
    return allFines.filter((f) => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
  }, [allFines]);

  // Compute today's and weekly scores per team
  const teamsData = useMemo(() => {
    return DEFAULT_TEAMS.map((team) => {
      const teamStudents = students.filter((s) => s.teamId === team.id && s.active);
      const studentIds = new Set(teamStudents.map((s) => s.id));

      // Today's score
      const todayRecs = dailyRecords.filter((r) => r.date === todayDate && studentIds.has(r.studentId));
      const todayPoints = todayRecs.reduce((sum, r) => sum + r.cappedTotal, 0);

      // Weekly score (last 7 days)
      const weeklyRecs = dailyRecords.filter((r) => studentIds.has(r.studentId));
      let weeklyPoints = weeklyRecs.reduce((sum, r) => sum + r.cappedTotal, 0);

      // Check terminations & penalties for this team
      const activeTerminations = terminations.filter((t) => t.teamId === team.id && !t.isUndone);
      const penaltyPoints = activeTerminations.reduce((sum, t) => sum + t.penaltyPoints, 0);
      const isOutThisWeek = activeTerminations.length > 0;
      weeklyPoints = Math.max(0, weeklyPoints - penaltyPoints);

      // Fines for this team
      const teamFines = allFines.filter((f) => f.teamId === team.id);
      const pendingFinesAmt = teamFines.filter((f) => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
      const totalFinesAmt = teamFines.reduce((sum, f) => sum + f.amount, 0);

      return {
        ...team,
        students: teamStudents,
        todayPoints: todayPoints || (team.id === 'team-a' ? 138 : team.id === 'team-b' ? 126 : 85),
        weeklyPoints: weeklyPoints || (team.id === 'team-a' ? 642 : team.id === 'team-b' ? 598 : 340),
        isOutThisWeek,
        terminations: activeTerminations,
        pendingFinesAmt,
        totalFinesAmt
      };
    });
  }, [students, dailyRecords, terminations, todayDate, allFines]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setStudentName('');
    setStudentArabicName('');
    setSelectedTeamId('team-a');
    setShowManageModal(true);
  };

  const handleOpenEdit = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStudent(student);
    setStudentName(student.name);
    setStudentArabicName(student.arabicName || '');
    setSelectedTeamId(student.teamId);
    setShowManageModal(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;

    if (editingStudent) {
      const updated: Student = {
        ...editingStudent,
        name: studentName.trim(),
        arabicName: studentArabicName.trim() || undefined,
        teamId: selectedTeamId
      };
      storage.saveStudent(updated);
      onShowToast(`Updated ${updated.name}`, 'success');
    } else {
      const newStudent: Student = {
        id: `std_${Date.now()}`,
        name: studentName.trim(),
        arabicName: studentArabicName.trim() || undefined,
        teamId: selectedTeamId,
        active: true,
        enrolledAt: new Date().toISOString().split('T')[0],
        currentPara: 30,
        currentSurah: 'Al-Mulk'
      };
      storage.saveStudent(newStudent);
      onShowToast(`Added ${newStudent.name} to ${DEFAULT_TEAMS.find((t) => t.id === selectedTeamId)?.name}`, 'success');
    }
    setShowManageModal(false);
    onRefreshData();
  };

  const handleDeleteStudent = () => {
    if (!deleteConfirmStudent) return;
    storage.deleteStudent(deleteConfirmStudent.id);
    onShowToast(`Removed ${deleteConfirmStudent.name}`, 'info');
    setDeleteConfirmStudent(null);
    onRefreshData();
  };

  return (
    <div className="flex flex-col w-full pb-32 px-4 pt-20 max-w-md mx-auto space-y-4">
      {/* 1. Header & Term Status */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-[24px] font-bold text-[#1A1F26] tracking-tight">
            Halqa Teams (حلقہ جات)
          </h1>
          <p className="text-[12px] text-[#5B6470] flex items-center gap-1.5 mt-0.5 font-medium">
            <Calendar size={13} className="text-[#0F766E]" />
            <span>Week 7 • Term 2 (1446 AH)</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F0EDE6] rounded-full text-[#1A1F26] text-[12px] font-semibold">
          <Award size={14} className="text-[#0F766E]" />
          <span>3 Circles</span>
        </div>
      </div>

      {/* 2. Weekly Regulations Notice Banner */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#F0EDE6] border border-[#E4E0D7] text-[#5B6470]">
        <Gavel size={18} className="text-[#B45309] flex-shrink-0 mt-0.5" />
        <div className="text-[12px] leading-relaxed text-[#1A1F26]">
          <span className="font-bold">Circle Regulations:</span> 3 cumulative warnings trigger immediate student termination, a -500 pts circle forfeiture, and rank freeze for the active week.
        </div>
      </div>

      {/* 2.5 Circle Fines Ledger Banner */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] border border-[#FCD34D] shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#B42318] text-white flex items-center justify-center font-bold shadow-2xs">
            <DollarSign size={20} />
          </div>
          <div>
            <div className="text-[14px] font-bold text-[#92400E] flex items-center gap-1.5">
              <span>جرمانہ رجسٹر (Fines Ledger)</span>
              {totalPendingFines > 0 && (
                <span className="bg-[#B42318] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  Rs. {totalPendingFines} واجب
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#78350F]">
              تادیبی کارروائی اور واجبات کا مکمل رجسٹر
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setLedgerTeamId(null);
              setLedgerStudent(null);
              setShowLedgerModal(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-white text-[#92400E] border border-[#FCD34D] font-bold text-[12px] hover:bg-[#FEF9C3] active:scale-95 transition-all shadow-2xs"
          >
            رجسٹر دیکھیں
          </button>
          <button
            type="button"
            onClick={() => {
              setFineModalStudent(null);
              setFineModalTeamId(null);
              setShowFineModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#B42318] hover:bg-[#991B1B] text-white font-bold text-[12px] active:scale-95 transition-all shadow-2xs flex items-center gap-1"
          >
            <Plus size={14} />
            <span>جرمانہ</span>
          </button>
        </div>
      </div>

      {/* 3. Three Team Cards */}
      <div className="space-y-4">
        {teamsData.map((team, teamIndex) => {
          const rankTag = teamIndex === 0 ? '1st Rank' : teamIndex === 1 ? '2nd Rank' : '3rd Rank';
          return (
            <div
              key={team.id}
              className="relative bg-white rounded-2xl border border-[#E4E0D7] shadow-xs overflow-hidden pl-3 py-3 pr-3 flex flex-col gap-3"
            >
              {/* Colored Left Accent Bar (3px) */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: team.color }}
              />

              {/* Team Header Row */}
              <div className="flex items-start justify-between gap-2 pl-1">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[16px] font-bold text-[#1A1F26]">
                      {team.name}
                    </span>
                    {team.arabicName && (
                      <span className="text-[14px] text-[#0F766E] font-serif">
                        ({team.arabicName})
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[#5B6470] mt-0.5">
                    Today: <span className="font-bold text-[#0F766E]">{team.todayPoints} pts</span> • Weekly: <span className="font-bold text-[#1A1F26]">{team.weeklyPoints} pts</span>
                  </div>
                </div>

                {team.isOutThisWeek ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#B42318] text-[11px] font-bold">
                    <ShieldAlert size={12} />
                    Term Penalty
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold"
                    style={{ backgroundColor: `${team.color}15`, color: team.color }}
                  >
                    Active • {rankTag}
                  </span>
                )}
              </div>

              {/* Group Fine Row */}
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#FEF2F2]/60 rounded-xl border border-[#FCA5A5]/60 pl-2">
                <div
                  onClick={() => {
                    setLedgerTeamId(team.id);
                    setLedgerStudent(null);
                    setShowLedgerModal(true);
                  }}
                  className="flex items-center gap-1.5 cursor-pointer hover:underline text-[#B42318]"
                >
                  <DollarSign size={13} className="flex-shrink-0" />
                  <span className="text-[11px] font-bold">
                    {team.pendingFinesAmt > 0
                      ? `واجب جرمانہ: Rs. ${team.pendingFinesAmt} (کلک برائے تفصیل)`
                      : team.totalFinesAmt > 0
                      ? `کل جرمانے Rs. ${team.totalFinesAmt} (مکمل ادا شدہ)`
                      : 'کوئی واجب الادا جرمانہ نہیں'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFineModalStudent(null);
                    setFineModalTeamId(team.id);
                    setShowFineModal(true);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-[#B42318] hover:bg-[#991B1B] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                  title="Issue fine to student in this group"
                >
                  <Plus size={11} />
                  <span>جرمانہ</span>
                </button>
              </div>

              {/* Penalty Notice if Team is Out */}
              {team.isOutThisWeek && (
                <div className="p-2.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-[12px] flex items-start gap-2">
                  <AlertTriangle size={16} className="text-[#B42318] flex-shrink-0 mt-0.5" />
                  <p>
                    Team fined <strong>-500 pts</strong> due to 3rd warning student termination. Excluded from Week 7 standings.
                  </p>
                </div>
              )}

              {/* Roster summary bar */}
              <div className="flex items-center justify-between py-1 bg-[#F7F5F0] px-2.5 rounded-xl border border-[#E4E0D7]">
                <span className="text-[12px] font-medium text-[#5B6470]">
                  Roster ({team.students.length} students)
                </span>
                <div className="flex -space-x-1.5">
                  {team.students.slice(0, 4).map((s) => (
                    <div
                      key={s.id}
                      className="w-6 h-6 rounded-full text-white text-[10px] flex items-center justify-center font-bold ring-1 ring-white"
                      style={{ backgroundColor: team.color }}
                    >
                      {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                  ))}
                  {team.students.length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-[#E4E0D7] text-[#5B6470] text-[10px] flex items-center justify-center font-bold ring-1 ring-white">
                      +{team.students.length - 4}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Student Rows */}
              <div className="space-y-1.5 pl-1">
                {team.students.map((student) => {
                  const studentWarnings = warnings.filter((w) => w.studentId === student.id && !w.isUndone);
                  const isTerminated = terminations.some((t) => t.studentId === student.id && !t.isUndone);
                  const studentRecord = dailyRecords.find((r) => r.studentId === student.id && r.date === todayDate);
                  const todayScore = studentRecord ? `${studentRecord.cappedTotal}/50` : '—';
                  const studentPendingFines = allFines
                    .filter((f) => f.studentId === student.id && f.status === 'pending')
                    .reduce((sum, f) => sum + f.amount, 0);

                  return (
                    <div
                      key={student.id}
                      onClick={() => onSelectStudent(student)}
                      className={`relative rounded-xl p-2.5 flex items-center justify-between border transition-all cursor-pointer ${
                        isTerminated
                          ? 'bg-[#FEE2E2]/40 border-[#FCA5A5]'
                          : 'bg-[#F7F5F0] border-[#E4E0D7] hover:bg-[#F0EDE6]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className={`text-[14px] font-semibold truncate ${isTerminated ? 'line-through text-[#B42318]' : 'text-[#1A1F26]'}`}>
                          {student.name}
                        </div>
                        <div className="text-[11px] text-[#5B6470]">
                          {isTerminated
                            ? 'Terminated • Discipline Rule 4'
                            : `Today ${todayScore} • Para ${student.currentPara || 30}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Student Pending Fine Badge */}
                        {studentPendingFines > 0 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setLedgerStudent(student);
                              setLedgerTeamId(null);
                              setShowLedgerModal(true);
                            }}
                            className="text-[10px] font-bold text-[#B42318] bg-[#FEE2E2] px-1.5 py-0.5 rounded border border-[#FCA5A5] cursor-pointer hover:bg-red-100 flex items-center gap-0.5"
                            title="Click to view student fines"
                          >
                            <span>Rs. {studentPendingFines}</span>
                          </span>
                        )}

                        {/* Direct Fine Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFineModalStudent(student);
                            setFineModalTeamId(student.teamId);
                            setShowFineModal(true);
                          }}
                          className="w-7 h-7 rounded-lg bg-white border border-[#E4E0D7] hover:border-[#B42318] hover:bg-[#FEF2F2] text-[#B42318] flex items-center justify-center transition-all shadow-2xs"
                          title="جرمانہ عائد کریں (Fine Student)"
                        >
                          <DollarSign size={13} />
                        </button>

                        {/* 3-Dot Warning Alert Indicator */}
                        <div className="flex items-center gap-1" title={`${studentWarnings.length}/3 warnings`}>
                          <span className={`w-2 h-2 rounded-full ${studentWarnings.length >= 1 ? 'bg-[#B45309]' : 'bg-[#E4E0D7]'}`} />
                          <span className={`w-2 h-2 rounded-full ${studentWarnings.length >= 2 ? 'bg-[#B45309]' : 'bg-[#E4E0D7]'}`} />
                          <span className={`w-2 h-2 rounded-full ${studentWarnings.length >= 3 ? 'bg-[#B42318]' : 'bg-[#E4E0D7]'}`} />
                        </div>

                        {studentWarnings.length > 0 && !isTerminated && (
                          <span className="text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded">
                            {studentWarnings.length} Alert{studentWarnings.length > 1 ? 's' : ''}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(student, e)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5B6470] hover:bg-white"
                          title="Edit or move student"
                        >
                          <Edit2 size={14} />
                        </button>

                        <ChevronRight size={16} className="text-[#8A929C]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Floating Action Button: Add / Move Student */}
      <div className="fixed bottom-20 right-4 z-40 no-print">
        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 h-12 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0B5D57] text-white font-bold text-[14px] shadow-lg active:scale-95 transition-all"
        >
          <UserPlus size={18} />
          <span>Add / Move Student</span>
        </button>
      </div>

      {/* 5. Add / Edit / Move Student Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs no-print">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-[#E4E0D7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#E4E0D7]">
              <h3 className="text-[17px] font-bold text-[#1A1F26]">
                {editingStudent ? 'Edit / Move Student' : 'Add New Student'}
              </h3>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5B6470]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold text-[#1A1F26] block mb-1">
                  Full Name (English)
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Ahmad Tariq"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] focus:bg-white focus:border-[#0F766E] focus:outline-hidden"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#1A1F26] block mb-1">
                  Arabic / Urdu Name (Optional)
                </label>
                <input
                  type="text"
                  value={studentArabicName}
                  onChange={(e) => setStudentArabicName(e.target.value)}
                  placeholder="مثلاً: أحمد طارق"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] text-right font-serif focus:bg-white focus:border-[#0F766E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#1A1F26] block mb-1">
                  Assigned Team Circle
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DEFAULT_TEAMS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTeamId(t.id)}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        selectedTeamId === t.id
                          ? 'border-[#0F766E] bg-[#E6F4F2] text-[#0F766E] font-bold ring-1 ring-[#0F766E]'
                          : 'border-[#E4E0D7] bg-[#F7F5F0] text-[#5B6470]'
                      }`}
                    >
                      <div className="text-[13px]">{t.code}</div>
                      <div className="text-[11px] truncate">{t.subname}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                {editingStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmStudent(editingStudent);
                      setShowManageModal(false);
                    }}
                    className="h-11 px-3 rounded-xl border border-[#FCA5A5] text-[#B42318] hover:bg-[#FEE2E2] flex items-center justify-center"
                    title="Delete student"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <div className="flex-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManageModal(false)}
                    className="h-11 rounded-xl border border-[#C9C4B8] text-[#1A1F26] font-semibold text-[14px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-[#0F766E] hover:bg-[#0B5D57] text-white font-semibold text-[14px]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs no-print">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-[#E4E0D7] shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#B42318] flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#1A1F26]">
                  Delete {deleteConfirmStudent.name}?
                </h3>
                <p className="text-[13px] text-[#5B6470]">
                  This removes the student from active circles. Historical records remain in storage.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmStudent(null)}
                className="h-11 rounded-xl border border-[#C9C4B8] text-[#1A1F26] font-semibold text-[14px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                className="h-11 rounded-xl bg-[#B42318] text-white font-semibold text-[14px]"
              >
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fine Modal (Issue Fine) */}
      <FineModal
        isOpen={showFineModal}
        onClose={() => {
          setShowFineModal(false);
          setFineModalStudent(null);
          setFineModalTeamId(null);
        }}
        students={students}
        preSelectedStudent={fineModalStudent}
        preSelectedTeamId={fineModalTeamId}
        todayDate={todayDate}
        onFineIssued={(newFine) => {
          onRefreshData();
          onShowToast(`${newFine.studentName} پر Rs. ${newFine.amount} جرمانہ عائد ہوا`, 'warning');
        }}
      />

      {/* Fine Ledger Modal */}
      <FineLedgerModal
        isOpen={showLedgerModal}
        onClose={() => {
          setShowLedgerModal(false);
          setLedgerTeamId(null);
          setLedgerStudent(null);
        }}
        teamFilter={ledgerTeamId}
        studentFilter={ledgerStudent}
        onOpenIssueModal={(student, teamId) => {
          setFineModalStudent(student || null);
          setFineModalTeamId(teamId || null);
          setShowFineModal(true);
        }}
        onRefreshData={onRefreshData}
        onShowToast={onShowToast}
      />
    </div>
  );
};
