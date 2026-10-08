import React, { useState, useEffect } from 'react';
import { FineRecord, Student } from '../types';
import { DEFAULT_TEAMS } from '../scoring/scoringConfig';
import { storage } from '../data/storage';
import { playFeedbackSound } from '../utils/audioFeedback';
import { X, DollarSign, AlertCircle, CheckCircle, Tag, Calendar, User, ShieldAlert } from 'lucide-react';

interface FineModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  preSelectedStudent?: Student | null;
  preSelectedTeamId?: string | null;
  todayDate: string;
  soundEnabled?: boolean;
  onFineIssued: (fine: FineRecord) => void;
}

const COMMON_FINE_AMOUNTS = [20, 50, 100, 200];
const COMMON_REASONS = [
  { ur: 'دیر سے آمد', en: 'Late Arrival' },
  { ur: 'ناقص سبق یا عدم تیاری', en: 'Incomplete Sabaq' },
  { ur: 'بغیر اطلاع غیر حاضری', en: 'Absence without Notice' },
  { ur: 'حلقے میں شور و خلل', en: 'Classroom Disturbance' },
  { ur: 'سبقی / منزل کی کمزوری', en: 'Weak Sabqi / Manzil' },
  { ur: 'یونیفارم یا آداب کی کمی', en: 'Uniform / Etiquette Issue' }
];

