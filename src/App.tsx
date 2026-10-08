import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ActiveTab,
  AppSettings,
  DailyStudentRecord,
  LicenseRecord,
  Student,
  TerminationRecord,
  ToastMessage,
  WarningRecord
} from './types';
import { storage } from './data/storage';
import { Navbar } from './components/Navbar';
import { TopHeader } from './components/TopHeader';
import { Toast } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';
import { PinLockModal } from './components/PinLockModal';
import { LanguageCode } from './i18n/translations';

// Screens
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ClassSessionScreen } from './screens/ClassSessionScreen';
import { TeamsScreen } from './screens/TeamsScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { StudentProfileScreen } from './screens/StudentProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AdminPanelScreen } from './screens/AdminPanelScreen';
import { SelfTestScreen } from './screens/SelfTestScreen';

export default function App() {
  // 1. Persistent Storage State
  const [activeLicense, setActiveLicense] = useState<LicenseRecord | null>(() => storage.getActiveLicense());
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [students, setStudents] = useState<Student[]>(() => storage.getStudents());
  const [dailyRecords, setDailyRecords] = useState<DailyStudentRecord[]>(() => storage.getDailyRecords());
  const [warnings, setWarnings] = useState<WarningRecord[]>(() => storage.getWarnings());
  const [terminations, setTerminations] = useState<TerminationRecord[]>(() => storage.getTerminations());

  // 2. Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [currentView, setCurrentView] = useState<'main' | 'student_profile' | 'settings' | 'admin' | 'selftest'>('main');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // 3. UI Overlays State
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showTeacherPinLock, setShowTeacherPinLock] = useState(false);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [isAdminPinSetup, setIsAdminPinSetup] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);

  // Today's Date String YYYY-MM-DD
  const todayDate = useMemoDate();

  // Reload all records from local storage
  const refreshAllData = useCallback(() => {
    setStudents(storage.getStudents());
    setDailyRecords(storage.getDailyRecords());
    setWarnings(storage.getWarnings());
    setTerminations(storage.getTerminations());
    setSettings(storage.getSettings());
    setActiveLicense(storage.getActiveLicense());
  }, []);

  const showToast = useCallback((text: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ id: `t_${Date.now()}`, text, type });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 2800);
  }, []);

  // --- Android Back Button Handling (In-App History Navigation) ---
  useEffect(() => {
    window.history.replaceState({ screen: 'root' }, '');

    const handlePopState = () => {
      if (currentView !== 'main') {
        setCurrentView('main');
        setSelectedStudent(null);
      } else if (activeTab !== 'home') {
        setActiveTab('home');
      } else {
        setShowExitConfirm(true);
        window.history.pushState({ screen: 'root' }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentView, activeTab]);

  const navigateTo = (view: 'main' | 'student_profile' | 'settings' | 'admin' | 'selftest', student?: Student) => {
    window.history.pushState({ screen: view }, '');
    if (student) setSelectedStudent(student);
    setCurrentView(view);
  };

  // --- Idle Timeout for Teacher PIN Lock ---
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (settings.pinLockEnabled && settings.teacherPin && activeLicense) {
      const timeoutMs = (settings.pinLockTimeoutMinutes || 2) * 60 * 1000;
      idleTimerRef.current = setTimeout(() => {
        setShowTeacherPinLock(true);
      }, timeoutMs);
    }
  }, [settings.pinLockEnabled, settings.teacherPin, settings.pinLockTimeoutMinutes, activeLicense]);

  useEffect(() => {
    const handleActivity = () => resetIdleTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [resetIdleTimer]);

  // --- Admin Entry Handling ---
  const handleOpenAdminPinFromLogin = () => {
    const existingAdminPin = storage.getAdminPin();
    if (!existingAdminPin) {
      setIsAdminPinSetup(true);
    } else {
      setIsAdminPinSetup(false);
    }
    setShowAdminPinModal(true);
  };

  const handleAdminPinSuccess = (pin: string) => {
    if (isAdminPinSetup) {
      storage.setAdminPin(pin);
      showToast('Admin PIN set successfully!', 'success');
      setIsAdminPinSetup(false);
    }
    setShowAdminPinModal(false);
    navigateTo('admin');
  };

  // Logout handler
  const handleLogout = () => {
    storage.setActiveLicense(null);
    setActiveLicense(null);
    setCurrentView('main');
    showToast('Signed out. Screen locked.', 'info');
  };

  // Language change handler
  const handleSelectLanguage = (lang: LanguageCode) => {
    const updated = { ...settings, language: lang };
    storage.saveSettings(updated);
    setSettings(updated);
    showToast(`Language switched to ${lang.toUpperCase()}`, 'info');
  };

  // Sound toggle handler
  const handleToggleSound = () => {
    const nextSound = !(settings.soundEnabled ?? true);
    const updated = { ...settings, soundEnabled: nextSound };
    storage.saveSettings(updated);
    setSettings(updated);
    showToast(nextSound ? 'Audio feedback enabled' : 'Audio feedback muted', 'info');
  };

  // If not logged in and not in admin panel/self-test, show Login
  if (!activeLicense && currentView !== 'admin' && currentView !== 'selftest') {
    return (
      <div className="h-full bg-[#F7F5F0]">
        <LoginScreen
          onLoginSuccess={(lic) => {
            setActiveLicense(lic);
            refreshAllData();
            showToast(`Welcome back, ${lic.username}!`, 'success');
          }}
          onOpenAdminPin={handleOpenAdminPinFromLogin}
        />

        {/* Admin PIN Pad Modal */}
        <PinLockModal
          isOpen={showAdminPinModal}
          title={isAdminPinSetup ? 'Set Admin Security PIN' : 'Owner Admin Authorization'}
          subtitle={isAdminPinSetup ? 'Create a 4-digit PIN for Admin Panel access' : 'Enter Admin PIN to open Admin Panel'}
          isSetup={isAdminPinSetup}
          soundEnabled={settings.soundEnabled ?? true}
          onSuccess={handleAdminPinSuccess}
          onCancel={() => setShowAdminPinModal(false)}
          validatePin={(enteredPin) => {
            const stored = storage.getAdminPin() || '1984';
            return enteredPin === stored;
          }}
        />

        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </div>
    );
  }

  // Determine top header title based on current screen
  const headerTitle =
    currentView === 'student_profile'
      ? selectedStudent?.name || 'Student Profile'
      : currentView === 'settings'
      ? 'Settings'
      : currentView === 'admin'
      ? 'Admin Panel'
      : currentView === 'selftest'
      ? 'Self-Test Suite'
      : activeTab === 'home'
      ? 'Home'
      : activeTab === 'class'
      ? 'Class Recitation'
      : activeTab === 'teams'
      ? 'Teams Halqa'
      : 'Reports';

  return (
    <div className="h-full bg-[#F7F5F0] flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top App Bar */}
      <TopHeader
        title={headerTitle}
        teacherInitials={settings.teacherName ? settings.teacherName.slice(0, 2).toUpperCase() : 'UB'}
        language={settings.language || 'en'}
        onSelectLanguage={handleSelectLanguage}
        soundEnabled={settings.soundEnabled ?? true}
        onToggleSound={handleToggleSound}
        showBack={currentView !== 'main'}
        onBack={() => {
          if (currentView === 'selftest') {
            navigateTo('admin');
          } else {
            setCurrentView('main');
          }
        }}
        onOpenSettings={currentView === 'main' ? () => navigateTo('settings') : undefined}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto">
        {currentView === 'admin' ? (
          <AdminPanelScreen
            onBackToLogin={() => {
              if (activeLicense) {
                setCurrentView('main');
              } else {
                setCurrentView('main');
                setActiveLicense(null);
              }
            }}
            onOpenSelfTest={() => navigateTo('selftest')}
            onShowToast={showToast}
          />
        ) : currentView === 'selftest' ? (
          <SelfTestScreen onBack={() => navigateTo('admin')} />
        ) : currentView === 'settings' ? (
          <SettingsScreen
            settings={settings}
            onBack={() => setCurrentView('main')}
            onUpdateSettings={(newSettings) => {
              setSettings(newSettings);
              refreshAllData();
            }}
            onLogout={handleLogout}
            onShowToast={showToast}
            onSetupPin={() => setShowTeacherPinLock(true)}
          />
        ) : currentView === 'student_profile' && selectedStudent ? (
          <StudentProfileScreen
            student={selectedStudent}
            dailyRecords={dailyRecords}
            warnings={warnings}
            terminations={terminations}
            todayDate={todayDate}
            onBack={() => setCurrentView('main')}
            onRefreshData={refreshAllData}
            onShowToast={showToast}
          />
        ) : (
          /* Main 4 Tabs */
          <>
            {activeTab === 'home' && (
              <HomeScreen
                students={students}
                dailyRecords={dailyRecords}
                todayDate={todayDate}
                activeLicense={activeLicense}
                settings={settings}
                onNavigateToClass={() => setActiveTab('class')}
                onNavigateToTeams={() => setActiveTab('teams')}
                onNavigateToReports={() => setActiveTab('reports')}
                onOpenRenewModal={() => setShowRenewModal(true)}
              />
            )}
            {activeTab === 'class' && (
              <ClassSessionScreen
                students={students}
                scoringRules={settings.scoringRules}
                todayDate={todayDate}
                soundEnabled={settings.soundEnabled ?? true}
                onShowToast={showToast}
                onOpenSettings={() => navigateTo('settings')}
              />
            )}
            {activeTab === 'teams' && (
              <TeamsScreen
                students={students}
                dailyRecords={dailyRecords}
                warnings={warnings}
                terminations={terminations}
                todayDate={todayDate}
                onSelectStudent={(student) => navigateTo('student_profile', student)}
                onRefreshData={refreshAllData}
                onShowToast={showToast}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsScreen
                students={students}
                dailyRecords={dailyRecords}
                warnings={warnings}
                terminations={terminations}
                todayDate={todayDate}
                onRefreshData={refreshAllData}
                onShowToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Fixed Bottom Tab Bar (shown only when in primary tabs) */}
      {currentView === 'main' && (
        <Navbar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            window.history.pushState({ tab }, '');
          }}
        />
      )}

      {/* Teacher Security PIN Lock Modal */}
      {showTeacherPinLock && (
        <PinLockModal
          isOpen={showTeacherPinLock}
          title={settings.teacherPin ? 'Unlock Halqa Tracker' : 'Set Teacher PIN'}
          subtitle={settings.teacherPin ? 'Enter your 4-digit teacher security PIN' : 'Choose a 4-digit PIN'}
          isSetup={!settings.teacherPin}
          soundEnabled={settings.soundEnabled ?? true}
          onSuccess={(enteredPin) => {
            if (!settings.teacherPin) {
              const updated = { ...settings, teacherPin: enteredPin, pinLockEnabled: true };
              storage.saveSettings(updated);
              setSettings(updated);
              showToast('Teacher PIN enabled!', 'success');
            }
            setShowTeacherPinLock(false);
          }}
          onCancel={settings.teacherPin ? undefined : () => setShowTeacherPinLock(false)}
          validatePin={(pin) => pin === settings.teacherPin}
        />
      )}

      {/* Exit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showExitConfirm}
        title="Exit Halqa Tracker?"
        message="Are you sure you want to close the app? All recitation scores, fines, and drafts have been saved locally."
        confirmLabel="Exit App"
        cancelLabel="Stay in Class"
        onConfirm={() => {
          setShowExitConfirm(false);
          try {
            window.close();
          } catch {
            showToast('Press home button to exit', 'info');
          }
        }}
        onCancel={() => setShowExitConfirm(false)}
      />

      {/* License Renewal Modal */}
      {showRenewModal && (
        <ConfirmDialog
          isOpen={showRenewModal}
          title="Renew Offline License"
          message="To extend your offline license, request a renewal code from your administrator and paste it here or on the login screen."
          confirmLabel="Got It"
          cancelLabel="Close"
          onConfirm={() => setShowRenewModal(false)}
          onCancel={() => setShowRenewModal(false)}
        />
      )}

      {/* Offline Toast Notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function useMemoDate(): string {
  return useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);
}
