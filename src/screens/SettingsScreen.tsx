import React, { useState } from 'react';
import { AppSettings, ScoringRulesConfig } from '../types';
import { storage } from '../data/storage';
import {
  ChevronLeft,
  Save,
  Lock,
  Globe,
  Sliders,
  Calendar,
  LogOut,
  Volume2
} from 'lucide-react';

interface SettingsScreenProps {
  settings: AppSettings;
  onBack: () => void;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onLogout: () => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onSetupPin: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onBack,
  onUpdateSettings,
  onLogout,
  onShowToast,
  onSetupPin
}) => {
  const [rules, setRules] = useState<ScoringRulesConfig>({ ...settings.scoringRules });
  const [teacherName, setTeacherName] = useState(settings.teacherName);
  const [halqaName, setHalqaName] = useState(settings.halqaName);
  const [termName, setTermName] = useState(settings.termName);
  const [language, setLanguage] = useState(settings.language || 'en');
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled ?? true);
  const [pinLockEnabled, setPinLockEnabled] = useState(settings.pinLockEnabled);
  const [pinLockTimeoutMinutes, setPinLockTimeoutMinutes] = useState(settings.pinLockTimeoutMinutes || 2);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleWorkingDay = (dayIndex: number) => {
    setRules((prev) => {
      const exists = prev.workingDays.includes(dayIndex);
      const nextDays = exists
        ? prev.workingDays.filter((d) => d !== dayIndex)
        : [...prev.workingDays, dayIndex].sort();
      return { ...prev, workingDays: nextDays };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      ...settings,
      scoringRules: rules,
      teacherName: teacherName.trim(),
      halqaName: halqaName.trim(),
      termName: termName.trim(),
      language,
      soundEnabled,
      pinLockEnabled,
      pinLockTimeoutMinutes
    };
    storage.saveSettings(updated);
    onUpdateSettings(updated);
    onShowToast('Settings and scoring rules saved successfully! (Affects new records)', 'success');
  };

  return (
    <div className="flex flex-col w-full pb-32 px-4 pt-20 max-w-md mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white border border-[#E4E0D7] flex items-center justify-center text-[#1A1F26] hover:bg-[#F7F5F0]"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-[20px] font-bold text-[#1A1F26]">
            Settings & Scoring Rules
          </h1>
          <p className="text-[12px] text-[#5B6470]">
            Customize rules, working days, and PIN lock
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Halqa & Teacher Identity Card */}
        <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs space-y-3">
          <h2 className="text-[15px] font-bold text-[#1A1F26]">Teacher & Halqa Profile</h2>
          <div className="space-y-2.5">
            <div>
              <label className="text-[12px] font-semibold text-[#1A1F26] block mb-1">
                Teacher Name
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#1A1F26] block mb-1">
                Halqa Title
              </label>
              <input
                type="text"
                value={halqaName}
                onChange={(e) => setHalqaName(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#1A1F26] block mb-1">
                Term Label
              </label>
              <input
                type="text"
                value={termName}
                onChange={(e) => setTermName(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px]"
              />
            </div>
          </div>
        </div>

        {/* 1. SCORING RULES CONFIG */}
        <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-[#0F766E]" />
            <h2 className="text-[15px] font-bold text-[#1A1F26]">
              Scoring Rules (Per Student / Day)
            </h2>
          </div>
          <p className="text-[12px] text-[#5B6470] -mt-2">
            Adjusting parameters takes effect for all subsequent records.
          </p>

          <div className="space-y-3 divide-y divide-[#E4E0D7]/60">
            {/* Sabaq */}
            <div className="pt-2 grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Sabaq Base Points
                </label>
                <input
                  type="number"
                  value={rules.sabaqBase}
                  onChange={(e) => setRules({ ...rules, sabaqBase: parseInt(e.target.value, 10) || 0 })}
                  className="w-full h-10 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Sabaq Deduction / Mistake
                </label>
                <input
                  type="number"
                  value={rules.sabaqMistakeDeduction}
                  onChange={(e) => setRules({ ...rules, sabaqMistakeDeduction: parseInt(e.target.value, 10) || 0 })}
                  className="w-full h-10 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] font-bold text-[#B42318]"
                />
              </div>
            </div>

            {/* Sabqi */}
            <div className="pt-2 grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Sabqi Base Points
                </label>
                <input
                  type="number"
                  value={rules.sabqiBase}
                  onChange={(e) => setRules({ ...rules, sabqiBase: parseInt(e.target.value, 10) || 0 })}
                  className="w-full h-10 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Sabqi Deduction / Mistake
                </label>
                <input
                  type="number"
                  value={rules.sabqiMistakeDeduction}
                  onChange={(e) => setRules({ ...rules, sabqiMistakeDeduction: parseInt(e.target.value, 10) || 0 })}
                  className="w-full h-10 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] font-bold text-[#B42318]"
                />
              </div>
            </div>

            {/* Manzil */}
            <div className="pt-2 grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Manzil Base Points
                </label>
                <input
                  type="number"
                  value={rules.manzilBase}
                  onChange={(e) => setRules({ ...rules, manzilBase: parseInt(e.target.value, 10) || 0 })}
                  className="w-full h-10 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Manzil Deduction / Mistake
                </label>
                <input
                  type="number"
                  value={rules.manzilMistakeDeduction}
                  onChange={(e) => setRules({ ...rules, manzilMistakeDeduction: parseInt(e.target.value, 10) || 0 })}
                  className="w-full h-10 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] font-bold text-[#B42318]"
                />
              </div>
            </div>

            {/* Discipline split */}
            <div className="pt-2 grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-[#5B6470] block mb-1">Uniform Pts</label>
                <input
                  type="number"
                  value={rules.disciplineUniform}
                  onChange={(e) => setRules({ ...rules, disciplineUniform: parseInt(e.target.value, 10) || 0 })}
                  className="w-full h-10 text-center rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[13px] font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#5B6470] block mb-1">Behaviour Pts</label>
                <input
                  type="number"
                  value={rules.disciplineBehaviour}
                  onChange={(e) => setRules({ ...rules, disciplineBehaviour: parseInt(e.target.value, 10) || 0 })}
                  className="w-full h-10 text-center rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[13px] font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#5B6470] block mb-1">On Time Pts</label>
                <input
                  type="number"
                  value={rules.disciplineOnTime}
                  onChange={(e) => setRules({ ...rules, disciplineOnTime: parseInt(e.target.value, 10) || 0 })}
                  className="w-full h-10 text-center rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[13px] font-bold"
                />
              </div>
            </div>

            {/* Bonus, Daily Min, Comeback, Penalty */}
            <div className="pt-2 grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Daily Minimum Floor
                </label>
                <input
                  type="number"
                  value={rules.dailyMinimum}
                  onChange={(e) => setRules({ ...rules, dailyMinimum: parseInt(e.target.value, 10) || -25 })}
                  className="w-full h-10 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] font-bold text-[#B42318]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Comeback Bonus (+pts)
                </label>
                <input
                  type="number"
                  value={rules.comebackBonusPoints}
                  onChange={(e) => setRules({ ...rules, comebackBonusPoints: parseInt(e.target.value, 10) || 0 })}
                  className="w-full h-10 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] font-bold text-[#F59E0B]"
                />
              </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Warnings Limit (Termination)
                </label>
                <input
                  type="number"
                  value={rules.warningLimit}
                  onChange={(e) => setRules({ ...rules, warningLimit: parseInt(e.target.value, 10) || 3 })}
                  className="w-full h-10 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                  Team Penalty Points
                </label>
                <input
                  type="number"
                  value={rules.terminationPenalty}
                  onChange={(e) => setRules({ ...rules, terminationPenalty: parseInt(e.target.value, 10) || 500 })}
                  className="w-full h-10 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] font-bold text-[#B42318]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Working Days & Holidays */}
        <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#0F766E]" />
            <h2 className="text-[15px] font-bold text-[#1A1F26]">
              Working Days & Holidays
            </h2>
          </div>
          <p className="text-[12px] text-[#5B6470]">
            Toggle active Halqa days. Default Sunday is a holiday.
          </p>
          <div className="grid grid-cols-7 gap-1 pt-1">
            {daysOfWeek.map((dayName, idx) => {
              const isWorking = rules.workingDays.includes(idx);
              return (
                <button
                  key={dayName}
                  type="button"
                  onClick={() => toggleWorkingDay(idx)}
                  className={`py-2 rounded-xl text-center text-[12px] font-bold border transition-all ${
                    isWorking
                      ? 'bg-[#E6F4F2] text-[#0F766E] border-[#0F766E]'
                      : 'bg-[#F7F5F0] text-[#8A929C] border-[#E4E0D7]'
                  }`}
                >
                  {dayName}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Teacher Security PIN Lock */}
        <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-[#0F766E]" />
              <h2 className="text-[15px] font-bold text-[#1A1F26]">
                Teacher Security PIN Lock
              </h2>
            </div>
            <input
              type="checkbox"
              checked={pinLockEnabled}
              onChange={(e) => setPinLockEnabled(e.target.checked)}
              className="w-5 h-5 accent-[#0F766E] rounded"
            />
          </div>
          <p className="text-[12px] text-[#5B6470]">
            Locks screen when app reopens after idle time to safeguard records in class.
          </p>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onSetupPin}
              className="px-3 py-2 rounded-xl border border-[#C9C4B8] text-[#1A1F26] text-[13px] font-semibold hover:bg-[#F7F5F0]"
            >
              {settings.teacherPin ? 'Change 4-Digit PIN' : 'Set 4-Digit PIN'}
            </button>
            <div className="flex items-center gap-1.5 text-[12px] text-[#5B6470]">
              <span>Idle Timeout:</span>
              <select
                value={pinLockTimeoutMinutes}
                onChange={(e) => setPinLockTimeoutMinutes(parseInt(e.target.value, 10))}
                className="h-8 px-2 rounded-lg border border-[#E4E0D7] bg-[#F7F5F0] text-[12px]"
              >
                <option value={1}>1 min</option>
                <option value={2}>2 min (default)</option>
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Sound & Audio Clicks */}
        <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 size={18} className="text-[#0F766E]" />
              <h2 className="text-[15px] font-bold text-[#1A1F26]">
                Tactile Audio Feedback
              </h2>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="w-5 h-5 accent-[#0F766E] rounded"
            />
          </div>
          <p className="text-[12px] text-[#5B6470]">
            Subtle clicks and chimes when recording mistakes, bonuses, and scores.
          </p>
        </div>

        {/* 5. Language Selector */}
        <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-[#0F766E]" />
            <h2 className="text-[15px] font-bold text-[#1A1F26]">Language / زبان</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { code: 'en', label: 'English' },
              { code: 'ur', label: 'اردو' },
              { code: 'roman_ur', label: 'Roman Urdu' }
            ].map((langItem) => (
              <button
                key={langItem.code}
                type="button"
                onClick={() => setLanguage(langItem.code as any)}
                className={`py-2 rounded-xl text-center text-[13px] font-semibold border transition-all ${
                  language === langItem.code
                    ? 'bg-[#E6F4F2] text-[#0F766E] border-[#0F766E]'
                    : 'bg-[#F7F5F0] text-[#5B6470] border-[#E4E0D7]'
                }`}
              >
                {langItem.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save Changes Primary Button */}
        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-[#0F766E] hover:bg-[#0B5D57] active:scale-[0.99] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Save size={18} />
          <span>Save All Settings</span>
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={onLogout}
          className="w-full h-11 rounded-xl border border-[#FCA5A5] text-[#B42318] hover:bg-[#FEE2E2] font-semibold text-[14px] flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          <span>Lock / Sign Out</span>
        </button>
      </form>
    </div>
  );
};
