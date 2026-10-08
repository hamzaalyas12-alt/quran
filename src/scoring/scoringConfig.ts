/**
 * Halqa Tracker - Scoring Rules Configuration
 * All rule values live here. No rule numbers hard-coded in screens.
 */

import { ScoringRulesConfig, Team } from '../types';

export const DEFAULT_SCORING_RULES: ScoringRulesConfig = {
  sabaqBase: 10,
  sabaqMistakeDeduction: 1,
  sabqiBase: 20,
  sabqiMistakeDeduction: 3,
  manzilBase: 15,
  manzilMistakeDeduction: 1,
  disciplineUniform: 2,
  disciplineBehaviour: 2,
  disciplineOnTime: 1,
  cleanBonusPerLesson: 1,
  maxCleanBonus: 3,
  notRecitedSabaq: -10,
  notRecitedSabqi: -20,
  notRecitedManzil: -15,
  dailyMinimum: -25,
  comebackBonusPoints: 3,
  comebackThresholdPct: 70, // 70% of 50 = 35
  warningLimit: 3,
  terminationPenalty: 500,
  terminationScope: 'week',
  // 0 is Sunday (holiday), 1 is Monday, etc. Default working days: Mon - Sat
  workingDays: [1, 2, 3, 4, 5, 6],
  holidays: []
};

export const DEFAULT_TEAMS: Team[] = [
  {
    id: 'team-a',
    code: 'A',
    name: 'Team A (Badr)',
    subname: 'Badr',
    arabicName: 'بدر',
    color: '#0F766E', // Deep Teal
    textColor: '#FFFFFF'
  },
  {
    id: 'team-b',
    code: 'B',
    name: 'Team B (Uhud)',
    subname: 'Uhud',
    arabicName: 'أحد',
    color: '#4F5BD5', // Indigo
    textColor: '#FFFFFF'
  },
  {
    id: 'team-c',
    code: 'C',
    name: 'Team C (Yarmouk)',
    subname: 'Yarmouk',
    arabicName: 'يرموك',
    color: '#C2456B', // Rose
    textColor: '#FFFFFF'
  }
];
