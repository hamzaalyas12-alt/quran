/**
 * Halqa Tracker - Core Types & Data Definitions
 */

export type RecitationStatus = 'recited' | 'not_recited' | 'absent';

export type MistakeType = 'lqma' | 'tajweed';

export interface PortionDetails {
  para?: number;
  surah?: string;
  ayahFrom?: number;
  ayahTo?: number;
  pageFrom?: number;
  pageTo?: number;
  note?: string;
}

export interface LessonEvaluation {
  status: RecitationStatus;
  mistakes: number;
  lqmaCount: number;
  tajweedCount: number;
  details: PortionDetails;
}

export interface DisciplineEvaluation {
  uniform: boolean;   // default 2 pts
  behaviour: boolean; // default 2 pts
  onTime: boolean;    // default 1 pt
  customPoints: number; // ad-hoc + or -
  customReason?: string;
}

export interface DailyStudentRecord {
  id: string; // `${studentId}_${date}`
  studentId: string;
  teamId: string;
  date: string; // YYYY-MM-DD
  sabaq: LessonEvaluation;
  sabqi: LessonEvaluation;
  manzil: LessonEvaluation;
  discipline: DisciplineEvaluation;
  // Computed & cached results
  sabaqScore: number;
  sabqiScore: number;
  manzilScore: number;
  disciplineScore: number;
  cleanRecitationBonus: number; // 0 to 3
  comebackBonus: number;        // 0 or 3
  rawTotal: number;
  cappedTotal: number;          // after dailyMinimum cap
  recitationDurationSeconds?: number;
  teacherNote?: string;
  isDraft: boolean;
  savedAt?: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  name: string;
  arabicName?: string;
  teamId: string;
  active: boolean;
  enrolledAt: string;
  notes?: string;
  currentPara?: number;
  currentSurah?: string;
}

export interface Team {
  id: string; // 'team-a', 'team-b', 'team-c'
  code: 'A' | 'B' | 'C';
  name: string; // e.g. "Team A (Badr)"
  subname: string; // "Badr", "Uhud", "Yarmouk"
  arabicName?: string;
  color: string; // Hex code
  textColor: string;
}

export interface WarningRecord {
  id: string;
  studentId: string;
  studentName: string;
  teamId: string;
  date: string;
  reason: string;
  isUndone: boolean;
  createdAt: string;
}

export interface TerminationRecord {
  id: string;
  studentId: string;
  studentName: string;
  teamId: string;
  date: string;
  reason: string;
  penaltyPoints: number; // -500
  isUndone: boolean;
  createdAt: string;
}

export interface FineRecord {
  id: string;
  studentId: string;
  studentName: string;
  teamId: string;
  date: string; // YYYY-MM-DD
  amount: number; // Fine amount in Rs.
  currency?: string; // default 'Rs.'
  reason: string;
  status: 'pending' | 'paid' | 'waived';
  paidAt?: string;
  notes?: string;
  createdAt: string;
}

export interface ScoringRulesConfig {
  sabaqBase: number;             // default 10
  sabaqMistakeDeduction: number; // default 1
  sabqiBase: number;             // default 20
  sabqiMistakeDeduction: number; // default 3
  manzilBase: number;            // default 15
  manzilMistakeDeduction: number;// default 1
  disciplineUniform: number;     // default 2
  disciplineBehaviour: number;   // default 2
  disciplineOnTime: number;      // default 1
  cleanBonusPerLesson: number;   // default 1
  maxCleanBonus: number;         // default 3
  notRecitedSabaq: number;       // default -10
  notRecitedSabqi: number;       // default -20
  notRecitedManzil: number;      // default -15
  dailyMinimum: number;          // default -25
  comebackBonusPoints: number;   // default 3
  comebackThresholdPct: number;  // default 70 (e.g. 35/50)
  warningLimit: number;          // default 3
  terminationPenalty: number;    // default 500
  terminationScope: 'week' | 'term'; // default 'week'
  workingDays: number[];         // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  holidays: string[];            // YYYY-MM-DD
}

export type LicenseType = 'master' | 'time_limited';
export type LicenseStatus = 'active' | 'expired' | 'blocked';

export interface LicenseRecord {
  id: string;
  username: string;
  key: string;
  type: LicenseType;
  durationDays: number; // 0 for master (lifetime)
  issuedAt: string;     // ISO timestamp
  activatedAt?: string; // ISO timestamp when first used on device
  deviceId?: string;    // Binds to device
  status: LicenseStatus;
  lastUsedAt?: string;
  blockReason?: string;
}

export interface AppSettings {
  scoringRules: ScoringRulesConfig;
  teacherName: string;
  halqaName: string;
  termName: string;
  teacherPin: string | null;
  pinLockEnabled: boolean;
  pinLockTimeoutMinutes: number;
  language: 'en' | 'ur' | 'roman_ur';
  soundEnabled: boolean;
  lastBackupDate?: string;
}

export type ActiveTab = 'home' | 'class' | 'teams' | 'reports';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'warning' | 'error' | 'info';
}
