import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 size={18} className="text-[#16803C] flex-shrink-0" />,
    warning: <AlertTriangle size={18} className="text-[#B45309] flex-shrink-0" />,
    error: <AlertCircle size={18} className="text-[#B42318] flex-shrink-0" />,
    info: <Info size={18} className="text-[#0F766E] flex-shrink-0" />
  };

  const type = toast.type || 'info';

  return (
    <div
      role="status"
      onClick={onDismiss}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#1F2A37] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 cursor-pointer no-print"
    >
      {icons[type]}
      <span className="text-[13px] font-medium leading-snug flex-1">
        {toast.text}
      </span>
    </div>
  );
};
