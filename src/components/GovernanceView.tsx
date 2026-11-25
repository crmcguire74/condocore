import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Download,
  FileText,
  Gavel,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Square,
  Users,
  X,
} from 'lucide-react';
import { useCondoCore } from '../store/CondoCoreContext';
import { AssociationDocument, GovernanceDecision } from '../types/condocore';
import { downloadCsv, downloadJson, formatCurrency, formatDateShort, TODAY_ISO } from '../utils/exports';
import { HealthText } from './StatusIndicator';
import {
  InteractiveTable,
  sortRows,
  TableColumnDef,
  useInteractiveTable,
} from './InteractiveTable';

type GovTab = 'decisions' | 'documents' | 'board' | 'onboarding' | 'audit';
type DecisionFilter = 'all' | 'open' | 'approved' | 'completed';
type DocVisibilityFilter = 'all' | 'owner' | 'board';

type DecColKey = 'code' | 'title' | 'lead' | 'date' | 'votes' | 'status' | 'action';
type DocColKey = 'title' | 'category' | 'visibility' | 'updatedAt' | 'fileSize' | 'linkedAsset';
type MeetingColKey = 'date' | 'title' | 'access' | 'control';
type BoardColKey = 'director' | 'unit' | 'contact' | 'committees' | 'term';
type ChecklistColKey = 'done' | 'task' | 'category' | 'ownerRole';
type CalendarColKey = 'date' | 'type' | 'milestone';
type AuditColKey = 'timestamp' | 'actor' | 'entity' | 'action';
type BidColKey = 'vendor' | 'notes' | 'amount';

const DECISION_COLUMNS: TableColumnDef<DecColKey>[] = [
  { key: 'code', label: 'Code', widthClass: 'w-[10%]', minWidth: 95 },
  { key: 'title', label: 'Decision & Outcome', widthClass: 'w-[36%]', minWidth: 220 },
  { key: 'lead', label: 'Lead & Follow-Up', widthClass: 'w-[18%]', minWidth: 145 },
  { key: 'date', label: 'Date', widthClass: 'w-[11%]', minWidth: 105 },
  { key: 'votes', label: 'Vote Tally', align: 'center', widthClass: 'w-[10%]', minWidth: 100 },
  { key: 'status', label: 'Status', widthClass: 'w-[9%]', minWidth: 95 },
  { key: 'action', label: 'Record', align: 'right', sortable: false, widthClass: 'w-[6%]', minWidth: 75 },
];

const DOC_COLUMNS: TableColumnDef<DocColKey>[] = [
  { key: 'title', label: 'Document Title & History', widthClass: 'w-[38%]', minWidth: 220 },
  { key: 'category', label: 'Category', widthClass: 'w-[15%]', minWidth: 120 },
  { key: 'visibility', label: 'Visibility', widthClass: 'w-[15%]', minWidth: 125 },
  { key: 'updatedAt', label: 'Last Updated', widthClass: 'w-[12%]', minWidth: 115 },
  { key: 'fileSize', label: 'File Size', align: 'right', widthClass: 'w-[10%]', minWidth: 95 },
  { key: 'linkedAsset', label: 'Linked Asset', align: 'right', widthClass: 'w-[10%]', minWidth: 105 },
];

const MEETING_COLUMNS: TableColumnDef<MeetingColKey>[] = [
  { key: 'date', label: 'Date', widthClass: 'w-[14%]', minWidth: 110 },
  { key: 'title', label: 'Meeting & Summary', widthClass: 'w-[46%]', minWidth: 240 },
  { key: 'access', label: 'Resident Access', widthClass: 'w-[18%]', minWidth: 130 },
  { key: 'control', label: 'Visibility Control', align: 'right', sortable: false, widthClass: 'w-[22%]', minWidth: 150 },
];

const BOARD_COLUMNS: TableColumnDef<BoardColKey>[] = [
  { key: 'director', label: 'Director & Office', widthClass: 'w-[24%]', minWidth: 170 },
  { key: 'unit', label: 'Unit', widthClass: 'w-[10%]', minWidth: 85 },
  { key: 'contact', label: 'Contact', widthClass: 'w-[26%]', minWidth: 175 },
  { key: 'committees', label: 'Committees', widthClass: 'w-[22%]', minWidth: 145 },
  { key: 'term', label: 'Term Dates', align: 'right', widthClass: 'w-[18%]', minWidth: 155 },
];

const CHECKLIST_COLUMNS: TableColumnDef<ChecklistColKey>[] = [
  { key: 'done', label: 'Done', align: 'center', widthClass: 'w-[8%]', minWidth: 70 },
  { key: 'task', label: 'Handoff Task & Notes', widthClass: 'w-[52%]', minWidth: 230 },
  { key: 'category', label: 'Category', widthClass: 'w-[20%]', minWidth: 125 },
  { key: 'ownerRole', label: 'Owner Role', widthClass: 'w-[20%]', minWidth: 125 },
];

const CALENDAR_COLUMNS: TableColumnDef<CalendarColKey>[] = [
  { key: 'date', label: 'Target Date', widthClass: 'w-[20%]', minWidth: 125 },
  { key: 'type', label: 'Requirement Type', widthClass: 'w-[22%]', minWidth: 140 },
  { key: 'milestone', label: 'Milestone / Filing', widthClass: 'w-[58%]', minWidth: 240 },
];

const AUDIT_COLUMNS: TableColumnDef<AuditColKey>[] = [
  { key: 'timestamp', label: 'Timestamp', widthClass: 'w-[18%]', minWidth: 140 },
  { key: 'actor', label: 'Person & Role', widthClass: 'w-[20%]', minWidth: 150 },
  { key: 'entity', label: 'Area & Item', widthClass: 'w-[22%]', minWidth: 165 },
  { key: 'action', label: 'What Changed', widthClass: 'w-[40%]', minWidth: 220 },
];

