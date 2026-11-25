import React from 'react';
import { DraftElementKind, FloorPlanElement } from '../types/condocore';

interface DraftElementSvgProps {
  element: FloorPlanElement;
  scalePxPerFoot?: number;
  isSelected?: boolean;
  isInteractive?: boolean;
  onPointerDown?: (e: React.PointerEvent<SVGGElement>) => void;
  onClick?: (e: React.MouseEvent<SVGGElement>) => void;
}

export function renderDraftShapeBody(
  kind: DraftElementKind,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  label: string,
  scalePxPerFoot = 10,
  compactPreview = false
) {
  const widthFt = Number((w / scalePxPerFoot).toFixed(1));
  const heightFt = Number((h / scalePxPerFoot).toFixed(1));
  const areaSqFt = Math.round(widthFt * heightFt);

  switch (kind) {
    case 'room':
    case 'unit_box':
    case 'corridor':
      return (
        <g>
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill={fill}
            stroke={stroke}
            strokeWidth={kind === 'corridor' ? 1.8 : 2.8}
          />
          {kind === 'unit_box' && w > 50 && h > 50 && (
            <rect
              x={5}
              y={5}
              width={Math.max(4, w - 10)}
              height={Math.max(4, h - 10)}
              fill="none"
              stroke={stroke}
              strokeOpacity={0.22}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          )}
          {!compactPreview && w >= 46 && h >= 28 && (
            <>
              <text
                x={w / 2}
                y={h / 2 - (h > 62 ? 5 : -3)}
                textAnchor="middle"
                fill="#121316"
                fontSize={Math.min(13, Math.max(9, w / 16))}
                fontWeight="700"
                fontFamily="Outfit, DM Sans, sans-serif"
              >
                {label}
              </text>
              {h > 62 && (
                <text
                  x={w / 2}
                  y={h / 2 + 12}
                  textAnchor="middle"
                  fill="#525763"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {widthFt}&apos; × {heightFt}&apos; · {areaSqFt} SF
                </text>
              )}
            </>
          )}
        </g>
      );

    case 'wall':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1} />
          <line
            x1={2}
            y1={h / 2}
            x2={Math.max(2, w - 2)}
            y2={h / 2}
            stroke="#FFFFFF"
            strokeOpacity={0.25}
            strokeWidth={1}
            strokeDasharray="6 4"
          />
        </g>
      );

    case 'column':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1.5} />
          <line x1={0} y1={0} x2={w} y2={h} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1} />
          <line x1={w} y1={0} x2={0} y2={h} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1} />
        </g>
      );

    case 'balcony':
      return (
        <g>
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.6}
            strokeDasharray="6 3"
          />
          <line x1={4} y1={h - 4} x2={w - 4} y2={h - 4} stroke={stroke} strokeWidth={2} />
          {!compactPreview && (
            <text
              x={w / 2}
              y={h / 2 + 3}
              textAnchor="middle"
              fill="#525763"
              fontSize="9.5"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          )}
        </g>
      );

    case 'door_swing': {
      const r = Math.min(w, h);
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill="rgba(28,78,216,0.04)" />
          {/* Door leaf */}
          <line x1={2} y1={h - 2} x2={2} y2={h - r + 2} stroke={stroke} strokeWidth={3} strokeLinecap="square" />
          {/* Swing arc */}
          <path
            d={`M 2 ${h - r + 2} A ${r - 4} ${r - 4} 0 0 1 ${r - 2} ${h - 2}`}
            fill="none"
            stroke={stroke}
            strokeWidth={1.4}
            strokeDasharray="3 2"
          />
          {/* Threshold sill */}
          <line x1={0} y1={h - 2} x2={w} y2={h - 2} stroke={stroke} strokeWidth={1.5} />
        </g>
      );
    }

    case 'double_door': {
      const half = w / 2;
      const r = Math.min(half, h);
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill="rgba(28,78,216,0.04)" />
          <line x1={2} y1={h - 2} x2={2} y2={h - r + 2} stroke={stroke} strokeWidth={2.8} />
          <path
            d={`M 2 ${h - r + 2} A ${r - 3} ${r - 3} 0 0 1 ${r - 1} ${h - 2}`}
            fill="none"
            stroke={stroke}
            strokeWidth={1.3}
            strokeDasharray="3 2"
          />
          <line x1={w - 2} y1={h - 2} x2={w - 2} y2={h - r + 2} stroke={stroke} strokeWidth={2.8} />
          <path
            d={`M ${w - 2} ${h - r + 2} A ${r - 3} ${r - 3} 0 0 0 ${w - r + 1} ${h - 2}`}
            fill="none"
            stroke={stroke}
            strokeWidth={1.3}
            strokeDasharray="3 2"
          />
          <line x1={0} y1={h - 2} x2={w} y2={h - 2} stroke={stroke} strokeWidth={1.5} />
        </g>
      );
    }

    case 'sliding_door':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1.6} />
          <line x1={4} y1={h * 0.35} x2={w * 0.58} y2={h * 0.35} stroke={stroke} strokeWidth={2.2} />
          <line x1={w * 0.42} y1={h * 0.68} x2={w - 4} y2={h * 0.68} stroke={stroke} strokeWidth={2.2} />
        </g>
      );

    case 'window':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1.8} />
          <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={stroke} strokeWidth={1.3} />
          <line x1={w / 3} y1={0} x2={w / 3} y2={h} stroke={stroke} strokeWidth={1} />
          <line x1={(w * 2) / 3} y1={0} x2={(w * 2) / 3} y2={h} stroke={stroke} strokeWidth={1} />
        </g>
      );

    case 'garage_gate':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1.8} />
          <line x1={4} y1={h / 2} x2={w - 4} y2={h / 2} stroke={stroke} strokeWidth={1.5} strokeDasharray="6 3" />
          <rect x={0} y={0} width={6} height={h} fill={stroke} />
          <rect x={w - 6} y={0} width={6} height={h} fill={stroke} />
        </g>
      );

    case 'stairs': {
      const steps = Math.max(4, Math.min(14, Math.floor(w / 10)));
      const stepW = w / steps;
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={2} />
          {Array.from({ length: steps - 1 }).map((_, idx) => (
            <line
              key={idx}
              x1={(idx + 1) * stepW}
              y1={0}
              x2={(idx + 1) * stepW}
              y2={h}
              stroke={stroke}
              strokeWidth={1.1}
            />
          ))}
          {/* Direction arrow */}
          <line x1={8} y1={h / 2} x2={w - 10} y2={h / 2} stroke={stroke} strokeWidth={1.5} />
          <polyline
            points={`${w - 16},${h / 2 - 5} ${w - 8},${h / 2} ${w - 16},${h / 2 + 5}`}
            fill="none"
            stroke={stroke}
            strokeWidth={1.6}
          />
          {!compactPreview && (
            <text
              x={w / 2}
              y={h - 5}
              textAnchor="middle"
              fill="#121316"
              fontSize="8.5"
              fontWeight="600"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          )}
        </g>
      );
    }

    case 'elevator':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={2.2} />
          <line x1={0} y1={0} x2={w} y2={h} stroke={stroke} strokeOpacity={0.35} strokeWidth={1.2} />
          <line x1={w} y1={0} x2={0} y2={h} stroke={stroke} strokeOpacity={0.35} strokeWidth={1.2} />
          <rect x={w * 0.2} y={h * 0.25} width={w * 0.6} height={h * 0.5} fill="#FFFFFF" stroke={stroke} strokeWidth={1} />
          {!compactPreview && (
            <text
              x={w / 2}
              y={h / 2 + 3.5}
              textAnchor="middle"
              fill={stroke}
              fontSize="9.5"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              {label.slice(0, 10)}
            </text>
          )}
        </g>
      );

    case 'ladder': {
      const rungs = Math.max(3, Math.floor(h / 10));
      return (
        <g>
          <line x1={w * 0.22} y1={2} x2={w * 0.22} y2={h - 2} stroke={stroke} strokeWidth={2.4} />
          <line x1={w * 0.78} y1={2} x2={w * 0.78} y2={h - 2} stroke={stroke} strokeWidth={2.4} />
          {Array.from({ length: rungs }).map((_, i) => {
            const ry = ((i + 1) / (rungs + 1)) * h;
            return (
              <line
                key={i}
                x1={w * 0.22}
                y1={ry}
                x2={w * 0.78}
                y2={ry}
                stroke={stroke}
                strokeWidth={1.5}
              />
            );
          })}
        </g>
      );
    }

    case 'ramp':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1.8} />
          <line x1={12} y1={h / 2} x2={w - 14} y2={h / 2} stroke={stroke} strokeWidth={1.8} strokeDasharray="6 3" />
          <polyline
            points={`${w - 22},${h / 2 - 7} ${w - 10},${h / 2} ${w - 22},${h / 2 + 7}`}
            fill="none"
            stroke={stroke}
            strokeWidth={1.8}
          />
          {!compactPreview && (
            <text
              x={w / 2}
              y={h / 2 - 10}
              textAnchor="middle"
              fill="#121316"
              fontSize="9.5"
              fontWeight="600"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          )}
        </g>
      );

    case 'boiler_hvac':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={4} fill={fill} stroke={stroke} strokeWidth={2} />
          <circle cx={w * 0.26} cy={h / 2} r={Math.min(w, h) * 0.26} fill="none" stroke={stroke} strokeWidth={1.4} />
          <line x1={w * 0.52} y1={h * 0.3} x2={w * 0.88} y2={h * 0.3} stroke={stroke} strokeWidth={1.4} />
          <line x1={w * 0.52} y1={h * 0.5} x2={w * 0.88} y2={h * 0.5} stroke={stroke} strokeWidth={1.4} />
          <line x1={w * 0.52} y1={h * 0.7} x2={w * 0.88} y2={h * 0.7} stroke={stroke} strokeWidth={1.4} />
          {!compactPreview && (
            <text
              x={w / 2}
              y={h + 12}
              textAnchor="middle"
              fill="#121316"
              fontSize="9"
              fontWeight="600"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          )}
        </g>
      );

    case 'fire_riser':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={3} fill={fill} stroke={stroke} strokeWidth={2} />
          <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.28} fill={stroke} fillOpacity={0.14} stroke={stroke} strokeWidth={1.6} />
          <line x1={w / 2 - 6} y1={h / 2} x2={w / 2 + 6} y2={h / 2} stroke={stroke} strokeWidth={2} />
          <line x1={w / 2} y1={h / 2 - 6} x2={w / 2} y2={h / 2 + 6} stroke={stroke} strokeWidth={2} />
          {!compactPreview && (
            <text
              x={w / 2}
              y={h + 12}
              textAnchor="middle"
              fill="#991B1B"
              fontSize="9"
              fontWeight="600"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          )}
        </g>
      );

    case 'electrical_panel':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={2} />
          <polygon
            points={`${w / 2 + 2},${h * 0.16} ${w / 2 - 6},${h * 0.52} ${w / 2},${h * 0.52} ${w / 2 - 2},${h * 0.84} ${w / 2 + 6},${h * 0.46} ${w / 2},${h * 0.46}`}
            fill={stroke}
          />
          {!compactPreview && (
            <text
              x={w / 2}
              y={h + 12}
              textAnchor="middle"
              fill="#92400E"
              fontSize="9"
              fontWeight="600"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          )}
        </g>
      );

    case 'water_valve':
      return (
        <g>
          <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2 - 2} fill={fill} stroke={stroke} strokeWidth={2} />
          <polygon
            points={`${w * 0.24},${h * 0.3} ${w * 0.5},${h * 0.5} ${w * 0.24},${h * 0.7}`}
            fill={stroke}
          />
          <polygon
            points={`${w * 0.76},${h * 0.3} ${w * 0.5},${h * 0.5} ${w * 0.76},${h * 0.7}`}
            fill={stroke}
          />
          {!compactPreview && (
            <text
              x={w / 2}
              y={h + 12}
              textAnchor="middle"
              fill="#0369A1"
              fontSize="9"
              fontWeight="600"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          )}
        </g>
      );

    case 'roof_drain': {
      const r = Math.min(w, h) / 2 - 2;
      return (
        <g>
          <circle cx={w / 2} cy={h / 2} r={r} fill={fill} stroke={stroke} strokeWidth={1.8} />
          <circle cx={w / 2} cy={h / 2} r={r * 0.45} fill="none" stroke={stroke} strokeWidth={1.3} />
          <line x1={w / 2 - r} y1={h / 2} x2={w / 2 + r} y2={h / 2} stroke={stroke} strokeWidth={1} />
          <line x1={w / 2} y1={h / 2 - r} x2={w / 2} y2={h / 2 + r} stroke={stroke} strokeWidth={1} />
          {!compactPreview && (
            <text
              x={w / 2}
              y={h + 12}
              textAnchor="middle"
              fill="#1C4ED8"
              fontSize="8.5"
              fontWeight="600"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          )}
        </g>
      );
    }

    case 'meter_bank':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1.8} />
          {[0.2, 0.4, 0.6, 0.8].map((pos, i) => (
            <circle
              key={i}
              cx={w * pos}
              cy={h / 2}
              r={Math.min(7, h * 0.28)}
              fill="#FFFFFF"
              stroke={stroke}
              strokeWidth={1.2}
            />
          ))}
          {!compactPreview && (
            <text
              x={w / 2}
              y={h + 12}
              textAnchor="middle"
              fill="#121316"
              fontSize="9"
              fontWeight="600"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          )}
        </g>
      );

    case 'parking_stall':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1.5} />
          <line x1={8} y1={14} x2={w - 8} y2={14} stroke={stroke} strokeWidth={2} />
          {!compactPreview && (
            <text
              x={w / 2}
              y={h / 2 + 4}
              textAnchor="middle"
              fill="#525763"
              fontSize="11"
              fontWeight="600"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          )}
        </g>
      );

    case 'walkway':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1.4} strokeDasharray="5 3" />
          {!compactPreview && (
            <text
              x={w / 2}
              y={h / 2 + 3.5}
              textAnchor="middle"
              fill="#525763"
              fontSize="9.5"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          )}
        </g>
      );

    case 'courtyard_tree': {
      const r = Math.min(w, h) / 2 - 2;
      return (
        <g>
          <circle cx={w / 2} cy={h / 2} r={r} fill={fill} stroke={stroke} strokeWidth={1.6} strokeDasharray="4 2" />
          <circle cx={w / 2} cy={h / 2} r={r * 0.55} fill="none" stroke={stroke} strokeOpacity={0.5} strokeWidth={1.2} />
          <circle cx={w / 2} cy={h / 2} r={3} fill={stroke} />
        </g>
      );
    }

    case 'desk_table':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={3} fill={fill} stroke={stroke} strokeWidth={1.6} />
          <rect x={6} y={6} width={Math.max(4, w - 12)} height={Math.max(4, h - 12)} fill="none" stroke={stroke} strokeOpacity={0.35} strokeWidth={1} />
          {!compactPreview && w >= 42 && (
            <text x={w / 2} y={h / 2 + 3} textAnchor="middle" fill="#525763" fontSize="8.5" fontFamily="JetBrains Mono, monospace">
              {label.slice(0, 12)}
            </text>
          )}
        </g>
      );

    case 'sofa':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={5} fill={fill} stroke={stroke} strokeWidth={1.6} />
          <rect x={4} y={3} width={w - 8} height={h * 0.28} rx={2} fill={stroke} fillOpacity={0.14} />
          <line x1={w / 3} y1={h * 0.34} x2={w / 3} y2={h - 3} stroke={stroke} strokeOpacity={0.4} strokeWidth={1} />
          <line x1={(w * 2) / 3} y1={h * 0.34} x2={(w * 2) / 3} y2={h - 3} stroke={stroke} strokeOpacity={0.4} strokeWidth={1} />
        </g>
      );

    case 'bed':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={3} fill={fill} stroke={stroke} strokeWidth={1.6} />
          <rect x={5} y={5} width={w * 0.4} height={h * 0.22} rx={2} fill="#FFFFFF" stroke={stroke} strokeWidth={1.1} />
          <rect x={w * 0.55} y={5} width={w * 0.4} height={h * 0.22} rx={2} fill="#FFFFFF" stroke={stroke} strokeWidth={1.1} />
          <line x1={0} y1={h * 0.4} x2={w} y2={h * 0.4} stroke={stroke} strokeWidth={1.2} />
        </g>
      );

    case 'kitchen_counter':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1.6} />
          <rect x={w * 0.58} y={4} width={w * 0.28} height={Math.max(6, h - 8)} rx={2} fill="#FFFFFF" stroke={stroke} strokeWidth={1.2} />
          <circle cx={w * 0.72} cy={h / 2} r={2} fill={stroke} />
        </g>
      );

    case 'storage_rack':
    case 'workbench':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1.6} />
          <line x1={w * 0.25} y1={0} x2={w * 0.25} y2={h} stroke={stroke} strokeOpacity={0.4} strokeWidth={1} />
          <line x1={w * 0.5} y1={0} x2={w * 0.5} y2={h} stroke={stroke} strokeOpacity={0.4} strokeWidth={1} />
          <line x1={w * 0.75} y1={0} x2={w * 0.75} y2={h} stroke={stroke} strokeOpacity={0.4} strokeWidth={1} />
          {!compactPreview && (
            <text x={w / 2} y={h / 2 + 3} textAnchor="middle" fill="#121316" fontSize="8.5" fontFamily="JetBrains Mono, monospace">
              {label.slice(0, 16)}
            </text>
          )}
        </g>
      );

    case 'zone_callout':
      return (
        <g>
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.6}
            strokeDasharray="6 3"
          />
          {!compactPreview && (
            <>
              <text
                x={10}
                y={18}
                fill={stroke}
                fontSize="10.5"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
              >
                {label.toUpperCase()}
              </text>
              <text
                x={10}
                y={h - 8}
                fill={stroke}
                fillOpacity={0.8}
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                {widthFt}&apos; × {heightFt}&apos; ({areaSqFt} SF)
              </text>
            </>
          )}
        </g>
      );

    case 'dimension_line':
      return (
        <g>
          <line x1={2} y1={h / 2} x2={w - 2} y2={h / 2} stroke={stroke} strokeWidth={1.5} />
          <line x1={2} y1={3} x2={2} y2={h - 3} stroke={stroke} strokeWidth={1.8} />
          <line x1={w - 2} y1={3} x2={w - 2} y2={h - 3} stroke={stroke} strokeWidth={1.8} />
          <rect x={w / 2 - 26} y={h / 2 - 8} width={52} height={16} rx={2} fill="#FFFFFF" />
          <text
            x={w / 2}
            y={h / 2 + 3.5}
            textAnchor="middle"
            fill={stroke}
            fontSize="10"
            fontWeight="700"
            fontFamily="JetBrains Mono, monospace"
          >
            {widthFt}&apos;
          </text>
        </g>
      );

    case 'text_label':
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={3} fill={fill} stroke={stroke} strokeWidth={1} />
          <text
            x={w / 2}
            y={h / 2 + 4}
            textAnchor="middle"
            fill="#121316"
            fontSize="11"
            fontWeight="600"
            fontFamily="Outfit, DM Sans, sans-serif"
          >
            {label}
          </text>
        </g>
      );

    default:
      return <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1.8} />;
  }
}

