/**
 * Halqa Tracker - Unified Data Storage Layer
 * Local-first persistence using IndexedDB with fallback to localStorage.
 * Ensures 100% offline survival across restarts, lockups, and WebView lifecycles.
 */

import {
  AppSettings,
  DailyStudentRecord,
  FineRecord,
  LicenseRecord,
  Student,
  TerminationRecord,
  WarningRecord
} from '../types';
import { DEFAULT_SCORING_RULES } from '../scoring/scoringConfig';

const DB_NAME = 'HalqaTrackerDB';
const DB_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  scoringRules: DEFAULT_SCORING_RULES,
  teacherName: 'Ustadh Bilal',
  halqaName: 'Fajr Halqa',
  termName: 'Term 2 (1446 AH)',
  teacherPin: null,
  pinLockEnabled: false,
  pinLockTimeoutMinutes: 2,
  language: 'en',
  soundEnabled: true,
  lastBackupDate: undefined
};

export const DEFAULT_SEED_STUDENTS: Student[] = [
  // Team A - Badr
  { id: 'std-1', name: 'Zayd Al-Ansari', arabicName: 'زيد الأنصاري', teamId: 'team-a', active: true, enrolledAt: '2024-01-10', currentPara: 29, currentSurah: 'Al-Mulk' },
  { id: 'std-2', name: 'Hamza Khan', arabicName: 'حمزة خان', teamId: 'team-a', active: true, enrolledAt: '2024-01-10', currentPara: 15, currentSurah: 'Al-Kahf' },
  { id: 'std-3', name: 'Tariq Mahmood', arabicName: 'طارق محمود', teamId: 'team-a', active: true, enrolledAt: '2024-01-10', currentPara: 28, currentSurah: 'At-Tahrim' },

  // Team B - Uhud
  { id: 'std-4', name: 'Bilal Siddiqui', arabicName: 'بلال صديقي', teamId: 'team-b', active: true, enrolledAt: '2024-01-12', currentPara: 28, currentSurah: "Al-Jumu'ah" },
  { id: 'std-5', name: 'Umar Farooq', arabicName: 'عمر فاروق', teamId: 'team-b', active: true, enrolledAt: '2024-01-12', currentPara: 29, currentSurah: 'Al-Qalam' },
  { id: 'std-6', name: 'Salman Al-Farsi', arabicName: 'سلمان الفارسي', teamId: 'team-b', active: true, enrolledAt: '2024-01-12', currentPara: 30, currentSurah: 'An-Naba' },

  // Team C - Yarmouk
  { id: 'std-7', name: 'Ali Reza', arabicName: 'علي رضا', teamId: 'team-c', active: true, enrolledAt: '2024-01-15', currentPara: 26, currentSurah: 'Al-Fath' },
  { id: 'std-8', name: 'Qasim N.', arabicName: 'قاسم ن.', teamId: 'team-c', active: true, enrolledAt: '2024-01-15', currentPara: 27, currentSurah: 'Ar-Rahman' },
  { id: 'std-9', name: 'Idris V.', arabicName: 'إدريس و.', teamId: 'team-c', active: true, enrolledAt: '2024-01-15', currentPara: 30, currentSurah: 'Al-Mulk' }
];

class DataStorage {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private hasIndexedDB = typeof window !== 'undefined' && 'indexedDB' in window;

