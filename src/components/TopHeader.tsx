import React from 'react';
import { HalqaLogo } from './Icons';
import { ChevronLeft, Volume2, VolumeX, Globe } from 'lucide-react';
import { LanguageCode } from '../i18n/translations';

interface TopHeaderProps {
  title: string;
  subtitle?: string;
  teacherInitials?: string;
  language: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onOpenSettings?: () => void;
  onBack?: () => void;
  showBack?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  subtitle = 'Offline mode active - synced locally',
  teacherInitials = 'UB',
  language,
  onSelectLanguage,
  soundEnabled = true,
  onToggleSound,
  onOpenSettings,
  onBack,
  showBack = false
}) => {
  return (
    <header className="fixed top-0 inset-x-0 z-30 pt-safe bg-[#FDF9F0]/95 backdrop-blur-md border-b border-[#E4E0D7] shadow-[0_1px_6px_rgba(0,0,0,0.02)] no-print">
      <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between gap-2">
        {/* Left Slot: Back Button or Logo Lockup */}
        <div className="flex items-center gap-2.5 min-w-0">
          {showBack && onBack ? (
            <button
              onClick={onBack}
              className="w-10 h-10 -ml-1 rounded-xl flex items-center justify-center text-[#1A1F26] hover:bg-[#F0EDE6] active:scale-95 transition-all"
              aria-label="Go Back"
              type="button"
            >
              <ChevronLeft size={24} strokeWidth={2} />
            </button>
          ) : (
            <div className="flex-shrink-0">
              <HalqaLogo size={32} />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-bold text-[#1A1F26] truncate tracking-tight">
                Halqa Tracker
              </span>
              <span className="text-[#8A929C] text-xs">/</span>
              <span className="text-[14px] font-semibold text-[#0F766E] truncate">
                {title}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16803C] animate-pulse flex-shrink-0" />
              <span className="text-[11px] text-[#5B6470] truncate leading-none font-medium">
                {subtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Right Slot: Sound toggle, Language, Teacher Avatar */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onToggleSound && (
            <button
              type="button"
              onClick={onToggleSound}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5B6470] hover:bg-[#F0EDE6] transition-colors"
              title={soundEnabled ? 'Mute audio clicks' : 'Enable audio clicks'}
              aria-label="Toggle Sound"
            >
              {soundEnabled ? <Volume2 size={16} className="text-[#0F766E]" /> : <VolumeX size={16} className="text-[#8A929C]" />}
            </button>
          )}

          {/* Quick Lang Switcher Pill */}
          <button
            type="button"
            onClick={() => {
              const next: LanguageCode = language === 'en' ? 'ur' : language === 'ur' ? 'roman_ur' : 'en';
              onSelectLanguage(next);
            }}
            className="h-7 px-2 rounded-lg bg-[#F0EDE6] hover:bg-[#E4E0D7] text-[#1A1F26] text-[11px] font-bold flex items-center gap-1 transition-all"
            title="Switch Language (English / اردو / Roman Urdu)"
          >
            <Globe size={12} className="text-[#0F766E]" />
            <span>{language === 'en' ? 'EN' : language === 'ur' ? 'اردو' : 'ROM'}</span>
          </button>

          {/* Teacher Avatar */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="w-8 h-8 rounded-full bg-[#0F766E] text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-[#0F766E]/20 hover:opacity-90 active:scale-95 transition-all ml-0.5"
              aria-label="Open Settings and Profile"
              type="button"
            >
              {teacherInitials}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
