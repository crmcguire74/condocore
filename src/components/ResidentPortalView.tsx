import React, { useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Megaphone,
  Send,
  Upload,
  Wrench,
} from 'lucide-react';
import { useCondoCore } from '../store/CondoCoreContext';
import { AssetCategory } from '../types/condocore';
import { formatCurrency, formatDateShort } from '../utils/exports';
import { HealthText } from './StatusIndicator';

export function ResidentPortalView() {
  const {
    state,
    actor,
    recordUnitPayment,
    createWorkOrder,
    submitArchitecturalRequest,
  } = useCondoCore();

  const unitNumber = actor.unitNumber || '402';
  const myUnit = state.units.find((u) => u.unitNumber === unitNumber) || state.units[0];

  const [resTab, setResTab] = useState<'home' | 'request' | 'documents'>('home');

  // Payment form state
  const [payMethod, setPayMethod] = useState<'ACH' | 'Card'>('ACH');
  const [paySuccess, setPaySuccess] = useState(false);

  // Maintenance / Common-Area Request form
  const [reqLocation, setReqLocation] = useState(`Unit ${unitNumber} / Floor ${myUnit.floor} Corridor`);
  const [reqCategory, setReqCategory] = useState<AssetCategory>('Plumbing & Valves');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqContact, setReqContact] = useState(`Email (${myUnit.ownerEmail})`);
  const [reqUrgency, setReqUrgency] = useState<'routine' | 'soon' | 'urgent' | 'emergency'>('routine');
  const [reqEnter, setReqEnter] = useState(true);
  const [reqPhotoUrl, setReqPhotoUrl] = useState<string | undefined>(undefined);
  const [reqSubmittedCode, setReqSubmittedCode] = useState<string | null>(null);

  // Architectural Review Request form
  const [arcTitle, setArcTitle] = useState('');
  const [arcDesc, setArcDesc] = useState('');

  // Strictly isolated slices — residents NEVER see other units, board notes, vendor bids, or draft decisions
  const myRequests = state.workOrders.filter((w) => w.reportedByUnit === unitNumber);
  const myArcRequests = state.architecturalRequests.filter((r) => r.unitNumber === unitNumber);
  const ownerDocs = state.documents.filter((d) => d.ownerVisible);
  const approvedMeetings = state.meetings.filter((m) => m.approvedForResidents);

  const totalDue = myUnit.principalBalance + myUnit.lateFeeBalance;

  const handlePayNow = () => {
    if (totalDue <= 0) return;
    recordUnitPayment(myUnit.id, totalDue, payMethod, `Online ${payMethod} Owner Payment`);
    setPaySuccess(true);
    setTimeout(() => setPaySuccess(false), 3500);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setReqPhotoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim()) return;
    const planId =
      reqCategory === 'Roof'
        ? 'plan-roof'
        : reqCategory === 'Garage & Structure'
        ? 'plan-garage'
        : 'plan-typical';

    const newId = createWorkOrder({
      title: reqTitle.trim(),
      description: `${reqLocation}: ${reqDesc.trim()}`,
      planId,
      x: 38,
      y: 35,
      category: reqCategory,
      source: 'resident',
      reportedByUnit: unitNumber,
      preferredContact: reqContact,
      permissionToEnter: reqEnter,
      urgency: reqUrgency,
      photoUrl: reqPhotoUrl,
      photoCaption: `Resident submission — Unit ${unitNumber}`,
    });
    const created = state.workOrders.find((w) => w.id === newId);
    setReqSubmittedCode(created?.code || 'Submitted');
    setReqTitle('');
    setReqDesc('');
    setReqPhotoUrl(undefined);
  };

  const handleSubmitArc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arcTitle.trim()) return;
    submitArchitecturalRequest({
      unitNumber,
      ownerName: myUnit.ownerName,
      title: arcTitle.trim(),
      description: arcDesc.trim(),
    });
    setArcTitle('');
    setArcDesc('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-4">
      {/* Pinned Owner Header & Segmented Navigation */}
      <div className="sticky top-0 z-10 bg-[#F4F5F7]/95 backdrop-blur-md pt-0.5 pb-4 border-b border-black/[0.06] flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold text-[#1C4ED8] tracking-wide">
            <span className="w-2 h-[2px] bg-[#1C4ED8]" aria-hidden="true" />
            <span>
              RESIDENT PORTAL · UNIT {unitNumber} · {state.settings.name.toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-display font-bold text-[#111318] mt-1 tracking-tight">
            Welcome, {myUnit.ownerName}
          </h1>
          <p className="text-xs text-[#525866] mt-0.5">
            View and pay your unit assessments, submit building maintenance requests, and access owner documents.
          </p>
        </div>

        <div className="arch-segmented overflow-x-auto">
          <button
            type="button"
            onClick={() => setResTab('home')}
            className={`arch-segmented-btn ${resTab === 'home' ? 'arch-segmented-btn-active' : ''}`}
          >
            Account &amp; Notices
          </button>
          <button
            type="button"
            onClick={() => setResTab('request')}
            className={`arch-segmented-btn ${resTab === 'request' ? 'arch-segmented-btn-active' : ''}`}
          >
            Requests ({myRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setResTab('documents')}
            className={`arch-segmented-btn ${resTab === 'documents' ? 'arch-segmented-btn-active' : ''}`}
          >
            Documents ({ownerDocs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: ACCOUNT BALANCE, ONLINE PAYMENT & ANNOUNCEMENTS */}
      {resTab === 'home' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Account & Payment Panel */}
          <div className="lg:col-span-7 space-y-5">
            <div className="arch-surface rounded-2xl p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-[#525866]">Current Balance Due · Unit {unitNumber}</div>
                  <div className="mt-1 font-mono text-3xl font-semibold tabular-nums text-[#111318]">
                    {formatCurrency(totalDue)}
                  </div>
                  <div className="mt-1 text-xs text-[#525866] font-mono">
                    Regular Assessment: {formatCurrency(myUnit.principalBalance)} · Late Fees:{' '}
                    {formatCurrency(myUnit.lateFeeBalance)}
                  </div>
                </div>
                <HealthText
                  status={totalDue === 0 ? 'green' : 'yellow'}
                  label={totalDue === 0 ? 'Paid in Full' : 'November Assessment Open'}
                />
              </div>

              {totalDue > 0 ? (
                <div className="pt-4 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#525866]">Payment Method:</span>
                    <button
                      type="button"
                      onClick={() => setPayMethod('ACH')}
                      className={`px-3 py-1.5 rounded-xl border font-medium transition-colors ${
                        payMethod === 'ACH'
                          ? 'bg-[#EEF3FF] border-[#1C4ED8]/40 text-[#1C4ED8]'
                          : 'bg-white border-black/[0.08] text-[#525866] hover:bg-[#F8F9FB]'
                      }`}
                    >
                      ACH Bank Draft ($0 fee)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod('Card')}
                      className={`px-3 py-1.5 rounded-xl border font-medium transition-colors ${
                        payMethod === 'Card'
                          ? 'bg-[#EEF3FF] border-[#1C4ED8]/40 text-[#1C4ED8]'
                          : 'bg-white border-black/[0.08] text-[#525866] hover:bg-[#F8F9FB]'
                      }`}
                    >
                      Credit / Debit Card
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handlePayNow}
                    className="arch-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Pay {formatCurrency(totalDue)} via {payMethod}
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-black/[0.06] text-xs text-[#15803D] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Your assessment account is current. Next monthly assessment ({formatCurrency(myUnit.monthlyAssessment)}) posts Dec 1, 2026.
                </div>
              )}

              {paySuccess && (
                <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-xs text-[#15803D]">
                  Payment received and matched to Unit {unitNumber} ledger. Switch to Treasurer role anytime to verify it on the association ledger.
                </div>
              )}
            </div>

            {/* Personal Payment History */}
            <div className="arch-surface rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 bg-[#F8F9FB] border-b border-black/[0.06] text-xs font-display font-semibold text-[#111318]">
                Unit {unitNumber} Payment &amp; Assessment History
              </div>
              <div className="divide-y divide-black/[0.05] text-xs">
                {myUnit.transactions.map((tx) => (
                  <div key={tx.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#F8F9FB]/70 transition-colors">
                    <div>
                      <div className="font-medium text-[#111318]">{tx.description}</div>
                      <div className="text-[11px] font-mono text-[#525866]">
                        {formatDateShort(tx.date)}
                        {tx.paymentMethod ? ` · ${tx.paymentMethod}` : ''}
                      </div>
                    </div>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        tx.principalDelta + tx.lateFeeDelta < 0 ? 'text-[#15803D]' : 'text-[#111318]'
                      }`}
                    >
                      {tx.principalDelta + tx.lateFeeDelta > 0 ? '+' : ''}
                      {formatCurrency(tx.principalDelta + tx.lateFeeDelta)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Announcements & Request Status Summary */}
          <div className="lg:col-span-5 space-y-5">
            <div className="arch-surface rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 bg-[#F8F9FB] border-b border-black/[0.06] text-xs font-display font-semibold text-[#111318] flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-[#1C4ED8]" />
                Association Announcements
              </div>
              <div className="divide-y divide-black/[0.05] text-xs">
                {state.announcements.map((a) => (
                  <div key={a.id} className="p-4 space-y-1">
                    <div className="text-[11px] font-mono text-[#525866]">
                      {a.category} · {formatDateShort(a.date)}
                    </div>
                    <div className="font-semibold text-[#111318]">{a.title}</div>
                    <p className="text-[#525866] leading-relaxed">{a.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="arch-surface rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-display font-semibold text-[#111318] flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-[#1C4ED8]" />
                  My Maintenance Requests ({myRequests.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setResTab('request')}
                  className="text-xs font-semibold text-[#1C4ED8] hover:underline"
                >
                  New Request →
                </button>
              </div>
              {myRequests.length === 0 ? (
                <p className="text-xs text-[#787E8C]">You have no open maintenance requests.</p>
              ) : (
                <div className="divide-y divide-black/[0.05] border-t border-black/[0.06] text-xs">
                  {myRequests.map((r) => (
                    <div key={r.id} className="py-2.5 space-y-0.5">
                      <div className="font-medium text-[#111318]">
                        <span className="font-mono text-[#1C4ED8] mr-1.5">{r.code}</span>
                        {r.title}
                      </div>
                      <div className="text-[11px] text-[#525866]">
                        Status: <strong className="capitalize text-[#111318]">{r.status.replace('_', ' ')}</strong> · Submitted{' '}
                        {formatDateShort(r.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBMIT MAINTENANCE OR ARCHITECTURAL REQUEST */}
      {resTab === 'request' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={handleSubmitMaintenance}
            className="lg:col-span-7 arch-surface rounded-2xl p-6 space-y-4 text-xs"
          >
            <div>
              <h2 className="text-base font-display font-semibold text-[#111318]">
                Submit Maintenance or Common-Area Request
              </h2>
              <p className="text-[#525866] mt-0.5">
                Requests automatically pin to the building floorplan and route directly to the Board Action Center.
              </p>
            </div>

            {reqSubmittedCode && (
              <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#15803D]">
                Request submitted ({reqSubmittedCode}) and pinned to the building floorplan for Board triage.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#111318] mb-1">Unit or Building Location</label>
                <input
                  required
                  value={reqLocation}
                  onChange={(e) => setReqLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Category</label>
                <select
                  value={reqCategory}
                  onChange={(e) => setReqCategory(e.target.value as AssetCategory)}
                  className="w-full px-3 py-2 bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8]"
                >
                  <option value="Roof">Roof / Ceiling Leak</option>
                  <option value="Plumbing & Valves">Plumbing / Water</option>
                  <option value="Boiler & HVAC">Heat / Radiator</option>
                  <option value="Elevator">Elevator</option>
                  <option value="Electrical & Meters">Common Lighting / Electrical</option>
                  <option value="Garage & Structure">Garage / Gate</option>
                  <option value="Safety & Hazard">Common-Area Safety / Doors</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-[#111318] mb-1">Short Summary</label>
              <input
                required
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                placeholder="e.g., Slow drip above hallway ceiling near Unit 402"
                className="w-full px-3 py-2 bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#111318] mb-1">Description</label>
              <textarea
                rows={3}
                required
                value={reqDesc}
                onChange={(e) => setReqDesc(e.target.value)}
                placeholder="When did you notice it? Is water actively dripping or affecting common spaces?"
                className="w-full px-3 py-2 bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#111318] mb-1">Preferred Contact Method</label>
                <input
                  value={reqContact}
                  onChange={(e) => setReqContact(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Urgency</label>
                <select
                  value={reqUrgency}
                  onChange={(e) => setReqUrgency(e.target.value as typeof reqUrgency)}
                  className="w-full px-3 py-2 bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8]"
                >
                  <option value="routine">Routine</option>
                  <option value="soon">Needs Attention Soon</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Active Emergency (Leak / No Heat / Safety)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-[#111318]">
                <input
                  type="checkbox"
                  checked={reqEnter}
                  onChange={(e) => setReqEnter(e.target.checked)}
                  className="accent-[#1C4ED8]"
                />
                Permission to enter Unit {unitNumber} if vendor access is needed
              </label>

              <label className="arch-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                {reqPhotoUrl ? 'Photo Attached' : 'Attach Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="arch-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl"
              >
                <Send className="w-3.5 h-3.5" />
                Submit to Board
              </button>
            </div>
          </form>

          {/* Architectural Review Request */}
          <div className="lg:col-span-5 space-y-5">
            <form
              onSubmit={handleSubmitArc}
              className="arch-surface rounded-2xl p-5 space-y-3 text-xs"
            >
              <h3 className="text-sm font-display font-semibold text-[#111318]">
                Architectural Review Request (Unit {unitNumber})
              </h3>
              <p className="text-[#525866]">
                Submit flooring, window, or interior renovation proposals per House Rules.
              </p>
              <input
                required
                value={arcTitle}
                onChange={(e) => setArcTitle(e.target.value)}
                placeholder="Project title (e.g., Bathroom tile & fan upgrade)"
                className="w-full px-3 py-2 bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8]"
              />
              <textarea
                rows={2}
                required
                value={arcDesc}
                onChange={(e) => setArcDesc(e.target.value)}
                placeholder="Contractor name, materials, acoustic specs, and timeline..."
                className="w-full px-3 py-2 bg-white border border-black/[0.12] rounded-xl text-[#111318] focus:outline-none focus:ring-2 focus:ring-[#1C4ED8]/25 focus:border-[#1C4ED8]"
              />
              <button
                type="submit"
                className="arch-btn-primary px-4 py-2 font-semibold rounded-xl"
              >
                Submit Architectural Request
              </button>
            </form>

            <div className="arch-surface rounded-2xl p-5 space-y-2.5 text-xs">
              <div className="font-display font-semibold text-[#111318]">My Architectural Submissions ({myArcRequests.length})</div>
              {myArcRequests.map((arc) => (
                <div key={arc.id} className="pt-2.5 border-t border-black/[0.06]">
                  <div className="font-medium text-[#111318]">{arc.title}</div>
                  <div className="text-[11px] text-[#525866] mt-0.5">
                    Submitted {formatDateShort(arc.submittedDate)} · Status:{' '}
                    <strong className="capitalize text-[#1C4ED8]">{arc.status.replace('_', ' ')}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OWNER-SAFE DOCUMENTS & APPROVED MINUTES */}
      {resTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <div className="arch-surface rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#F8F9FB] border-b border-black/[0.06] text-xs font-display font-semibold text-[#111318]">
              Owner-Available Association Documents ({ownerDocs.length})
            </div>
            <div className="divide-y divide-black/[0.05] text-xs">
              {ownerDocs.map((doc) => (
                <div key={doc.id} className="p-4 flex items-start gap-3 hover:bg-[#F8F9FB]/70 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-[#EEF3FF] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#1C4ED8]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#111318]">
                      {doc.title} <span className="font-mono font-normal text-[#1C4ED8]">{doc.version}</span>
                    </div>
                    <div className="text-[11px] text-[#525866] mt-0.5">
                      {doc.category} · Updated {formatDateShort(doc.updatedAt)} · {doc.fileSize}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="arch-surface rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#F8F9FB] border-b border-black/[0.06] text-xs font-display font-semibold text-[#111318]">
              Meeting Notices &amp; Approved Minutes ({approvedMeetings.length})
            </div>
            <div className="divide-y divide-black/[0.05] text-xs">
              {approvedMeetings.map((m) => (
                <div key={m.id} className="p-4 space-y-1.5 hover:bg-[#F8F9FB]/70 transition-colors">
                  <div className="font-semibold text-[#111318]">
                    {m.title} · <span className="font-mono text-[#525866]">{formatDateShort(m.date)}</span>
                  </div>
                  <p className="text-[#525866] leading-relaxed">{m.minutesSummary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