const BID_COLUMNS: TableColumnDef<BidColKey>[] = [
  { key: 'vendor', label: 'Vendor', minWidth: 130 },
  { key: 'notes', label: 'Proposal Notes', minWidth: 190 },
  { key: 'amount', label: 'Bid Amount', align: 'right', minWidth: 105 },
];

const COMPLIANCE_CALENDAR_ROWS = [
  {
    iso: '2026-12-03',
    dt: 'Dec 3, 2026',
    cat: 'Governance',
    title: 'Regular Board Meeting & 2027 Budget Ratification',
  },
  {
    iso: '2026-12-09',
    dt: 'Dec 9, 2026',
    cat: 'Statutory',
    title: 'Annual Pressure Vessel Boiler Inspection',
  },
  {
    iso: '2026-12-12',
    dt: 'Dec 12, 2026',
    cat: 'Life Safety',
    title: 'Q4 NFPA 25 Fire Sprinkler Flow Test',
  },
  {
    iso: '2027-01-15',
    dt: 'Jan 15, 2027',
    cat: 'State Filing',
    title: 'Annual State Elevator Conveyance Renewal',
  },
  {
    iso: '2027-05-01',
    dt: 'May 1, 2027',
    cat: 'Insurance & Annual',
    title: 'Master Policy Renewal & Annual Owner Meeting',
  },
];

