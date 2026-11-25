export type UserRole =
  | 'president'
  | 'treasurer'
  | 'secretary'
  | 'board_member'
  | 'resident'
  | 'vendor'
  | 'auditor';

export interface ActiveActor {
  role: UserRole;
  name: string;
  title: string;
  unitNumber?: string;
  vendorId?: string;
}

export type HealthStatus = 'green' | 'yellow' | 'red';

export type AssetCategory =
  | 'Roof'
  | 'Boiler & HVAC'
  | 'Elevator'
  | 'Fire & Sprinkler'
  | 'Plumbing & Valves'
  | 'Electrical & Meters'
  | 'Exterior & Masonry'
  | 'Garage & Structure'
  | 'Drain & Water'
  | 'Safety & Hazard';

export type PlanBuiltInKey =
  | 'roof'
  | 'mechanical'
  | 'typical_floor'
  | 'ground_lobby'
  | 'garage'
  | 'scanned_custom'
  | 'manual_draft';

export type DraftElementCategory =
  | 'structure'
  | 'openings'
  | 'circulation'
  | 'systems'
  | 'exterior'
  | 'furniture'
  | 'annotations';

export type DraftElementKind =
  | 'room'
  | 'wall'
  | 'corridor'
  | 'unit_box'
  | 'column'
  | 'balcony'
  | 'door_swing'
  | 'double_door'
  | 'sliding_door'
  | 'window'
  | 'garage_gate'
  | 'stairs'
  | 'elevator'
  | 'ladder'
  | 'ramp'
  | 'boiler_hvac'
  | 'water_valve'
  | 'electrical_panel'
  | 'fire_riser'
  | 'roof_drain'
  | 'meter_bank'
  | 'parking_stall'
  | 'courtyard_tree'
  | 'walkway'
  | 'desk_table'
  | 'sofa'
  | 'bed'
  | 'kitchen_counter'
  | 'storage_rack'
  | 'workbench'
  | 'zone_callout'
  | 'dimension_line'
  | 'text_label';

export interface FloorPlanElement {
  id: string;
  kind: DraftElementKind;
  category: DraftElementCategory;
  label: string;
  // Architectural viewBox units (canvas is 1000 x 620)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  fillColor?: string;
  strokeColor?: string;
  notes?: string;
  locked?: boolean;
  groupId?: string;
  promotedAssetId?: string;
}

export type ScannedObjectType =
  | 'door'
  | 'window'
  | 'stairs'
  | 'ladder'
  | 'furniture'
  | 'appliance'
  | 'boiler_hvac'
  | 'plumbing_valve'
  | 'electrical_panel'
  | 'fire_safety'
  | 'fixture'
  | 'other';

export interface ScannedObject {
  id: string;
  name: string;
  objectType: ScannedObjectType;
  xPct: number;
  yPct: number;
  widthFt: number;
  depthFt: number;
  wallSide: 'north' | 'south' | 'east' | 'west' | 'center';
  notes?: string;
  promotedAssetId?: string;
}

export interface ScannedSpace {
  id: string;
  name: string;
  roomType: string;
  widthFt: number;
  lengthFt: number;
  ceilingHeightFt: number;
  areaSqFt: number;
  planX: number; // 0-100 top-left X on floorplan canvas
  planY: number; // 0-100 top-left Y on floorplan canvas
  planWidthPct: number;
  planHeightPct: number;
  scannedAt: string;
  capturedPhotoUrl?: string;
  confidenceNotes: string;
  objects: ScannedObject[];
}

export interface PlanVersion {
  id: string;
  label: string;
  date: string;
  notes: string;
  builtInKey?: PlanBuiltInKey;
  uploadedImageUrl?: string;
  scaleFeetPer10Pct?: number; // e.g., 10% of plan width = X feet
  calibrationLabel?: string;
}

