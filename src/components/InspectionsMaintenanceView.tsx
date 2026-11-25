import React, { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, ClipboardCheck, Plus, Search, Wrench } from 'lucide-react';
import { useCondoCore } from '../store/CondoCoreContext';
import { INSPECTION_TEMPLATES } from '../data/seedData';
import { ChecklistResult, InspectionTemplateType } from '../types/condocore';
import { formatCurrency, formatDateShort, TODAY_ISO } from '../utils/exports';
import { HealthText } from './StatusIndicator';
import {
  InteractiveTable,
  sortRows,
  TableColumnDef,
  useInteractiveTable,
} from './InteractiveTable';

const ALL_TEMPLATES = Object.keys(INSPECTION_TEMPLATES) as InspectionTemplateType[];

type WoColKey = 'workOrder' | 'source' | 'vendor' | 'stage' | 'cost' | 'action';

const WO_COLUMNS: TableColumnDef<WoColKey>[] = [
  { key: 'workOrder', label: 'Work Order & Location', widthClass: 'w-[33%]', minWidth: 220 },
  { key: 'source', label: 'Source / Class', widthClass: 'w-[14%]', minWidth: 120 },
  { key: 'vendor', label: 'Assigned Vendor', widthClass: 'w-[18%]', minWidth: 140 },
  { key: 'stage', label: 'Stage', widthClass: 'w-[13%]', minWidth: 110 },
  { key: 'cost', label: 'Est. / Invoice', align: 'right', widthClass: 'w-[14%]', minWidth: 125 },
  { key: 'action', label: 'Action', align: 'right', sortable: false, widthClass: 'w-[8%]', minWidth: 85 },
];