export function GovernanceView() {
  const {
    state,
    canWriteBoard,
    setOpenAssetId,
    addDecision,
    updateDecisionStatus,
    correctDecision,
    toggleMeetingResidentVisibility,
    addDocument,
    toggleTransitionItem,
    updateApprovalThreshold,
    resetWorkspace,
  } = useCondoCore();

  const [govTab, setGovTab] = useState<GovTab>('decisions');

  // Decisions search, filter, and slide-over detail selection
  const [decSearch, setDecSearch] = useState('');
  const [decFilter, setDecFilter] = useState<DecisionFilter>('all');
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);

  // Documents search & filters
  const [docSearch, setDocSearch] = useState('');
  const [docCategory, setDocCategory] = useState('All');
  const [docVisibility, setDocVisibility] = useState<DocVisibilityFilter>('all');

  // Audit search & module filter
  const [auditSearch, setAuditSearch] = useState('');
  const [auditModule, setAuditModule] = useState('All');

  // New Decision Modal
  const [showNewDec, setShowNewDec] = useState(false);
  const [decTitle, setDecTitle] = useState('');
  const [decIssue, setDecIssue] = useState('');
  const [decOptions, setDecOptions] = useState('');
  const [decMotion, setDecMotion] = useState('');
  const [decResp, setDecResp] = useState('Elena Vance (President)');
  const [decFollowUp, setDecFollowUp] = useState('2026-12-15');
  const [decStatus, setDecStatus] = useState<GovernanceDecision['status']>('proposed');

  // Amend Decision Modal (non-destructive)
  const [amendDecId, setAmendDecId] = useState<string | null>(null);
  const [amendReason, setAmendReason] = useState('');
  const [amendFinal, setAmendFinal] = useState('');

  // Upload Document Modal
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCat, setNewDocCat] = useState<AssociationDocument['category']>('Inspection');
  const [newDocVersion, setNewDocVersion] = useState('v1.0');
  const [newDocVisible, setNewDocVisible] = useState(true);
  const [newDocText, setNewDocText] = useState('');

  // Threshold input
  const [thresholdDraft, setThresholdDraft] = useState(
    String(state.settings.twoPersonApprovalThreshold)
  );

  const decisionsTable = useInteractiveTable<DecColKey>(DECISION_COLUMNS);
  const docsTable = useInteractiveTable<DocColKey>(DOC_COLUMNS);
  const meetingsTable = useInteractiveTable<MeetingColKey>(MEETING_COLUMNS);
  const boardTable = useInteractiveTable<BoardColKey>(BOARD_COLUMNS);
  const checklistTable = useInteractiveTable<ChecklistColKey>(CHECKLIST_COLUMNS);
  const calendarTable = useInteractiveTable<CalendarColKey>(CALENDAR_COLUMNS);
  const auditTable = useInteractiveTable<AuditColKey>(AUDIT_COLUMNS);
  const bidsTable = useInteractiveTable<BidColKey>(BID_COLUMNS);

  const filteredDecisions = useMemo(() => {
    const q = decSearch.trim().toLowerCase();
    const rows = state.decisions.filter((d) => {
      if (decFilter === 'open' && d.status !== 'draft' && d.status !== 'proposed') return false;
      if (decFilter === 'approved' && d.status !== 'approved') return false;
      if (decFilter === 'completed' && d.status !== 'completed') return false;
      if (!q) return true;
      return (
        d.code.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.issueSummary.toLowerCase().includes(q) ||
        d.personResponsible.toLowerCase().includes(q)
      );
    });

    return sortRows(rows, decisionsTable.sort, (dec, key) => {
      switch (key) {
        case 'code':
          return dec.code;
        case 'title':
          return dec.title;
        case 'lead':
          return dec.personResponsible;
        case 'date':
          return dec.date;
        case 'votes':
          return dec.voteFor - dec.voteAgainst;
        case 'status':
          return dec.status;
        default:
          return '';
      }
    });
  }, [state.decisions, decSearch, decFilter, decisionsTable.sort]);

  const activeDecision = selectedDecisionId
    ? state.decisions.find((d) => d.id === selectedDecisionId) || null
    : null;

  const sortedActiveBids = useMemo(() => {
    if (!activeDecision) return [];
    return sortRows(activeDecision.vendorBids, bidsTable.sort, (b, key) => {
      switch (key) {
        case 'vendor':
          return b.vendorName;
        case 'notes':
          return b.notes;
        case 'amount':
          return b.amount;
        default:
          return '';
      }
    });
  }, [activeDecision, bidsTable.sort]);

  const filteredDocs = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    const rows = state.documents.filter((d) => {
      if (docCategory !== 'All' && d.category !== docCategory) return false;
      if (docVisibility === 'owner' && !d.ownerVisible) return false;
      if (docVisibility === 'board' && d.ownerVisible) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.searchableText.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
      );
    });

    const parseSizeKb = (sz: string) => {
      const m = sz.match(/([\d.]+)\s*(kb|mb|gb)/i);
      if (!m) return 0;
      const n = parseFloat(m[1]);
      const unit = m[2].toLowerCase();
      return unit === 'gb' ? n * 1024 * 1024 : unit === 'mb' ? n * 1024 : n;
    };

    return sortRows(rows, docsTable.sort, (doc, key) => {
      switch (key) {
        case 'title':
          return doc.title;
        case 'category':
          return doc.category;
        case 'visibility':
          return doc.ownerVisible ? 'Owner Visible' : 'Board Confidential';
        case 'updatedAt':
          return doc.updatedAt;
        case 'fileSize':
          return parseSizeKb(doc.fileSize);
        case 'linkedAsset':
          return doc.linkedAssetId ? 1 : 0;
        default:
          return '';
      }
    });
  }, [state.documents, docCategory, docVisibility, docSearch, docsTable.sort]);

  const sortedMeetings = useMemo(() => {
    return sortRows(state.meetings, meetingsTable.sort, (m, key) => {
      switch (key) {
        case 'date':
          return m.date;
        case 'title':
          return m.title;
        case 'access':
          return m.approvedForResidents ? 'Owner Visible' : 'Board Draft';
        default:
          return '';
      }
    });
  }, [state.meetings, meetingsTable.sort]);

  const sortedBoardMembers = useMemo(() => {
    return sortRows(state.boardMembers, boardTable.sort, (bm, key) => {
      switch (key) {
        case 'director':
          return bm.name;
        case 'unit':
          return bm.unitNumber;
        case 'contact':
          return bm.email;
        case 'committees':
          return bm.committees.join(', ');
        case 'term':
          return bm.termEnd;
        default:
          return '';
      }
    });
  }, [state.boardMembers, boardTable.sort]);

  const sortedChecklist = useMemo(() => {
    return sortRows(state.transitionChecklist, checklistTable.sort, (item, key) => {
      switch (key) {
        case 'done':
          return item.completed ? 1 : 0;
        case 'task':
          return item.title;
        case 'category':
          return item.category;
        case 'ownerRole':
          return item.ownerRole;
        default:
          return '';
      }
    });
  }, [state.transitionChecklist, checklistTable.sort]);

  const sortedCalendar = useMemo(() => {
    return sortRows(COMPLIANCE_CALENDAR_ROWS, calendarTable.sort, (ev, key) => {
      switch (key) {
        case 'date':
          return ev.iso;
        case 'type':
          return ev.cat;
        case 'milestone':
          return ev.title;
        default:
          return '';
      }
    });
  }, [calendarTable.sort]);

  const auditModules = useMemo(() => {
    const set = new Set<string>(['All']);
    state.auditLog.forEach((e) => set.add(e.module));
    return Array.from(set);
  }, [state.auditLog]);

  const filteredAudit = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    const rows = state.auditLog.filter((entry) => {
      if (auditModule !== 'All' && entry.module !== auditModule) return false;
      if (!q) return true;
      return (
        entry.actorName.toLowerCase().includes(q) ||
        entry.entityLabel.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q)
      );
    });

    return sortRows(rows, auditTable.sort, (entry, key) => {
      switch (key) {
        case 'timestamp':
          return entry.timestamp;
        case 'actor':
          return entry.actorName;
        case 'entity':
          return `${entry.entityLabel} ${entry.module}`;
        case 'action':
          return entry.action;
        default:
          return '';
      }
    });
  }, [state.auditLog, auditModule, auditSearch, auditTable.sort]);

  const handleAddDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decTitle.trim() || !decMotion.trim()) return;
    addDecision({
      title: decTitle.trim(),
      date: TODAY_ISO,
      status: decStatus,
      issueSummary: decIssue.trim() || 'Board governance resolution.',
      relevantDocuments: ['Board Packet Reference'],
      optionsConsidered: decOptions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      vendorBids: [],
      motionText: decMotion.trim(),
      voteFor: decStatus === 'approved' ? 4 : 0,
      voteAgainst: 0,
      voteAbstain: 0,
      finalDecision:
        decStatus === 'approved'
          ? 'Approved by board roll-call vote (4-0).'
          : 'Pending formal board vote.',
      personResponsible: decResp.trim(),
      followUpDate: decFollowUp,
    });
    setShowNewDec(false);
    setDecTitle('');
    setDecIssue('');
    setDecOptions('');
    setDecMotion('');
  };

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    addDocument({
      title: newDocTitle.trim(),
      category: newDocCat,
      version: newDocVersion.trim() || 'v1.0',
      ownerVisible: newDocVisible,
      fileSize: '1.2 MB PDF',
      searchableText: `${newDocTitle} ${newDocText}`.toLowerCase(),
    });
    setShowNewDoc(false);
    setNewDocTitle('');
    setNewDocText('');
  };

  const handleExportAuditCsv = () => {
    downloadCsv(
      'alderwood_immutable_audit_log.csv',
      ['Timestamp', 'Actor', 'Role', 'Module', 'Entity', 'Action', 'Details'],
      state.auditLog.map((e) => [
        e.timestamp,
        e.actorName,
        e.actorRole,
        e.module,
        e.entityLabel,
        e.action,
        e.details,
      ])
    );
  };

  const completedChecklist = state.transitionChecklist.filter((i) => i.completed).length;
  const checklistPct =
    state.transitionChecklist.length > 0
      ? Math.round((completedChecklist / state.transitionChecklist.length) * 100)
      : 0;

  return (
    <div className="flex flex-col lg:h-full lg:min-h-0 gap-4">
      {/* PINNED HEADER & CLEAR 5-TAB NAVIGATION */}
      <div className="shrink-0 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-[#111318] tracking-tight">
              Governance &amp; Records
            </h1>
            <p className="text-xs text-[#525866] mt-0.5">
              Review board votes, search association documents, publish meeting minutes, and audit every change.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canWriteBoard && govTab === 'decisions' && (
              <button
                type="button"
                onClick={() => setShowNewDec(true)}
                className="arch-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Record Decision
              </button>
            )}
            {canWriteBoard && govTab === 'documents' && (
              <button
                type="button"
                onClick={() => setShowNewDoc(true)}
                className="arch-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Document
              </button>
            )}
          </div>
        </div>

        <div className="arch-segmented overflow-x-auto">
          <button
            type="button"
            onClick={() => setGovTab('decisions')}
            className={`arch-segmented-btn ${govTab === 'decisions' ? 'arch-segmented-btn-active' : ''}`}
          >
            Decisions &amp; Votes ({state.decisions.length})
          </button>
          <button
            type="button"
            onClick={() => setGovTab('documents')}
            className={`arch-segmented-btn ${govTab === 'documents' ? 'arch-segmented-btn-active' : ''}`}
          >
            Documents ({state.documents.length})
          </button>
          <button
            type="button"
            onClick={() => setGovTab('board')}
            className={`arch-segmented-btn ${govTab === 'board' ? 'arch-segmented-btn-active' : ''}`}
          >
            Meetings &amp; Board
          </button>
          <button
            type="button"
            onClick={() => setGovTab('onboarding')}
            className={`arch-segmented-btn ${govTab === 'onboarding' ? 'arch-segmented-btn-active' : ''}`}
          >
            Onboarding &amp; Calendar
          </button>
          <button
            type="button"
            onClick={() => setGovTab('audit')}
            className={`arch-segmented-btn ${govTab === 'audit' ? 'arch-segmented-btn-active' : ''}`}
          >
            Audit &amp; Controls ({state.auditLog.length})
          </button>
        </div>
      </div>

      {/* TAB 1: DECISIONS & VOTES — MODERN FULL-WIDTH DATA GRID + SLIDE-OVER RECORD */}
      {govTab === 'decisions' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {/* Search + Status Filter Toolbar */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-[#788090] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={decSearch}
                onChange={(e) => setDecSearch(e.target.value)}
                placeholder="Search decisions, motions, or owners..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-black/[0.09] rounded-xl focus:border-[#1C4ED8] focus:outline-none"
              />
            </div>

            <div className="arch-segmented overflow-x-auto">
              {([
                { k: 'all', l: `All (${state.decisions.length})` },
                {
                  k: 'open',
                  l: `Open (${state.decisions.filter((d) => d.status === 'draft' || d.status === 'proposed').length})`,
                },
                {
                  k: 'approved',
                  l: `Approved (${state.decisions.filter((d) => d.status === 'approved').length})`,
                },
                {
                  k: 'completed',
                  l: `Completed (${state.decisions.filter((d) => d.status === 'completed').length})`,
                },
              ] as const).map((f) => (
                <button
                  key={f.k}
                  type="button"
                  onClick={() => setDecFilter(f.k)}
                  className={`arch-segmented-btn ${decFilter === f.k ? 'arch-segmented-btn-active' : ''}`}
                >
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 arch-surface rounded-2xl overflow-auto">
            <InteractiveTable controller={decisionsTable} className="min-w-[940px]">
              <tbody className="text-[13px]">
                {filteredDecisions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#525866]">
                      No board decisions match your current search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredDecisions.map((dec) => {
                    const st =
                      dec.status === 'completed' || dec.status === 'approved' ? 'green' : 'yellow';
                    const isSelected = selectedDecisionId === dec.id;

                    return (
                      <tr
                        key={dec.id}
                        onClick={() => setSelectedDecisionId(dec.id)}
                        className={`cursor-pointer ${isSelected ? 'arch-row-selected' : ''}`}
                      >
                        <td className="font-mono text-xs font-semibold text-[#1C4ED8] whitespace-nowrap">
                          {dec.code}
                        </td>
                        <td>
                          <div className="font-display font-semibold text-[#111318] leading-snug">
                            {dec.title}
                          </div>
                          <div className="text-xs text-[#525866] mt-1 line-clamp-2 leading-relaxed">
                            {dec.finalDecision}
                          </div>
                        </td>
                        <td>
                          <div className="text-xs font-medium text-[#111318]">
                            {dec.personResponsible}
                          </div>
                          <div className="text-xs text-[#6B7280] mt-0.5">
                            Follow-up <span className="font-mono">{formatDateShort(dec.followUpDate)}</span>
                          </div>
                        </td>
                        <td className="font-mono text-xs text-[#525866] whitespace-nowrap">
                          {formatDateShort(dec.date)}
                        </td>
                        <td className="text-center font-mono text-xs tabular-nums whitespace-nowrap">
                          <span className="font-semibold text-[#15803D]">{dec.voteFor}</span>
                          <span className="text-[#9CA3AF] mx-1">-</span>
                          <span className="font-semibold text-[#B91C1C]">{dec.voteAgainst}</span>
                          <span className="text-[#9CA3AF] mx-1">-</span>
                          <span className="text-[#525866]">{dec.voteAbstain}</span>
                        </td>
                        <td>
                          <HealthText
                            status={st}
                            label={dec.status.charAt(0).toUpperCase() + dec.status.slice(1)}
                          />
                        </td>
                        <td className="text-right text-xs font-semibold text-[#1C4ED8] whitespace-nowrap">
                          Open →
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

      {/* TAB 2: SEARCHABLE DOCUMENT LIBRARY DATA GRID */}
      {govTab === 'documents' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {/* Clean Search, Category & Visibility Toolbar */}
          <div className="shrink-0 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-[#788090] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Search document titles or text keywords..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-black/[0.09] rounded-xl focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>

              <div className="arch-segmented overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setDocVisibility('all')}
                  className={`arch-segmented-btn ${
                    docVisibility === 'all' ? 'arch-segmented-btn-active' : ''
                  }`}
                >
                  All Access
                </button>
                <button
                  type="button"
                  onClick={() => setDocVisibility('owner')}
                  className={`arch-segmented-btn ${
                    docVisibility === 'owner' ? 'arch-segmented-btn-active' : ''
                  }`}
                >
                  Owner Visible
                </button>
                <button
                  type="button"
                  onClick={() => setDocVisibility('board')}
                  className={`arch-segmented-btn ${
                    docVisibility === 'board' ? 'arch-segmented-btn-active' : ''
                  }`}
                >
                  Board Only
                </button>
              </div>
            </div>

            <div className="arch-segmented overflow-x-auto w-fit">
              {[
                'All',
                'Governing',
                'Reserve Study',
                'Insurance',
                'Inspection',
                'Financial',
                'Rules & Policies',
              ].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDocCategory(cat)}
                  className={`arch-segmented-btn ${docCategory === cat ? 'arch-segmented-btn-active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 arch-surface rounded-2xl overflow-auto">
            <InteractiveTable controller={docsTable} className="min-w-[880px]">
              <tbody className="text-[13px]">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[#525866]">
                      No indexed documents match your search or category filter.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#EEF3FF] text-[#1C4ED8] flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-display font-semibold text-[#111318] leading-snug">
                              {doc.title}{' '}
                              <span className="font-mono text-xs font-medium text-[#1C4ED8] ml-1.5">
                                {doc.version}
                              </span>
                            </div>
                            {doc.previousVersions.length > 0 && (
                              <div className="text-xs text-[#6B7280] mt-1">
                                Prior versions:{' '}
                                {doc.previousVersions
                                  .map((pv) => `${pv.version} (${pv.date})`)
                                  .join(' · ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-xs font-medium text-[#374151] whitespace-nowrap">
                        {doc.category}
                      </td>
                      <td className="whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold ${
                            doc.ownerVisible ? 'text-[#15803D]' : 'text-[#B45309]'
                          }`}
                        >
                          {doc.ownerVisible ? 'Owner Visible' : 'Board Confidential'}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-[#525866] whitespace-nowrap">
                        {formatDateShort(doc.updatedAt)}
                      </td>
                      <td className="text-right font-mono text-xs text-[#525866] whitespace-nowrap">
                        {doc.fileSize}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {doc.linkedAssetId ? (
                          <button
                            type="button"
                            onClick={() => setOpenAssetId(doc.linkedAssetId!)}
                            className="text-xs font-semibold text-[#1C4ED8] hover:underline cursor-pointer"
                          >
                            View Pin →
                          </button>
                        ) : (
                          <span className="text-xs text-[#9CA3AF]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </InteractiveTable>
          </div>
        </div>
      )}

      {/* TAB 3: MEETINGS & BOARD DIRECTORY (MODERN ZEBRA-STRIPED TABLES) */}
      {govTab === 'board' && (
        <div className="flex-1 min-h-0 lg:overflow-y-auto space-y-6 pr-0.5 pb-4">
          {/* Meetings & Minutes Grid */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-bold text-[#111318]">
                Meeting Agendas &amp; Minutes
              </h2>
              <span className="text-xs text-[#525866]">
                Control which approved minutes appear in the Resident Portal
              </span>
            </div>

            <div className="arch-surface rounded-2xl overflow-auto">
              <InteractiveTable controller={meetingsTable} className="min-w-[820px]">
                <tbody className="text-[13px]">
                  {sortedMeetings.map((m) => (
                    <tr key={m.id}>
                      <td className="font-mono text-xs font-medium text-[#525866] whitespace-nowrap align-top">
                        {formatDateShort(m.date)}
                      </td>
                      <td>
                        <div className="font-display font-semibold text-[#111318]">{m.title}</div>
                        <p className="text-xs text-[#374151] mt-1 leading-relaxed">{m.minutesSummary}</p>
                        <div className="text-xs text-[#6B7280] mt-1.5">
                          <span className="font-medium text-[#525866]">Agenda:</span>{' '}
                          {m.agendaItems.join(' · ')}
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <HealthText
                          status={m.approvedForResidents ? 'green' : 'yellow'}
                          label={m.approvedForResidents ? 'Owner Visible' : 'Board Draft'}
                        />
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {canWriteBoard ? (
                          <button
                            type="button"
                            onClick={() => toggleMeetingResidentVisibility(m.id)}
                            className="arch-btn-secondary px-3 py-1.5 text-xs font-medium cursor-pointer"
                          >
                            {m.approvedForResidents ? 'Make Private' : 'Share with Owners'}
                          </button>
                        ) : (
                          <span className="text-xs text-[#6B7280]">Read-only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </InteractiveTable>
            </div>
          </section>

          {/* Board of Directors Roster Grid */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1C4ED8]" />
              <h2 className="text-base font-display font-bold text-[#111318]">
                Current Board of Directors
              </h2>
            </div>

            <div className="arch-surface rounded-2xl overflow-auto">
              <InteractiveTable controller={boardTable} className="min-w-[780px]">
                <tbody className="text-[13px]">
                  {sortedBoardMembers.map((bm) => (
                    <tr key={bm.id}>
                      <td>
                        <div className="font-display font-semibold text-[#111318]">{bm.name}</div>
                        <div className="text-xs font-medium text-[#1C4ED8] mt-0.5">{bm.title}</div>
                      </td>
                      <td className="font-mono text-xs font-semibold text-[#111318] whitespace-nowrap">
                        Unit {bm.unitNumber}
                      </td>
                      <td>
                        <div className="text-xs text-[#374151]">{bm.email}</div>
                        <div className="font-mono text-xs text-[#6B7280] mt-0.5">{bm.phone}</div>
                      </td>
                      <td className="text-xs text-[#525866]">{bm.committees.join(', ')}</td>
                      <td className="text-right font-mono text-xs text-[#525866] whitespace-nowrap">
                        {formatDateShort(bm.termStart)} – {formatDateShort(bm.termEnd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </InteractiveTable>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: DIRECTOR ONBOARDING & ANNUAL GOVERNANCE CALENDAR */}
      {govTab === 'onboarding' && (
        <div className="flex-1 min-h-0 lg:overflow-y-auto space-y-6 pr-0.5 pb-4">
          {/* New Director Transition Checklist */}
          <section className="arch-surface rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-display font-bold text-[#111318]">
                  Board Transition &amp; Onboarding Checklist
                </h2>
                <p className="text-xs text-[#525866] mt-0.5">
                  Step-by-step handoff tasks so incoming officers never lose critical accounts or building records.
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-[#1C4ED8] shrink-0">
                {completedChecklist}/{state.transitionChecklist.length} ({checklistPct}%)
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-[#E8ECF2] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1C4ED8] transition-all"
                style={{ width: `${checklistPct}%` }}
              />
            </div>

            <div className="border border-black/[0.08] rounded-xl overflow-auto">
              <InteractiveTable controller={checklistTable} compact className="min-w-[700px]">
                <tbody className="text-xs">
                  {sortedChecklist.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        if (canWriteBoard) toggleTransitionItem(item.id);
                      }}
                      className={canWriteBoard ? 'cursor-pointer' : ''}
                    >
                      <td className="text-center">
                        {item.completed ? (
                          <CheckSquare className="w-4 h-4 text-[#15803D] mx-auto" />
                        ) : (
                          <Square className="w-4 h-4 text-[#788090] mx-auto" />
                        )}
                      </td>
                      <td>
                        <div
                          className={`text-[13px] ${
                            item.completed
                              ? 'line-through text-[#788090]'
                              : 'font-medium text-[#111318]'
                          }`}
                        >
                          {item.title}
                        </div>
                        <div className="text-xs text-[#6B7280] mt-0.5">{item.notes}</div>
                      </td>
                      <td className="font-medium text-[#374151] whitespace-nowrap">{item.category}</td>
                      <td className="text-[#525866] whitespace-nowrap">{item.ownerRole}</td>
                    </tr>
                  ))}
                </tbody>
              </InteractiveTable>
            </div>
          </section>

          {/* Annual Governance Calendar Grid */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1C4ED8]" />
              <h2 className="text-base font-display font-bold text-[#111318]">
                Annual Compliance Calendar
              </h2>
            </div>

            <div className="arch-surface rounded-2xl overflow-auto">
              <InteractiveTable controller={calendarTable} className="min-w-[640px]">
                <tbody className="text-[13px]">
                  {sortedCalendar.map((ev) => (
                    <tr key={ev.title}>
                      <td className="font-mono text-xs font-semibold text-[#111318] whitespace-nowrap">
                        {ev.dt}
                      </td>
                      <td className="text-xs font-semibold text-[#1C4ED8] whitespace-nowrap">
                        {ev.cat}
                      </td>
                      <td className="font-medium text-[#111318]">{ev.title}</td>
                    </tr>
                  ))}
                </tbody>
              </InteractiveTable>
            </div>
          </section>
        </div>
      )}

      {/* TAB 5: AUDIT LOG & WORKSPACE CONTROLS */}
      {govTab === 'audit' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3.5">
          {/* Compact Controls Strip */}
          <div className="shrink-0 arch-surface rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-display font-bold text-[#111318]">
                <Shield className="w-4 h-4 text-[#1C4ED8]" />
                Dual-Approval Threshold:
              </span>
              {canWriteBoard ? (
                <div className="inline-flex items-center gap-2">
                  <input
                    type="number"
                    min={500}
                    step={250}
                    value={thresholdDraft}
                    onChange={(e) => setThresholdDraft(e.target.value)}
                    className="w-24 px-2.5 py-1.5 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = Number(thresholdDraft);
                      if (v >= 100) updateApprovalThreshold(v);
                    }}
                    className="arch-btn-primary px-3 py-1.5 font-semibold"
                  >
                    Save Rule
                  </button>
                </div>
              ) : (
                <span className="font-mono font-semibold text-[#111318]">
                  {formatCurrency(state.settings.twoPersonApprovalThreshold)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadJson('alderwood_condocore_full_backup.json', state)}
                className="arch-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 font-medium"
              >
                <Download className="w-3.5 h-3.5 text-[#525866]" />
                Full Backup JSON
              </button>
              <button
                type="button"
                onClick={handleExportAuditCsv}
                className="arch-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 font-medium"
              >
                <Download className="w-3.5 h-3.5 text-[#525866]" />
                Audit CSV
              </button>
              <button
                type="button"
                onClick={resetWorkspace}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium bg-white border border-[#FECACA] text-[#B91C1C] rounded-xl hover:bg-[#FEF2F2] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Demo
              </button>
            </div>
          </div>

          {/* Search & Module Filter */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-[#788090] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit log by person, item, or action..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-black/[0.09] rounded-xl focus:border-[#1C4ED8] focus:outline-none"
              />
            </div>

            <div className="arch-segmented overflow-x-auto">
              {auditModules.slice(0, 6).map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setAuditModule(mod)}
                  className={`arch-segmented-btn ${auditModule === mod ? 'arch-segmented-btn-active' : ''}`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Audit Trail Data Grid */}
          <div className="flex-1 min-h-0 arch-surface rounded-2xl overflow-auto">
            <InteractiveTable controller={auditTable} className="min-w-[840px]">
              <tbody className="text-[13px]">
                {filteredAudit.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-xs text-[#525866]">
                      No audit records match your search.
                    </td>
                  </tr>
                ) : (
                  filteredAudit.map((entry) => (
                    <tr key={entry.id}>
                      <td className="font-mono text-xs tabular-nums text-[#525866] whitespace-nowrap">
                        {entry.timestamp}
                      </td>
                      <td>
                        <div className="font-medium text-[#111318] text-xs">{entry.actorName}</div>
                        <div className="text-xs text-[#6B7280] capitalize mt-0.5">
                          {entry.actorRole.replace('_', ' ')}
                        </div>
                      </td>
                      <td>
                        <div className="font-mono text-xs text-[#1C4ED8] font-semibold">
                          {entry.entityLabel}
                        </div>
                        <div className="text-xs text-[#6B7280] mt-0.5">{entry.module}</div>
                      </td>
                      <td>
                        <div className="font-medium text-[#111318] text-xs">{entry.action}</div>
                        <div className="text-xs text-[#525866] mt-0.5 leading-relaxed">
                          {entry.details}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </InteractiveTable>
          </div>
        </div>
      )}

      {/* SLIDE-OVER DECISION DETAIL DRAWER */}
      {activeDecision && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#111318]/45 backdrop-blur-xs"
          onClick={() => setSelectedDecisionId(null)}
        >
          <article
            className="w-full max-w-2xl bg-white h-full flex flex-col border-l border-black/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pinned Drawer Header */}
            <div className="shrink-0 px-6 py-5 border-b border-black/[0.06] bg-white flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#525866]">
                  <span className="font-mono font-semibold text-[#1C4ED8]">{activeDecision.code}</span>
                  <span>·</span>
                  <span className="font-mono">{formatDateShort(activeDecision.date)}</span>
                  <span>·</span>
                  <HealthText
                    status={
                      activeDecision.status === 'completed' || activeDecision.status === 'approved'
                        ? 'green'
                        : 'yellow'
                    }
                    label={activeDecision.status.charAt(0).toUpperCase() + activeDecision.status.slice(1)}
                  />
                </div>
                <h2 className="text-lg sm:text-xl font-display font-bold text-[#111318] tracking-tight">
                  {activeDecision.title}
                </h2>
                <div className="text-xs text-[#525866]">
                  Lead: <strong className="text-[#111318]">{activeDecision.personResponsible}</strong> · Follow-up:{' '}
                  <span className="font-mono">{formatDateShort(activeDecision.followUpDate)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDecisionId(null)}
                className="p-1.5 text-[#525866] hover:text-[#111318] rounded-lg hover:bg-black/[0.04] shrink-0"
                aria-label="Close decision record"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
              {/* Motion & Vote Summary */}
              <div className="p-5 bg-[#FAFBFD] border border-black/[0.07] rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-display font-bold text-[#111318] inline-flex items-center gap-1.5">
                    <Gavel className="w-4 h-4 text-[#1C4ED8]" />
                    Formal Motion &amp; Vote Outcome
                  </div>
                  <div className="font-mono text-xs tabular-nums text-[#374151]">
                    <strong className="text-[#15803D]">{activeDecision.voteFor} For</strong> ·{' '}
                    <strong className="text-[#B91C1C]">{activeDecision.voteAgainst} Against</strong> ·{' '}
                    <span>{activeDecision.voteAbstain} Abstain</span>
                  </div>
                </div>
                <p className="text-sm text-[#111318] italic leading-relaxed">
                  &ldquo;{activeDecision.motionText}&rdquo;
                </p>
                <div className="text-xs font-medium text-[#374151] pt-2 border-t border-black/[0.06]">
                  Outcome: {activeDecision.finalDecision}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-display font-bold text-[#111318] mb-1.5">
                  Background &amp; Context
                </h3>
                <p className="text-sm text-[#374151] leading-relaxed">
                  {activeDecision.issueSummary}
                </p>
              </div>

              {activeDecision.optionsConsidered.length > 0 && (
                <div className="pt-4 border-t border-black/[0.06]">
                  <h3 className="text-sm font-display font-bold text-[#111318] mb-2">
                    Options Considered
                  </h3>
                  <ul className="list-disc pl-5 text-xs sm:text-sm text-[#374151] space-y-1.5">
                    {activeDecision.optionsConsidered.map((opt, idx) => (
                      <li key={idx}>{opt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activeDecision.vendorBids.length > 0 && (
                <div className="pt-4 border-t border-black/[0.06] space-y-2.5">
                  <h3 className="text-sm font-display font-bold text-[#111318]">
                    Vendor Bids Evaluated
                  </h3>
                  <div className="border border-black/[0.08] rounded-xl overflow-auto">
                    <InteractiveTable controller={bidsTable} compact>
                      <tbody className="text-xs">
                        {sortedActiveBids.map((b, i) => (
                          <tr key={i}>
                            <td className="font-semibold text-[#111318] whitespace-nowrap">
                              {b.vendorName}
                            </td>
                            <td className="text-[#525866]">{b.notes}</td>
                            <td className="text-right font-mono font-semibold tabular-nums text-[#111318] whitespace-nowrap">
                              {formatCurrency(b.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </InteractiveTable>
                  </div>
                </div>
              )}

              {activeDecision.relevantDocuments.length > 0 && (
                <div className="pt-4 border-t border-black/[0.06] text-xs text-[#525866]">
                  <span className="font-display font-semibold text-[#111318]">
                    Referenced Documents:
                  </span>{' '}
                  {activeDecision.relevantDocuments.join(' · ')}
                </div>
              )}

              {activeDecision.correctionHistory && activeDecision.correctionHistory.length > 0 && (
                <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-xs text-[#92400E] space-y-1">
                  <div className="font-semibold">Recorded Amendments</div>
                  {activeDecision.correctionHistory.map((c, idx) => (
                    <div key={idx}>
                      <span className="font-mono">{c.date}</span> · {c.actor}: {c.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pinned Drawer Footer */}
            <div className="shrink-0 px-6 py-4 bg-[#FAFBFD] border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                {activeDecision.linkedAssetId && (
                  <button
                    type="button"
                    onClick={() => {
                      const aid = activeDecision.linkedAssetId!;
                      setSelectedDecisionId(null);
                      setOpenAssetId(aid);
                    }}
                    className="font-semibold text-[#1C4ED8] hover:underline cursor-pointer"
                  >
                    Inspect Linked Building Asset →
                  </button>
                )}
              </div>

              {canWriteBoard && (
                <div className="flex flex-wrap items-center gap-2">
                  {(activeDecision.status === 'draft' || activeDecision.status === 'proposed') && (
                    <button
                      type="button"
                      onClick={() =>
                        updateDecisionStatus(activeDecision.id, 'approved', {
                          voteFor: 4,
                          voteAgainst: 0,
                          voteAbstain: 0,
                          finalDecision: `Approved unanimously (4-0) on ${TODAY_ISO}.`,
                        })
                      }
                      className="arch-btn-primary px-3.5 py-2 font-semibold"
                    >
                      Record 4-0 Approval
                    </button>
                  )}
                  {activeDecision.status === 'approved' && (
                    <button
                      type="button"
                      onClick={() => updateDecisionStatus(activeDecision.id, 'completed')}
                      className="px-3.5 py-2 font-semibold bg-[#15803D] text-white rounded-xl hover:bg-[#166534] transition-colors cursor-pointer"
                    >
                      Mark Completed
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAmendDecId(activeDecision.id);
                      setAmendReason('');
                      setAmendFinal(activeDecision.finalDecision);
                    }}
                    className="arch-btn-secondary px-3 py-2 font-medium"
                  >
                    Amend with Reason
                  </button>
                </div>
              )}
            </div>
          </article>
        </div>
      )}

      {/* Modal: Record Decision */}
      {showNewDec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111318]/45 backdrop-blur-xs p-4">
          <form
            onSubmit={handleAddDecision}
            className="w-full max-w-lg bg-white border border-black/[0.08] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <h3 className="text-base font-display font-bold text-[#111318]">
                Record Board Decision
              </h3>
              <button
                type="button"
                onClick={() => setShowNewDec(false)}
                className="p-1.5 text-[#525866] hover:text-[#111318] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#111318] mb-1">Decision Title</label>
                <input
                  required
                  value={decTitle}
                  onChange={(e) => setDecTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Background &amp; Context</label>
                <textarea
                  rows={2}
                  required
                  value={decIssue}
                  onChange={(e) => setDecIssue(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">
                  Options Considered (one per line)
                </label>
                <textarea
                  rows={2}
                  value={decOptions}
                  onChange={(e) => setDecOptions(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Formal Motion Text</label>
                <textarea
                  rows={2}
                  required
                  value={decMotion}
                  onChange={(e) => setDecMotion(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Stage</label>
                  <select
                    value={decStatus}
                    onChange={(e) => setDecStatus(e.target.value as GovernanceDecision['status'])}
                    className="w-full px-2.5 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="proposed">Proposed</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Person Responsible</label>
                  <input
                    value={decResp}
                    onChange={(e) => setDecResp(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Follow-Up Date</label>
                  <input
                    type="date"
                    value={decFollowUp}
                    onChange={(e) => setDecFollowUp(e.target.value)}
                    className="w-full px-2.5 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#FAFBFD] border-t border-black/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewDec(false)}
                className="arch-btn-secondary px-3.5 py-2 text-xs font-medium"
              >
                Cancel
              </button>
              <button type="submit" className="arch-btn-primary px-4 py-2 text-xs font-semibold">
                Save Decision
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Non-Destructive Decision Amendment */}
      {amendDecId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111318]/45 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl shadow-2xl p-6 space-y-3.5 text-xs">
            <div className="font-display text-base font-bold text-[#111318]">
              Amend Decision Record
            </div>
            <p className="text-[#525866] leading-relaxed">
              Original records are preserved permanently. Enter a reason and updated outcome below.
            </p>
            <input
              type="text"
              value={amendReason}
              onChange={(e) => setAmendReason(e.target.value)}
              placeholder="Mandatory reason for amendment..."
              className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
            />
            <textarea
              rows={2}
              value={amendFinal}
              onChange={(e) => setAmendFinal(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAmendDecId(null)}
                className="arch-btn-secondary px-3.5 py-2 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!amendReason.trim()}
                onClick={() => {
                  correctDecision(amendDecId, amendReason.trim(), amendFinal.trim());
                  setAmendDecId(null);
                }}
                className="arch-btn-primary px-4 py-2 font-semibold disabled:opacity-40"
              >
                Save Amendment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Document */}
      {showNewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111318]/45 backdrop-blur-xs p-4">
          <form
            onSubmit={handleAddDoc}
            className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-[#111318]">Add Document</h3>
              <button
                type="button"
                onClick={() => setShowNewDoc(false)}
                className="p-1.5 text-[#525866] hover:text-[#111318] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#111318] mb-1">Document Title</label>
                <input
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Category</label>
                  <select
                    value={newDocCat}
                    onChange={(e) => setNewDocCat(e.target.value as AssociationDocument['category'])}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  >
                    <option value="Governing">Governing</option>
                    <option value="Financial">Financial</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Reserve Study">Reserve Study</option>
                    <option value="Rules & Policies">Rules &amp; Policies</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Version</label>
                  <input
                    value={newDocVersion}
                    onChange={(e) => setNewDocVersion(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-[#111318] mb-1">Search Keywords</label>
                <textarea
                  rows={2}
                  value={newDocText}
                  onChange={(e) => setNewDocText(e.target.value)}
                  placeholder="Key clauses, asset codes, or dates for search..."
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-[#111318]">
                <input
                  type="checkbox"
                  checked={newDocVisible}
                  onChange={(e) => setNewDocVisible(e.target.checked)}
                  className="rounded"
                />
                Visible to Unit Owners in Resident Portal
              </label>
            </div>
            <div className="px-6 py-4 bg-[#FAFBFD] border-t border-black/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewDoc(false)}
                className="arch-btn-secondary px-3.5 py-2 text-xs font-medium"
              >
                Cancel
              </button>
              <button type="submit" className="arch-btn-primary px-4 py-2 text-xs font-semibold">
                Save Document
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