export interface FloorPlan {
  id: string;
  name: string;
  levelCode: string;
  areaDescription: string;
  activeVersionId: string;
  versions: PlanVersion[];
  scannedSpaces?: ScannedSpace[];
  draftElements?: FloorPlanElement[];
  draftScalePxPerFoot?: number;
  underlayOpacity?: number;
}

export interface AssetPhoto {
  id: string;
  url: string;
  caption: string;
  date: string;
  uploadedBy: string;
}

export interface AssetDocumentRef {
  id: string;
  title: string;
  type: 'Warranty' | 'Inspection Report' | 'Bid' | 'Manual' | 'Permit' | 'Invoice';
  date: string;
  summary: string;
}

export interface BuildingAsset {
  id: string;
  code: string;
  name: string;
  planId: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  category: AssetCategory;
  condition: HealthStatus;
  locationDetail: string;
  installYear: number;
  usefulLifeYears: number;
  replacementEstimate: number;
  plannedReplacementYear: number;
  reserveCategory: string;
  budgetCategory: string;
  vendorId?: string;
  warrantyExpiry?: string;
  warrantySummary?: string;
  lastInspectionDate?: string;
  nextInspectionDue?: string;
  historicalSpendBeforeSystem: number;
  photos: AssetPhoto[];
  attachments: AssetDocumentRef[];
  notes: string;
}

export type InspectionTemplateType =
  | 'Roof'
  | 'Boiler and HVAC'
  | 'Elevator'
  | 'Fire Alarm and Sprinkler'
  | 'Plumbing'
  | 'Electrical'
  | 'Garage'
  | 'Masonry and Exterior Envelope'
  | 'Common-Area Safety'
  | 'Seasonal Opening and Closing';

export type ChecklistResult = 'pending' | 'pass' | 'needs_attention' | 'fail';

export interface InspectionChecklistItem {
  id: string;
  label: string;
  result: ChecklistResult;
  measurement?: string;
  measurementUnit?: string;
  recommendedAction?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost?: number;
  escalatedIssueId?: string;
  photoUrl?: string;
}

export interface InspectionRecord {
  id: string;
  title: string;
  templateType: InspectionTemplateType;
  assetId: string;
  planId: string;
  vendorId?: string;
  inspectorName: string;
  scheduledDate: string;
  completedDate?: string;
  dueDate: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  boardApprovalStatus: 'not_required' | 'pending_review' | 'approved';
  summary: string;
  reportTitle?: string;
  items: InspectionChecklistItem[];
}

export type IssueClassification =
  | 'unclassified'
  | 'emergency'
  | 'maintenance'
  | 'insurance'
  | 'capital'
  | 'resident_responsibility';

export type WorkOrderStatus =
  | 'triage'
  | 'dispatched'
  | 'in_progress'
  | 'awaiting_invoice'
  | 'awaiting_verification'
  | 'closed';

export interface WorkOrderNote {
  id: string;
  date: string;
  author: string;
  role: string;
  text: string;
  internalOnly?: boolean;
}

export interface IssueWorkOrder {
  id: string;
  code: string;
  title: string;
  description: string;
  assetId?: string;
  planId: string;
  x: number;
  y: number;
  category: AssetCategory;
  source: 'resident' | 'inspection' | 'board';
  reportedByName: string;
  reportedByUnit?: string;
  preferredContact?: string;
  permissionToEnter?: boolean;
  urgency: 'routine' | 'soon' | 'urgent' | 'emergency';
  classification: IssueClassification;
  status: WorkOrderStatus;
  unreadByBoard?: boolean;
  createdAt: string;
  dueDate?: string;
  vendorId?: string;
  vendorFindings?: string;
  estimatedCost?: number;
  invoiceId?: string;
  followUpInspectionId?: string;
  photos: AssetPhoto[];
  resolutionProof?: {
    type: 'photo' | 'inspection';
    reference: string;
    recordedAt: string;
    recordedBy: string;
    photoUrl?: string;
  };
  notes: WorkOrderNote[];
}

