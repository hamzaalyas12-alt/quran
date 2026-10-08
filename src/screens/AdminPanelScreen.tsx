import React, { useState, useMemo } from 'react';
import { LicenseRecord, LicenseType } from '../types';
import { storage } from '../data/storage';
import {
  generateBlockCode,
  generateLicenseKey,
  generateRenewalCode,
  LICENSE_CONFIG
} from '../auth/licenseSystem';
import { loadDemoData } from '../data/demoData';
import {
  Shield,
  Copy,
  Plus,
  X,
  Play,
  CheckCircle2,
  Database,
  ChevronLeft
} from 'lucide-react';

interface AdminPanelScreenProps {
  onBackToLogin: () => void;
  onOpenSelfTest: () => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({
  onBackToLogin,
  onOpenSelfTest,
  onShowToast
}) => {
  const [licenses, setLicenses] = useState<LicenseRecord[]>(() => {
    const list = storage.getAdminLicenses();
    if (list.length === 0) {
      const master = generateLicenseKey('ADMIN', 'master', 0);
      const demoTeacher = generateLicenseKey('BILAL', 'time_limited', 30);
      storage.saveAdminLicense(master.record);
      storage.saveAdminLicense(demoTeacher.record);
      return [master.record, demoTeacher.record];
    }
    return list;
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('USTADH_AHMAD');
  const [newType, setNewType] = useState<LicenseType>('time_limited');
  const [newDurationDays, setNewDurationDays] = useState(30);
  const [generatedResult, setGeneratedResult] = useState<{ username: string; key: string } | null>(null);

  const stats = useMemo(() => {
    const total = licenses.length;
    const active = licenses.filter((l) => l.status === 'active').length;
    const expired = licenses.filter((l) => l.status === 'expired').length;
    const blocked = licenses.filter((l) => l.status === 'blocked').length;
    return { total, active, expired, blocked };
  }, [licenses]);

  const masterCount = licenses.filter((l) => l.type === 'master').length;
  const timeLimitedCount = licenses.filter((l) => l.type === 'time_limited').length;

  const handleCreateLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    if (newType === 'master' && masterCount >= LICENSE_CONFIG.MAX_MASTER_LOGINS) {
      onShowToast(`Limit reached: maximum ${LICENSE_CONFIG.MAX_MASTER_LOGINS} Master login allowed.`, 'warning');
      return;
    }
    if (newType === 'time_limited' && timeLimitedCount >= LICENSE_CONFIG.MAX_TIME_LIMITED_LOGINS) {
      onShowToast(`Limit reached: maximum ${LICENSE_CONFIG.MAX_TIME_LIMITED_LOGINS} Time-limited logins allowed.`, 'warning');
      return;
    }

    const { key, record } = generateLicenseKey(newUsername.trim(), newType, newDurationDays);
    storage.saveAdminLicense(record);
    setLicenses(storage.getAdminLicenses());
    setGeneratedResult({ username: record.username, key });
    onShowToast(`License generated for ${record.username}!`, 'success');
  };

  const handleCopyCredentials = (username: string, key: string) => {
    const text = `Assalamu Alaikum,\nHere are your Halqa Tracker offline login credentials:\nUsername: ${username}\nKey: ${key}\n\n1. Open Halqa Tracker\n2. Enter Username and Key\n3. Start your recitation session!`;
    navigator.clipboard.writeText(text);
    onShowToast('Credentials copied! Ready to paste into WhatsApp.', 'success');
  };

  const handleBlockLogin = (lic: LicenseRecord) => {
    const blockCode = generateBlockCode(lic.username);
    storage.updateAdminLicense(lic.id, { status: 'blocked', blockReason: 'Admin blocked' });
    setLicenses(storage.getAdminLicenses());
    navigator.clipboard.writeText(blockCode);
    onShowToast(`Account blocked. Block instruction copied: ${blockCode}`, 'warning');
  };

  const handleUnblockLogin = (lic: LicenseRecord) => {
    storage.updateAdminLicense(lic.id, { status: 'active' });
    setLicenses(storage.getAdminLicenses());
    onShowToast(`${lic.username} unblocked.`, 'success');
  };

  const handleRenewLogin = (lic: LicenseRecord, days: number = 30) => {
    const renewalCode = generateRenewalCode(lic.username, days);
    navigator.clipboard.writeText(renewalCode);
    onShowToast(`Renewal code for ${lic.username} copied to clipboard! (${renewalCode})`, 'success');
  };

  const handleLoadDemoData = () => {
    loadDemoData();
    onShowToast('Demo data loaded (9 students, 7-day evaluations, Tariq warning, Qasim penalty)!', 'success');
  };

  const handleClearDemoData = () => {
    storage.clearAllData();
    onShowToast('Demo records cleared. Clean slate restored.', 'info');
  };

  return (
    <div className="flex flex-col w-full pb-32 px-4 pt-16 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-9 h-9 rounded-xl bg-white border border-[#E4E0D7] flex items-center justify-center text-[#1A1F26]"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-[20px] font-bold text-[#1A1F26]">Admin Security Panel</h1>
            <p className="text-[12px] text-[#5B6470]">License Provisioning & System Control</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#1F2A37] text-white flex items-center justify-center">
          <Shield size={16} />
        </div>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2.5 rounded-xl bg-white border border-[#E4E0D7]">
          <div className="text-[11px] text-[#5B6470]">Total</div>
          <div className="text-[18px] font-bold text-[#1A1F26] tabular-nums mt-0.5">{stats.total}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-white border border-[#E4E0D7]">
          <div className="text-[11px] text-[#16803C]">Active</div>
          <div className="text-[18px] font-bold text-[#16803C] tabular-nums mt-0.5">{stats.active}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-white border border-[#E4E0D7]">
          <div className="text-[11px] text-[#B45309]">Expired</div>
          <div className="text-[18px] font-bold text-[#B45309] tabular-nums mt-0.5">{stats.expired}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-white border border-[#E4E0D7]">
          <div className="text-[11px] text-[#B42318]">Blocked</div>
          <div className="text-[18px] font-bold text-[#B42318] tabular-nums mt-0.5">{stats.blocked}</div>
        </div>
      </div>

      {/* QA & Autonomous Tools Hub */}
      <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-[#1A1F26] uppercase tracking-wider">
            QA & Preview Tools
          </span>
          <span className="text-[11px] text-[#0F766E] font-semibold">Self-Testing</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenSelfTest}
            className="h-11 rounded-xl bg-[#0F766E] text-white font-bold text-[13px] flex items-center justify-center gap-1.5 hover:bg-[#0B5D57] shadow-xs"
          >
            <Play size={15} />
            <span>Run Self-Tests</span>
          </button>

          <button
            type="button"
            onClick={handleLoadDemoData}
            className="h-11 rounded-xl bg-[#F0EDE6] hover:bg-[#E4E0D7] text-[#1A1F26] font-bold text-[13px] flex items-center justify-center gap-1.5"
          >
            <Database size={15} />
            <span>Load Demo Data</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleClearDemoData}
          className="w-full py-2 text-[12px] text-[#8A929C] hover:text-[#B42318] text-center"
        >
          Clear Demo Data Records
        </button>
      </div>

      {/* Licenses Roster List */}
      <div className="rounded-2xl bg-white p-4 border border-[#E4E0D7] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[#1A1F26]">
            Issued Logins ({licenses.length})
          </h2>
          <button
            type="button"
            onClick={() => {
              setGeneratedResult(null);
              setShowCreateModal(true);
            }}
            className="px-2.5 py-1 rounded-lg bg-[#E6F4F2] text-[#0F766E] text-[12px] font-bold flex items-center gap-1"
          >
            <Plus size={14} />
            <span>Create Login</span>
          </button>
        </div>

        <div className="space-y-2.5 divide-y divide-[#E4E0D7]/60">
          {licenses.map((lic) => {
            const isMaster = lic.type === 'master';
            const statusColors = {
              active: 'bg-[#E6F4F2] text-[#0F766E]',
              expired: 'bg-[#FEF3C7] text-[#92400E]',
              blocked: 'bg-[#FEE2E2] text-[#B42318]'
            };

            return (
              <div key={lic.id} className="pt-2.5 space-y-1.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[14px] text-[#1A1F26]">{lic.username}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isMaster ? 'bg-[#1F2A37] text-white' : 'bg-[#F0EDE6] text-[#5B6470]'
                        }`}
                      >
                        {isMaster ? 'Master' : `${lic.durationDays}d Limited`}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${statusColors[lic.status]}`}>
                        {lic.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8A929C] font-mono truncate max-w-[200px] mt-0.5">
                      {lic.key}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyCredentials(lic.username, lic.key)}
                    className="p-1.5 rounded-lg hover:bg-[#F7F5F0] text-[#0F766E]"
                    title="Copy credentials for WhatsApp"
                  >
                    <Copy size={16} />
                  </button>
                </div>

                {/* Row Action Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleCopyCredentials(lic.username, lic.key)}
                    className="px-2 py-0.5 rounded-md bg-[#F0EDE6] text-[#1A1F26] font-medium hover:bg-[#E4E0D7]"
                  >
                    Copy Credentials
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRenewLogin(lic, 30)}
                    className="px-2 py-0.5 rounded-md bg-[#E6F4F2] text-[#0F766E] font-medium hover:bg-[#c2eae4]"
                  >
                    Generate Renewal (+30d)
                  </button>
                  {lic.status === 'blocked' ? (
                    <button
                      type="button"
                      onClick={() => handleUnblockLogin(lic)}
                      className="px-2 py-0.5 rounded-md bg-[#E6F4F2] text-[#0F766E] font-medium"
                    >
                      Unblock
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBlockLogin(lic)}
                      className="px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#B42318] font-medium hover:bg-[#FCA5A5]"
                    >
                      Block Account
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Login Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-[#E4E0D7] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1 border-b border-[#E4E0D7]">
              <h3 className="text-[17px] font-bold text-[#1A1F26]">
                Provision New Login Key
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5B6470]"
              >
                <X size={18} />
              </button>
            </div>

            {generatedResult ? (
              <div className="space-y-4 pt-1">
                <div className="p-3.5 rounded-xl bg-[#E6F4F2] border border-[#0F766E]/30 space-y-2">
                  <div className="text-[12px] font-bold text-[#0F766E] flex items-center gap-1.5">
                    <CheckCircle2 size={16} />
                    <span>Credentials Generated Successfully!</span>
                  </div>
                  <div className="text-[13px] text-[#1A1F26]">
                    <div><strong>Username:</strong> {generatedResult.username}</div>
                    <div className="font-mono text-[12px] break-all mt-1 p-2 bg-white rounded-lg border border-[#E4E0D7]">
                      {generatedResult.key}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyCredentials(generatedResult.username, generatedResult.key)}
                  className="w-full h-12 rounded-xl bg-[#0F766E] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-xs"
                >
                  <Copy size={18} />
                  <span>Copy Credentials for WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGeneratedResult(null);
                    setShowCreateModal(false);
                  }}
                  className="w-full py-2 text-[13px] text-[#5B6470] text-center"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateLogin} className="space-y-3.5">
                <div>
                  <label className="text-[12px] font-semibold text-[#1A1F26] block mb-1">
                    Login Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewType('time_limited')}
                      className={`p-2.5 rounded-xl border text-[13px] font-semibold transition-all ${
                        newType === 'time_limited'
                          ? 'bg-[#E6F4F2] border-[#0F766E] text-[#0F766E]'
                          : 'bg-[#F7F5F0] border-[#E4E0D7] text-[#5B6470]'
                      }`}
                    >
                      Time-Limited
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewType('master')}
                      className={`p-2.5 rounded-xl border text-[13px] font-semibold transition-all ${
                        newType === 'master'
                          ? 'bg-[#E6F4F2] border-[#0F766E] text-[#0F766E]'
                          : 'bg-[#F7F5F0] border-[#E4E0D7] text-[#5B6470]'
                      }`}
                    >
                      Master Lifetime
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-[#1A1F26] block mb-1">
                    Teacher Username
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toUpperCase())}
                    placeholder="e.g. BILAL"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[14px] uppercase"
                    required
                  />
                </div>

                {newType === 'time_limited' && (
                  <div>
                    <label className="text-[12px] font-semibold text-[#1A1F26] block mb-1">
                      Duration in Days
                    </label>
                    <div className="flex gap-1.5 mb-2">
                      {[7, 30, 90, 365].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setNewDurationDays(d)}
                          className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${
                            newDurationDays === d
                              ? 'bg-[#0F766E] text-white border-[#0F766E]'
                              : 'bg-[#F0EDE6] text-[#5B6470] border-[#E4E0D7]'
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={newDurationDays}
                      onChange={(e) => setNewDurationDays(parseInt(e.target.value, 10) || 1)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E4E0D7] bg-[#F7F5F0] text-[13px]"
                      placeholder="Custom days..."
                      min={1}
                    />
                  </div>
                )}

                <div className="pt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="h-11 rounded-xl border border-[#C9C4B8] text-[#1A1F26] font-semibold text-[14px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-[#0F766E] hover:bg-[#0B5D57] text-white font-semibold text-[14px]"
                  >
                    Generate Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
