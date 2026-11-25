import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  DollarSign,
  Layers,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useCondoCore } from '../store/CondoCoreContext';
import { OnboardingWizardConfig } from '../types/condocore';
import { formatCurrency } from '../utils/exports';
import { CondoCoreMark } from './CondoCoreLogo';

const STEPS = [
  { id: 1, label: 'Property Identity', icon: Building2 },
  { id: 2, label: 'Units & Dues', icon: Layers },
  { id: 3, label: 'Funds & Controls', icon: DollarSign },
  { id: 4, label: 'Board Officers', icon: Users },
  { id: 5, label: 'Plans & Launch', icon: ShieldCheck },
];

export function OnboardingWizard() {
  const { showOnboardingWizard, setShowOnboardingWizard, initializeWorkspaceFromWizard } = useCondoCore();

  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<OnboardingWizardConfig>({
    mode: 'guided',
    associationName: '',
    address: '',
    buildingType: 'Mid-Rise Condominium',
    domainOwned: 'board.mybuilding.org',
    emergencyRecoveryEmail: 'records@mybuilding.org',
    floorCount: 4,
    unitsPerFloor: 6,
    defaultMonthlyAssessment: 450,
    lateFeeAmount: 50,
    operatingOpeningCash: 45000,
    reserveOpeningCash: 165000,
    specialProjectOpeningCash: 0,
    twoPersonApprovalThreshold: 2500,
    presidentName: 'Alex Morgan',
    presidentUnit: '401',
    treasurerName: 'Jordan Patel',
    treasurerUnit: '302',
    secretaryName: 'Taylor Brooks',
    secretaryUnit: '204',
    facilitiesName: 'Casey Alvarez',
    facilitiesUnit: '103',
    includePlans: ['roof', 'mechanical', 'ground_lobby'],
    launchScannerAfter: false,
  });

  if (!showOnboardingWizard) return null;

  const totalUnits = Math.max(1, config.floorCount * config.unitsPerFloor);
  const projectedMonthlyRevenue = totalUnits * config.defaultMonthlyAssessment;
  const canProceedStep1 = config.associationName.trim().length >= 2 && config.address.trim().length >= 4;

  const update = <K extends keyof OnboardingWizardConfig>(key: K, value: OnboardingWizardConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const togglePlan = (planKey: OnboardingWizardConfig['includePlans'][number]) => {
    setConfig((prev) => ({
      ...prev,
      includePlans: prev.includePlans.includes(planKey)
        ? prev.includePlans.filter((k) => k !== planKey)
        : [...prev.includePlans, planKey],
    }));
  };

  const handleFinish = (launchScanner = false) => {
    initializeWorkspaceFromWizard({
      ...config,
      launchScannerAfter: launchScanner || config.launchScannerAfter,
    });
    setStep(1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#121316]/50 p-2 sm:p-4"
      onClick={() => setShowOnboardingWizard(false)}
    >
      <div
        className="w-full max-w-3xl bg-white border border-[#E6E4DE] rounded-lg shadow-2xl overflow-hidden max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#121316] text-white border-b border-[#23262F] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <CondoCoreMark size={42} theme="dark" className="shrink-0 shadow-md rounded-[10px]" />
            <div>
              <div className="text-[11px] font-mono text-[#93B4FD] font-semibold">
                BUILDING ONBOARDING WIZARD · STEP {step} OF {STEPS.length}
              </div>
              <h2 className="text-lg font-display font-bold text-white mt-0.5">
                Configure Your Association Workspace
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowOnboardingWizard(false)}
            className="p-2 text-[#8E95A5] hover:text-white rounded-md hover:bg-[#1E212B] transition-colors"
            aria-label="Close onboarding wizard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="px-5 sm:px-6 py-3 bg-white border-b border-[#E6E4DE] overflow-x-auto">
          <div className="flex items-center justify-between gap-2 min-w-[520px]">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isCurrent = step === s.id;
              const isDone = step > s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id <= step || canProceedStep1) setStep(s.id);
                  }}
                  className={`flex items-center gap-2 text-xs transition-colors ${
                    isCurrent
                      ? 'text-[#1C4ED8] font-semibold'
                      : isDone
                      ? 'text-[#1E6B52] font-medium'
                      : 'text-[#787E8C]'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[11px] border ${
                      isCurrent
                        ? 'bg-[#1C4ED8] text-white border-[#1C4ED8]'
                        : isDone
                        ? 'bg-[#1E6B52] text-white border-[#1E6B52]'
                        : 'bg-[#F7F6F3] text-[#787E8C] border-[#E6E4DE]'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </span>
                  <span className="whitespace-nowrap">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => update('mode', 'guided')}
                  className={`text-left p-4 rounded-md border transition-colors ${
                    config.mode === 'guided'
                      ? 'bg-[#EEF3FF] border-[#1C4ED8]'
                      : 'bg-white border-[#E6E4DE] hover:bg-[#FAF9F7]'
                  }`}
                >
                  <div className="font-semibold text-[#121316]">Guided Setup (Recommended)</div>
                  <p className="text-[11px] text-[#525763] mt-1 leading-relaxed">
                    Generates your unit roster, starter operating &amp; reserve budget categories, architectural plan shells, and a board setup checklist.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => update('mode', 'blank')}
                  className={`text-left p-4 rounded-md border transition-colors ${
                    config.mode === 'blank'
                      ? 'bg-[#EEF3FF] border-[#1C4ED8]'
                      : 'bg-white border-[#E6E4DE] hover:bg-[#FAF9F7]'
                  }`}
                >
                  <div className="font-semibold text-[#121316]">Clean Blank Space</div>
                  <p className="text-[11px] text-[#525763] mt-1 leading-relaxed">
                    Creates your units and board officers with zero pre-populated budget lines or sample records—ideal for importing your own data from scratch.
                  </p>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-[#121316] mb-1">Association / Building Name *</label>
                  <input
                    type="text"
                    required
                    value={config.associationName}
                    onChange={(e) => update('associationName', e.target.value)}
                    placeholder="e.g., Harborview Lofts Condominium Association"
                    className="w-full px-3 py-2.5 bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium text-[#121316] mb-1">Property Street Address *</label>
                  <input
                    type="text"
                    required
                    value={config.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="e.g., 820 E. Harbor Blvd, Boston, MA 02127"
                    className="w-full px-3 py-2.5 bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#121316] mb-1">Building Type</label>
                  <select
                    value={config.buildingType}
                    onChange={(e) => update('buildingType', e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-[#D2CFC7] rounded"
                  >
                    <option>Mid-Rise Condominium</option>
                    <option>Low-Rise Walk-Up / Courtyard</option>
                    <option>High-Rise Tower</option>
                    <option>Townhome / Rowhouse Association</option>
                    <option>Mixed-Use Residential &amp; Retail</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#121316] mb-1">Association-Owned Domain</label>
                  <input
                    type="text"
                    value={config.domainOwned}
                    onChange={(e) => update('domainOwned', e.target.value)}
                    className="w-full px-3 py-2.5 font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium text-[#121316] mb-1">
                    Permanent Board Recovery Email (Never Tied to One Person)
                  </label>
                  <input
                    type="email"
                    value={config.emergencyRecoveryEmail}
                    onChange={(e) => update('emergencyRecoveryEmail', e.target.value)}
                    className="w-full px-3 py-2.5 font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-[#525763]">
                Define your floor count, units per floor, and baseline monthly assessments. CondoCore automatically builds the unit ledger and ownership shares (editable anytime).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#121316] mb-1">Residential Floors</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={config.floorCount}
                    onChange={(e) => update('floorCount', Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2.5 font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#121316] mb-1">Average Units per Floor</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={config.unitsPerFloor}
                    onChange={(e) => update('unitsPerFloor', Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2.5 font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#121316] mb-1">Default Monthly Assessment ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={25}
                    value={config.defaultMonthlyAssessment}
                    onChange={(e) => update('defaultMonthlyAssessment', Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2.5 font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#121316] mb-1">Standard Late Fee ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={config.lateFeeAmount}
                    onChange={(e) => update('lateFeeAmount', Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2.5 font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#FAF9F7] border border-[#E6E4DE] rounded-md grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[11px] text-[#525763]">Generated Units</div>
                  <div className="text-lg font-mono font-semibold text-[#121316] tabular-nums mt-0.5">
                    {totalUnits}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#525763]">Unit Numbering Preview</div>
                  <div className="text-sm font-mono font-medium text-[#1C4ED8] mt-1">
                    101 – {config.floorCount}
                    {String(config.unitsPerFloor).padStart(2, '0')}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#525763]">Monthly Assessment Roll</div>
                  <div className="text-lg font-mono font-semibold text-[#1E6B52] tabular-nums mt-0.5">
                    {formatCurrency(projectedMonthlyRevenue)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-[#525763]">
                Separate Operating, Capital Reserve, and Special Project funds from day one, and establish your two-officer invoice approval threshold.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium text-[#121316] mb-1">Operating Account ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={config.operatingOpeningCash}
                    onChange={(e) => update('operatingOpeningCash', Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2.5 font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#121316] mb-1">Capital Reserve Fund ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={config.reserveOpeningCash}
                    onChange={(e) => update('reserveOpeningCash', Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2.5 font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#121316] mb-1">Special Project Fund ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={config.specialProjectOpeningCash}
                    onChange={(e) => update('specialProjectOpeningCash', Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2.5 font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#FAF9F7] border border-[#E6E4DE] rounded-md space-y-2">
                <label className="block font-semibold text-[#121316]">
                  Two-Person Board Invoice Approval Threshold ($)
                </label>
                <p className="text-[11px] text-[#525763]">
                  Any vendor invoice at or above this amount requires two distinct Board Officers (e.g., Treasurer + President) to sign off before payment can be issued.
                </p>
                <input
                  type="number"
                  min={100}
                  step={250}
                  value={config.twoPersonApprovalThreshold}
                  onChange={(e) => update('twoPersonApprovalThreshold', Math.max(100, Number(e.target.value) || 1000))}
                  className="w-44 px-3 py-2 font-mono bg-white border border-[#D2CFC7] rounded"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-[#525763]">
                Assign your current Board Officers. CondoCore logs every approval, vote, and inspection under the active officer&apos;s name for audit continuity across board transitions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Board President', nameKey: 'presidentName' as const, unitKey: 'presidentUnit' as const },
                  { label: 'Treasurer', nameKey: 'treasurerName' as const, unitKey: 'treasurerUnit' as const },
                  { label: 'Secretary', nameKey: 'secretaryName' as const, unitKey: 'secretaryUnit' as const },
                  { label: 'Board Member (Facilities)', nameKey: 'facilitiesName' as const, unitKey: 'facilitiesUnit' as const },
                ].map((officer) => (
                  <div key={officer.label} className="p-3.5 bg-[#FAF9F7] border border-[#E6E4DE] rounded-md space-y-2">
                    <div className="font-semibold text-[#121316]">{officer.label}</div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={config[officer.nameKey]}
                        onChange={(e) => update(officer.nameKey, e.target.value)}
                        placeholder="Full name"
                        className="col-span-2 px-2.5 py-2 bg-white border border-[#D2CFC7] rounded"
                      />
                      <input
                        type="text"
                        value={config[officer.unitKey]}
                        onChange={(e) => update(officer.unitKey, e.target.value)}
                        placeholder="Unit #"
                        className="px-2.5 py-2 font-mono bg-white border border-[#D2CFC7] rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <div className="font-semibold text-[#121316] mb-2">
                  Select Starting Floorplan Shells (Or uncheck all to start with a blank Camera Spatial Survey sheet)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { key: 'roof' as const, label: 'Roof & Parapet Deck (ROOF)' },
                    { key: 'mechanical' as const, label: 'Mechanical & Boiler Room (MECH)' },
                    { key: 'typical_floor' as const, label: 'Typical Residential Floor (FL-2+)' },
                    { key: 'ground_lobby' as const, label: 'Ground Floor & Main Lobby (FL-1)' },
                    { key: 'garage' as const, label: 'Garage & Parking Level (P-1)' },
                  ].map((opt) => (
                    <label
                      key={opt.key}
                      className="flex items-center gap-2.5 p-3 bg-white border border-[#E6E4DE] rounded-md cursor-pointer hover:bg-[#FAF9F7]"
                    >
                      <input
                        type="checkbox"
                        checked={config.includePlans.includes(opt.key)}
                        onChange={() => togglePlan(opt.key)}
                        className="w-4 h-4 accent-[#1C4ED8]"
                      />
                      <span className="font-medium text-[#121316]">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Live Summary Review */}
              <div className="p-4 bg-[#FAF9F7] border border-[#E6E4DE] rounded-md space-y-2">
                <div className="text-[11px] font-mono font-semibold text-[#2856D6]">WORKSPACE CONFIGURATION SUMMARY</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <div className="text-[11px] text-[#525763]">Building</div>
                    <div className="font-semibold text-[#121316] truncate">{config.associationName || 'Unnamed'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#525763]">Units &amp; Dues</div>
                    <div className="font-mono font-semibold text-[#121316]">
                      {totalUnits} units · {formatCurrency(config.defaultMonthlyAssessment)}/mo
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#525763]">Total Opening Cash</div>
                    <div className="font-mono font-semibold text-[#1E6B52]">
                      {formatCurrency(
                        config.operatingOpeningCash + config.reserveOpeningCash + config.specialProjectOpeningCash
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#525763]">2-Person Approval</div>
                    <div className="font-mono font-semibold text-[#121316]">
                      &ge; {formatCurrency(config.twoPersonApprovalThreshold)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-[#F7F6F3] border-t border-[#E6E4DE] flex flex-wrap items-center justify-between gap-2">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#525763] hover:text-[#121316]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowOnboardingWizard(false)}
                className="px-3.5 py-2 text-xs text-[#525763] hover:text-[#121316]"
              >
                Keep Exploring Demo
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {step < 5 ? (
              <button
                type="button"
                disabled={step === 1 && !canProceedStep1}
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1C4ED8] text-white rounded hover:bg-[#153DB0] disabled:opacity-40"
              >
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleFinish(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#1C4ED8] text-[#1C4ED8] rounded hover:bg-[#EEF3FF]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Create &amp; Scan First Room
                </button>
                <button
                  type="button"
                  onClick={() => handleFinish(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1C4ED8] text-white rounded hover:bg-[#153DB0]"
                >
                  <Check className="w-3.5 h-3.5" />
                  Create Building Workspace
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
