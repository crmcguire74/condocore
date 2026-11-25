import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Camera,
  Crosshair,
  History,
  Layers,
  LayoutGrid,
  Pencil,
  Pin,
  Plus,
  Ruler,
  ScanLine,
  Upload,
  X,
} from 'lucide-react';
import { useCondoCore } from '../store/CondoCoreContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AssetCategory, FloorPlanElement, HealthStatus } from '../types/condocore';
import { STARTER_LAYOUT_TEMPLATES } from '../data/floorplanStencils';
import { formatCurrency, formatDateShort } from '../utils/exports';
import { FloorplanCanvas } from './FloorplanCanvas';
import { FloorplanBuilderStudio } from './FloorplanBuilderStudio';
import { SpaceScannerModal } from './SpaceScannerModal';
import { HealthText } from './StatusIndicator';
import {
  InteractiveTable,
  sortRows,
  TableColumnDef,
  useInteractiveTable,
} from './InteractiveTable';

type AssetTableColKey =
  | 'asset'
  | 'level'
  | 'condition'
  | 'reserveCategory'
  | 'spend'
  | 'replacement'
  | 'nextInspection';

const ASSET_TABLE_COLUMNS: TableColumnDef<AssetTableColKey>[] = [
  { key: 'asset', label: 'Code & Asset', widthClass: 'w-[28%]', minWidth: 200 },
  { key: 'level', label: 'Plan Level', widthClass: 'w-[10%]', minWidth: 95 },
  { key: 'condition', label: 'Condition', widthClass: 'w-[11%]', minWidth: 105 },
  { key: 'reserveCategory', label: 'Reserve Category', widthClass: 'w-[16%]', minWidth: 135 },
  { key: 'spend', label: 'Cumulative Spend', align: 'right', widthClass: 'w-[12%]', minWidth: 120 },
  { key: 'replacement', label: 'Replacement Est.', align: 'right', widthClass: 'w-[13%]', minWidth: 135 },
  { key: 'nextInspection', label: 'Next Inspection', align: 'right', widthClass: 'w-[10%]', minWidth: 115 },
];

const ALL_CATEGORIES: AssetCategory[] = [
  'Roof',
  'Boiler & HVAC',
  'Elevator',
  'Fire & Sprinkler',
  'Plumbing & Valves',
  'Electrical & Meters',
  'Exterior & Masonry',
  'Garage & Structure',
  'Drain & Water',
  'Safety & Hazard',
];

