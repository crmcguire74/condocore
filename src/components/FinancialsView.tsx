import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCondoCore } from '../store/CondoCoreContext';
import { BuildingAsset, DelinquencyStage, FundType, Invoice, InvoiceStatus, Vendor } from '../types/condocore';
import { downloadCsv, formatCurrency, formatDateShort, TODAY_ISO } from '../utils/exports';
import { HealthText } from './StatusIndicator';
import {
  InteractiveTable,
  sortRows,
  TableColumnDef,
  useInteractiveTable,
} from './InteractiveTable';

type FinTab = 'ap' | 'ledgers' | 'budget' | 'projects';
type BillFilter = 'all' | 'pending' | 'ready' | 'paid';
type UnitFilter = 'all' | 'balance_due' | 'delinquent' | 'current';
type BudgetFundFilter = 'all' | 'operating' | 'reserve';

type BillColKey = 'bill' | 'vendor' | 'fund' | 'amount' | 'status' | 'bankMatch' | 'action';
type UnitColKey = 'unit' | 'monthly' | 'totalOwed' | 'breakdown' | 'status' | 'action';
type BudgetColKey = 'category' | 'fund' | 'progress' | 'planned' | 'actual' | 'variance' | 'bills';
type DrillBillColKey = 'invoiceNumber' | 'description' | 'vendorAsset' | 'status' | 'amount';
type UnitTxColKey = 'date' | 'entry' | 'impact';

const BILL_COLUMNS: TableColumnDef<BillColKey>[] = [
  { key: 'bill', label: 'Bill & Description', widthClass: 'w-[27%]', minWidth: 200 },
  { key: 'vendor', label: 'Vendor', widthClass: 'w-[15%]', minWidth: 120 },
  { key: 'fund', label: 'Fund & Budget Line', widthClass: 'w-[16%]', minWidth: 140 },
  { key: 'amount', label: 'Amount', align: 'right', widthClass: 'w-[11%]', minWidth: 105 },
  { key: 'status', label: 'Approval Status', widthClass: 'w-[13%]', minWidth: 130 },
  { key: 'bankMatch', label: 'Bank Match', align: 'center', widthClass: 'w-[8%]', minWidth: 95 },
  { key: 'action', label: 'Next Step', align: 'right', sortable: false, widthClass: 'w-[10%]', minWidth: 115 },
];

const UNIT_COLUMNS: TableColumnDef<UnitColKey>[] = [
  { key: 'unit', label: 'Unit & Owner', widthClass: 'w-[29%]', minWidth: 190 },
  { key: 'monthly', label: 'Monthly Dues', align: 'right', widthClass: 'w-[13%]', minWidth: 110 },
  { key: 'totalOwed', label: 'Total Owed', align: 'right', widthClass: 'w-[13%]', minWidth: 110 },
  { key: 'breakdown', label: 'Principal & Fees', align: 'right', widthClass: 'w-[19%]', minWidth: 145 },
  { key: 'status', label: 'Account Status', widthClass: 'w-[16%]', minWidth: 135 },
  { key: 'action', label: 'Ledger', align: 'right', sortable: false, widthClass: 'w-[10%]', minWidth: 100 },
];

const BUDGET_COLUMNS: TableColumnDef<BudgetColKey>[] = [
  { key: 'category', label: 'Budget Category', widthClass: 'w-[26%]', minWidth: 185 },
  { key: 'fund', label: 'Fund', widthClass: 'w-[10%]', minWidth: 90 },
  { key: 'progress', label: 'YTD Spend Progress', widthClass: 'w-[19%]', minWidth: 160 },
  { key: 'planned', label: 'YTD Planned', align: 'right', widthClass: 'w-[12%]', minWidth: 110 },
  { key: 'actual', label: 'YTD Actual', align: 'right', widthClass: 'w-[12%]', minWidth: 110 },
  { key: 'variance', label: 'Variance', align: 'right', widthClass: 'w-[11%]', minWidth: 105 },
  { key: 'bills', label: 'Bills', align: 'right', widthClass: 'w-[10%]', minWidth: 90 },
];

const DRILL_BILL_COLUMNS: TableColumnDef<DrillBillColKey>[] = [
  { key: 'invoiceNumber', label: 'Invoice #', minWidth: 95 },
  { key: 'description', label: 'Description', minWidth: 160 },
  { key: 'vendorAsset', label: 'Vendor & Asset', minWidth: 160 },
  { key: 'status', label: 'Status', minWidth: 115 },
  { key: 'amount', label: 'Amount', align: 'right', minWidth: 95 },
];

const UNIT_TX_COLUMNS: TableColumnDef<UnitTxColKey>[] = [
  { key: 'date', label: 'Date', minWidth: 95 },
  { key: 'entry', label: 'Entry & Recorded By', minWidth: 180 },
  { key: 'impact', label: 'Impact', align: 'right', minWidth: 110 },
];

function BudgetDrilldownTable({
  invoices,
  vendors,
  assets,
  statusLabel,
  onOpenVendor,
  onOpenAsset,
}: {
  invoices: Invoice[];
  vendors: Vendor[];
  assets: BuildingAsset[];
  statusLabel: (s: InvoiceStatus) => string;
  onOpenVendor: (vendorId: string) => void;
  onOpenAsset: (assetId: string) => void;
}) {
  const table = useInteractiveTable<DrillBillColKey>(DRILL_BILL_COLUMNS);

  const sorted = useMemo(() => {
    return sortRows(invoices, table.sort, (inv, key) => {
      const v = vendors.find((x) => x.id === inv.vendorId);
      switch (key) {
        case 'invoiceNumber':
          return inv.invoiceNumber;
        case 'description':
          return inv.description;
        case 'vendorAsset':
          return v?.company || '';
        case 'status':
          return statusLabel(inv.status);
        case 'amount':
          return inv.amount;
        default:
          return '';
      }
    });
  }, [invoices, vendors, table.sort, statusLabel]);

  return (
    <InteractiveTable controller={table} compact>
      <tbody className="text-xs">
        {sorted.map((inv) => {
          const v = vendors.find((x) => x.id === inv.vendorId);
          const a = assets.find((x) => x.id === inv.assetId);
          return (
            <tr key={inv.id}>
              <td className="font-mono font-semibold text-[#1C4ED8] whitespace-nowrap">
                {inv.invoiceNumber}
              </td>
              <td className="font-medium text-[#111318]">{inv.description}</td>
              <td>
                <div className="flex flex-wrap items-center gap-1.5 text-[#525866]">
                  {v && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenVendor(v.id);
                      }}
                      className="text-[#1C4ED8] font-medium hover:underline cursor-pointer"
                    >
                      {v.company}
                    </button>
                  )}
                  {v && a && <span>·</span>}
                  {a && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAsset(a.id);
                      }}
                      className="text-[#1C4ED8] font-medium hover:underline cursor-pointer"
                    >
                      {a.code} ({a.name})
                    </button>
                  )}
                </div>
              </td>
              <td className="text-[#525866] whitespace-nowrap">{statusLabel(inv.status)}</td>
              <td className="text-right font-mono font-semibold tabular-nums text-[#111318] whitespace-nowrap">
                {formatCurrency(inv.amount)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </InteractiveTable>
  );
}

