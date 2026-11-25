import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActiveActor,
  ArchitecturalRequest,
  AssetCategory,
  AssetDocumentRef,
  AssetPhoto,
  AssociationDocument,
  AssociationSettings,
  BoardNavTab,
  BuildingAsset,
  ChecklistResult,
  CondoCoreState,
  DelinquencyStage,
  DraftElementKind,
  FloorPlan,
  FloorPlanElement,
  FundType,
  GovernanceDecision,
  HealthStatus,
  InspectionRecord,
  InspectionTemplateType,
  Invoice,
  IssueClassification,
  IssueWorkOrder,
  OnboardingWizardConfig,
  PlanVersion,
  ScannedObjectType,
  ScannedSpace,
  SpecialAssessment,
  UnitRecord,
  UserRole,
  Vendor,
  WorkOrderStatus,
} from '../types/condocore';
import { INITIAL_SEED_STATE, INSPECTION_TEMPLATES, ROLE_ACTORS } from '../data/seedData';
import { getEditableElementsForBuiltInKey } from '../data/floorplanStencils';
import { daysUntil, nowTimestamp, TODAY_ISO } from '../utils/exports';

const STORAGE_KEY = 'condocore_workspace_v1';

const EDITABLE_DEMO_PLAN_KEYS = new Set([
  'roof',
  'mechanical',
  'typical_floor',
  'ground_lobby',
  'garage',
]);

function normalizeWorkspaceState(ws: CondoCoreState): CondoCoreState {
  if (!Array.isArray(ws.floorPlans)) return ws;
  let changed = false;
  const floorPlans = ws.floorPlans.map((p) => {
    if (p.draftElements !== undefined) return p;
    const activeVer = p.versions.find((v) => v.id === p.activeVersionId) || p.versions[0];
    if (
      activeVer &&
      !activeVer.uploadedImageUrl &&
      activeVer.builtInKey &&
      EDITABLE_DEMO_PLAN_KEYS.has(activeVer.builtInKey)
    ) {
      changed = true;
      return {
        ...p,
        draftScalePxPerFoot: p.draftScalePxPerFoot ?? 10,
        draftElements: getEditableElementsForBuiltInKey(activeVer.builtInKey),
      };
    }
    return p;
  });
  return changed ? { ...ws, floorPlans } : ws;
}

export interface ToastMessage {
  id: string;
  title: string;
  detail?: string;
  tone: 'neutral' | 'success' | 'warning' | 'error';
}

export interface VendorComplianceFlags {
  coiExpiringSoon: boolean;
  coiDaysLeft: number;
  contractExpiringSoon: boolean;
  contractDaysLeft: number;
  missedServices: boolean;
  overContractCap: boolean;
  totalInvoiced: number;
  unresolvedIssuesCount: number;
  hasAnyFlag: boolean;
}

