/**
 * Halqa Tracker - Pure Scoring Engine
 * Implements deterministic calculation for student recitation, discipline,
 * bonuses, daily caps, team aggregates, and tie-breakers.
 */

import {
  DailyStudentRecord,
  DisciplineEvaluation,
  LessonEvaluation,
  ScoringRulesConfig
} from '../types';

export interface EvaluationInput {
  sabaq: LessonEvaluation;
  sabqi: LessonEvaluation;
  manzil: LessonEvaluation;
  discipline: DisciplineEvaluation;
  previousDayScore?: number | null; // For comeback bonus check
}

export interface ScoreCalculationResult {
  sabaqScore: number;
  sabqiScore: number;
  manzilScore: number;
  disciplineScore: number;
  cleanRecitationBonus: number;
  comebackBonus: number;
  rawTotal: number;
  cappedTotal: number;
  isPerfectDay: boolean;
  totalMistakes: number;
  isAbsentDay: boolean; // if all 3 are absent
}

/**
 * Calculates scores for a single lesson based on rules
 */
export function calculateLessonScore(
  lesson: LessonEvaluation,
  basePoints: number,
  deductionPerMistake: number,
  notRecitedPoints: number
): { score: number; cleanBonus: number } {
  if (lesson.status === 'absent') {
    return { score: 0, cleanBonus: 0 };
  }

  if (lesson.status === 'not_recited') {
    // notRecitedPoints is typically negative, e.g. -10
    const deduction = notRecitedPoints > 0 ? -notRecitedPoints : notRecitedPoints;
    return { score: deduction, cleanBonus: 0 };
  }

  // Recited status: base points minus mistakes * deduction
  // Can go negative if mistakes exceed base points (as in Test Case 7)
  const score = basePoints - (lesson.mistakes * deductionPerMistake);
  const cleanBonus = lesson.mistakes === 0 ? 1 : 0;
  return { score, cleanBonus };
}

/**
 * Calculates student daily scores given lesson & discipline inputs
 */
export function calculateDailyScore(
  input: EvaluationInput,
  rules: ScoringRulesConfig
): ScoreCalculationResult {
  const { sabaq, sabqi, manzil, discipline, previousDayScore } = input;

  // 1. Lesson Scores
  const sabaqResult = calculateLessonScore(
    sabaq,
    rules.sabaqBase,
    rules.sabaqMistakeDeduction,
    rules.notRecitedSabaq
  );

  const sabqiResult = calculateLessonScore(
    sabqi,
    rules.sabqiBase,
    rules.sabqiMistakeDeduction,
    rules.notRecitedSabqi
  );

  const manzilResult = calculateLessonScore(
    manzil,
    rules.manzilBase,
    rules.manzilMistakeDeduction,
    rules.notRecitedManzil
  );

  // 2. Discipline Score
  let disciplineScore = 0;
  if (discipline.uniform) disciplineScore += rules.disciplineUniform;
  if (discipline.behaviour) disciplineScore += rules.disciplineBehaviour;
  if (discipline.onTime) disciplineScore += rules.disciplineOnTime;
  if (discipline.customPoints) disciplineScore += discipline.customPoints;

  // 3. Clean Recitation Bonus (Max 3: +1 for each recited lesson with 0 mistakes)
  const totalCleanBonus = Math.min(
    rules.maxCleanBonus,
    (sabaqResult.cleanBonus * rules.cleanBonusPerLesson) +
    (sabqiResult.cleanBonus * rules.cleanBonusPerLesson) +
    (manzilResult.cleanBonus * rules.cleanBonusPerLesson)
  );

  // 4. Comeback Bonus
  // If student had a negative day yesterday (< 0) and scores >= 70% of 50 (= 35) today
  let comebackBonus = 0;
  const currentSubtotal = sabaqResult.score + sabqiResult.score + manzilResult.score + disciplineScore;
  const baseDenominator = rules.sabaqBase + rules.sabqiBase + rules.manzilBase + rules.disciplineUniform + rules.disciplineBehaviour + rules.disciplineOnTime; // 50
  const thresholdPoints = (baseDenominator * rules.comebackThresholdPct) / 100; // 35

  if (previousDayScore !== undefined && previousDayScore !== null && previousDayScore < 0) {
    if (currentSubtotal >= thresholdPoints) {
      comebackBonus = rules.comebackBonusPoints;
    }
  }

  // 5. Total and Daily Cap
  const rawTotal = currentSubtotal + totalCleanBonus + comebackBonus;
  const cappedTotal = Math.max(rules.dailyMinimum, rawTotal);

  const totalMistakes =
    (sabaq.status === 'recited' ? sabaq.mistakes : 0) +
    (sabqi.status === 'recited' ? sabqi.mistakes : 0) +
    (manzil.status === 'recited' ? manzil.mistakes : 0);

  const isAbsentDay =
    sabaq.status === 'absent' &&
    sabqi.status === 'absent' &&
    manzil.status === 'absent';

  const isPerfectDay =
    sabaq.status === 'recited' && sabaq.mistakes === 0 &&
    sabqi.status === 'recited' && sabqi.mistakes === 0 &&
    manzil.status === 'recited' && manzil.mistakes === 0 &&
    discipline.uniform && discipline.behaviour && discipline.onTime;

  return {
    sabaqScore: sabaqResult.score,
    sabqiScore: sabqiResult.score,
    manzilScore: manzilResult.score,
    disciplineScore,
    cleanRecitationBonus: totalCleanBonus,
    comebackBonus,
    rawTotal,
    cappedTotal,
    isPerfectDay,
    totalMistakes,
    isAbsentDay
  };
}

/**
 * Check if a date string YYYY-MM-DD is a working day according to rules
 */
export function isWorkingDay(dateStr: string, rules: ScoringRulesConfig): boolean {
  if (rules.holidays.includes(dateStr)) {
    return false;
  }
  const date = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = date.getDay(); // 0 is Sunday
  return rules.workingDays.includes(dayOfWeek);
}

export interface TeamScoreAggregation {
  teamId: string;
  totalPoints: number;
  totalMistakes: number;
  totalSabqiPoints: number;
  activeStudentsCount: number;
  evaluatedStudentsCount: number;
  penalties: number;
  isOutThisWeek: boolean;
  outReason?: string;
}

/**
 * Rank teams applying tie-breakers:
 * 1. Higher total points (after penalties)
 * 2. Fewer total mistakes
 * 3. Higher Sabqi points
 */
export function rankTeams(teams: TeamScoreAggregation[]): TeamScoreAggregation[] {
  return [...teams].sort((a, b) => {
    // If one is out and one is active, active ranks higher
    if (a.isOutThisWeek && !b.isOutThisWeek) return 1;
    if (!a.isOutThisWeek && b.isOutThisWeek) return -1;

    // 1. Total Points
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    // 2. Fewer mistakes
    if (a.totalMistakes !== b.totalMistakes) {
      return a.totalMistakes - b.totalMistakes;
    }
    // 3. Higher Sabqi points
    return b.totalSabqiPoints - a.totalSabqiPoints;
  });
}