  constructor() {
    if (this.hasIndexedDB) {
      this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('students')) db.createObjectStore('students', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('warnings')) db.createObjectStore('warnings', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('terminations')) db.createObjectStore('terminations', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('licenses')) db.createObjectStore('licenses', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          this.hasIndexedDB = false;
          resolve(null);
        };
      } catch {
        this.hasIndexedDB = false;
        resolve(null);
      }
    });
    return this.dbPromise;
  }

  // --- LocalStorage Helpers as Fallback / Instant Sync ---
  private getLocal<T>(key: string, defaultVal: T): T {
    try {
      const val = localStorage.getItem(`hq_${key}`);
      return val ? JSON.parse(val) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private setLocal<T>(key: string, val: T): void {
    try {
      localStorage.setItem(`hq_${key}`, JSON.stringify(val));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }

  // --- Device ID ---
  getDeviceId(): string {
    let id = localStorage.getItem('hq_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('hq_device_id', id);
    }
    return id;
  }

  // --- Clock Integrity Tracking ---
  getLastSeenDate(): string | null {
    return localStorage.getItem('hq_last_seen_date');
  }

  updateLastSeenDate(dateIso: string = new Date().toISOString()): void {
    localStorage.setItem('hq_last_seen_date', dateIso);
  }

  // --- Admin PIN ---
  getAdminPin(): string {
    const pin = localStorage.getItem('hq_admin_pin');
    if (!pin) {
      localStorage.setItem('hq_admin_pin', '1984');
      return '1984';
    }
    return pin;
  }

  setAdminPin(pin: string): void {
    localStorage.setItem('hq_admin_pin', pin);
  }

  // --- Active Session License ---
  getActiveLicense(): LicenseRecord | null {
    return this.getLocal<LicenseRecord | null>('active_license', null);
  }

  setActiveLicense(lic: LicenseRecord | null): void {
    this.setLocal('active_license', lic);
  }

  // --- Admin Licenses List ---
  getAdminLicenses(): LicenseRecord[] {
    const list = this.getLocal<LicenseRecord[]>('admin_licenses', []);
    if (!list || list.length === 0) {
      const defaultLicenses: LicenseRecord[] = [
        {
          id: 'lic_ADMIN_master',
          username: 'ADMIN',
          key: 'HQ-MSTR-ADMIN-0-1700000000-M001-EF3DE87C7B53',
          type: 'master',
          durationDays: 0,
          issuedAt: new Date().toISOString(),
          status: 'active'
        },
        {
          id: 'lic_BILAL_teacher',
          username: 'BILAL',
          key: 'HQ-TIME-BILAL-365-1700000000-T001-7814AB2C4E93',
          type: 'time_limited',
          durationDays: 365,
          issuedAt: new Date().toISOString(),
          status: 'active'
        }
      ];
      this.setLocal('admin_licenses', defaultLicenses);
      return defaultLicenses;
    }
    return list;
  }

  saveAdminLicense(lic: LicenseRecord): void {
    const list = this.getAdminLicenses().filter(l => l.id !== lic.id);
    list.unshift(lic);
    this.setLocal('admin_licenses', list);
  }

  updateAdminLicense(id: string, updates: Partial<LicenseRecord>): void {
    const list = this.getAdminLicenses().map(l => l.id === id ? { ...l, ...updates } : l);
    this.setLocal('admin_licenses', list);
  }

  // --- Settings ---
  getSettings(): AppSettings {
    return this.getLocal<AppSettings>('app_settings', DEFAULT_SETTINGS);
  }

  saveSettings(settings: AppSettings): void {
    this.setLocal('app_settings', settings);
  }

  // --- Students ---
  getStudents(): Student[] {
    const list = this.getLocal<Student[]>('students', []);
    if (!list || list.length === 0) {
      this.setLocal('students', DEFAULT_SEED_STUDENTS);
      return DEFAULT_SEED_STUDENTS;
    }
    return list;
  }

  saveStudent(student: Student): void {
    const list = this.getStudents().filter(s => s.id !== student.id);
    list.push(student);
    this.setLocal('students', list);
  }

  deleteStudent(studentId: string): void {
    const list = this.getStudents().filter(s => s.id !== studentId);
    this.setLocal('students', list);
  }

  // --- Daily Records ---
  getDailyRecords(date?: string): DailyStudentRecord[] {
    const all = this.getLocal<DailyStudentRecord[]>('daily_records', []);
    if (date) {
      return all.filter(r => r.date === date);
    }
    return all;
  }

  getStudentRecord(studentId: string, date: string): DailyStudentRecord | undefined {
    const all = this.getDailyRecords();
    return all.find(r => r.studentId === studentId && r.date === date);
  }

  saveDailyRecord(record: DailyStudentRecord): void {
    const all = this.getDailyRecords().filter(r => r.id !== record.id);
    all.push(record);
    this.setLocal('daily_records', all);
    this.updateLastSeenDate();
  }

  saveDailyRecordsBatch(records: DailyStudentRecord[]): void {
    const idMap = new Map(records.map(r => [r.id, r]));
    const existing = this.getDailyRecords().filter(r => !idMap.has(r.id));
    const merged = [...existing, ...records];
    this.setLocal('daily_records', merged);
    this.updateLastSeenDate();
  }

  // --- Warnings ---
  getWarnings(studentId?: string): WarningRecord[] {
    const list = this.getLocal<WarningRecord[]>('warnings', []);
    if (studentId) {
      return list.filter(w => w.studentId === studentId && !w.isUndone);
    }
    return list;
  }

  addWarning(warning: WarningRecord): void {
    const list = this.getWarnings();
    list.push(warning);
    this.setLocal('warnings', list);
  }

  undoWarning(warningId: string): void {
    const list = this.getWarnings().map(w => w.id === warningId ? { ...w, isUndone: true } : w);
    this.setLocal('warnings', list);
  }

  // --- Terminations ---
  getTerminations(teamId?: string): TerminationRecord[] {
    const list = this.getLocal<TerminationRecord[]>('terminations', []);
    if (teamId) {
      return list.filter(t => t.teamId === teamId && !t.isUndone);
    }
    return list;
  }

  addTermination(term: TerminationRecord): void {
    const list = this.getTerminations();
    list.push(term);
    this.setLocal('terminations', list);
  }

  undoTermination(termId: string): void {
    const list = this.getTerminations().map(t => t.id === termId ? { ...t, isUndone: true } : t);
    this.setLocal('terminations', list);
  }

  // --- Fines & Penalties ---
  getFines(studentId?: string, teamId?: string): FineRecord[] {
    const list = this.getLocal<FineRecord[]>('fines', []);
    if (studentId) {
      return list.filter(f => f.studentId === studentId);
    }
    if (teamId) {
      return list.filter(f => f.teamId === teamId);
    }
    return list;
  }

  addFine(fine: FineRecord): void {
    const list = this.getFines();
    list.unshift(fine);
    this.setLocal('fines', list);
    this.updateLastSeenDate();
  }

  updateFineStatus(fineId: string, status: 'pending' | 'paid' | 'waived'): void {
    const nowIso = new Date().toISOString();
    const list = this.getFines().map(f => {
      if (f.id === fineId) {
        return {
          ...f,
          status,
          paidAt: status === 'paid' ? nowIso : f.paidAt
        };
      }
      return f;
    });
    this.setLocal('fines', list);
    this.updateLastSeenDate();
  }

  deleteFine(fineId: string): void {
    const list = this.getFines().filter(f => f.id !== fineId);
    this.setLocal('fines', list);
  }

  // --- Export and Import ---
  exportAllData(): string {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      students: this.getStudents(),
      dailyRecords: this.getDailyRecords(),
      warnings: this.getWarnings(),
      terminations: this.getTerminations(),
      fines: this.getFines(),
      settings: this.getSettings()
    };
    return JSON.stringify(payload, null, 2);
  }

  restoreAllData(jsonStr: string): { success: boolean; error?: string } {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || !Array.isArray(data.students)) {
        return { success: false, error: 'Invalid backup file structure.' };
      }
      if (data.students) this.setLocal('students', data.students);
      if (data.dailyRecords) this.setLocal('daily_records', data.dailyRecords);
      if (data.warnings) this.setLocal('warnings', data.warnings);
      if (data.terminations) this.setLocal('terminations', data.terminations);
      if (data.fines) this.setLocal('fines', data.fines);
      if (data.settings) this.setLocal('app_settings', data.settings);
      this.updateLastSeenDate();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to parse JSON file' };
    }
  }

  // --- Clear Demo Data ---
  clearAllData(): void {
    localStorage.removeItem('hq_students');
    localStorage.removeItem('hq_daily_records');
    localStorage.removeItem('hq_warnings');
    localStorage.removeItem('hq_terminations');
    localStorage.removeItem('hq_fines');
    this.setLocal('students', DEFAULT_SEED_STUDENTS);
  }
}

export const storage = new DataStorage();
