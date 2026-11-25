import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Camera,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  DollarSign,
  Gavel,
  Map,
  Search,
  Smartphone,
  Users,
} from 'lucide-react';
import { useCondoCore } from '../store/CondoCoreContext';

interface HelpArticle {
  id: string;
  section: string;
  title: string;
  summary: string;
  steps: string[];
  tips: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function HelpCenterView() {
  const { setActiveTab, setShowOnboardingWizard, setOpenScannerOnMap } = useCondoCore();
  const [query, setQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq-1');

  const articles = useMemo<HelpArticle[]>(
    () => [
      {
        id: 'onboarding-new-building',
        section: 'Getting Started',
        title: 'How to Start a New Building & Configure Parameters',
        summary:
          'Move from the pre-loaded Alderwood demo building into your own condominium association workspace in under 3 minutes.',
        steps: [
          'Open the Building Onboarding Wizard from the Today Action Center banner or Settings & PWA.',
          'Step 1 (Property Identity): Choose Guided Setup (creates starter budget categories & transition checklist) or Clean Blank Space, then enter your association name, street address, domain, and permanent board recovery email.',
          'Step 2 (Units & Dues): Enter residential floors, average units per floor, monthly assessment amount, and standard late fee. CondoCore generates numbered unit accounts automatically.',
          'Step 3 (Funds & Controls): Enter opening Operating, Reserve, and Special Project balances and set your Two-Person Invoice Approval Threshold.',
          'Step 4 & 5 (Officers & Floorplans): Name your President, Treasurer, Secretary, and Facilities Director, select initial architectural shells (or start blank for camera scanning), and launch your workspace.',
        ],
        tips: 'You can always restore The Alderwood sample dataset from Settings > Data Sovereignty if you want to reference an example later.',
        actionLabel: 'Launch Building Setup Wizard',
        onAction: () => setShowOnboardingWizard(true),
      },
      {
        id: 'pwa-installation',
        section: 'Mobile App & PWA',
        title: 'Installing CondoCore as a Progressive Web App (PWA)',
        summary:
          'Install CondoCore directly onto an iPhone, Android phone, iPad, or desktop computer for full-screen field use, offline resilience, and mobile camera access.',
        steps: [
          'Open the Settings & PWA tab from the left sidebar (or More menu on mobile).',
          'On Android Chrome or Desktop Chrome/Edge, click the "Install CondoCore App Now" button to accept the native OS install prompt.',
          'On iPhone or iPad (Safari), tap the Share button at the bottom of Safari, choose "Add to Home Screen", and tap "Add".',
          'Launch CondoCore from your home screen icon. Once installed, the status badge in Settings updates to INSTALLED STANDALONE.',
        ],
        tips: 'Offline caching keeps shutoff valve maps, vendor emergency contacts, and inspection checklists accessible even inside subterranean concrete garages or boiler rooms.',
        actionLabel: 'Go to PWA Install Settings',
        onAction: () => setActiveTab('settings'),
      },
      {
        id: 'camera-spatial-scanner',
        section: 'Building Map & Scanner',
        title: 'Scanning Rooms & Creating Entire Floorplans with Your Camera',
        summary:
          'Capture dimensions (width, length, ceiling height, sq ft) and interior objects—doors, windows, stairs, ladders, furniture, boilers, valves, and safety gear—straight onto a plan.',
        steps: [
          'Navigate to Building Map & Assets and click "Scan Space with Camera".',
          'Choose either "Scan Space onto Existing Floorplan" (adds a room overlay to a current level) or "Create Entire New Floorplan by Scanning Spaces" (stitches multiple scanned rooms into a brand-new level).',
          'Tap "Start Live Camera" (or "Take / Upload Photo") and capture 1 to 4 corner angles of the space. Optionally enter a known wall length or ceiling height to sharpen scale accuracy.',
          'Tap "Analyze Captured Frames". Review the measured dimensions and detected objects (doors, windows, stairs, ladders, furniture, mechanical equipment), adjust any measurement if needed, and save.',
          'Once on the blueprint, tap any scanned object and click "Promote to Tracked Asset Pin" to attach warranties, inspections, work orders, and reserve replacement budgets to it.',
        ],
        tips: 'Standing in one corner and capturing two opposite diagonal views gives the clearest layout for door swings, window placement, and ladder/stair locations.',
        actionLabel: 'Launch Camera Spatial Scanner',
        onAction: () => {
          setActiveTab('map');
          setOpenScannerOnMap(true);
        },
      },
      {
        id: 'plan-upload-calibration',
        section: 'Building Map & Scanner',
        title: 'Importing Existing PDFs, Drawings & Calibrating Scale',
        summary:
          'No scanning is required to start. Upload scanned architectural drawings, engineer roof diagrams, or site photos and preserve historical revisions.',
        steps: [
          'Open Building Map & Assets and click "Upload Plan / Revision".',
          'Select whether to create a new level/site map or attach a new historical revision to an existing plan (e.g., Roof Membrane Rev 2026).',
          'Choose an image file, click two known reference points on the drawing, and enter the real-world distance in feet to calibrate the grid.',
          'Switch between past revisions anytime using the Historical Version selector above the canvas without losing pinned asset history.',
        ],
        tips: 'Pin locations use normalized coordinates so your asset pins stay aligned when you upload updated revisions of the same drawing.',
        actionLabel: 'Open Building Map',
        onAction: () => setActiveTab('map'),
      },
      {
        id: 'manual-floorplan-studio',
        section: 'Building Map & Scanner',
        title: 'Building & Supplementing Floorplans Manually (Drag-and-Drop Studio)',
        summary:
          'Draft complete architectural layouts from scratch—or supplement uploaded and camera-scanned plans—using Visio/Planner5D-style drag-and-drop stencils.',
        steps: [
          'Open Building Map & Assets. Click "New Manual Plan" to start a fresh floorplan (blank grid or an editable starter template like a 6-unit floor, mechanical basement, or parking deck), OR select any existing uploaded/scanned plan and click "Edit / Build Floorplan".',
          'Drag rooms, condo units, corridors, walls, columns, swing/sliding doors, windows, stairs, elevators, ladders, boilers, fire risers, valves, parking stalls, or furniture from the left Elements Library directly onto the canvas (or click any stencil to drop it in).',
          'Move shapes with Visio-style smart alignment guides and snap-to-grid; drag any of the 8 corner/edge handles to resize in feet; drag the top gold handle (or press R) to rotate.',
          'When supplementing an uploaded or camera-scanned drawing, adjust the Base Plan opacity slider in the top bar to trace or overlay missing mechanical equipment, shutoff valves, or partition walls.',
          'Select any drafted element and click "Promote to Tracked Asset Pin" to link it directly to CondoCore warranties, inspections, work orders, and reserve life tracking.',
        ],
        tips: 'Keyboard shortcuts in Floorplan Studio: Arrow keys nudge shapes, R rotates 90°, Ctrl+D duplicates, Ctrl+Z/Ctrl+Shift+Z undoes/redoes, and Delete removes unlocked shapes.',
        actionLabel: 'Open Building Map & Floorplan Studio',
        onAction: () => setActiveTab('map'),
      },
      {
        id: 'inspections-workorders',
        section: 'Inspections & Maintenance',
        title: 'Reusable Inspection Workflows & One-Click Issue Escalation',
        summary:
          'Turn recurring building inspections into auditable checklists where failed items become tracked work orders with continuous asset history.',
        steps: [
          'Open Inspections & Work Orders and select one of the 10 reusable templates (Roof, Boiler & HVAC, Elevator, Fire & Sprinkler, Plumbing, Electrical, Garage, Masonry, Common-Area Safety, Seasonal).',
          'Record Pass, Needs Attention, or Fail alongside measurements (e.g., moisture readings, flue draft pressure) and severity.',
          'Click "Escalate to Work Order" on any failed or attention item—CondoCore automatically links the work order to the building asset, floorplan coordinates, and assigned vendor.',
          'Before closing a work order, attach a completion photo or verification inspection so future boards can prove the repair was finished.',
        ],
        tips: 'Tap any asset on the Building Map to see every prior inspection, leak photo, vendor bid, and cumulative dollar spent on that exact physical location.',
        actionLabel: 'Open Inspections & Work Orders',
        onAction: () => setActiveTab('inspections'),
      },
      {
        id: 'vendor-obligations',
        section: 'Vendors & Contracts',
        title: 'Tracking Vendor COIs, Service Triggers & Contract Caps',
        summary:
          'Manage contractors by their binding obligations rather than scattered phone numbers and buried PDFs.',
        steps: [
          'Open Vendors & Contracts to review automatic compliance flags: Certificates of Insurance expiring within 30 days, approaching contract renewals, missed recurring PM visits, and invoices exceeding contract caps.',
          'Store service triggers directly on the vendor record (for example, snow removal trigger depth, 4-hour response SLA, and approved ice-melt material).',
          'Keep board-only pricing notes and performance ratings private—switching to Vendor Role automatically hides confidential board notes and financial ledgers.',
        ],
        tips: 'Always upload renewed COI expiration dates before releasing a seasonal retainer or approving a new invoice.',
        actionLabel: 'Open Vendors & Contracts',
        onAction: () => setActiveTab('vendors'),
      },
      {
        id: 'financial-controls',
        section: 'Financials & Assessments',
        title: 'Separate Funds, Two-Person Invoice Approvals & Aging Ledgers',
        summary:
          'Enforce Treasurer-grade controls with strict separation between Operating, Reserve, and Special Project funds.',
        steps: [
          'In Assessments & Financials, monitor separate cash balances and click any Operating Budget variance row to inspect the exact invoices driving spend.',
          'Invoices at or above your configured Two-Person Threshold (default $2,500) cannot be marked Paid until two different Board Officers approve them. Test this by switching Acting Role in the top bar (e.g., Treasurer → President).',
          'Track unit assessment aging (Current, 30d, 60d, 90d+, Payment Plan, Legal/Lien) and log payments or dated correction entries without ever deleting historical rows.',
        ],
        tips: 'Export Unit Aging CSV, Vendor Invoices CSV, or the full JSON archive anytime from Financials or Settings for your CPA or annual audit.',
        actionLabel: 'Open Assessments & Financials',
        onAction: () => setActiveTab('financials'),
      },
      {
        id: 'governance-resident-privacy',
        section: 'Governance & Resident Portal',
        title: 'Board Continuity, Decision Memory & Strict Resident Isolation',
        summary:
          'Preserve why past boards voted the way they did while keeping resident self-service completely isolated from internal board records.',
        steps: [
          'Log every formal vote in Governance & Audit with background context, alternatives considered, vote tallies, assigned owner, and follow-up date.',
          'Control exactly which meeting minutes and governing documents appear to unit owners using the Resident Visible toggle.',
          'Switch the top-bar Acting Role to Resident Owner to verify the strict privacy boundary: residents see only their own unit ledger, approved minutes/documents, and maintenance submission form—never other owners’ balances, internal notes, or vendor bids.',
        ],
        tips: 'Use the Board Transition Readiness checklist in Governance & Audit during annual elections so new officers inherit a complete institutional memory.',
        actionLabel: 'Open Governance & Audit',
        onAction: () => setActiveTab('governance'),
      },
    ],
    [setActiveTab, setShowOnboardingWizard, setOpenScannerOnMap]
  );

  const sections = [
    { id: 'All', label: 'All Topics', icon: BookOpen },
    { id: 'Getting Started', label: 'Getting Started', icon: Building2 },
    { id: 'Mobile App & PWA', label: 'Mobile PWA', icon: Smartphone },
    { id: 'Building Map & Scanner', label: 'Map & Camera Scan', icon: Map },
    { id: 'Inspections & Maintenance', label: 'Inspections', icon: ClipboardCheck },
    { id: 'Vendors & Contracts', label: 'Vendors', icon: Users },
    { id: 'Financials & Assessments', label: 'Financials', icon: DollarSign },
    { id: 'Governance & Resident Portal', label: 'Governance', icon: Gavel },
  ];

  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      const matchesSection = selectedSection === 'All' || a.section === selectedSection;
      if (!matchesSection) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.steps.some((s) => s.toLowerCase().includes(q)) ||
        a.tips.toLowerCase().includes(q)
      );
    });
  }, [articles, query, selectedSection]);

  const faqs = [
    {
      id: 'faq-1',
      q: 'Where is my association’s data stored, and how do we back it up?',
      a: 'Workspace records persist locally in your browser storage for instant responsiveness and offline availability. Export a complete JSON archive anytime from Settings & PWA or Governance & Audit to store in your association’s permanent cloud vault or hand off to incoming board officers.',
    },
    {
      id: 'faq-2',
      q: 'Does the Camera Spatial Scanner work without a LiDAR sensor?',
      a: 'Yes. Any standard smartphone rear camera (or desktop webcam / uploaded room photos) works. Providing 2–3 corner views plus an optional ceiling height or wall length lets CondoCore estimate room dimensions and map doors, windows, ladders, stairs, furniture, and equipment.',
    },
    {
      id: 'faq-3',
      q: 'How do I test Two-Person Invoice Approval right now?',
      a: 'Open Assessments & Financials, locate an invoice awaiting 2nd signature (or approve one as Treasurer), then use the Acting Role switcher in the top-right header to switch to Board President. CondoCore enforces that two distinct officers sign off before payment.',
    },
    {
      id: 'faq-4',
      q: 'Can residents see other unit balances, vendor bids, or board notes?',
      a: 'Never. Switching to Resident Owner loads a completely isolated Resident Portal that only exposes that resident’s own assessment ledger, their own submitted maintenance/architectural requests, and minutes/documents explicitly marked Owner Visible by the Secretary.',
    },
    {
      id: 'faq-5',
      q: 'Can I clear the demo building and set up my real condo?',
      a: 'Yes! Click "Launch Building Setup Wizard" at the top of this page or in Settings & PWA. You can create a guided or completely blank workspace for your property in five steps, and you can restore the demo dataset anytime if needed.',
    },
  ];

  return (
    <div className="flex flex-col lg:h-full lg:min-h-0 gap-4">
      {/* Pinned Header + Search & Category Strip */}
      <div className="shrink-0 space-y-3.5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-[#111318] tracking-tight">
              Operations Guide &amp; Help Center
            </h1>
            <p className="text-xs text-[#525866] mt-0.5">
              Step-by-step guides for building setup, floorplan editing, camera scanning, inspections, and financial controls.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowOnboardingWizard(true)}
              className="arch-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
            >
              <Building2 className="w-3.5 h-3.5 text-[#F0C05A]" />
              Building Setup Wizard
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
              Camera Scanner
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="w-3.5 h-3.5 text-[#788090] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guides, workflows, or shortcuts..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-black/[0.09] rounded-xl focus:border-[#1C4ED8] focus:outline-none transition-colors"
            />
          </div>

          <div className="arch-segmented overflow-x-auto">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const active = selectedSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSection(sec.id)}
                  className={`arch-segmented-btn ${active ? 'arch-segmented-btn-active' : ''}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {sec.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Documentation Articles & FAQs */}
      <div className="flex-1 min-h-0 lg:overflow-y-auto space-y-6 pr-0.5 pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredArticles.length === 0 ? (
            <div className="lg:col-span-2 arch-surface rounded-2xl p-8 text-center text-xs text-[#525866]">
              No documentation articles matched &ldquo;{query}&rdquo;. Try clearing your search filter.
            </div>
          ) : (
            filteredArticles.map((article) => (
              <article key={article.id} className="arch-surface-interactive rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-[#1C4ED8]">
                    {article.section}
                  </div>
                  <div>
                    <h2 className="text-base font-display font-bold text-[#111318] leading-snug">
                      {article.title}
                    </h2>
                    <p className="text-xs text-[#525866] mt-1 leading-relaxed">{article.summary}</p>
                  </div>

                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#111318] leading-relaxed pt-1">
                    {article.steps.map((st, idx) => (
                      <li key={idx} className="text-[#374151]">
                        {st}
                      </li>
                    ))}
                  </ol>

                  <div className="p-3.5 bg-[#F8F9FB] border border-black/[0.06] rounded-xl text-xs text-[#525866] leading-relaxed">
                    <strong className="text-[#111318]">Board Tip:</strong> {article.tips}
                  </div>
                </div>

                {article.actionLabel && article.onAction && (
                  <div className="pt-3 border-t border-black/[0.06]">
                    <button
                      type="button"
                      onClick={article.onAction}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1C4ED8] hover:underline"
                    >
                      {article.actionLabel}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        {/* Frequently Asked Questions */}
        <section className="arch-surface rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-[#FAFBFD] border-b border-black/[0.06]">
            <h2 className="text-base font-display font-bold text-[#111318]">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-[#525866] mt-0.5">
              Quick answers on data ownership, floorplan drafting, camera scanning, roles, and board continuity.
            </p>
          </div>

          <div className="divide-y divide-black/[0.06]">
            {faqs.map((faq) => {
              const isOpen = expandedFaq === faq.id;
              return (
                <div key={faq.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : faq.id)}
                    className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#F8FAFF] transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-display font-semibold text-[#111318]">{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#525866] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#525866] shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4 text-xs text-[#525866] leading-relaxed max-w-3xl">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
