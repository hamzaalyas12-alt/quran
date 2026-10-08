/**
 * Halqa Tracker - Demo Data Generator
 * Generates 1 week of realistic records, mistake breakdown, attendance,
 * and team penalties so that all screens, charts, and podiums look full and lively.
 */

import { DailyStudentRecord, FineRecord, TerminationRecord, WarningRecord } from '../types';
import { DEFAULT_SEED_STUDENTS, storage } from './storage';
import { calculateDailyScore } from '../scoring/scoringEngine';
import { DEFAULT_SCORING_RULES } from '../scoring/scoringConfig';

export function loadDemoData(): void {
  // 1. Reset base students
  storage.clearAllData();
  const students = DEFAULT_SEED_STUDENTS;
  students.forEach(s => storage.saveStudent(s));

  // 2. Generate 7 days of historical records
  const records: DailyStudentRecord[] = [];
  const today = new Date();

  // Create records for the last 7 days
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const dateStr = d.toISOString().split('T')[0];

    students.forEach((student, index) => {
      // Deterministic variations per student and day
      let sabaqMistakes = 0;
      let sabqiMistakes = 0;
      let manzilMistakes = 0;
      let isAbsent = false;

      if (student.id === 'std-1') {
        // Zayd Al-Ansari (Consistent top scorer)
        sabaqMistakes = offset === 0 ? 1 : (offset % 2);
        sabqiMistakes = 0;
        manzilMistakes = 0;
      } else if (student.id === 'std-2') {
        // Hamza Khan (Champion - perfect days)
        sabaqMistakes = 0;
        sabqiMistakes = 0;
        manzilMistakes = 0;
      } else if (student.id === 'std-3') {
        // Tariq Mahmood (1-2 mistakes)
        sabaqMistakes = 1;
        sabqiMistakes = 1;
        manzilMistakes = 1;
      } else if (student.id === 'std-8') {
        // Qasim N. (High mistakes, terminated on day 2)
        sabaqMistakes = 3;
        sabqiMistakes = 4;
        manzilMistakes = 2;
      } else if (student.id === 'std-6' && offset === 1) {
        // Salman Al-Farsi absent on one day
        isAbsent = true;
      } else {
        sabaqMistakes = (index + offset) % 3;
        sabqiMistakes = (index * 2 + offset) % 2;
        manzilMistakes = (index + offset) % 2;
      }

      const sabaqStatus = isAbsent ? 'absent' : 'recited';
      const sabqiStatus = isAbsent ? 'absent' : 'recited';
      const manzilStatus = isAbsent ? 'absent' : 'recited';

      const sabaq = {
        status: sabaqStatus as any,
        mistakes: sabaqMistakes,
        lqmaCount: Math.ceil(sabaqMistakes / 2),
        tajweedCount: Math.floor(sabaqMistakes / 2),
        details: {
          para: student.currentPara || 30,
          surah: student.currentSurah || 'Al-Mulk',
          ayahFrom: 1,
          ayahTo: 20
        }
      };

      const sabqi = {
        status: sabqiStatus as any,
        mistakes: sabqiMistakes,
        lqmaCount: sabqiMistakes,
        tajweedCount: 0,
        details: {
          para: (student.currentPara || 30) - 1,
          surah: 'Revision',
          ayahFrom: 1,
          ayahTo: 30
        }
      };

      const manzil = {
        status: manzilStatus as any,
        mistakes: manzilMistakes,
        lqmaCount: 0,
        tajweedCount: manzilMistakes,
        details: {
          para: 5,
          surah: 'Quarter Juz',
          ayahFrom: 1,
          ayahTo: 50
        }
      };

      const discipline = {
        uniform: true,
        behaviour: true,
        onTime: offset !== 3, // slightly late once
        customPoints: 0
      };

      const calc = calculateDailyScore({ sabaq, sabqi, manzil, discipline }, DEFAULT_SCORING_RULES);

      const record: DailyStudentRecord = {
        id: `${student.id}_${dateStr}`,
        studentId: student.id,
        teamId: student.teamId,
        date: dateStr,
        sabaq,
        sabqi,
        manzil,
        discipline,
        sabaqScore: calc.sabaqScore,
        sabqiScore: calc.sabqiScore,
        manzilScore: calc.manzilScore,
        disciplineScore: calc.disciplineScore,
        cleanRecitationBonus: calc.cleanRecitationBonus,
        comebackBonus: calc.comebackBonus,
        rawTotal: calc.rawTotal,
        cappedTotal: calc.cappedTotal,
        recitationDurationSeconds: 180 + (index * 15),
        isDraft: false,
        savedAt: new Date(d.getTime() + 1000 * 60 * 60 * 10).toISOString(),
        updatedAt: new Date(d.getTime() + 1000 * 60 * 60 * 10).toISOString()
      };
      records.push(record);
    });
  }

  storage.saveDailyRecordsBatch(records);

  // 3. Add Tariq warning
  const warning1: WarningRecord = {
    id: 'warn-1',
    studentId: 'std-3',
    studentName: 'Tariq Mahmood',
    teamId: 'team-a',
    date: today.toISOString().split('T')[0],
    reason: 'Repeated late arrival to Fajr circle without notification',
    isUndone: false,
    createdAt: new Date().toISOString()
  };
  storage.addWarning(warning1);

  // 4. Add Qasim 3 warnings + Termination for Team C penalty
  const qasimDate = today.toISOString().split('T')[0];
  const qasimWarn1: WarningRecord = {
    id: 'warn-q1',
    studentId: 'std-8',
    studentName: 'Qasim N.',
    teamId: 'team-c',
    date: qasimDate,
    reason: 'Misbehaviour in recitation circle',
    isUndone: false,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
  };
  const qasimWarn2: WarningRecord = {
    id: 'warn-q2',
    studentId: 'std-8',
    studentName: 'Qasim N.',
    teamId: 'team-c',
    date: qasimDate,
    reason: 'Unprepared 3 consecutive days',
    isUndone: false,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  };
  const qasimWarn3: WarningRecord = {
    id: 'warn-q3',
    studentId: 'std-8',
    studentName: 'Qasim N.',
    teamId: 'team-c',
    date: qasimDate,
    reason: 'Severe Adab violation during teacher lecture',
    isUndone: false,
    createdAt: new Date().toISOString()
  };
  storage.addWarning(qasimWarn1);
  storage.addWarning(qasimWarn2);
  storage.addWarning(qasimWarn3);

  const termination: TerminationRecord = {
    id: 'term-1',
    studentId: 'std-8',
    studentName: 'Qasim N.',
    teamId: 'team-c',
    date: qasimDate,
    reason: 'Discipline Rule 4: 3 cumulative warnings triggered termination',
    penaltyPoints: 500,
    isUndone: false,
    createdAt: new Date().toISOString()
  };
  storage.addTermination(termination);

  // 5. Seed some fines
  const fine1: FineRecord = {
    id: 'fine-demo-1',
    studentId: 'std-3',
    studentName: 'Tariq Mahmood',
    teamId: 'team-a',
    date: qasimDate,
    amount: 50,
    currency: 'Rs.',
    reason: 'دیر سے آمد (Late Arrival)',
    status: 'pending',
    notes: 'Arrived 15 minutes late without prior intimation',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  };
  const fine2: FineRecord = {
    id: 'fine-demo-2',
    studentId: 'std-8',
    studentName: 'Qasim N.',
    teamId: 'team-c',
    date: qasimDate,
    amount: 100,
    currency: 'Rs.',
    reason: 'حلقے میں شور و خلل (Classroom Disturbance)',
    status: 'pending',
    notes: 'Repeated talking during student recitation',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString()
  };
  const fine3: FineRecord = {
    id: 'fine-demo-3',
    studentId: 'std-5',
    studentName: 'Umar Farooq',
    teamId: 'team-b',
    date: qasimDate,
    amount: 20,
    currency: 'Rs.',
    reason: 'یونیفارم یا ٹوپی کی کمی (Uniform / Etiquette Issue)',
    status: 'paid',
    paidAt: new Date().toISOString(),
    notes: 'Paid immediately at circle close',
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString()
  };
  storage.addFine(fine1);
  storage.addFine(fine2);
  storage.addFine(fine3);
}
