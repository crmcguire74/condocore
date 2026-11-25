import React, { useState } from 'react';
import {
  Calendar,
  FileText,
  MapPin,
  Plus,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { useCondoCore } from '../store/CondoCoreContext';
import { AssetDocumentRef, HealthStatus, InspectionTemplateType } from '../types/condocore';
import { daysUntil, formatCurrency, formatDateShort, TODAY_ISO } from '../utils/exports';
import { HealthText, ResilientImage } from './StatusIndicator';

const CATEGORY_TO_TEMPLATE: Record<string, InspectionTemplateType> = {
  Roof: 'Roof',
  'Boiler & HVAC': 'Boiler and HVAC',
  Elevator: 'Elevator',
  'Fire & Sprinkler': 'Fire Alarm and Sprinkler',
  'Plumbing & Valves': 'Plumbing',
  'Electrical & Meters': 'Electrical',
  'Exterior & Masonry': 'Masonry and Exterior Envelope',
  'Garage & Structure': 'Garage',
  'Drain & Water': 'Roof',
  'Safety & Hazard': 'Common-Area Safety',
};

export function AssetDossierDrawer() {
  const {
    state,
    openAssetId,
    setOpenAssetId,
    setOpenWorkOrderId,
    setOpenVendorId,
    setActiveTab,
    getAssetCumulativeSpend,
    canWriteBoard,
    updateAssetCondition,
    attachAssetPhoto,
    attachAssetDocument,
    createInspectionFromTemplate,
    createWorkOrder,
  } = useCondoCore();

  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<AssetDocumentRef['type']>('Inspection Report');
  const [docSummary, setDocSummary] = useState('');

  const [showScheduleInsp, setShowScheduleInsp] = useState(false);
  const [inspDate, setInspDate] = useState('2026-12-05');

  const [showLogWO, setShowLogWO] = useState(false);
  const [woTitle, setWoTitle] = useState('');
  const [woDesc, setWoDesc] = useState('');
  const [woUrgency, setWoUrgency] = useState<'routine' | 'soon' | 'urgent' | 'emergency'>('soon');

  if (!openAssetId) return null;
  const asset = state.assets.find((a) => a.id === openAssetId);
  if (!asset) return null;

  const plan = state.floorPlans.find((p) => p.id === asset.planId);
  const vendor = state.vendors.find((v) => v.id === asset.vendorId);
  const linkedWorkOrders = state.workOrders.filter((wo) => wo.assetId === asset.id);
  const linkedInspections = state.inspections.filter((i) => i.assetId === asset.id);
  const linkedInvoices = state.invoices.filter((inv) => inv.assetId === asset.id);
  const cumulativeSpend = getAssetCumulativeSpend(asset.id);

  const currentYear = 2026;
  const ageYears = Math.max(0, currentYear - asset.installYear);
  const lifeRemaining = Math.max(0, asset.usefulLifeYears - ageYears);
  const lifePctUsed = Math.min(100, Math.round((ageYears / asset.usefulLifeYears) * 100));

  const vendorCoiDays = vendor ? daysUntil(vendor.coiExpiry) : null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        attachAssetPhoto(asset.id, {
          url: reader.result,
          caption: file.name.replace(/\.[^.]+$/, ''),
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    attachAssetDocument(asset.id, {
      title: docTitle.trim(),
      type: docType,
      summary: docSummary.trim() || 'Attached to asset dossier.',
    });
    setDocTitle('');
    setDocSummary('');
    setShowAddDoc(false);
  };

  const handleScheduleInspection = (e: React.FormEvent) => {
    e.preventDefault();
    const tmpl = CATEGORY_TO_TEMPLATE[asset.category] || 'Common-Area Safety';
    createInspectionFromTemplate({
      templateType: tmpl,
      assetId: asset.id,
      vendorId: vendor?.id,
      scheduledDate: inspDate,
      dueDate: inspDate,
      inspectorName: vendor ? `${vendor.primaryContact} (${vendor.company})` : 'Board Facilities Committee',
    });
    setShowScheduleInsp(false);
    setOpenAssetId(null);
    setActiveTab('inspections');
  };

  const handleCreateWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!woTitle.trim()) return;
    const woId = createWorkOrder({
      title: woTitle.trim(),
      description: woDesc.trim() || `Logged directly from ${asset.code} (${asset.name}).`,
      assetId: asset.id,
      planId: asset.planId,
      x: asset.x,
      y: asset.y,
      category: asset.category,
      source: 'board',
      urgency: woUrgency,
      classification: woUrgency === 'emergency' ? 'emergency' : 'maintenance',
      vendorId: vendor?.id,
    });
    setWoTitle('');
    setWoDesc('');
    setShowLogWO(false);
    setOpenAssetId(null);
    setOpenWorkOrderId(woId);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#121316]/35" onClick={() => setOpenAssetId(null)}>
      <div
        className="w-full max-w-2xl bg-white h-full overflow-y-auto border-l border-[#E6E4DE] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#E6E4DE] px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-[#525763] font-mono">
              <span className="font-semibold text-[#1C4ED8]">{asset.code}</span>
              <span aria-hidden="true">·</span>
              <span>{asset.category}</span>
              <span aria-hidden="true">·</span>
              <span>{plan?.name}</span>
            </div>
            <h2 className="text-lg font-display font-semibold text-[#121316] mt-1 leading-snug">
              {asset.name}
            </h2>
            <p className="text-xs text-[#525763] mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{asset.locationDetail}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenAssetId(null)}
            className="p-2 text-[#525763] hover:text-[#121316] hover:bg-[#EFEDE8] rounded transition-colors shrink-0"
            aria-label="Close asset dossier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Quick Actions Bar */}
          {canWriteBoard && (
            <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-[#E6E4DE]">
              <button
                type="button"
                onClick={() => {
                  setShowScheduleInsp((s) => !s);
                  setShowLogWO(false);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#1C4ED8] text-white rounded hover:bg-[#153DB0] transition-colors whitespace-nowrap"
              >
                <Calendar className="w-3.5 h-3.5" />
                Schedule Inspection
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogWO((s) => !s);
                  setShowScheduleInsp(false);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#D2CFC7] text-[#121316] rounded hover:bg-[#EFEDE8] transition-colors whitespace-nowrap"
              >
                <Wrench className="w-3.5 h-3.5" />
                Create Work Order
              </button>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#D2CFC7] text-[#121316] rounded hover:bg-[#EFEDE8] transition-colors cursor-pointer whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />
                Add Photo
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>

              {/* Condition Switcher */}
              <div className="ml-auto flex items-center gap-1 bg-[#EFEDE8] p-0.5 rounded">
                {(['green', 'yellow', 'red'] as HealthStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => updateAssetCondition(asset.id, st)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                      asset.condition === st
                        ? 'bg-white text-[#121316] shadow-xs'
                        : 'text-[#525763] hover:text-[#121316]'
                    }`}
                  >
                    {st === 'green' ? 'Green' : st === 'yellow' ? 'Yellow' : 'Red'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inline Schedule Inspection Form */}
          {showScheduleInsp && (
            <form onSubmit={handleScheduleInspection} className="p-4 bg-[#F7F6F3] border border-[#E6E4DE] rounded space-y-3">
              <div className="text-xs font-semibold text-[#121316]">
                Schedule {CATEGORY_TO_TEMPLATE[asset.category] || 'Building'} Inspection
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#525763] mb-1">Inspection Date</label>
                  <input
                    type="date"
                    value={inspDate}
                    onChange={(e) => setInspDate(e.target.value)}
                    min={TODAY_ISO}
                    required
                    className="w-full px-3 py-1.5 text-sm bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#525763] mb-1">Assigned Vendor</label>
                  <div className="px-3 py-1.5 text-sm bg-[#EFEDE8] border border-[#E6E4DE] rounded text-[#121316] truncate">
                    {vendor ? vendor.company : 'Board Facilities Committee'}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleInsp(false)}
                  className="px-3 py-1.5 text-xs text-[#525763] hover:text-[#121316]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium bg-[#1C4ED8] text-white rounded hover:bg-[#153DB0]"
                >
                  Create &amp; Open Checklist
                </button>
              </div>
            </form>
          )}

          {/* Inline Log Work Order Form */}
          {showLogWO && (
            <form onSubmit={handleCreateWorkOrder} className="p-4 bg-[#F7F6F3] border border-[#E6E4DE] rounded space-y-3">
              <div className="text-xs font-semibold text-[#121316]">
                Open Linked Work Order on {asset.code}
              </div>
              <input
                type="text"
                value={woTitle}
                onChange={(e) => setWoTitle(e.target.value)}
                placeholder="Issue summary (e.g., Re-caulk NW parapet coping joint)"
                required
                className="w-full px-3 py-1.5 text-sm bg-white border border-[#D2CFC7] rounded"
              />
              <textarea
                value={woDesc}
                onChange={(e) => setWoDesc(e.target.value)}
                rows={2}
                placeholder="Scope, location notes, or vendor instructions..."
                className="w-full px-3 py-1.5 text-sm bg-white border border-[#D2CFC7] rounded"
              />
              <div className="flex items-center justify-between gap-3">
                <select
                  value={woUrgency}
                  onChange={(e) => setWoUrgency(e.target.value as typeof woUrgency)}
                  className="px-3 py-1.5 text-xs bg-white border border-[#D2CFC7] rounded"
                >
                  <option value="routine">Routine</option>
                  <option value="soon">Due Soon</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogWO(false)}
                    className="px-3 py-1.5 text-xs text-[#525763]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-medium bg-[#1C4ED8] text-white rounded hover:bg-[#153DB0]"
                  >
                    Create Work Order
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Key Financial & Lifecycle Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-b border-[#E6E4DE]">
            <div>
              <div className="text-xs text-[#525763]">Condition</div>
              <div className="mt-1">
                <HealthText
                  status={asset.condition}
                  label={
                    asset.condition === 'green'
                      ? 'Current'
                      : asset.condition === 'yellow'
                      ? 'Attention'
                      : 'Deficient'
                  }
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-[#525763]">Cumulative Spend</div>
              <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#121316]">
                {formatCurrency(cumulativeSpend)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#525763]">Reserve Replacement</div>
              <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#121316]">
                {formatCurrency(asset.replacementEstimate)}
              </div>
              <div className="text-[11px] font-mono text-[#525763]">Planned {asset.plannedReplacementYear}</div>
            </div>
            <div>
              <div className="text-xs text-[#525763]">Useful Life Left</div>
              <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#121316]">
                {lifeRemaining} yrs
              </div>
              <div className="text-[11px] font-mono text-[#525763]">
                Installed {asset.installYear} ({lifePctUsed}% used)
              </div>
            </div>
          </div>

          {/* Reserve, Budget & Vendor Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-4 border-b border-[#E6E4DE]">
            <div className="space-y-2 text-sm">
              <h3 className="text-xs font-semibold text-[#121316]">Reserve &amp; Budget Linkage</h3>
              <div className="text-xs text-[#525763] space-y-1">
                <div>
                  Reserve Category: <span className="text-[#121316] font-medium">{asset.reserveCategory}</span>
                </div>
                <div>
                  Budget Line: <span className="text-[#121316] font-medium">{asset.budgetCategory}</span>
                </div>
                <div>
                  Last Inspected: <span className="font-mono text-[#121316]">{formatDateShort(asset.lastInspectionDate)}</span>
                </div>
                <div>
                  Next Inspection Due:{' '}
                  <span className="font-mono text-[#121316]">{formatDateShort(asset.nextInspectionDue)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <h3 className="text-xs font-semibold text-[#121316]">Assigned Vendor &amp; Warranty</h3>
              {vendor ? (
                <div className="text-xs text-[#525763] space-y-1">
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenAssetId(null);
                        setOpenVendorId(vendor.id);
                        setActiveTab('vendors');
                      }}
                      className="text-[#1C4ED8] font-medium hover:underline"
                    >
                      {vendor.company}
                    </button>
                  </div>
                  <div>
                    {vendor.primaryContact} · <span className="font-mono">{vendor.phone}</span>
                  </div>
                  <div>
                    COI Status:{' '}
                    <span
                      className={
                        vendorCoiDays !== null && vendorCoiDays <= 30
                          ? 'text-[#B91C1C] font-medium'
                          : 'text-[#15803D] font-medium'
                      }
                    >
                      {vendorCoiDays !== null && vendorCoiDays <= 30
                        ? `Expires in ${vendorCoiDays} days`
                        : `Active thru ${formatDateShort(vendor.coiExpiry)}`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#787E8C]">No contracted vendor assigned.</div>
              )}
              {asset.warrantySummary && (
                <p className="text-xs text-[#525763] pt-1">
                  <span className="font-medium text-[#121316]">Warranty ({formatDateShort(asset.warrantyExpiry)}):</span>{' '}
                  {asset.warrantySummary}
                </p>
              )}
            </div>
          </div>

          {/* Documentary Photographs */}
          {asset.photos.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-[#121316]">Inspection &amp; Condition Photos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {asset.photos.map((ph) => (
                  <figure key={ph.id} className="border border-[#E6E4DE] rounded overflow-hidden bg-[#F7F6F3]">
                    <ResilientImage
                      src={ph.url}
                      alt={ph.caption}
                      className="w-full h-40 object-cover"
                    />
                    <figcaption className="p-2.5 text-xs text-[#525763]">
                      <div className="text-[#121316] font-medium">{ph.caption}</div>
                      <div className="font-mono text-[11px] text-[#787E8C] mt-0.5">
                        {formatDateShort(ph.date)} · {ph.uploadedBy}
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}

          {/* Institutional Notes */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-[#121316]">Asset Continuity Notes</h3>
            <p className="text-sm text-[#525763] leading-relaxed">{asset.notes}</p>
          </div>

          {/* Linked Work Orders & Leak/Repair History */}
          <div className="space-y-2.5 pt-2 border-t border-[#E6E4DE]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#121316]">
                Connected Work Orders &amp; Repair History ({linkedWorkOrders.length})
              </h3>
            </div>
            {linkedWorkOrders.length === 0 ? (
              <p className="text-xs text-[#787E8C]">No work orders logged against this asset.</p>
            ) : (
              <div className="divide-y divide-[#E6E4DE] border-t border-b border-[#E6E4DE]">
                {linkedWorkOrders.map((wo) => (
                  <button
                    key={wo.id}
                    type="button"
                    onClick={() => {
                      setOpenAssetId(null);
                      setOpenWorkOrderId(wo.id);
                    }}
                    className="w-full text-left py-2.5 hover:bg-[#F7F6F3] transition-colors flex items-center justify-between gap-3 px-1"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#121316] truncate">
                        <span className="font-mono text-[#1C4ED8] mr-2">{wo.code}</span>
                        {wo.title}
                      </div>
                      <div className="text-[11px] text-[#525763] mt-0.5">
                        {wo.classification.replace('_', ' ')} · Opened {formatDateShort(wo.createdAt)} · Status:{' '}
                        <span className="font-medium text-[#121316]">{wo.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#1C4ED8] shrink-0">Open →</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Linked Inspections */}
          <div className="space-y-2.5 pt-2 border-t border-[#E6E4DE]">
            <h3 className="text-xs font-semibold text-[#121316]">
              Inspections ({linkedInspections.length})
            </h3>
            {linkedInspections.length === 0 ? (
              <p className="text-xs text-[#787E8C]">No inspections recorded yet.</p>
            ) : (
              <div className="divide-y divide-[#E6E4DE] border-t border-b border-[#E6E4DE]">
                {linkedInspections.map((insp) => (
                  <div key={insp.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-[#121316]">{insp.title}</div>
                      <div className="text-[11px] text-[#525763] mt-0.5">
                        {insp.inspectorName} · Due {formatDateShort(insp.dueDate)} · {insp.status.replace('_', ' ')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenAssetId(null);
                        setActiveTab('inspections');
                      }}
                      className="text-xs font-medium text-[#1C4ED8] hover:underline shrink-0"
                    >
                      View Checklist
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bids, Reports & Warranties */}
          <div className="space-y-2.5 pt-2 border-t border-[#E6E4DE]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#121316]">
                Bids, Reports, Warranties &amp; Invoices ({asset.attachments.length + linkedInvoices.length})
              </h3>
              {canWriteBoard && (
                <button
                  type="button"
                  onClick={() => setShowAddDoc((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1C4ED8] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Attach Record
                </button>
              )}
            </div>

            {showAddDoc && (
              <form onSubmit={handleAddDocument} className="p-3 bg-[#F7F6F3] border border-[#E6E4DE] rounded space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Document or bid title"
                    required
                    className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-white border border-[#D2CFC7] rounded"
                  />
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as AssetDocumentRef['type'])}
                    className="px-2.5 py-1.5 text-xs bg-white border border-[#D2CFC7] rounded"
                  >
                    <option value="Inspection Report">Inspection Report</option>
                    <option value="Bid">Vendor Bid</option>
                    <option value="Warranty">Warranty</option>
                    <option value="Permit">Permit</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={docSummary}
                  onChange={(e) => setDocSummary(e.target.value)}
                  placeholder="Key takeaway or cost note..."
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D2CFC7] rounded"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddDoc(false)} className="text-xs text-[#525763]">
                    Cancel
                  </button>
                  <button type="submit" className="px-3 py-1 text-xs font-medium bg-[#1C4ED8] text-white rounded">
                    Save Attachment
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-[#E6E4DE] border-t border-b border-[#E6E4DE]">
              {asset.attachments.map((att) => (
                <div key={att.id} className="py-2.5 flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-[#525763] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#121316]">{att.title}</div>
                    <div className="text-[11px] text-[#525763] mt-0.5">
                      {att.type} · {formatDateShort(att.date)} — {att.summary}
                    </div>
                  </div>
                </div>
              ))}
              {linkedInvoices.map((inv) => (
                <div key={inv.id} className="py-2.5 flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#121316]">
                      <span className="font-mono text-[#1C4ED8] mr-1.5">{inv.invoiceNumber}</span>
                      {inv.description}
                    </div>
                    <div className="text-[11px] text-[#525763] mt-0.5">
                      Invoice · {inv.fund} fund · Status: {inv.status.replace('_', ' ')}
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold tabular-nums text-[#121316] shrink-0">
                    {formatCurrency(inv.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
