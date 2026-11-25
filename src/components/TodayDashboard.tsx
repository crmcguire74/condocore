import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Camera,
  CheckCircle2,
  Circle,
  Download,
  Sparkles,
  X,
} from 'lucide-react';
import { useCondoCore } from '../store/CondoCoreContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { HealthStatus } from '../types/condocore';
import { BUILDING_IMAGES } from '../data/seedData';
import { daysUntil, formatCurrency, formatDateShort } from '../utils/exports';
import { HealthText, ResilientImage } from './StatusIndicator';

interface TodayActionItem {
  id: string;
  category:
    | 'Overdue Assessments'
    | 'Invoices Awaiting Approval'
    | 'Open Maintenance'
    | 'Inspections Due Soon'
    | 'Expiring Vendor COI / Contract'
    | 'Upcoming Board Decisions'
    | 'Unread Resident Requests'
    | 'Budget Warnings'
    | 'Capital Projects';
  severity: HealthStatus;
  title: string;
  detail: string;
  metric?: string;
  ctaLabel: string;
  onAction: () => void;
}

export function TodayDashboard() {
  const {
    state,
    setActiveTab,
    setSelectedPlanId,
    setOpenAssetId,
    setOpenWorkOrderId,
    setOpenVendorId,
    setShowOnboardingWizard,
    setOpenScannerOnMap,
    toggleTransitionItem,
    getVendorFlags,
    getFundBalances,
    getBudgetActual,
  } = useCondoCore();

  const { isInstalled } = usePWAInstall();
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'red' | 'yellow'>('all');
  const [dismissDemoBanner, setDismissDemoBanner] = useState(false);

  const funds = getFundBalances();

  const overdueUnits = state.units.filter((u) => u.daysPastDue > 0 || u.lateFeeBalance > 0);
  const totalOverdueAmount = overdueUnits.reduce((s, u) => s + u.principalBalance + u.lateFeeBalance, 0);

  const pendingInvoices = state.invoices.filter(
    (inv) => inv.status === 'received' || inv.status === 'first_approval'
  );
  const openWOs = state.workOrders.filter((w) => w.status !== 'closed');
  const unreadResidentWOs = openWOs.filter((w) => w.source === 'resident' && w.unreadByBoard);

  // Build live actionable Today items spanning all 9 required categories
  const actionItems = useMemo<TodayActionItem[]>(() => {
    const list: TodayActionItem[] = [];

    // 1. Inspections due soon (e.g., Boiler inspection due in 14 days)
    state.inspections
      .filter((i) => i.status !== 'completed')
      .forEach((insp) => {
        const dLeft = daysUntil(insp.dueDate);
        if (dLeft <= 30) {
          const asset = state.assets.find((a) => a.id === insp.assetId);
          const vendor = state.vendors.find((v) => v.id === insp.vendorId);
          list.push({
            id: `act-insp-${insp.id}`,
            category: 'Inspections Due Soon',
            severity: dLeft <= 10 ? 'red' : 'yellow',
            title: `${insp.title} due in ${Math.max(0, dLeft)} days`,
            detail: `${asset?.code || ''} · ${vendor?.company || insp.inspectorName} · Budget: ${asset?.budgetCategory || 'Operations'}`,
            metric: formatDateShort(insp.dueDate),
            ctaLabel: 'Open Asset & Schedule',
            onAction: () => {
              if (asset) {
                setSelectedPlanId(asset.planId);
                setOpenAssetId(asset.id);
              } else {
                setActiveTab('inspections');
              }
            },
          });
        }
      });

    // 2. Invoices awaiting board approval (1st or 2nd signature)
    pendingInvoices.forEach((inv) => {
      const vendor = state.vendors.find((v) => v.id === inv.vendorId);
      const needsTwo = inv.amount >= state.settings.twoPersonApprovalThreshold;
      list.push({
        id: `act-inv-${inv.id}`,
        category: 'Invoices Awaiting Approval',
        severity: inv.status === 'first_approval' ? 'yellow' : 'red',
        title: `${inv.invoiceNumber} — ${vendor?.company || 'Vendor'} (${inv.status === 'first_approval' ? 'Awaiting 2nd Officer Approval' : 'Awaiting 1st Approval'})`,
        detail: `${inv.description} · ${inv.fund.replace('_', ' ')} fund · ${inv.approvals.length}/${needsTwo ? 2 : 1} signatures`,
        metric: formatCurrency(inv.amount),
        ctaLabel: 'Review & Approve',
        onAction: () => setActiveTab('financials'),
      });
    });

    // 3. Unread resident requests
    unreadResidentWOs.forEach((wo) => {
      list.push({
        id: `act-res-${wo.id}`,
        category: 'Unread Resident Requests',
        severity: wo.urgency === 'emergency' || wo.urgency === 'urgent' ? 'red' : 'yellow',
        title: `Unread Request · Unit ${wo.reportedByUnit || 'Owner'}: ${wo.title}`,
        detail: `Submitted ${formatDateShort(wo.createdAt)} by ${wo.reportedByName} · Unclassified (triage needed)`,
        metric: wo.code,
        ctaLabel: 'Triage Request',
        onAction: () => setOpenWorkOrderId(wo.id),
      });
    });

    // 4. Open maintenance issues (excluding unread already listed)
    openWOs
      .filter((w) => !w.unreadByBoard)
      .forEach((wo) => {
        const vendor = state.vendors.find((v) => v.id === wo.vendorId);
        list.push({
          id: `act-wo-${wo.id}`,
          category: 'Open Maintenance',
          severity: wo.urgency === 'emergency' ? 'red' : 'yellow',
          title: `${wo.code}: ${wo.title}`,
          detail: `${wo.status.replace('_', ' ')} · ${vendor ? vendor.company : 'Unassigned'} · ${wo.classification.replace('_', ' ')}`,
          metric: wo.estimatedCost ? formatCurrency(wo.estimatedCost) : 'Contract',
          ctaLabel: wo.status === 'awaiting_verification' ? 'Verify & Close' : 'Open Work Order',
          onAction: () => setOpenWorkOrderId(wo.id),
        });
      });

    // 5. Overdue assessments
    if (overdueUnits.length > 0) {
      const legalUnits = overdueUnits.filter((u) => u.delinquencyStage === 'legal_lien' || u.daysPastDue >= 60);
      list.push({
        id: 'act-overdue-units',
        category: 'Overdue Assessments',
        severity: legalUnits.length > 0 ? 'red' : 'yellow',
        title: `${overdueUnits.length} units carry overdue assessment balances (${legalUnits.length} at 60+ days)`,
        detail: `Units ${overdueUnits.map((u) => u.unitNumber).join(', ')} · Includes active Unit 406 payment plan & Unit 507 lien track`,
        metric: formatCurrency(totalOverdueAmount),
        ctaLabel: 'Open Aging Ledger',
        onAction: () => setActiveTab('financials'),
      });
    }

    // 6. Expiring vendor COI & contracts / missed services
    state.vendors.forEach((v) => {
      const flags = getVendorFlags(v);
      if (flags.coiExpiringSoon) {
        list.push({
          id: `act-coi-${v.id}`,
          category: 'Expiring Vendor COI / Contract',
          severity: 'red',
          title: `${v.company} Certificate of Insurance expires in ${flags.coiDaysLeft} days`,
          detail: `Policy #${v.coiPolicyNumber} expires ${formatDateShort(v.coiExpiry)} · Hold seasonal retainer until updated certificate uploaded`,
          metric: `${flags.coiDaysLeft}d left`,
          ctaLabel: 'Open Vendor Record',
          onAction: () => {
            setOpenVendorId(v.id);
            setActiveTab('vendors');
          },
        });
      }
      if (flags.missedServices || flags.contractExpiringSoon) {
        list.push({
          id: `act-vnd-cnt-${v.id}`,
          category: 'Expiring Vendor COI / Contract',
          severity: 'yellow',
          title: `${v.company}: ${flags.missedServices ? 'Missed recurring PM visit' : `Contract renews in ${flags.contractDaysLeft} days`}`,
          detail: `${v.renewalTerms} · Contract ends ${formatDateShort(v.contractEnd)}`,
          metric: formatDateShort(v.contractEnd),
          ctaLabel: 'Review Contract',
          onAction: () => {
            setOpenVendorId(v.id);
            setActiveTab('vendors');
          },
        });
      }
    });

    // 7. Capital projects over budget or behind schedule
    state.capitalProjects
      .filter((cp) => cp.actualSpent > cp.approvedBudget || cp.scheduleStatus === 'behind_schedule')
      .forEach((cp) => {
        const variance = cp.actualSpent - cp.approvedBudget;
        const asset = state.assets.find((a) => a.id === cp.assetId);
        list.push({
          id: `act-cap-${cp.id}`,
          category: 'Capital Projects',
          severity: 'red',
          title: `${cp.name} is behind schedule & ${formatCurrency(variance)} over budget`,
          detail: `Spent ${formatCurrency(cp.actualSpent)} vs ${formatCurrency(cp.approvedBudget)} approved · ${cp.completionPct}% complete (Target ${formatDateShort(cp.targetCompletion)})`,
          metric: `+${formatCurrency(variance)}`,
          ctaLabel: 'Inspect Asset & Cost',
          onAction: () => {
            if (asset) setOpenAssetId(asset.id);
            else setActiveTab('financials');
          },
        });
      });

    // 8. Budget warnings
    state.budgetLines
      .filter((bl) => bl.fund === 'operating')
      .forEach((bl) => {
        const { actual } = getBudgetActual(bl.category, bl.fund);
        if (actual > bl.ytdBudget) {
          const pct = Math.round(((actual - bl.ytdBudget) / bl.ytdBudget) * 100);
          list.push({
            id: `act-bgt-${bl.id}`,
            category: 'Budget Warnings',
            severity: pct >= 10 ? 'red' : 'yellow',
            title: `${bl.category} (Operating) is ${pct}% over YTD budget`,
            detail: `YTD Actual ${formatCurrency(actual)} vs ${formatCurrency(bl.ytdBudget)} planned — click to drill down to invoices & asset`,
            metric: `+${pct}%`,
            ctaLabel: 'Drill Down Variance',
            onAction: () => setActiveTab('financials'),
          });
        }
      });

    // 9. Upcoming board decisions
    state.decisions
      .filter((d) => d.status === 'proposed' || d.status === 'draft')
      .forEach((d) => {
        list.push({
          id: `act-dec-${d.id}`,
          category: 'Upcoming Board Decisions',
          severity: 'yellow',
          title: `${d.code}: ${d.title}`,
          detail: `Follow-up ${formatDateShort(d.followUpDate)} · Responsible: ${d.personResponsible}`,
          metric: d.status.toUpperCase(),
          ctaLabel: 'Open Decision Record',
          onAction: () => setActiveTab('governance'),
        });
      });

    return list.sort((a, b) => (a.severity === 'red' && b.severity !== 'red' ? -1 : a.severity !== 'red' && b.severity === 'red' ? 1 : 0));
  }, [state, pendingInvoices, openWOs, unreadResidentWOs, overdueUnits, totalOverdueAmount]);

  const visibleActions =
    filterSeverity === 'all' ? actionItems : actionItems.filter((a) => a.severity === filterSeverity);

  // 30-Second Building Health Matrix (Physical Systems + Financial/Governance)
  const healthSystems = useMemo<
    { label: string; status: HealthStatus; summary: string; onClick: () => void }[]
  >(() => {
    const worstForCategories = (cats: string[]): HealthStatus => {
      const matching = state.assets.filter((a) => cats.includes(a.category));
      if (matching.some((a) => a.condition === 'red')) return 'red';
      if (matching.some((a) => a.condition === 'yellow')) return 'yellow';
      return 'green';
    };

    const openFirstAssetOrMap = (cats: string[], fallbackPlanId?: string) => {
      const match = state.assets.find((a) => cats.includes(a.category));
      if (match) {
        setSelectedPlanId(match.planId);
        setOpenAssetId(match.id);
      } else {
        if (fallbackPlanId && state.floorPlans.some((p) => p.id === fallbackPlanId)) {
          setSelectedPlanId(fallbackPlanId);
        }
        setActiveTab('map');
      }
    };

    const vendorFlagged = state.vendors.some((v) => getVendorFlags(v).coiExpiringSoon);
    const vendorWarn = state.vendors.some((v) => getVendorFlags(v).hasAnyFlag);
    const assessmentsStatus: HealthStatus =
      overdueUnits.some((u) => u.daysPastDue >= 60) ? 'red' : overdueUnits.length > 0 ? 'yellow' : 'green';
    const isDemo = Boolean(state.settings.isDemoWorkspace);

    return [
      {
        label: 'Roof & Waterproofing',
        status: worstForCategories(['Roof', 'Drain & Water']),
        summary: isDemo
          ? 'NW scupper rebuilt; awaiting rain-test verification'
          : `${state.assets.filter((a) => a.category === 'Roof' || a.category === 'Drain & Water').length} roof assets tracked`,
        onClick: () => openFirstAssetOrMap(['Roof', 'Drain & Water'], 'plan-roof'),
      },
      {
        label: 'Boiler & Hydronic HVAC',
        status: worstForCategories(['Boiler & HVAC']),
        summary: isDemo
          ? 'Operating at 18 PSI; state safety inspection due in 14d'
          : `${state.assets.filter((a) => a.category === 'Boiler & HVAC').length} mechanical systems mapped`,
        onClick: () => openFirstAssetOrMap(['Boiler & HVAC'], 'plan-mechanical'),
      },
      {
        label: 'Elevator & Vertical',
        status: worstForCategories(['Elevator']),
        summary: isDemo
          ? 'Floor 4 leveling ticket dispatched; Oct PM missed'
          : `${state.assets.filter((a) => a.category === 'Elevator').length} vertical transport assets`,
        onClick: () => openFirstAssetOrMap(['Elevator'], 'plan-typical'),
      },
      {
        label: 'Fire & Life Safety',
        status: worstForCategories(['Fire & Sprinkler']),
        summary: isDemo
          ? 'NFPA 25 compliant; Q4 flow test scheduled Dec 12'
          : `${state.assets.filter((a) => a.category === 'Fire & Sprinkler').length} life-safety systems mapped`,
        onClick: () => openFirstAssetOrMap(['Fire & Sprinkler'], 'plan-mechanical'),
      },
      {
        label: 'Masonry & Garage Structure',
        status: worstForCategories(['Exterior & Masonry', 'Garage & Structure']),
        summary: isDemo
          ? 'West facade Phase 2 over budget; beam B-32 monitored'
          : `${state.assets.filter((a) => a.category === 'Exterior & Masonry' || a.category === 'Garage & Structure').length} envelope & structure assets`,
        onClick: () => openFirstAssetOrMap(['Exterior & Masonry', 'Garage & Structure'], 'plan-ground'),
      },
      {
        label: 'Assessments & Cashflow',
        status: assessmentsStatus,
        summary: `${overdueUnits.length} overdue units (${formatCurrency(totalOverdueAmount)}) · Reserve ${formatCurrency(funds.reserve)}`,
        onClick: () => setActiveTab('financials'),
      },
      {
        label: 'Vendor Compliance & COIs',
        status: vendorFlagged ? 'red' : vendorWarn ? 'yellow' : 'green',
        summary: vendorFlagged
          ? 'Vendor COI expiring within 30d; review required'
          : state.vendors.length === 0
          ? 'No vendors entered yet — add active contractors'
          : `All ${state.vendors.length} vendor certificates current`,
        onClick: () => setActiveTab('vendors'),
      },
      {
        label: 'Governance & Decisions',
        status: state.decisions.some((d) => d.status === 'proposed') ? 'yellow' : 'green',
        summary:
          state.decisions.length > 0
            ? `${state.decisions.filter((d) => d.status === 'proposed').length} pending motion · ${state.meetings.length} meetings logged`
            : 'Ready to record board motions & minutes',
        onClick: () => setActiveTab('governance'),
      },
    ];
  }, [state, overdueUnits, totalOverdueAmount, funds.reserve]);

  const redCount = actionItems.filter((a) => a.severity === 'red').length;
  const yellowCount = actionItems.filter((a) => a.severity === 'yellow').length;
  const healthGreenCount = healthSystems.filter((s) => s.status === 'green').length;
  const healthYellowCount = healthSystems.filter((s) => s.status === 'yellow').length;
  const healthRedCount = healthSystems.filter((s) => s.status === 'red').length;
  const scannedSpaceCount = state.floorPlans.reduce((sum, p) => sum + (p.scannedSpaces?.length || 0), 0);
  const totalCash = Math.max(1, funds.operating + funds.reserve + funds.special_project);
  const reserveSharePct = Math.round((funds.reserve / totalCash) * 100);
  const completedSetupSteps = state.transitionChecklist.filter((i) => i.completed).length;

  return (
    <div className="flex flex-col lg:h-full lg:min-h-0 gap-4">
      {/* Pinned Top Banner & Executive Action Strip */}
      <div className="shrink-0 space-y-3">
        {state.settings.isDemoWorkspace && !dismissDemoBanner && (
          <div className="rounded-2xl bg-[#111318] text-white border border-white/[0.08] px-4 sm:px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 text-[#F0C05A] shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-display font-semibold text-white">
                  Exploring Demo Building ({state.settings.name}).
                </span>{' '}
                <span className="text-[#A6ACB9]">
                  Configure your own condominium with the 5-step Setup Wizard, build floorplans in the Studio, or browse the Operations Guide.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowOnboardingWizard(true)}
                className="arch-btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <Building2 className="w-3.5 h-3.5" />
                Start New Building
              </button>
              {!isInstalled && (
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white/10 border border-white/15 text-white rounded-xl hover:bg-white/15 transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-[#93B4FD]" />
                  Install App
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('help')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#93B4FD] hover:text-white transition-colors whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Help Guide
              </button>
              <button
                type="button"
                onClick={() => setDismissDemoBanner(true)}
                className="p-1 text-[#8E95A5] hover:text-white rounded-lg"
                aria-label="Dismiss demo workspace banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Pinned Executive Header Row */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#525866]">
              <span className="w-2 h-2 rounded-full bg-[#1C4ED8]" aria-hidden="true" />
              <span className="font-medium">Board Operating Record · Nov 2026</span>
              <span aria-hidden="true" className="text-black/20">·</span>
              <span className="font-semibold text-[#1C4ED8] tabular-nums">
                {state.settings.unitCount} Units · {state.floorPlans.length} Plans
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-[#111318] tracking-tight mt-0.5 truncate">
              {state.settings.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className="arch-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
            >
              Open Building Map
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('map');
                setOpenScannerOnMap(true);
              }}
              className="arch-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5 text-[#1C4ED8]" />
              Scan Space
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Dashboard Workspace */}
      <div className="flex-1 min-h-0 lg:overflow-y-auto space-y-6 pr-0.5 pb-2">
        {/* Top Executive Context Band — Building Identity & 30-Second Numbers */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-8 arch-surface rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs sm:text-[13px] text-[#525866] max-w-2xl leading-relaxed">
                {state.settings.address}. Every physical asset, manual &amp; camera-scanned floorplan, maintenance ticket, vendor COI, financial ledger entry, and board decision in one association-owned record.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-5 sm:gap-y-0 sm:divide-x sm:divide-black/[0.06] pt-5 mt-5 border-t border-black/[0.06]">
              <div className="sm:pr-5">
                <div className="text-xs font-medium text-[#525866]">Action Required</div>
                <div className="mt-1.5 font-mono text-2xl sm:text-[28px] font-semibold tabular-nums text-[#B91C1C] leading-none">
                  {redCount}
                </div>
                <div className="text-xs text-[#6B7280] mt-2">Red items today</div>
              </div>
              <div className="sm:px-5">
                <div className="text-xs font-medium text-[#525866]">Due Soon / Watch</div>
                <div className="mt-1.5 font-mono text-2xl sm:text-[28px] font-semibold tabular-nums text-[#B45309] leading-none">
                  {yellowCount}
                </div>
                <div className="text-xs text-[#6B7280] mt-2">Yellow watch items</div>
              </div>
              <div className="sm:px-5">
                <div className="text-xs font-medium text-[#525866]">Operating Cash</div>
                <div className="mt-1.5 font-mono text-lg sm:text-[21px] font-semibold tabular-nums text-[#111318] leading-tight">
                  {formatCurrency(funds.operating)}
                </div>
                <div className="text-xs text-[#6B7280] mt-1.5">
                  {pendingInvoices.length} invoice{pendingInvoices.length === 1 ? '' : 's'} pending
                </div>
              </div>
              <div className="sm:pl-5">
                <div className="text-xs font-medium text-[#525866]">Reserve Fund</div>
                <div className="mt-1.5 font-mono text-lg sm:text-[21px] font-semibold tabular-nums text-[#111318] leading-tight">
                  {formatCurrency(funds.reserve)}
                </div>
                <div
                  className="mt-2 h-1.5 w-full bg-[#ECEEF2] rounded-full overflow-hidden"
                  title={`Reserve is ${reserveSharePct}% of total cash`}
                >
                  <div
                    className="h-full bg-[#1C4ED8] rounded-full"
                    style={{ width: `${Math.min(100, Math.max(4, reserveSharePct))}%` }}
                  />
                </div>
                <div className="text-xs text-[#6B7280] mt-1 font-mono tabular-nums">
                  {reserveSharePct}% of total cash
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 rounded-2xl overflow-hidden bg-[#111318] border border-black/[0.08] shadow-[0_12px_32px_-16px_rgba(15,23,42,0.4)] flex flex-col">
            <div className="relative h-48 lg:flex-1 min-h-[196px]">
              <ResilientImage
                src={BUILDING_IMAGES.exterior}
                alt={`${state.settings.name} building facade`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-[#111318]/45 to-transparent flex flex-col justify-end p-5">
                <div className="text-xs font-medium text-[#93B4FD]">
                  {state.floorPlans.length} Architectural Plans · {state.assets.length} Asset Pins
                  {scannedSpaceCount > 0 ? ` · ${scannedSpaceCount} Scanned` : ''}
                </div>
                <div className="text-xs text-white/80 mt-1">
                  Click any floorplan pin to trace leak history, warranties, bids, and work orders.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* New Custom Building Launchpad Checklist (when user created their own workspace) */}
        {!state.settings.isDemoWorkspace && completedSetupSteps < state.transitionChecklist.length && (
          <section className="arch-surface rounded-2xl p-6 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-display font-bold text-[#111318]">
                  New Building Setup Launchpad ({completedSetupSteps}/{state.transitionChecklist.length} Complete)
                </h2>
                <p className="text-xs text-[#525866] mt-0.5">
                  Follow these steps to bring {state.settings.name} online with floorplans, pinned systems, and vendor COIs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('map');
                  setOpenScannerOnMap(true);
                }}
                className="arch-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold"
              >
                <Camera className="w-3.5 h-3.5" />
                Scan First Room with Camera
              </button>
            </div>
            <div className="h-1.5 bg-[#ECEEF2] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1C4ED8] transition-all duration-300"
                style={{
                  width: `${Math.round((completedSetupSteps / Math.max(1, state.transitionChecklist.length)) * 100)}%`,
                }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {state.transitionChecklist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleTransitionItem(item.id)}
                  className="flex items-start gap-2.5 p-3.5 text-left rounded-xl border border-black/[0.07] hover:border-[#1C4ED8]/40 hover:bg-[#F8FAFF] transition-colors text-xs"
                >
                  {item.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#788090] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className={item.completed ? 'line-through text-[#788090]' : 'font-medium text-[#111318]'}>
                      {item.title}
                    </div>
                    <div className="text-xs text-[#525866] mt-0.5">{item.category} · {item.ownerRole}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 30-Second Building Health View */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-display font-bold text-[#111318] tracking-tight">
                Building Health Overview
              </h2>
              <p className="text-xs text-[#525866] mt-0.5">
                30-second association condition scan across physical systems and fiduciary controls. Tap any system to inspect.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#525866]">
              <HealthText status="green" label={`${healthGreenCount} Current`} />
              <HealthText status="yellow" label={`${healthYellowCount} Attention`} />
              <HealthText status="red" label={`${healthRedCount} Action Needed`} />
            </div>
          </div>

          {/* Instant Proportional Building Health Bar */}
          <div
            className="h-2 w-full rounded-full overflow-hidden flex gap-0.5 bg-[#ECEEF2]"
            aria-label={`Building health distribution: ${healthGreenCount} green, ${healthYellowCount} yellow, ${healthRedCount} red`}
          >
            {healthGreenCount > 0 && (
              <div className="h-full bg-[#15803D]" style={{ width: `${(healthGreenCount / healthSystems.length) * 100}%` }} />
            )}
            {healthYellowCount > 0 && (
              <div className="h-full bg-[#B45309]" style={{ width: `${(healthYellowCount / healthSystems.length) * 100}%` }} />
            )}
            {healthRedCount > 0 && (
              <div className="h-full bg-[#B91C1C]" style={{ width: `${(healthRedCount / healthSystems.length) * 100}%` }} />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {healthSystems.map((sys) => (
              <button
                key={sys.label}
                type="button"
                onClick={sys.onClick}
                className="group arch-surface-interactive rounded-2xl text-left p-5 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="text-sm font-display font-semibold text-[#111318] group-hover:text-[#1C4ED8] transition-colors">
                    {sys.label}
                  </div>
                  <p className="text-xs text-[#525866] leading-relaxed">{sys.summary}</p>
                </div>
                <div className="pt-3 flex items-center justify-between border-t border-black/[0.06]">
                  <HealthText
                    status={sys.status}
                    label={
                      sys.status === 'green'
                        ? 'Current'
                        : sys.status === 'yellow'
                        ? 'Attention'
                        : 'Action Needed'
                    }
                  />
                  <span className="text-xs font-semibold text-[#1C4ED8] group-hover:translate-x-0.5 transition-transform">
                    Inspect →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Today Action Center Queue */}
        <section className="space-y-3">
          <div className="sticky top-0 z-10 bg-[#F4F5F7]/95 backdrop-blur-sm py-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-display font-bold text-[#111318] tracking-tight">
                Today — Board Action Queue
              </h2>
              <p className="text-xs text-[#525866] mt-0.5">
                Every item opens its exact physical asset, vendor record, approval queue, or work order.
              </p>
            </div>

            <div className="arch-segmented overflow-x-auto">
              {([
                { key: 'all', label: `All Alerts (${actionItems.length})` },
                { key: 'red', label: `Urgent (${redCount})` },
                { key: 'yellow', label: `Watch (${yellowCount})` },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterSeverity(tab.key)}
                  className={`arch-segmented-btn ${
                    filterSeverity === tab.key ? 'arch-segmented-btn-active' : ''
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="arch-surface rounded-2xl divide-y divide-black/[0.06] overflow-hidden">
            {visibleActions.length === 0 ? (
              <div className="p-10 text-center">
                <Building2 className="w-7 h-7 text-[#788090] mx-auto mb-2" />
                <div className="text-sm font-display font-semibold text-[#111318]">All caught up in this category</div>
                <p className="text-xs text-[#525866] mt-1">
                  No open alerts match the current filter.
                </p>
              </div>
            ) : (
              visibleActions.map((item) => (
                <div
                  key={item.id}
                  onClick={item.onAction}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      item.onAction();
                    }
                  }}
                  className="group px-5 sm:px-6 py-4 hover:bg-[#F8FAFF] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#525866]">
                      <HealthText
                        status={item.severity}
                        label={item.severity === 'red' ? 'Red' : 'Yellow'}
                      />
                      <span aria-hidden="true" className="text-black/20">·</span>
                      <span className="text-xs font-medium text-[#525866]">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-sm font-display font-semibold text-[#111318] group-hover:text-[#1C4ED8] transition-colors">
                      {item.title}
                    </div>
                    <div className="text-xs text-[#525866]">{item.detail}</div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
                    {item.metric && (
                      <span className="font-mono text-xs font-semibold tabular-nums text-[#111318]">
                        {item.metric}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1C4ED8] group-hover:text-[#153DB0] whitespace-nowrap">
                      {item.ctaLabel}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