export const FineModal: React.FC<FineModalProps> = ({
  isOpen,
  onClose,
  students,
  preSelectedStudent,
  preSelectedTeamId,
  todayDate,
  soundEnabled = true,
  onFineIssued
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustomAmount, setIsCustomAmount] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('دیر سے آمد (Late Arrival)');
  const [customReason, setCustomReason] = useState<string>('');
  const [date, setDate] = useState<string>(todayDate);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const filteredStudents = React.useMemo(() => {
    let list = students.filter((s) => s.active);
    if (preSelectedTeamId) {
      list = list.filter((s) => s.teamId === preSelectedTeamId);
    }
    return list;
  }, [students, preSelectedTeamId]);

  useEffect(() => {
    if (isOpen) {
      if (preSelectedStudent) {
        setSelectedStudentId(preSelectedStudent.id);
      } else if (filteredStudents.length > 0) {
        setSelectedStudentId(filteredStudents[0].id);
      }
      setAmount(50);
      setIsCustomAmount(false);
      setCustomAmount('');
      setReason('دیر سے آمد (Late Arrival)');
      setCustomReason('');
      setDate(todayDate);
      setNotes('');
      setErrorMsg('');
    }
  }, [isOpen, preSelectedStudent, filteredStudents, todayDate]);

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === selectedStudentId);
  const currentTeam = DEFAULT_TEAMS.find((t) => t.id === currentStudent?.teamId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedStudentId) {
      setErrorMsg('Please select a student');
      return;
    }

    const finalAmount = isCustomAmount ? parseInt(customAmount, 10) : amount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setErrorMsg('Please enter a valid fine amount greater than 0');
      return;
    }

    const finalReason = customReason.trim() ? customReason.trim() : reason;
    if (!finalReason) {
      setErrorMsg('Please specify a reason for the fine');
      return;
    }

    if (!currentStudent) {
      setErrorMsg('Selected student not found');
      return;
    }

    const newFine: FineRecord = {
      id: `fine_${currentStudent.id}_${Date.now()}`,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      teamId: currentStudent.teamId,
      date,
      amount: finalAmount,
      currency: 'Rs.',
      reason: finalReason,
      status: 'pending',
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    storage.addFine(newFine);
    playFeedbackSound('fine', soundEnabled);
    onFineIssued(newFine);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none no-print">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E4E0D7] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#B42318] to-[#991B1B] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[16px] leading-tight">
                جرمانہ عائد کریں (Issue Fine)
              </h3>
              <p className="text-[11px] text-white/80">
                Disciplinary Penalty Record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FEE2E2] text-[#B42318] text-[13px] font-medium flex items-center gap-2 border border-[#FCA5A5]">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Student Picker */}
          <div>
            <label className="block text-[12px] font-semibold text-[#1A1F26] mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-[#0F766E]" />
                طالب علم منتخب کریں (Select Student)
              </span>
              {currentTeam && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: currentTeam.color }}
                >
                  {currentTeam.subname} ({currentTeam.name})
                </span>
              )}
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] text-[#1A1F26] font-medium focus:bg-white focus:border-[#0F766E] focus:outline-hidden"
            >
              {filteredStudents.map((s) => {
                const sTeam = DEFAULT_TEAMS.find((t) => t.id === s.teamId);
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} - {sTeam?.subname || s.teamId}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Amount Presets & Custom */}
          <div>
            <label className="block text-[12px] font-semibold text-[#1A1F26] mb-1.5 flex items-center gap-1.5">
              <DollarSign size={14} className="text-[#B42318]" />
              جرمانہ رقم (Fine Amount)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {COMMON_FINE_AMOUNTS.map((amt) => {
                const isSelected = !isCustomAmount && amount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setAmount(amt);
                      setIsCustomAmount(false);
                    }}
                    className={`py-2 rounded-xl text-[13px] font-bold border transition-all ${
                      isSelected
                        ? 'bg-[#B42318] text-white border-[#B42318] shadow-xs scale-102'
                        : 'bg-[#F7F5F0] text-[#1A1F26] border-[#E4E0D7] hover:bg-[#EAE7DF]'
                    }`}
                  >
                    Rs. {amt}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustomAmount(true)}
                className={`px-3 py-2 rounded-xl text-[12px] font-semibold border transition-all ${
                  isCustomAmount
                    ? 'bg-[#B42318] text-white border-[#B42318]'
                    : 'bg-[#F7F5F0] text-[#5B6470] border-[#E4E0D7] hover:bg-[#EAE7DF]'
                }`}
              >
                دیگر رقم (Custom)
              </button>
              {isCustomAmount && (
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-2.5 text-[13px] font-bold text-[#5B6470]">Rs.</span>
                  <input
                    type="number"
                    min="1"
                    step="5"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full h-10 pl-10 pr-3 rounded-xl border border-[#E4E0D7] bg-white text-[14px] font-bold text-[#1A1F26] focus:border-[#B42318] focus:outline-hidden"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {/* Reason Presets */}
          <div>
            <label className="block text-[12px] font-semibold text-[#1A1F26] mb-1.5 flex items-center gap-1.5">
              <Tag size={14} className="text-[#0F766E]" />
              جرمانے کی وجہ (Reason / Cause)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_REASONS.map((r) => {
                const val = `${r.ur} (${r.en})`;
                const isSelected = reason === val && !customReason;
                return (
                  <button
                    key={r.en}
                    type="button"
                    onClick={() => {
                      setReason(val);
                      setCustomReason('');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all text-left ${
                      isSelected
                        ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-xs'
                        : 'bg-[#F7F5F0] text-[#1A1F26] border-[#E4E0D7] hover:bg-[#EAE7DF]'
                    }`}
                  >
                    <span>{r.ur}</span>
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="دیگر وجہ لکھیں (Optional custom reason)"
              className="w-full h-10 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[13px] text-[#1A1F26] focus:bg-white focus:border-[#0F766E] focus:outline-hidden"
            />
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-[12px] font-semibold text-[#1A1F26] mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-[#5B6470]" />
              تاریخ (Date)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[13px] text-[#1A1F26] focus:bg-white focus:border-[#0F766E] focus:outline-hidden"
            />
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-[12px] font-semibold text-[#1A1F26] mb-1">
              اضافی وضاحت (Optional Notes)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="وضاحتی ریمارکس درج کریں..."
              className="w-full p-2.5 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[13px] text-[#1A1F26] focus:bg-white focus:border-[#0F766E] focus:outline-hidden resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-[#D1D5DB] text-[#5B6470] font-semibold text-[14px] hover:bg-[#F3F4F6] transition-all"
            >
              منسوخ (Cancel)
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-[#B42318] hover:bg-[#991B1B] active:scale-[0.99] text-white font-bold text-[14px] shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle size={16} />
              <span>لاگو کریں (Apply)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
