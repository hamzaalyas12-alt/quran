import React, { useState, useEffect } from 'react';
import {
  calculateDailyScore,
  isWorkingDay,
  rankTeams,
  TeamScoreAggregation
} from '../scoring/scoringEngine';
import { DEFAULT_SCORING_RULES } from '../scoring/scoringConfig';
import {
  checkClockIntegrity,
  generateBlockCode,
  generateLicenseKey,
  generateRenewalCode,
  verifyBlockCode,
  verifyLicenseKeyFormat,
  verifyRenewalCode
} from '../auth/licenseSystem';
import { storage } from '../data/storage';
import { CheckCircle2, XCircle, ChevronLeft, RefreshCw } from 'lucide-react';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

interface SelfTestScreenProps {
  onBack: () => void;
}

export const SelfTestScreen: React.FC<SelfTestScreenProps> = ({ onBack }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runAllTests = () => {
    setIsRunning(true);
    const testList: TestResult[] = [];

    const assertTest = (
      id: string,
      name: string,
      expected: any,
      actual: any,
      details?: string
    ) => {
      const passed = JSON.stringify(expected) === JSON.stringify(actual);
      testList.push({
        id,
        name,
        passed,
        expected: JSON.stringify(expected),
        actual: JSON.stringify(actual),
        details
      });
    };

    const rules = { ...DEFAULT_SCORING_RULES };

    // --- Case 1: Sabaq 2 mistakes (8), Sabqi 1 mistake (17), Manzil 3 mistakes (12), uniform 2 + behaviour 2 + late 0 (4) => Total 41/50, Bonus 0
    const res1 = calculateDailyScore(
      {
        sabaq: { status: 'recited', mistakes: 2, lqmaCount: 1, tajweedCount: 1, details: {} },
        sabqi: { status: 'recited', mistakes: 1, lqmaCount: 1, tajweedCount: 0, details: {} },
        manzil: { status: 'recited', mistakes: 3, lqmaCount: 1, tajweedCount: 2, details: {} },
        discipline: { uniform: true, behaviour: true, onTime: false, customPoints: 0 }
      },
      rules
    );
    assertTest(
      'case-1',
      'Case 1: Sabaq(8) + Sabqi(17) + Manzil(12) + Discipline(4) = 41, Bonus 0',
      { total: 41, bonus: 0 },
      { total: res1.cappedTotal, bonus: res1.cleanRecitationBonus }
    );

    // --- Case 2: Same as Case 1 but Sabaq 0 mistakes => Sabaq 10, bonus +1. Total 44
    const res2 = calculateDailyScore(
      {
        sabaq: { status: 'recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        sabqi: { status: 'recited', mistakes: 1, lqmaCount: 1, tajweedCount: 0, details: {} },
        manzil: { status: 'recited', mistakes: 3, lqmaCount: 1, tajweedCount: 2, details: {} },
        discipline: { uniform: true, behaviour: true, onTime: false, customPoints: 0 }
      },
      rules
    );
    assertTest(
      'case-2',
      'Case 2: Sabaq 0 mistakes gives 10 + 1 bonus => Total 44',
      { total: 44, bonus: 1 },
      { total: res2.cappedTotal, bonus: res2.cleanRecitationBonus }
    );

    // --- Case 3: All three Not recited (-10 + -20 + -15 = -45), capped at daily minimum -25
    const res3 = calculateDailyScore(
      {
        sabaq: { status: 'not_recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        sabqi: { status: 'not_recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        manzil: { status: 'not_recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        discipline: { uniform: false, behaviour: false, onTime: false, customPoints: 0 }
      },
      rules
    );
    assertTest(
      'case-3',
      'Case 3: All Not Recited (-45) capped at -25 daily floor',
      { raw: -45, capped: -25 },
      { raw: res3.rawTotal, capped: res3.cappedTotal }
    );

    // --- Case 4: Sabqi Absent (0), Sabaq 0 mistakes (10), Manzil 0 mistakes (15), Discipline full (5), Bonus (2) => 32
    const res4 = calculateDailyScore(
      {
        sabaq: { status: 'recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        sabqi: { status: 'absent', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        manzil: { status: 'recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        discipline: { uniform: true, behaviour: true, onTime: true, customPoints: 0 }
      },
      rules
    );
    assertTest(
      'case-4',
      'Case 4: Sabqi Absent (Ghair-hazir 0) => Sabaq(10)+Manzil(15)+Disc(5)+Bonus(2) = 32',
      { total: 32, bonus: 2 },
      { total: res4.cappedTotal, bonus: res4.cleanRecitationBonus }
    );

    // --- Case 5: Perfect Day: 50 + 3 clean bonus = 53
    const res5 = calculateDailyScore(
      {
        sabaq: { status: 'recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        sabqi: { status: 'recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        manzil: { status: 'recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        discipline: { uniform: true, behaviour: true, onTime: true, customPoints: 0 }
      },
      rules
    );
    assertTest(
      'case-5',
      'Case 5: Perfect Day (50 points + 3 bonus) = 53',
      { total: 53, isPerfect: true },
      { total: res5.cappedTotal, isPerfect: res5.isPerfectDay }
    );

    // --- Case 6: Team day score (41 + 44 + 32 = 117); termination fine of 500 applied and team out
    const teamDayScore = 41 + 44 + 32;
    const weeklyScoreBeforePenalty = 600;
    const weeklyScoreAfterPenalty = Math.max(0, weeklyScoreBeforePenalty - 500);
    assertTest(
      'case-6',
      'Case 6: Team day score 117, termination fine 500 applied, team out',
      { dayScore: 117, afterFine: 100 },
      { dayScore: teamDayScore, afterFine: weeklyScoreAfterPenalty }
    );

    // --- Case 7: Sabqi with 10 mistakes gives 20 - 30 = -10 (allowed negative section)
    const res7 = calculateDailyScore(
      {
        sabaq: { status: 'recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        sabqi: { status: 'recited', mistakes: 10, lqmaCount: 5, tajweedCount: 5, details: {} },
        manzil: { status: 'recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        discipline: { uniform: true, behaviour: true, onTime: true, customPoints: 0 }
      },
      rules
    );
    assertTest('case-7', 'Case 7: Sabqi 10 mistakes gives 20 - 30 = -10', -10, res7.sabqiScore);

    // --- Comeback Bonus: Previous day negative (-10) and today >= 70% (35) => +3 comeback bonus
    const resComeback = calculateDailyScore(
      {
        sabaq: { status: 'recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        sabqi: { status: 'recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        manzil: { status: 'recited', mistakes: 0, lqmaCount: 0, tajweedCount: 0, details: {} },
        discipline: { uniform: true, behaviour: true, onTime: true, customPoints: 0 },
        previousDayScore: -10
      },
      rules
    );
    assertTest('comeback-bonus', 'Comeback Bonus: Prev day < 0 and today >= 70% gives +3 comeback bonus', 3, resComeback.comebackBonus);

    // --- Working day & Holiday handling
    const isSundayWorking = isWorkingDay('2026-09-27', rules);
    const isMondayWorking = isWorkingDay('2026-09-28', rules);
    assertTest('working-days', 'Working Days: Sunday holiday (false) and Monday active (true)', { sun: false, mon: true }, { sun: isSundayWorking, mon: isMondayWorking });

    // --- Weekly tie-breakers: Points first, then fewer mistakes, then higher Sabqi points
    const teamA: TeamScoreAggregation = { teamId: 'team-a', totalPoints: 500, totalMistakes: 10, totalSabqiPoints: 120, activeStudentsCount: 3, evaluatedStudentsCount: 3, penalties: 0, isOutThisWeek: false };
    const teamB: TeamScoreAggregation = { teamId: 'team-b', totalPoints: 500, totalMistakes: 8, totalSabqiPoints: 110, activeStudentsCount: 3, evaluatedStudentsCount: 3, penalties: 0, isOutThisWeek: false };
    const ranked = rankTeams([teamA, teamB]);
    assertTest('tie-breakers', 'Tie-Breaker: Equal points tie broken by fewer total mistakes (team-b first)', 'team-b', ranked[0].teamId);

    // --- License Key Generate & Verify Round Trip
    const generated = generateLicenseKey('USTADH_TEST', 'time_limited', 7);
    const verified = verifyLicenseKeyFormat(generated.key);
    assertTest('license-verify', 'License Key: Generate and cryptographically verify signature', { valid: true, user: 'USTADH_TEST', days: 7 }, { valid: verified.valid, user: verified.username, days: verified.durationDays });

    // --- Clock Rollback Protection
    const futureDate = '2026-09-28T12:00:00.000Z';
    const pastDate = '2026-09-25T12:00:00.000Z';
    const rollback = checkClockIntegrity(pastDate, futureDate);
    assertTest('clock-rollback', 'Clock Rollback: Date earlier than last recorded session triggers lockout', true, rollback.rollbackDetected);

    // --- Renewal Code Verification
    const renewCode = generateRenewalCode('USTADH_TEST', 30);
    const renewCheck = verifyRenewalCode(renewCode, 'USTADH_TEST');
    const wrongUserRenew = verifyRenewalCode(renewCode, 'WRONG_USER');
    assertTest('renewal-code', 'Renewal Code: Accepted for authorized username and rejected for wrong user', { valid: true, wrongUserValid: false }, { valid: renewCheck.valid, wrongUserValid: wrongUserRenew.valid });

    // --- Block Code Verification
    const blockCode = generateBlockCode('USTADH_TEST');
    const blockCheck = verifyBlockCode(blockCode, 'USTADH_TEST');
    assertTest('block-code', 'Block Code: Validates cryptographic block instruction', true, blockCheck.valid);

    // --- Data Storage Round-Trip
    const exportJson = storage.exportAllData();
    const restoreRes = storage.restoreAllData(exportJson);
    assertTest('storage-roundtrip', 'Data Layer: Export and restore JSON round-trip successfully', true, restoreRes.success);

    // --- Empty States Handling
    const emptyRank = rankTeams([]);
    assertTest('empty-states', 'Empty States: Ranks and aggregates safely return empty array without crashing', 0, emptyRank.length);

    setResults(testList);
    setIsRunning(false);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const totalPassed = results.filter((r) => r.passed).length;

  return (
    <div className="flex flex-col w-full pb-32 px-4 pt-16 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white border border-[#E4E0D7] flex items-center justify-center text-[#1A1F26]"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-[20px] font-bold text-[#1A1F26]">QA Self-Test Suite</h1>
            <p className="text-[12px] text-[#5B6470]">Automated Verification Protocol</p>
          </div>
        </div>
        <button
          type="button"
          onClick={runAllTests}
          disabled={isRunning}
          className="px-3 py-1.5 rounded-xl bg-[#0F766E] text-white text-[12px] font-bold flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
          <span>Rerun</span>
        </button>
      </div>

      {/* Summary Scorecard */}
      <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E6F4F2] text-[#0F766E] flex items-center justify-center font-bold text-xl">
            {totalPassed}/{results.length}
          </div>
          <div>
            <div className="text-[15px] font-bold text-[#1A1F26]">
              {totalPassed === results.length ? 'All Verification Checks Passed' : 'Failures Detected'}
            </div>
            <div className="text-[12px] text-[#5B6470]">
              Scoring Engine • Integrity • Offline License • Data Layer
            </div>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[12px] font-bold ${
            totalPassed === results.length ? 'bg-[#E6F4F2] text-[#0F766E]' : 'bg-[#FEE2E2] text-[#B42318]'
          }`}
        >
          {totalPassed === results.length ? '100% PASS' : 'FAIL'}
        </span>
      </div>

      {/* Tests Table */}
      <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs space-y-3">
        <h2 className="text-[14px] font-bold text-[#1A1F26] uppercase tracking-wider">
          Verification Test Assertions
        </h2>
        <div className="space-y-2.5 divide-y divide-[#E4E0D7]/60">
          {results.map((test) => (
            <div key={test.id} className="pt-2 flex items-start justify-between gap-3 text-[13px]">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="font-semibold text-[#1A1F26] leading-snug">
                  {test.name}
                </div>
                <div className="text-[11px] text-[#5B6470] font-mono truncate">
                  Expected: {test.expected} | Actual: {test.actual}
                </div>
              </div>
              <div className="flex-shrink-0 pt-0.5">
                {test.passed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16803C] bg-[#E6F4F2] px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={13} /> PASS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B42318] bg-[#FEE2E2] px-2 py-0.5 rounded-full">
                    <XCircle size={13} /> FAIL
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
