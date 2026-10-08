import React, { useState, useRef } from 'react';
import { HalqaLogo, IslamicGeometricPattern } from '../components/Icons';
import { storage } from '../data/storage';
import {
  checkClockIntegrity,
  verifyBlockCode,
  verifyLicenseKeyFormat,
  verifyRenewalCode,
  verifyUnlockCode
} from '../auth/licenseSystem';
import { LicenseRecord } from '../types';
import { playFeedbackSound } from '../utils/audioFeedback';
import { Eye, EyeOff, ShieldCheck, KeyRound, AlertCircle, RefreshCw, Shield, Sparkles } from 'lucide-react';

export const DEMO_CREDENTIALS = {
  admin: {
    username: 'ADMIN',
    key: 'HQ-MSTR-ADMIN-0-1700000000-M001-EF3DE87C7B53',
    role: 'Master Admin (Lifetime)'
  },
  teacher: {
    username: 'BILAL',
    key: 'HQ-TIME-BILAL-365-1700000000-T001-7814AB2C4E93',
    role: 'Teacher - Ustadh Bilal (365 Days)'
  },
  adminPin: '1984'
};

interface LoginScreenProps {
  onLoginSuccess: (license: LicenseRecord) => void;
  onOpenAdminPin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onOpenAdminPin
}) => {
  const [username, setUsername] = useState('');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [renewalCode, setRenewalCode] = useState('');
  const [unlockCode, setUnlockCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isExpiredState, setIsExpiredState] = useState(false);
  const [isRollbackState, setIsRollbackState] = useState(false);
  const [expiredUser, setExpiredUser] = useState('');

  const handleQuickLogin = (uname: string, lkey: string) => {
    playFeedbackSound('click');
    setUsername(uname);
    setKey(lkey);
    performLoginWith(uname, lkey);
  };

  // Long press detection on logo for Admin Entry
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const startLongPress = () => {
    setIsLongPressing(true);
    timerRef.current = setTimeout(() => {
      setIsLongPressing(false);
      onOpenAdminPin();
    }, 850);
  };

  const cancelLongPress = () => {
    setIsLongPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const performLoginWith = (rawUser: string, rawKey: string) => {
    setErrorMsg('');
    const cleanUser = rawUser.trim().toUpperCase();
    const cleanKey = rawKey.trim();

    if (!cleanUser) {
      setErrorMsg('Please enter your username');
      return;
    }
    if (!cleanKey) {
      setErrorMsg('Please enter your license key');
      return;
    }

    // 1. Check Clock Rollback Defense
    const nowIso = new Date().toISOString();
    const lastSeen = storage.getLastSeenDate();
    const clockCheck = checkClockIntegrity(nowIso, lastSeen);
    if (clockCheck.rollbackDetected) {
      setIsRollbackState(true);
      setErrorMsg(clockCheck.error || 'Date change detected.');
      return;
    }

    // Check if user entered a block code in key field
    if (cleanKey.startsWith('BLK-')) {
      const blockRes = verifyBlockCode(cleanKey, cleanUser);
      if (blockRes.valid) {
        const storedLic = storage.getActiveLicense();
        if (storedLic) {
          storedLic.status = 'blocked';
          storage.setActiveLicense(storedLic);
        }
        setErrorMsg(`Account for ${cleanUser} has been locked on this device via block instruction.`);
        return;
      }
    }

    // 2. Validate cryptographic key structure
    const verification = verifyLicenseKeyFormat(cleanKey);
    if (!verification.valid) {
      setErrorMsg(verification.error || 'Invalid license key.');
      return;
    }

    if (verification.username !== cleanUser) {
      setErrorMsg(`This license key was issued for '${verification.username}', not '${cleanUser}'.`);
      return;
    }

    const deviceId = storage.getDeviceId();
    let currentLic = storage.getActiveLicense();

    // If key has been activated before
    if (currentLic && currentLic.key === cleanKey) {
      if (currentLic.status === 'blocked') {
        setErrorMsg('This account has been blocked on this device. Contact your admin.');
        return;
      }

      // Check device binding
      if (currentLic.deviceId && currentLic.deviceId !== deviceId) {
        setErrorMsg('This license key is bound to another device.');
        return;
      }

      // Check time expiry
      if (currentLic.type === 'time_limited' && currentLic.activatedAt) {
        const activatedTime = new Date(currentLic.activatedAt).getTime();
        const expiryTime = activatedTime + (currentLic.durationDays * 24 * 60 * 60 * 1000);
        if (Date.now() > expiryTime) {
          currentLic.status = 'expired';
          storage.setActiveLicense(currentLic);
          setIsExpiredState(true);
          setExpiredUser(cleanUser);
          setErrorMsg('Your access has expired. Contact the admin to renew.');
          return;
        }
      }

      // Update last used
      currentLic.lastUsedAt = nowIso;
      storage.setActiveLicense(currentLic);
      storage.updateLastSeenDate(nowIso);
      playFeedbackSound('save');
      onLoginSuccess(currentLic);
      return;
    }

    // First time activating this key on this device
    const activatedRecord: LicenseRecord = {
      id: `lic_${cleanUser}_${Date.now()}`,
      username: cleanUser,
      key: cleanKey,
      type: verification.type!,
      durationDays: verification.durationDays!,
      issuedAt: nowIso,
      activatedAt: nowIso,
      deviceId,
      status: 'active',
      lastUsedAt: nowIso
    };

    storage.setActiveLicense(activatedRecord);
    storage.updateLastSeenDate(nowIso);
    playFeedbackSound('save');
    onLoginSuccess(activatedRecord);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    performLoginWith(username, key);
  };

  const handleApplyRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const targetUser = expiredUser || username.trim().toUpperCase();
    const result = verifyRenewalCode(renewalCode, targetUser);
    if (!result.valid) {
      setErrorMsg(result.error || 'Invalid renewal code.');
      return;
    }

    // Reactivate license
    let lic = storage.getActiveLicense();
    if (!lic) {
      lic = {
        id: `lic_${targetUser}_${Date.now()}`,
        username: targetUser,
        key: `HQ-RENEWED-${targetUser}`,
        type: 'time_limited',
        durationDays: result.addedDays || 30,
        issuedAt: new Date().toISOString(),
        activatedAt: new Date().toISOString(),
        deviceId: storage.getDeviceId(),
        status: 'active'
      };
    } else {
      lic.status = 'active';
      lic.activatedAt = new Date().toISOString(); // reset duration window
      lic.durationDays = result.addedDays || 30;
    }
    storage.setActiveLicense(lic);
    storage.updateLastSeenDate();
    setIsExpiredState(false);
    playFeedbackSound('save');
    onLoginSuccess(lic);
  };

  const handleUnlockClock = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPin = storage.getAdminPin() || '1984';
    if (verifyUnlockCode(unlockCode, adminPin) || unlockCode === adminPin) {
      storage.updateLastSeenDate(new Date().toISOString());
      setIsRollbackState(false);
      setErrorMsg('');
      playFeedbackSound('save');
    } else {
      setErrorMsg('Invalid admin unlock code');
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F7F5F0] flex flex-col justify-center items-center px-4 py-8 select-none">
      {/* Subtle Islamic Geometric Star Background Pattern */}
      <IslamicGeometricPattern opacity={0.05} />

      <div className="w-full max-w-sm relative z-10 space-y-6">
        {/* Brand Emblem Lockup */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            onMouseDown={startLongPress}
            onMouseUp={cancelLongPress}
            onTouchStart={startLongPress}
            onTouchEnd={cancelLongPress}
            className={`cursor-pointer transition-transform duration-200 ${
              isLongPressing ? 'scale-90 opacity-75' : 'hover:scale-105'
            }`}
            title="Halqa Tracker"
          >
            <HalqaLogo size={76} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1F26]">
              Halqa Tracker
            </h1>
            <p className="text-[13px] text-[#5B6470] mt-0.5">
              Quran Class Recitation & Circle Scoring
            </p>
          </div>
        </div>

        {/* Expired State Card */}
        {isExpiredState ? (
          <div className="bg-white rounded-2xl p-6 border border-[#E4E0D7] shadow-lg space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center mx-auto">
              <RefreshCw size={24} />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-[18px] font-bold text-[#1A1F26]">
                Access Expired
              </h2>
              <p className="text-[13px] text-[#5B6470] leading-relaxed">
                Your license period has concluded. Paste a renewal code issued by your administrator.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#FEE2E2] text-[#B42318] text-[13px] font-medium flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleApplyRenewal} className="space-y-3 pt-1">
              <div>
                <label className="block text-[12px] font-medium text-[#1A1F26] mb-1">
                  Renewal Authorization Code
                </label>
                <input
                  type="text"
                  value={renewalCode}
                  onChange={(e) => setRenewalCode(e.target.value)}
                  placeholder="RNEW-USERNAME-30-..."
                  className="w-full h-12 px-3.5 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] text-[#1A1F26] font-mono tracking-tight focus:bg-white focus:border-[#0F766E] focus:outline-hidden"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#0F766E] hover:bg-[#0B5D57] active:scale-[0.99] text-white font-semibold text-[15px] shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} />
                <span>Apply Renewal Code</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExpiredState(false)}
                className="w-full py-2 text-[13px] text-[#5B6470] hover:text-[#1A1F26] text-center"
              >
                Back to Standard Login
              </button>
            </form>
          </div>
        ) : isRollbackState ? (
          /* Clock Rollback Lockout Card */
          <div className="bg-white rounded-2xl p-6 border border-[#FCA5A5] shadow-lg space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FEE2E2] text-[#B42318] flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-[18px] font-bold text-[#B42318]">
                Date Change Detected
              </h2>
              <p className="text-[13px] text-[#5B6470] leading-relaxed">
                Device clock is set behind the latest recorded recitation session. Enter admin unlock code or correct system time.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#FEE2E2] text-[#B42318] text-[12px] font-medium text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUnlockClock} className="space-y-3">
              <input
                type="text"
                value={unlockCode}
                onChange={(e) => setUnlockCode(e.target.value)}
                placeholder="Enter admin unlock code"
                className="w-full h-12 px-3.5 rounded-xl border border-[#E4E0D7] bg-white text-center font-mono text-[16px] focus:border-[#0F766E] focus:outline-hidden"
              />
              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#B42318] text-white font-semibold text-[14px]"
              >
                Unlock Device Clock
              </button>
            </form>
          </div>
        ) : (
          /* Standard Login Card */
          <div className="bg-white rounded-2xl p-6 border border-[#E4E0D7] shadow-sm space-y-4">
            <div className="text-center pb-1">
              <h2 className="text-[17px] font-bold text-[#1A1F26]">
                Teacher Portal Login
              </h2>
              <p className="text-[12px] text-[#5B6470]">
                Enter authorized offline credentials
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#B42318] text-[13px] font-medium flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#1A1F26] mb-1">
                  Teacher Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. BILAL"
                  className="w-full h-12 px-3.5 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[15px] text-[#1A1F26] focus:bg-white focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] focus:outline-hidden uppercase"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#1A1F26] mb-1">
                  License Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="HQ-TIME-..."
                    className="w-full h-12 pl-3.5 pr-11 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] font-mono text-[#1A1F26] focus:bg-white focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] focus:outline-hidden"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-[#5B6470] hover:text-[#1A1F26]"
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#0F766E] hover:bg-[#0B5D57] active:scale-[0.99] text-white font-semibold text-[15px] shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
              >
                <KeyRound size={18} />
                <span>Enter Halqa Tracker</span>
              </button>
            </form>

            {/* Quick Test / 1-Tap Entry for Easy Testing */}
            <div className="pt-2 border-t border-[#E4E0D7] space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#5B6470]">
                <Sparkles size={14} className="text-[#F59E0B]" />
                <span>Instant Test Access (1-Tap Login)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin(DEMO_CREDENTIALS.teacher.username, DEMO_CREDENTIALS.teacher.key)}
                  className="p-2.5 rounded-xl border border-[#0F766E]/30 bg-[#E6F4F2] hover:bg-[#0F766E]/15 active:scale-[0.98] text-left transition-all"
                >
                  <div className="text-[12px] font-bold text-[#0F766E] flex items-center justify-between">
                    <span>Teacher Login</span>
                    <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-[#0F766E] font-mono">BILAL</span>
                  </div>
                  <div className="text-[11px] text-[#5B6470] mt-0.5">Ustadh Bilal (365d)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin(DEMO_CREDENTIALS.admin.username, DEMO_CREDENTIALS.admin.key)}
                  className="p-2.5 rounded-xl border border-[#4F5BD5]/30 bg-[#EEF2FF] hover:bg-[#4F5BD5]/15 active:scale-[0.98] text-left transition-all"
                >
                  <div className="text-[12px] font-bold text-[#4F5BD5] flex items-center justify-between">
                    <span>Admin Master</span>
                    <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-[#4F5BD5] font-mono">ADMIN</span>
                  </div>
                  <div className="text-[11px] text-[#5B6470] mt-0.5">Full Lifetime Access</div>
                </button>
              </div>
            </div>

            {/* Admin Panel Direct Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={onOpenAdminPin}
                className="w-full py-2.5 px-3 rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] hover:bg-[#F3F4F6] active:scale-[0.99] text-[#1F2A37] text-[13px] font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Shield size={16} className="text-[#0F766E]" />
                <span>Open Admin Security Panel (PIN: 1984)</span>
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-[12px] text-[#8A929C] leading-relaxed">
          100% Offline Single Device Storage • Protected by Local Cryptographic Checksum
        </p>
      </div>
    </div>
  );
};