export function InspectionsMaintenanceView() {
  const {
    state,
    canWriteBoard,
    setOpenAssetId,
    setOpenWorkOrderId,
    createInspectionFromTemplate,
    updateInspectionChecklistItem,
    completeInspection,
    escalateChecklistItemToWorkOrder,
    createWorkOrder,
  } = useCondoCore();

  const [subTab, setSubTab] = useState<'work_orders' | 'inspections'>('work_orders');
  const [woFilter, setWoFilter] = useState<'all' | 'active' | 'unread' | 'closed'>('all');
  const [woSearch, setWoSearch] = useState('');
  const [selectedInspId, setSelectedInspId] = useState<string>(state.inspections[0]?.id || '');

  // New Inspection modal
  const [showNewInsp, setShowNewInsp] = useState(false);
  const [newTmpl, setNewTmpl] = useState<InspectionTemplateType>('Boiler and HVAC');
  const [newAssetId, setNewAssetId] = useState(INSPECTION_TEMPLATES['Boiler and HVAC'].defaultAssetId);
  const [newVendorId, setNewVendorId] = useState(INSPECTION_TEMPLATES['Boiler and HVAC'].defaultVendorId || '');
  const [newSchedDate, setNewSchedDate] = useState(TODAY_ISO);
  const [newDueDate, setNewDueDate] = useState('2026-12-10');
  const [newInspector, setNewInspector] = useState('Board Facilities Committee');

  // New Work Order inline drawer/modal
  const [showNewWO, setShowNewWO] = useState(false);
  const [woTitle, setWoTitle] = useState('');
  const [woDesc, setWoDesc] = useState('');
  const [woAssetId, setWoAssetId] = useState('ast-roof-nw');
  const [woUrgency, setWoUrgency] = useState<'routine' | 'soon' | 'urgent' | 'emergency'>('soon');

  const [completionSummary, setCompletionSummary] = useState('');

  const woTable = useInteractiveTable<WoColKey>(WO_COLUMNS);

  const filteredWOs = useMemo(() => {
    const rows = state.workOrders.filter((wo) => {
      if (woFilter === 'active' && wo.status === 'closed') return false;
      if (woFilter === 'unread' && !wo.unreadByBoard) return false;
      if (woFilter === 'closed' && wo.status !== 'closed') return false;
      if (!woSearch.trim()) return true;
      const q = woSearch.toLowerCase();
      const asset = state.assets.find((a) => a.id === wo.assetId);
      const vendor = state.vendors.find((v) => v.id === wo.vendorId);
      return (
        wo.code.toLowerCase().includes(q) ||
        wo.title.toLowerCase().includes(q) ||
        wo.category.toLowerCase().includes(q) ||
        (asset?.name.toLowerCase().includes(q) ?? false) ||
        (vendor?.company.toLowerCase().includes(q) ?? false)
      );
    });

    return sortRows(rows, woTable.sort, (wo, key) => {
      const vendor = state.vendors.find((v) => v.id === wo.vendorId);
      const inv = state.invoices.find((i) => i.id === wo.invoiceId);
      switch (key) {
        case 'workOrder':
          return `${wo.code} ${wo.title}`;
        case 'source':
          return `${wo.source} ${wo.classification}`;
        case 'vendor':
          return vendor?.company || 'Unassigned';
        case 'stage':
          return wo.status;
        case 'cost':
          return inv ? inv.amount : wo.estimatedCost ?? 0;
        default:
          return '';
      }
    });
  }, [state.workOrders, state.assets, state.vendors, state.invoices, woFilter, woSearch, woTable.sort]);

  const activeInspection =
    state.inspections.find((i) => i.id === selectedInspId) || state.inspections[0];

  const handleStartTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const id = createInspectionFromTemplate({
      templateType: newTmpl,
      assetId: newAssetId,
      vendorId: newVendorId || undefined,
      scheduledDate: newSchedDate,
      dueDate: newDueDate,
      inspectorName: newInspector.trim() || 'Board Inspector',
    });
    setSelectedInspId(id);
    setSubTab('inspections');
    setShowNewInsp(false);
  };

  const handleCreateWO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!woTitle.trim()) return;
    const asset = state.assets.find((a) => a.id === woAssetId);
    const id = createWorkOrder({
      title: woTitle.trim(),
      description: woDesc.trim() || 'Board-logged building maintenance work order.',
      assetId: asset?.id,
      planId: asset?.planId || 'plan-roof',
      x: asset?.x ?? 50,
      y: asset?.y ?? 50,
      category: asset?.category || 'Safety & Hazard',
      source: 'board',
      urgency: woUrgency,
      classification: woUrgency === 'emergency' ? 'emergency' : 'maintenance',
      vendorId: asset?.vendorId,
    });
    setWoTitle('');
    setWoDesc('');
    setShowNewWO(false);
    setOpenWorkOrderId(id);
  };

  return (
    <div className="flex flex-col lg:h-full lg:min-h-0 gap-4">
      {/* Pinned Header & Controls */}
      <div className="shrink-0 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-[#111318] tracking-tight">
              Inspections &amp; Maintenance
            </h1>
            <p className="text-xs text-[#525866] mt-0.5">
              Reusable 10-system inspection workflows that convert failed items into asset-linked work orders with one click—preserving full history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="arch-segmented overflow-x-auto">
              <button
                type="button"
                onClick={() => setSubTab('work_orders')}
                className={`arch-segmented-btn ${
                  subTab === 'work_orders' ? 'arch-segmented-btn-active' : ''
                }`}
              >
                Work Orders ({state.workOrders.filter((w) => w.status !== 'closed').length} open)
              </button>
              <button
                type="button"
                onClick={() => setSubTab('inspections')}
                className={`arch-segmented-btn ${
                  subTab === 'inspections' ? 'arch-segmented-btn-active' : ''
                }`}
              >
                Inspections ({state.inspections.length})
              </button>
            </div>

            {canWriteBoard && (
              <button
                type="button"
                onClick={() => (subTab === 'inspections' ? setShowNewInsp(true) : setShowNewWO(true))}
                className="arch-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                {subTab === 'inspections' ? 'Start Inspection' : 'New Work Order'}
              </button>
            )}
          </div>
        </div>

        {/* Pinned Work Orders Search & Filter Toolbar */}
        {subTab === 'work_orders' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#788090] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={woSearch}
                onChange={(e) => setWoSearch(e.target.value)}
                placeholder="Search work order, asset, or vendor..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-black/[0.09] rounded-xl focus:border-[#1C4ED8] focus:outline-none"
              />
            </div>

            <div className="arch-segmented overflow-x-auto">
              {([
                { k: 'all', l: `All (${state.workOrders.length})` },
                { k: 'active', l: `Open (${state.workOrders.filter((w) => w.status !== 'closed').length})` },
                { k: 'unread', l: `Unread (${state.workOrders.filter((w) => w.unreadByBoard).length})` },
                { k: 'closed', l: `Closed (${state.workOrders.filter((w) => w.status === 'closed').length})` },
              ] as const).map((f) => (
                <button
                  key={f.k}
                  type="button"
                  onClick={() => setWoFilter(f.k)}
                  className={`arch-segmented-btn ${
                    woFilter === f.k ? 'arch-segmented-btn-active' : ''
                  }`}
                >
                  {f.l}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SCROLLABLE WORK ORDERS TABLE */}
      {subTab === 'work_orders' && (
        <div className="flex-1 min-h-0 arch-surface rounded-2xl overflow-auto">
          <InteractiveTable controller={woTable} className="min-w-[880px]">
            <tbody className="text-[13px]">
              {filteredWOs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#525866]">
                    No work orders match your current filter.
                  </td>
                </tr>
              ) : (
                filteredWOs.map((wo) => {
                  const asset = state.assets.find((a) => a.id === wo.assetId);
                  const vendor = state.vendors.find((v) => v.id === wo.vendorId);
                  const inv = state.invoices.find((i) => i.id === wo.invoiceId);
                  const sev =
                    wo.status === 'closed'
                      ? 'green'
                      : wo.urgency === 'emergency' || wo.unreadByBoard
                      ? 'red'
                      : 'yellow';

                  return (
                    <tr
                      key={wo.id}
                      onClick={() => setOpenWorkOrderId(wo.id)}
                      className="cursor-pointer"
                    >
                      <td>
                        <div className="font-medium text-[#111318]">
                          <span className="font-mono text-xs text-[#1C4ED8] font-semibold mr-2">{wo.code}</span>
                          {wo.title}
                          {wo.unreadByBoard && (
                            <span className="ml-2 text-xs font-semibold text-[#B91C1C]">
                              · Unread
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#6B7280] mt-0.5">
                          {asset ? `${asset.code} · ${asset.name}` : wo.category} · Opened {formatDateShort(wo.createdAt)}
                        </div>
                      </td>
                      <td className="text-[#525866]">
                        <div className="text-xs text-[#111318] font-medium capitalize">{wo.source}</div>
                        <div className="text-xs capitalize text-[#6B7280]">{wo.classification.replace('_', ' ')}</div>
                      </td>
                      <td className="text-xs text-[#525866]">
                        {vendor ? vendor.company : <span className="text-[#B45309] font-medium">Unassigned</span>}
                      </td>
                      <td>
                        <HealthText
                          status={sev}
                          label={wo.status.replace('_', ' ')}
                        />
                      </td>
                      <td className="text-right font-mono text-xs tabular-nums text-[#111318] font-medium whitespace-nowrap">
                        {inv
                          ? `${formatCurrency(inv.amount)} (${inv.invoiceNumber})`
                          : wo.estimatedCost
                          ? formatCurrency(wo.estimatedCost)
                          : '—'}
                      </td>
                      <td className="text-right text-xs">
                        <span className="font-semibold text-[#1C4ED8] whitespace-nowrap">Manage →</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </InteractiveTable>
        </div>
      )}

      {/* SCROLLABLE INSPECTIONS SPLIT VIEW */}
      {subTab === 'inspections' && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left rail: Independently Scrollable Inspections list + 10 reusable templates */}
          <div className="lg:col-span-4 lg:h-full lg:overflow-y-auto space-y-4 pr-0.5">
            <div className="arch-surface rounded-2xl divide-y divide-black/[0.06] overflow-hidden">
              <div className="px-4 py-3 bg-[#FAFBFD] text-xs font-display font-semibold text-[#111318]">
                Scheduled &amp; Recorded Inspections
              </div>
              {state.inspections.map((insp) => {
                const failedCount = insp.items.filter((i) => i.result === 'fail').length;
                const attnCount = insp.items.filter((i) => i.result === 'needs_attention').length;
                const active = activeInspection?.id === insp.id;
                return (
                  <button
                    key={insp.id}
                    type="button"
                    onClick={() => setSelectedInspId(insp.id)}
                    className={`w-full text-left p-4 transition-colors ${
                      active ? 'bg-[#EEF3FF]/70' : 'hover:bg-[#F8FAFF]'
                    }`}
                  >
                    <div className={`text-xs font-display font-semibold ${active ? 'text-[#1C4ED8]' : 'text-[#111318]'}`}>
                      {insp.title}
                    </div>
                    <div className="text-xs text-[#525866] mt-1">
                      {insp.templateType} · Due <span className="font-mono">{formatDateShort(insp.dueDate)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs">
                      <HealthText
                        status={
                          failedCount > 0
                            ? 'red'
                            : insp.status === 'completed'
                            ? 'green'
                            : 'yellow'
                        }
                        label={insp.status.replace('_', ' ')}
                      />
                      {failedCount > 0 && (
                        <span className="text-[#B91C1C] font-mono">· {failedCount} failed</span>
                      )}
                      {attnCount > 0 && (
                        <span className="text-[#B45309] font-mono">· {attnCount} attention</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 10 Standard Templates Catalog */}
            <div className="arch-surface rounded-2xl p-4 space-y-3">
              <div className="text-xs font-display font-semibold text-[#111318] flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-[#1C4ED8]" />
                10 Reusable Building Templates
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TEMPLATES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={!canWriteBoard}
                    onClick={() => {
                      setNewTmpl(t);
                      setNewAssetId(INSPECTION_TEMPLATES[t].defaultAssetId);
                      setNewVendorId(INSPECTION_TEMPLATES[t].defaultVendorId || '');
                      setShowNewInsp(true);
                    }}
                    className="px-2.5 py-1.5 text-xs bg-[#F8F9FB] hover:bg-[#EEF3FF] hover:text-[#1C4ED8] border border-black/[0.07] rounded-xl text-[#111318] transition-colors disabled:opacity-50"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right pane: Interactive Checklist Runner with Fixed Header & Footer */}
          <div className="lg:col-span-8 arch-surface rounded-2xl overflow-hidden flex flex-col lg:h-full lg:min-h-0">
            {activeInspection ? (
              <>
                <div className="p-5 border-b border-black/[0.06] flex flex-wrap items-start justify-between gap-4 shrink-0 bg-white">
                  <div>
                    <div className="text-xs font-medium text-[#1C4ED8]">
                      {activeInspection.templateType} · Due <span className="font-mono">{formatDateShort(activeInspection.dueDate)}</span>
                    </div>
                    <h2 className="text-lg font-display font-bold text-[#111318] mt-0.5">
                      {activeInspection.title}
                    </h2>
                    <div className="text-xs text-[#525866] mt-1 flex flex-wrap items-center gap-2">
                      <span>Inspector: <strong className="text-[#111318]">{activeInspection.inspectorName}</strong></span>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setOpenAssetId(activeInspection.assetId)}
                        className="text-[#1C4ED8] font-semibold hover:underline"
                      >
                        Open Linked Asset Pin →
                      </button>
                    </div>
                  </div>
                  <HealthText
                    status={
                      activeInspection.status === 'completed'
                        ? 'green'
                        : activeInspection.items.some((i) => i.result === 'fail')
                        ? 'red'
                        : 'yellow'
                    }
                    label={activeInspection.status.replace('_', ' ')}
                  />
                </div>

                {/* Scrollable Checklist Rows */}
                <div className="flex-1 min-h-0 lg:overflow-y-auto divide-y divide-black/[0.06]">
                  {activeInspection.items.map((item) => {
                    const isFlagged = item.result === 'fail' || item.result === 'needs_attention';
                    return (
                      <div key={item.id} className="p-4 sm:p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="text-sm font-medium text-[#111318]">{item.label}</div>

                          {/* Pass / Attention / Fail Segmented Control */}
                          <div className="arch-segmented shrink-0">
                            {(['pass', 'needs_attention', 'fail'] as ChecklistResult[]).map((res) => (
                              <button
                                key={res}
                                type="button"
                                disabled={!canWriteBoard}
                                onClick={() =>
                                  updateInspectionChecklistItem(activeInspection.id, item.id, {
                                    result: res,
                                    severity: res === 'fail' ? 'high' : res === 'needs_attention' ? 'medium' : undefined,
                                  })
                                }
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                                  item.result === res
                                    ? res === 'pass'
                                      ? 'bg-[#15803D] text-white shadow-xs font-semibold'
                                      : res === 'needs_attention'
                                      ? 'bg-[#B45309] text-white shadow-xs font-semibold'
                                      : 'bg-[#B91C1C] text-white shadow-xs font-semibold'
                                    : 'text-[#475062] hover:text-[#111318] hover:bg-white/60'
                                }`}
                              >
                                {res === 'pass' ? 'Pass' : res === 'needs_attention' ? 'Attention' : 'Fail'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              disabled={!canWriteBoard}
                              value={item.measurement || ''}
                              onChange={(e) =>
                                updateInspectionChecklistItem(activeInspection.id, item.id, {
                                  measurement: e.target.value,
                                })
                              }
                              placeholder="Measurement"
                              className="w-28 px-3 py-1.5 font-mono bg-[#F8F9FB] border border-black/[0.08] focus:bg-white focus:border-[#1C4ED8] rounded-xl focus:outline-none"
                            />
                            <span className="text-[#6B7280] font-mono text-xs">
                              {item.measurementUnit || 'units'}
                            </span>
                          </div>

                          <input
                            type="text"
                            disabled={!canWriteBoard}
                            value={item.recommendedAction || ''}
                            onChange={(e) =>
                              updateInspectionChecklistItem(activeInspection.id, item.id, {
                                recommendedAction: e.target.value,
                              })
                            }
                            placeholder="Recommended action or observation..."
                            className="sm:col-span-2 px-3 py-1.5 bg-[#F8F9FB] border border-black/[0.08] focus:bg-white focus:border-[#1C4ED8] rounded-xl focus:outline-none"
                          />
                        </div>

                        {/* One-Click Escalation to Work Order */}
                        {isFlagged && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="text-xs text-[#525866]">
                              {item.estimatedCost ? (
                                <span>
                                  Est. remediation:{' '}
                                  <strong className="font-mono text-[#111318]">
                                    {formatCurrency(item.estimatedCost)}
                                  </strong>
                                </span>
                              ) : (
                                <span>Deficiency flagged — preserve continuity by linking to asset history.</span>
                              )}
                            </div>

                            {item.escalatedIssueId ? (
                              <button
                                type="button"
                                onClick={() => setOpenWorkOrderId(item.escalatedIssueId!)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1C4ED8] hover:underline"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                                Linked Work Order Open
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              canWriteBoard && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    escalateChecklistItemToWorkOrder(activeInspection.id, item.id)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#B91C1C] text-white rounded-xl hover:bg-[#991B1B] transition-colors whitespace-nowrap"
                                >
                                  <Wrench className="w-3.5 h-3.5" />
                                  1-Click Escalate to Work Order
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pinned Finalize Inspection Footer */}
                <div className="p-4 bg-[#FAFBFD] border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  {activeInspection.status === 'completed' ? (
                    <div className="text-xs text-[#15803D] font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        Completed {formatDateShort(activeInspection.completedDate)} · {activeInspection.summary}
                      </span>
                    </div>
                  ) : (
                    canWriteBoard && (
                      <>
                        <input
                          type="text"
                          value={completionSummary}
                          onChange={(e) => setCompletionSummary(e.target.value)}
                          placeholder="Final inspection summary / report reference..."
                          className="flex-1 px-3 py-2 text-xs bg-white border border-black/[0.1] rounded-xl focus:outline-none focus:border-[#1C4ED8]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            completeInspection(
                              activeInspection.id,
                              completionSummary.trim() || 'Inspection checklist verified and archived.'
                            );
                            setCompletionSummary('');
                          }}
                          className="arch-btn-primary px-4 py-2 text-xs font-semibold whitespace-nowrap"
                        >
                          Finalize &amp; Archive Inspection
                        </button>
                      </>
                    )
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-[#525866]">
                Select or start an inspection from the templates panel.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Start New Inspection from Template */}
      {showNewInsp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111318]/45 backdrop-blur-xs p-4">
          <form onSubmit={handleStartTemplate} className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-black/[0.06] font-display font-bold text-base text-[#111318]">
              Start Reusable Inspection Workflow
            </div>
            <div className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#111318] mb-1">Inspection Template</label>
                <select
                  value={newTmpl}
                  onChange={(e) => {
                    const t = e.target.value as InspectionTemplateType;
                    setNewTmpl(t);
                    setNewAssetId(INSPECTION_TEMPLATES[t].defaultAssetId);
                    setNewVendorId(INSPECTION_TEMPLATES[t].defaultVendorId || '');
                  }}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                >
                  {ALL_TEMPLATES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Linked Building Asset Pin</label>
                <select
                  value={newAssetId}
                  onChange={(e) => setNewAssetId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                >
                  {state.assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Inspector or Vendor</label>
                <input
                  type="text"
                  required
                  value={newInspector}
                  onChange={(e) => setNewInspector(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={newSchedDate}
                    onChange={(e) => setNewSchedDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#FAFBFD] border-t border-black/[0.06] flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewInsp(false)} className="arch-btn-secondary px-3.5 py-2 text-xs font-medium">
                Cancel
              </button>
              <button type="submit" className="arch-btn-primary px-4 py-2 text-xs font-semibold">
                Create Checklist
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create Work Order */}
      {showNewWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111318]/45 backdrop-blur-xs p-4">
          <form onSubmit={handleCreateWO} className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-black/[0.06] font-display font-bold text-base text-[#111318]">
              Open Building Work Order
            </div>
            <div className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#111318] mb-1">Linked Asset</label>
                <select
                  value={woAssetId}
                  onChange={(e) => setWoAssetId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                >
                  {state.assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  value={woTitle}
                  onChange={(e) => setWoTitle(e.target.value)}
                  placeholder="Describe the repair or hazard..."
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Details</label>
                <textarea
                  rows={3}
                  value={woDesc}
                  onChange={(e) => setWoDesc(e.target.value)}
                  placeholder="Location specifics, symptoms, vendor instructions..."
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Urgency</label>
                <select
                  value={woUrgency}
                  onChange={(e) => setWoUrgency(e.target.value as typeof woUrgency)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                >
                  <option value="routine">Routine</option>
                  <option value="soon">Due Soon</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#FAFBFD] border-t border-black/[0.06] flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewWO(false)} className="arch-btn-secondary px-3.5 py-2 text-xs font-medium">
                Cancel
              </button>
              <button type="submit" className="arch-btn-primary px-4 py-2 text-xs font-semibold">
                Open Work Order
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
