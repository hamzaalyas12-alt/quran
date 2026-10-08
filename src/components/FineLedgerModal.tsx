import React, { useState, useMemo } from 'react';
import { FineRecord, Student } from '../types';
import { DEFAULT_TEAMS } from '../scoring/scoringConfig';
import { storage } from '../data/storage';
import {
  X,
  DollarSign,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Plus
} from 'lucide-react';

interface FineLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamFilter?: string | null;
  studentFilter?: Student | null;
  onOpenIssueModal: (student?: Student, teamId?: string) => void;
  onRefreshData: () => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const FineLedgerModal: React.FC<FineLedgerModalProps> = ({
  isOpen,
  onClose,
  teamFilter,
  studentFilter,
  onOpenIssueModal,
  onRefreshData,
  onShowToast
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'waived'>('all');

  const allFines = useMemo(() => {
    return storage.getFines();
  }, [isOpen]);

  const filteredFines = useMemo(() => {
    let list = allFines;
    if (studentFilter) {
      list = list.filter((f) => f.studentId === studentFilter.id);
    } else if (teamFilter) {
      list = list.filter((f) => f.teamId === teamFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((f) => f.status === statusFilter);
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [allFines, studentFilter, teamFilter, statusFilter]);

  // Aggregate stats
  const totalAmount = useMemo(() => {
    let list = allFines;
    if (studentFilter) list = list.filter((f) => f.studentId === studentFilter.id);
    else if (teamFilter) list = list.filter((f) => f.teamId === teamFilter);
    return list.reduce((sum, f) => sum + f.amount, 0);
  }, [allFines, studentFilter, teamFilter]);

  const pendingAmount = useMemo(() => {
    let list = allFines;
    if (studentFilter) list = list.filter((f) => f.studentId === studentFilter.id);
    else if (teamFilter) list = list.filter((f) => f.teamId === teamFilter);
    return list.filter((f) => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
  }, [allFines, studentFilter, teamFilter]);

  const paidAmount = useMemo(() => {
    let list = allFines;
    if (studentFilter) list = list.filter((f) => f.studentId === studentFilter.id);
    else if (teamFilter) list = list.filter((f) => f.teamId === teamFilter);
    return list.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
  }, [allFines, studentFilter, teamFilter]);

  if (!isOpen) return null;

  const currentTeam = teamFilter ? DEFAULT_TEAMS.find((t) => t.id === teamFilter) : null;

  const handleMarkPaid = (id: string) => {
    storage.updateFineStatus(id, 'paid');
    onRefreshData();
    onShowToast('جرمانہ وصولی درج ہو گئی (Marked as Paid)', 'success');
  };

  const handleWaive = (id: string) => {
    storage.updateFineStatus(id, 'waived');
    onRefreshData();
    onShowToast('جرمانہ معاف کر دیا گیا (Fine Waived)', 'info');
  };

  const handleDelete = (id: string) => {
    storage.deleteFine(id);
    onRefreshData();
    onShowToast('جرمانہ ریکارڈ خارج کر دیا گیا', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs select-none no-print">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E4E0D7] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#1F2A37] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#F59E0B]">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="font-bold text-[16px] leading-tight">
                {studentFilter
                  ? `${studentFilter.name} کے جرمانے`
                  : currentTeam
                  ? `${currentTeam.subname} حلقہ جرمانہ رجسٹر`
                  : 'حلقہ جات جرمانہ رجسٹر'}
              </h3>
              <p className="text-[11px] text-gray-300">
                Fines & Disciplinary Penalties Ledger
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

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-[#F7F5F0] border-b border-[#E4E0D7]">
          <div className="bg-white p-2.5 rounded-xl border border-[#E4E0D7] text-center shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5B6470]">
              کل جرمانے (Total)
            </div>
            <div className="text-[16px] font-bold text-[#1A1F26]">
              Rs. {totalAmount}
            </div>
          </div>
          <div className="bg-[#FEF2F2] p-2.5 rounded-xl border border-[#FCA5A5] text-center shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#B42318]">
              واجب الادا (Pending)
            </div>
            <div className="text-[16px] font-bold text-[#B42318]">
              Rs. {pendingAmount}
            </div>
          </div>
          <div className="bg-[#F0FDF4] p-2.5 rounded-xl border border-[#BBF7D0] text-center shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#16803C]">
              وصول شدہ (Paid)
            </div>
            <div className="text-[16px] font-bold text-[#16803C]">
              Rs. {paidAmount}
            </div>
          </div>
        </div>

        {/* Filters and Add Button */}
        <div className="p-3 border-b border-[#E4E0D7] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(['all', 'pending', 'paid', 'waived'] as const).map((st) => {
              const label =
                st === 'all'
                  ? 'تمام (All)'
                  : st === 'pending'
                  ? 'واجب (Pending)'
                  : st === 'paid'
                  ? 'وصول (Paid)'
                  : 'معاف (Waived)';
              const isSelected = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#0F766E] text-white shadow-xs'
                      : 'bg-[#F7F5F0] text-[#5B6470] hover:text-[#1A1F26]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenIssueModal(studentFilter || undefined, teamFilter || undefined);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#B42318] hover:bg-[#991B1B] text-white font-bold text-[12px] flex items-center gap-1 shadow-xs flex-shrink-0"
          >
            <Plus size={14} />
            <span>نیا جرمانہ (Issue)</span>
          </button>
        </div>

        {/* List of Fines */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredFines.length === 0 ? (
            <div className="py-12 text-center text-[#8A929C] space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#F7F5F0] flex items-center justify-center mx-auto text-[#0F766E]">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-[14px] font-medium text-[#5B6470]">
                کوئی جرمانہ درج نہیں ہے (No fines on record)
              </p>
              <p className="text-[12px]">
                ماشاء اللہ تمام طلباء نظم و ضبط پر عمل پیرا ہیں۔
              </p>
            </div>
          ) : (
            filteredFines.map((fine) => {
              const fTeam = DEFAULT_TEAMS.find((t) => t.id === fine.teamId);
              return (
                <div
                  key={fine.id}
                  className={`p-3 rounded-xl border transition-all ${
                    fine.status === 'pending'
                      ? 'bg-[#FFFBF5] border-[#FDE68A]'
                      : fine.status === 'paid'
                      ? 'bg-[#F9FCF9] border-[#BBF7D0]'
                      : 'bg-[#F9FAFB] border-[#E5E7EB] opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[14px] text-[#1A1F26]">
                          {fine.studentName}
                        </span>
                        {fTeam && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: fTeam.color }}
                          >
                            {fTeam.subname}
                          </span>
                        )}
                        <span className="text-[11px] text-[#8A929C]">
                          {fine.date}
                        </span>
                      </div>
                      <div className="text-[13px] font-medium text-[#4B5563] mt-0.5">
                        {fine.reason}
                      </div>
                      {fine.notes && (
                        <div className="text-[11px] text-[#6B7280] italic mt-0.5">
                          نوٹ: {fine.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[15px] font-bold text-[#B42318]">
                        Rs. {fine.amount}
                      </div>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                          fine.status === 'pending'
                            ? 'bg-[#FEF3C7] text-[#B45309]'
                            : fine.status === 'paid'
                            ? 'bg-[#DCFCE7] text-[#16803C]'
                            : 'bg-[#F3F4F6] text-[#6B7280]'
                        }`}
                      >
                        {fine.status === 'pending'
                          ? 'واجب (Unpaid)'
                          : fine.status === 'paid'
                          ? 'وصول (Paid)'
                          : 'معاف (Waived)'}
                      </span>
                    </div>
                  </div>
                  {/* Actions for this fine */}
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                    {fine.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(fine.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#16803C] hover:bg-[#14532D] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                        >
                          <CheckCircle2 size={12} />
                          <span>وصول درج کریں (Mark Paid)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWaive(fine.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#374151] text-[11px] font-semibold flex items-center gap-1"
                        >
                          <RotateCcw size={12} />
                          <span>معاف (Waive)</span>
                        </button>
                      </>
                    )}
                    {fine.status === 'paid' && (
                      <span className="text-[11px] text-[#16803C] font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>وصول شدہ</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(fine.id)}
                      className="p-1 rounded-lg text-gray-400 hover:text-[#B42318] hover:bg-red-50 transition-colors ml-1"
                      title="حذف کریں (Delete)"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#F7F5F0] border-t border-[#E4E0D7] flex items-center justify-between">
          <span className="text-[12px] text-[#5B6470]">
            کل اندراجات: {filteredFines.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-[#D1D5DB] bg-white text-[#1A1F26] text-[13px] font-semibold hover:bg-gray-50"
          >
            بند کریں (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
