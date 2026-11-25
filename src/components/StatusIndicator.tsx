import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { HealthStatus } from '../types/condocore';

export function HealthText({
  status,
  label,
}: {
  status: HealthStatus;
  label?: string;
}) {
  const cfg = {
    green: { color: 'text-[#15803D]', text: label || 'Current' },
    yellow: { color: 'text-[#B45309]', text: label || 'Attention' },
    red: { color: 'text-[#B91C1C]', text: label || 'Action Required' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${cfg.color}`}>
      <span
        aria-hidden="true"
        className={`inline-block w-1.5 h-1.5 rounded-[1px] ${
          status === 'green'
            ? 'bg-[#15803D]'
            : status === 'yellow'
            ? 'bg-[#B45309]'
            : 'bg-[#B91C1C]'
        }`}
      />
      {cfg.text}
    </span>
  );
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EFEDE8] border border-[#E6E4DE] text-[#525763] p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Building2 className="w-6 h-6 text-[#787E8C] mb-1.5" />
        <span className="text-xs font-medium text-center text-[#525763]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