export function FinancialsView() {
  const {
    state,
    actor,
    canWriteBoard,
    setOpenAssetId,
    setOpenVendorId,
    setActiveTab,
    getFundBalances,
    getBudgetActual,
    recordUnitPayment,
    recordUnitCorrection,
    updateUnitDelinquency,
    addSpecialAssessment,
    approveSpecialAssessment,
    createInvoice,
    advanceInvoiceStatus,
    toggleInvoiceReconciled,
    correctInvoiceNote,
  } = useCondoCore();

  const [finTab, setFinTab] = useState<FinTab>('ap');
  const [billSearch, setBillSearch] = useState('');
  const [billFilter, setBillFilter] = useState<BillFilter>('all');

  const [unitSearch, setUnitSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const [budgetFundFilter, setBudgetFundFilter] = useState<BudgetFundFilter>('all');
  const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);

  // Unit ledger actions
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'ACH' | 'Card' | 'Check'>('ACH');
  const [corrPrincipal, setCorrPrincipal] = useState('0');
  const [corrLate, setCorrLate] = useState('-50');
  const [corrReason, setCorrReason] = useState('');
  const [showCorrForm, setShowCorrForm] = useState(false);

  // New Invoice Modal
  const [showNewInv, setShowNewInv] = useState(false);
  const [invNum, setInvNum] = useState('INV-4910');
  const [invVendorId, setInvVendorId] = useState(state.vendors[0]?.id || '');
  const [invAssetId, setInvAssetId] = useState(state.assets[0]?.id || '');
  const [invDesc, setInvDesc] = useState('');
  const [invFund, setInvFund] = useState<FundType>('operating');
  const [invCategory, setInvCategory] = useState(
    state.budgetLines[0]?.category || 'Roofing & Envelope Maintenance'
  );
  const [invAmount, setInvAmount] = useState('2800');
  const [invInitialStatus, setInvInitialStatus] = useState<'draft' | 'received'>('received');

  // Invoice correction modal
  const [corrInvId, setCorrInvId] = useState<string | null>(null);
  const [corrInvReason, setCorrInvReason] = useState('');

  // Special assessment modal
  const [showNewSA, setShowNewSA] = useState(false);
  const [saTitle, setSaTitle] = useState('');
  const [saPurpose, setSaPurpose] = useState('');
  const [saTotal, setSaTotal] = useState('21000');
  const [saDue, setSaDue] = useState('2027-06-01');
  const [saStatus, setSaStatus] = useState<'proposed' | 'board_approved'>('proposed');

  const funds = getFundBalances();
  const threshold = state.settings.twoPersonApprovalThreshold;

  const totalPrincipalDue = state.units.reduce((s, u) => s + u.principalBalance, 0);
  const totalLateFeesDue = state.units.reduce((s, u) => s + u.lateFeeBalance, 0);
  const totalReceivable = totalPrincipalDue + totalLateFeesDue;
  const unitsWithBalance = state.units.filter((u) => u.principalBalance > 0 || u.lateFeeBalance > 0);
  const delinquentUnits = state.units.filter(
    (u) => u.delinquencyStage !== 'current'
  );

  const pendingBillsCount = state.invoices.filter(
    (i) => i.status === 'received' || i.status === 'first_approval' || i.status === 'draft'
  ).length;
  const readyToPayCount = state.invoices.filter((i) => i.status === 'approved').length;
  const paidInvoicesCount = state.invoices.filter((i) => i.status === 'paid').length;
  const reconciledCount = state.invoices.filter(
    (i) => i.status === 'paid' && i.bankReconciled
  ).length;

  const billsTable = useInteractiveTable<BillColKey>(BILL_COLUMNS);
  const unitsTable = useInteractiveTable<UnitColKey>(UNIT_COLUMNS);
  const budgetTable = useInteractiveTable<BudgetColKey>(BUDGET_COLUMNS);
  const unitTxTable = useInteractiveTable<UnitTxColKey>(UNIT_TX_COLUMNS);

  const filteredInvoices = useMemo(() => {
    const q = billSearch.trim().toLowerCase();
    const rows = state.invoices.filter((inv) => {
      if (
        billFilter === 'pending' &&
        inv.status !== 'received' &&
        inv.status !== 'first_approval' &&
        inv.status !== 'draft'
      ) {
        return false;
      }
      if (billFilter === 'ready' && inv.status !== 'approved') return false;
      if (billFilter === 'paid' && inv.status !== 'paid') return false;
      if (!q) return true;
      const vendor = state.vendors.find((v) => v.id === inv.vendorId);
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.description.toLowerCase().includes(q) ||
        inv.budgetCategory.toLowerCase().includes(q) ||
        (vendor?.company.toLowerCase().includes(q) ?? false)
      );
    });

    const statusOrder: Record<InvoiceStatus, number> = {
      received: 0,
      first_approval: 1,
      draft: 2,
      approved: 3,
      paid: 4,
      rejected: 5,
    };

    return sortRows(rows, billsTable.sort, (inv, key) => {
      const vendor = state.vendors.find((v) => v.id === inv.vendorId);
      switch (key) {
        case 'bill':
          return `${inv.invoiceNumber} ${inv.description}`;
        case 'vendor':
          return vendor?.company || '';
        case 'fund':
          return `${inv.fund} ${inv.budgetCategory}`;
        case 'amount':
          return inv.amount;
        case 'status':
          return statusOrder[inv.status];
        case 'bankMatch':
          return inv.status !== 'paid' ? -1 : inv.bankReconciled ? 1 : 0;
        default:
          return '';
      }
    });
  }, [state.invoices, state.vendors, billSearch, billFilter, billsTable.sort]);

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    const rows = state.units.filter((u) => {
      const hasBal = u.principalBalance > 0 || u.lateFeeBalance > 0;
      if (unitFilter === 'balance_due' && !hasBal) return false;
      if (unitFilter === 'delinquent' && u.delinquencyStage === 'current') return false;
      if (unitFilter === 'current' && (hasBal || u.delinquencyStage !== 'current')) return false;
      if (!q) return true;
      return u.unitNumber.toLowerCase().includes(q) || u.ownerName.toLowerCase().includes(q);
    });

    const stageOrder: Record<DelinquencyStage, number> = {
      legal_lien: 0,
      '60d_demand': 1,
      '30d_notice': 2,
      payment_plan: 3,
      current: 4,
    };

    return sortRows(rows, unitsTable.sort, (u, key) => {
      switch (key) {
        case 'unit':
          return `${u.unitNumber} ${u.ownerName}`;
        case 'monthly':
          return u.monthlyAssessment;
        case 'totalOwed':
          return u.principalBalance + u.lateFeeBalance;
        case 'breakdown':
          return u.lateFeeBalance * 100000 + u.principalBalance;
        case 'status':
          return stageOrder[u.delinquencyStage];
        default:
          return '';
      }
    });
  }, [state.units, unitSearch, unitFilter, unitsTable.sort]);

  const filteredBudgetLines = useMemo(() => {
    const rows = state.budgetLines.filter((bl) => {
      if (budgetFundFilter === 'all') return true;
      return bl.fund === budgetFundFilter;
    });

    return sortRows(rows, budgetTable.sort, (bl, key) => {
      const { actual, invoices } = getBudgetActual(bl.category, bl.fund);
      switch (key) {
        case 'category':
          return bl.category;
        case 'fund':
          return bl.fund;
        case 'progress':
          return actual / Math.max(1, bl.ytdBudget);
        case 'planned':
          return bl.ytdBudget;
        case 'actual':
          return actual;
        case 'variance':
          return actual - bl.ytdBudget;
        case 'bills':
          return invoices.length;
        default:
          return '';
      }
    });
  }, [state.budgetLines, budgetFundFilter, budgetTable.sort, getBudgetActual]);

  const selectedUnit = state.units.find((u) => u.id === selectedUnitId) || null;

  const sortedUnitTransactions = useMemo(() => {
    if (!selectedUnit) return [];
    return sortRows(selectedUnit.transactions, unitTxTable.sort, (tx, key) => {
      switch (key) {
        case 'date':
          return tx.date;
        case 'entry':
          return tx.description;
        case 'impact':
          return tx.principalDelta + tx.lateFeeDelta;
        default:
          return '';
      }
    });
  }, [selectedUnit, unitTxTable.sort]);

  const handleExportAgingCsv = () => {
    downloadCsv(
      'alderwood_assessment_aging.csv',
      [
        'Unit',
        'Owner',
        'Monthly Dues',
        'Principal Balance',
        'Late-Fee Balance',
        'Total Due',
        'Days Past Due',
        'Collection Stage',
      ],
      state.units.map((u) => [
        u.unitNumber,
        u.ownerName,
        u.monthlyAssessment,
        u.principalBalance,
        u.lateFeeBalance,
        u.principalBalance + u.lateFeeBalance,
        u.daysPastDue,
        u.delinquencyStage,
      ])
    );
  };

  const handleExportBudgetCsv = () => {
    downloadCsv(
      'alderwood_budget_to_actual.csv',
      ['Fund', 'Category', 'Annual Budget', 'YTD Budget', 'YTD Actual', 'Variance'],
      state.budgetLines.map((b) => {
        const { actual } = getBudgetActual(b.category, b.fund);
        return [b.fund, b.category, b.annualBudget, b.ytdBudget, actual, actual - b.ytdBudget];
      })
    );
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(invAmount);
    if (!invNum.trim() || !invDesc.trim() || Number.isNaN(amt) || amt <= 0) return;
    createInvoice({
      invoiceNumber: invNum.trim(),
      vendorId: invVendorId,
      assetId: invAssetId || undefined,
      description: invDesc.trim(),
      fund: invFund,
      budgetCategory: invCategory,
      amount: amt,
      receivedDate: TODAY_ISO,
      dueDate: '2026-12-20',
      status: invInitialStatus,
    });
    setShowNewInv(false);
    setInvDesc('');
  };

  const handleAddSA = (e: React.FormEvent) => {
    e.preventDefault();
    const tot = Number(saTotal);
    if (!saTitle.trim() || Number.isNaN(tot) || tot <= 0) return;
    addSpecialAssessment({
      title: saTitle.trim(),
      purpose: saPurpose.trim() || 'Capital reserve funding.',
      totalAmount: tot,
      perUnitAverage: Math.round(tot / Math.max(1, state.units.length)),
      dueDate: saDue,
      status: saStatus,
    });
    setShowNewSA(false);
    setSaTitle('');
    setSaPurpose('');
  };

  const statusLabel = (s: InvoiceStatus) => {
    const map: Record<InvoiceStatus, string> = {
      draft: 'Draft',
      received: 'Needs 1st Approval',
      first_approval: 'Needs 2nd Approval',
      approved: 'Ready to Pay',
      paid: 'Paid',
      rejected: 'Rejected',
    };
    return map[s];
  };

  const stageLabel = (stage: DelinquencyStage, daysPastDue: number) => {
    const map: Record<DelinquencyStage, string> = {
      current: 'Current',
      '30d_notice': `30-Day Notice (${daysPastDue}d)`,
      '60d_demand': `60-Day Demand (${daysPastDue}d)`,
      payment_plan: 'Payment Plan',
      legal_lien: `Legal / Lien (${daysPastDue}d)`,
    };
    return map[stage];
  };

  return (
    <div className="flex flex-col lg:h-full lg:min-h-0 gap-4">
      {/* PINNED TOP HEADER, INTERACTIVE SUMMARY STRIP & NAVIGATION */}
      <div className="shrink-0 space-y-3.5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-[#111318] tracking-tight">
              Assessments &amp; Financials
            </h1>
            <p className="text-xs text-[#525866] mt-0.5">
              Monitor cash funds, approve vendor bills, collect unit dues, and track budgets against plan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportAgingCsv}
              className="arch-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#525866]" />
              Aging CSV
            </button>
            <button
              type="button"
              onClick={handleExportBudgetCsv}
              className="arch-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#525866]" />
              Budget CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="arch-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-[#525866]" />
              Print Packet
            </button>
            {canWriteBoard && finTab === 'ap' && (
              <button
                type="button"
                onClick={() => setShowNewInv(true)}
                className="arch-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Bill
              </button>
            )}
            {canWriteBoard && (finTab === 'projects' || finTab === 'ledgers') && (
              <button
                type="button"
                onClick={() => setShowNewSA(true)}
                className="arch-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Special Assessment
              </button>
            )}
          </div>
        </div>

        {/* Clean 4-Column Interactive Financial Glance Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 arch-surface rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-black/[0.06] overflow-hidden">
          <div className="px-4 py-3.5">
            <div className="text-xs text-[#525866]">Operating Cash</div>
            <div className="mt-1 font-mono text-base sm:text-lg font-semibold tabular-nums text-[#111318]">
              {formatCurrency(funds.operating)}
            </div>
            <div className="text-[11px] text-[#6B7280] mt-0.5">Everyday building expenses</div>
          </div>

          <button
            type="button"
            onClick={() => setFinTab('projects')}
            className="text-left px-4 py-3.5 hover:bg-[#F8FAFF] transition-colors cursor-pointer"
          >
            <div className="text-xs text-[#525866]">Reserve &amp; Project Funds</div>
            <div className="mt-1 font-mono text-base sm:text-lg font-semibold tabular-nums text-[#111318]">
              {formatCurrency(funds.reserve + funds.special_project)}
            </div>
            <div className="text-[11px] font-mono text-[#6B7280] mt-0.5">
              Reserve {formatCurrency(funds.reserve)} · Project {formatCurrency(funds.special_project)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFinTab('ledgers');
              setUnitFilter('balance_due');
            }}
            className="text-left px-4 py-3.5 hover:bg-[#F8FAFF] transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#525866]">Dues Owed</span>
              <span className="text-[11px] font-semibold text-[#1C4ED8]">View →</span>
            </div>
            <div
              className={`mt-1 font-mono text-base sm:text-lg font-semibold tabular-nums ${
                totalReceivable > 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'
              }`}
            >
              {formatCurrency(totalReceivable)}
            </div>
            <div className="text-[11px] text-[#6B7280] mt-0.5">
              {unitsWithBalance.length} unit{unitsWithBalance.length === 1 ? '' : 's'} with open balance
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFinTab('ap');
              setBillFilter('pending');
            }}
            className="text-left px-4 py-3.5 hover:bg-[#F8FAFF] transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#525866]">Bills Pending Approval</span>
              <span className="text-[11px] font-semibold text-[#1C4ED8]">Review →</span>
            </div>
            <div className="mt-1 font-mono text-base sm:text-lg font-semibold tabular-nums text-[#111318]">
              {pendingBillsCount} pending
              <span className="text-xs font-sans font-normal text-[#6B7280] ml-2">
                · {reconciledCount}/{paidInvoicesCount} matched
              </span>
            </div>
            <div className="text-[11px] text-[#6B7280] mt-0.5">
              2-officer sign-off required &ge; {formatCurrency(threshold)}
            </div>
          </button>
        </div>

        {/* Everyday-Language Main Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="arch-segmented overflow-x-auto">
            <button
              type="button"
              onClick={() => setFinTab('ap')}
              className={`arch-segmented-btn ${finTab === 'ap' ? 'arch-segmented-btn-active' : ''}`}
            >
              Bills &amp; Approvals ({pendingBillsCount + readyToPayCount})
            </button>
            <button
              type="button"
              onClick={() => setFinTab('ledgers')}
              className={`arch-segmented-btn ${finTab === 'ledgers' ? 'arch-segmented-btn-active' : ''}`}
            >
              Unit Dues ({state.units.length})
            </button>
            <button
              type="button"
              onClick={() => setFinTab('budget')}
              className={`arch-segmented-btn ${finTab === 'budget' ? 'arch-segmented-btn-active' : ''}`}
            >
              Budget &amp; Variance
            </button>
            <button
              type="button"
              onClick={() => setFinTab('projects')}
              className={`arch-segmented-btn ${finTab === 'projects' ? 'arch-segmented-btn-active' : ''}`}
            >
              Capital Projects ({state.capitalProjects.length})
            </button>
          </div>

          {finTab === 'ap' && (
            <div className="inline-flex items-center gap-1.5 text-xs text-[#525866]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1C4ED8] shrink-0" />
              <span>
                Signing as <strong className="text-[#111318]">{actor.name}</strong> ({actor.title})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: BILLS & TWO-PERSON APPROVALS */}
      {finTab === 'ap' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {/* Search + Status Filter Toolbar */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#788090] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                placeholder="Search bill #, vendor, or category..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-black/[0.09] rounded-xl focus:border-[#1C4ED8] focus:outline-none"
              />
            </div>

            <div className="arch-segmented overflow-x-auto">
              <button
                type="button"
                onClick={() => setBillFilter('all')}
                className={`arch-segmented-btn ${billFilter === 'all' ? 'arch-segmented-btn-active' : ''}`}
              >
                All Bills ({state.invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setBillFilter('pending')}
                className={`arch-segmented-btn ${billFilter === 'pending' ? 'arch-segmented-btn-active' : ''}`}
              >
                Needs Approval ({pendingBillsCount})
              </button>
              <button
                type="button"
                onClick={() => setBillFilter('ready')}
                className={`arch-segmented-btn ${billFilter === 'ready' ? 'arch-segmented-btn-active' : ''}`}
              >
                Ready to Pay ({readyToPayCount})
              </button>
              <button
                type="button"
                onClick={() => setBillFilter('paid')}
                className={`arch-segmented-btn ${billFilter === 'paid' ? 'arch-segmented-btn-active' : ''}`}
              >
                Paid ({paidInvoicesCount})
              </button>
            </div>
          </div>

          {/* Scrollable Bills Data Grid */}
          <div className="flex-1 min-h-0 arch-surface rounded-2xl overflow-auto">
            <InteractiveTable controller={billsTable} className="min-w-[980px]">
              <tbody className="text-[13px]">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#525866]">
                      No bills match the current search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const vendor = state.vendors.find((v) => v.id === inv.vendorId);
                    const asset = state.assets.find((a) => a.id === inv.assetId);
                    const needsTwo = inv.amount >= threshold;
                    const alreadySignedByMe = inv.approvals.some(
                      (a) => a.role === actor.role || a.actorName === actor.name
                    );
                    const stHealth =
                      inv.status === 'paid' || inv.status === 'approved'
                        ? 'green'
                        : inv.status === 'rejected' || inv.status === 'received'
                        ? 'red'
                        : 'yellow';

                    return (
                      <tr key={inv.id}>
                        <td>
                          <div className="font-medium text-[#111318] leading-snug">
                            <span className="font-mono text-xs font-semibold text-[#1C4ED8] mr-2">
                              {inv.invoiceNumber}
                            </span>
                            {inv.description}
                          </div>
                          <div className="text-xs text-[#6B7280] mt-1 flex flex-wrap items-center gap-1.5">
                            <span>
                              Due <span className="font-mono">{formatDateShort(inv.dueDate)}</span>
                            </span>
                            {asset && (
                              <>
                                <span>·</span>
                                <button
                                  type="button"
                                  onClick={() => setOpenAssetId(asset.id)}
                                  className="text-[#1C4ED8] font-medium hover:underline cursor-pointer"
                                >
                                  {asset.code} ({asset.name})
                                </button>
                              </>
                            )}
                            {inv.correctionNote && (
                              <span className="text-[#B45309]">· Note: {inv.correctionNote}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {vendor ? (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenVendorId(vendor.id);
                                setActiveTab('vendors');
                              }}
                              className="text-[#111318] font-medium hover:text-[#1C4ED8] hover:underline text-left cursor-pointer text-xs"
                            >
                              {vendor.company}
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <div className="font-medium text-[#111318] capitalize text-xs">
                            {inv.fund.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-[#6B7280] mt-0.5">{inv.budgetCategory}</div>
                        </td>
                        <td className="text-right font-mono font-semibold tabular-nums text-[#111318] whitespace-nowrap">
                          {formatCurrency(inv.amount)}
                          {needsTwo && (
                            <div className="text-[11px] font-sans font-medium text-[#1C4ED8] mt-0.5">
                              2 signatures req.
                            </div>
                          )}
                        </td>
                        <td>
                          <HealthText status={stHealth} label={statusLabel(inv.status)} />
                          {inv.approvals.length > 0 && (
                            <div className="text-[11px] text-[#6B7280] mt-1">
                              {inv.approvals.map((a) => a.actorName.split(' ')[0]).join(', ')} (
                              {inv.approvals.length}/{needsTwo ? 2 : 1})
                            </div>
                          )}
                        </td>
                        <td className="text-center">
                          {inv.status === 'paid' ? (
                            <button
                              type="button"
                              disabled={!canWriteBoard}
                              onClick={() => toggleInvoiceReconciled(inv.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                                inv.bankReconciled
                                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#15803D]'
                                  : 'bg-white border-black/[0.1] text-[#525866] hover:bg-[#F4F5F7]'
                              }`}
                            >
                              {inv.bankReconciled && <Check className="w-3 h-3" />}
                              {inv.bankReconciled ? 'Matched' : 'Match'}
                            </button>
                          ) : (
                            <span className="text-[#9CA3AF]">—</span>
                          )}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          {canWriteBoard ? (
                            <div className="inline-flex items-center gap-2">
                              {inv.status === 'draft' && (
                                <button
                                  type="button"
                                  onClick={() => advanceInvoiceStatus(inv.id, 'submit')}
                                  className="arch-btn-primary px-3 py-1.5 text-xs font-semibold"
                                >
                                  Submit
                                </button>
                              )}
                              {(inv.status === 'received' || inv.status === 'first_approval') && (
                                <>
                                  <button
                                    type="button"
                                    disabled={alreadySignedByMe}
                                    title={
                                      alreadySignedByMe
                                        ? 'Switch to another board officer to add the 2nd signature'
                                        : 'Approve invoice'
                                    }
                                    onClick={() => advanceInvoiceStatus(inv.id, 'approve')}
                                    className="arch-btn-primary px-3 py-1.5 text-xs font-semibold disabled:opacity-45"
                                  >
                                    {alreadySignedByMe
                                      ? 'Needs 2nd Officer'
                                      : inv.status === 'first_approval'
                                      ? 'Add 2nd Approval'
                                      : 'Approve'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      advanceInvoiceStatus(
                                        inv.id,
                                        'reject',
                                        'Rejected during board review'
                                      )
                                    }
                                    className="text-xs font-medium text-[#B91C1C] hover:underline cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {inv.status === 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => advanceInvoiceStatus(inv.id, 'pay')}
                                  className="px-3 py-1.5 text-xs font-semibold bg-[#15803D] text-white rounded-xl hover:bg-[#166534] transition-colors cursor-pointer"
                                >
                                  Pay Bill
                                </button>
                              )}
                              {inv.status === 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCorrInvId(inv.id);
                                    setCorrInvReason('');
                                  }}
                                  className="text-xs font-medium text-[#525866] hover:text-[#1C4ED8] hover:underline cursor-pointer"
                                >
                                  Add Note
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#6B7280]">Read-only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </InteractiveTable>
          </div>
        </div>
      )}

      {/* TAB 2: UNIT DUES & LEDGERS */}
      {finTab === 'ledgers' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {/* Clean Search & Filter Toolbar */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#788090] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                placeholder="Search unit # or owner name..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-black/[0.09] rounded-xl focus:border-[#1C4ED8] focus:outline-none"
              />
            </div>

            <div className="arch-segmented overflow-x-auto">
              <button
                type="button"
                onClick={() => setUnitFilter('all')}
                className={`arch-segmented-btn ${unitFilter === 'all' ? 'arch-segmented-btn-active' : ''}`}
              >
                All Units ({state.units.length})
              </button>
              <button
                type="button"
                onClick={() => setUnitFilter('balance_due')}
                className={`arch-segmented-btn ${unitFilter === 'balance_due' ? 'arch-segmented-btn-active' : ''}`}
              >
                Balance Due ({unitsWithBalance.length})
              </button>
              <button
                type="button"
                onClick={() => setUnitFilter('delinquent')}
                className={`arch-segmented-btn ${unitFilter === 'delinquent' ? 'arch-segmented-btn-active' : ''}`}
              >
                Past Due / Plan ({delinquentUnits.length})
              </button>
              <button
                type="button"
                onClick={() => setUnitFilter('current')}
                className={`arch-segmented-btn ${unitFilter === 'current' ? 'arch-segmented-btn-active' : ''}`}
              >
                Paid Up ({state.units.length - unitsWithBalance.length})
              </button>
            </div>
          </div>

          {/* Full-Height Unit Ledger Data Grid */}
          <div className="flex-1 min-h-0 arch-surface rounded-2xl overflow-auto">
            <InteractiveTable controller={unitsTable} className="min-w-[860px]">
              <tbody className="text-[13px]">
                {filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[#525866]">
                      No units match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredUnits.map((u) => {
                    const totalDue = u.principalBalance + u.lateFeeBalance;
                    const st =
                      u.delinquencyStage === 'legal_lien' || u.delinquencyStage === '60d_demand'
                        ? 'red'
                        : u.delinquencyStage === '30d_notice' || u.delinquencyStage === 'payment_plan'
                        ? 'yellow'
                        : 'green';

                    return (
                      <tr
                        key={u.id}
                        onClick={() => {
                          setSelectedUnitId(u.id);
                          setPayAmount(String(totalDue || u.monthlyAssessment));
                          setShowCorrForm(false);
                        }}
                        className={`cursor-pointer ${selectedUnitId === u.id ? 'arch-row-selected' : ''}`}
                      >
                        <td>
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-xs font-semibold text-[#1C4ED8]">
                              Unit {u.unitNumber}
                            </span>
                            <span className="font-medium text-[#111318]">{u.ownerName}</span>
                          </div>
                          <div className="text-xs text-[#6B7280] mt-0.5">
                            Floor {u.floor} · {u.ownershipPct.toFixed(2)}% ownership
                            {u.occupancy === 'tenant_occupied' ? ' · Tenant occupied' : ''}
                          </div>
                        </td>
                        <td className="text-right font-mono tabular-nums text-[#525866] whitespace-nowrap">
                          {formatCurrency(u.monthlyAssessment)}
                        </td>
                        <td
                          className={`text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                            totalDue > 0 ? 'text-[#111318]' : 'text-[#15803D]'
                          }`}
                        >
                          {formatCurrency(totalDue)}
                        </td>
                        <td className="text-right font-mono text-xs tabular-nums text-[#6B7280] whitespace-nowrap">
                          {totalDue === 0 ? (
                            'Paid in full'
                          ) : (
                            <>
                              {formatCurrency(u.principalBalance)} dues
                              {u.lateFeeBalance > 0 && (
                                <span className="text-[#B91C1C] ml-1.5 font-medium">
                                  +{formatCurrency(u.lateFeeBalance)} fee
                                </span>
                              )}
                            </>
                          )}
                        </td>
                        <td>
                          <HealthText status={st} label={stageLabel(u.delinquencyStage, u.daysPastDue)} />
                        </td>
                        <td className="text-right text-xs font-semibold text-[#1C4ED8] whitespace-nowrap">
                          View Ledger →
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </InteractiveTable>
          </div>
        </div>
      )}

      {/* TAB 3: BUDGET & VARIANCE (WITH INLINE ACCORDION DRILL-DOWN) */}
      {finTab === 'budget' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
            <div className="arch-segmented overflow-x-auto">
              <button
                type="button"
                onClick={() => setBudgetFundFilter('all')}
                className={`arch-segmented-btn ${
                  budgetFundFilter === 'all' ? 'arch-segmented-btn-active' : ''
                }`}
              >
                All Funds ({state.budgetLines.length})
              </button>
              <button
                type="button"
                onClick={() => setBudgetFundFilter('operating')}
                className={`arch-segmented-btn ${
                  budgetFundFilter === 'operating' ? 'arch-segmented-btn-active' : ''
                }`}
              >
                Operating
              </button>
              <button
                type="button"
                onClick={() => setBudgetFundFilter('reserve')}
                className={`arch-segmented-btn ${
                  budgetFundFilter === 'reserve' ? 'arch-segmented-btn-active' : ''
                }`}
              >
                Reserve
              </button>
            </div>

            <span className="text-xs text-[#525866]">
              FY 2026 YTD · Click any category row to inspect linked bills
            </span>
          </div>

          <div className="flex-1 min-h-0 arch-surface rounded-2xl overflow-auto">
            <InteractiveTable controller={budgetTable} manualZebra className="min-w-[880px]">
              <tbody className="text-[13px]">
                {filteredBudgetLines.map((bl, idx) => {
                  const { actual, invoices } = getBudgetActual(bl.category, bl.fund);
                  const variance = actual - bl.ytdBudget;
                  const isOver = variance > 0;
                  const pct =
                    bl.ytdBudget > 0 ? Math.min(100, Math.round((actual / bl.ytdBudget) * 100)) : 0;
                  const isExpanded = expandedBudgetId === bl.id;
                  const zebraClass = idx % 2 === 1 ? 'arch-row-even' : 'arch-row-odd';

                  return (
                    <React.Fragment key={bl.id}>
                      <tr
                        onClick={() => setExpandedBudgetId(isExpanded ? null : bl.id)}
                        className={`cursor-pointer ${isExpanded ? 'arch-row-selected' : zebraClass}`}
                      >
                        <td>
                          <div className="font-medium text-[#111318]">{bl.category}</div>
                          <div className="text-xs font-mono text-[#6B7280] mt-0.5">
                            Annual budget {formatCurrency(bl.annualBudget)}
                          </div>
                        </td>
                        <td className="capitalize text-xs text-[#525866] font-medium">{bl.fund}</td>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isOver ? 'bg-[#DC2626]' : 'bg-[#1C4ED8]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs tabular-nums text-[#525866] w-10 text-right">
                              {Math.round((actual / Math.max(1, bl.ytdBudget)) * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="text-right font-mono tabular-nums text-[#525866] whitespace-nowrap">
                          {formatCurrency(bl.ytdBudget)}
                        </td>
                        <td className="text-right font-mono font-semibold tabular-nums text-[#111318] whitespace-nowrap">
                          {formatCurrency(actual)}
                        </td>
                        <td
                          className={`text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                            isOver ? 'text-[#B91C1C]' : 'text-[#15803D]'
                          }`}
                        >
                          {isOver ? `+${formatCurrency(variance)}` : formatCurrency(variance)}
                        </td>
                        <td className="text-right text-xs text-[#1C4ED8] font-semibold whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            {invoices.length} bill{invoices.length === 1 ? '' : 's'}
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </span>
                        </td>
                      </tr>

                      {/* Inline Explainable Drill-Down Row */}
                      {isExpanded && (
                        <tr className="arch-row-detail">
                          <td colSpan={7} className="!p-5">
                            <div className="bg-white border border-black/[0.08] rounded-xl overflow-hidden">
                              <div className="px-4 py-3 bg-[#FAFBFD] border-b border-black/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="font-display font-semibold text-[#111318]">
                                  Bills Driving {bl.category}
                                </span>
                                <span className="text-[#6B7280] font-mono">
                                  Prior YTD baseline: {formatCurrency(bl.priorPaidAmount)}
                                </span>
                              </div>
                              {invoices.length === 0 ? (
                                <p className="p-4 text-xs text-[#525866]">
                                  No recent bills posted in this cycle beyond prior YTD baseline payments.
                                </p>
                              ) : (
                                <BudgetDrilldownTable
                                  invoices={invoices}
                                  vendors={state.vendors}
                                  assets={state.assets}
                                  statusLabel={statusLabel}
                                  onOpenVendor={(vendorId) => {
                                    setOpenVendorId(vendorId);
                                    setActiveTab('vendors');
                                  }}
                                  onOpenAsset={(assetId) => setOpenAssetId(assetId)}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </InteractiveTable>
          </div>
        </div>
      )}

      {/* TAB 4: CAPITAL PROJECTS & SPECIAL ASSESSMENTS */}
      {finTab === 'projects' && (
        <div className="flex-1 min-h-0 lg:overflow-y-auto space-y-6 pr-0.5 pb-4">
          {/* Reserve & Capital Projects */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-bold text-[#111318]">
                Reserve &amp; Capital Projects
              </h2>
              <span className="text-xs text-[#525866]">
                Tracked against board-approved reserve budgets
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {state.capitalProjects.map((cp) => {
                const over = cp.actualSpent > cp.approvedBudget;
                const spendRatio =
                  cp.approvedBudget > 0
                    ? Math.min(100, Math.round((cp.actualSpent / cp.approvedBudget) * 100))
                    : 0;
                const asset = state.assets.find((a) => a.id === cp.assetId);

                return (
                  <div key={cp.id} className="arch-surface rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-display font-bold text-[#111318]">{cp.name}</h3>
                        <div className="text-xs text-[#525866] mt-0.5">
                          Target completion <span className="font-mono">{formatDateShort(cp.targetCompletion)}</span>
                        </div>
                      </div>
                      <HealthText
                        status={over || cp.scheduleStatus === 'behind_schedule' ? 'red' : 'green'}
                        label={
                          over
                            ? 'Over Budget'
                            : cp.scheduleStatus === 'behind_schedule'
                            ? 'Behind Schedule'
                            : 'On Track'
                        }
                      />
                    </div>

                    <div className="space-y-2.5 pt-3 border-t border-black/[0.06]">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#525866]">Work Completion</span>
                          <span className="font-mono font-semibold text-[#111318]">{cp.completionPct}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#E8ECF2] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#1C4ED8]"
                            style={{ width: `${cp.completionPct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#525866]">Budget Spent</span>
                          <span className="font-mono tabular-nums">
                            <strong className={over ? 'text-[#B91C1C]' : 'text-[#111318]'}>
                              {formatCurrency(cp.actualSpent)}
                            </strong>{' '}
                            <span className="text-[#6B7280]">/ {formatCurrency(cp.approvedBudget)}</span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#E8ECF2] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${over ? 'bg-[#DC2626]' : 'bg-[#15803D]'}`}
                            style={{ width: `${spendRatio}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-[#525866] leading-relaxed">{cp.notes}</p>

                    {asset && (
                      <div className="pt-2 border-t border-black/[0.06]">
                        <button
                          type="button"
                          onClick={() => setOpenAssetId(asset.id)}
                          className="text-xs font-semibold text-[#1C4ED8] hover:underline cursor-pointer"
                        >
                          View Linked Asset {asset.code} on Map →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Special Assessments */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-bold text-[#111318]">
                Special Assessments
              </h2>
              <span className="text-xs text-[#525866]">
                Clearly separated between proposed drafts and board-approved assessments
              </span>
            </div>

            {state.specialAssessments.length === 0 ? (
              <div className="arch-surface rounded-2xl p-8 text-center text-xs text-[#525866]">
                No special assessments proposed or active.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {state.specialAssessments.map((sa) => (
                  <div
                    key={sa.id}
                    className="arch-surface rounded-2xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-display font-bold text-[#111318]">{sa.title}</h3>
                        <HealthText
                          status={sa.status === 'board_approved' ? 'green' : 'yellow'}
                          label={sa.status === 'board_approved' ? 'Approved' : 'Proposed'}
                        />
                      </div>
                      <p className="text-xs text-[#525866] leading-relaxed">{sa.purpose}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/[0.06] text-xs">
                      <div className="font-mono tabular-nums text-[#111318]">
                        <strong>{formatCurrency(sa.totalAmount)}</strong>{' '}
                        <span className="text-[#6B7280]">
                          (~{formatCurrency(sa.perUnitAverage)}/unit · Due {formatDateShort(sa.dueDate)})
                        </span>
                      </div>

                      {canWriteBoard && sa.status === 'proposed' && (
                        <button
                          type="button"
                          onClick={() => approveSpecialAssessment(sa.id)}
                          className="arch-btn-primary px-3 py-1.5 text-xs font-semibold"
                        >
                          Approve Assessment
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* UNIT LEDGER SLIDE-OVER DRAWER */}
      {selectedUnit && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#111318]/45 backdrop-blur-xs"
          onClick={() => setSelectedUnitId(null)}
        >
          <div
            className="w-full max-w-xl bg-white h-full overflow-y-auto border-l border-black/[0.08] shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-black/[0.06]">
              <div>
                <div className="text-xs font-semibold text-[#1C4ED8]">
                  Unit {selectedUnit.unitNumber} · Floor {selectedUnit.floor} · {selectedUnit.ownershipPct}% Ownership
                </div>
                <h2 className="text-lg font-display font-bold text-[#111318] mt-0.5">
                  {selectedUnit.ownerName}
                </h2>
                <div className="text-xs text-[#525866] mt-0.5">
                  {selectedUnit.ownerEmail} · {selectedUnit.ownerPhone}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUnitId(null)}
                className="p-1.5 text-[#525866] hover:text-[#111318] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Distinct Balance Breakdown */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-[#FAFBFD] border border-black/[0.07] rounded-2xl text-xs">
              <div>
                <div className="text-[#525866]">Principal Due</div>
                <div className="font-mono text-base font-semibold tabular-nums text-[#111318] mt-0.5">
                  {formatCurrency(selectedUnit.principalBalance)}
                </div>
              </div>
              <div>
                <div className="text-[#525866]">Late Fees</div>
                <div className="font-mono text-base font-semibold tabular-nums text-[#B91C1C] mt-0.5">
                  {formatCurrency(selectedUnit.lateFeeBalance)}
                </div>
              </div>
              <div>
                <div className="text-[#525866]">Monthly Dues</div>
                <div className="font-mono text-base font-semibold tabular-nums text-[#111318] mt-0.5">
                  {formatCurrency(selectedUnit.monthlyAssessment)}
                </div>
              </div>
            </div>

            {selectedUnit.paymentPlanNote && (
              <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-xs text-[#92400E]">
                <strong>Active Payment Plan:</strong> {selectedUnit.paymentPlanNote}
              </div>
            )}

            {/* Treasurer Actions */}
            {canWriteBoard && (
              <div className="space-y-4 pb-4 border-b border-black/[0.06] text-xs">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[110px]">
                    <label className="block font-medium text-[#111318] mb-1">Record Payment ($)</label>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full px-3 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#111318] mb-1">Method</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as 'ACH' | 'Card' | 'Check')}
                      className="px-3 py-2 border border-black/[0.1] rounded-xl bg-[#F8F9FB] focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                    >
                      <option value="ACH">ACH</option>
                      <option value="Card">Card</option>
                      <option value="Check">Check</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const amt = Number(payAmount);
                      if (amt > 0) recordUnitPayment(selectedUnit.id, amt, payMethod);
                    }}
                    className="arch-btn-primary px-4 py-2 font-semibold"
                  >
                    Post Payment
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#525866]">Collection Stage:</span>
                    <select
                      value={selectedUnit.delinquencyStage}
                      onChange={(e) =>
                        updateUnitDelinquency(selectedUnit.id, e.target.value as DelinquencyStage)
                      }
                      className="px-3 py-1.5 border border-black/[0.1] rounded-xl bg-[#F8F9FB] focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                    >
                      <option value="current">Current</option>
                      <option value="30d_notice">30-Day Notice</option>
                      <option value="60d_demand">60-Day Demand</option>
                      <option value="payment_plan">Payment Plan</option>
                      <option value="legal_lien">Legal / Lien Track</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCorrForm((v) => !v)}
                    className="font-semibold text-[#B45309] hover:underline cursor-pointer"
                  >
                    {showCorrForm ? 'Close Adjustment' : 'Post Adjustment / Credit'}
                  </button>
                </div>

                {showCorrForm && (
                  <div className="p-4 bg-[#FAFBFD] border border-black/[0.07] rounded-xl space-y-2.5">
                    <div className="font-display font-semibold text-[#111318]">
                      Audited Ledger Adjustment (Original records are never deleted)
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[#525866] mb-1">Principal Adj. ($)</label>
                        <input
                          type="number"
                          value={corrPrincipal}
                          onChange={(e) => setCorrPrincipal(e.target.value)}
                          className="w-full px-3 py-1.5 font-mono bg-white border border-black/[0.1] rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[#525866] mb-1">Late-Fee Adj. ($)</label>
                        <input
                          type="number"
                          value={corrLate}
                          onChange={(e) => setCorrLate(e.target.value)}
                          className="w-full px-3 py-1.5 font-mono bg-white border border-black/[0.1] rounded-xl"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={corrReason}
                      onChange={(e) => setCorrReason(e.target.value)}
                      placeholder="Mandatory reason (e.g., Board waived late fee per Dec 3 motion)"
                      className="w-full px-3 py-2 bg-white border border-black/[0.1] rounded-xl"
                    />
                    <button
                      type="button"
                      disabled={!corrReason.trim()}
                      onClick={() => {
                        recordUnitCorrection(
                          selectedUnit.id,
                          Number(corrPrincipal) || 0,
                          Number(corrLate) || 0,
                          corrReason.trim()
                        );
                        setCorrReason('');
                        setShowCorrForm(false);
                      }}
                      className="px-4 py-2 bg-[#B45309] text-white rounded-xl font-semibold disabled:opacity-40"
                    >
                      Save Audited Adjustment
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Transaction Ledger Data Table */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-display font-semibold text-[#111318]">Transaction History</h3>
              <div className="border border-black/[0.08] rounded-xl overflow-auto max-h-80">
                <InteractiveTable controller={unitTxTable} compact>
                  <tbody className="text-xs">
                    {sortedUnitTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="font-mono text-[#525866] whitespace-nowrap">
                          {formatDateShort(tx.date)}
                        </td>
                        <td>
                          <div className="font-medium text-[#111318]">{tx.description}</div>
                          <div className="text-[11px] text-[#6B7280] mt-0.5">
                            {tx.recordedBy}
                            {tx.paymentMethod ? ` · ${tx.paymentMethod}` : ''}
                          </div>
                        </td>
                        <td className="text-right font-mono tabular-nums whitespace-nowrap">
                          {tx.principalDelta !== 0 && (
                            <div
                              className={
                                tx.principalDelta < 0 ? 'text-[#15803D] font-semibold' : 'text-[#111318]'
                              }
                            >
                              {tx.principalDelta > 0 ? '+' : ''}
                              {formatCurrency(tx.principalDelta)} dues
                            </div>
                          )}
                          {tx.lateFeeDelta !== 0 && (
                            <div
                              className={
                                tx.lateFeeDelta < 0 ? 'text-[#15803D] font-semibold' : 'text-[#B91C1C]'
                              }
                            >
                              {tx.lateFeeDelta > 0 ? '+' : ''}
                              {formatCurrency(tx.lateFeeDelta)} fee
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </InteractiveTable>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Log New Bill */}
      {showNewInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111318]/45 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateInvoice}
            className="w-full max-w-lg bg-white border border-black/[0.08] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-[#111318]">Log Vendor Bill</h3>
              <button
                type="button"
                onClick={() => setShowNewInv(false)}
                className="p-1.5 text-[#525866] hover:text-[#111318] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Invoice #</label>
                  <input
                    required
                    value={invNum}
                    onChange={(e) => setInvNum(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Amount ($)</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Vendor</label>
                  <select
                    value={invVendorId}
                    onChange={(e) => setInvVendorId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  >
                    {state.vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.company}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Linked Building Asset</label>
                  <select
                    value={invAssetId}
                    onChange={(e) => setInvAssetId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  >
                    <option value="">General Association</option>
                    {state.assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Description</label>
                <input
                  required
                  value={invDesc}
                  onChange={(e) => setInvDesc(e.target.value)}
                  placeholder="Scope of work billed..."
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Fund</label>
                  <select
                    value={invFund}
                    onChange={(e) => setInvFund(e.target.value as FundType)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  >
                    <option value="operating">Operating</option>
                    <option value="reserve">Reserve</option>
                    <option value="special_project">Special Project</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Budget Line</label>
                  <select
                    value={invCategory}
                    onChange={(e) => setInvCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  >
                    {Array.from(new Set(state.budgetLines.map((b) => b.category))).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Initial State</label>
                  <select
                    value={invInitialStatus}
                    onChange={(e) => setInvInitialStatus(e.target.value as 'draft' | 'received')}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  >
                    <option value="received">Received</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#FAFBFD] border-t border-black/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewInv(false)}
                className="arch-btn-secondary px-3.5 py-2 text-xs font-medium"
              >
                Cancel
              </button>
              <button type="submit" className="arch-btn-primary px-4 py-2 text-xs font-semibold">
                Save Bill
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Amend Paid Invoice Note */}
      {corrInvId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111318]/45 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl shadow-2xl p-6 space-y-3.5 text-xs">
            <div className="font-display text-base font-bold text-[#111318]">
              Add Accounting Note (No Deletion)
            </div>
            <p className="text-[#525866] leading-relaxed">
              Paid bills remain permanently in the ledger. Add a reclassification or audit note below.
            </p>
            <input
              type="text"
              value={corrInvReason}
              onChange={(e) => setCorrInvReason(e.target.value)}
              placeholder="Reason for note or reclassification..."
              className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCorrInvId(null)}
                className="arch-btn-secondary px-3.5 py-2 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!corrInvReason.trim()}
                onClick={() => {
                  correctInvoiceNote(corrInvId, corrInvReason.trim());
                  setCorrInvId(null);
                }}
                className="arch-btn-primary px-4 py-2 font-semibold disabled:opacity-40"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Propose Special Assessment */}
      {showNewSA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111318]/45 backdrop-blur-xs p-4">
          <form
            onSubmit={handleAddSA}
            className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-[#111318]">
                Record Special Assessment
              </h3>
              <button
                type="button"
                onClick={() => setShowNewSA(false)}
                className="p-1.5 text-[#525866] hover:text-[#111318] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#111318] mb-1">Title</label>
                <input
                  required
                  value={saTitle}
                  onChange={(e) => setSaTitle(e.target.value)}
                  placeholder="e.g., 2027 Garage Concrete Waterproofing"
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Purpose</label>
                <textarea
                  rows={2}
                  value={saPurpose}
                  onChange={(e) => setSaPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Total Amount ($)</label>
                  <input
                    required
                    type="number"
                    value={saTotal}
                    onChange={(e) => setSaTotal(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Target Due Date</label>
                  <input
                    type="date"
                    value={saDue}
                    onChange={(e) => setSaDue(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Approval Status</label>
                <select
                  value={saStatus}
                  onChange={(e) => setSaStatus(e.target.value as 'proposed' | 'board_approved')}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                >
                  <option value="proposed">Proposed (Not Yet Approved)</option>
                  <option value="board_approved">Board-Approved</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#FAFBFD] border-t border-black/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewSA(false)}
                className="arch-btn-secondary px-3.5 py-2 text-xs font-medium"
              >
                Cancel
              </button>
              <button type="submit" className="arch-btn-primary px-4 py-2 text-xs font-semibold">
                Save Assessment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
