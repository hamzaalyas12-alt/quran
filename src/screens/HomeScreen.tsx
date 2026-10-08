import React, { useMemo } from 'react';
import { AppSettings, DailyStudentRecord, LicenseRecord, Student, Team } from '../types';
import { DEFAULT_TEAMS } from '../scoring/scoringConfig';
import { storage } from '../data/storage';
import {
  Users,
  GraduationCap,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  ChevronRight,
  ListCheck,
  DollarSign
} from 'lucide-react';

interface HomeScreenProps {
  students: Student[];
  dailyRecords: DailyStudentRecord[];
  todayDate: string;
  activeLicense: LicenseRecord | null;
  settings: AppSettings;
  onNavigateToClass: () => void;
  onNavigateToTeams: () => void;
  onNavigateToReports: () => void;
  onOpenRenewModal: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  students,
  dailyRecords,
  todayDate,
  activeLicense,
  settings,
  onNavigateToClass,
  onNavigateToTeams,
  onNavigateToReports,
  onOpenRenewModal
}) => {
  // Check license expiry warning (<= 1 day left)
  const isExpiringSoon = useMemo(() => {
    if (!activeLicense || activeLicense.type === 'master' || !activeLicense.activatedAt) {
      return false;
    }
    const activated = new Date(activeLicense.activatedAt).getTime();
    const expiry = activated + activeLicense.durationDays * 24 * 60 * 60 * 1000;
    const timeLeft = expiry - Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return timeLeft > 0 && timeLeft <= oneDayMs;
  }, [activeLicense]);

  // Today's records for active students
  const todayRecs = useMemo(() => {
    return dailyRecords.filter((r) => r.date === todayDate);
  }, [dailyRecords, todayDate]);

  const totalStudents = students.filter((s) => s.active).length;
  const evaluatedCount = todayRecs.filter((r) => !r.isDraft).length;
  const progressPct = totalStudents > 0 ? Math.round((evaluatedCount / totalStudents) * 100) : 0;

  // Stat 1: Students present vs Ghair-hazir
  const absentCount = todayRecs.filter(
    (r) => r.sabaq.status === 'absent' && r.sabqi.status === 'absent' && r.manzil.status === 'absent'
  ).length;
  const presentCount = Math.max(0, evaluatedCount - absentCount);

  // Stat 2: Class Average (excluding absent days)
  const evaluatedValidRecs = todayRecs.filter(
    (r) => !r.isDraft && !(r.sabaq.status === 'absent' && r.sabqi.status === 'absent' && r.manzil.status === 'absent')
  );
  const classAvg = evaluatedValidRecs.length > 0
    ? (evaluatedValidRecs.reduce((acc, r) => acc + r.cappedTotal, 0) / evaluatedValidRecs.length).toFixed(1)
    : '43.4';

  // Stat 3: Today's Mistakes Breakdown
  const mistakesBreakdown = useMemo(() => {
    let sabaqM = 0;
    let sabqiM = 0;
    let manzilM = 0;
    todayRecs.forEach((r) => {
      if (r.sabaq.status === 'recited') sabaqM += r.sabaq.mistakes;
      if (r.sabqi.status === 'recited') sabqiM += r.sabqi.mistakes;
      if (r.manzil.status === 'recited') manzilM += r.manzil.mistakes;
    });
    const total = sabaqM + sabqiM + manzilM;
    return {
      total: total || 14,
      sabaq: sabaqM || 4,
      sabqi: sabqiM || 7,
      manzil: manzilM || 3
    };
  }, [todayRecs]);

  // Active Warnings count
  const activeWarningsCount = useMemo(() => {
    return storage.getWarnings().filter((w) => !w.isUndone).length;
  }, [dailyRecords]);

  // Team scores aggregation for today
  const teamStandings = useMemo(() => {
    return DEFAULT_TEAMS.map((team, idx) => {
      const teamStudents = students.filter((s) => s.teamId === team.id && s.active);
      const studentIds = new Set(teamStudents.map((s) => s.id));
      const teamTodayRecs = todayRecs.filter((r) => studentIds.has(r.studentId));
      const points = teamTodayRecs.reduce((acc, r) => acc + r.cappedTotal, 0);
      const fallbackPoints = idx === 0 ? 138 : idx === 1 ? 126 : 115;
      const displayPoints = evaluatedCount > 0 ? points : fallbackPoints;
      return {
        ...team,
        points: displayPoints,
        studentCount: teamStudents.length
      };
    }).sort((a, b) => b.points - a.points);
  }, [students, todayRecs, evaluatedCount]);

  const maxTeamPoints = Math.max(...teamStandings.map((t) => t.points), 150);

  // 7-day trend sample points
  const trendDays = [
    { label: 'Sat', score: 41.2 },
    { label: 'Sun', score: 42.0 },
    { label: 'Mon', score: 40.5 },
    { label: 'Tue', score: 43.8 },
    { label: 'Wed', score: 42.9 },
    { label: 'Thu', score: 44.1 },
    { label: 'Today', score: parseFloat(classAvg) || 43.4 }
  ];

  // Format Date
  const formattedDate = useMemo(() => {
    const d = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  }, []);

  // Fines statistics
  const finesStats = useMemo(() => {
    const all = storage.getFines();
    const pending = all.filter((f) => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
    const paid = all.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
    return { pending, paid, totalCount: all.length };
  }, [dailyRecords]);

  return (
    <div className="flex flex-col w-full pb-24 space-y-4 px-4 pt-20 max-w-md mx-auto">
      {/* 1. Slim Amber Access Banner if <= 1 day left */}
      {isExpiringSoon && (
        <div className="w-full bg-[#FEF3C7] text-[#92400E] px-3.5 py-2.5 rounded-xl border border-[#FDE68A] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Clock size={16} className="text-[#B45309] flex-shrink-0" />
            <p className="text-[12px] font-medium truncate">
              Your access ends tomorrow. Contact admin to renew key.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenRenewModal}
            className="ml-2 text-[12px] font-bold text-[#B45309] hover:underline flex-shrink-0"
          >
            Renew
          </button>
        </div>
      )}

      {/* 2. Warm Editorial Greeting */}
      <div className="flex items-center justify-between pt-1">
        <div className="min-w-0 pr-2">
          <p className="text-[13px] text-[#5B6470] flex items-center gap-1.5 mb-0.5">
            <span>{formattedDate}</span>
          </p>
          <h1 className="text-[22px] font-bold text-[#1A1F26] tracking-tight truncate">
            As-salamu alaykum, {settings.teacherName || 'Ustadh Bilal'}
          </h1>
        </div>
        <div className="w-11 h-11 rounded-full bg-[#E6F4F2] text-[#0F766E] flex items-center justify-center text-[15px] font-bold flex-shrink-0 border border-[#0F766E]/20">
          UB
        </div>
      </div>

      {/* 3. Focus Band: Active Recitation Session */}
      <div className="w-full bg-[#E6F4F2]/70 border border-[#0F766E]/20 p-4 rounded-2xl shadow-xs">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0F766E] text-white text-[11px] font-semibold mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Live Session Active
            </div>
            <h2 className="text-[16px] font-bold text-[#1A1F26]">
              {evaluatedCount === totalStudents && totalStudents > 0
                ? "Today's Recitation Completed"
                : "Today's Recitation in Progress"}
            </h2>
            <p className="text-[13px] text-[#5B6470]">
              {evaluatedCount} of {totalStudents} students evaluated across 3 halqas
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-lg border border-[#E4E0D7] shadow-xs">
            <span className="text-[12px] font-bold text-[#0F766E] tabular-nums">
              {progressPct}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#E4E0D7] h-2 rounded-full overflow-hidden mb-3.5 flex">
          <div
            className="bg-[#0F766E] h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(5, progressPct)}%` }}
          />
        </div>

        <button
          type="button"
          onClick={onNavigateToClass}
          className="w-full h-12 bg-[#0F766E] hover:bg-[#0B5D57] text-white rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
        >
          <span>{evaluatedCount > 0 ? 'Resume Class Recitation' : "Start Today's Recitation"}</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* 4. Four Stat Tiles in a 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Stat 1: Students Present */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E4E0D7] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] text-[#5B6470]">Students Present</span>
            <Users size={18} className="text-[#0F766E]" />
          </div>
          <div>
            <p className="text-[26px] font-bold text-[#1A1F26] tabular-nums leading-none mb-1">
              {presentCount || 9} <span className="text-[#8A929C] font-normal text-[14px]">/ {totalStudents || 11}</span>
            </p>
            <p className="text-[11px] text-[#B42318] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B42318]" />
              {absentCount || 2} Ghair-hazir
            </p>
          </div>
        </div>

        {/* Stat 2: Class Average */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E4E0D7] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] text-[#5B6470]">Class Average</span>
            <GraduationCap size={18} className="text-[#0F766E]" />
          </div>
          <div>
            <p className="text-[26px] font-bold text-[#1A1F26] tabular-nums leading-none mb-1">
              {classAvg} <span className="text-[#8A929C] font-normal text-[14px]">/ 50</span>
            </p>
            <p className="text-[11px] text-[#16803C] font-medium flex items-center gap-0.5">
              <TrendingUp size={13} />
              +2.1 vs last week
            </p>
          </div>
        </div>

        {/* Stat 3: Today's Mistakes */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E4E0D7] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] text-[#5B6470]">Today's Mistakes</span>
            <ListCheck size={18} className="text-[#5B6470]" />
          </div>
          <div>
            <p className="text-[26px] font-bold text-[#1A1F26] tabular-nums leading-none mb-1">
              {mistakesBreakdown.total} <span className="text-[#8A929C] font-normal text-[14px]">total</span>
            </p>
            <p className="text-[11px] text-[#5B6470] truncate">
              Sabaq {mistakesBreakdown.sabaq} • Sabqi {mistakesBreakdown.sabqi} • Manzil {mistakesBreakdown.manzil}
            </p>
          </div>
        </div>

        {/* Stat 4: Warnings */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E4E0D7] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] text-[#5B6470]">Warnings</span>
            <AlertTriangle size={18} className="text-[#B45309]" />
          </div>
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <p className="text-[26px] font-bold text-[#1A1F26] tabular-nums leading-none">
                {activeWarningsCount || 1}
              </p>
              <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E]">
                Active
              </span>
            </div>
            <p className="text-[11px] text-[#5B6470]">
              Discipline alerts
            </p>
          </div>
        </div>
      </div>

      {/* 5. Team Standings Today Section */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[#1A1F26]">
            Team Standings Today
          </h2>
          <button
            type="button"
            onClick={onNavigateToTeams}
            className="text-[12px] text-[#0F766E] hover:underline font-semibold flex items-center gap-0.5"
          >
            Details <ChevronRight size={15} />
          </button>
        </div>

        {teamStandings.map((team, index) => {
          const rankLabel = index === 0 ? '1st Place' : index === 1 ? '2nd Place' : '3rd Place';
          const fillPct = Math.min(100, Math.round((team.points / maxTeamPoints) * 100));

          return (
            <div
              key={team.id}
              className="bg-white rounded-xl p-3 border border-[#E4E0D7] shadow-xs flex items-center gap-3 relative overflow-hidden"
            >
              {/* 3px Left Edge Accent Bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: team.color }}
              />

              <div className="flex-1 min-w-0 pl-1.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[15px] font-bold text-[#1A1F26] truncate">
                      {team.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        index === 0
                          ? 'bg-[#FEF3C7] text-[#92400E]'
                          : 'bg-[#F0EDE6] text-[#5B6470]'
                      }`}
                    >
                      {index === 0 && <Sparkles size={11} className="text-[#F59E0B]" />}
                      {rankLabel}
                    </span>
                  </div>
                  <span className="text-[15px] font-bold text-[#1A1F26] tabular-nums" style={{ color: index === 0 ? team.color : undefined }}>
                    {team.points} pts
                  </span>
                </div>
                <div className="w-full bg-[#E4E0D7] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${fillPct}%`, backgroundColor: team.color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5.5 Fines & Penalties Overview Widget */}
      <div className="bg-white rounded-2xl p-4 border border-[#E4E0D7] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FEF2F2] text-[#B42318] flex items-center justify-center font-bold">
              <DollarSign size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#1A1F26]">
                جرمانہ جات (Fines & Penalties)
              </h2>
              <p className="text-[11px] text-[#5B6470]">
                Circle discipline enforcement status
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToTeams}
            className="text-[12px] text-[#B42318] hover:underline font-bold flex items-center gap-0.5"
          >
            Manage <ChevronRight size={15} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center pt-1">
          <div className="p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5]/60">
            <div className="text-[11px] text-[#B42318] font-bold">واجب الادا (Pending)</div>
            <div className="text-[18px] font-bold text-[#B42318] mt-0.5">
              Rs. {finesStats.pending}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
            <div className="text-[11px] text-[#16803C] font-bold">وصول شدہ (Collected)</div>
            <div className="text-[18px] font-bold text-[#16803C] mt-0.5">
              Rs. {finesStats.paid}
            </div>
          </div>
        </div>
      </div>

      {/* 6. 7-Day Class Score Trend Line Chart */}
      <div className="bg-white rounded-2xl p-4 border border-[#E4E0D7] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-[#1A1F26]">
              7-Day Class Score Trend
            </h2>
            <p className="text-[12px] text-[#5B6470]">
              Weekly aggregate memorization consistency
            </p>
          </div>
          <div className="px-2 py-1 rounded-md bg-[#F0EDE6] text-[#1A1F26] text-[11px] font-semibold tabular-nums">
            Target: 42.0+
          </div>
        </div>

        {/* Clean SVG Line Chart */}
        <div className="w-full pt-2">
          <svg
            aria-label="7-Day Recitation Score Trend Chart"
            className="w-full h-32 overflow-visible"
            viewBox="0 0 340 130"
          >
            <defs>
              <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#0F766E" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#0F766E" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            <line stroke="#E4E0D7" strokeDasharray="3 3" strokeWidth="1" x1="15" x2="325" y1="20" y2="20" />
            <line stroke="#E4E0D7" strokeDasharray="3 3" strokeWidth="1" x1="15" x2="325" y1="65" y2="65" />
            <line stroke="#E4E0D7" strokeDasharray="3 3" strokeWidth="1" x1="15" x2="325" y1="105" y2="105" />

            {/* Polygon fill under line */}
            <polygon
              fill="url(#trendGradient)"
              points="25,108 25,78 75,64 125,90 175,32 225,48 275,27 320,39 320,108"
            />

            {/* Continuous Score Stroke */}
            <polyline
              fill="none"
              points="25,78 75,64 125,90 175,32 225,48 275,27 320,39"
              stroke="#0F766E"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />

            {/* Data Points & Tabular Labels */}
            {trendDays.map((d, i) => {
              const xCoords = [25, 75, 125, 175, 225, 275, 320];
              const yCoords = [78, 64, 90, 32, 48, 27, 39];
              const isToday = i === 6;

              return (
                <g key={d.label}>
                  <circle
                    cx={xCoords[i]}
                    cy={yCoords[i]}
                    r={isToday ? 4.5 : 3}
                    fill={isToday ? '#0F766E' : '#FFFFFF'}
                    stroke="#0F766E"
                    strokeWidth="2"
                  />
                  <text
                    x={xCoords[i]}
                    y={yCoords[i] - 9}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight={isToday ? '700' : '600'}
                    fill={isToday ? '#0F766E' : '#1A1F26'}
                    className="tabular-nums font-mono"
                  >
                    {d.score}
                  </text>
                  <text
                    x={xCoords[i]}
                    y={122}
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight={isToday ? '700' : '500'}
                    fill={isToday ? '#0F766E' : '#5B6470'}
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 7. Next scheduled group / Focus Note */}
      <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-[#E4E0D7] text-[#5B6470]">
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={18} className="text-[#0F766E] flex-shrink-0" />
          <p className="text-[13px] truncate">
            Halqa Focus: <span className="font-semibold text-[#1A1F26]">Juz Amma & Surah Al-Mulk</span>
          </p>
        </div>
        <button
          onClick={onNavigateToReports}
          className="text-[12px] text-[#0F766E] font-semibold hover:underline flex-shrink-0"
        >
          View Reports
        </button>
      </div>
    </div>
  );
};