export interface VendorSLA {
  serviceTrigger?: string;
  responseRequirement?: string;
  materialPolicy?: string;
  serviceArea?: string;
}

export interface Vendor {
  id: string;
  company: string;
  services: string[];
  primaryContact: string;
  phone: string;
  email: string;
  emergencyContact: string;
  emergencyPhone: string;
  contractStart: string;
  contractEnd: string;
  contractScope: string;
  contractAnnualCap: number;
  renewalTerms: string;
  coiPolicyNumber: string;
  coiCoverageAmount: number;
  coiExpiry: string;
  licenseNumber: string;
  w9OnFile: boolean;
  paymentMethod: 'ACH' | 'Check';
  recurringSchedule: string;
  missedServicesCount: number;
  sla: VendorSLA;
  boardRating: number; // 1-5
  confidentialBoardNotes: string;
}

export type DelinquencyStage =
  | 'current'
  | '30d_notice'
  | '60d_demand'
  | 'payment_plan'
  | 'legal_lien';

export interface LedgerTransaction {
  id: string;
  date: string;
  type: 'assessment' | 'special_assessment' | 'late_fee' | 'payment' | 'correction';
  description: string;
  principalDelta: number;
  lateFeeDelta: number;
  paymentMethod?: 'ACH' | 'Card' | 'Check' | 'Correction';
  correctionOfId?: string;
  correctionReason?: string;
  recordedBy: string;
}

export interface UnitRecord {
  id: string;
  unitNumber: string;
  floor: number;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  occupancy: 'owner_occupied' | 'tenant_occupied';
  tenantName?: string;
  ownershipPct: number;
  monthlyAssessment: number;
  principalBalance: number;
  lateFeeBalance: number;
  delinquencyStage: DelinquencyStage;
  daysPastDue: number;
  paymentPlanNote?: string;
  transactions: LedgerTransaction[];
}

export type FundType = 'operating' | 'reserve' | 'special_project';

export type InvoiceStatus =
  | 'draft'
  | 'received'
  | 'first_approval'
  | 'approved'
  | 'paid'
  | 'rejected';

export interface InvoiceApproval {
  actorName: string;
  role: UserRole;
  timestamp: string;
  note?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  workOrderId?: string;
  assetId?: string;
  description: string;
  fund: FundType;
  budgetCategory: string;
  amount: number;
  receivedDate: string;
  dueDate: string;
  paidDate?: string;
  status: InvoiceStatus;
  approvals: InvoiceApproval[];
  bankReconciled: boolean;
  correctionNote?: string;
}

export interface BudgetLine {
  id: string;
  category: string;
  fund: FundType;
  annualBudget: number;
  ytdBudget: number;
  priorPaidAmount: number;
}

export interface SpecialAssessment {
  id: string;
  title: string;
  purpose: string;
  totalAmount: number;
  perUnitAverage: number;
  dueDate: string;
  status: 'proposed' | 'board_approved';
  linkedDecisionId?: string;
  linkedProjectId?: string;
}

export interface CapitalProject {
  id: string;
  name: string;
  assetId: string;
  fund: FundType;
  approvedBudget: number;
  actualSpent: number;
  targetCompletion: string;
  scheduleStatus: 'on_track' | 'behind_schedule';
  completionPct: number;
  vendorId?: string;
  notes: string;
}

export interface BoardMember {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  unitNumber: string;
  termStart: string;
  termEnd: string;
  email: string;
  phone: string;
  committees: string[];
}

export interface DecisionBid {
  vendorName: string;
  amount: number;
  notes: string;
}

export interface GovernanceDecision {
  id: string;
  code: string;
  title: string;
  date: string;
  status: 'draft' | 'proposed' | 'approved' | 'completed';
  issueSummary: string;
  relevantDocuments: string[];
  optionsConsidered: string[];
  vendorBids: DecisionBid[];
  motionText: string;
  voteFor: number;
  voteAgainst: number;
  voteAbstain: number;
  finalDecision: string;
  personResponsible: string;
  followUpDate: string;
  linkedAssetId?: string;
  correctionHistory?: { date: string; actor: string; reason: string }[];
}