export function BuildingMapView() {
  const {
    state,
    selectedPlanId,
    setSelectedPlanId,
    openAssetId,
    setOpenAssetId,
    setOpenWorkOrderId,
    getAssetCumulativeSpend,
    canWriteBoard,
    selectPlanVersion,
    uploadFloorPlan,
    addAssetPin,
    promoteScannedObjectToAsset,
    savePlanDraftElements,
    createBlankManualPlan,
    promoteDraftElementToAsset,
    openScannerOnMap,
    setOpenScannerOnMap,
  } = useCondoCore();

  const { isMobilePWA, isInstalled } = usePWAInstall();

  const assetTable = useInteractiveTable<AssetTableColKey>(ASSET_TABLE_COLUMNS);

  const sortedAllAssets = useMemo(() => {
    const condRank: Record<HealthStatus, number> = { red: 0, yellow: 1, green: 2 };
    return sortRows(state.assets, assetTable.sort, (asset, key) => {
      const p = state.floorPlans.find((fp) => fp.id === asset.planId);
      switch (key) {
        case 'asset':
          return `${asset.code} ${asset.name}`;
        case 'level':
          return p?.levelCode || '';
        case 'condition':
          return condRank[asset.condition];
        case 'reserveCategory':
          return asset.reserveCategory;
        case 'spend':
          return getAssetCumulativeSpend(asset.id);
        case 'replacement':
          return asset.replacementEstimate;
        case 'nextInspection':
          return asset.nextInspectionDue;
        default:
          return '';
      }
    });
  }, [state.assets, state.floorPlans, assetTable.sort, getAssetCumulativeSpend]);

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [placePinMode, setPlacePinMode] = useState(false);
  const [studioMode, setStudioMode] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showNewManualModal, setShowNewManualModal] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null);

  // New Manual Floorplan Modal state
  const [manualName, setManualName] = useState('');
  const [manualLevelCode, setManualLevelCode] = useState('FL-2');
  const [manualDesc, setManualDesc] = useState('');
  const [manualScale, setManualScale] = useState('10');
  const [manualTemplateId, setManualTemplateId] = useState('blank');

  useEffect(() => {
    if (openScannerOnMap) {
      setShowScannerModal(true);
      setOpenScannerOnMap(false);
    }
  }, [openScannerOnMap, setOpenScannerOnMap]);

  // New pin modal fields
  const [pinName, setPinName] = useState('');
  const [pinCategory, setPinCategory] = useState<AssetCategory>('Roof');
  const [pinCondition, setPinCondition] = useState<HealthStatus>('yellow');
  const [pinLocation, setPinLocation] = useState('');
  const [pinInstallYear, setPinInstallYear] = useState('2018');
  const [pinUsefulLife, setPinUsefulLife] = useState('20');
  const [pinReplacementCost, setPinReplacementCost] = useState('15000');
  const [pinReserveCat, setPinReserveCat] = useState('Roofing & Waterproofing');
  const [pinVendorId, setPinVendorId] = useState('');
  const [pinNotes, setPinNotes] = useState('');

  // Upload & Calibrate Plan Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<string>('new');
  const [newPlanName, setNewPlanName] = useState('');
  const [newLevelCode, setNewLevelCode] = useState('SITE');
  const [versionLabel, setVersionLabel] = useState('Rev 2026-11 (Board Upload)');
  const [versionNotes, setVersionNotes] = useState('');
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [calPointA, setCalPointA] = useState<{ x: number; y: number } | null>(null);
  const [calPointB, setCalPointB] = useState<{ x: number; y: number } | null>(null);
  const [calFeet, setCalFeet] = useState('40');
  const calContainerRef = useRef<HTMLDivElement>(null);

  const activePlan =
    state.floorPlans.find((p) => p.id === selectedPlanId) || state.floorPlans[0];

  const planAssets = state.assets.filter(
    (a) =>
      a.planId === activePlan.id &&
      (categoryFilter === 'All' || a.category === categoryFilter)
  );

  const handleDropCoords = (x: number, y: number) => {
    setPendingCoords({ x, y });
    setPlacePinMode(false);
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingCoords || !pinName.trim()) return;
    const installYr = Number(pinInstallYear) || 2020;
    const lifeYrs = Number(pinUsefulLife) || 20;
    addAssetPin({
      name: pinName.trim(),
      planId: activePlan.id,
      x: pendingCoords.x,
      y: pendingCoords.y,
      category: pinCategory,
      condition: pinCondition,
      locationDetail: pinLocation.trim() || `${activePlan.name} (${pendingCoords.x}%, ${pendingCoords.y}%)`,
      installYear: installYr,
      usefulLifeYears: lifeYrs,
      replacementEstimate: Number(pinReplacementCost) || 10000,
      plannedReplacementYear: installYr + lifeYrs,
      reserveCategory: pinReserveCat.trim() || 'General Building Reserves',
      budgetCategory: 'General Building Maintenance',
      vendorId: pinVendorId || undefined,
      notes: pinNotes.trim() || 'Added directly via interactive floorplan pin.',
    });
    setPendingCoords(null);
    setPinName('');
    setPinLocation('');
    setPinNotes('');
  };

  const handlePlanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedPreview(reader.result);
        setCalPointA(null);
        setCalPointB(null);
        if (!newPlanName) setNewPlanName(file.name.replace(/\.[^.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCalibrationClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!calContainerRef.current) return;
    const rect = calContainerRef.current.getBoundingClientRect();
    const pt = {
      x: Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(1)),
      y: Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(1)),
    };
    if (!calPointA || (calPointA && calPointB)) {
      setCalPointA(pt);
      setCalPointB(null);
    } else {
      setCalPointB(pt);
    }
  };

  const handleSaveUploadedPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedPreview) return;
    let scaleFeetPer10Pct = 12;
    let calibrationLabel = 'Uncalibrated reference';
    if (calPointA && calPointB && Number(calFeet) > 0) {
      const distPct = Math.hypot(calPointB.x - calPointA.x, calPointB.y - calPointA.y);
      if (distPct > 1) {
        scaleFeetPer10Pct = Number(((Number(calFeet) / distPct) * 10).toFixed(1));
        calibrationLabel = `Calibrated · ${scaleFeetPer10Pct} ft / grid unit`;
      }
    }
    uploadFloorPlan({
      targetPlanId: uploadTarget,
      newPlanName: newPlanName.trim() || 'Uploaded Architectural Plan',
      newLevelCode: newLevelCode.trim() || 'UP',
      areaDescription: versionNotes.trim() || 'Uploaded by Board from existing drawings',
      versionLabel: versionLabel.trim() || 'Rev 2026-11',
      notes: versionNotes.trim() || 'Imported existing drawing and calibrated in browser.',
      imageUrl: uploadedPreview,
      scaleFeetPer10Pct,
      calibrationLabel,
    });
    setShowUploadModal(false);
    setUploadedPreview(null);
    setNewPlanName('');
    setVersionNotes('');
  };

  const handleCreateManualPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const tpl = STARTER_LAYOUT_TEMPLATES.find((t) => t.id === manualTemplateId);
    const stampedElements: FloorPlanElement[] = (tpl?.elements || []).map((el, i) => ({
      ...el,
      id: `el-init-${Date.now()}-${i}`,
    }));
    createBlankManualPlan({
      planName: manualName.trim() || tpl?.name || 'Custom Floorplan',
      levelCode: manualLevelCode.trim() || tpl?.levelCode || 'DRFT',
      areaDescription:
        manualDesc.trim() ||
        tpl?.subtitle ||
        'Manually drafted drag-and-drop architectural floorplan',
      scalePxPerFoot: Number(manualScale) || 10,
      initialElements: stampedElements,
    });
    setShowNewManualModal(false);
    setManualName('');
    setManualDesc('');
    setStudioMode(true);
  };

  return (
    <div className="flex flex-col lg:h-full lg:min-h-0 gap-4 sm:gap-5">
      {/* Pinned Top Header & Controls (Never Scrolls Away on Desktop) */}
      <div className="shrink-0 space-y-3.5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-[#111318]">
              Building Map &amp; Asset Registry
            </h1>
            <p className="text-xs sm:text-[13px] text-[#525866] mt-0.5">
              Drag and drop elements to draft or supplement any floorplan, scan spaces with your camera, or inspect pinned building assets.
            </p>
          </div>

          {canWriteBoard && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPlacePinMode(false);
                  setStudioMode((v) => !v);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap min-h-[38px] ${
                  studioMode
                    ? 'bg-[#111318] text-white rounded-xl shadow-sm'
                    : 'arch-btn-primary'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                {studioMode ? 'Exit Floorplan Studio' : 'Edit / Build Floorplan'}
              </button>

              {!studioMode && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowNewManualModal(true)}
                    className="arch-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium whitespace-nowrap min-h-[38px]"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-[#1C4ED8]" />
                    New Manual Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowScannerModal(true)}
                    className="arch-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium whitespace-nowrap min-h-[38px]"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#1C4ED8]" />
                    {isMobilePWA || isInstalled ? 'Scan Space (PWA)' : 'Scan Space'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlacePinMode((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap min-h-[38px] ${
                      placePinMode
                        ? 'bg-[#B45309] border-[#B45309] text-white'
                        : 'arch-btn-secondary'
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    {placePinMode ? 'Cancel Pin' : 'Place Pin'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="arch-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium whitespace-nowrap min-h-[38px]"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#525866]" />
                    Upload Plan
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Pinned Floor Selector + Historical Plan Versions + Category Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="arch-segmented flex items-center gap-1 overflow-x-auto">
            {state.floorPlans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlanId(p.id)}
                className={`arch-segmented-btn px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                  activePlan.id === p.id
                    ? 'arch-segmented-btn-active'
                    : 'text-[#525866] hover:text-[#111318]'
                }`}
              >
                <span className="font-mono text-[11px] font-semibold mr-1.5 text-[#1C4ED8]">{p.levelCode}</span>
                {p.name.split('&')[0].trim()}
              </button>
            ))}
          </div>

          {!studioMode && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex items-center gap-1.5 bg-white border border-black/[0.08] rounded-xl px-3 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                <History className="w-3.5 h-3.5 text-[#525866]" />
                <select
                  value={activePlan.activeVersionId}
                  onChange={(e) => selectPlanVersion(activePlan.id, e.target.value)}
                  aria-label="Select historical floorplan version"
                  className="text-xs font-medium text-[#111318] bg-transparent focus:outline-none"
                >
                  {activePlan.versions.map((ver) => (
                    <option key={ver.id} value={ver.id}>
                      {ver.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inline-flex items-center gap-1.5 bg-white border border-black/[0.08] rounded-xl px-3 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                <Layers className="w-3.5 h-3.5 text-[#525866]" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter asset pins by category"
                  className="text-xs font-medium text-[#111318] bg-transparent focus:outline-none"
                >
                  <option value="All">All Pin Categories ({state.assets.filter((a) => a.planId === activePlan.id).length})</option>
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Body (or Full-Height Drag-and-Drop Studio Workbench) */}
      {studioMode ? (
        <FloorplanBuilderStudio
          plan={activePlan}
          associationName={state.settings.name}
          assets={state.assets.filter((a) => a.planId === activePlan.id)}
          onSave={(elements, opts) => savePlanDraftElements(activePlan.id, elements, opts)}
          onPromoteToAsset={
            canWriteBoard ? (elementId) => promoteDraftElementToAsset(activePlan.id, elementId) : undefined
          }
          onClose={() => setStudioMode(false)}
        />
      ) : (
        <div className="flex-1 min-h-0 lg:overflow-y-auto space-y-6 pr-0.5 pb-4">
          {/* Signature Interactive Floorplan Canvas */}
          <FloorplanCanvas
            plan={activePlan}
            associationName={state.settings.name}
            assets={planAssets}
            openIssues={state.workOrders}
            selectedAssetId={openAssetId}
            placePinMode={placePinMode}
            onSelectAsset={(id) => setOpenAssetId(id)}
            onSelectWorkOrder={(woId) => setOpenWorkOrderId(woId)}
            onPlacePinCoords={handleDropCoords}
            onPromoteScannedObject={canWriteBoard ? promoteScannedObjectToAsset : undefined}
            onPromoteDraftElement={canWriteBoard ? promoteDraftElementToAsset : undefined}
            onOpenStudio={canWriteBoard ? () => setStudioMode(true) : undefined}
          />

          {/* Camera-Scanned Spaces & Detected Objects Inventory (for Active Floorplan) */}
          {activePlan.scannedSpaces && activePlan.scannedSpaces.length > 0 && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-display font-bold text-[#111318] flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-[#1C4ED8]" />
                  Camera-Scanned Spaces &amp; Interior Objects on {activePlan.levelCode} ({activePlan.scannedSpaces.length})
                </h2>
                <span className="text-xs font-medium text-[#525866] tabular-nums">
                  {Math.round(activePlan.scannedSpaces.reduce((s, sp) => s + sp.areaSqFt, 0))} sq ft measured ·{' '}
                  {activePlan.scannedSpaces.reduce((s, sp) => s + sp.objects.length, 0)} objects mapped
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePlan.scannedSpaces.map((sp) => (
                  <div key={sp.id} className="arch-surface rounded-2xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] pb-3">
                      <div className="min-w-0">
                        <div className="text-sm font-display font-semibold text-[#111318] truncate">{sp.name}</div>
                        <div className="text-xs text-[#2856D6] mt-0.5 tabular-nums">
                          {sp.widthFt}&apos; W × {sp.lengthFt}&apos; L × {sp.ceilingHeightFt}&apos; H · {sp.areaSqFt} sq ft · {sp.roomType}
                        </div>
                      </div>
                      {sp.capturedPhotoUrl && (
                        <img
                          src={sp.capturedPhotoUrl}
                          alt={sp.name}
                          className="w-14 h-10 object-cover rounded-lg border border-black/[0.08] shrink-0"
                        />
                      )}
                    </div>

                    <div className="divide-y divide-black/[0.06] text-xs">
                      {sp.objects.map((obj) => (
                        <div key={obj.id} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-[#111318] truncate">{obj.name}</div>
                            <div className="text-[11px] text-[#525866] tabular-nums">
                              {obj.objectType.replace('_', ' ')} · {obj.wallSide} · {obj.widthFt}&apos; × {obj.depthFt}&apos;
                            </div>
                          </div>

                          {obj.promotedAssetId ? (
                            <button
                              type="button"
                              onClick={() => setOpenAssetId(obj.promotedAssetId!)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D] hover:underline shrink-0"
                            >
                              Asset Pin
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            canWriteBoard && (
                              <button
                                type="button"
                                onClick={() => promoteScannedObjectToAsset(activePlan.id, sp.id, obj.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#EEF3FF] text-[#1C4ED8] rounded-lg hover:bg-[#E0EAFF] shrink-0"
                              >
                                <Pin className="w-3 h-3" />
                                Promote
                              </button>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Synchronized Asset Registry Table (All Building Assets) */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-display font-bold text-[#111318]">
                Complete Building Asset Registry ({state.assets.length} Mapped Components)
              </h2>
              <span className="text-xs text-[#525866] tabular-nums">
                Total Reserve Exposure:{' '}
                <strong className="font-mono text-[#111318]">
                  {formatCurrency(state.assets.reduce((s, a) => s + a.replacementEstimate, 0))}
                </strong>
              </span>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden space-y-2.5">
              {state.assets.length === 0 ? (
                <div className="arch-surface rounded-2xl p-6 text-center text-xs text-[#525866]">
                  No pinned building assets yet. Tap &ldquo;Edit / Build Floorplan&rdquo;, &ldquo;Place Pin&rdquo;, or &ldquo;Scan Space&rdquo; above to map your first component.
                </div>
              ) : (
                state.assets.map((asset) => {
                  const p = state.floorPlans.find((fp) => fp.id === asset.planId);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPlanId(asset.planId);
                        setOpenAssetId(asset.id);
                      }}
                      className="w-full text-left arch-surface-interactive rounded-2xl p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-display font-semibold text-[#111318] truncate">
                            <span className="font-mono text-[#1C4ED8] mr-1.5">{asset.code}</span>
                            {asset.name}
                          </div>
                          <div className="text-xs text-[#525866] mt-0.5">
                            {p?.levelCode} · {asset.category}
                          </div>
                        </div>
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
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums text-[#525866] pt-2 border-t border-black/[0.06]">
                        <span>Spend: {formatCurrency(getAssetCumulativeSpend(asset.id))}</span>
                        <span>Replace ({asset.plannedReplacementYear}): {formatCurrency(asset.replacementEstimate)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Desktop Modern Elevated Data Table */}
            <div className="hidden md:block arch-surface rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <InteractiveTable controller={assetTable} className="min-w-[880px]">
                  <tbody className="text-[13px]">
                    {sortedAllAssets.map((asset) => {
                      const p = state.floorPlans.find((fp) => fp.id === asset.planId);
                      return (
                        <tr
                          key={asset.id}
                          onClick={() => {
                            setSelectedPlanId(asset.planId);
                            setOpenAssetId(asset.id);
                          }}
                          className="cursor-pointer"
                        >
                          <td>
                            <div className="font-medium text-[#111318]">
                              <span className="font-mono text-xs font-semibold text-[#1C4ED8] mr-2">{asset.code}</span>
                              {asset.name}
                            </div>
                            <div className="text-xs text-[#788090] mt-0.5">{asset.category}</div>
                          </td>
                          <td className="font-mono text-xs font-medium text-[#525866] whitespace-nowrap">
                            {p?.levelCode}
                          </td>
                          <td>
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
                          </td>
                          <td className="text-xs text-[#525866]">{asset.reserveCategory}</td>
                          <td className="text-right font-mono text-xs tabular-nums text-[#111318] whitespace-nowrap">
                            {formatCurrency(getAssetCumulativeSpend(asset.id))}
                          </td>
                          <td className="text-right font-mono text-xs tabular-nums text-[#111318] whitespace-nowrap">
                            {formatCurrency(asset.replacementEstimate)}
                            <span className="text-[#788090] ml-1">({asset.plannedReplacementYear})</span>
                          </td>
                          <td className="text-right font-mono text-xs tabular-nums text-[#525866] whitespace-nowrap">
                            {formatDateShort(asset.nextInspectionDue)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </InteractiveTable>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* New Manual Drag-and-Drop Floorplan Modal */}
      {showNewManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111318]/45 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateManualPlan}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-black/[0.08] overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-base font-display font-bold text-[#111318]">
                  Create New Manual Floorplan
                </h3>
                <p className="text-xs text-[#525866] mt-0.5">
                  Start from an empty blueprint grid or an editable drag-and-drop template.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewManualModal(false)}
                className="p-1.5 text-[#525866] hover:text-[#111318] rounded-lg hover:bg-black/[0.04]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium text-[#111318] mb-1">Floorplan Name</label>
                  <input
                    type="text"
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g., 3rd Floor Residential Wing"
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Level Code</label>
                  <input
                    type="text"
                    required
                    value={manualLevelCode}
                    onChange={(e) => setManualLevelCode(e.target.value)}
                    placeholder="FL-3"
                    className="w-full px-3 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#111318] mb-1">Canvas Footprint Scale</label>
                <select
                  value={manualScale}
                  onChange={(e) => setManualScale(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                >
                  <option value="6">Large Site Plan (166&apos; × 103&apos;)</option>
                  <option value="8">Wide Building Wing (125&apos; × 78&apos;)</option>
                  <option value="10">Standard Floor (100&apos; × 62&apos;)</option>
                  <option value="15">Compact Floor / Mechanical Room (67&apos; × 41&apos;)</option>
                  <option value="20">Single Suite / Amenity Room (50&apos; × 31&apos;)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#111318] mb-1.5">Starting Layout</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STARTER_LAYOUT_TEMPLATES.map((tpl) => {
                    const active = manualTemplateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setManualTemplateId(tpl.id);
                          if (!manualName) setManualName(tpl.name === 'Blank Architectural Grid' ? '' : tpl.name);
                          setManualLevelCode(tpl.levelCode);
                        }}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          active
                            ? 'bg-[#EEF3FF] border-[#1C4ED8] ring-1 ring-[#1C4ED8]/20'
                            : 'bg-[#FAFBFD] border-black/[0.08] hover:border-[#1C4ED8]/40'
                        }`}
                      >
                        <div className="font-display font-semibold text-[#111318]">{tpl.name}</div>
                        <div className="text-[11px] text-[#525866] mt-0.5 leading-snug">{tpl.subtitle}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#111318] mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="Scope, floor notes, or building section..."
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-[#FAFBFD] border-t border-black/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewManualModal(false)}
                className="px-4 py-2 text-xs font-medium text-[#525866] hover:text-[#111318]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="arch-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
              >
                <Pencil className="w-3.5 h-3.5" />
                Create &amp; Open Studio
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Asset Pin Modal */}
      {pendingCoords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111318]/45 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveNewPin}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-black/[0.08] overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-base font-display font-bold text-[#111318]">
                  Pin New Asset or Hazard on {activePlan.levelCode}
                </h3>
                <p className="text-xs font-mono text-[#525866] mt-0.5">
                  Coordinates: ({pendingCoords.x}%, {pendingCoords.y}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingCoords(null)}
                className="p-1.5 text-[#525866] hover:text-[#111318] rounded-lg hover:bg-black/[0.04]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#111318] mb-1">Pin Name</label>
                <input
                  type="text"
                  required
                  value={pinName}
                  onChange={(e) => setPinName(e.target.value)}
                  placeholder="e.g., Domestic Hot Water Mixing Valve #2"
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Category</label>
                  <select
                    value={pinCategory}
                    onChange={(e) => setPinCategory(e.target.value as AssetCategory)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  >
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Initial Condition</label>
                  <select
                    value={pinCondition}
                    onChange={(e) => setPinCondition(e.target.value as HealthStatus)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                  >
                    <option value="green">Green — Current</option>
                    <option value="yellow">Yellow — Needs Attention</option>
                    <option value="red">Red — Deficient / Leak</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#111318] mb-1">Location Description</label>
                <input
                  type="text"
                  value={pinLocation}
                  onChange={(e) => setPinLocation(e.target.value)}
                  placeholder="Exact room, wall, or unit proximity"
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl focus:bg-white focus:border-[#1C4ED8] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Install Year</label>
                  <input
                    type="number"
                    value={pinInstallYear}
                    onChange={(e) => setPinInstallYear(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Useful Life (yrs)</label>
                  <input
                    type="number"
                    value={pinUsefulLife}
                    onChange={(e) => setPinUsefulLife(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Replacement ($)</label>
                  <input
                    type="number"
                    value={pinReplacementCost}
                    onChange={(e) => setPinReplacementCost(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Reserve Fund Category</label>
                  <input
                    type="text"
                    value={pinReserveCat}
                    onChange={(e) => setPinReserveCat(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Assigned Vendor</label>
                  <select
                    value={pinVendorId}
                    onChange={(e) => setPinVendorId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl"
                  >
                    <option value="">None assigned</option>
                    {state.vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.company}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#111318] mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={pinNotes}
                  onChange={(e) => setPinNotes(e.target.value)}
                  placeholder="Model/serial number, valve tag, or observation..."
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-[#FAFBFD] border-t border-black/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingCoords(null)}
                className="px-4 py-2 text-xs font-medium text-[#525866] hover:text-[#111318]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="arch-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Pin to Floorplan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload & Calibrate Existing Plan Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111318]/45 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveUploadedPlan}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-black/[0.08] overflow-hidden max-h-[92vh] flex flex-col"
          >
            <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-base font-display font-bold text-[#111318]">
                  Import Existing Floorplan &amp; Calibrate Scale
                </h3>
                <p className="text-xs text-[#525866] mt-0.5">
                  Upload scanned plans, architectural drawings, or site photos—then supplement them anytime in Floorplan Studio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-[#525866] hover:text-[#111318] rounded-lg hover:bg-black/[0.04]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Attach Destination</label>
                  <select
                    value={uploadTarget}
                    onChange={(e) => setUploadTarget(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl"
                  >
                    <option value="new">Create New Building Level / Site Map</option>
                    {state.floorPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        Add Historical Revision to: {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#111318] mb-1">Revision Label</label>
                  <input
                    type="text"
                    required
                    value={versionLabel}
                    onChange={(e) => setVersionLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl"
                  />
                </div>
              </div>

              {uploadTarget === 'new' && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block font-medium text-[#111318] mb-1">New Plan Name</label>
                    <input
                      type="text"
                      required
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                      placeholder="e.g., Courtyard & Rear Parking Site Map"
                      className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#111318] mb-1">Level Code</label>
                    <input
                      type="text"
                      required
                      value={newLevelCode}
                      onChange={(e) => setNewLevelCode(e.target.value)}
                      placeholder="SITE"
                      className="w-full px-3 py-2 font-mono bg-[#F8F9FB] border border-black/[0.1] rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-[#111318] mb-1">
                  Drawing Image File (PNG, JPG, WebP, SVG)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={handlePlanFileChange}
                  className="w-full px-3 py-2.5 bg-[#F8F9FB] border border-black/[0.1] rounded-xl"
                />
              </div>

              {uploadedPreview && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#1C4ED8]">
                      <Ruler className="w-3.5 h-3.5" />
                      Click 2 known points on drawing to calibrate scale
                    </span>
                    <div className="flex items-center gap-2">
                      <span>Known distance:</span>
                      <input
                        type="number"
                        value={calFeet}
                        onChange={(e) => setCalFeet(e.target.value)}
                        className="w-16 px-2 py-1 font-mono border border-black/[0.12] rounded-lg"
                      />
                      <span>feet</span>
                    </div>
                  </div>
                  <div
                    ref={calContainerRef}
                    onClick={handleCalibrationClick}
                    className="relative border border-black/[0.1] rounded-xl overflow-hidden cursor-crosshair bg-[#F8F9FB] h-56"
                  >
                    <img
                      src={uploadedPreview}
                      alt="Uploaded floorplan calibration preview"
                      className="w-full h-full object-contain pointer-events-none"
                    />
                    {calPointA && (
                      <div
                        style={{ left: `${calPointA.x}%`, top: `${calPointA.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#1C4ED8] rounded-full border-2 border-white shadow"
                      />
                    )}
                    {calPointB && (
                      <div
                        style={{ left: `${calPointB.x}%`, top: `${calPointB.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#B91C1C] rounded-full border-2 border-white shadow"
                      />
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-[#111318] mb-1">Revision Notes</label>
                <input
                  type="text"
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  placeholder="Source drawing date, architect, or changes captured..."
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.1] rounded-xl"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-[#FAFBFD] border-t border-black/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-xs font-medium text-[#525866]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!uploadedPreview}
                className="arch-btn-primary px-4 py-2 text-xs font-semibold disabled:opacity-40"
              >
                Save Calibrated Plan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Camera Spatial Floorplan & Object Scanner Modal */}
      {showScannerModal && (
        <SpaceScannerModal
          activePlanId={activePlan.id}
          onClose={() => setShowScannerModal(false)}
        />
      )}
    </div>
  );
}
