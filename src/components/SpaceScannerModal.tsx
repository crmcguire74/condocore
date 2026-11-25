import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Download,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Ruler,
  ScanLine,
  Smartphone,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useCondoCore } from '../store/CondoCoreContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ScannedObject, ScannedObjectType, ScannedSpace } from '../types/condocore';

interface SpaceScannerModalProps {
  activePlanId: string;
  onClose: () => void;
}

type ScanMode = 'existing_plan' | 'new_plan';

interface CapturedFrame {
  id: string;
  dataUrl: string;
  mimeType: string;
  base64: string;
}

const OBJECT_TYPE_OPTIONS: { value: ScannedObjectType; label: string }[] = [
  { value: 'door', label: 'Door' },
  { value: 'window', label: 'Window' },
  { value: 'stairs', label: 'Stairs' },
  { value: 'ladder', label: 'Ladder / Roof Hatch' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'boiler_hvac', label: 'Boiler / HVAC' },
  { value: 'plumbing_valve', label: 'Plumbing / Valve' },
  { value: 'electrical_panel', label: 'Electrical Panel' },
  { value: 'fire_safety', label: 'Fire / Safety' },
  { value: 'fixture', label: 'Fixture' },
  { value: 'other', label: 'Other Object' },
];

const ROOM_TYPES: ScannedSpace['roomType'][] = [
  'mechanical',
  'residential',
  'corridor',
  'lobby',
  'garage',
  'roof',
  'utility',
  'storage',
];

function sanitizeObjectType(val: string): ScannedObjectType {
  const valid = OBJECT_TYPE_OPTIONS.map((o) => o.value);
  return valid.includes(val as ScannedObjectType) ? (val as ScannedObjectType) : 'other';
}

function sanitizeRoomType(val: string): ScannedSpace['roomType'] {
  return ROOM_TYPES.includes(val as ScannedSpace['roomType']) ? (val as ScannedSpace['roomType']) : 'utility';
}

function sanitizeWallSide(val: string): ScannedObject['wallSide'] {
  const sides: ScannedObject['wallSide'][] = ['north', 'south', 'east', 'west', 'center'];
  return sides.includes(val as ScannedObject['wallSide']) ? (val as ScannedObject['wallSide']) : 'center';
}

