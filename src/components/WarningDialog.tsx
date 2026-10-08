import React, { useState } from 'react';
import { Student } from '../types';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface WarningDialogProps {
  isOpen: boolean;
  student: Student | null;
  activeWarningCount: number; // 0, 1, or 2 (2 means next is 3rd!)
  onClose: () => void;
  onIssueWarning: (reason: string, isTermination: boolean) => void;
}

export const WarningDialog: React.FC<WarningDialogProps> = ({
  isOpen,
  student,
  activeWarningCount,
  onClose,
  onIssueWarning
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !student) return null;

  const isThirdWarning = activeWarningCount >= 2;

  const quickReasons = [
    'Unprepared lesson recitation',
    'Repeated late arrival to Halqa',
    'Adab & behaviour violation',
    'Absent without valid note',
    'Neglecting Manzil revision',
    'Disrupting fellow students'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = reason.trim() || 'Discipline violation';
    onIssueWarning(finalReason, isThirdWarning);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 no-print">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm bg-white rounded-2xl p-5 border border-[#E4E0D7] shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isThirdWarning ? (
              <span className="w-8 h-8 rounded-lg bg-[#FEE2E2] text-[#B42318] flex items-center justify-center">
                <ShieldAlert size={20} />
              </span>
            ) : (
              <span className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
                <AlertTriangle size={20} />
              </span>
            )}
            <h3 className="text-[17px] font-bold text-[#1A1F26]">
              {isThirdWarning ? 'Student Termination Notice' : 'Issue Discipline Warning'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5B6470] hover:bg-[#F0EDE6]"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Student Context & Warning Indicator */}
        <div className="p-3 bg-[#F7F5F0] rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[15px] font-bold text-[#1A1F26]">{student.name}</div>
            <div className="text-[12px] text-[#5B6470]">Circle Warning Alert</div>
          </div>
          <div className="flex items-center gap-1.5" title={`${activeWarningCount}/3 warnings`}>
            <span className={`w-3 h-3 rounded-full ${activeWarningCount >= 1 ? 'bg-[#B45309]' : 'bg-[#E4E0D7]'}`} />
            <span className={`w-3 h-3 rounded-full ${activeWarningCount >= 2 ? 'bg-[#B45309]' : 'bg-[#E4E0D7]'}`} />
            <span className={`w-3 h-3 rounded-full ${isThirdWarning ? 'bg-[#B42318] animate-pulse ring-2 ring-[#B42318]/30' : 'bg-[#E4E0D7]'}`} />
          </div>
        </div>

        {/* Red Termination Consequence Notice if 3rd warning */}
        {isThirdWarning ? (
          <div className="p-3.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-[13px] leading-relaxed space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-[#B42318]">
              <AlertTriangle size={16} />
              CRITICAL CONSEQUENCE:
            </div>
            <p>
              This is the <strong>3rd warning</strong>. Issuing this will immediately <strong>TERMINATE</strong> the student from the circle, apply a <strong>-500 points fine</strong> to the team score, and render the entire team <strong>Out of this week's ranking</strong>.
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-[#5B6470] leading-relaxed">
            Warning #{activeWarningCount + 1} of 3. Three cumulative warnings will result in a team penalty (-500 pts) and student termination.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#1A1F26] mb-1">
              Reason for Warning
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. repeated late arrival, unprepared..."
              className="w-full h-11 px-3.5 rounded-xl border border-[#E4E0D7] bg-white text-[14px] text-[#1A1F26] focus:border-[#0F766E] focus:outline-hidden"
              autoFocus
            />
          </div>

          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5">
            {quickReasons.map((qr) => (
              <button
                key={qr}
                type="button"
                onClick={() => setReason(qr)}
                className="text-[11px] py-1 px-2.5 rounded-lg bg-[#F0EDE6] text-[#1A1F26] hover:bg-[#E4E0D7] transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-[#C9C4B8] bg-white text-[#1A1F26] font-semibold text-[14px] hover:bg-[#F7F5F0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`h-11 rounded-xl font-semibold text-[14px] text-white shadow-sm transition-all ${
                isThirdWarning
                  ? 'bg-[#B42318] hover:bg-[#991B1B]'
                  : 'bg-[#B45309] hover:bg-[#92400E]'
              }`}
            >
              {isThirdWarning ? 'Confirm Termination' : 'Issue Warning'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
