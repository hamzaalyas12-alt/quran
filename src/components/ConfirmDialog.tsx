import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150 no-print">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm bg-white rounded-2xl p-5 border border-[#E4E0D7] shadow-xl space-y-4"
      >
        <div className="flex items-start gap-3">
          {isDestructive ? (
            <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#B42318] flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={22} />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#E6F4F2] text-[#0F766E] flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={22} />
            </div>
          )}
          <div className="space-y-1">
            <h3 className="text-[17px] font-bold text-[#1A1F26]">
              {title}
            </h3>
            <p className="text-[14px] text-[#5B6470] leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl border border-[#C9C4B8] bg-white text-[#1A1F26] font-semibold text-[14px] hover:bg-[#F7F5F0] active:scale-[0.98] transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-11 rounded-xl font-semibold text-[14px] text-white active:scale-[0.98] transition-all shadow-sm ${
              isDestructive
                ? 'bg-[#B42318] hover:bg-[#991B1B]'
                : 'bg-[#0F766E] hover:bg-[#0B5D57]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
