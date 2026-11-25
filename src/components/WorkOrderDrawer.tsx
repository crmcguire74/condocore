import React, { useState } from 'react';
import { CheckCircle2, FileCheck2, MapPin, ShieldAlert, Upload, X } from 'lucide-react';
import { useCondoCore } from '../store/CondoCoreContext';
import { FundType, IssueClassification } from '../types/condocore';
import { daysUntil, formatCurrency, formatDateShort, TODAY_ISO } from '../utils/exports';
import { ResilientImage } from './StatusIndicator';

export function WorkOrderDrawer() {
  const {
    state,
    activeRole,
    openWorkOrderId,
    setOpenWorkOrderId,
    setOpenAssetId,
    setActiveTab,
    canWriteBoard,
    updateWorkOrder,
    addWorkOrderNote,
    submitVendorInvoiceForWorkOrder,
    recordWorkOrderResolutionAndClose,
    createInspectionFromTemplate,
  } = useCondoCore();

  const [noteText, setNoteText] = useState('');
  const [noteInternal, setNoteInternal] = useState(false);

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invNumber, setInvNumber] = useState('INV-4902');
  const [invAmount, setInvAmount] = useState('1450');
  const [invFund, setInvFund] = useState<FundType>('operating');
  const [invFindings, setInvFindings] = useState('');

  const [proofType, setProofType] = useState<'photo' | 'inspection'>('photo');
  const [proofRef, setProofRef] = useState('');
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string | undefined>(undefined);
  const [closeError, setCloseError] = useState<string | null>(null);

  if (!openWorkOrderId) return null;
  const wo = state.workOrders.find((w) => w.id === openWorkOrderId);
  if (!wo) return null;

  const asset = state.assets.find((a) => a.id === wo.assetId);
  const plan = state.floorPlans.find((p) => p.id === wo.planId);
  const vendor = state.vendors.find((v) => v.id === wo.vendorId);
  const linkedInvoice = state.invoices.find((i) => i.id === wo.invoiceId);

  const isBoardOrVendor = canWriteBoard || activeRole === 'vendor';

  const handleMarkRead = () => {
    if (wo.unreadByBoard) updateWorkOrder(wo.id, { unreadByBoard: false });
  };

  const handleSubmitVendorInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(invAmount);
    if (!invNumber.trim() || Number.isNaN(amt) || amt <= 0) return;
    submitVendorInvoiceForWorkOrder(wo.id, {
      invoiceNumber: invNumber.trim(),
      amount: amt,
      fund: invFund,
      budgetCategory: asset?.budgetCategory || 'General Building Maintenance',
      findings: invFindings.trim() || 'Completed repair scope per work order.',
    });
    setShowInvoiceForm(false);
  };

  const handleProofPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofPhotoUrl(reader.result);
        if (!proofRef) setProofRef(`Resolution photo: ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCloseWithProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofRef.trim()) {
      setCloseError('CondoCore requires a documented resolution photo or follow-up inspection before closing.');
      return;
    }
    setCloseError(null);
    recordWorkOrderResolutionAndClose(wo.id, {
      type: proofType,
      reference: proofRef.trim(),
      photoUrl: proofPhotoUrl,
    });
  };

  const handleScheduleFollowUp = () => {
    if (!asset) return;
    createInspectionFromTemplate({
      templateType: asset.category === 'Roof' ? 'Roof' : 'Common-Area Safety',
      assetId: asset.id,
      vendorId: vendor?.id,
      scheduledDate: '2026-12-02',
      dueDate: '2026-12-05',
      inspectorName: vendor ? `${vendor.primaryContact} (${vendor.company})` : 'Board Facilities Director',
    });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    addWorkOrderNote(wo.id, noteText.trim(), noteInternal);
    setNoteText('');
  };

  const visibleNotes =
    activeRole === 'resident' ? wo.notes.filter((n) => !n.internalOnly) : wo.notes;

  const steps: { key: string; label: string; done: boolean }[] = [
    { key: 'reported', label: 'Reported & Pinned', done: true },
    { key: 'classified', label: 'Board Classified', done: wo.classification !== 'unclassified' },
    { key: 'vendor', label: 'Vendor Dispatched', done: Boolean(wo.vendorId) },
    { key: 'invoice', label: 'Findings & Invoice', done: Boolean(wo.invoiceId) || wo.status === 'closed' },
    { key: 'verified', label: 'Verified & Closed', done: wo.status === 'closed' && Boolean(wo.resolutionProof) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#121316]/35" onClick={() => setOpenWorkOrderId(null)}>
      <div
        className="w-full max-w-2xl bg-white h-full overflow-y-auto border-l border-[#E6E4DE] flex flex-col"
        onClick={(e) => {
          e.stopPropagation();
          handleMarkRead();
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#E6E4DE] px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono text-[#525763]">
              <span className="font-semibold text-[#1C4ED8]">{wo.code}</span>
              <span aria-hidden="true">·</span>
              <span>{wo.source.toUpperCase()}</span>
              <span aria-hidden="true">·</span>
              <span className={wo.urgency === 'emergency' ? 'text-[#B91C1C] font-semibold' : ''}>
                {wo.urgency.toUpperCase()}
              </span>
              <span aria-hidden="true">·</span>
              <span>{wo.status.replace('_', ' ').toUpperCase()}</span>
            </div>
            <h2 className="text-lg font-display font-semibold text-[#121316] mt-1 leading-snug">
              {wo.title}
            </h2>
            <div className="text-xs text-[#525763] mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {plan?.name} ({Math.round(wo.x)}%, {Math.round(wo.y)}%)
              </span>
              {asset && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenWorkOrderId(null);
                      setOpenAssetId(asset.id);
                    }}
                    className="text-[#1C4ED8] font-medium hover:underline"
                  >
                    Asset {asset.code}: {asset.name}
                  </button>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpenWorkOrderId(null)}
            className="p-2 text-[#525763] hover:text-[#121316] hover:bg-[#EFEDE8] rounded transition-colors shrink-0"
            aria-label="Close work order"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Event-Driven Lifecycle Stepper */}
          <div className="grid grid-cols-5 gap-2 pb-4 border-b border-[#E6E4DE]">
            {steps.map((st, idx) => (
              <div key={st.key} className="space-y-1">
                <div className={`h-1 rounded-full ${st.done ? 'bg-[#1C4ED8]' : 'bg-[#E6E4DE]'}`} />
                <div className={`text-[11px] leading-tight ${st.done ? 'text-[#121316] font-medium' : 'text-[#787E8C]'}`}>
                  {idx + 1}. {st.label}
                </div>
              </div>
            ))}
          </div>

          {/* Description & Reporter Details */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#121316]">Event Summary</h3>
            <p className="text-sm text-[#525763] leading-relaxed">{wo.description}</p>
            <div className="text-xs text-[#525763] pt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Reported by: <strong className="text-[#121316]">{wo.reportedByName}</strong>
                {wo.reportedByUnit ? ` (Unit ${wo.reportedByUnit})` : ''}
              </span>
              <span>Opened: <span className="font-mono">{formatDateShort(wo.createdAt)}</span></span>
              {wo.preferredContact && <span>Contact: {wo.preferredContact}</span>}
              {wo.permissionToEnter !== undefined && (
                <span>Permission to enter: <strong>{wo.permissionToEnter ? 'Granted' : 'Escort required'}</strong></span>
              )}
            </div>
          </div>

          {/* Photos */}
          {wo.photos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {wo.photos.map((ph) => (
                <figure key={ph.id} className="border border-[#E6E4DE] rounded overflow-hidden bg-[#F7F6F3]">
                  <ResilientImage src={ph.url} alt={ph.caption} className="w-full h-36 object-cover" />
                  <figcaption className="p-2 text-xs text-[#525763]">
                    <div className="text-[#121316] font-medium">{ph.caption}</div>
                    <div className="font-mono text-[11px]">{formatDateShort(ph.date)} · {ph.uploadedBy}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          {/* Board Triage: Classification & COI-Checked Vendor Assignment */}
          {canWriteBoard && wo.status !== 'closed' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F7F6F3] border border-[#E6E4DE] rounded">
              <div>
                <label className="block text-xs font-semibold text-[#121316] mb-1.5">
                  Board Responsibility Classification
                </label>
                <select
                  value={wo.classification}
                  onChange={(e) =>
                    updateWorkOrder(wo.id, {
                      classification: e.target.value as IssueClassification,
                      unreadByBoard: false,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D2CFC7] rounded"
                >
                  <option value="unclassified">Unclassified — Triage Needed</option>
                  <option value="emergency">Association Emergency</option>
                  <option value="maintenance">Association Maintenance</option>
                  <option value="insurance">Insurance Matter</option>
                  <option value="capital">Capital / Reserve Issue</option>
                  <option value="resident_responsibility">Resident Responsibility</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#121316] mb-1.5">
                  Assign Vendor (COI Checked)
                </label>
                <select
                  value={wo.vendorId || ''}
                  onChange={(e) => {
                    const nextVendorId = e.target.value || undefined;
                    updateWorkOrder(wo.id, {
                      vendorId: nextVendorId,
                      status: nextVendorId && wo.status === 'triage' ? 'dispatched' : wo.status,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D2CFC7] rounded"
                >
                  <option value="">Unassigned</option>
                  {state.vendors.map((v) => {
                    const coiDays = daysUntil(v.coiExpiry);
                    return (
                      <option key={v.id} value={v.id}>
                        {v.company} ({coiDays <= 30 ? `COI EXPIRING ${coiDays}d` : 'COI Active'})
                      </option>
                    );
                  })}
                </select>
                {vendor && daysUntil(vendor.coiExpiry) <= 30 && (
                  <p className="mt-1.5 text-[11px] text-[#B91C1C] flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    Warning: {vendor.company} COI expires in {daysUntil(vendor.coiExpiry)} days.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Vendor Findings & Linked Invoice */}
          <div className="space-y-3 pt-2 border-t border-[#E6E4DE]">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-[#121316]">Vendor Findings &amp; Linked Invoice</h3>
              {isBoardOrVendor && wo.vendorId && !wo.invoiceId && wo.status !== 'closed' && (
                <button
                  type="button"
                  onClick={() => setShowInvoiceForm((s) => !s)}
                  className="text-xs font-medium text-[#1C4ED8] hover:underline"
                >
                  + Log Findings &amp; Submit Invoice
                </button>
              )}
            </div>

            {wo.vendorFindings && (
              <p className="text-sm text-[#525763] bg-[#F7F6F3] p-3 rounded border border-[#E6E4DE]">
                <span className="font-medium text-[#121316]">Field Findings:</span> {wo.vendorFindings}
              </p>
            )}

            {linkedInvoice ? (
              <div className="p-3.5 border border-[#E6E4DE] rounded flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-[#121316]">
                    <span className="font-mono text-[#1C4ED8] mr-2">{linkedInvoice.invoiceNumber}</span>
                    {formatCurrency(linkedInvoice.amount)} · {linkedInvoice.fund.replace('_', ' ')} fund
                  </div>
                  <div className="text-[11px] text-[#525763] mt-0.5">
                    Status: <strong className="text-[#121316]">{linkedInvoice.status.replace('_', ' ')}</strong> · Approvals:{' '}
                    {linkedInvoice.approvals.length}/
                    {linkedInvoice.amount >= state.settings.twoPersonApprovalThreshold ? 2 : 1}
                  </div>
                </div>
                {canWriteBoard && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenWorkOrderId(null);
                      setActiveTab('financials');
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-[#1C4ED8] text-white rounded hover:bg-[#153DB0] whitespace-nowrap"
                  >
                    Open in Invoice Approval →
                  </button>
                )}
              </div>
            ) : (
              !showInvoiceForm && (
                <p className="text-xs text-[#787E8C]">No vendor invoice linked yet.</p>
              )
            )}

            {showInvoiceForm && (
              <form onSubmit={handleSubmitVendorInvoice} className="p-4 bg-[#F7F6F3] border border-[#E6E4DE] rounded space-y-3">
                <textarea
                  value={invFindings}
                  onChange={(e) => setInvFindings(e.target.value)}
                  rows={2}
                  required
                  placeholder="Describe root cause found and physical repair completed..."
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D2CFC7] rounded"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={invNumber}
                    onChange={(e) => setInvNumber(e.target.value)}
                    placeholder="Invoice #"
                    required
                    className="px-2.5 py-1.5 text-xs font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                  <input
                    type="number"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    placeholder="Amount ($)"
                    required
                    min={1}
                    className="px-2.5 py-1.5 text-xs font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                  <select
                    value={invFund}
                    onChange={(e) => setInvFund(e.target.value as FundType)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-[#D2CFC7] rounded"
                  >
                    <option value="operating">Operating Fund</option>
                    <option value="reserve">Reserve Fund</option>
                    <option value="special_project">Special Project</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowInvoiceForm(false)} className="text-xs text-[#525763]">
                    Cancel
                  </button>
                  <button type="submit" className="px-3.5 py-1.5 text-xs font-medium bg-[#1C4ED8] text-white rounded">
                    Submit Findings &amp; Route Invoice
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Enforced Closure Gate: Resolution Photo or Follow-up Inspection */}
          <div className="space-y-3 pt-2 border-t border-[#E6E4DE]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#121316]">Verification &amp; Closure Gate</h3>
              {canWriteBoard && wo.status !== 'closed' && asset && (
                <button
                  type="button"
                  onClick={handleScheduleFollowUp}
                  className="text-xs font-medium text-[#1C4ED8] hover:underline"
                >
                  Schedule Follow-Up Inspection
                </button>
              )}
            </div>

            {wo.status === 'closed' && wo.resolutionProof ? (
              <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#15803D]">
                  <CheckCircle2 className="w-4 h-4" />
                  Closed with Verified {wo.resolutionProof.type === 'photo' ? 'Resolution Photo' : 'Follow-Up Inspection'}
                </div>
                <p className="text-xs text-[#121316]">{wo.resolutionProof.reference}</p>
                <div className="text-[11px] font-mono text-[#525763]">
                  Verified {formatDateShort(wo.resolutionProof.recordedAt)} by {wo.resolutionProof.recordedBy}
                </div>
                {wo.resolutionProof.photoUrl && (
                  <ResilientImage
                    src={wo.resolutionProof.photoUrl}
                    alt={wo.resolutionProof.reference}
                    className="w-full max-w-xs h-32 object-cover rounded border border-[#E6E4DE]"
                  />
                )}
              </div>
            ) : canWriteBoard ? (
              <form onSubmit={handleCloseWithProof} className="p-4 bg-[#F7F6F3] border border-[#E6E4DE] rounded space-y-3">
                <p className="text-xs text-[#525763]">
                  Issues cannot be closed until a resolution photo or verified follow-up inspection is recorded.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setProofType('photo')}
                    className={`px-3 py-1.5 text-xs font-medium rounded border ${
                      proofType === 'photo'
                        ? 'bg-white border-[#1C4ED8] text-[#1C4ED8]'
                        : 'bg-transparent border-[#E6E4DE] text-[#525763]'
                    }`}
                  >
                    Resolution Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setProofType('inspection')}
                    className={`px-3 py-1.5 text-xs font-medium rounded border ${
                      proofType === 'inspection'
                        ? 'bg-white border-[#1C4ED8] text-[#1C4ED8]'
                        : 'bg-transparent border-[#E6E4DE] text-[#525763]'
                    }`}
                  >
                    Verified Inspection
                  </button>
                  {proofType === 'photo' && (
                    <label className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white border border-[#D2CFC7] rounded cursor-pointer hover:bg-[#EFEDE8]">
                      <Upload className="w-3.5 h-3.5" />
                      {proofPhotoUrl ? 'Photo Attached' : 'Upload Photo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleProofPhoto} />
                    </label>
                  )}
                </div>
                <input
                  type="text"
                  value={proofRef}
                  onChange={(e) => setProofRef(e.target.value)}
                  placeholder={
                    proofType === 'photo'
                      ? 'Describe resolution photo (e.g., Rain-test dry after 24h at NW scupper)'
                      : 'Reference inspection record or inspector signoff...'
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D2CFC7] rounded"
                />
                {closeError && <p className="text-xs text-[#B91C1C]">{closeError}</p>}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#15803D] text-white rounded hover:bg-[#166534] transition-colors"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    Record Proof &amp; Close Work Order
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-[#787E8C]">Awaiting board verification and closure.</p>
            )}
          </div>

          {/* Activity & Confidential Notes */}
          <div className="space-y-3 pt-2 border-t border-[#E6E4DE]">
            <h3 className="text-xs font-semibold text-[#121316]">Activity Log ({visibleNotes.length})</h3>
            <div className="space-y-2.5">
              {visibleNotes.map((n) => (
                <div key={n.id} className="text-xs border-b border-[#EFEDE8] pb-2">
                  <div className="flex items-center gap-2 text-[#525763]">
                    <span className="font-medium text-[#121316]">{n.author}</span>
                    <span>·</span>
                    <span>{n.role}</span>
                    <span>·</span>
                    <span className="font-mono">{formatDateShort(n.date)}</span>
                    {n.internalOnly && <span className="text-[#B45309] font-medium">· Board Confidential</span>}
                  </div>
                  <p className="text-[#121316] mt-1">{n.text}</p>
                </div>
              ))}
            </div>

            {isBoardOrVendor && (
              <form onSubmit={handleAddNote} className="space-y-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={`Add operational note (${TODAY_ISO})...`}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D2CFC7] rounded"
                />
                <div className="flex items-center justify-between">
                  {canWriteBoard ? (
                    <label className="inline-flex items-center gap-1.5 text-xs text-[#525763]">
                      <input
                        type="checkbox"
                        checked={noteInternal}
                        onChange={(e) => setNoteInternal(e.target.checked)}
                      />
                      Confidential (hidden from residents)
                    </label>
                  ) : (
                    <span />
                  )}
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-medium bg-[#1C4ED8] text-white rounded hover:bg-[#153DB0]"
                  >
                    Post Note
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