function compressImageToJpeg(source: HTMLVideoElement | HTMLImageElement): CapturedFrame | null {
  const maxDim = 1200;
  const rawW = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const rawH = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!rawW || !rawH) return null;

  const scale = Math.min(1, maxDim / Math.max(rawW, rawH));
  const w = Math.round(rawW * scale);
  const h = Math.round(rawH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  const base64 = dataUrl.split(',')[1] || '';
  return {
    id: `frm-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    dataUrl,
    mimeType: 'image/jpeg',
    base64,
  };
}

export function SpaceScannerModal({ activePlanId, onClose }: SpaceScannerModalProps) {
  const {
    state,
    addScannedSpaceToPlan,
    createPlanFromScannedSpaces,
    setActiveTab,
    pushToast,
  } = useCondoCore();
  const { isMobile, isInstalled, isMobilePWA } = usePWAInstall();

  const [mode, setMode] = useState<ScanMode>('existing_plan');
  const [targetPlanId, setTargetPlanId] = useState<string>(activePlanId);
  const [newPlanName, setNewPlanName] = useState('Scanned Building Level');
  const [newLevelCode, setNewLevelCode] = useState('FL-S');

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [frames, setFrames] = useState<CapturedFrame[]>([]);

  // Hints & calibration
  const [spaceHint, setSpaceHint] = useState('');
  const [refWallFeet, setRefWallFeet] = useState('');
  const [refCeilingFeet, setRefCeilingFeet] = useState('9');

  // Scanning request state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Active editable scanned space draft
  const [draftSpace, setDraftSpace] = useState<Omit<ScannedSpace, 'id' | 'scannedAt'> | null>(null);

  // Queue of scanned spaces when creating an entire floorplan
  const [queuedSpaces, setQueuedSpaces] = useState<Omit<ScannedSpace, 'id' | 'scannedAt'>[]>([]);

  // New manual object form
  const [newObjLabel, setNewObjLabel] = useState('');
  const [newObjType, setNewObjType] = useState<ScannedObjectType>('door');
  const [newObjWall, setNewObjWall] = useState<ScannedObject['wallSide']>('north');
  const [newObjW, setNewObjW] = useState('3');
  const [newObjD, setNewObjD] = useState('1');

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live camera access is unavailable in this browser context. Use "Take / Upload Photo" below.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraError(
        'Camera permission was denied or no rear camera was found. You can still upload or snap room photos directly below.'
      );
    }
  };

  const captureFromVideo = () => {
    if (!videoRef.current) return;
    if (frames.length >= 4) {
      pushToast('Maximum 4 angles per space', 'Run spatial analysis or remove a frame to capture another.', 'warning');
      return;
    }
    const captured = compressImageToJpeg(videoRef.current);
    if (captured) {
      setFrames((prev) => [...prev, captured]);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, Math.max(0, 4 - frames.length));
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return;
        const img = new Image();
        img.onload = () => {
          const captured = compressImageToJpeg(img);
          if (captured) {
            setFrames((prev) => (prev.length < 4 ? [...prev, captured] : prev));
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const computeAutoPlacement = (existingCount: number, widthFt: number, lengthFt: number) => {
    const col = existingCount % 3;
    const row = Math.floor(existingCount / 3) % 2;
    const planWidthPct = Math.max(18, Math.min(34, Math.round(widthFt * 1.15)));
    const planHeightPct = Math.max(22, Math.min(38, Math.round(lengthFt * 1.35)));
    const planX = Math.min(92 - planWidthPct, 10 + col * 28);
    const planY = Math.min(86 - planHeightPct, 12 + row * 40);
    return { planX, planY, planWidthPct, planHeightPct };
  };

  const runSpatialScan = async () => {
    if (frames.length === 0) {
      setScanError('Capture at least one camera frame or upload a room photo first.');
      return;
    }
    setIsAnalyzing(true);
    setScanError(null);
    stopCamera();

    try {
      const res = await fetch('/api/scan-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: frames.map((f) => ({ mimeType: f.mimeType, data: f.base64 })),
          spaceLabelHint: spaceHint.trim() || undefined,
          referenceWallFeet: Number(refWallFeet) > 0 ? Number(refWallFeet) : undefined,
          ceilingHeightFeet: Number(refCeilingFeet) > 0 ? Number(refCeilingFeet) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error || 'Spatial analysis could not complete. You can enter dimensions manually below.');
        setIsAnalyzing(false);
        return;
      }

      const scan = data.scan;
      const widthFt = Number(scan.widthFt) > 0 ? Number(Number(scan.widthFt).toFixed(1)) : 16;
      const lengthFt = Number(scan.lengthFt) > 0 ? Number(Number(scan.lengthFt).toFixed(1)) : 14;
      const ceilingHeightFt = Number(scan.ceilingHeightFt) > 0 ? Number(Number(scan.ceilingHeightFt).toFixed(1)) : 9;
      const areaSqFt = Number(scan.areaSqFt) > 0 ? Math.round(Number(scan.areaSqFt)) : Math.round(widthFt * lengthFt);

      const targetPlan = state.floorPlans.find((p) => p.id === targetPlanId);
      const existingCount =
        mode === 'new_plan' ? queuedSpaces.length : (targetPlan?.scannedSpaces?.length || 0);
      const placement = computeAutoPlacement(existingCount, widthFt, lengthFt);

      const detectedObjects: ScannedObject[] = Array.isArray(scan.detectedObjects)
        ? scan.detectedObjects.map((obj: Record<string, unknown>, idx: number) => ({
            id: `obj-${Date.now()}-${idx}`,
            name: String(obj.name || `Object ${idx + 1}`),
            objectType: sanitizeObjectType(String(obj.objectType || 'other')),
            xPct: Math.max(6, Math.min(94, Number(obj.xPct) || 50)),
            yPct: Math.max(6, Math.min(94, Number(obj.yPct) || 50)),
            widthFt: Math.max(0.5, Number(obj.widthFt) || 3),
            depthFt: Math.max(0.5, Number(obj.depthFt) || 2),
            wallSide: sanitizeWallSide(String(obj.wallSide || 'center')),
            notes: obj.notes ? String(obj.notes) : undefined,
          }))
        : [];

      setDraftSpace({
        name: String(scan.spaceName || spaceHint.trim() || 'Scanned Room'),
        roomType: sanitizeRoomType(String(scan.roomType || 'utility')),
        widthFt,
        lengthFt,
        ceilingHeightFt,
        areaSqFt,
        ...placement,
        objects: detectedObjects,
        capturedPhotoUrl: frames[0]?.dataUrl,
        confidenceNotes: String(scan.confidenceNotes || 'Analyzed from multi-angle camera frames.'),
      });
    } catch {
      setScanError(
        'Could not reach the spatial analysis service. Check network connection or use Manual Space Entry below.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openManualDraft = () => {
    const targetPlan = state.floorPlans.find((p) => p.id === targetPlanId);
    const existingCount =
      mode === 'new_plan' ? queuedSpaces.length : (targetPlan?.scannedSpaces?.length || 0);
    const placement = computeAutoPlacement(existingCount, 18, 14);
    setDraftSpace({
      name: spaceHint.trim() || `Room ${existingCount + 1}`,
      roomType: 'utility',
      widthFt: Number(refWallFeet) > 0 ? Number(refWallFeet) : 18,
      lengthFt: 14,
      ceilingHeightFt: Number(refCeilingFeet) > 0 ? Number(refCeilingFeet) : 9,
      areaSqFt: Math.round((Number(refWallFeet) > 0 ? Number(refWallFeet) : 18) * 14),
      ...placement,
      objects: [
        {
          id: `obj-door-${Date.now()}`,
          name: 'Entry Door',
          objectType: 'door',
          xPct: 50,
          yPct: 92,
          widthFt: 3,
          depthFt: 0.5,
          wallSide: 'south',
        },
      ],
      capturedPhotoUrl: frames[0]?.dataUrl,
      confidenceNotes: 'Manual architectural measurement entry.',
    });
    setScanError(null);
  };

  const handleAddObjectToDraft = () => {
    if (!draftSpace || !newObjLabel.trim()) return;
    const coordsByWall: Record<ScannedObject['wallSide'], { x: number; y: number }> = {
      north: { x: 50, y: 10 },
      south: { x: 50, y: 90 },
      west: { x: 10, y: 50 },
      east: { x: 90, y: 50 },
      center: { x: 50, y: 50 },
    };
    const pos = coordsByWall[newObjWall];
    const obj: ScannedObject = {
      id: `obj-${Date.now()}`,
      name: newObjLabel.trim(),
      objectType: newObjType,
      xPct: pos.x,
      yPct: pos.y,
      widthFt: Math.max(0.5, Number(newObjW) || 3),
      depthFt: Math.max(0.5, Number(newObjD) || 2),
      wallSide: newObjWall,
    };
    setDraftSpace({
      ...draftSpace,
      objects: [...draftSpace.objects, obj],
    });
    setNewObjLabel('');
  };

  const handleRemoveDraftObject = (objId: string) => {
    if (!draftSpace) return;
    setDraftSpace({
      ...draftSpace,
      objects: draftSpace.objects.filter((o) => o.id !== objId),
    });
  };

  const handleCommitDraftSpace = () => {
    if (!draftSpace) return;
    if (mode === 'existing_plan') {
      addScannedSpaceToPlan(targetPlanId, draftSpace);
      onClose();
    } else {
      setQueuedSpaces((prev) => [...prev, draftSpace]);
      setDraftSpace(null);
      setFrames([]);
      setSpaceHint('');
      pushToast(
        'Space added to new plan queue',
        `${draftSpace.name} queued. Scan another space or save the full floorplan.`,
        'success'
      );
    }
  };

  const handleFinalizeNewPlan = () => {
    const spacesToSave = draftSpace ? [...queuedSpaces, draftSpace] : queuedSpaces;
    if (spacesToSave.length === 0) return;
    createPlanFromScannedSpaces({
      planName: newPlanName.trim() || 'Camera-Scanned Floorplan',
      levelCode: newLevelCode.trim() || 'SCAN',
      areaDescription: `Camera-scanned floorplan containing ${spacesToSave.map((s) => s.name).join(', ')}.`,
      spaces: spacesToSave,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#121316]/50 p-2 sm:p-4"
      onClick={() => {
        stopCamera();
        onClose();
      }}
    >
      <div
        className="w-full max-w-4xl bg-white border border-[#E6E4DE] rounded-lg shadow-2xl overflow-hidden max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-[#E6E4DE] bg-[#FAF9F7] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#2856D6]">
              <span className="inline-flex items-center gap-1 font-semibold">
                <ScanLine className="w-3.5 h-3.5" />
                SPATIAL CAMERA SCANNER
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {isMobilePWA
                  ? 'Mobile PWA Mode Active'
                  : isInstalled
                  ? 'Installed PWA Mode'
                  : isMobile
                  ? 'Mobile Browser Camera Ready'
                  : 'Desktop Webcam & Photo Upload Ready'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-display font-semibold text-[#121316] mt-0.5">
              Scan Room Dimensions &amp; Interior Objects
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-[#525763] hover:text-[#121316] rounded hover:bg-[#EFEDE8]"
            aria-label="Close spatial scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PWA readiness guidance strip when not yet installed as PWA */}
        {!isInstalled && (
          <div className="px-4 sm:px-6 py-2 bg-[#EEF3FF] border-b border-[#C7D7FE] flex flex-wrap items-center justify-between gap-2 text-xs text-[#1C4ED8]">
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              For full-screen handheld room scanning in mechanical rooms &amp; corridors, install CondoCore as a mobile PWA.
            </span>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
                setActiveTab('settings');
              }}
              className="inline-flex items-center gap-1 font-medium underline underline-offset-2 whitespace-nowrap hover:text-[#153DB0]"
            >
              <Download className="w-3 h-3" />
              Open PWA Install Settings
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Destination Mode Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('existing_plan')}
              className={`text-left p-3.5 rounded-md border transition-colors ${
                mode === 'existing_plan'
                  ? 'bg-[#EEF3FF] border-[#1C4ED8] text-[#121316]'
                  : 'bg-white border-[#E6E4DE] text-[#525763] hover:bg-[#FAF9F7]'
              }`}
            >
              <div className="text-xs font-semibold text-[#121316]">
                1. Scan Space onto Existing Floorplan
              </div>
              <div className="text-[11px] text-[#525763] mt-0.5">
                Add a dimensioned room and its doors, windows, stairs, ladders, furniture, or equipment onto a current plan.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('new_plan')}
              className={`text-left p-3.5 rounded-md border transition-colors ${
                mode === 'new_plan'
                  ? 'bg-[#EEF3FF] border-[#1C4ED8] text-[#121316]'
                  : 'bg-white border-[#E6E4DE] text-[#525763] hover:bg-[#FAF9F7]'
              }`}
            >
              <div className="text-xs font-semibold text-[#121316]">
                2. Create Entire New Floorplan by Scanning Spaces
              </div>
              <div className="text-[11px] text-[#525763] mt-0.5">
                Walk room by room to stitch multiple scanned spaces into a brand-new calibrated architectural plan.
              </div>
            </button>
          </div>

          {/* Target Plan Configuration */}
          {mode === 'existing_plan' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-medium text-[#121316] mb-1">Target Floorplan</label>
                <select
                  value={targetPlanId}
                  onChange={(e) => setTargetPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D2CFC7] rounded"
                >
                  {state.floorPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.levelCode} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#121316] mb-1">Space Label Hint (Optional)</label>
                <input
                  type="text"
                  value={spaceHint}
                  onChange={(e) => setSpaceHint(e.target.value)}
                  placeholder="e.g., Boiler Room, Lobby"
                  className="w-full px-3 py-2 bg-white border border-[#D2CFC7] rounded"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-medium text-[#121316] mb-1">New Floorplan Name</label>
                <input
                  type="text"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="e.g., Basement Storage & Utility Wing"
                  className="w-full px-3 py-2 bg-white border border-[#D2CFC7] rounded"
                />
              </div>
              <div>
                <label className="block font-medium text-[#121316] mb-1">Level Code</label>
                <input
                  type="text"
                  value={newLevelCode}
                  onChange={(e) => setNewLevelCode(e.target.value)}
                  placeholder="B-1"
                  className="w-full px-3 py-2 font-mono bg-white border border-[#D2CFC7] rounded"
                />
              </div>
              <div>
                <label className="block font-medium text-[#121316] mb-1">Current Space Hint</label>
                <input
                  type="text"
                  value={spaceHint}
                  onChange={(e) => setSpaceHint(e.target.value)}
                  placeholder="e.g., Stairwell A"
                  className="w-full px-3 py-2 bg-white border border-[#D2CFC7] rounded"
                />
              </div>
            </div>
          )}

          {/* Queued Spaces List (when building an entire new floorplan) */}
          {mode === 'new_plan' && queuedSpaces.length > 0 && (
            <div className="p-3.5 bg-[#FAF9F7] border border-[#E6E4DE] rounded-md space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#121316] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#1C4ED8]" />
                  Stitched Spaces Queued for &ldquo;{newPlanName}&rdquo; ({queuedSpaces.length})
                </span>
                <span className="font-mono text-[#525763] tabular-nums">
                  {Math.round(queuedSpaces.reduce((s, sp) => s + sp.areaSqFt, 0))} sq ft total ·{' '}
                  {queuedSpaces.reduce((s, sp) => s + sp.objects.length, 0)} objects
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {queuedSpaces.map((sp, i) => (
                  <div
                    key={`${sp.name}-${i}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-[#E6E4DE] rounded text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[#121316] truncate">{sp.name}</div>
                      <div className="font-mono text-[11px] text-[#525763] tabular-nums">
                        {sp.widthFt}&apos; × {sp.lengthFt}&apos; · {sp.objects.length} objs
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQueuedSpaces((prev) => prev.filter((_, idx) => idx !== i))}
                      className="p-1 text-[#787E8C] hover:text-[#B91C1C]"
                      aria-label={`Remove ${sp.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step A: Camera Capture & Spatial Analysis (shown when no draftSpace yet) */}
          {!draftSpace ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Viewfinder / Upload Column */}
              <div className="lg:col-span-7 space-y-3">
                <div className="relative bg-[#121316] rounded-md overflow-hidden aspect-[16/10] flex items-center justify-center border border-[#1C4ED8]">
                  {cameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Architectural targeting reticle */}
                      <div className="pointer-events-none absolute inset-4 border border-white/35">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />
                        <div className="absolute bottom-2 left-3 text-[10px] font-mono text-white/90">
                          ALIGN FLOOR–WALL CORNERS · CAPTURE 1–4 ANGLES ({frames.length}/4)
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center text-slate-200 max-w-sm space-y-3">
                      <Camera className="w-8 h-8 mx-auto text-slate-300" />
                      <div className="text-xs font-medium">
                        Use your mobile rear camera or upload 1–4 corner views of the room
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        CondoCore measures wall spans, ceiling height, and floor area, and maps doors, windows, stairs, ladders, furniture, and mechanical equipment.
                      </p>
                    </div>
                  )}
                </div>

                {/* Camera Action Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {!cameraActive ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium bg-[#1C4ED8] text-white rounded hover:bg-[#153DB0] min-h-[40px]"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Start Live Camera
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={captureFromVideo}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium bg-[#1C4ED8] text-white rounded hover:bg-[#153DB0] min-h-[40px]"
                      >
                        <ScanLine className="w-3.5 h-3.5" />
                        Capture Angle ({frames.length}/4)
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3 py-2 text-xs text-[#525763] border border-[#D2CFC7] rounded hover:bg-[#EFEDE8]"
                      >
                        Stop Camera
                      </button>
                    </>
                  )}

                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium bg-white border border-[#D2CFC7] text-[#121316] rounded hover:bg-[#EFEDE8] cursor-pointer min-h-[40px]">
                    <Upload className="w-3.5 h-3.5" />
                    Take / Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={openManualDraft}
                    className="px-3 py-2 text-xs text-[#2856D6] hover:underline ml-auto"
                  >
                    Enter Dimensions Manually
                  </button>
                </div>

                {cameraError && (
                  <p className="text-xs text-[#B45309] bg-[#FEF3C7]/60 border border-[#F59E0B]/30 px-3 py-2 rounded">
                    {cameraError}
                  </p>
                )}

                {/* Captured Frames Strip */}
                {frames.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono text-[#525763]">
                      CAPTURED ANGLES ({frames.length}/4)
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {frames.map((f, idx) => (
                        <div
                          key={f.id}
                          className="relative aspect-[4/3] rounded overflow-hidden border border-[#E6E4DE] bg-[#121316]"
                        >
                          <img src={f.dataUrl} alt={`Room capture ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFrames((prev) => prev.filter((x) => x.id !== f.id))}
                            className="absolute top-1 right-1 p-1 bg-[#121316]/80 text-white rounded hover:bg-[#B91C1C]"
                            aria-label="Remove captured frame"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Calibration & Analyze Column */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-4 p-4 bg-[#FAF9F7] border border-[#E6E4DE] rounded-md text-xs">
                <div className="space-y-3.5">
                  <div className="flex items-center gap-1.5 font-semibold text-[#121316]">
                    <Ruler className="w-4 h-4 text-[#1C4ED8]" />
                    Spatial Calibration Hints
                  </div>
                  <p className="text-[11px] text-[#525763] leading-relaxed">
                    Providing one known dimension (such as ceiling height or one wall span) sharpens the dimensional accuracy of both the room outline and detected objects.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-[#121316] mb-1">Known Wall (ft)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="3"
                        max="300"
                        value={refWallFeet}
                        onChange={(e) => setRefWallFeet(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-2.5 py-2 font-mono bg-white border border-[#D2CFC7] rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#121316] mb-1">Ceiling Height (ft)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="6"
                        max="40"
                        value={refCeilingFeet}
                        onChange={(e) => setRefCeilingFeet(e.target.value)}
                        className="w-full px-2.5 py-2 font-mono bg-white border border-[#D2CFC7] rounded"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E6E4DE] space-y-1 text-[11px] text-[#525763]">
                    <div className="font-semibold text-[#121316]">Detected Architectural Elements:</div>
                    <div>
                      Doors (with swing arcs) · Windows · Stairs &amp; Ladders · Furniture &amp; Cabinets · Boilers, Valves, Electrical Panels &amp; Fire Equipment
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {scanError && (
                    <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded text-[11px] leading-snug">
                      {scanError}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={frames.length === 0 || isAnalyzing}
                    onClick={runSpatialScan}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold bg-[#1C4ED8] text-white rounded hover:bg-[#153DB0] disabled:opacity-45 min-h-[44px]"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Measuring Space &amp; Detecting Objects...
                      </>
                    ) : (
                      <>
                        <ScanLine className="w-4 h-4" />
                        Analyze {frames.length || ''} Captured Frame{frames.length === 1 ? '' : 's'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Step B: Review & Edit Scanned Space Dimensions + Detected Objects */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DE]">
                <div>
                  <div className="text-[11px] font-mono text-[#1E6B52] font-semibold">
                    SPACE MEASURED &amp; OBJECTS MAPPED — REVIEW BEFORE SAVING
                  </div>
                  <p className="text-xs text-[#525763] mt-0.5">{draftSpace.confidenceNotes}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDraftSpace(null);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-[#525763] border border-[#D2CFC7] rounded hover:bg-[#EFEDE8]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Rescan Room
                </button>
              </div>

              {/* Editable Room Dimensions */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
                <div className="col-span-2">
                  <label className="block font-medium text-[#121316] mb-1">Space Name</label>
                  <input
                    type="text"
                    value={draftSpace.name}
                    onChange={(e) => setDraftSpace({ ...draftSpace, name: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#121316] mb-1">Type</label>
                  <select
                    value={draftSpace.roomType}
                    onChange={(e) =>
                      setDraftSpace({
                        ...draftSpace,
                        roomType: e.target.value as ScannedSpace['roomType'],
                      })
                    }
                    className="w-full px-2 py-2 bg-white border border-[#D2CFC7] rounded"
                  >
                    {ROOM_TYPES.map((rt) => (
                      <option key={rt} value={rt}>
                        {rt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#121316] mb-1">Width (ft)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={draftSpace.widthFt}
                    onChange={(e) => {
                      const w = Math.max(2, Number(e.target.value) || 0);
                      setDraftSpace({
                        ...draftSpace,
                        widthFt: w,
                        areaSqFt: Math.round(w * draftSpace.lengthFt),
                      });
                    }}
                    className="w-full px-2.5 py-2 font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#121316] mb-1">Length (ft)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={draftSpace.lengthFt}
                    onChange={(e) => {
                      const l = Math.max(2, Number(e.target.value) || 0);
                      setDraftSpace({
                        ...draftSpace,
                        lengthFt: l,
                        areaSqFt: Math.round(draftSpace.widthFt * l),
                      });
                    }}
                    className="w-full px-2.5 py-2 font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#121316] mb-1">Ceiling (ft)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={draftSpace.ceilingHeightFt}
                    onChange={(e) =>
                      setDraftSpace({
                        ...draftSpace,
                        ceilingHeightFt: Math.max(6, Number(e.target.value) || 8),
                      })
                    }
                    className="w-full px-2.5 py-2 font-mono bg-white border border-[#D2CFC7] rounded"
                  />
                </div>
              </div>

              {/* Mini Architectural Blueprint Preview + Placement Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 bg-[#FAF9F7] border border-[#E6E4DE] rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#525763]">
                    <span>ARCHITECTURAL PREVIEW</span>
                    <span>
                      {draftSpace.widthFt}&apos; × {draftSpace.lengthFt}&apos; ({draftSpace.areaSqFt} sq ft)
                    </span>
                  </div>
                  <svg viewBox="0 0 320 220" className="w-full bg-white border border-black/[0.08] rounded-xl">
                    <rect x="28" y="28" width="264" height="164" fill="#F8F9FB" stroke="#1C4ED8" strokeWidth="2.5" rx="4" />
                    <text
                      x="160"
                      y="18"
                      textAnchor="middle"
                      fill="#525866"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {draftSpace.widthFt} FT
                    </text>
                    <text
                      x="14"
                      y="114"
                      textAnchor="middle"
                      fill="#525866"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      transform="rotate(-90 14 114)"
                    >
                      {draftSpace.lengthFt} FT
                    </text>
                    <text
                      x="160"
                      y="112"
                      textAnchor="middle"
                      fill="#1C4ED8"
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="Outfit, DM Sans, sans-serif"
                    >
                      {draftSpace.name.toUpperCase()}
                    </text>
                    {draftSpace.objects.map((o) => {
                      const cx = 28 + (o.xPct / 100) * 264;
                      const cy = 28 + (o.yPct / 100) * 164;
                      const fill =
                        o.objectType === 'door'
                          ? '#1C4ED8'
                          : o.objectType === 'window'
                          ? '#0284C7'
                          : o.objectType === 'stairs' || o.objectType === 'ladder'
                          ? '#B45309'
                          : o.objectType === 'fire_safety'
                          ? '#B91C1C'
                          : '#2856D6';
                      return (
                        <g key={o.id}>
                          <circle cx={cx} cy={cy} r="5" fill={fill} stroke="#FFFFFF" strokeWidth="1.5" />
                          <text
                            x={cx}
                            y={cy - 8}
                            textAnchor="middle"
                            fill="#111318"
                            fontSize="8"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {o.name.slice(0, 14)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Plan placement fine-tuning */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <label className="flex items-center justify-between gap-2 text-[#525763]">
                      <span>Plan X ({draftSpace.planX}%)</span>
                      <input
                        type="range"
                        min={5}
                        max={70}
                        value={draftSpace.planX}
                        onChange={(e) => setDraftSpace({ ...draftSpace, planX: Number(e.target.value) })}
                        className="w-20 accent-[#1C4ED8]"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2 text-[#525763]">
                      <span>Plan Y ({draftSpace.planY}%)</span>
                      <input
                        type="range"
                        min={8}
                        max={65}
                        value={draftSpace.planY}
                        onChange={(e) => setDraftSpace({ ...draftSpace, planY: Number(e.target.value) })}
                        className="w-20 accent-[#1C4ED8]"
                      />
                    </label>
                  </div>
                </div>

                {/* Detected Objects Table & Quick-Add */}
                <div className="lg:col-span-7 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#121316]">
                      Detected Objects in Space ({draftSpace.objects.length})
                    </span>
                    <span className="text-[11px] text-[#525763]">
                      Doors, windows, stairs, ladders, furniture &amp; equipment
                    </span>
                  </div>

                  <div className="border border-[#E6E4DE] rounded-md divide-y divide-[#E6E4DE] max-h-52 overflow-y-auto">
                    {draftSpace.objects.length === 0 ? (
                      <div className="p-4 text-center text-[#525763]">
                        No objects listed yet. Add doors, windows, stairs, ladders, or furniture below.
                      </div>
                    ) : (
                      draftSpace.objects.map((o) => (
                        <div key={o.id} className="px-3 py-2 flex items-center justify-between gap-2 bg-white">
                          <div className="min-w-0">
                            <div className="font-medium text-[#121316] truncate">{o.name}</div>
                            <div className="text-[11px] font-mono text-[#525763]">
                              {o.objectType.replace('_', ' ')} · {o.wallSide} wall · {o.widthFt}&apos; × {o.depthFt}&apos;
                              {o.notes ? ` · ${o.notes}` : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDraftObject(o.id)}
                            className="p-1 text-[#787E8C] hover:text-[#B91C1C] shrink-0"
                            aria-label={`Remove ${o.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Quick-add missing object */}
                  <div className="p-3 bg-[#FAF9F7] border border-[#E6E4DE] rounded-md space-y-2">
                    <div className="text-[11px] font-semibold text-[#121316]">Add Additional Object</div>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      <input
                        type="text"
                        value={newObjLabel}
                        onChange={(e) => setNewObjLabel(e.target.value)}
                        placeholder="e.g., Roof Access Ladder"
                        className="col-span-2 px-2.5 py-1.5 bg-white border border-[#D2CFC7] rounded"
                      />
                      <select
                        value={newObjType}
                        onChange={(e) => setNewObjType(e.target.value as ScannedObjectType)}
                        className="px-2 py-1.5 bg-white border border-[#D2CFC7] rounded"
                      >
                        {OBJECT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={newObjWall}
                        onChange={(e) => setNewObjWall(e.target.value as ScannedObject['wallSide'])}
                        className="px-2 py-1.5 bg-white border border-[#D2CFC7] rounded"
                      >
                        <option value="north">North</option>
                        <option value="south">South</option>
                        <option value="east">East</option>
                        <option value="west">West</option>
                        <option value="center">Center</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.5"
                          value={newObjW}
                          onChange={(e) => setNewObjW(e.target.value)}
                          className="w-full px-1.5 py-1.5 font-mono bg-white border border-[#D2CFC7] rounded"
                          title="Width (ft)"
                        />
                        <span className="text-[#787E8C]">×</span>
                        <input
                          type="number"
                          step="0.5"
                          value={newObjD}
                          onChange={(e) => setNewObjD(e.target.value)}
                          className="w-full px-1.5 py-1.5 font-mono bg-white border border-[#D2CFC7] rounded"
                          title="Depth (ft)"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddObjectToDraft}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-[#1C4ED8] text-white rounded hover:bg-[#153DB0]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#F7F6F3] border-t border-[#E6E4DE] flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-3.5 py-2 text-xs text-[#525763] hover:text-[#121316]"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {mode === 'existing_plan' && draftSpace && (
              <button
                type="button"
                onClick={handleCommitDraftSpace}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1C4ED8] text-white rounded hover:bg-[#153DB0]"
              >
                <Check className="w-3.5 h-3.5" />
                Save Space to Existing Plan
              </button>
            )}

            {mode === 'new_plan' && draftSpace && (
              <button
                type="button"
                onClick={handleCommitDraftSpace}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#1C4ED8] text-[#1C4ED8] rounded hover:bg-[#EEF3FF]"
              >
                <Plus className="w-3.5 h-3.5" />
                Queue Space &amp; Scan Next Room
              </button>
            )}

            {mode === 'new_plan' && (queuedSpaces.length > 0 || draftSpace) && (
              <button
                type="button"
                onClick={handleFinalizeNewPlan}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1C4ED8] text-white rounded hover:bg-[#153DB0]"
              >
                <Check className="w-3.5 h-3.5" />
                Create Floorplan ({queuedSpaces.length + (draftSpace ? 1 : 0)}{' '}
                {queuedSpaces.length + (draftSpace ? 1 : 0) === 1 ? 'Space' : 'Spaces'})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