interface CondoCoreContextValue {
  state: CondoCoreState;
  activeRole: UserRole;
  actor: ActiveActor;
  setActiveRole: (role: UserRole) => void;
  activeTab: BoardNavTab;
  setActiveTab: (tab: BoardNavTab) => void;
  selectedPlanId: string;
  setSelectedPlanId: (planId: string) => void;
  openAssetId: string | null;
  setOpenAssetId: (assetId: string | null) => void;
  openWorkOrderId: string | null;
  setOpenWorkOrderId: (workOrderId: string | null) => void;
  openVendorId: string | null;
  setOpenVendorId: (vendorId: string | null) => void;
  showOnboardingWizard: boolean;
  setShowOnboardingWizard: (show: boolean) => void;
  openScannerOnMap: boolean;
  setOpenScannerOnMap: (open: boolean) => void;
  toasts: ToastMessage[];
  pushToast: (title: string, detail?: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;

  // Derived helpers
  getAssetCumulativeSpend: (assetId: string) => number;
  getVendorFlags: (vendor: Vendor) => VendorComplianceFlags;
  getFundBalances: () => { operating: number; reserve: number; special_project: number };
  getBudgetActual: (category: string, fund: FundType) => { actual: number; invoices: Invoice[] };
  canWriteBoard: boolean;
  isBoardOfficer: boolean;

  // Floorplans & Assets
  selectPlanVersion: (planId: string, versionId: string) => void;
  uploadFloorPlan: (params: {
    targetPlanId: string | 'new';
    newPlanName?: string;
    newLevelCode?: string;
    areaDescription?: string;
    versionLabel: string;
    notes: string;
    imageUrl: string;
    scaleFeetPer10Pct: number;
    calibrationLabel: string;
  }) => void;
  addAssetPin: (asset: Omit<BuildingAsset, 'id' | 'code' | 'photos' | 'attachments' | 'historicalSpendBeforeSystem'>) => void;
  updateAssetCondition: (assetId: string, condition: HealthStatus, note?: string) => void;
  attachAssetPhoto: (assetId: string, photo: Omit<AssetPhoto, 'id' | 'date' | 'uploadedBy'>) => void;
  attachAssetDocument: (assetId: string, doc: Omit<AssetDocumentRef, 'id' | 'date'>) => void;
  addScannedSpaceToPlan: (planId: string, space: Omit<ScannedSpace, 'id' | 'scannedAt'>) => void;
  createPlanFromScannedSpaces: (params: {
    planName: string;
    levelCode: string;
    areaDescription: string;
    spaces: Omit<ScannedSpace, 'id' | 'scannedAt'>[];
  }) => string;
  promoteScannedObjectToAsset: (planId: string, spaceId: string, objectId: string) => string | null;
  savePlanDraftElements: (
    planId: string,
    elements: FloorPlanElement[],
    options?: { scalePxPerFoot?: number; underlayOpacity?: number; revisionNote?: string }
  ) => void;
  createBlankManualPlan: (params: {
    planName: string;
    levelCode: string;
    areaDescription: string;
    scalePxPerFoot?: number;
    initialElements?: FloorPlanElement[];
  }) => string;
  promoteDraftElementToAsset: (planId: string, elementId: string) => string | null;

  // Inspections
  createInspectionFromTemplate: (params: {
    templateType: InspectionTemplateType;
    assetId: string;
    vendorId?: string;
    scheduledDate: string;
    dueDate: string;
    inspectorName: string;
  }) => string;
  updateInspectionChecklistItem: (
    inspectionId: string,
    itemId: string,
    patch: {
      result?: ChecklistResult;
      measurement?: string;
      recommendedAction?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      estimatedCost?: number;
      photoUrl?: string;
    }
  ) => void;
  completeInspection: (inspectionId: string, summary: string, reportTitle?: string) => void;
  escalateChecklistItemToWorkOrder: (inspectionId: string, itemId: string) => string | null;

  // Work Orders & Resident Requests
  createWorkOrder: (params: {
    title: string;
    description: string;
    assetId?: string;
    planId: string;
    x: number;
    y: number;
    category: AssetCategory;
    source: 'resident' | 'inspection' | 'board';
    reportedByUnit?: string;
    preferredContact?: string;
    permissionToEnter?: boolean;
    urgency: IssueWorkOrder['urgency'];
    classification?: IssueClassification;
    vendorId?: string;
    estimatedCost?: number;
    photoUrl?: string;
    photoCaption?: string;
  }) => string;
  updateWorkOrder: (
    workOrderId: string,
    patch: Partial<Pick<IssueWorkOrder, 'classification' | 'status' | 'vendorId' | 'vendorFindings' | 'estimatedCost' | 'dueDate' | 'unreadByBoard'>>
  ) => void;
  addWorkOrderNote: (workOrderId: string, text: string, internalOnly?: boolean) => void;
  submitVendorInvoiceForWorkOrder: (workOrderId: string, params: {
    invoiceNumber: string;
    amount: number;
    fund: FundType;
    budgetCategory: string;
    findings: string;
  }) => void;
  recordWorkOrderResolutionAndClose: (workOrderId: string, params: {
    type: 'photo' | 'inspection';
    reference: string;
    photoUrl?: string;
  }) => void;

  // Vendors
  addVendor: (vendor: Omit<Vendor, 'id' | 'missedServicesCount'>) => void;
  updateVendorCompliance: (vendorId: string, patch: Partial<Vendor>) => void;

  // Financials & Assessments
  recordUnitPayment: (unitId: string, amount: number, method: 'ACH' | 'Card' | 'Check', description?: string) => void;
  recordUnitCorrection: (unitId: string, principalDelta: number, lateFeeDelta: number, reason: string) => void;
  updateUnitDelinquency: (unitId: string, stage: DelinquencyStage, paymentPlanNote?: string) => void;
  addSpecialAssessment: (sa: Omit<SpecialAssessment, 'id'>) => void;
  approveSpecialAssessment: (saId: string) => void;
  createInvoice: (inv: Omit<Invoice, 'id' | 'approvals' | 'bankReconciled'>) => void;
  advanceInvoiceStatus: (invoiceId: string, action: 'submit' | 'approve' | 'reject' | 'pay', note?: string) => { ok: boolean; message: string };
  toggleInvoiceReconciled: (invoiceId: string) => void;
  correctInvoiceNote: (invoiceId: string, reason: string) => void;

  // Governance & Docs
  addDecision: (dec: Omit<GovernanceDecision, 'id' | 'code'>) => void;
  updateDecisionStatus: (
    decisionId: string,
    status: GovernanceDecision['status'],
    votes?: { voteFor: number; voteAgainst: number; voteAbstain: number; finalDecision: string }
  ) => void;
  correctDecision: (decisionId: string, reason: string, updatedFinalDecision: string) => void;
  toggleMeetingResidentVisibility: (meetingId: string) => void;
  addDocument: (doc: Omit<AssociationDocument, 'id' | 'updatedAt' | 'previousVersions'>) => void;
  toggleTransitionItem: (itemId: string) => void;
  updateApprovalThreshold: (threshold: number) => void;
  updateAssociationSettings: (patch: Partial<AssociationSettings>) => void;
  initializeWorkspaceFromWizard: (config: OnboardingWizardConfig) => void;
  importWorkspaceJson: (jsonString: string) => { ok: boolean; message: string };
  submitArchitecturalRequest: (req: Omit<ArchitecturalRequest, 'id' | 'submittedDate' | 'status'>) => void;
  resetWorkspace: () => void;
}

const CondoCoreContext = createContext<CondoCoreContextValue | null>(null);

export function CondoCoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CondoCoreState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CondoCoreState;
        if (parsed && parsed.settings && Array.isArray(parsed.assets) && Array.isArray(parsed.units)) {
          return normalizeWorkspaceState(parsed);
        }
      }
    } catch {
      // Fall back to seed state if storage corrupted
    }
    return INITIAL_SEED_STATE;
  });

  const [activeRole, setActiveRoleState] = useState<UserRole>('president');
  const [activeTab, setActiveTab] = useState<BoardNavTab>('today');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan-roof');
  const [openAssetId, setOpenAssetId] = useState<string | null>(null);
  const [openWorkOrderId, setOpenWorkOrderId] = useState<string | null>(null);
  const [openVendorId, setOpenVendorId] = useState<string | null>(null);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [openScannerOnMap, setOpenScannerOnMap] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota issues for large custom uploads
    }
  }, [state]);

  const resolveActorForRole = (role: UserRole, currentState: CondoCoreState): ActiveActor => {
    const base = ROLE_ACTORS[role];
    if (role === 'president' || role === 'treasurer' || role === 'secretary' || role === 'board_member') {
      const bm = currentState.boardMembers.find((m) => m.role === role);
      if (bm) {
        return {
          role,
          name: bm.name,
          title: bm.title,
          unitNumber: bm.unitNumber,
        };
      }
    }
    if (role === 'resident') {
      const unit402 = currentState.units.find((u) => u.unitNumber === '402') || currentState.units[0];
      if (unit402) {
        return {
          role: 'resident',
          name: unit402.ownerName,
          title: `Resident Owner (Unit ${unit402.unitNumber})`,
          unitNumber: unit402.unitNumber,
        };
      }
    }
    if (role === 'vendor' && currentState.vendors[0]) {
      return {
        role: 'vendor',
        name: `${currentState.vendors[0].primaryContact} (${currentState.vendors[0].company})`,
        title: 'Assigned Vendor Portal',
        vendorId: currentState.vendors[0].id,
      };
    }
    return base;
  };

  const actor = useMemo(() => resolveActorForRole(activeRole, state), [activeRole, state]);
  const isBoardOfficer = activeRole === 'president' || activeRole === 'treasurer' || activeRole === 'secretary';
  const canWriteBoard = isBoardOfficer || activeRole === 'board_member';

  const pushToast = (title: string, detail?: string, tone: ToastMessage['tone'] = 'neutral') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, title, detail, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    setOpenAssetId(null);
    setOpenWorkOrderId(null);
    setOpenVendorId(null);
    const nextActor = resolveActorForRole(role, state);
    pushToast(`Switched view to ${nextActor.title}`, `Acting as ${nextActor.name}`, 'neutral');
  };

  const appendAudit = (
    prev: CondoCoreState,
    module: string,
    entityLabel: string,
    action: string,
    details: string
  ): CondoCoreState['auditLog'] => [
    {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: nowTimestamp(),
      actorName: actor.name,
      actorRole: actor.role,
      module,
      entityLabel,
      action,
      details,
    },
    ...prev.auditLog,
  ];

  // Derived computations
  const getAssetCumulativeSpend = (assetId: string) => {
    const asset = state.assets.find((a) => a.id === assetId);
    const base = asset?.historicalSpendBeforeSystem ?? 0;
    const invoiced = state.invoices
      .filter((inv) => inv.assetId === assetId && (inv.status === 'paid' || inv.status === 'approved'))
      .reduce((sum, inv) => sum + inv.amount, 0);
    return base + invoiced;
  };

  const getVendorFlags = (vendor: Vendor): VendorComplianceFlags => {
    const coiDaysLeft = daysUntil(vendor.coiExpiry);
    const contractDaysLeft = daysUntil(vendor.contractEnd);
    const totalInvoiced = state.invoices
      .filter((inv) => inv.vendorId === vendor.id && inv.status !== 'rejected' && inv.status !== 'draft')
      .reduce((s, inv) => s + inv.amount, 0);
    const unresolvedIssuesCount = state.workOrders.filter(
      (wo) => wo.vendorId === vendor.id && wo.status !== 'closed'
    ).length;

    const coiExpiringSoon = coiDaysLeft <= 30;
    const contractExpiringSoon = contractDaysLeft <= 45;
    const missedServices = vendor.missedServicesCount > 0;
    const overContractCap = totalInvoiced > vendor.contractAnnualCap;

    return {
      coiExpiringSoon,
      coiDaysLeft,
      contractExpiringSoon,
      contractDaysLeft,
      missedServices,
      overContractCap,
      totalInvoiced,
      unresolvedIssuesCount,
      hasAnyFlag: coiExpiringSoon || contractExpiringSoon || missedServices || overContractCap || unresolvedIssuesCount > 0,
    };
  };

  const getFundBalances = () => {
    let operating = state.settings.operatingOpeningCash;
    let reserve = state.settings.reserveOpeningCash;
    let special_project = state.settings.specialProjectOpeningCash;

    state.invoices.forEach((inv) => {
      if (inv.status === 'paid') {
        if (inv.fund === 'operating') operating -= inv.amount;
        if (inv.fund === 'reserve') reserve -= inv.amount;
        if (inv.fund === 'special_project') special_project -= inv.amount;
      }
    });

    // Include additional payments recorded after seed baseline
    const extraPayments = state.units.reduce((sum, u) => {
      const novExtra = u.transactions
        .filter((t) => t.id.startsWith('tx-live-'))
        .reduce((ts, t) => ts + Math.abs(t.principalDelta + t.lateFeeDelta), 0);
      return sum + novExtra;
    }, 0);
    operating += extraPayments;

    return { operating, reserve, special_project };
  };

  const getBudgetActual = (category: string, fund: FundType) => {
    const line = state.budgetLines.find((b) => b.category === category && b.fund === fund);
    const linkedInvoices = state.invoices.filter(
      (inv) => inv.budgetCategory === category && inv.fund === fund && inv.status !== 'rejected' && inv.status !== 'draft'
    );
    const invoiceSum = linkedInvoices.reduce((s, i) => s + i.amount, 0);
    return {
      actual: (line?.priorPaidAmount ?? 0) + invoiceSum,
      invoices: linkedInvoices,
    };
  };

  // Floorplans & Assets
  const selectPlanVersion = (planId: string, versionId: string) => {
    setState((prev) => ({
      ...prev,
      floorPlans: prev.floorPlans.map((p) => (p.id === planId ? { ...p, activeVersionId: versionId } : p)),
    }));
  };

  const uploadFloorPlan: CondoCoreContextValue['uploadFloorPlan'] = (params) => {
    const newVersion: PlanVersion = {
      id: `ver-${Date.now()}`,
      label: params.versionLabel,
      date: TODAY_ISO,
      notes: params.notes,
      uploadedImageUrl: params.imageUrl,
      scaleFeetPer10Pct: params.scaleFeetPer10Pct,
      calibrationLabel: params.calibrationLabel,
    };

    setState((prev) => {
      if (params.targetPlanId === 'new') {
        const newPlanId = `plan-${Date.now()}`;
        setSelectedPlanId(newPlanId);
        return {
          ...prev,
          floorPlans: [
            ...prev.floorPlans,
            {
              id: newPlanId,
              name: params.newPlanName || 'Uploaded Floorplan',
              levelCode: params.newLevelCode || 'UP',
              areaDescription: params.areaDescription || 'Board-uploaded architectural plan',
              activeVersionId: newVersion.id,
              versions: [newVersion],
            },
          ],
          auditLog: appendAudit(
            prev,
            'Building Map',
            params.newPlanName || 'New Plan',
            'Floorplan Uploaded & Calibrated',
            `${params.versionLabel} · ${params.calibrationLabel}`
          ),
        };
      }

      return {
        ...prev,
        floorPlans: prev.floorPlans.map((p) =>
          p.id === params.targetPlanId
            ? { ...p, activeVersionId: newVersion.id, versions: [newVersion, ...p.versions] }
            : p
        ),
        auditLog: appendAudit(
          prev,
          'Building Map',
          params.versionLabel,
          'New Plan Revision Added',
          `Attached calibrated revision (${params.calibrationLabel})`
        ),
      };
    });
    pushToast('Floorplan saved', 'Plan calibrated and linked to version history.', 'success');
  };

  const addAssetPin: CondoCoreContextValue['addAssetPin'] = (assetData) => {
    const id = `ast-${Date.now()}`;
    const prefix = assetData.category.slice(0, 3).toUpperCase();
    const code = `${prefix}-${String(state.assets.length + 1).padStart(2, '0')}`;
    const newAsset: BuildingAsset = {
      ...assetData,
      id,
      code,
      historicalSpendBeforeSystem: 0,
      photos: [],
      attachments: [],
    };
    setState((prev) => ({
      ...prev,
      assets: [newAsset, ...prev.assets],
      auditLog: appendAudit(
        prev,
        'Asset Registry',
        `${code} · ${assetData.name}`,
        'Map Pin Created',
        `Pinned on floorplan at (${Math.round(assetData.x)}%, ${Math.round(assetData.y)}%)`
      ),
    }));
    setOpenAssetId(id);
    pushToast('Asset pin placed', `${code} — ${assetData.name}`, 'success');
  };

  const updateAssetCondition = (assetId: string, condition: HealthStatus, note?: string) => {
    setState((prev) => {
      const target = prev.assets.find((a) => a.id === assetId);
      if (!target) return prev;
      return {
        ...prev,
        assets: prev.assets.map((a) =>
          a.id === assetId
            ? { ...a, condition, notes: note !== undefined ? note : a.notes }
            : a
        ),
        auditLog: appendAudit(
          prev,
          'Asset Registry',
          `${target.code} · ${target.name}`,
          'Condition Status Updated',
          `Changed condition to ${condition.toUpperCase()}${note ? ` — ${note}` : ''}`
        ),
      };
    });
    pushToast('Asset status updated', undefined, 'success');
  };

  const attachAssetPhoto = (assetId: string, photo: Omit<AssetPhoto, 'id' | 'date' | 'uploadedBy'>) => {
    setState((prev) => {
      const target = prev.assets.find((a) => a.id === assetId);
      if (!target) return prev;
      const newPhoto: AssetPhoto = {
        ...photo,
        id: `ph-${Date.now()}`,
        date: TODAY_ISO,
        uploadedBy: actor.name,
      };
      return {
        ...prev,
        assets: prev.assets.map((a) => (a.id === assetId ? { ...a, photos: [newPhoto, ...a.photos] } : a)),
        auditLog: appendAudit(
          prev,
          'Asset Registry',
          `${target.code} · ${target.name}`,
          'Photo Attached',
          photo.caption
        ),
      };
    });
    pushToast('Photo added to asset record', undefined, 'success');
  };

  const attachAssetDocument = (assetId: string, doc: Omit<AssetDocumentRef, 'id' | 'date'>) => {
    setState((prev) => {
      const target = prev.assets.find((a) => a.id === assetId);
      if (!target) return prev;
      const newDoc: AssetDocumentRef = {
        ...doc,
        id: `att-${Date.now()}`,
        date: TODAY_ISO,
      };
      return {
        ...prev,
        assets: prev.assets.map((a) =>
          a.id === assetId ? { ...a, attachments: [newDoc, ...a.attachments] } : a
        ),
        auditLog: appendAudit(
          prev,
          'Asset Registry',
          `${target.code} · ${target.name}`,
          `${doc.type} Attached`,
          doc.title
        ),
      };
    });
    pushToast(`${doc.type} attached`, doc.title, 'success');
  };

  const addScannedSpaceToPlan: CondoCoreContextValue['addScannedSpaceToPlan'] = (planId, spaceInput) => {
    const newSpace: ScannedSpace = {
      ...spaceInput,
      id: `spc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      scannedAt: nowTimestamp(),
    };
    setState((prev) => {
      const targetPlan = prev.floorPlans.find((p) => p.id === planId);
      if (!targetPlan) return prev;
      return {
        ...prev,
        floorPlans: prev.floorPlans.map((p) =>
          p.id === planId
            ? { ...p, scannedSpaces: [...(p.scannedSpaces || []), newSpace] }
            : p
        ),
        auditLog: appendAudit(
          prev,
          'Building Map',
          `${targetPlan.levelCode} · ${newSpace.name}`,
          'Camera Space Scanned onto Plan',
          `${newSpace.widthFt}ft × ${newSpace.lengthFt}ft (${newSpace.areaSqFt} sq ft) · ${newSpace.objects.length} detected objects`
        ),
      };
    });
    setSelectedPlanId(planId);
    pushToast(
      'Scanned space added to plan',
      `${newSpace.name} (${newSpace.widthFt}' × ${newSpace.lengthFt}', ${newSpace.objects.length} objects)`,
      'success'
    );
  };

  const createPlanFromScannedSpaces: CondoCoreContextValue['createPlanFromScannedSpaces'] = (params) => {
    const newPlanId = `plan-scan-${Date.now()}`;
    const verId = `ver-scan-${Date.now()}`;
    const stampedSpaces: ScannedSpace[] = params.spaces.map((s, idx) => ({
      ...s,
      id: `spc-${Date.now()}-${idx}`,
      scannedAt: nowTimestamp(),
    }));
    const totalSqFt = stampedSpaces.reduce((acc, s) => acc + s.areaSqFt, 0);
    const totalObjs = stampedSpaces.reduce((acc, s) => acc + s.objects.length, 0);

    const newPlan: FloorPlan = {
      id: newPlanId,
      name: params.planName,
      levelCode: params.levelCode.toUpperCase().slice(0, 6) || 'SCAN',
      areaDescription:
        params.areaDescription ||
        `Camera-scanned multi-space architectural plan · ${stampedSpaces.length} spaces · ${Math.round(totalSqFt)} sq ft · ${totalObjs} objects`,
      activeVersionId: verId,
      versions: [
        {
          id: verId,
          label: `Rev ${TODAY_ISO.slice(0, 7)} (Camera Spatial Scan)`,
          date: TODAY_ISO,
          notes: `Created via CondoCore Camera Spatial Scanner by ${actor.name} (${stampedSpaces.length} scanned spaces, ${totalObjs} detected objects).`,
          builtInKey: 'scanned_custom',
          scaleFeetPer10Pct: 10,
          calibrationLabel: `Spatial Scan · ${Math.round(totalSqFt)} sq ft mapped`,
        },
      ],
      scannedSpaces: stampedSpaces,
    };

    setState((prev) => ({
      ...prev,
      floorPlans: [...prev.floorPlans, newPlan],
      auditLog: appendAudit(
        prev,
        'Building Map',
        newPlan.name,
        'New Floorplan Created via Camera Scan',
        `${stampedSpaces.length} spaces (${Math.round(totalSqFt)} sq ft) · ${totalObjs} objects cataloged`
      ),
    }));
    setSelectedPlanId(newPlanId);
    pushToast(
      'New floorplan created from camera scan',
      `${newPlan.name} with ${stampedSpaces.length} space${stampedSpaces.length === 1 ? '' : 's'} & ${totalObjs} objects.`,
      'success'
    );
    return newPlanId;
  };

  const mapObjectTypeToCategory = (type: ScannedObjectType): AssetCategory => {
    switch (type) {
      case 'boiler_hvac':
        return 'Boiler & HVAC';
      case 'plumbing_valve':
        return 'Plumbing & Valves';
      case 'electrical_panel':
        return 'Electrical & Meters';
      case 'fire_safety':
        return 'Fire & Sprinkler';
      case 'stairs':
      case 'ladder':
        return 'Safety & Hazard';
      case 'window':
      case 'door':
        return 'Exterior & Masonry';
      default:
        return 'Safety & Hazard';
    }
  };

  const promoteScannedObjectToAsset: CondoCoreContextValue['promoteScannedObjectToAsset'] = (
    planId,
    spaceId,
    objectId
  ) => {
    const plan = state.floorPlans.find((p) => p.id === planId);
    const space = plan?.scannedSpaces?.find((s) => s.id === spaceId);
    const obj = space?.objects.find((o) => o.id === objectId);
    if (!plan || !space || !obj) return null;
    if (obj.promotedAssetId) {
      setOpenAssetId(obj.promotedAssetId);
      return obj.promotedAssetId;
    }

    const absX = Number(Math.max(4, Math.min(96, space.planX + (obj.xPct / 100) * space.planWidthPct)).toFixed(1));
    const absY = Number(Math.max(4, Math.min(96, space.planY + (obj.yPct / 100) * space.planHeightPct)).toFixed(1));
    const category = mapObjectTypeToCategory(obj.objectType);
    const id = `ast-${Date.now()}`;
    const code = `${category.slice(0, 3).toUpperCase()}-${String(state.assets.length + 1).padStart(2, '0')}`;

    const newAsset: BuildingAsset = {
      id,
      code,
      name: `${obj.name} (${space.name})`,
      planId,
      x: absX,
      y: absY,
      category,
      condition: 'green',
      locationDetail: `${space.name} · ${plan.name} (Est. ${obj.widthFt}' × ${obj.depthFt}')`,
      installYear: 2022,
      usefulLifeYears: 15,
      replacementEstimate: 3500,
      plannedReplacementYear: 2037,
      reserveCategory: category,
      budgetCategory: 'General Building Maintenance',
      historicalSpendBeforeSystem: 0,
      photos: space.capturedPhotoUrl
        ? [
            {
              id: `ph-scan-${Date.now()}`,
              url: space.capturedPhotoUrl,
              caption: `Captured during spatial scan of ${space.name}`,
              date: TODAY_ISO,
              uploadedBy: actor.name,
            },
          ]
        : [],
      attachments: [],
      notes: `Promoted from camera spatial scan object (${obj.objectType}). ${obj.notes || ''}`.trim(),
    };

    setState((prev) => ({
      ...prev,
      assets: [newAsset, ...prev.assets],
      floorPlans: prev.floorPlans.map((p) =>
        p.id === planId
          ? {
              ...p,
              scannedSpaces: (p.scannedSpaces || []).map((s) =>
                s.id === spaceId
                  ? {
                      ...s,
                      objects: s.objects.map((o) =>
                        o.id === objectId ? { ...o, promotedAssetId: id } : o
                      ),
                    }
                  : s
              ),
            }
          : p
      ),
      auditLog: appendAudit(
        prev,
        'Asset Registry',
        `${code} · ${newAsset.name}`,
        'Promoted Scanned Object to Asset Pin',
        `Converted spatial scan item (${obj.objectType}) in ${space.name} to tracked asset.`
      ),
    }));

    setOpenAssetId(id);
    pushToast('Object promoted to tracked asset', `${code} — ${newAsset.name}`, 'success');
    return id;
  };

  const mapDraftKindToAssetCategory = (kind: DraftElementKind): AssetCategory => {
    switch (kind) {
      case 'boiler_hvac':
        return 'Boiler & HVAC';
      case 'fire_riser':
        return 'Fire & Sprinkler';
      case 'electrical_panel':
      case 'meter_bank':
        return 'Electrical & Meters';
      case 'water_valve':
        return 'Plumbing & Valves';
      case 'roof_drain':
        return 'Drain & Water';
      case 'elevator':
        return 'Elevator';
      case 'garage_gate':
      case 'parking_stall':
      case 'ramp':
      case 'column':
        return 'Garage & Structure';
      case 'door_swing':
      case 'double_door':
      case 'sliding_door':
      case 'window':
      case 'balcony':
        return 'Exterior & Masonry';
      default:
        return 'Safety & Hazard';
    }
  };

  const savePlanDraftElements: CondoCoreContextValue['savePlanDraftElements'] = (
    planId,
    elements,
    options
  ) => {
    setState((prev) => {
      const targetPlan = prev.floorPlans.find((p) => p.id === planId);
      if (!targetPlan) return prev;
      return {
        ...prev,
        floorPlans: prev.floorPlans.map((p) =>
          p.id === planId
            ? {
                ...p,
                draftElements: elements,
                draftScalePxPerFoot: options?.scalePxPerFoot ?? p.draftScalePxPerFoot ?? 10,
                underlayOpacity: options?.underlayOpacity ?? p.underlayOpacity ?? 0.85,
              }
            : p
        ),
        auditLog: appendAudit(
          prev,
          'Building Map',
          `${targetPlan.levelCode} · ${targetPlan.name}`,
          'Floorplan Layout Saved',
          options?.revisionNote ||
            `Saved ${elements.length} drafted architectural element${elements.length === 1 ? '' : 's'} via Floorplan Studio.`
        ),
      };
    });
    pushToast(
      'Floorplan layout saved',
      `${elements.length} drafted element${elements.length === 1 ? '' : 's'} persisted on building map.`,
      'success'
    );
  };

  const createBlankManualPlan: CondoCoreContextValue['createBlankManualPlan'] = (params) => {
    const newPlanId = `plan-draft-${Date.now()}`;
    const verId = `ver-draft-${Date.now()}`;
    const scalePxPerFoot = params.scalePxPerFoot || 10;
    const initialElements = params.initialElements || [];

    const newPlan: FloorPlan = {
      id: newPlanId,
      name: params.planName.trim() || 'Custom Architectural Plan',
      levelCode: (params.levelCode.trim() || 'DRFT').toUpperCase().slice(0, 6),
      areaDescription:
        params.areaDescription.trim() ||
        'Manually drafted drag-and-drop architectural floorplan',
      activeVersionId: verId,
      versions: [
        {
          id: verId,
          label: `Rev ${TODAY_ISO.slice(0, 7)} (Manual Studio Draft)`,
          date: TODAY_ISO,
          notes: `Created via CondoCore Drag-and-Drop Floorplan Studio by ${actor.name}.`,
          builtInKey: 'manual_draft',
          scaleFeetPer10Pct: Number((100 / scalePxPerFoot).toFixed(1)),
          calibrationLabel: `Draft Scale · ${Math.round(1000 / scalePxPerFoot)} ft × ${Math.round(620 / scalePxPerFoot)} ft canvas`,
        },
      ],
      draftElements: initialElements,
      draftScalePxPerFoot: scalePxPerFoot,
      underlayOpacity: 1,
    };

    setState((prev) => ({
      ...prev,
      floorPlans: [...prev.floorPlans, newPlan],
      auditLog: appendAudit(
        prev,
        'Building Map',
        newPlan.name,
        'New Manual Floorplan Created',
        `Level ${newPlan.levelCode} created in Floorplan Studio (${initialElements.length} initial elements).`
      ),
    }));

    setSelectedPlanId(newPlanId);
    pushToast('New manual floorplan created', `${newPlan.levelCode} — ${newPlan.name}`, 'success');
    return newPlanId;
  };

  const promoteDraftElementToAsset: CondoCoreContextValue['promoteDraftElementToAsset'] = (
    planId,
    elementId
  ) => {
    const plan = state.floorPlans.find((p) => p.id === planId);
    const el = plan?.draftElements?.find((item) => item.id === elementId);
    if (!plan || !el) return null;
    if (el.promotedAssetId) {
      setOpenAssetId(el.promotedAssetId);
      return el.promotedAssetId;
    }

    const scale = plan.draftScalePxPerFoot || 10;
    const widthFt = Number((el.width / scale).toFixed(1));
    const heightFt = Number((el.height / scale).toFixed(1));
    const absX = Number(Math.max(4, Math.min(96, ((el.x + el.width / 2) / 1000) * 100)).toFixed(1));
    const absY = Number(Math.max(4, Math.min(96, ((el.y + el.height / 2) / 620) * 100)).toFixed(1));
    const category = mapDraftKindToAssetCategory(el.kind);
    const id = `ast-${Date.now()}`;
    const code = `${category.slice(0, 3).toUpperCase()}-${String(state.assets.length + 1).padStart(2, '0')}`;

    const newAsset: BuildingAsset = {
      id,
      code,
      name: el.label,
      planId,
      x: absX,
      y: absY,
      category,
      condition: 'green',
      locationDetail: `${plan.name} · Drafted element (${widthFt}' × ${heightFt}')`,
      installYear: 2022,
      usefulLifeYears: 20,
      replacementEstimate: 5000,
      plannedReplacementYear: 2042,
      reserveCategory: category,
      budgetCategory: 'General Building Maintenance',
      historicalSpendBeforeSystem: 0,
      photos: [],
      attachments: [],
      notes: el.notes || `Promoted from manually drafted ${el.kind.replace(/_/g, ' ')} on ${plan.levelCode}.`,
    };

    setState((prev) => ({
      ...prev,
      assets: [newAsset, ...prev.assets],
      floorPlans: prev.floorPlans.map((p) =>
        p.id === planId
          ? {
              ...p,
              draftElements: (p.draftElements || []).map((item) =>
                item.id === elementId ? { ...item, promotedAssetId: id } : item
              ),
            }
          : p
      ),
      auditLog: appendAudit(
        prev,
        'Asset Registry',
        `${code} · ${newAsset.name}`,
        'Promoted Drafted Element to Asset Pin',
        `Converted drafted ${el.kind.replace(/_/g, ' ')} on ${plan.levelCode} into a tracked building asset.`
      ),
    }));

    setOpenAssetId(id);
    pushToast('Promoted to tracked asset pin', `${code} — ${newAsset.name}`, 'success');
    return id;
  };

  // Inspections
  const createInspectionFromTemplate: CondoCoreContextValue['createInspectionFromTemplate'] = (params) => {
    const tmpl = INSPECTION_TEMPLATES[params.templateType];
    const asset = state.assets.find((a) => a.id === params.assetId);
    const id = `insp-${Date.now()}`;
    const newInsp: InspectionRecord = {
      id,
      title: `${params.templateType} Inspection — ${asset?.name ?? 'Building System'}`,
      templateType: params.templateType,
      assetId: params.assetId,
      planId: asset?.planId ?? 'plan-roof',
      vendorId: params.vendorId,
      inspectorName: params.inspectorName,
      scheduledDate: params.scheduledDate,
      dueDate: params.dueDate,
      status: 'in_progress',
      boardApprovalStatus: 'pending_review',
      summary: 'Active checklist inspection created from CondoCore standard template.',
      items: tmpl.items.map((it, i) => ({
        ...it,
        id: `ci-${Date.now()}-${i}`,
      })),
    };
    setState((prev) => ({
      ...prev,
      inspections: [newInsp, ...prev.inspections],
      auditLog: appendAudit(
        prev,
        'Inspections',
        newInsp.title,
        'Inspection Started',
        `Template: ${params.templateType} · Inspector: ${params.inspectorName}`
      ),
    }));
    pushToast('Inspection created', `${params.templateType} checklist ready.`, 'success');
    return id;
  };

  const updateInspectionChecklistItem: CondoCoreContextValue['updateInspectionChecklistItem'] = (
    inspectionId,
    itemId,
    patch
  ) => {
    setState((prev) => ({
      ...prev,
      inspections: prev.inspections.map((insp) =>
        insp.id === inspectionId
          ? {
              ...insp,
              status: insp.status === 'scheduled' ? 'in_progress' : insp.status,
              items: insp.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
            }
          : insp
      ),
    }));
  };

  const completeInspection = (inspectionId: string, summary: string, reportTitle?: string) => {
    setState((prev) => {
      const target = prev.inspections.find((i) => i.id === inspectionId);
      if (!target) return prev;
      return {
        ...prev,
        inspections: prev.inspections.map((i) =>
          i.id === inspectionId
            ? {
                ...i,
                status: 'completed',
                completedDate: TODAY_ISO,
                boardApprovalStatus: 'approved',
                summary,
                reportTitle: reportTitle || i.reportTitle,
              }
            : i
        ),
        assets: prev.assets.map((a) =>
          a.id === target.assetId ? { ...a, lastInspectionDate: TODAY_ISO } : a
        ),
        auditLog: appendAudit(
          prev,
          'Inspections',
          target.title,
          'Inspection Completed',
          summary
        ),
      };
    });
    pushToast('Inspection finalized', 'Asset inspection date updated and logged.', 'success');
  };

  const escalateChecklistItemToWorkOrder = (inspectionId: string, itemId: string): string | null => {
    const insp = state.inspections.find((i) => i.id === inspectionId);
    const item = insp?.items.find((it) => it.id === itemId);
    if (!insp || !item) return null;
    if (item.escalatedIssueId) {
      setOpenWorkOrderId(item.escalatedIssueId);
      return item.escalatedIssueId;
    }

    const asset = state.assets.find((a) => a.id === insp.assetId);
    const woId = `wo-${Date.now()}`;
    const woCode = `WO-2026-0${44 + state.workOrders.length}`;

    const newWo: IssueWorkOrder = {
      id: woId,
      code: woCode,
      title: `${item.label} (${asset?.code ?? insp.templateType})`,
      description: `Escalated from ${insp.title}. Measurement: ${item.measurement || 'N/A'} ${item.measurementUnit || ''}. Recommended action: ${item.recommendedAction || 'Inspect and remediate deficiency.'}`,
      assetId: insp.assetId,
      planId: asset?.planId ?? insp.planId,
      x: asset?.x ?? 50,
      y: asset?.y ?? 50,
      category: asset?.category ?? 'Safety & Hazard',
      source: 'inspection',
      reportedByName: insp.inspectorName,
      urgency: item.severity === 'critical' ? 'emergency' : item.severity === 'high' ? 'urgent' : 'soon',
      classification: item.severity === 'critical' ? 'emergency' : 'maintenance',
      status: 'triage',
      createdAt: TODAY_ISO,
      dueDate: '2026-12-10',
      vendorId: insp.vendorId ?? asset?.vendorId,
      estimatedCost: item.estimatedCost ?? 1200,
      photos: item.photoUrl
        ? [{ id: `ph-esc-${Date.now()}`, url: item.photoUrl, caption: item.label, date: TODAY_ISO, uploadedBy: actor.name }]
        : [],
      notes: [
        {
          id: `n-esc-${Date.now()}`,
          date: TODAY_ISO,
          author: actor.name,
          role: actor.title,
          text: `One-click escalation from failed/flagged inspection checklist item in "${insp.title}". Preserved linked asset history.`,
        },
      ],
    };

    setState((prev) => ({
      ...prev,
      workOrders: [newWo, ...prev.workOrders],
      inspections: prev.inspections.map((i) =>
        i.id === inspectionId
          ? {
              ...i,
              items: i.items.map((it) => (it.id === itemId ? { ...it, escalatedIssueId: woId } : it)),
            }
          : i
      ),
      assets: prev.assets.map((a) =>
        a.id === insp.assetId && item.result === 'fail' ? { ...a, condition: 'red' } : a
      ),
      auditLog: appendAudit(
        prev,
        'Inspections',
        `${woCode} · ${asset?.code ?? 'Asset'}`,
        'Checklist Item Escalated to Work Order',
        `Converted "${item.label}" directly into tracked work order linked to building asset.`
      ),
    }));

    setOpenWorkOrderId(woId);
    pushToast('Escalated to Work Order', `${woCode} linked to ${asset?.name ?? 'asset'}.`, 'warning');
    return woId;
  };

  // Work Orders
  const createWorkOrder: CondoCoreContextValue['createWorkOrder'] = (params) => {
    const id = `wo-${Date.now()}`;
    const code = `WO-2026-0${44 + state.workOrders.length}`;
    const newWo: IssueWorkOrder = {
      id,
      code,
      title: params.title,
      description: params.description,
      assetId: params.assetId,
      planId: params.planId,
      x: params.x,
      y: params.y,
      category: params.category,
      source: params.source,
      reportedByName: actor.name,
      reportedByUnit: params.reportedByUnit || actor.unitNumber,
      preferredContact: params.preferredContact,
      permissionToEnter: params.permissionToEnter,
      urgency: params.urgency,
      classification: params.classification || 'unclassified',
      status: params.vendorId ? 'dispatched' : 'triage',
      unreadByBoard: params.source === 'resident',
      createdAt: TODAY_ISO,
      dueDate: '2026-12-10',
      vendorId: params.vendorId,
      estimatedCost: params.estimatedCost,
      photos: params.photoUrl
        ? [
            {
              id: `ph-wo-${Date.now()}`,
              url: params.photoUrl,
              caption: params.photoCaption || params.title,
              date: TODAY_ISO,
              uploadedBy: actor.name,
            },
          ]
        : [],
      notes: [],
    };

    setState((prev) => ({
      ...prev,
      workOrders: [newWo, ...prev.workOrders],
      auditLog: appendAudit(
        prev,
        'Work Orders',
        `${code} · ${params.title}`,
        params.source === 'resident' ? 'Resident Request Submitted' : 'Work Order Opened',
        params.source === 'resident'
          ? `Unit ${params.reportedByUnit || actor.unitNumber} submitted request (${params.urgency}); pinned to floorplan.`
          : `Opened by ${actor.name} (${params.urgency}).`
      ),
    }));

    pushToast(
      params.source === 'resident' ? 'Request submitted to Board' : 'Work Order created',
      `${code} pinned to building map.`,
      'success'
    );
    return id;
  };

  const updateWorkOrder: CondoCoreContextValue['updateWorkOrder'] = (workOrderId, patch) => {
    setState((prev) => {
      const target = prev.workOrders.find((w) => w.id === workOrderId);
      if (!target) return prev;
      return {
        ...prev,
        workOrders: prev.workOrders.map((w) => (w.id === workOrderId ? { ...w, ...patch } : w)),
        auditLog: appendAudit(
          prev,
          'Work Orders',
          target.code,
          'Work Order Updated',
          Object.entries(patch)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(', ')
        ),
      };
    });
  };

  const addWorkOrderNote = (workOrderId: string, text: string, internalOnly = false) => {
    setState((prev) => ({
      ...prev,
      workOrders: prev.workOrders.map((w) =>
        w.id === workOrderId
          ? {
              ...w,
              notes: [
                ...w.notes,
                {
                  id: `won-${Date.now()}`,
                  date: TODAY_ISO,
                  author: actor.name,
                  role: actor.title,
                  text,
                  internalOnly,
                },
              ],
            }
          : w
      ),
    }));
    pushToast('Note added', internalOnly ? 'Marked confidential (Board only).' : undefined, 'neutral');
  };

  const submitVendorInvoiceForWorkOrder: CondoCoreContextValue['submitVendorInvoiceForWorkOrder'] = (
    workOrderId,
    params
  ) => {
    const wo = state.workOrders.find((w) => w.id === workOrderId);
    if (!wo || !wo.vendorId) return;
    const invId = `inv-${Date.now()}`;

    const newInvoice: Invoice = {
      id: invId,
      invoiceNumber: params.invoiceNumber,
      vendorId: wo.vendorId,
      workOrderId: wo.id,
      assetId: wo.assetId,
      description: `${wo.code}: ${wo.title}`,
      fund: params.fund,
      budgetCategory: params.budgetCategory,
      amount: params.amount,
      receivedDate: TODAY_ISO,
      dueDate: '2026-12-15',
      status: 'received',
      approvals: [],
      bankReconciled: false,
    };

    setState((prev) => ({
      ...prev,
      invoices: [newInvoice, ...prev.invoices],
      workOrders: prev.workOrders.map((w) =>
        w.id === workOrderId
          ? {
              ...w,
              vendorFindings: params.findings,
              invoiceId: invId,
              status: 'awaiting_verification',
            }
          : w
      ),
      auditLog: appendAudit(
        prev,
        'Accounts Payable',
        `${params.invoiceNumber} ($${params.amount.toLocaleString()})`,
        'Vendor Invoice Linked to Work Order',
        `Linked to ${wo.code} and routed for board invoice approval.`
      ),
    }));
    pushToast('Findings & invoice submitted', `${params.invoiceNumber} queued for board approval.`, 'success');
  };

  const recordWorkOrderResolutionAndClose: CondoCoreContextValue['recordWorkOrderResolutionAndClose'] = (
    workOrderId,
    params
  ) => {
    setState((prev) => {
      const wo = prev.workOrders.find((w) => w.id === workOrderId);
      if (!wo) return prev;
      return {
        ...prev,
        workOrders: prev.workOrders.map((w) =>
          w.id === workOrderId
            ? {
                ...w,
                status: 'closed',
                unreadByBoard: false,
                resolutionProof: {
                  type: params.type,
                  reference: params.reference,
                  recordedAt: TODAY_ISO,
                  recordedBy: actor.name,
                  photoUrl: params.photoUrl,
                },
              }
            : w
        ),
        assets: prev.assets.map((a) =>
          a.id === wo.assetId && a.condition === 'red' ? { ...a, condition: 'yellow' } : a
        ),
        auditLog: appendAudit(
          prev,
          'Work Orders',
          wo.code,
          'Closed With Resolution Proof',
          `Verified via ${params.type}: ${params.reference}`
        ),
      };
    });
    pushToast('Work Order closed', 'Resolution proof archived on linked asset record.', 'success');
  };

  // Vendors
  const addVendor: CondoCoreContextValue['addVendor'] = (vendorData) => {
    const id = `vnd-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      vendors: [{ ...vendorData, id, missedServicesCount: 0 }, ...prev.vendors],
      auditLog: appendAudit(
        prev,
        'Vendors',
        vendorData.company,
        'Vendor Added',
        `Contract cap $${vendorData.contractAnnualCap.toLocaleString()} · COI expires ${vendorData.coiExpiry}`
      ),
    }));
    pushToast('Vendor added', vendorData.company, 'success');
  };

  const updateVendorCompliance = (vendorId: string, patch: Partial<Vendor>) => {
    setState((prev) => {
      const v = prev.vendors.find((x) => x.id === vendorId);
      if (!v) return prev;
      return {
        ...prev,
        vendors: prev.vendors.map((x) => (x.id === vendorId ? { ...x, ...patch } : x)),
        auditLog: appendAudit(
          prev,
          'Vendors',
          v.company,
          'Vendor Record Updated',
          patch.coiExpiry
            ? `Updated COI expiry to ${patch.coiExpiry}`
            : patch.contractEnd
            ? `Updated contract term to ${patch.contractEnd}`
            : 'Updated vendor obligation details'
        ),
      };
    });
    pushToast('Vendor obligation updated', undefined, 'success');
  };

  // Financials & Assessments
  const recordUnitPayment = (
    unitId: string,
    amount: number,
    method: 'ACH' | 'Card' | 'Check',
    description?: string
  ) => {
    if (amount <= 0) return;
    setState((prev) => {
      const unit = prev.units.find((u) => u.id === unitId);
      if (!unit) return prev;

      // Apply to late fees first, then principal (standard HOA waterfall)
      const appliedLate = Math.min(unit.lateFeeBalance, amount);
      const remaining = amount - appliedLate;
      const appliedPrincipal = Math.min(unit.principalBalance, remaining);
      const nextLate = Math.max(0, unit.lateFeeBalance - appliedLate);
      const nextPrincipal = Math.max(0, unit.principalBalance - appliedPrincipal);
      const fullyCleared = nextLate === 0 && nextPrincipal === 0;

      const tx = {
        id: `tx-live-${Date.now()}`,
        date: TODAY_ISO,
        type: 'payment' as const,
        description: description || `${method} Assessment Payment`,
        principalDelta: -appliedPrincipal,
        lateFeeDelta: -appliedLate,
        paymentMethod: method,
        recordedBy: actor.name,
      };

      return {
        ...prev,
        units: prev.units.map((u) =>
          u.id === unitId
            ? {
                ...u,
                principalBalance: nextPrincipal,
                lateFeeBalance: nextLate,
                delinquencyStage: fullyCleared ? 'current' : u.delinquencyStage,
                daysPastDue: fullyCleared ? 0 : u.daysPastDue,
                transactions: [tx, ...u.transactions],
              }
            : u
        ),
        auditLog: appendAudit(
          prev,
          'Assessments',
          `Unit ${unit.unitNumber}`,
          'Payment Recorded',
          `$${amount.toLocaleString()} via ${method} (Principal -$${appliedPrincipal}, Late Fees -$${appliedLate})`
        ),
      };
    });
    pushToast('Payment posted', `Unit ledger updated and matched to Operating Cash.`, 'success');
  };

  const recordUnitCorrection = (
    unitId: string,
    principalDelta: number,
    lateFeeDelta: number,
    reason: string
  ) => {
    setState((prev) => {
      const unit = prev.units.find((u) => u.id === unitId);
      if (!unit) return prev;
      const nextPrincipal = Math.max(0, unit.principalBalance + principalDelta);
      const nextLate = Math.max(0, unit.lateFeeBalance + lateFeeDelta);
      const tx = {
        id: `tx-corr-${Date.now()}`,
        date: TODAY_ISO,
        type: 'correction' as const,
        description: `Ledger Correction: ${reason}`,
        principalDelta,
        lateFeeDelta,
        paymentMethod: 'Correction' as const,
        correctionReason: reason,
        recordedBy: actor.name,
      };
      return {
        ...prev,
        units: prev.units.map((u) =>
          u.id === unitId
            ? {
                ...u,
                principalBalance: nextPrincipal,
                lateFeeBalance: nextLate,
                transactions: [tx, ...u.transactions],
              }
            : u
        ),
        auditLog: appendAudit(
          prev,
          'Assessments',
          `Unit ${unit.unitNumber}`,
          'Non-Destructive Ledger Correction',
          `Principal ${principalDelta >= 0 ? '+' : ''}$${principalDelta}, Late Fee ${lateFeeDelta >= 0 ? '+' : ''}$${lateFeeDelta}. Reason: ${reason}`
        ),
      };
    });
    pushToast('Correction entry recorded', 'Original ledger rows preserved in audit history.', 'warning');
  };

  const updateUnitDelinquency = (unitId: string, stage: DelinquencyStage, paymentPlanNote?: string) => {
    setState((prev) => {
      const unit = prev.units.find((u) => u.id === unitId);
      if (!unit) return prev;
      return {
        ...prev,
        units: prev.units.map((u) =>
          u.id === unitId
            ? {
                ...u,
                delinquencyStage: stage,
                paymentPlanNote: paymentPlanNote !== undefined ? paymentPlanNote : u.paymentPlanNote,
              }
            : u
        ),
        auditLog: appendAudit(
          prev,
          'Assessments',
          `Unit ${unit.unitNumber}`,
          'Collection Stage Updated',
          `Stage set to ${stage}${paymentPlanNote ? ` · ${paymentPlanNote}` : ''}`
        ),
      };
    });
    pushToast('Delinquency status updated', undefined, 'success');
  };

  const addSpecialAssessment = (sa: Omit<SpecialAssessment, 'id'>) => {
    setState((prev) => ({
      ...prev,
      specialAssessments: [{ ...sa, id: `sa-${Date.now()}` }, ...prev.specialAssessments],
      auditLog: appendAudit(
        prev,
        'Assessments',
        sa.title,
        sa.status === 'proposed' ? 'Special Assessment Proposed' : 'Special Assessment Approved',
        `Total $${sa.totalAmount.toLocaleString()} (~$${sa.perUnitAverage}/unit)`
      ),
    }));
    pushToast('Special assessment recorded', sa.status === 'proposed' ? 'Marked as Proposed (not yet billed).' : 'Board-approved.', 'success');
  };

  const approveSpecialAssessment = (saId: string) => {
    setState((prev) => {
      const sa = prev.specialAssessments.find((x) => x.id === saId);
      if (!sa) return prev;
      return {
        ...prev,
        specialAssessments: prev.specialAssessments.map((x) =>
          x.id === saId ? { ...x, status: 'board_approved' } : x
        ),
        auditLog: appendAudit(
          prev,
          'Assessments',
          sa.title,
          'Special Assessment Board-Approved',
          `Elevated from Proposed to Board-Approved ($${sa.totalAmount.toLocaleString()}).`
        ),
      };
    });
    pushToast('Special assessment approved', 'Status elevated from Proposed to Board-Approved.', 'success');
  };

  const createInvoice: CondoCoreContextValue['createInvoice'] = (invData) => {
    const id = `inv-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      invoices: [{ ...invData, id, approvals: [], bankReconciled: false }, ...prev.invoices],
      auditLog: appendAudit(
        prev,
        'Accounts Payable',
        `${invData.invoiceNumber} ($${invData.amount.toLocaleString()})`,
        invData.status === 'draft' ? 'Draft Invoice Created' : 'Invoice Received',
        `${invData.description} · Fund: ${invData.fund}`
      ),
    }));
    pushToast('Invoice logged', `${invData.invoiceNumber} (${invData.status}).`, 'success');
  };

  const advanceInvoiceStatus: CondoCoreContextValue['advanceInvoiceStatus'] = (invoiceId, action, note) => {
    const inv = state.invoices.find((i) => i.id === invoiceId);
    if (!inv) return { ok: false, message: 'Invoice not found.' };

    if (!canWriteBoard) {
      return { ok: false, message: 'Only Board Officers can approve or pay invoices.' };
    }

    if (action === 'submit') {
      setState((prev) => ({
        ...prev,
        invoices: prev.invoices.map((i) => (i.id === invoiceId ? { ...i, status: 'received' } : i)),
        auditLog: appendAudit(prev, 'Accounts Payable', inv.invoiceNumber, 'Submitted from Draft', 'Moved from Draft to Received.'),
      }));
      pushToast('Invoice submitted for approval', inv.invoiceNumber, 'success');
      return { ok: true, message: 'Submitted' };
    }

    if (action === 'reject') {
      setState((prev) => ({
        ...prev,
        invoices: prev.invoices.map((i) => (i.id === invoiceId ? { ...i, status: 'rejected', correctionNote: note } : i)),
        auditLog: appendAudit(prev, 'Accounts Payable', inv.invoiceNumber, 'Invoice Rejected', note || 'Rejected by board officer.'),
      }));
      pushToast('Invoice rejected', inv.invoiceNumber, 'warning');
      return { ok: true, message: 'Rejected' };
    }

    if (action === 'approve') {
      const requiresTwo = inv.amount >= state.settings.twoPersonApprovalThreshold;
      const alreadySigned = inv.approvals.some((a) => a.role === actor.role || a.actorName === actor.name);
      if (alreadySigned) {
        const msg = `${actor.name} already signed 1st approval. Switch to another Board Officer (e.g., President or Secretary) for 2nd signature.`;
        pushToast('Second distinct officer required', msg, 'warning');
        return { ok: false, message: msg };
      }

      const nextApprovals = [
        ...inv.approvals,
        { actorName: actor.name, role: actor.role, timestamp: nowTimestamp(), note },
      ];
      const nextStatus: Invoice['status'] =
        requiresTwo && nextApprovals.length < 2 ? 'first_approval' : 'approved';

      setState((prev) => ({
        ...prev,
        invoices: prev.invoices.map((i) =>
          i.id === invoiceId ? { ...i, status: nextStatus, approvals: nextApprovals } : i
        ),
        auditLog: appendAudit(
          prev,
          'Accounts Payable',
          `${inv.invoiceNumber} ($${inv.amount.toLocaleString()})`,
          nextStatus === 'first_approval' ? '1st Board Approval Granted' : 'Final Board Approval Granted',
          nextStatus === 'first_approval'
            ? `Signed by ${actor.name}; requires 2nd officer (>= $${prev.settings.twoPersonApprovalThreshold.toLocaleString()} rule).`
            : `Approved (${nextApprovals.length}/${requiresTwo ? 2 : 1} signatures complete).`
        ),
      }));

      pushToast(
        nextStatus === 'first_approval' ? '1st approval recorded' : 'Invoice fully approved',
        nextStatus === 'first_approval'
          ? `Switch to a 2nd board officer to complete two-person approval.`
          : `${inv.invoiceNumber} is ready for payment release.`,
        'success'
      );
      return { ok: true, message: nextStatus };
    }

    if (action === 'pay') {
      if (inv.status !== 'approved') {
        return { ok: false, message: 'Invoice must be fully approved before payment.' };
      }
      setState((prev) => ({
        ...prev,
        invoices: prev.invoices.map((i) =>
          i.id === invoiceId ? { ...i, status: 'paid', paidDate: TODAY_ISO } : i
        ),
        auditLog: appendAudit(
          prev,
          'Accounts Payable',
          `${inv.invoiceNumber} ($${inv.amount.toLocaleString()})`,
          'Payment Disbursed',
          `Paid from ${inv.fund.replace('_', ' ')} fund · Linked to ${inv.budgetCategory}`
        ),
      }));
      pushToast('Payment disbursed', `${inv.invoiceNumber} posted to ${inv.fund} fund & asset spend.`, 'success');
      return { ok: true, message: 'Paid' };
    }

    return { ok: false, message: 'Unknown action' };
  };

  const toggleInvoiceReconciled = (invoiceId: string) => {
    setState((prev) => {
      const inv = prev.invoices.find((i) => i.id === invoiceId);
      if (!inv) return prev;
      const next = !inv.bankReconciled;
      return {
        ...prev,
        invoices: prev.invoices.map((i) => (i.id === invoiceId ? { ...i, bankReconciled: next } : i)),
        auditLog: appendAudit(
          prev,
          'Bank Reconciliation',
          inv.invoiceNumber,
          next ? 'Marked Reconciled' : 'Unmarked Reconciled',
          `Bank statement match toggled by ${actor.name}`
        ),
      };
    });
  };

  const correctInvoiceNote = (invoiceId: string, reason: string) => {
    setState((prev) => {
      const inv = prev.invoices.find((i) => i.id === invoiceId);
      if (!inv) return prev;
      return {
        ...prev,
        invoices: prev.invoices.map((i) => (i.id === invoiceId ? { ...i, correctionNote: reason } : i)),
        auditLog: appendAudit(
          prev,
          'Accounts Payable',
          inv.invoiceNumber,
          'Non-Destructive Correction Note',
          reason
        ),
      };
    });
    pushToast('Correction logged', 'Original AP record preserved in audit trail.', 'warning');
  };

  // Governance
  const addDecision: CondoCoreContextValue['addDecision'] = (decData) => {
    const id = `dec-${Date.now()}`;
    const code = `DEC-2026-${15 + state.decisions.length}`;
    setState((prev) => ({
      ...prev,
      decisions: [{ ...decData, id, code }, ...prev.decisions],
      auditLog: appendAudit(
        prev,
        'Governance',
        `${code} · ${decData.title}`,
        `Decision Record Created (${decData.status})`,
        `Responsible: ${decData.personResponsible} · Follow-up: ${decData.followUpDate}`
      ),
    }));
    pushToast('Decision record created', code, 'success');
  };

  const updateDecisionStatus: CondoCoreContextValue['updateDecisionStatus'] = (decisionId, status, votes) => {
    setState((prev) => {
      const target = prev.decisions.find((d) => d.id === decisionId);
      if (!target) return prev;
      return {
        ...prev,
        decisions: prev.decisions.map((d) =>
          d.id === decisionId
            ? {
                ...d,
                status,
                ...(votes || {}),
              }
            : d
        ),
        auditLog: appendAudit(
          prev,
          'Governance',
          target.code,
          `Decision Status -> ${status.toUpperCase()}`,
          votes
            ? `Vote ${votes.voteFor}-${votes.voteAgainst}-${votes.voteAbstain}: ${votes.finalDecision}`
            : `Updated to ${status}`
        ),
      };
    });
    pushToast('Governance record updated', `Status moved to ${status}.`, 'success');
  };

  const correctDecision = (decisionId: string, reason: string, updatedFinalDecision: string) => {
    setState((prev) => {
      const target = prev.decisions.find((d) => d.id === decisionId);
      if (!target) return prev;
      return {
        ...prev,
        decisions: prev.decisions.map((d) =>
          d.id === decisionId
            ? {
                ...d,
                finalDecision: updatedFinalDecision,
                correctionHistory: [
                  ...(d.correctionHistory || []),
                  { date: TODAY_ISO, actor: actor.name, reason },
                ],
              }
            : d
        ),
        auditLog: appendAudit(
          prev,
          'Governance',
          target.code,
          'Decision Record Amended (Non-Destructive)',
          `Reason: ${reason}`
        ),
      };
    });
    pushToast('Decision amended', 'Original resolution preserved in correction history.', 'warning');
  };

  const toggleMeetingResidentVisibility = (meetingId: string) => {
    setState((prev) => {
      const mtg = prev.meetings.find((m) => m.id === meetingId);
      if (!mtg) return prev;
      const next = !mtg.approvedForResidents;
      return {
        ...prev,
        meetings: prev.meetings.map((m) =>
          m.id === meetingId
            ? {
                ...m,
                approvedForResidents: next,
                status: next && m.status === 'minutes_draft' ? 'minutes_approved' : m.status,
              }
            : m
        ),
        auditLog: appendAudit(
          prev,
          'Governance',
          mtg.title,
          next ? 'Approved Minutes for Residents' : 'Restricted Minutes to Board Only',
          `Changed resident visibility toggle.`
        ),
      };
    });
    pushToast('Meeting visibility updated', undefined, 'success');
  };

  const addDocument: CondoCoreContextValue['addDocument'] = (docData) => {
    setState((prev) => ({
      ...prev,
      documents: [
        {
          ...docData,
          id: `doc-${Date.now()}`,
          updatedAt: TODAY_ISO,
          previousVersions: [],
        },
        ...prev.documents,
      ],
      auditLog: appendAudit(
        prev,
        'Document Library',
        docData.title,
        'Document Indexed',
        `Category: ${docData.category} · Version ${docData.version} · Owner visible: ${docData.ownerVisible ? 'Yes' : 'Board Only'}`
      ),
    }));
    pushToast('Document added to library', docData.title, 'success');
  };

  const toggleTransitionItem = (itemId: string) => {
    setState((prev) => ({
      ...prev,
      transitionChecklist: prev.transitionChecklist.map((it) =>
        it.id === itemId ? { ...it, completed: !it.completed } : it
      ),
    }));
  };

  const updateApprovalThreshold = (threshold: number) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, twoPersonApprovalThreshold: threshold },
      auditLog: appendAudit(
        prev,
        'Controls',
        'Payment Approval Threshold',
        'Threshold Updated',
        `Two-person board approval now required for invoices >= $${threshold.toLocaleString()}`
      ),
    }));
    pushToast('Approval control updated', `Two-person threshold set to $${threshold.toLocaleString()}.`, 'success');
  };

  const updateAssociationSettings: CondoCoreContextValue['updateAssociationSettings'] = (patch) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
      auditLog: appendAudit(
        prev,
        'Settings',
        patch.name || prev.settings.name,
        'Association Settings Updated',
        `Updated configuration fields: ${Object.keys(patch).join(', ')}`
      ),
    }));
    pushToast('Building settings saved', 'Association profile and controls updated.', 'success');
  };

  const initializeWorkspaceFromWizard: CondoCoreContextValue['initializeWorkspaceFromWizard'] = (config) => {
    const unitCount = Math.max(1, Math.min(200, config.floorCount * config.unitsPerFloor));
    const generatedUnits: UnitRecord[] = [];
    const cleanDomain = config.domainOwned.replace(/^https?:\/\//, '') || 'association.org';
    for (let fl = 1; fl <= config.floorCount; fl++) {
      for (let idx = 1; idx <= config.unitsPerFloor; idx++) {
        const unitNumber = `${fl}${String(idx).padStart(2, '0')}`;
        let ownerName = `Unit ${unitNumber} Owner`;
        if (unitNumber === config.presidentUnit) ownerName = config.presidentName;
        else if (unitNumber === config.treasurerUnit) ownerName = config.treasurerName;
        else if (unitNumber === config.secretaryUnit) ownerName = config.secretaryName;
        else if (unitNumber === config.facilitiesUnit) ownerName = config.facilitiesName;
        generatedUnits.push({
          id: `u-${unitNumber}`,
          unitNumber,
          floor: fl,
          ownerName,
          ownerEmail: `unit${unitNumber}@${cleanDomain}`,
          ownerPhone: '(555) 010-0000',
          occupancy: 'owner_occupied',
          ownershipPct: Number((100 / unitCount).toFixed(2)),
          monthlyAssessment: config.defaultMonthlyAssessment,
          principalBalance: 0,
          lateFeeBalance: 0,
          daysPastDue: 0,
          delinquencyStage: 'current',
          transactions: [
            {
              id: `l-init-${unitNumber}`,
              date: TODAY_ISO,
              type: 'assessment',
              description: `Opening Ledger — Monthly Assessment ($${config.defaultMonthlyAssessment})`,
              principalDelta: config.defaultMonthlyAssessment,
              lateFeeDelta: 0,
              recordedBy: 'Onboarding Wizard',
            },
            {
              id: `l-paid-${unitNumber}`,
              date: TODAY_ISO,
              type: 'payment',
              description: 'Opening Balance Current',
              principalDelta: -config.defaultMonthlyAssessment,
              lateFeeDelta: 0,
              paymentMethod: 'ACH',
              recordedBy: 'Onboarding Wizard',
            },
          ],
        });
      }
    }

    const plans: FloorPlan[] = [];
    const addShell = (
      id: string,
      name: string,
      levelCode: string,
      areaDescription: string,
      key: FloorPlan['versions'][0]['builtInKey']
    ) => {
      const verId = `ver-${id}-1`;
      plans.push({
        id,
        name,
        levelCode,
        areaDescription,
        activeVersionId: verId,
        versions: [
          {
            id: verId,
            label: `Rev ${TODAY_ISO.slice(0, 7)} (Initial Baseline)`,
            date: TODAY_ISO,
            notes: `Initialized via Building Onboarding Wizard by ${config.presidentName}.`,
            builtInKey: key,
            scaleFeetPer10Pct: 10,
            calibrationLabel: 'Baseline Architectural Shell',
          },
        ],
        scannedSpaces: [],
      });
    };

    if (config.includePlans.includes('roof')) {
      addShell('plan-roof', 'Roof & Parapet Plan', 'ROOF', 'Main roof deck, parapet walls, drains, and rooftop mechanical.', 'roof');
    }
    if (config.includePlans.includes('mechanical')) {
      addShell('plan-mechanical', 'Mechanical & Utility Room', 'MECH', 'Central boiler/HVAC plant, fire riser, electrical switchgear, and domestic water.', 'mechanical');
    }
    if (config.includePlans.includes('typical_floor')) {
      addShell('plan-typical', 'Typical Residential Floor', 'FL-2+', 'Residential corridor, elevator core, stairs, and unit risers.', 'typical_floor');
    }
    if (config.includePlans.includes('ground_lobby')) {
      addShell('plan-ground', 'Ground Floor & Main Lobby', 'FL-1', 'Main entrance lobby, mailroom, exterior envelope, and site access.', 'ground_lobby');
    }
    if (config.includePlans.includes('garage')) {
      addShell('plan-garage', 'Garage & Parking Level', 'P-1', 'Parking bays, structural deck beams, entry gate, and drainage.', 'garage');
    }
    if (plans.length === 0) {
      addShell(
        'plan-scan-base',
        'Primary Building Level (Ready to Scan)',
        'FL-1',
        'Blank architectural canvas ready for Camera Spatial Scanning or drawing upload.',
        'scanned_custom'
      );
    }

    const monthlyRevenue = unitCount * config.defaultMonthlyAssessment;
    const annualOperating = Math.round(monthlyRevenue * 12 * 0.78);
    const annualReserve = Math.round(monthlyRevenue * 12 * 0.22);
    const currentYear = new Date().getFullYear();

    const newState: CondoCoreState = {
      settings: {
        name: config.associationName.trim(),
        address: config.address.trim(),
        unitCount,
        buildingType: config.buildingType,
        twoPersonApprovalThreshold: config.twoPersonApprovalThreshold,
        defaultMonthlyAssessment: config.defaultMonthlyAssessment,
        lateFeeAmount: config.lateFeeAmount,
        domainOwned: config.domainOwned.trim() || 'board.association.org',
        emergencyRecoveryEmail: config.emergencyRecoveryEmail.trim() || 'records@association.org',
        operatingOpeningCash: config.operatingOpeningCash,
        reserveOpeningCash: config.reserveOpeningCash,
        specialProjectOpeningCash: config.specialProjectOpeningCash,
        isDemoWorkspace: false,
      },
      boardMembers: [
        {
          id: 'bm-pres',
          name: config.presidentName.trim() || 'Board President',
          role: 'president',
          title: 'Board President',
          unitNumber: config.presidentUnit.trim() || '101',
          termStart: `${currentYear}-01-01`,
          termEnd: `${currentYear + 2}-12-31`,
          email: `president@${cleanDomain}`,
          phone: '(555) 010-1001',
          committees: ['Executive', 'Capital Planning'],
        },
        {
          id: 'bm-treas',
          name: config.treasurerName.trim() || 'Board Treasurer',
          role: 'treasurer',
          title: 'Treasurer',
          unitNumber: config.treasurerUnit.trim() || '102',
          termStart: `${currentYear}-01-01`,
          termEnd: `${currentYear + 2}-12-31`,
          email: `treasurer@${cleanDomain}`,
          phone: '(555) 010-1002',
          committees: ['Finance & Reserve'],
        },
        {
          id: 'bm-sec',
          name: config.secretaryName.trim() || 'Board Secretary',
          role: 'secretary',
          title: 'Secretary',
          unitNumber: config.secretaryUnit.trim() || '103',
          termStart: `${currentYear}-01-01`,
          termEnd: `${currentYear + 1}-12-31`,
          email: `secretary@${cleanDomain}`,
          phone: '(555) 010-1003',
          committees: ['Governance & Records'],
        },
        {
          id: 'bm-dir',
          name: config.facilitiesName.trim() || 'Facilities Director',
          role: 'board_member',
          title: 'Board Member (Facilities)',
          unitNumber: config.facilitiesUnit.trim() || '104',
          termStart: `${currentYear}-01-01`,
          termEnd: `${currentYear + 1}-12-31`,
          email: `facilities@${cleanDomain}`,
          phone: '(555) 010-1004',
          committees: ['Building Envelope & Mechanical'],
        },
      ],
      floorPlans: plans,
      assets: [],
      inspections: [],
      workOrders: [],
      vendors: [],
      units: generatedUnits,
      specialAssessments: [],
      invoices: [],
      budgetLines:
        config.mode === 'guided'
          ? [
              {
                id: 'bgt-1',
                category: 'Roofing & Exterior Envelope',
                fund: 'operating',
                annualBudget: Math.round(annualOperating * 0.14),
                ytdBudget: Math.round(annualOperating * 0.14 * 0.5),
                priorPaidAmount: 0,
              },
              {
                id: 'bgt-2',
                category: 'HVAC & Mechanical Maintenance',
                fund: 'operating',
                annualBudget: Math.round(annualOperating * 0.18),
                ytdBudget: Math.round(annualOperating * 0.18 * 0.5),
                priorPaidAmount: 0,
              },
              {
                id: 'bgt-3',
                category: 'Building Insurance & Utilities',
                fund: 'operating',
                annualBudget: Math.round(annualOperating * 0.36),
                ytdBudget: Math.round(annualOperating * 0.36 * 0.5),
                priorPaidAmount: 0,
              },
              {
                id: 'bgt-4',
                category: 'General Building Maintenance',
                fund: 'operating',
                annualBudget: Math.round(annualOperating * 0.32),
                ytdBudget: Math.round(annualOperating * 0.32 * 0.5),
                priorPaidAmount: 0,
              },
              {
                id: 'bgt-5',
                category: 'Capital Reserve Contributions',
                fund: 'reserve',
                annualBudget: annualReserve,
                ytdBudget: Math.round(annualReserve * 0.5),
                priorPaidAmount: 0,
              },
            ]
          : [],
      capitalProjects: [],
      decisions: [],
      meetings: [],
      documents: [],
      announcements: [
        {
          id: `ann-init-${Date.now()}`,
          title: `Welcome to ${config.associationName.trim()} Board Portal`,
          date: TODAY_ISO,
          category: 'Meeting',
          body: `The board has initialized the association-owned operating record for ${config.associationName.trim()}. Residents can view approved minutes, governing documents, and submit maintenance requests here.`,
          postedBy: config.presidentName.trim() || 'Board President',
        },
      ],
      architecturalRequests: [],
      transitionChecklist: [
        {
          id: 'tr-1',
          category: 'Building Map',
          title: 'Upload existing architectural drawings or scan spaces with mobile camera',
          ownerRole: 'Facilities Director',
          completed: false,
          notes: 'Use Building Map > Scan Space with Camera or Upload Plan.',
        },
        {
          id: 'tr-2',
          category: 'Asset Registry',
          title: 'Pin primary building systems (roof, boiler/HVAC, fire panel, shutoff valves)',
          ownerRole: 'Facilities Director',
          completed: false,
          notes: 'Attach install years, warranties, and reserve replacement estimates.',
        },
        {
          id: 'tr-3',
          category: 'Vendors',
          title: 'Enter active service vendors with Certificate of Insurance expiration dates',
          ownerRole: 'Board President',
          completed: false,
          notes: 'Enables automatic 30-day COI expiration warnings.',
        },
        {
          id: 'tr-4',
          category: 'Financials',
          title: 'Verify opening operating & reserve bank balances with Treasurer',
          ownerRole: 'Treasurer',
          completed: config.operatingOpeningCash > 0 || config.reserveOpeningCash > 0,
          notes: 'Confirm two-person invoice approval threshold.',
        },
        {
          id: 'tr-5',
          category: 'Governance',
          title: 'Upload Declaration, Bylaws, and current Insurance Policy to Document Library',
          ownerRole: 'Secretary',
          completed: false,
          notes: 'Mark resident-facing governing documents as Owner Visible.',
        },
      ],
      auditLog: [
        {
          id: `aud-init-${Date.now()}`,
          timestamp: nowTimestamp(),
          actorName: config.presidentName.trim() || 'Board President',
          actorRole: 'president',
          module: 'Onboarding',
          entityLabel: config.associationName.trim(),
          action: 'Building Workspace Initialized',
          details: `${unitCount} units across ${config.floorCount} floors · Approval threshold $${config.twoPersonApprovalThreshold.toLocaleString()} · Opening Operating $${config.operatingOpeningCash.toLocaleString()} / Reserve $${config.reserveOpeningCash.toLocaleString()}`,
        },
      ],
    };

    setState(newState);
    setActiveRoleState('president');
    setSelectedPlanId(plans[0].id);
    setOpenAssetId(null);
    setOpenWorkOrderId(null);
    setOpenVendorId(null);
    setShowOnboardingWizard(false);

    if (config.launchScannerAfter) {
      setActiveTab('map');
      setOpenScannerOnMap(true);
    } else {
      setActiveTab('today');
    }

    pushToast(
      `${config.associationName} workspace ready`,
      `${unitCount} units & ${plans.length} floorplan${plans.length === 1 ? '' : 's'} configured.`,
      'success'
    );
  };

  const importWorkspaceJson: CondoCoreContextValue['importWorkspaceJson'] = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString) as CondoCoreState;
      if (!parsed || !parsed.settings || !Array.isArray(parsed.floorPlans) || !Array.isArray(parsed.units)) {
        return { ok: false, message: 'Invalid CondoCore archive format. Missing required workspace collections.' };
      }
      setState(normalizeWorkspaceState(parsed));
      setActiveRoleState('president');
      if (parsed.floorPlans[0]) setSelectedPlanId(parsed.floorPlans[0].id);
      setOpenAssetId(null);
      setOpenWorkOrderId(null);
      setOpenVendorId(null);
      pushToast('Workspace archive imported', `Loaded ${parsed.settings.name}`, 'success');
      return { ok: true, message: `Imported ${parsed.settings.name} successfully.` };
    } catch {
      return { ok: false, message: 'Could not parse JSON archive. Please select a valid CondoCore export file.' };
    }
  };

  const submitArchitecturalRequest: CondoCoreContextValue['submitArchitecturalRequest'] = (req) => {
    setState((prev) => ({
      ...prev,
      architecturalRequests: [
        {
          ...req,
          id: `arc-${Date.now()}`,
          submittedDate: TODAY_ISO,
          status: 'submitted',
        },
        ...prev.architecturalRequests,
      ],
      auditLog: appendAudit(
        prev,
        'Resident Portal',
        `Unit ${req.unitNumber} · ARC`,
        'Architectural Request Submitted',
        req.title
      ),
    }));
    pushToast('Architectural request submitted', 'Sent to the Board for review.', 'success');
  };

  const resetWorkspace = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_SEED_STATE);
    setActiveRoleState('president');
    setActiveTab('today');
    setSelectedPlanId('plan-roof');
    setOpenAssetId(null);
    setOpenWorkOrderId(null);
    setOpenVendorId(null);
    pushToast('Demo workspace restored', 'Reset to The Alderwood Condominiums baseline records.', 'neutral');
  };

  const value = useMemo<CondoCoreContextValue>(
    () => ({
      state,
      activeRole,
      actor,
      setActiveRole,
      activeTab,
      setActiveTab,
      selectedPlanId,
      setSelectedPlanId,
      openAssetId,
      setOpenAssetId,
      openWorkOrderId,
      setOpenWorkOrderId,
      openVendorId,
      setOpenVendorId,
      showOnboardingWizard,
      setShowOnboardingWizard,
      openScannerOnMap,
      setOpenScannerOnMap,
      toasts,
      pushToast,
      dismissToast,
      getAssetCumulativeSpend,
      getVendorFlags,
      getFundBalances,
      getBudgetActual,
      canWriteBoard,
      isBoardOfficer,
      selectPlanVersion,
      uploadFloorPlan,
      addAssetPin,
      updateAssetCondition,
      attachAssetPhoto,
      attachAssetDocument,
      addScannedSpaceToPlan,
      createPlanFromScannedSpaces,
      promoteScannedObjectToAsset,
      savePlanDraftElements,
      createBlankManualPlan,
      promoteDraftElementToAsset,
      createInspectionFromTemplate,
      updateInspectionChecklistItem,
      completeInspection,
      escalateChecklistItemToWorkOrder,
      createWorkOrder,
      updateWorkOrder,
      addWorkOrderNote,
      submitVendorInvoiceForWorkOrder,
      recordWorkOrderResolutionAndClose,
      addVendor,
      updateVendorCompliance,
      recordUnitPayment,
      recordUnitCorrection,
      updateUnitDelinquency,
      addSpecialAssessment,
      approveSpecialAssessment,
      createInvoice,
      advanceInvoiceStatus,
      toggleInvoiceReconciled,
      correctInvoiceNote,
      addDecision,
      updateDecisionStatus,
      correctDecision,
      toggleMeetingResidentVisibility,
      addDocument,
      toggleTransitionItem,
      updateApprovalThreshold,
      updateAssociationSettings,
      initializeWorkspaceFromWizard,
      importWorkspaceJson,
      submitArchitecturalRequest,
      resetWorkspace,
    }),
    [
      state,
      activeRole,
      actor,
      activeTab,
      selectedPlanId,
      openAssetId,
      openWorkOrderId,
      openVendorId,
      showOnboardingWizard,
      openScannerOnMap,
      toasts,
    ]
  );

  return <CondoCoreContext.Provider value={value}>{children}</CondoCoreContext.Provider>;
}

export function useCondoCore() {
  const ctx = useContext(CondoCoreContext);
  if (!ctx) throw new Error('useCondoCore must be used inside CondoCoreProvider');
  return ctx;
}
