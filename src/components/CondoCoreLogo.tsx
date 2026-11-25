import React from 'react';

interface CondoCoreLogoProps {
  variant?: 'mark' | 'lockup';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
  showTagline?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: { box: 24, text: 'text-sm', tag: 'text-[9px]', gap: 'gap-2' },
  sm: { box: 30, text: 'text-[15px]', tag: 'text-[9px]', gap: 'gap-2.5' },
  md: { box: 36, text: 'text-base', tag: 'text-[10px]', gap: 'gap-2.5' },
  lg: { box: 44, text: 'text-xl', tag: 'text-[10px]', gap: 'gap-3' },
  xl: { box: 56, text: 'text-2xl', tag: 'text-[11px]', gap: 'gap-3.5' },
};

/**
 * CondoCore Bespoke Architectural Brand Emblem
 * Swiss Architectural Cobalt monolith plate housing interlocking double-C
 * plan-view building walls and a luminous Warm Ochre central keystone core.
 */
export function CondoCoreMark({
  size = 30,
  theme = 'light',
  className = '',
}: {
  size?: number;
  theme?: 'light' | 'dark';
  className?: string;
}) {
  const gradId = React.useId().replace(/:/g, '');
  const outerWall = '#FFFFFF';
  const innerWall = '#BFDBFE';
  const keystone = '#F0C05A';
  const plateBorder = theme === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(28,78,216,0.25)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`cc-cobalt-${gradId}`} x1="4" y1="2" x2="60" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2A62F2" />
          <stop offset="55%" stopColor="#1C4ED8" />
          <stop offset="100%" stopColor="#12329A" />
        </linearGradient>
      </defs>

      {/* Swiss Architectural Cobalt Monolith Plate */}
      <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#cc-cobalt-${gradId})`} />
      <rect
        x="2.75"
        y="2.75"
        width="58.5"
        height="58.5"
        rx="13.25"
        stroke={plateBorder}
        strokeWidth="1.5"
      />

      {/* Precision Architectural Drafting Corner Registration Ticks */}
      <path d="M10 13V10H13" stroke={keystone} strokeWidth="1.35" strokeOpacity="0.8" strokeLinecap="square" />
      <path d="M51 54H54V51" stroke={keystone} strokeWidth="1.35" strokeOpacity="0.8" strokeLinecap="square" />

      {/* Outer Building Envelope ("Condo" Plan-View C) */}
      <path
        d="M47 21.5V16.5C47 15.6716 46.3284 15 45.5 15H20.5L15 20.5V47.5C15 48.3284 15.6716 49 16.5 49H45.5C46.3284 49 47 48.3284 47 47.5V42.5"
        stroke={outerWall}
        strokeWidth="4.4"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* Inner Structural Floorplan Wall ("Core" Nested Architectural C) */}
      <path
        d="M41.5 25.5V23H24.5L22.5 25V41H41.5V38.5"
        stroke={innerWall}
        strokeWidth="3.2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* Central Warm Ochre Architectural Keystone Core */}
      <rect x="29.5" y="28.5" width="7" height="7" rx="1.2" fill={keystone} />

      {/* East Threshold Architectural Axis Line */}
      <line
        x1="41"
        y1="32"
        x2="49.5"
        y2="32"
        stroke={keystone}
        strokeWidth="2.4"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function CondoCoreLogo({
  variant = 'lockup',
  size = 'sm',
  theme = 'light',
  showTagline = false,
  className = '',
}: CondoCoreLogoProps) {
  const cfg = SIZE_MAP[size];

  if (variant === 'mark') {
    return <CondoCoreMark size={cfg.box} theme={theme} className={className} />;
  }

  return (
    <div className={`inline-flex items-center ${cfg.gap} select-none ${className}`}>
      <CondoCoreMark size={cfg.box} theme={theme} />
      <div className="flex flex-col leading-none">
        <span
          className={`font-display font-bold tracking-[-0.03em] whitespace-nowrap ${cfg.text} ${
            theme === 'dark' ? 'text-white' : 'text-[#121316]'
          }`}
        >
          Condo
          <span className={theme === 'dark' ? 'text-[#93B4FD]' : 'text-[#1C4ED8]'}>Core</span>
        </span>
        {showTagline && (
          <span
            className={`font-mono tracking-[0.16em] uppercase mt-1 ${cfg.tag} ${
              theme === 'dark' ? 'text-[#8B91A1]' : 'text-[#6A707D]'
            }`}
          >
            Board OS
          </span>
        )}
      </div>
    </div>
  );
}