export interface BoardMeeting {
  id: string;
  title: string;
  date: string;
  status: 'upcoming' | 'minutes_draft' | 'minutes_approved';
  agendaItems: string[];
  minutesSummary: string;
  approvedForResidents: boolean;
}

export interface AssociationDocument {
  id: string;
  title: string;
  category: 'Governing' | 'Financial' | 'Insurance' | 'Inspection' | 'Reserve Study' | 'Rules & Policies';
  version: string;
  updatedAt: string;
  ownerVisible: boolean;
  fileSize: string;
  searchableText: string;
  linkedAssetId?: string;
  previousVersions: { version: string; date: string; note: string }[];
}

export interface TransitionItem {
  id: string;
  category: string;
  title: string;
  ownerRole: string;
  completed: boolean;
  notes: string;
}

export interface Announcement {
  id: string;
  title: string;
  date: string;
  category: 'Maintenance' | 'Meeting' | 'Financial' | 'Safety';
  body: string;
  postedBy: string;
}

export interface ArchitecturalRequest {
  id: string;
  unitNumber: string;
  ownerName: string;
  title: string;
  description: string;
  submittedDate: string;
  status: 'submitted' | 'under_review' | 'approved' | 'conditions_required';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  module: string;
  entityLabel: string;
  action: string;
  details: string;
}

export interface AssociationSettings {
  name: string;
  address: string;
  buildingType?: string;
  unitCount: number;
  defaultMonthlyAssessment?: number;
  lateFeeAmount?: number;
  twoPersonApprovalThreshold: number;
  operatingOpeningCash: number;
  reserveOpeningCash: number;
  specialProjectOpeningCash: number;
  emergencyRecoveryEmail: string;
  domainOwned: string;
  isDemoWorkspace?: boolean;
}

export interface OnboardingWizardConfig {
  mode: 'blank' | 'guided';
  associationName: string;
  address: string;
  buildingType: string;
  domainOwned: string;
  emergencyRecoveryEmail: string;
  floorCount: number;
  unitsPerFloor: number;
  defaultMonthlyAssessment: number;
  lateFeeAmount: number;
  operatingOpeningCash: number;
  reserveOpeningCash: number;
  specialProjectOpeningCash: number;
  twoPersonApprovalThreshold: number;
  presidentName: string;
  presidentUnit: string;
  treasurerName: string;
  treasurerUnit: string;
  secretaryName: string;
  secretaryUnit: string;
  facilitiesName: string;
  facilitiesUnit: string;
  includePlans: ('roof' | 'mechanical' | 'typical_floor' | 'ground_lobby' | 'garage')[];
  launchScannerAfter?: boolean;
}

export interface CondoCoreState {
  settings: AssociationSettings;
  floorPlans: FloorPlan[];
  assets: BuildingAsset[];
  inspections: InspectionRecord[];
  workOrders: IssueWorkOrder[];
  vendors: Vendor[];
  units: UnitRecord[];
  invoices: Invoice[];
  budgetLines: BudgetLine[];
  specialAssessments: SpecialAssessment[];
  capitalProjects: CapitalProject[];
  boardMembers: BoardMember[];
  decisions: GovernanceDecision[];
  meetings: BoardMeeting[];
  documents: AssociationDocument[];
  transitionChecklist: TransitionItem[];
  announcements: Announcement[];
  architecturalRequests: ArchitecturalRequest[];
  auditLog: AuditLogEntry[];
}

export type BoardNavTab =
  | 'today'
  | 'map'
  | 'inspections'
  | 'vendors'
  | 'financials'
  | 'governance'
  | 'help'
  | 'settings';
