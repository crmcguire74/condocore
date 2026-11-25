import React, { useRef, useState } from 'react';
import { ArrowUpRight, Crosshair, Layers, Maximize2, Pencil, Pin, ScanLine, X, ZoomIn, ZoomOut } from 'lucide-react';
import {
  BuildingAsset,
  FloorPlan,
  FloorPlanElement,
  IssueWorkOrder,
  PlanBuiltInKey,
  ScannedObject,
  ScannedSpace,
} from '../types/condocore';
import { DraftElementSvg } from './DraftElementSvg';

interface FloorplanCanvasProps {
  plan: FloorPlan;
  associationName: string;
  assets: BuildingAsset[];
  openIssues: IssueWorkOrder[];
  selectedAssetId: string | null;
  placePinMode: boolean;
  onSelectAsset: (assetId: string) => void;
  onSelectWorkOrder: (workOrderId: string) => void;
  onPlacePinCoords: (x: number, y: number) => void;
  onPromoteScannedObject?: (planId: string, spaceId: string, objectId: string) => void;
  onPromoteDraftElement?: (planId: string, elementId: string) => void;
  onOpenStudio?: () => void;
}

export function BuiltInArchitecturalSvg({
  planKey,
  versionLabel,
  associationName,
}: {
  planKey: PlanBuiltInKey;
  versionLabel: string;
  associationName: string;
}) {
  const strokeMain = '#1C4ED8';
  const strokeSub = '#64748B';
  const fillRoom = '#FFFFFF';
  const fillCore = '#F2F4F8';
  const fillMechanical = '#EEF3FF';

  return (
    <svg viewBox="0 0 1000 620" className="w-full h-full select-none" aria-label={`Architectural plan ${planKey}`}>
      {/* Outer blueprint border & clean title block */}
      <rect x="20" y="20" width="960" height="580" rx="6" fill="#FCFDFF" stroke="#CBD5E1" strokeWidth="1.25" />
      <line x1="20" y1="564" x2="980" y2="564" stroke="#E2E8F0" strokeWidth="1" />
      <text x="36" y="586" fill="#525866" fontSize="11" fontWeight="500" fontFamily="DM Sans, sans-serif">
        {associationName.slice(0, 44)} · {versionLabel}
      </text>
      <text x="850" y="586" fill="#525866" fontSize="11" fontWeight="500" fontFamily="JetBrains Mono, monospace">
        NORTH ▲ · 1/8&quot;=1&apos;
      </text>

      {planKey === 'manual_draft' && (
        <g>
          <rect x="36" y="36" width="928" height="512" rx="4" fill="#FFFFFF" stroke="#DCE3F0" strokeWidth="1" />
          {/* Top & Left architectural ruler ticks every 50px (5ft at 10px/ft) */}
          {Array.from({ length: 19 }).map((_, idx) => {
            const tx = 50 + idx * 50;
            return (
              <g key={`rx-${idx}`}>
                <line x1={tx} y1={36} x2={tx} y2={44} stroke="#94A3B8" strokeWidth="1" />
                <text x={tx} y={32} textAnchor="middle" fill="#94A3B8" fontSize="8.5" fontFamily="JetBrains Mono, monospace">
                  {idx * 5}&apos;
                </text>
              </g>
            );
          })}
          {Array.from({ length: 10 }).map((_, idx) => {
            const ty = 60 + idx * 50;
            return (
              <g key={`ry-${idx}`}>
                <line x1={36} y1={ty} x2={44} y2={ty} stroke="#94A3B8" strokeWidth="1" />
                <text x={32} y={ty + 3} textAnchor="end" fill="#94A3B8" fontSize="8.5" fontFamily="JetBrains Mono, monospace">
                  {idx * 5}&apos;
                </text>
              </g>
            );
          })}
        </g>
      )}

      {planKey === 'scanned_custom' && (
        <g>
          <rect x="44" y="44" width="912" height="498" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" strokeDasharray="6 4" />
          <text x="64" y="68" fill="#64748B" fontSize="10.5" fontWeight="500" fontFamily="DM Sans, sans-serif">
            Camera Spatial Survey Sheet · Rooms &amp; Detected Objects Rendered to Scale
          </text>
        </g>
      )}

      {planKey === 'roof' && (
        <g>
          <rect x="90" y="70" width="820" height="440" fill={fillRoom} stroke={strokeMain} strokeWidth="3.2" />
          <rect x="102" y="82" width="796" height="416" fill="none" stroke={strokeSub} strokeWidth="1" strokeDasharray="6 4" />

          <line x1="102" y1="82" x2="210" y2="165" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="898" y1="82" x2="780" y2="165" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="102" y1="498" x2="210" y2="435" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="898" y1="498" x2="780" y2="435" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />

          <rect x="112" y="92" width="220" height="145" rx="3" fill="#FEF2F2" stroke="#DC2626" strokeWidth="1.2" strokeDasharray="5 3" />
          <text x="124" y="114" fill="#991B1B" fontSize="11" fontWeight="600" fontFamily="DM Sans, sans-serif">
            NW Membrane Zone (Above 601/602)
          </text>
          <text x="124" y="224" fill="#B91C1C" fontSize="10" fontFamily="JetBrains Mono, monospace">
            SCUPPER #1 · 38% MOISTURE POCKET
          </text>

          <rect x="435" y="210" width="160" height="130" rx="2" fill={fillCore} stroke={strokeMain} strokeWidth="2.2" />
          <text x="455" y="268" fill={strokeMain} fontSize="12" fontWeight="600" fontFamily="Outfit, sans-serif">
            Elevator Penthouse
          </text>
          <text x="455" y="286" fill={strokeSub} fontSize="10.5" fontFamily="DM Sans, sans-serif">
            &amp; Roof Access Hatch
          </text>

          <rect x="255" y="240" width="90" height="90" fill={fillMechanical} stroke={strokeMain} strokeWidth="1.5" />
          <text x="275" y="290" fill={strokeMain} fontSize="10.5" fontWeight="600" fontFamily="JetBrains Mono, monospace">
            STAIR A
          </text>

          <rect x="685" y="240" width="90" height="90" fill={fillMechanical} stroke={strokeMain} strokeWidth="1.5" />
          <text x="705" y="290" fill={strokeMain} fontSize="10.5" fontWeight="600" fontFamily="JetBrains Mono, monospace">
            STAIR B
          </text>

          <circle cx="210" cy="165" r="9" fill="none" stroke={strokeMain} strokeWidth="1.5" />
          <circle cx="780" cy="165" r="9" fill="none" stroke={strokeMain} strokeWidth="1.5" />
          <circle cx="210" cy="435" r="9" fill="none" stroke={strokeMain} strokeWidth="1.5" />
          <circle cx="780" cy="435" r="9" fill="none" stroke={strokeMain} strokeWidth="1.5" />

          <text x="115" y="535" fill={strokeSub} fontSize="11" fontWeight="500" fontFamily="DM Sans, sans-serif">
            South Parapet (Street Elevation)
          </text>
          <text x="115" y="58" fill={strokeSub} fontSize="11" fontWeight="500" fontFamily="DM Sans, sans-serif">
            North Parapet (Courtyard / Alley Elevation)
          </text>
        </g>
      )}

      {planKey === 'mechanical' && (
        <g>
          <rect x="90" y="68" width="820" height="444" fill={fillRoom} stroke={strokeMain} strokeWidth="3" />
          <rect x="90" y="68" width="380" height="230" fill={fillMechanical} stroke={strokeMain} strokeWidth="2" />
          <text x="114" y="100" fill={strokeMain} fontSize="13" fontWeight="600" fontFamily="Outfit, sans-serif">
            Central Boiler &amp; Hydronic Plant
          </text>
          <rect x="195" y="155" width="135" height="90" rx="3" fill="#FFFFFF" stroke={strokeMain} strokeWidth="2" />
          <text x="215" y="204" fill={strokeMain} fontSize="11" fontWeight="600" fontFamily="JetBrains Mono, monospace">
            PEERLESS 1250
          </text>

          <rect x="470" y="68" width="440" height="230" fill="#FDF8F6" stroke={strokeMain} strokeWidth="2" />
          <text x="496" y="100" fill={strokeMain} fontSize="13" fontWeight="600" fontFamily="Outfit, sans-serif">
            Fire Sprinkler Riser &amp; Alarm Vault
          </text>
          <rect x="650" y="145" width="140" height="80" rx="3" fill="#FFFFFF" stroke="#B91C1C" strokeWidth="1.5" />
          <text x="670" y="189" fill="#991B1B" fontSize="11" fontWeight="600" fontFamily="JetBrains Mono, monospace">
            6&quot; RISER + FACP
          </text>

          <rect x="90" y="298" width="320" height="214" fill="#F8FAFC" stroke={strokeMain} strokeWidth="2" />
          <text x="114" y="330" fill={strokeMain} fontSize="13" fontWeight="600" fontFamily="Outfit, sans-serif">
            800A Electrical Vault &amp; Meters
          </text>
          <rect x="130" y="395" width="210" height="72" rx="3" fill={fillCore} stroke={strokeMain} strokeWidth="1.5" />
          <text x="155" y="436" fill={strokeMain} fontSize="11" fontWeight="600" fontFamily="JetBrains Mono, monospace">
            UNIT METER BANK
          </text>

          <rect x="410" y="298" width="500" height="214" fill="#FFFFFF" stroke={strokeMain} strokeWidth="2" />
          <text x="436" y="330" fill={strokeMain} fontSize="13" fontWeight="600" fontFamily="Outfit, sans-serif">
            Domestic Water Main, RPZ &amp; Maintenance Corridor
          </text>
          <line x1="410" y1="435" x2="910" y2="435" stroke="#2856D6" strokeWidth="2" strokeDasharray="8 4" />
          <text x="580" y="424" fill="#2856D6" fontSize="10.5" fontFamily="JetBrains Mono, monospace">
            4&quot; COPPER DOMESTIC HEADER
          </text>
        </g>
      )}

      {planKey === 'typical_floor' && (
        <g>
          <rect x="85" y="65" width="830" height="450" fill={fillRoom} stroke={strokeMain} strokeWidth="3" />
          <rect x="145" y="245" width="710" height="90" fill={fillCore} stroke={strokeMain} strokeWidth="1.5" />
          <text x="320" y="295" fill={strokeSub} fontSize="11.5" fontWeight="500" fontFamily="DM Sans, sans-serif">
            Common Corridor · Floors 2–6
          </text>

          <rect x="85" y="65" width="210" height="180" fill="#FFFFFF" stroke={strokeMain} strokeWidth="1.8" />
          <text x="155" y="155" fill={strokeMain} fontSize="13" fontWeight="600" fontFamily="Outfit, sans-serif">Unit X01</text>

          <rect x="295" y="65" width="205" height="180" fill="#FFFFFF" stroke={strokeMain} strokeWidth="1.8" />
          <text x="365" y="155" fill={strokeMain} fontSize="13" fontWeight="600" fontFamily="Outfit, sans-serif">Unit X02</text>

          <rect x="500" y="65" width="205" height="180" fill="#FFFFFF" stroke={strokeMain} strokeWidth="1.8" />
          <text x="570" y="155" fill={strokeMain} fontSize="13" fontWeight="600" fontFamily="Outfit, sans-serif">Unit X03</text>

          <rect x="705" y="65" width="210" height="180" fill="#FFFFFF" stroke={strokeMain} strokeWidth="1.8" />
          <text x="775" y="155" fill={strokeMain} fontSize="13" fontWeight="600" fontFamily="Outfit, sans-serif">Unit X04</text>

          <rect x="85" y="335" width="275" height="180" fill="#FFFFFF" stroke={strokeMain} strokeWidth="1.8" />
          <text x="185" y="430" fill={strokeMain} fontSize="13" fontWeight="600" fontFamily="Outfit, sans-serif">Unit X05</text>

          <rect x="360" y="335" width="280" height="180" fill="#FFFFFF" stroke={strokeMain} strokeWidth="1.8" />
          <text x="465" y="430" fill={strokeMain} fontSize="13" fontWeight="600" fontFamily="Outfit, sans-serif">Unit X06</text>

          <rect x="640" y="335" width="275" height="180" fill="#FFFFFF" stroke={strokeMain} strokeWidth="1.8" />
          <text x="745" y="430" fill={strokeMain} fontSize="13" fontWeight="600" fontFamily="Outfit, sans-serif">Unit X07</text>

          <rect x="465" y="250" width="75" height="80" fill={fillMechanical} stroke={strokeMain} strokeWidth="2" />
          <text x="484" y="294" fill={strokeMain} fontSize="10.5" fontWeight="600" fontFamily="JetBrains Mono, monospace">ELEV</text>

          <rect x="85" y="245" width="60" height="90" fill={fillMechanical} stroke={strokeMain} strokeWidth="1.5" />
          <text x="98" y="294" fill={strokeMain} fontSize="9.5" fontFamily="JetBrains Mono, monospace">ST-A</text>

          <rect x="855" y="245" width="60" height="90" fill={fillMechanical} stroke={strokeMain} strokeWidth="1.5" />
          <text x="868" y="294" fill={strokeMain} fontSize="9.5" fontFamily="JetBrains Mono, monospace">ST-B</text>
        </g>
      )}

      {planKey === 'ground_lobby' && (
        <g>
          <rect x="60" y="55" width="880" height="475" fill="#F5F7FA" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="6 4" />
          <text x="78" y="80" fill={strokeSub} fontSize="10.5" fontWeight="500" fontFamily="DM Sans, sans-serif">
            North Courtyard &amp; Alley Service Access
          </text>

          <rect x="140" y="120" width="720" height="340" fill="#FFFFFF" stroke={strokeMain} strokeWidth="3.2" />

          <line x1="140" y1="120" x2="140" y2="460" stroke="#B45309" strokeWidth="6" />
          <text x="72" y="295" fill="#B45309" fontSize="10.5" fontWeight="600" fontFamily="DM Sans, sans-serif" transform="rotate(-90 72 295)">
            West Brick Elevation
          </text>

          <rect x="400" y="310" width="200" height="150" fill={fillCore} stroke={strokeMain} strokeWidth="2" />
          <text x="452" y="382" fill={strokeMain} fontSize="13.5" fontWeight="600" fontFamily="Outfit, sans-serif">
            Main Lobby
          </text>
          <rect x="445" y="460" width="110" height="42" fill="#ECEEF2" stroke={strokeMain} strokeWidth="2" />
          <text x="468" y="485" fill={strokeMain} fontSize="10.5" fontWeight="600" fontFamily="JetBrains Mono, monospace">
            PORTICO
          </text>

          <rect x="140" y="120" width="260" height="340" fill="#FFFFFF" stroke={strokeMain} strokeWidth="1.5" />
          <text x="195" y="290" fill={strokeSub} fontSize="12.5" fontWeight="500" fontFamily="DM Sans, sans-serif">
            Ground Units — West Wing
          </text>

          <rect x="600" y="120" width="260" height="340" fill="#FFFFFF" stroke={strokeMain} strokeWidth="1.5" />
          <text x="655" y="290" fill={strokeSub} fontSize="12.5" fontWeight="500" fontFamily="DM Sans, sans-serif">
            Ground Units — East Wing
          </text>

          <text x="360" y="520" fill={strokeSub} fontSize="11" fontWeight="500" fontFamily="DM Sans, sans-serif">
            Front Sidewalk &amp; Main Entry Walkway
          </text>
        </g>
      )}

      {planKey === 'garage' && (
        <g>
          <rect x="85" y="68" width="830" height="445" fill="#F8F9FB" stroke={strokeMain} strokeWidth="3" />
          {Array.from({ length: 9 }).map((_, i) => (
            <g key={`n-${i}`}>
              <rect x={115 + i * 76} y="82" width="76" height="120" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
              <text x={135 + i * 76} y="145" fill="#64748B" fontSize="10" fontFamily="JetBrains Mono, monospace">
                P-{101 + i}
              </text>
            </g>
          ))}

          <line x1="115" y1="252" x2="800" y2="252" stroke="#B45309" strokeWidth="3" strokeDasharray="10 5" />
          <text x="340" y="242" fill="#B45309" fontSize="11" fontWeight="600" fontFamily="DM Sans, sans-serif">
            Structural Beam B-32 &amp; Expansion Joint
          </text>

          {Array.from({ length: 7 }).map((_, i) => (
            <g key={`s-${i}`}>
              <rect x={115 + i * 76} y="378" width="76" height="120" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
              <text x={135 + i * 76} y="445" fill="#64748B" fontSize="10" fontFamily="JetBrains Mono, monospace">
                P-{110 + i}
              </text>
            </g>
          ))}

          <rect x="685" y="360" width="215" height="140" fill={fillCore} stroke={strokeMain} strokeWidth="2" />
          <text x="725" y="425" fill={strokeMain} fontSize="12.5" fontWeight="600" fontFamily="Outfit, sans-serif">
            Ramp &amp; Gate
          </text>
          <line x1="685" y1="382" x2="900" y2="382" stroke="#2856D6" strokeWidth="2" strokeDasharray="4 4" />
          <text x="712" y="374" fill="#2856D6" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
            TRENCH DRAIN
          </text>
        </g>
      )}
    </svg>
  );
}

