import React, { useState, useMemo } from 'react';
import { POPULAR_SURAHS, QURAN_PARAS, SurahItem } from '../data/quranData';
import { X, Search, BookOpen, Layers, Check } from 'lucide-react';

interface SurahPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPara?: number;
  currentSurah?: string;
  ayahFrom?: number;
  ayahTo?: number;
  lessonLabel?: string; // e.g. "Sabaq", "Sabqi", "Manzil"
  onSelectPortion: (para: number, surah: string, from: number, to: number) => void;
}

export const SurahPickerModal: React.FC<SurahPickerModalProps> = ({
  isOpen,
  onClose,
  currentPara = 30,
  currentSurah = 'Al-Mulk',
  ayahFrom = 1,
  ayahTo = 15,
  lessonLabel = 'Sabaq',
  onSelectPortion
}) => {
  const [activeTab, setActiveTab] = useState<'surahs' | 'paras'>('surahs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPara, setSelectedPara] = useState<number>(currentPara);
  const [selectedSurah, setSelectedSurah] = useState<string>(currentSurah);
  const [fromAyah, setFromAyah] = useState<number>(ayahFrom);
  const [toAyah, setToAyah] = useState<number>(ayahTo);

  const filteredSurahs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return POPULAR_SURAHS;
    return POPULAR_SURAHS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.arabicName.includes(q) ||
        s.number.toString() === q
    );
  }, [searchQuery]);

  const activeSurahObj = useMemo(() => {
    return POPULAR_SURAHS.find((s) => s.name === selectedSurah) || POPULAR_SURAHS[0];
  }, [selectedSurah]);

  if (!isOpen) return null;

  const handleApply = () => {
    onSelectPortion(selectedPara, selectedSurah, fromAyah, toAyah);
    onClose();
  };

  const handleSelectSurah = (s: SurahItem) => {
    setSelectedSurah(s.name);
    setSelectedPara(s.juzStart);
    setFromAyah(1);
    setToAyah(Math.min(20, s.totalAyahs));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none no-print">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E4E0D7] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0F766E] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-[#FDE68A]" />
            <div>
              <h3 className="font-bold text-[16px] leading-tight">
                Select {lessonLabel} Portion
              </h3>
              <p className="text-[11px] text-white/80">
                Quran Juz & Surah Selection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Currently Chosen Pill */}
        <div className="p-3 bg-[#F7F5F0] border-b border-[#E4E0D7] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#5B6470] font-semibold uppercase">Selected Portion</div>
            <div className="text-[15px] font-bold text-[#0F766E] flex items-center gap-2 mt-0.5">
              <span>Para {selectedPara}: {selectedSurah}</span>
              <span className="text-[12px] font-normal text-[#1A1F26]">
                (Ayah {fromAyah} - {toAyah})
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs bg-[#E6F4F2] text-[#0F766E] font-bold px-2 py-0.5 rounded-full">
              {toAyah - fromAyah + 1} Ayahs
            </span>
          </div>
        </div>

        {/* Ayah Range Sliders / Steppers */}
        <div className="p-3 bg-white border-b border-[#E4E0D7] space-y-2">
          <div className="flex items-center justify-between text-[12px] font-semibold text-[#1A1F26]">
            <span>Ayah Range ({activeSurahObj.totalAyahs} total):</span>
            <div className="flex gap-1">
              {[
                { label: '1-10', f: 1, t: 10 },
                { label: '1-20', f: 1, t: 20 },
                { label: 'Full Surah', f: 1, t: activeSurahObj.totalAyahs }
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setFromAyah(preset.f);
                    setToAyah(Math.min(activeSurahObj.totalAyahs, preset.t));
                  }}
                  className="px-2 py-0.5 rounded bg-[#F0EDE6] hover:bg-[#E4E0D7] text-[11px] text-[#1A1F26]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#5B6470] block mb-1">From Ayah</label>
              <input
                type="number"
                min={1}
                max={activeSurahObj.totalAyahs}
                value={fromAyah}
                onChange={(e) => setFromAyah(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full h-9 px-2 text-center rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#5B6470] block mb-1">To Ayah</label>
              <input
                type="number"
                min={fromAyah}
                max={activeSurahObj.totalAyahs}
                value={toAyah}
                onChange={(e) => setToAyah(Math.min(activeSurahObj.totalAyahs, parseInt(e.target.value, 10) || fromAyah))}
                className="w-full h-9 px-2 text-center rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] font-bold"
              />
            </div>
          </div>
        </div>

        {/* View Toggle: Surahs vs Paras */}
        <div className="p-2 border-b border-[#E4E0D7] flex items-center justify-between gap-2">
          <div className="flex bg-[#F0EDE6] p-0.5 rounded-xl flex-1">
            <button
              type="button"
              onClick={() => setActiveTab('surahs')}
              className={`flex-1 py-1 rounded-lg text-[12px] font-bold transition-all ${
                activeTab === 'surahs' ? 'bg-white text-[#0F766E] shadow-xs' : 'text-[#5B6470]'
              }`}
            >
              Surahs ({filteredSurahs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paras')}
              className={`flex-1 py-1 rounded-lg text-[12px] font-bold transition-all ${
                activeTab === 'paras' ? 'bg-white text-[#0F766E] shadow-xs' : 'text-[#5B6470]'
              }`}
            >
              Paras / Juz (30)
            </button>
          </div>
        </div>

        {/* Search input for surahs */}
        {activeTab === 'surahs' && (
          <div className="px-3 pt-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-[#8A929C]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Surah by name or number..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[12px] focus:bg-white focus:border-[#0F766E] focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-[#E4E0D7]/40">
          {activeTab === 'surahs' ? (
            filteredSurahs.map((surah) => {
              const isSelected = selectedSurah === surah.name;
              return (
                <div
                  key={surah.number}
                  onClick={() => handleSelectSurah(surah)}
                  className={`pt-1.5 pb-1 px-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    isSelected ? 'bg-[#E6F4F2] border border-[#0F766E]/40' : 'hover:bg-[#F7F5F0]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#F0EDE6] text-[#1A1F26] text-[11px] font-bold flex items-center justify-center">
                      {surah.number}
                    </span>
                    <div>
                      <div className="text-[13px] font-bold text-[#1A1F26] flex items-center gap-1.5">
                        <span>{surah.name}</span>
                        <span className="text-[11px] text-[#8A929C] font-normal">
                          (Para {surah.juzStart})
                        </span>
                      </div>
                      <div className="text-[10px] text-[#5B6470]">{surah.englishTranslation} - {surah.totalAyahs} Ayahs</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-[#0F766E] font-serif">
                      {surah.arabicName}
                    </span>
                    {isSelected && <Check size={16} className="text-[#0F766E]" />}
                  </div>
                </div>
              );
            })
          ) : (
            QURAN_PARAS.map((para) => {
              const isSelected = selectedPara === para.number;
              return (
                <div
                  key={para.number}
                  onClick={() => {
                    setSelectedPara(para.number);
                  }}
                  className={`pt-1.5 pb-1 px-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    isSelected ? 'bg-[#E6F4F2] border border-[#0F766E]/40' : 'hover:bg-[#F7F5F0]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#F0EDE6] text-[#1A1F26] text-[11px] font-bold flex items-center justify-center">
                      {para.number}
                    </span>
                    <div>
                      <div className="text-[13px] font-bold text-[#1A1F26]">
                        Juz {para.number}: {para.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-[#0F766E] font-serif">
                      {para.arabicName}
                    </span>
                    {isSelected && <Check size={16} className="text-[#0F766E]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#F7F5F0] border-t border-[#E4E0D7] flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-[#D1D5DB] bg-white text-[#1A1F26] text-[13px] font-semibold hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 h-11 rounded-xl bg-[#0F766E] hover:bg-[#0B5D57] active:scale-[0.99] text-white font-bold text-[14px] shadow-sm transition-all"
          >
            Apply Portion
          </button>
        </div>
      </div>
    </div>
  );
};
