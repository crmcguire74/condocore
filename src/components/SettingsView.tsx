import React, { useState } from 'react';
import {
  Building2,
  Camera,
  CheckCircle2,
  Download,
  HardDrive,
  RotateCcw,
  Shield,
  Smartphone,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useCondoCore } from '../store/CondoCoreContext';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { downloadJson, formatCurrency } from '../utils/exports';
import { CondoCoreMark } from './CondoCoreLogo';

export function SettingsView() {
  const {
    state,
    canWriteBoard,
    setShowOnboardingWizard,
    updateAssociationSettings,
    updateApprovalThreshold,
    importWorkspaceJson,
    resetWorkspace,
    setActiveTab,
    setOpenScannerOnMap,
    pushToast,
  } = useCondoCore();

  const { isInstallable, isInstalled, isIOS, isMobile, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const [buildingName, setBuildingName] = useState(state.settings.name);
  const [address, setAddress] = useState(state.settings.address);
  const [domain, setDomain] = useState(state.settings.domainOwned);
  const [recoveryEmail, setRecoveryEmail] = useState(state.settings.emergencyRecoveryEmail);
  const [threshold, setThreshold] = useState(String(state.settings.twoPersonApprovalThreshold));
  const [monthlyDues, setMonthlyDues] = useState(String(state.settings.defaultMonthlyAssessment || 485));
  const [lateFee, setLateFee] = useState(String(state.settings.lateFeeAmount || 50));
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const handleInstallClick = async () => {
    const outcome = await install();
    if (outcome === 'accepted') {
      setInstallFeedback('CondoCore has been installed to your device home screen / app launcher.');
      pushToast('CondoCore installed as PWA', 'Launch anytime from your home screen for offline & camera access.', 'success');
    } else if (outcome === 'dismissed') {
      setInstallFeedback('Install prompt dismissed. You can install CondoCore anytime from this panel.');
    }
  };

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    updateAssociationSettings({
      name: buildingName.trim() || state.settings.name,
      address: address.trim() || state.settings.address,
      domainOwned: domain.trim() || state.settings.domainOwned,
      emergencyRecoveryEmail: recoveryEmail.trim() || state.settings.emergencyRecoveryEmail,
    });
  };

  const handleSaveControls = (e: React.FormEvent) => {
    e.preventDefault();
    const t = Math.max(100, Number(threshold) || 2500);
    updateApprovalThreshold(t);
    updateAssociationSettings({
      defaultMonthlyAssessment: Math.max(0, Number(monthlyDues) || 0),
      lateFeeAmount: Math.max(0, Number(lateFee) || 0),
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const res = importWorkspaceJson(reader.result);
        setImportFeedback(res);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col lg:h-full lg:min-h-0 gap-4">
      {/* Pinned Page Header */}
      <div className="shrink-0 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-semibold tracking-tight text-[#111318]">
            Settings, Workspace Setup &amp; PWA App Install
          </h1>
          <p className="text-xs text-[#525866] mt-1">
            Install CondoCore on mobile or desktop for offline continuity and camera floorplan scanning, start a new building workspace, or manage fiduciary controls.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowOnboardingWizard(true)}
          className="arch-btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl whitespace-nowrap min-h-[40px]"
        >
          <Building2 className="w-3.5 h-3.5 text-[#F0C05A]" />
          Start New Building Workspace (Wizard)
        </button>
      </div>

      {/* Scrollable Settings Workspace */}
      <div className="flex-1 min-h-0 lg:overflow-y-auto space-y-5 pr-0.5 pb-2">
        {/* Section 1: Install CondoCore as PWA */}
        <section className="arch-surface rounded-2xl overflow-hidden">
          <div className="px-5 sm:px-6 py-4 bg-[#111318] text-white border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <CondoCoreMark size={44} theme="dark" className="shadow-md rounded-[12px]" />
              <div>
                <h2 className="text-base font-display font-semibold tracking-tight text-white flex items-center gap-2">
                  <span>Install CondoCore Application (Progressive Web App)</span>
                </h2>
                <p className="text-xs text-[#A1A8B8] mt-0.5">
                  Run standalone on iOS, Android, macOS, or Windows with offline cache and mobile rear-camera room scanning.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className={isOnline ? 'text-[#4ADE80] font-semibold' : 'text-[#FBBF24] font-semibold'}>
                {isOnline ? (
                  <span className="inline-flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5" /> ONLINE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <WifiOff className="w-3.5 h-3.5" /> OFFLINE READY
                  </span>
                )}
              </span>
              <span aria-hidden="true" className="text-[#4B5161]">·</span>
              <span className={isInstalled ? 'text-[#93B4FD] font-semibold' : 'text-[#9BA1AE]'}>
                {isInstalled ? 'INSTALLED STANDALONE' : 'BROWSER TAB'}
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 space-y-4">
              {isInstalled ? (
                <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <div className="font-semibold text-[#111318]">
                      CondoCore is installed and running in standalone PWA mode.
                    </div>
                    <p className="text-[#525866]">
                      Core assets are cached for offline reference, and the Mobile Camera Spatial Scanner is unlocked inside Building Map &amp; Assets.
                    </p>
                  </div>
                </div>
              ) : isInstallable ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#525866] leading-relaxed">
                    Your browser supports direct one-click Progressive Web App installation. Installing adds CondoCore to your home screen or desktop app dock with zero browser chrome.
                  </p>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="arch-btn-primary inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold rounded-xl min-h-[44px]"
                  >
                    <Download className="w-4 h-4" />
                    Install CondoCore App Now
                  </button>
                </div>
              ) : isIOS ? (
                <div className="p-4 bg-[#F8F9FB] border border-black/[0.06] rounded-xl space-y-2 text-xs">
                  <div className="font-semibold text-[#111318] flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#1C4ED8]" />
                    Install on iPhone or iPad (Safari)
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-[#525866]">
                    <li>Tap the <strong>Share</strong> icon at the bottom of Safari.</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top-right corner, then open CondoCore from your Home Screen.</li>
                  </ol>
                </div>
              ) : (
                <div className="p-4 bg-[#F8F9FB] border border-black/[0.06] rounded-xl space-y-2 text-xs">
                  <div className="font-semibold text-[#111318] flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#1C4ED8]" />
                    {isMobile ? 'Install on Mobile Browser' : 'Install on Desktop (Chrome / Edge / Safari)'}
                  </div>
                  <p className="text-[#525866] leading-relaxed">
                    If the native browser install prompt is restricted inside an embedded preview frame, open CondoCore in a dedicated browser tab and click the <strong>Install App</strong> icon in the address bar (or browser menu &rarr; <strong>Add to Home Screen / Install CondoCore</strong>).
                  </p>
                </div>
              )}

              {installFeedback && (
                <p className="text-xs text-[#1C4ED8] font-medium">{installFeedback}</p>
              )}
            </div>

            <div className="lg:col-span-5 p-4 bg-[#F8F9FB] border border-black/[0.06] rounded-xl space-y-3 text-xs">
              <div className="font-semibold text-[#111318] flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#1C4ED8]" />
                Mobile Field Capabilities
              </div>
              <ul className="space-y-2 text-[#525866]">
                <li>
                  <strong className="text-[#111318]">Camera Spatial Floorplan Scanner</strong> — Walk boiler rooms, roofs, or corridors and capture dimensions + doors, windows, ladders, stairs, and furniture.
                </li>
                <li>
                  <strong className="text-[#111318]">Offline Resilience</strong> — Inspection checklists, vendor emergency contacts, and shutoff valve maps remain cached on-device in low-signal basements.
                </li>
              </ul>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('map');
                  setOpenScannerOnMap(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1C4ED8] hover:text-[#153DB0] hover:underline pt-1"
              >
                <Camera className="w-3.5 h-3.5" />
                Launch Camera Spatial Scanner on Building Map &rarr;
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Association Profile & Fiduciary Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <form onSubmit={handleSaveIdentity} className="arch-surface rounded-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3.5">
              <div>
                <h2 className="text-sm font-display font-semibold text-[#111318]">
                  Association Identity &amp; Ownership Continuity
                </h2>
                <p className="text-[11px] text-[#525866] mt-0.5">
                  {state.settings.isDemoWorkspace
                    ? 'Currently exploring The Alderwood demo dataset'
                    : `Custom building workspace · ${state.settings.unitCount} units`}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-medium text-[#111318] mb-1">Association Name</label>
                <input
                  type="text"
                  disabled={!canWriteBoard}
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8] disabled:bg-[#F4F5F7] transition-all"
                />
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Building Address</label>
                <input
                  type="text"
                  disabled={!canWriteBoard}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8] disabled:bg-[#F4F5F7] transition-all"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Association Domain</label>
                  <input
                    type="text"
                    disabled={!canWriteBoard}
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8] disabled:bg-[#F4F5F7] transition-all"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Board Recovery Email</label>
                  <input
                    type="email"
                    disabled={!canWriteBoard}
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8] disabled:bg-[#F4F5F7] transition-all"
                  />
                </div>
              </div>
            </div>

            {canWriteBoard && (
              <div className="pt-2">
                <button
                  type="submit"
                  className="arch-btn-primary px-4 py-2 text-xs font-semibold rounded-xl"
                >
                  Save Identity Settings
                </button>
              </div>
            )}
          </form>

          <form onSubmit={handleSaveControls} className="arch-surface rounded-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2.5 border-b border-black/[0.06] pb-3.5">
              <div className="w-8 h-8 rounded-xl bg-[#EEF3FF] flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-[#1C4ED8]" />
              </div>
              <div>
                <h2 className="text-sm font-display font-semibold text-[#111318]">
                  Fiduciary Approval &amp; Assessment Parameters
                </h2>
                <p className="text-[11px] text-[#525866] mt-0.5">
                  Current two-person threshold: <span className="font-mono font-semibold text-[#111318]">{formatCurrency(state.settings.twoPersonApprovalThreshold)}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-[#111318] mb-1">2-Officer Threshold ($)</label>
                <input
                  type="number"
                  min={100}
                  step={250}
                  disabled={!canWriteBoard}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8] disabled:bg-[#F4F5F7] transition-all"
                />
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Monthly Dues ($)</label>
                <input
                  type="number"
                  min={0}
                  step={25}
                  disabled={!canWriteBoard}
                  value={monthlyDues}
                  onChange={(e) => setMonthlyDues(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8] disabled:bg-[#F4F5F7] transition-all"
                />
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Late Fee ($)</label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  disabled={!canWriteBoard}
                  value={lateFee}
                  onChange={(e) => setLateFee(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8] disabled:bg-[#F4F5F7] transition-all"
                />
              </div>
            </div>

            <p className="text-[11px] text-[#525866] leading-relaxed bg-[#F8F9FB] border border-black/[0.05] rounded-xl p-3">
              <strong className="text-[#111318]">Record Integrity Policy:</strong> CondoCore never hard-deletes invoices, unit ledgers, or board resolutions. Adjustments are always appended as dated correction entries in the immutable audit log.
            </p>

            {canWriteBoard && (
              <div className="pt-1">
                <button
                  type="submit"
                  className="arch-btn-primary px-4 py-2 text-xs font-semibold rounded-xl"
                >
                  Update Financial Controls
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Section 3: Data Sovereignty, Backup & Workspace Reset */}
        <section className="arch-surface rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-black/[0.06] pb-3.5">
            <div className="w-8 h-8 rounded-xl bg-[#EEF3FF] flex items-center justify-center shrink-0">
              <HardDrive className="w-4 h-4 text-[#1C4ED8]" />
            </div>
            <div>
              <h2 className="text-sm font-display font-semibold text-[#111318]">
                Data Sovereignty, Archive Import/Export &amp; Demo Reset
              </h2>
              <p className="text-xs text-[#525866]">
                Every floorplan, scanned room, invoice, inspection, and audit entry belongs solely to the association and can be exported or restored anytime.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <button
              type="button"
              onClick={() =>
                downloadJson(
                  `${state.settings.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-condocore-archive.json`,
                  state
                )
              }
              className="arch-btn-secondary inline-flex items-center gap-1.5 px-4 py-2.5 font-medium rounded-xl"
            >
              <Download className="w-3.5 h-3.5" />
              Export Full Building JSON Archive
            </button>

            <label className="arch-btn-secondary inline-flex items-center gap-1.5 px-4 py-2.5 font-medium rounded-xl cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Import CondoCore JSON Archive
              <input type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
            </label>

            <button
              type="button"
              onClick={() => setShowOnboardingWizard(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 font-semibold bg-[#EEF3FF] border border-[#1C4ED8]/20 text-[#1C4ED8] rounded-xl hover:bg-[#E0EAFF] transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              Launch Building Setup Wizard
            </button>

            <button
              type="button"
              onClick={resetWorkspace}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 font-medium text-[#B45309] border border-[#F59E0B]/35 bg-[#FFFBEB] rounded-xl hover:bg-[#FEF3C7] transition-colors lg:ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Demo Building (The Alderwood)
            </button>
          </div>

          {importFeedback && (
            <p
              className={`text-xs font-medium ${
                importFeedback.ok ? 'text-[#15803D]' : 'text-[#B91C1C]'
              }`}
            >
              {importFeedback.message}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