function ScannedObjectGlyph({
  obj,
  x,
  y,
  isSelected,
  onClick,
}: {
  obj: ScannedObject;
  x: number;
  y: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const ring = isSelected ? '#111318' : '#FFFFFF';
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="cursor-pointer"
    >
      {obj.objectType === 'door' && (
        <g>
          <line x1="-10" y1="0" x2="10" y2="0" stroke="#1C4ED8" strokeWidth="2.5" />
          <path d="M -10 0 A 16 16 0 0 1 6 -16" fill="none" stroke="#1C4ED8" strokeWidth="1.2" strokeDasharray="3 2" />
          <line x1="-10" y1="0" x2="-10" y2="-16" stroke="#1C4ED8" strokeWidth="2" />
        </g>
      )}
      {obj.objectType === 'window' && (
        <g>
          <rect x="-12" y="-3" width="24" height="6" fill="#EEF3FF" stroke="#2856D6" strokeWidth="1.5" />
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#2856D6" strokeWidth="1" />
        </g>
      )}
      {obj.objectType === 'stairs' && (
        <g>
          <rect x="-12" y="-9" width="24" height="18" fill="#F8F3E8" stroke="#1C4ED8" strokeWidth="1.5" />
          <line x1="-6" y1="-9" x2="-6" y2="9" stroke="#1C4ED8" strokeWidth="1" />
          <line x1="0" y1="-9" x2="0" y2="9" stroke="#1C4ED8" strokeWidth="1" />
          <line x1="6" y1="-9" x2="6" y2="9" stroke="#1C4ED8" strokeWidth="1" />
        </g>
      )}
      {obj.objectType === 'ladder' && (
        <g>
          <line x1="-5" y1="-11" x2="-5" y2="11" stroke="#1C4ED8" strokeWidth="1.8" />
          <line x1="5" y1="-11" x2="5" y2="11" stroke="#1C4ED8" strokeWidth="1.8" />
          <line x1="-5" y1="-6" x2="5" y2="-6" stroke="#1C4ED8" strokeWidth="1.2" />
          <line x1="-5" y1="0" x2="5" y2="0" stroke="#1C4ED8" strokeWidth="1.2" />
          <line x1="-5" y1="6" x2="5" y2="6" stroke="#1C4ED8" strokeWidth="1.2" />
        </g>
      )}
      {obj.objectType === 'furniture' && (
        <rect x="-10" y="-7" width="20" height="14" rx="2" fill="#ECEEF2" stroke="#525866" strokeWidth="1.4" />
      )}
      {!['door', 'window', 'stairs', 'ladder', 'furniture'].includes(obj.objectType) && (
        <circle
          cx="0"
          cy="0"
          r="7"
          fill={
            obj.objectType === 'fire_safety'
              ? '#B91C1C'
              : obj.objectType === 'boiler_hvac'
              ? '#1C4ED8'
              : obj.objectType === 'electrical_panel'
              ? '#B45309'
              : '#2856D6'
          }
          stroke={ring}
          strokeWidth={isSelected ? '2.5' : '1.5'}
        />
      )}

      {isSelected && (
        <circle cx="0" cy="0" r="15" fill="none" stroke="#111318" strokeWidth="1.5" strokeDasharray="3 2" />
      )}

      <text
        x="0"
        y="19"
        textAnchor="middle"
        fill="#111318"
        fontSize="8.5"
        fontWeight="600"
        fontFamily="DM Sans, sans-serif"
      >
        {obj.name.slice(0, 16)}
      </text>
    </g>
  );
}

