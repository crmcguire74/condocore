import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Download,
  FileText,
  Mail,
  Phone,
  PhoneCall,
  Plus,
  Search,
  Wrench,
  X,
} from 'lucide-react';
import { useCondoCore } from '../store/CondoCoreContext';
import { downloadCsv, formatCurrency, formatDateShort } from '../utils/exports';
import { HealthText } from './StatusIndicator';
import {
  InteractiveTable,
  sortRows,
  TableColumnDef,
  useInteractiveTable,
} from './InteractiveTable';

type VendorFilter = 'all' | 'flagged' | 'compliant';
type DossierTab = 'overview' | 'activity' | 'assets';

type VendorColKey = 'company' | 'contact' | 'spend' | 'coi' | 'contractEnd' | 'status' | 'action';
type VendorWoColKey = 'code' | 'title' | 'createdAt' | 'status' | 'action';
type VendorInvColKey = 'invoiceNumber' | 'description' | 'receivedDate' | 'status' | 'amount';

const VENDOR_COLUMNS: TableColumnDef<VendorColKey>[] = [
  { key: 'company', label: 'Contractor & Trade', widthClass: 'w-[24%]', minWidth: 180 },
  { key: 'contact', label: 'Contact & 24/7 Emergency', widthClass: 'w-[21%]', minWidth: 170 },
  { key: 'spend', label: 'YTD Spend vs Cap', widthClass: 'w-[18%]', minWidth: 160 },
  { key: 'coi', label: 'Insurance (COI)', widthClass: 'w-[12%]', minWidth: 120 },
  { key: 'contractEnd', label: 'Contract End', widthClass: 'w-[11%]', minWidth: 115 },
  { key: 'status', label: 'Status', widthClass: 'w-[9%]', minWidth: 95 },
  { key: 'action', label: 'Dossier', align: 'right', sortable: false, widthClass: 'w-[5%]', minWidth: 80 },
];

const VENDOR_WO_COLUMNS: TableColumnDef<VendorWoColKey>[] = [
  { key: 'code', label: 'Code', minWidth: 90 },
  { key: 'title', label: 'Work Order', minWidth: 160 },
  { key: 'createdAt', label: 'Opened', minWidth: 100 },
  { key: 'status', label: 'Stage', minWidth: 100 },
  { key: 'action', label: 'Action', align: 'right', sortable: false, minWidth: 75 },
];

const VENDOR_INV_COLUMNS: TableColumnDef<VendorInvColKey>[] = [
  { key: 'invoiceNumber', label: 'Invoice #', minWidth: 95 },
  { key: 'description', label: 'Description & Category', minWidth: 170 },
  { key: 'receivedDate', label: 'Received', minWidth: 100 },
  { key: 'status', label: 'Status', minWidth: 100 },
  { key: 'amount', label: 'Amount', align: 'right', minWidth: 95 },
];

