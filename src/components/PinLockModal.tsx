import React, { useState } from 'react';
import { Lock, Delete, X } from 'lucide-react';
import { playFeedbackSound } from '../utils/audioFeedback';

interface PinLockModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  isSetup?: boolean; // if true, guides through set new pin
  soundEnabled?: boolean;
  onSuccess: (pin: string) => void;
  onCancel?: () => void;
  validatePin?: (pin: string) => boolean;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  title = 'Enter Security PIN',
  subtitle = '4-digit authorization code',
  isSetup = false,
  soundEnabled = true,
  onSuccess,
  onCancel,
  validatePin
}) => {
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    playFeedbackSound('click', soundEnabled);
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg('');

    if (newPin.length === 4) {
      if (isSetup) {
        if (!firstPin) {
          // Store first entry and ask for confirmation
          setFirstPin(newPin);
          setPin('');
        } else {
          // Confirming PIN
          if (newPin === firstPin) {
            playFeedbackSound('save', soundEnabled);
            onSuccess(newPin);
            setPin('');
            setFirstPin(null);
          } else {
            playFeedbackSound('warning', soundEnabled);
            setErrorMsg('PINs do not match. Try again.');
            setPin('');
            setFirstPin(null);
          }
        }
      } else {
        // Validation mode
        if (validatePin) {
          if (validatePin(newPin)) {
            playFeedbackSound('save', soundEnabled);
            onSuccess(newPin);
            setPin('');
          } else {
            playFeedbackSound('warning', soundEnabled);
            setErrorMsg('Incorrect PIN. Please re-enter.');
            setTimeout(() => setPin(''), 300);
          }
        } else {
          playFeedbackSound('save', soundEnabled);
          onSuccess(newPin);
          setPin('');
        }
      }
    }
  };

  const handleBackspace = () => {
    playFeedbackSound('click', soundEnabled);
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    playFeedbackSound('click', soundEnabled);
    setPin('');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xs bg-white rounded-3xl p-6 border border-[#E4E0D7] shadow-2xl flex flex-col items-center"
      >
        {onCancel && (
          <button
            onClick={onCancel}
            className="self-end -mr-2 -mt-2 w-8 h-8 rounded-full flex items-center justify-center text-[#5B6470] hover:bg-[#F0EDE6]"
            type="button"
          >
            <X size={18} />
          </button>
        )}

        <div className="w-12 h-12 rounded-2xl bg-[#E6F4F2] text-[#0F766E] flex items-center justify-center mb-3 shadow-xs">
          <Lock size={24} />
        </div>

        <h3 className="text-[18px] font-bold text-[#1A1F26] text-center">
          {isSetup && firstPin ? 'Confirm Security PIN' : title}
        </h3>
        <p className="text-[13px] text-[#5B6470] text-center mb-5">
          {isSetup && firstPin ? 'Re-enter the same 4-digit PIN' : subtitle}
        </p>

        {/* 4 PIN Dots */}
        <div className="flex items-center gap-4 mb-6">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-[#0F766E] scale-110 shadow-xs'
                    : 'bg-[#E4E0D7]'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <div className="text-[12px] font-semibold text-[#B42318] mb-4 text-center">
            {errorMsg}
          </div>
        )}

        {/* 3x4 Round Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="w-16 h-16 rounded-full bg-[#F7F5F0] hover:bg-[#EAE6DE] active:bg-[#0F766E] active:text-white text-[#1A1F26] font-bold text-2xl flex items-center justify-center mx-auto transition-all active:scale-95 shadow-xs"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="w-16 h-16 rounded-full text-[#5B6470] text-[13px] font-semibold flex items-center justify-center mx-auto hover:bg-[#F7F5F0] transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="w-16 h-16 rounded-full bg-[#F7F5F0] hover:bg-[#EAE6DE] active:bg-[#0F766E] active:text-white text-[#1A1F26] font-bold text-2xl flex items-center justify-center mx-auto transition-all active:scale-95 shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="w-16 h-16 rounded-full text-[#5B6470] hover:bg-[#F7F5F0] active:text-[#B42318] flex items-center justify-center mx-auto transition-colors"
            aria-label="Backspace"
          >
            <Delete size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