export function FloorplanCanvas({
  plan,
  associationName,
  assets,
  openIssues,
  selectedAssetId,
  placePinMode,
  onSelectAsset,
  onSelectWorkOrder,
  onPlacePinCoords,
  onPromoteScannedObject,
  onPromoteDraftElement,
  onOpenStudio,
}: FloorplanCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedScanned, setSelectedScanned] = useState<{
    space: ScannedSpace;
    object: ScannedObject;
  } | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<FloorPlanElement | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const activeVersion =
    plan.versions.find((v) => v.id === plan.activeVersionId) || plan.versions[0];

  const scannedSpaces = plan.scannedSpaces || [];
  const draftElements = plan.draftElements || [];
  const scalePxPerFoot = plan.draftScalePxPerFoot || 10;

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placePinMode || !canvasRef.current) {
      setSelectedDraft(null);
      setSelectedScanned(null);
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(4, Math.min(96, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(4, Math.min(96, ((e.clientY - rect.top) / rect.height) * 100));
    onPlacePinCoords(Number(x.toFixed(1)), Number(y.toFixed(1)));
  };

  const standaloneIssues = openIssues.filter(
    (wo) => wo.planId === plan.id && wo.status !== 'closed' && (!wo.assetId || !assets.some((a) => a.id === wo.assetId))
  );

  return (
    <div className="arch-surface rounded-2xl overflow-hidden">
      {/* Crisp Modern Canvas Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-5 py-3 bg-white border-b border-black/[0.06]">
        <div className="flex items-center gap-2.5 text-xs text-[#525866] min-w-0">
          <span className="font-mono font-semibold text-[#1C4ED8] whitespace-nowrap">
            {plan.levelCode}
          </span>
          <span aria-hidden="true" className="text-[#CBD5E1]">·</span>
          <span className="font-display font-semibold text-[#111318] truncate">{activeVersion.label}</span>
          {draftElements.length > 0 && (
            <>
              <span aria-hidden="true" className="hidden md:inline text-[#CBD5E1]">·</span>
              <span className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-[#1C4ED8] whitespace-nowrap">
                <Layers className="w-3.5 h-3.5" />
                {draftElements.length} Drafted
              </span>
            </>
          )}
          {scannedSpaces.length > 0 && (
            <>
              <span aria-hidden="true" className="hidden md:inline text-[#CBD5E1]">·</span>
              <span className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-[#15803D] whitespace-nowrap">
                <ScanLine className="w-3.5 h-3.5" />
                {scannedSpaces.length} Scanned
              </span>
            </>
          )}
          {activeVersion.calibrationLabel && (
            <>
              <span aria-hidden="true" className="hidden xl:inline text-[#CBD5E1]">·</span>
              <span className="hidden xl:inline text-xs text-[#788090] whitespace-nowrap">
                {activeVersion.calibrationLabel}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {placePinMode && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1C4ED8] mr-2 whitespace-nowrap">
              <Crosshair className="w-3.5 h-3.5" />
              Click blueprint to drop pin
            </span>
          )}
          <div className="inline-flex items-center bg-[#F4F5F7] rounded-xl p-0.5 border border-black/[0.06]">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.2).toFixed(1))))}
              className="p-1.5 text-[#525866] hover:text-[#111318] hover:bg-white rounded-lg transition-colors"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs tabular-nums text-[#525866] w-11 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.2).toFixed(1))))}
              className="p-1.5 text-[#525866] hover:text-[#111318] hover:bg-white rounded-lg transition-colors"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-1.5 text-[#525866] hover:text-[#111318] hover:bg-white rounded-lg transition-colors"
              title="Reset zoom"
              aria-label="Reset zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Inline Drafted Element Inspector Strip */}
      {selectedDraft && (
        <div className="px-5 py-3 bg-[#F5F8FF] border-b border-[#C7D7FE] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="min-w-0">
            <div className="font-display font-semibold text-[#111318]">
              {selectedDraft.label}{' '}
              <span className="font-sans font-normal text-[#2856D6]">
                · {selectedDraft.kind.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="text-xs text-[#525866] mt-0.5 tabular-nums">
              {(selectedDraft.width / scalePxPerFoot).toFixed(1)}&apos; W ×{' '}
              {(selectedDraft.height / scalePxPerFoot).toFixed(1)}&apos; D (
              {Math.round(
                (selectedDraft.width / scalePxPerFoot) * (selectedDraft.height / scalePxPerFoot)
              )}{' '}
              sq ft)
              {selectedDraft.notes ? ` · ${selectedDraft.notes}` : ''}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenStudio && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDraft(null);
                  onOpenStudio();
                }}
                className="arch-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit in Studio
              </button>
            )}
            {selectedDraft.promotedAssetId ? (
              <button
                type="button"
                onClick={() => onSelectAsset(selectedDraft.promotedAssetId!)}
                className="arch-btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
              >
                Open Linked Asset
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              onPromoteDraftElement && (
                <button
                  type="button"
                  onClick={() => {
                    onPromoteDraftElement(plan.id, selectedDraft.id);
                    setSelectedDraft(null);
                  }}
                  className="arch-btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
                >
                  <Pin className="w-3.5 h-3.5" />
                  Promote to Asset Pin
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setSelectedDraft(null)}
              className="p-1.5 text-[#525866] hover:text-[#111318] rounded-lg hover:bg-black/[0.04]"
              aria-label="Close element inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Inline Scanned Object Inspector Strip */}
      {selectedScanned && (
        <div className="px-5 py-3 bg-[#F5F8FF] border-b border-[#C7D7FE] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="min-w-0">
            <div className="font-display font-semibold text-[#111318]">
              {selectedScanned.object.name}{' '}
              <span className="font-sans font-normal text-[#2856D6]">
                · {selectedScanned.object.objectType.replace('_', ' ')} in {selectedScanned.space.name}
              </span>
            </div>
            <div className="text-xs text-[#525866] mt-0.5 tabular-nums">
              {selectedScanned.object.widthFt}&apos; × {selectedScanned.object.depthFt}&apos; ·{' '}
              {selectedScanned.object.wallSide} wall
              {selectedScanned.object.notes ? ` · ${selectedScanned.object.notes}` : ''}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedScanned.object.promotedAssetId ? (
              <button
                type="button"
                onClick={() => onSelectAsset(selectedScanned.object.promotedAssetId!)}
                className="arch-btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
              >
                Open Linked Asset
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              onPromoteScannedObject && (
                <button
                  type="button"
                  onClick={() => {
                    onPromoteScannedObject(plan.id, selectedScanned.space.id, selectedScanned.object.id);
                    setSelectedScanned(null);
                  }}
                  className="arch-btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
                >
                  <Pin className="w-3.5 h-3.5" />
                  Promote to Tracked Asset Pin
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setSelectedScanned(null)}
              className="p-1.5 text-[#525866] hover:text-[#111318] rounded-lg hover:bg-black/[0.04]"
              aria-label="Close object inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive drafting canvas */}
      <div
        className={`relative blueprint-grid p-3 sm:p-4 ${
          zoom > 1 ? 'overflow-auto' : 'overflow-x-auto overflow-y-hidden'
        }`}
        style={zoom > 1 ? { maxHeight: '70vh' } : undefined}
      >
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`relative mx-auto rounded-xl overflow-hidden shadow-[0_6px_28px_-12px_rgba(15,23,42,0.18)] border border-black/[0.08] bg-white transition-transform duration-150 origin-top-left ${
            placePinMode ? 'cursor-crosshair' : 'cursor-default'
          }`}
          style={{
            width: `${zoom * 100}%`,
            maxWidth: zoom <= 1 ? '960px' : 'none',
            minWidth: '640px',
            aspectRatio: '1000 / 620',
          }}
        >
          {(() => {
            const useEditableSheet =
              !activeVersion.uploadedImageUrl && plan.draftElements !== undefined;
            return (
              <div
                className="w-full h-full"
                style={{
                  opacity:
                    !useEditableSheet && draftElements.length > 0 && activeVersion.builtInKey !== 'manual_draft'
                      ? plan.underlayOpacity ?? 0.85
                      : 1,
                }}
              >
                {activeVersion.uploadedImageUrl ? (
                  <img
                    src={activeVersion.uploadedImageUrl}
                    alt={`${plan.name} — ${activeVersion.label}`}
                    className="w-full h-full object-contain bg-[#FAFBFD] select-none pointer-events-none"
                  />
                ) : (
                  <BuiltInArchitecturalSvg
                    planKey={useEditableSheet ? 'manual_draft' : activeVersion.builtInKey || 'roof'}
                    versionLabel={activeVersion.label}
                    associationName={associationName}
                  />
                )}
              </div>
            );
          })()}

          {/* Scanned Spaces & Detected Objects Architectural Overlay */}
          {scannedSpaces.length > 0 && (
            <svg
              viewBox="0 0 1000 620"
              className="absolute inset-0 w-full h-full z-[5]"
              aria-label="Camera scanned rooms and objects overlay"
            >
              {scannedSpaces.map((sp) => {
                const rx = (sp.planX / 100) * 1000;
                const ry = (sp.planY / 100) * 620;
                const rw = (sp.planWidthPct / 100) * 1000;
                const rh = (sp.planHeightPct / 100) * 620;

                return (
                  <g key={sp.id}>
                    <rect
                      x={rx}
                      y={ry}
                      width={rw}
                      height={rh}
                      fill="rgba(238, 243, 255, 0.84)"
                      stroke="#1C4ED8"
                      strokeWidth="2.2"
                    />
                    <rect
                      x={rx + 4}
                      y={ry + 4}
                      width={Math.max(10, rw - 8)}
                      height={Math.max(10, rh - 8)}
                      fill="none"
                      stroke="#2856D6"
                      strokeWidth="0.8"
                      strokeDasharray="4 3"
                    />
                    <text
                      x={rx + rw / 2}
                      y={ry - 6}
                      textAnchor="middle"
                      fill="#1C4ED8"
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {sp.widthFt}&apos; W × {sp.lengthFt}&apos; L ({sp.areaSqFt} SF)
                    </text>
                    <text
                      x={rx + rw / 2}
                      y={ry + 20}
                      textAnchor="middle"
                      fill="#111318"
                      fontSize="11.5"
                      fontWeight="700"
                      fontFamily="Outfit, sans-serif"
                    >
                      {sp.name}
                    </text>
                    {sp.objects.map((obj) => {
                      const ox = rx + (obj.xPct / 100) * rw;
                      const oy = ry + (obj.yPct / 100) * rh;
                      const isSel =
                        selectedScanned?.space.id === sp.id && selectedScanned?.object.id === obj.id;
                      return (
                        <ScannedObjectGlyph
                          key={obj.id}
                          obj={obj}
                          x={ox}
                          y={oy}
                          isSelected={isSel}
                          onClick={() => {
                            if (!placePinMode) {
                              setSelectedDraft(null);
                              setSelectedScanned({ space: sp, object: obj });
                            }
                          }}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          )}

          {/* Manually Drafted Floorplan Elements Overlay */}
          {draftElements.length > 0 && (
            <svg
              viewBox="0 0 1000 620"
              className="absolute inset-0 w-full h-full z-[6]"
              aria-label="Manually drafted architectural floorplan elements"
            >
              {draftElements.map((el) => (
                <DraftElementSvg
                  key={el.id}
                  element={el}
                  scalePxPerFoot={scalePxPerFoot}
                  isSelected={selectedDraft?.id === el.id}
                  isInteractive={false}
                  onClick={(e) => {
                    if (placePinMode) return;
                    e.stopPropagation();
                    setSelectedScanned(null);
                    setSelectedDraft(el);
                  }}
                />
              ))}
            </svg>
          )}

          {/* Asset Pins */}
          {assets.map((asset) => {
            const isSelected = selectedAssetId === asset.id;
            const isHovered = hoveredId === asset.id;
            const assetOpenWOs = openIssues.filter(
              (wo) => wo.assetId === asset.id && wo.status !== 'closed'
            );
            const pinBg =
              asset.condition === 'red'
                ? 'bg-[#B91C1C]'
                : asset.condition === 'yellow'
                ? 'bg-[#B45309]'
                : 'bg-[#1C4ED8]';

            return (
              <div
                key={asset.id}
                style={{ left: `${asset.x}%`, top: `${asset.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!placePinMode) onSelectAsset(asset.id);
                  }}
                  onMouseEnter={() => setHoveredId(asset.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-white text-[11px] font-mono font-semibold shadow-md ring-2 ring-white/90 transition-transform duration-150 whitespace-nowrap ${pinBg} ${
                    isSelected
                      ? 'ring-[#111318] scale-110'
                      : 'hover:scale-105'
                  }`}
                  aria-label={`${asset.code} ${asset.name}`}
                >
                  <span>{asset.code}</span>
                  {assetOpenWOs.length > 0 && (
                    <span className="border-l border-white/30 pl-1.5 text-[10px]">
                      {assetOpenWOs.length} WO
                    </span>
                  )}
                </button>

                {(isHovered || isSelected) && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 w-64 bg-[#111318] text-white p-3 rounded-xl shadow-xl border border-white/10 pointer-events-none z-20">
                    <div className="text-xs font-display font-semibold leading-snug">{asset.name}</div>
                    <div className="mt-1 text-[11px] text-[#93B4FD]">
                      {asset.category} · {asset.condition.toUpperCase()}
                      {assetOpenWOs.length > 0 ? ` · ${assetOpenWOs.length} open issue` : ''}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Standalone Resident / Work-Order Issue Pins */}
          {standaloneIssues.map((wo) => (
            <div
              key={wo.id}
              style={{ left: `${wo.x}%`, top: `${wo.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!placePinMode) onSelectWorkOrder(wo.id);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#B91C1C] text-white text-[11px] font-mono font-semibold shadow-md ring-2 ring-white/90 hover:scale-105 transition-transform whitespace-nowrap"
              >
                <span>{wo.code}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Clean Footer Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-[#FAFBFD] border-t border-black/[0.06] text-xs text-[#525866]">
        <span className="font-medium text-[#374151]">{plan.areaDescription}</span>
        <span className="text-xs text-[#788090]">
          Cobalt: Current · Amber: Attention · Crimson: Deficient
        </span>
      </div>
    </div>
  );
}