export function StencilPreviewIcon({
  kind,
  fillColor,
  strokeColor,
}: {
  kind: DraftElementKind;
  fillColor: string;
  strokeColor: string;
}) {
  return (
    <svg viewBox="0 0 56 36" className="w-11 h-7 shrink-0 overflow-visible" aria-hidden="true">
      <g transform="translate(6, 4)">
        {renderDraftShapeBody(kind, 44, 28, fillColor, strokeColor, '', 10, true)}
      </g>
    </svg>
  );
}

export function DraftElementSvg({
  element,
  scalePxPerFoot = 10,
  isSelected = false,
  isInteractive = true,
  onPointerDown,
  onClick,
}: DraftElementSvgProps) {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const fill = element.fillColor ?? '#FFFFFF';
  const stroke = element.strokeColor ?? '#1C4ED8';

  return (
    <g
      transform={`translate(${element.x}, ${element.y}) rotate(${element.rotation || 0}, ${
        element.width / 2
      }, ${element.height / 2})`}
      onPointerDown={onPointerDown}
      onClick={onClick}
      className={
        isInteractive
          ? element.locked
            ? 'cursor-not-allowed'
            : 'cursor-move'
          : 'cursor-pointer'
      }
      data-element-id={element.id}
      data-center={`${cx},${cy}`}
    >
      {renderDraftShapeBody(
        element.kind,
        element.width,
        element.height,
        fill,
        stroke,
        element.label,
        scalePxPerFoot,
        false
      )}

      {element.promotedAssetId && (
        <g transform={`translate(${element.width - 10}, -6)`}>
          <circle cx={0} cy={0} r={6} fill="#15803D" stroke="#FFFFFF" strokeWidth={1.5} />
          <text x={0} y={3} textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="700">
            A
          </text>
        </g>
      )}

      {isSelected && (
        <rect
          x={-3}
          y={-3}
          width={element.width + 6}
          height={element.height + 6}
          fill="none"
          stroke="#1C4ED8"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          pointerEvents="none"
        />
      )}
    </g>
  );
}