export function VendorsView() {
  const {
    state,
    activeRole,
    openVendorId,
    setOpenVendorId,
    setOpenAssetId,
    setOpenWorkOrderId,
    getVendorFlags,
    canWriteBoard,
    addVendor,
    updateVendorCompliance,
  } = useCondoCore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<VendorFilter>('all');
  const [dossierTab, setDossierTab] = useState<DossierTab>('overview');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add vendor form
  const [company, setCompany] = useState('');
  const [services, setServices] = useState('');
  const [primaryContact, setPrimaryContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [contractEnd, setContractEnd] = useState('2027-12-31');
  const [contractCap, setContractCap] = useState('10000');
  const [coiExpiry, setCoiExpiry] = useState('2027-12-31');
  const [scope, setScope] = useState('');
  const [serviceTrigger, setServiceTrigger] = useState('');
  const [responseReq, setResponseReq] = useState('');

  const flaggedTotal = useMemo(
    () => state.vendors.filter((v) => getVendorFlags(v).hasAnyFlag).length,
    [state.vendors, getVendorFlags]
  );

  const compliantTotal = state.vendors.length - flaggedTotal;

  const visibleVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.vendors.filter((v) => {
      const flags = getVendorFlags(v);
      if (filterMode === 'flagged' && !flags.hasAnyFlag) return false;
      if (filterMode === 'compliant' && flags.hasAnyFlag) return false;
      if (!q) return true;
      return (
        v.company.toLowerCase().includes(q) ||
        v.primaryContact.toLowerCase().includes(q) ||
        v.services.some((s) => s.toLowerCase().includes(q)) ||
        v.email.toLowerCase().includes(q)
      );
    });
  }, [state.vendors, searchQuery, filterMode, getVendorFlags]);

  const vendorTable = useInteractiveTable<VendorColKey>(VENDOR_COLUMNS);
  const vendorWoTable = useInteractiveTable<VendorWoColKey>(VENDOR_WO_COLUMNS);
  const vendorInvTable = useInteractiveTable<VendorInvColKey>(VENDOR_INV_COLUMNS);

  const sortedVendors = useMemo(() => {
    return sortRows(visibleVendors, vendorTable.sort, (v, key) => {
      const flags = getVendorFlags(v);
      switch (key) {
        case 'company':
          return v.company;
        case 'contact':
          return v.primaryContact;
        case 'spend':
          return flags.totalInvoiced;
        case 'coi':
          return v.coiExpiry;
        case 'contractEnd':
          return v.contractEnd;
        case 'status':
          return flags.coiExpiringSoon || flags.overContractCap
            ? 0
            : flags.contractExpiringSoon || flags.missedServices || flags.unresolvedIssuesCount > 0
            ? 1
            : 2;
        default:
          return '';
      }
    });
  }, [visibleVendors, vendorTable.sort, getVendorFlags]);

  const selectedVendor = openVendorId
    ? state.vendors.find((v) => v.id === openVendorId) || null
    : null;

  const selectedFlags = selectedVendor ? getVendorFlags(selectedVendor) : null;
  const assignedAssets = selectedVendor
    ? state.assets.filter((a) => a.vendorId === selectedVendor.id)
    : [];
  const vendorWOs = useMemo(() => {
    const rows = selectedVendor ? state.workOrders.filter((w) => w.vendorId === selectedVendor.id) : [];
    return sortRows(rows, vendorWoTable.sort, (w, key) => {
      switch (key) {
        case 'code':
          return w.code;
        case 'title':
          return w.title;
        case 'createdAt':
          return w.createdAt;
        case 'status':
          return w.status;
        default:
          return '';
      }
    });
  }, [selectedVendor, state.workOrders, vendorWoTable.sort]);

  const vendorInvoices = useMemo(() => {
    const rows = selectedVendor ? state.invoices.filter((i) => i.vendorId === selectedVendor.id) : [];
    return sortRows(rows, vendorInvTable.sort, (inv, key) => {
      switch (key) {
        case 'invoiceNumber':
          return inv.invoiceNumber;
        case 'description':
          return inv.description;
        case 'receivedDate':
          return inv.receivedDate;
        case 'status':
          return inv.status;
        case 'amount':
          return inv.amount;
        default:
          return '';
      }
    });
  }, [selectedVendor, state.invoices, vendorInvTable.sort]);

  const handleExportVendors = () => {
    downloadCsv(
      'alderwood_vendor_obligations.csv',
      [
        'Company',
        'Primary Contact',
        'Phone',
        'Emergency Phone',
        'Contract End',
        'Annual Cap',
        'Invoiced YTD',
        'COI Expiry',
        'W-9 On File',
        'Missed Services',
        'Board Rating',
      ],
      state.vendors.map((v) => {
        const flags = getVendorFlags(v);
        return [
          v.company,
          v.primaryContact,
          v.phone,
          v.emergencyPhone,
          v.contractEnd,
          v.contractAnnualCap,
          flags.totalInvoiced,
          v.coiExpiry,
          v.w9OnFile ? 'Yes' : 'No',
          v.missedServicesCount,
          v.boardRating,
        ];
      })
    );
  };

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;
    addVendor({
      company: company.trim(),
      services: services
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      primaryContact: primaryContact.trim() || 'Account Manager',
      phone: phone.trim() || '(312) 555-0100',
      email: email.trim() || 'service@vendor.com',
      emergencyContact: '24/7 Dispatch',
      emergencyPhone: emergencyPhone.trim() || phone.trim() || '(312) 555-0199',
      contractStart: '2026-11-25',
      contractEnd,
      contractScope: scope.trim() || 'Scheduled maintenance & board-authorized repairs.',
      contractAnnualCap: Number(contractCap) || 10000,
      renewalTerms: 'Annual written renewal by Board approval.',
      coiPolicyNumber: `COI-${Date.now().toString().slice(-5)}`,
      coiCoverageAmount: 2000000,
      coiExpiry,
      licenseNumber: 'Verified on file',
      w9OnFile: true,
      paymentMethod: 'ACH',
      recurringSchedule: 'Per contract schedule',
      sla: {
        serviceTrigger: serviceTrigger.trim() || 'Board work order dispatch',
        responseRequirement: responseReq.trim() || 'Within 24 hours',
      },
      boardRating: 4.5,
      confidentialBoardNotes: 'Added by Board via CondoCore Vendor Directory.',
    });
    setShowAddModal(false);
    setCompany('');
    setServices('');
    setScope('');
  };

  const spendPct =
    selectedVendor && selectedFlags && selectedVendor.contractAnnualCap > 0
      ? Math.min(100, Math.round((selectedFlags.totalInvoiced / selectedVendor.contractAnnualCap) * 100))
      : 0;

  return (
    <div className="flex flex-col lg:h-full lg:min-h-0 gap-4">
      {/* PINNED TOP HEADER & SEARCH/FILTER TOOLBAR */}
      <div className="shrink-0 space-y-3.5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-[#111318] tracking-tight">
              Vendors &amp; Contractors
            </h1>
            <p className="text-xs text-[#525866] mt-0.5">
              Compare contracted vendors, track annual spend caps, verify insurance certificates, and open full contractor dossiers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportVendors}
              className="arch-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#525866]" />
              Export CSV
            </button>

            {canWriteBoard && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="arch-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Vendor
              </button>
            )}
          </div>
        </div>

        {/* Search + Segmented Status Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-[#788090] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contractor, trade, or contact..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-black/[0.09] rounded-xl focus:border-[#1C4ED8] focus:outline-none"
            />
          </div>

          <div className="arch-segmented overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`arch-segmented-btn ${filterMode === 'all' ? 'arch-segmented-btn-active' : ''}`}
            >
              All Vendors ({state.vendors.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('flagged')}
              className={`arch-segmented-btn ${filterMode === 'flagged' ? 'arch-segmented-btn-active' : ''}`}
            >
              Action Needed ({flaggedTotal})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('compliant')}
              className={`arch-segmented-btn ${filterMode === 'compliant' ? 'arch-segmented-btn-active' : ''}`}
            >
              Good Standing ({compliantTotal})
            </button>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH MODERN ZEBRA-STRIPED VENDOR DATA GRID */}
      <div className="flex-1 min-h-0 arch-surface rounded-2xl overflow-auto">
        <InteractiveTable controller={vendorTable} className="min-w-[1040px]">
          <tbody className="text-[13px]">
            {sortedVendors.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <div className="text-sm font-display font-semibold text-[#111318]">
                    No contractors match your current filter
                  </div>
                  <p className="text-xs text-[#525866] mt-1">
                    Try adjusting your search query or viewing all vendors.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterMode('all');
                    }}
                    className="mt-3 text-xs font-semibold text-[#1C4ED8] hover:underline cursor-pointer"
                  >
                    Clear filters
                  </button>
                </td>
              </tr>
            ) : (
              sortedVendors.map((v) => {
                const flags = getVendorFlags(v);
                const isSelected = selectedVendor?.id === v.id;
                const status =
                  flags.coiExpiringSoon || flags.overContractCap
                    ? 'red'
                    : flags.contractExpiringSoon || flags.missedServices || flags.unresolvedIssuesCount > 0
                    ? 'yellow'
                    : 'green';
                const capPct =
                  v.contractAnnualCap > 0
                    ? Math.min(100, Math.round((flags.totalInvoiced / v.contractAnnualCap) * 100))
                    : 0;

                const alerts: string[] = [];
                if (flags.coiExpiringSoon) alerts.push(`COI expires in ${flags.coiDaysLeft}d`);
                if (flags.overContractCap) alerts.push('Over annual cap');
                if (flags.missedServices) alerts.push(`${v.missedServicesCount} missed PM`);
                if (flags.contractExpiringSoon) alerts.push(`Renewal in ${flags.contractDaysLeft}d`);
                if (flags.unresolvedIssuesCount > 0) alerts.push(`${flags.unresolvedIssuesCount} open WO`);

                return (
                  <tr
                    key={v.id}
                    onClick={() => {
                      setOpenVendorId(v.id);
                      setDossierTab('overview');
                    }}
                    className={`cursor-pointer ${isSelected ? 'arch-row-selected' : ''}`}
                  >
                    <td>
                      <div className="font-display font-semibold text-[#111318] text-sm">
                        {v.company}
                      </div>
                      <div className="text-xs text-[#525866] mt-1 leading-snug">
                        {v.services.join(' · ')}
                      </div>
                      {alerts.length > 0 && (
                        <div
                          className={`text-xs font-medium mt-1.5 ${
                            status === 'red' ? 'text-[#B91C1C]' : 'text-[#B45309]'
                          }`}
                        >
                          {alerts.join(' · ')}
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="font-medium text-[#111318] text-xs">{v.primaryContact}</div>
                      <div className="font-mono text-xs text-[#525866] mt-0.5">{v.phone}</div>
                      <div className="text-xs text-[#B91C1C] font-medium mt-1 inline-flex items-center gap-1">
                        <PhoneCall className="w-3 h-3 shrink-0" />
                        <span className="font-mono">{v.emergencyPhone}</span>
                      </div>
                    </td>

                    <td>
                      <div className="flex items-baseline justify-between gap-2 font-mono text-xs tabular-nums">
                        <span
                          className={`font-semibold ${
                            flags.overContractCap ? 'text-[#B91C1C]' : 'text-[#111318]'
                          }`}
                        >
                          {formatCurrency(flags.totalInvoiced)}
                        </span>
                        <span className="text-[#6B7280]">/ {formatCurrency(v.contractAnnualCap)}</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            flags.overContractCap
                              ? 'bg-[#DC2626]'
                              : capPct > 80
                              ? 'bg-[#D97706]'
                              : 'bg-[#1C4ED8]'
                          }`}
                          style={{ width: `${capPct}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-1">
                        Rating <span className="font-mono font-medium text-[#111318]">{v.boardRating.toFixed(1)}</span>/5.0 · {v.paymentMethod}
                      </div>
                    </td>

                    <td>
                      <div
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          flags.coiExpiringSoon ? 'text-[#B91C1C]' : 'text-[#111318]'
                        }`}
                      >
                        {formatDateShort(v.coiExpiry)}
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-0.5">
                        {flags.coiExpiringSoon
                          ? `${flags.coiDaysLeft}d remaining`
                          : `${formatCurrency(v.coiCoverageAmount)}`}
                      </div>
                    </td>

                    <td>
                      <div
                        className={`font-mono text-xs font-medium tabular-nums ${
                          flags.contractExpiringSoon ? 'text-[#B45309] font-semibold' : 'text-[#111318]'
                        }`}
                      >
                        {formatDateShort(v.contractEnd)}
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-0.5">
                        W-9 {v.w9OnFile ? 'On File' : 'Missing'}
                      </div>
                    </td>

                    <td>
                      <HealthText
                        status={status}
                        label={status === 'red' ? 'Action' : status === 'yellow' ? 'Watch' : 'Good'}
                      />
                    </td>

                    <td className="text-right whitespace-nowrap">
                      <span className="text-xs font-semibold text-[#1C4ED8]">Open →</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </InteractiveTable>
      </div>

      {/* SLIDE-OVER VENDOR DOSSIER DRAWER */}
      {selectedVendor && selectedFlags && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#111318]/45 backdrop-blur-xs"
          onClick={() => setOpenVendorId(null)}
        >
          <section
            className="w-full max-w-3xl bg-white h-full flex flex-col border-l border-black/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pinned Drawer Header */}
            <div className="shrink-0 bg-white border-b border-black/[0.06]">
              <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-lg sm:text-xl font-display font-bold text-[#111318] tracking-tight">
                      {selectedVendor.company}
                    </h2>
                    <HealthText
                      status={
                        selectedFlags.coiExpiringSoon || selectedFlags.overContractCap
                          ? 'red'
                          : selectedFlags.hasAnyFlag
                          ? 'yellow'
                          : 'green'
                      }
                      label={
                        selectedFlags.coiExpiringSoon || selectedFlags.overContractCap
                          ? 'Action Required'
                          : selectedFlags.hasAnyFlag
                          ? 'Needs Review'
                          : 'In Good Standing'
                      }
                    />
                  </div>
                  <div className="text-xs text-[#525866]">{selectedVendor.services.join(' · ')}</div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-[#374151]">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#788090]" />
                      <span className="font-medium">{selectedVendor.primaryContact}</span>
                      <span className="font-mono text-[#525866]">{selectedVendor.phone}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[#525866]">
                      <Mail className="w-3.5 h-3.5 text-[#788090]" />
                      {selectedVendor.email}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[#B91C1C] font-medium">
                      <PhoneCall className="w-3.5 h-3.5" />
                      24/7: <span className="font-mono">{selectedVendor.emergencyPhone}</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenVendorId(null)}
                  className="p-1.5 text-[#525866] hover:text-[#111318] rounded-lg hover:bg-black/[0.04] shrink-0"
                  aria-label="Close vendor dossier"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 4-Metric Glance Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-black/[0.06] bg-[#FAFBFD] divide-y sm:divide-y-0 sm:divide-x divide-black/[0.06]">
                <div className="px-5 py-3">
                  <div className="text-[11px] text-[#6B7280]">Invoiced vs Cap</div>
                  <div
                    className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                      selectedFlags.overContractCap ? 'text-[#B91C1C]' : 'text-[#111318]'
                    }`}
                  >
                    {formatCurrency(selectedFlags.totalInvoiced)}{' '}
                    <span className="text-xs font-normal text-[#6B7280]">
                      / {formatCurrency(selectedVendor.contractAnnualCap)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-[#E5E9F0] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        selectedFlags.overContractCap ? 'bg-[#DC2626]' : 'bg-[#1C4ED8]'
                      }`}
                      style={{ width: `${spendPct}%` }}
                    />
                  </div>
                </div>

                <div className="px-5 py-3">
                  <div className="text-[11px] text-[#6B7280]">Insurance (COI)</div>
                  <div
                    className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                      selectedFlags.coiExpiringSoon ? 'text-[#B91C1C]' : 'text-[#111318]'
                    }`}
                  >
                    {formatDateShort(selectedVendor.coiExpiry)}
                  </div>
                  <div className="text-[11px] text-[#525866] mt-0.5">
                    {selectedFlags.coiExpiringSoon
                      ? `Expires in ${selectedFlags.coiDaysLeft} days`
                      : `${formatCurrency(selectedVendor.coiCoverageAmount)} coverage`}
                  </div>
                </div>

                <div className="px-5 py-3">
                  <div className="text-[11px] text-[#6B7280]">Contract Renewal</div>
                  <div
                    className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                      selectedFlags.contractExpiringSoon ? 'text-[#B45309]' : 'text-[#111318]'
                    }`}
                  >
                    {formatDateShort(selectedVendor.contractEnd)}
                  </div>
                  <div className="text-[11px] text-[#525866] mt-0.5">
                    {selectedFlags.contractDaysLeft > 0
                      ? `${selectedFlags.contractDaysLeft} days remaining`
                      : 'Renewal overdue'}
                  </div>
                </div>

                <div className="px-5 py-3">
                  <div className="text-[11px] text-[#6B7280]">Board Rating</div>
                  <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-[#111318]">
                    {selectedVendor.boardRating.toFixed(1)} / 5.0
                  </div>
                  <div className="text-[11px] text-[#525866] mt-0.5">
                    W-9 {selectedVendor.w9OnFile ? 'On File' : 'Missing'} · {selectedVendor.paymentMethod}
                  </div>
                </div>
              </div>

              {/* Drawer Sub-Tabs */}
              <div className="px-6 py-3 border-t border-black/[0.06]">
                <div className="arch-segmented overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setDossierTab('overview')}
                    className={`arch-segmented-btn ${dossierTab === 'overview' ? 'arch-segmented-btn-active' : ''}`}
                  >
                    Contract &amp; SLA
                  </button>
                  <button
                    type="button"
                    onClick={() => setDossierTab('activity')}
                    className={`arch-segmented-btn ${dossierTab === 'activity' ? 'arch-segmented-btn-active' : ''}`}
                  >
                    Jobs &amp; Invoices ({vendorWOs.length + vendorInvoices.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDossierTab('assets')}
                    className={`arch-segmented-btn ${dossierTab === 'assets' ? 'arch-segmented-btn-active' : ''}`}
                  >
                    Assets &amp; Notes ({assignedAssets.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
              {selectedFlags.hasAnyFlag && (
                <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-display font-semibold text-[#991B1B] inline-flex items-center gap-1.5 text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Items Requiring Board Attention
                    </div>
                    {canWriteBoard && (
                      <div className="flex flex-wrap gap-2">
                        {selectedFlags.coiExpiringSoon && (
                          <button
                            type="button"
                            onClick={() =>
                              updateVendorCompliance(selectedVendor.id, { coiExpiry: '2027-12-15' })
                            }
                            className="arch-btn-primary px-3 py-1.5 text-xs font-semibold"
                          >
                            Record Renewed COI
                          </button>
                        )}
                        {selectedFlags.missedServices && (
                          <button
                            type="button"
                            onClick={() =>
                              updateVendorCompliance(selectedVendor.id, { missedServicesCount: 0 })
                            }
                            className="arch-btn-secondary px-3 py-1.5 text-xs font-medium"
                          >
                            Mark PM Visit Done
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <ul className="list-disc pl-5 text-[#7F1D1D] space-y-1">
                    {selectedFlags.coiExpiringSoon && (
                      <li>
                        Insurance policy <span className="font-mono">{selectedVendor.coiPolicyNumber}</span> expires in{' '}
                        <strong>{selectedFlags.coiDaysLeft} days</strong> ({formatDateShort(selectedVendor.coiExpiry)}).
                      </li>
                    )}
                    {selectedFlags.overContractCap && (
                      <li>
                        YTD spend ({formatCurrency(selectedFlags.totalInvoiced)}) is above the{' '}
                        {formatCurrency(selectedVendor.contractAnnualCap)} annual cap.
                      </li>
                    )}
                    {selectedFlags.contractExpiringSoon && (
                      <li>
                        Contract term ends in {selectedFlags.contractDaysLeft} days ({formatDateShort(selectedVendor.contractEnd)}).
                      </li>
                    )}
                    {selectedFlags.missedServices && (
                      <li>{selectedVendor.missedServicesCount} scheduled preventive visit(s) missed.</li>
                    )}
                    {selectedFlags.unresolvedIssuesCount > 0 && (
                      <li>{selectedFlags.unresolvedIssuesCount} open work order(s) currently assigned.</li>
                    )}
                  </ul>
                </div>
              )}

              {/* TAB 1: CONTRACT & SLA */}
              {dossierTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-display font-bold text-[#111318] mb-2">Scope of Work</h3>
                    <p className="text-sm text-[#374151] leading-relaxed">{selectedVendor.contractScope}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 border-t border-black/[0.06]">
                    <div className="space-y-3">
                      <h3 className="text-sm font-display font-bold text-[#111318]">Contract Terms</h3>
                      <dl className="space-y-2.5 text-xs">
                        <div className="flex justify-between gap-4 py-1.5 border-b border-black/[0.05]">
                          <dt className="text-[#6B7280]">Contract Term</dt>
                          <dd className="font-mono text-[#111318] text-right">
                            {formatDateShort(selectedVendor.contractStart)} – {formatDateShort(selectedVendor.contractEnd)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4 py-1.5 border-b border-black/[0.05]">
                          <dt className="text-[#6B7280]">Service Schedule</dt>
                          <dd className="text-[#111318] font-medium text-right">{selectedVendor.recurringSchedule}</dd>
                        </div>
                        <div className="flex justify-between gap-4 py-1.5 border-b border-black/[0.05]">
                          <dt className="text-[#6B7280]">Renewal Clause</dt>
                          <dd className="text-[#111318] text-right">{selectedVendor.renewalTerms}</dd>
                        </div>
                        <div className="flex justify-between gap-4 py-1.5">
                          <dt className="text-[#6B7280]">Payment &amp; Tax</dt>
                          <dd className="text-[#111318] text-right">
                            {selectedVendor.paymentMethod} · W-9 {selectedVendor.w9OnFile ? 'Verified' : 'Needed'}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-display font-bold text-[#111318]">Service Guarantees &amp; Insurance</h3>
                      <dl className="space-y-2.5 text-xs">
                        {selectedVendor.sla.serviceTrigger && (
                          <div className="flex justify-between gap-4 py-1.5 border-b border-black/[0.05]">
                            <dt className="text-[#6B7280] shrink-0">Service Trigger</dt>
                            <dd className="text-[#111318] font-medium text-right">{selectedVendor.sla.serviceTrigger}</dd>
                          </div>
                        )}
                        {selectedVendor.sla.responseRequirement && (
                          <div className="flex justify-between gap-4 py-1.5 border-b border-black/[0.05]">
                            <dt className="text-[#6B7280] shrink-0">Response SLA</dt>
                            <dd className="text-[#111318] font-medium text-right">{selectedVendor.sla.responseRequirement}</dd>
                          </div>
                        )}
                        {selectedVendor.sla.materialPolicy && (
                          <div className="flex justify-between gap-4 py-1.5 border-b border-black/[0.05]">
                            <dt className="text-[#6B7280] shrink-0">Material Policy</dt>
                            <dd className="text-[#111318] text-right">{selectedVendor.sla.materialPolicy}</dd>
                          </div>
                        )}
                        {selectedVendor.sla.serviceArea && (
                          <div className="flex justify-between gap-4 py-1.5 border-b border-black/[0.05]">
                            <dt className="text-[#6B7280] shrink-0">Service Area</dt>
                            <dd className="text-[#111318] text-right">{selectedVendor.sla.serviceArea}</dd>
                          </div>
                        )}
                        <div className="flex justify-between gap-4 py-1.5 border-b border-black/[0.05]">
                          <dt className="text-[#6B7280] shrink-0">COI Policy</dt>
                          <dd className="font-mono text-[#111318] text-right">
                            {selectedVendor.coiPolicyNumber} ({formatCurrency(selectedVendor.coiCoverageAmount)})
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4 py-1.5">
                          <dt className="text-[#6B7280] shrink-0">Trade License</dt>
                          <dd className="font-mono text-[#111318] text-right">{selectedVendor.licenseNumber}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: JOBS & INVOICES (MODERN ZEBRA-STRIPED DATA GRIDS) */}
              {dossierTab === 'activity' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-display font-bold text-[#111318] inline-flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-[#1C4ED8]" />
                      Work Orders ({vendorWOs.length})
                    </h3>
                    {vendorWOs.length === 0 ? (
                      <p className="text-xs text-[#6B7280] py-4 border-t border-black/[0.06]">
                        No work orders assigned to this contractor yet.
                      </p>
                    ) : (
                      <div className="border border-black/[0.08] rounded-xl overflow-auto max-h-64">
                        <InteractiveTable controller={vendorWoTable} compact className="min-w-[520px]">
                          <tbody className="text-xs">
                            {vendorWOs.map((w) => (
                              <tr
                                key={w.id}
                                onClick={() => {
                                  setOpenVendorId(null);
                                  setOpenWorkOrderId(w.id);
                                }}
                                className="cursor-pointer"
                              >
                                <td className="font-mono font-semibold text-[#1C4ED8] whitespace-nowrap">
                                  {w.code}
                                </td>
                                <td className="font-medium text-[#111318]">{w.title}</td>
                                <td className="font-mono text-[#525866] whitespace-nowrap">
                                  {formatDateShort(w.createdAt)}
                                </td>
                                <td className="capitalize text-[#525866] whitespace-nowrap">
                                  {w.status.replace('_', ' ')}
                                </td>
                                <td className="text-right font-semibold text-[#1C4ED8] whitespace-nowrap">
                                  Open →
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </InteractiveTable>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-display font-bold text-[#111318] inline-flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#1C4ED8]" />
                      Invoice History ({vendorInvoices.length})
                    </h3>
                    {vendorInvoices.length === 0 ? (
                      <p className="text-xs text-[#6B7280] py-4 border-t border-black/[0.06]">
                        No invoices submitted by this contractor.
                      </p>
                    ) : (
                      <div className="border border-black/[0.08] rounded-xl overflow-auto max-h-72">
                        <InteractiveTable controller={vendorInvTable} compact className="min-w-[540px]">
                          <tbody className="text-xs">
                            {vendorInvoices.map((inv) => (
                              <tr key={inv.id}>
                                <td className="font-mono font-semibold text-[#1C4ED8] whitespace-nowrap">
                                  {inv.invoiceNumber}
                                </td>
                                <td>
                                  <div className="font-medium text-[#111318]">{inv.description}</div>
                                  <div className="text-[11px] text-[#6B7280] mt-0.5">{inv.budgetCategory}</div>
                                </td>
                                <td className="font-mono text-[#525866] whitespace-nowrap">
                                  {formatDateShort(inv.receivedDate)}
                                </td>
                                <td className="capitalize text-[#525866] whitespace-nowrap">
                                  {inv.status.replace('_', ' ')}
                                </td>
                                <td className="text-right font-mono font-semibold tabular-nums text-[#111318] whitespace-nowrap">
                                  {formatCurrency(inv.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </InteractiveTable>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: ASSIGNED ASSETS & BOARD NOTES */}
              {dossierTab === 'assets' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-display font-bold text-[#111318] inline-flex items-center gap-1.5 mb-3">
                      <Building2 className="w-4 h-4 text-[#1C4ED8]" />
                      Assigned Building Equipment &amp; Systems ({assignedAssets.length})
                    </h3>
                    {assignedAssets.length === 0 ? (
                      <p className="text-xs text-[#6B7280] py-4 border-t border-black/[0.06]">
                        No building assets are directly linked to this contractor yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {assignedAssets.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setOpenVendorId(null);
                              setOpenAssetId(a.id);
                            }}
                            className="text-left p-4 bg-[#FAFBFD] hover:bg-[#EEF3FF]/60 border border-black/[0.07] hover:border-[#1C4ED8]/35 rounded-xl transition-colors cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-semibold text-[#1C4ED8]">{a.code}</span>
                              <span className="text-xs text-[#1C4ED8] font-medium">View on Map →</span>
                            </div>
                            <div className="text-sm font-display font-semibold text-[#111318] mt-1">
                              {a.name}
                            </div>
                            <div className="text-xs text-[#525866] mt-0.5">
                              {a.category} · {a.locationDetail}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {activeRole !== 'vendor' && (
                    <div className="pt-5 border-t border-black/[0.06] space-y-2">
                      <h3 className="text-sm font-display font-bold text-[#111318]">
                        Private Board Notes &amp; Renewal Memory
                      </h3>
                      <p className="text-xs text-[#6B7280]">
                        Visible only to Board officers and members — automatically hidden from Vendor accounts.
                      </p>
                      <div className="p-4 bg-[#FAFBFD] border border-black/[0.07] rounded-xl text-sm text-[#374151] leading-relaxed">
                        {selectedVendor.confidentialBoardNotes}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111318]/45 backdrop-blur-xs p-4">
          <form
            onSubmit={handleAddVendor}
            className="w-full max-w-lg bg-white border border-black/[0.08] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <h3 className="text-base font-display font-bold text-[#111318]">Add Contractor</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-[#525866] hover:text-[#111318] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Company Name</label>
                  <input
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Primary Contact</label>
                  <input
                    required
                    value={primaryContact}
                    onChange={(e) => setPrimaryContact(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Services (comma-separated)</label>
                <input
                  required
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  placeholder="Electrical, Generator PM, Lighting"
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">24/7 Emergency</label>
                  <input
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Contract End</label>
                  <input
                    type="date"
                    value={contractEnd}
                    onChange={(e) => setContractEnd(e.target.value)}
                    className="w-full px-2.5 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Annual Cap ($)</label>
                  <input
                    type="number"
                    value={contractCap}
                    onChange={(e) => setContractCap(e.target.value)}
                    className="w-full px-2.5 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">COI Expiry</label>
                  <input
                    type="date"
                    value={coiExpiry}
                    onChange={(e) => setCoiExpiry(e.target.value)}
                    className="w-full px-2.5 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Contract Scope</label>
                <input
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Service Trigger</label>
                  <input
                    value={serviceTrigger}
                    onChange={(e) => setServiceTrigger(e.target.value)}
                    placeholder="e.g., 2 inches snow or board call"
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Response SLA</label>
                  <input
                    value={responseReq}
                    onChange={(e) => setResponseReq(e.target.value)}
                    placeholder="e.g., 4 hours on-site"
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#FAFBFD] border-t border-black/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="arch-btn-secondary px-3.5 py-2 text-xs font-medium"
              >
                Cancel
              </button>
              <button type="submit" className="arch-btn-primary px-4 py-2 text-xs font-semibold">
                Save Vendor
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
